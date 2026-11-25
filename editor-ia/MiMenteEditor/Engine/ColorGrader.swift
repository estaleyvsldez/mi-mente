import CoreImage
import CoreImage.CIFilterBuiltins
import UIKit

/// Aplica un ColorGrade a un cuadro: LUT 3D tonal + LUT importado + acabados espaciales.
/// Se crea una vez por edición (los LUTs se calculan al inicio, no en cada cuadro).
final class ColorGrader {
    let grade: ColorGrade
    private let cube: CIFilter?
    private let userCube: CIFilter?
    private let spatial: (clarity: Double, sharpen: Double, grain: Double, bloom: Double, halation: Double, vignette: Double)
    private let isNeutral: Bool

    init(grade: ColorGrade) {
        self.grade = grade
        var tonal = grade
        tonal.lut = ""
        isNeutral = tonal == .neutral || (tonal.preset == .none && ColorGrader.isTonalNeutral(tonal))
        cube = isNeutral ? nil : ColorLUT.filter(for: grade)
        if let lut = ColorLUT.loadLUT(named: grade.lut) {
            let f = CIFilter(name: "CIColorCubeWithColorSpace")
            f?.setValue(lut.dimension, forKey: "inputCubeDimension")
            f?.setValue(lut.data, forKey: "inputCubeData")
            f?.setValue(CGColorSpace(name: CGColorSpace.sRGB), forKey: "inputColorSpace")
            userCube = f
        } else {
            userCube = nil
        }
        spatial = ColorLUT.spatial(grade)
    }

    private static func isTonalNeutral(_ g: ColorGrade) -> Bool {
        var n = ColorGrade.neutral
        n.skinProtect = g.skinProtect
        n.presetIntensity = g.presetIntensity
        n.clarity = g.clarity; n.sharpen = g.sharpen; n.grain = g.grain
        n.bloom = g.bloom; n.halation = g.halation; n.vignette = g.vignette
        n.lutIntensity = g.lutIntensity
        n.splitShadows = g.splitShadows; n.splitHighlights = g.splitHighlights
        return n == g
    }

    func apply(_ input: CIImage, rect: CGRect, time: Double) -> CIImage {
        var img = input

        if let cube {
            cube.setValue(img, forKey: kCIInputImageKey)
            img = cube.outputImage ?? img
        }
        if let userCube {
            userCube.setValue(img, forKey: kCIInputImageKey)
            if let out = userCube.outputImage {
                img = grade.lutIntensity >= 0.999 ? out : Self.mix(img, out, grade.lutIntensity, rect)
            }
        }

        // Claridad: contraste local (micro-contraste) como en Lightroom.
        if abs(spatial.clarity) > 0.01 {
            if spatial.clarity > 0 {
                let f = CIFilter.unsharpMask()
                f.inputImage = img.clampedToExtent()
                f.radius = Float(max(rect.width, rect.height) * 0.02)
                f.intensity = Float(spatial.clarity * 0.9)
                img = (f.outputImage ?? img).cropped(to: rect)
            } else {
                let soft = img.clampedToExtent().applyingGaussianBlur(sigma: Double(rect.width) * 0.006).cropped(to: rect)
                img = Self.mix(img, soft, -spatial.clarity * 0.7, rect)
            }
        }
        if spatial.sharpen > 0.01 {
            let f = CIFilter.sharpenLuminance()
            f.inputImage = img
            f.sharpness = Float(spatial.sharpen * 0.8)
            f.radius = Float(1.5)
            img = (f.outputImage ?? img).cropped(to: rect)
        }
        if spatial.halation > 0.01 {
            img = Self.halation(img, amount: spatial.halation, rect: rect)
        }
        if spatial.bloom > 0.01 {
            let f = CIFilter.bloom()
            f.inputImage = img.clampedToExtent()
            f.radius = Float(max(rect.width, rect.height) * 0.02)
            f.intensity = Float(spatial.bloom * 0.9)
            img = (f.outputImage ?? img).cropped(to: rect)
        }
        if spatial.vignette > 0.01 {
            let f = CIFilter.vignetteEffect()
            f.inputImage = img
            f.center = CGPoint(x: rect.midX, y: rect.midY)
            f.radius = Float(hypot(rect.width, rect.height) * 0.4)
            f.intensity = Float(spatial.vignette)
            f.falloff = 0.55
            img = f.outputImage ?? img
        }
        if spatial.grain > 0.01 {
            img = Self.grain(img, amount: spatial.grain, rect: rect, time: time)
        }
        return img.cropped(to: rect)
    }

    // MARK: - Utilidades compartidas

    static func mix(_ a: CIImage, _ b: CIImage, _ k: Double, _ rect: CGRect) -> CIImage {
        let f = CIFilter.dissolveTransition()
        f.inputImage = a
        f.targetImage = b
        f.time = Float(k.clamped(0, 1))
        return (f.outputImage ?? b).cropped(to: rect)
    }

    /// Halación: el brillo rojizo alrededor de las luces fuertes que tiene la película.
    static func halation(_ img: CIImage, amount: Double, rect: CGRect) -> CIImage {
        let threshold = CIFilter.colorMatrix()
        threshold.inputImage = img
        threshold.rVector = CIVector(x: 1.6, y: 0, z: 0, w: 0)
        threshold.gVector = CIVector(x: 0, y: 0.5, z: 0, w: 0)
        threshold.bVector = CIVector(x: 0, y: 0, z: 0.25, w: 0)
        threshold.biasVector = CIVector(x: -0.75, y: -0.4, z: -0.2, w: 0)
        let hot = (threshold.outputImage ?? img).clampedToExtent()
            .applyingGaussianBlur(sigma: Double(rect.width) * 0.012).cropped(to: rect)
        let dim = CIFilter.colorMatrix()
        dim.inputImage = hot
        dim.rVector = CIVector(x: amount * 0.8, y: 0, z: 0, w: 0)
        dim.gVector = CIVector(x: 0, y: amount * 0.35, z: 0, w: 0)
        dim.bVector = CIVector(x: 0, y: 0, z: amount * 0.2, w: 0)
        let glow = dim.outputImage ?? hot
        return glow.applyingFilter("CIScreenBlendMode", parameters: [kCIInputBackgroundImageKey: img]).cropped(to: rect)
    }

    /// Grano de película animado.
    static func grain(_ img: CIImage, amount: Double, rect: CGRect, time: Double) -> CIImage {
        guard let noise = CIFilter.randomGenerator().outputImage else { return img }
        let frame = Int(time * 24)
        let ox = CGFloat((frame * 7919) % 997), oy = CGFloat((frame * 104729) % 991)
        let mono = CIFilter.colorMatrix()
        mono.inputImage = noise.transformed(by: CGAffineTransform(translationX: -ox, y: -oy)
            .concatenating(CGAffineTransform(scaleX: 1.6, y: 1.6)))
        let a = amount * 0.3
        mono.rVector = CIVector(x: a, y: 0, z: 0, w: 0)
        mono.gVector = CIVector(x: a, y: 0, z: 0, w: 0)
        mono.bVector = CIVector(x: a, y: 0, z: 0, w: 0)
        mono.aVector = CIVector(x: 0, y: 0, z: 0, w: 1)
        mono.biasVector = CIVector(x: 0.5 - a / 2, y: 0.5 - a / 2, z: 0.5 - a / 2, w: 0)
        let grain = (mono.outputImage ?? noise).cropped(to: rect)
        return grain.applyingFilter("CISoftLightBlendMode", parameters: [kCIInputBackgroundImageKey: img]).cropped(to: rect)
    }
}

extension UIColor {
    convenience init(hex: String, fallback: UIColor = .white) {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if s.hasPrefix("#") { s.removeFirst() }
        var value: UInt64 = 0
        guard (s.count == 6 || s.count == 8), Scanner(string: s).scanHexInt64(&value) else {
            var r: CGFloat = 1, g: CGFloat = 1, b: CGFloat = 1, a: CGFloat = 1
            fallback.getRed(&r, green: &g, blue: &b, alpha: &a)
            self.init(red: r, green: g, blue: b, alpha: a)
            return
        }
        if s.count == 6 {
            self.init(red: CGFloat((value >> 16) & 0xFF) / 255, green: CGFloat((value >> 8) & 0xFF) / 255,
                      blue: CGFloat(value & 0xFF) / 255, alpha: 1)
        } else {
            self.init(red: CGFloat((value >> 24) & 0xFF) / 255, green: CGFloat((value >> 16) & 0xFF) / 255,
                      blue: CGFloat((value >> 8) & 0xFF) / 255, alpha: CGFloat(value & 0xFF) / 255)
        }
    }

    var hexString: String {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        getRed(&r, green: &g, blue: &b, alpha: &a)
        return String(format: "#%02X%02X%02X", Int((r.clampedUnit) * 255), Int(g.clampedUnit * 255), Int(b.clampedUnit * 255))
    }

    var luminance: CGFloat {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        getRed(&r, green: &g, blue: &b, alpha: &a)
        return 0.299 * r + 0.587 * g + 0.114 * b
    }

    var asCIColor: CIColor { CIColor(color: self) }
}

private extension CGFloat {
    var clampedUnit: CGFloat { Swift.min(Swift.max(self, 0), 1) }
}
