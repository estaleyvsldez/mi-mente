import CoreImage
import CoreImage.CIFilterBuiltins
import UIKit

/// Aplica el "look" de color del plan a cada cuadro.
enum ColorGrader {
    static func apply(_ input: CIImage, grade: ColorGrade, rect: CGRect) -> CIImage {
        var img = input
        var contrast = grade.contrast
        var saturation = grade.saturation
        var exposure = grade.exposure
        var temperature = grade.temperature
        var vignette = grade.vignette

        switch grade.preset {
        case .none: break
        case .cinematic:
            contrast *= 1.12; saturation *= 0.9; vignette = max(vignette, 0.3)
            img = matrix(img, r: 1.0, g: 1.0, b: 1.0, bias: (-0.01, 0.0, 0.025))
        case .warm:
            temperature += 0.35; saturation *= 1.05
        case .cool:
            temperature -= 0.35
        case .vintage:
            img = sepia(img, 0.35)
            contrast *= 0.9; saturation *= 0.85
            img = matrix(img, r: 0.94, g: 0.94, b: 0.92, bias: (0.05, 0.045, 0.04))
            vignette = max(vignette, 0.35)
        case .blackWhite:
            img = img.applyingFilter("CIPhotoEffectNoir")
            saturation = 0
        case .vibrant:
            let f = CIFilter.vibrance(); f.inputImage = img; f.amount = 0.6
            img = f.outputImage ?? img
            saturation *= 1.15; contrast *= 1.06
        case .tealOrange:
            // Sombras hacia azul verdoso, tonos de piel hacia naranja.
            let f = CIFilter.colorMatrix()
            f.inputImage = img
            f.rVector = CIVector(x: 1.08, y: 0.02, z: 0, w: 0)
            f.gVector = CIVector(x: 0, y: 1.0, z: 0.02, w: 0)
            f.bVector = CIVector(x: -0.05, y: 0.08, z: 0.9, w: 0)
            f.aVector = CIVector(x: 0, y: 0, z: 0, w: 1)
            f.biasVector = CIVector(x: 0, y: 0.01, z: 0.04, w: 0)
            img = f.outputImage ?? img
            contrast *= 1.08; saturation *= 1.1
        case .moody:
            exposure -= 0.2; saturation *= 0.75; contrast *= 1.15; temperature -= 0.15
            vignette = max(vignette, 0.45)
        case .pastel:
            contrast *= 0.85; saturation *= 0.8; exposure += 0.1
            img = matrix(img, r: 0.95, g: 0.95, b: 0.95, bias: (0.06, 0.06, 0.07))
        }

        if abs(exposure) > 0.001 {
            let f = CIFilter.exposureAdjust(); f.inputImage = img; f.ev = Float(exposure)
            img = f.outputImage ?? img
        }
        if abs(contrast - 1) > 0.001 || abs(saturation - 1) > 0.001 {
            let f = CIFilter.colorControls()
            f.inputImage = img
            f.contrast = Float(contrast)
            f.saturation = Float(saturation)
            f.brightness = 0
            img = f.outputImage ?? img
        }
        if abs(temperature) > 0.001 {
            let t = temperature.clamped(-1, 1) * 0.12
            img = matrix(img, r: 1 + t, g: 1 + t * 0.15, b: 1 - t, bias: (0, 0, 0))
        }
        if vignette > 0.001 {
            let f = CIFilter.vignetteEffect()
            f.inputImage = img
            f.center = CGPoint(x: rect.midX, y: rect.midY)
            f.radius = Float(hypot(rect.width, rect.height) * 0.38)
            f.intensity = Float(vignette)
            f.falloff = 0.6
            img = f.outputImage ?? img
        }
        return img.cropped(to: rect)
    }

    private static func matrix(_ img: CIImage, r: Double, g: Double, b: Double, bias: (Double, Double, Double)) -> CIImage {
        let f = CIFilter.colorMatrix()
        f.inputImage = img
        f.rVector = CIVector(x: r, y: 0, z: 0, w: 0)
        f.gVector = CIVector(x: 0, y: g, z: 0, w: 0)
        f.bVector = CIVector(x: 0, y: 0, z: b, w: 0)
        f.aVector = CIVector(x: 0, y: 0, z: 0, w: 1)
        f.biasVector = CIVector(x: bias.0, y: bias.1, z: bias.2, w: 0)
        return f.outputImage ?? img
    }

    private static func sepia(_ img: CIImage, _ amount: Double) -> CIImage {
        let f = CIFilter.sepiaTone(); f.inputImage = img; f.intensity = Float(amount)
        return f.outputImage ?? img
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

    var luminance: CGFloat {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        getRed(&r, green: &g, blue: &b, alpha: &a)
        return 0.299 * r + 0.587 * g + 0.114 * b
    }
}
