import CoreImage
import CoreImage.CIFilterBuiltins
import UIKit
import Vision

/// Un efecto ya ubicado en la línea de tiempo (segundos absolutos).
struct ScheduledEffect {
    let effect: Effect
    let start: Double
    let end: Double

    func isActive(_ t: Double) -> Bool { t >= start && t <= end }
    func progress(_ t: Double) -> Double { ((t - start) / max(end - start, 0.001)).clamped(0, 1) }

    var isCamera: Bool {
        [.zoomIn, .zoomOut, .punchIn, .kenBurns, .shake, .handheld].contains(effect.type)
    }
}

/// Ruido determinista (mismo cuadro = mismo resultado, para que la vista previa y la exportación coincidan).
func hashNoise(_ a: Int, _ b: Int = 0) -> Double {
    var x = UInt64(bitPattern: Int64(a &* 73856093 ^ b &* 19349663))
    x ^= x >> 33; x = x &* 0xff51afd7ed558ccd; x ^= x >> 33; x = x &* 0xc4ceb9fe1a85ec53; x ^= x >> 33
    return Double(x % 10_000) / 10_000
}

func easeInOut(_ x: Double) -> Double { x * x * (3 - 2 * x) }
func easeOut(_ x: Double) -> Double { 1 - pow(1 - x, 3) }
func backOut(_ x: Double) -> Double {
    let c1 = 1.70158, c3 = c1 + 1
    return 1 + c3 * pow(x - 1, 3) + c1 * pow(x - 1, 2)
}
func bounceOut(_ x: Double) -> Double {
    let n1 = 7.5625, d1 = 2.75
    if x < 1 / d1 { return n1 * x * x }
    if x < 2 / d1 { let y = x - 1.5 / d1; return n1 * y * y + 0.75 }
    if x < 2.5 / d1 { let y = x - 2.25 / d1; return n1 * y * y + 0.9375 }
    let y = x - 2.625 / d1; return n1 * y * y + 0.984375
}

enum EffectsKit {
    // MARK: - Cámara (zoom, paneo, temblor)

    static func applyCamera(_ img: CIImage, effects: [ScheduledEffect], time t: Double, rect: CGRect) -> CIImage {
        var scale: CGFloat = 1
        var dx: CGFloat = 0, dy: CGFloat = 0, rot: CGFloat = 0
        var focus = CGPoint(x: rect.midX, y: rect.midY)
        for s in effects where s.isCamera && s.isActive(t) {
            let e = s.effect
            let k = CGFloat(e.intensity)
            let p = s.progress(t)
            let local = t - s.start
            focus = CGPoint(x: rect.width * CGFloat(e.focusX), y: rect.height * CGFloat(1 - e.focusY))
            switch e.type {
            case .zoomIn: scale *= 1 + 0.4 * k * CGFloat(easeInOut(p))
            case .zoomOut: scale *= 1 + 0.4 * k * CGFloat(1 - easeInOut(p))
            case .punchIn: scale *= 1 + 0.3 * k * CGFloat(easeOut(min(1, local / 0.12)))
            case .kenBurns:
                scale *= 1.12 + 0.06 * CGFloat(p)
                dx += (CGFloat(p) - 0.5) * rect.width * 0.07 * k
            case .shake:
                let f = Int(t * 30)
                let amp = rect.width * 0.022 * k
                dx += (CGFloat(hashNoise(f, 1)) - 0.5) * 2 * amp
                dy += (CGFloat(hashNoise(f, 2)) - 0.5) * 2 * amp
                rot += (CGFloat(hashNoise(f, 3)) - 0.5) * 0.02 * k
                scale *= 1 + 0.06 * k
            case .handheld:
                let amp = rect.width * 0.012 * k
                dx += amp * CGFloat(sin(t * 1.3) + 0.5 * sin(t * 2.9 + 1))
                dy += amp * CGFloat(sin(t * 1.1 + 2) + 0.4 * sin(t * 3.3))
                rot += 0.006 * k * CGFloat(sin(t * 0.9))
                scale *= 1 + 0.045 * k
            default: break
            }
        }
        guard scale != 1 || dx != 0 || dy != 0 || rot != 0 else { return img }
        // Escalar alrededor del punto de interés y compensar el giro para no ver bordes.
        let cover = 1 + abs(rot) * 1.2
        let t1 = CGAffineTransform(translationX: -focus.x, y: -focus.y)
            .concatenating(CGAffineTransform(rotationAngle: rot))
            .concatenating(CGAffineTransform(scaleX: scale * cover, y: scale * cover))
            .concatenating(CGAffineTransform(translationX: focus.x + dx, y: focus.y + dy))
        return img.clampedToExtent().transformed(by: t1).cropped(to: rect)
    }

    // MARK: - Estilo

    static func applyStyle(_ input: CIImage, effects: [ScheduledEffect], time t: Double, rect: CGRect,
                           mask: () -> CIImage?) -> CIImage {
        var img = input
        for s in effects where !s.isCamera && s.isActive(t) {
            img = apply(s, to: img, time: t, rect: rect, mask: mask).cropped(to: rect)
        }
        return img
    }

    private static func apply(_ s: ScheduledEffect, to img: CIImage, time t: Double, rect: CGRect,
                              mask: () -> CIImage?) -> CIImage {
        let e = s.effect
        let k = e.intensity
        let p = s.progress(t)
        let local = t - s.start
        let frame = Int(t * 30)
        let w = rect.width, h = rect.height
        let center = CIVector(x: w * CGFloat(e.focusX), y: h * CGFloat(1 - e.focusY))
        let color = UIColor(hex: e.color.isEmpty ? "#FF8A3D" : e.color)
        let color2 = UIColor(hex: e.secondaryColor.isEmpty ? "#FF5F9E" : e.secondaryColor)

        switch e.type {
        case .zoomIn, .zoomOut, .punchIn, .kenBurns, .shake, .handheld:
            return img

        case .glitch:
            let burst = hashNoise(frame / 2, 7) < 0.3 + 0.45 * k || local < 0.15
            guard burst else { return img }
            var out = rgbSplit(img, dx: w * 0.018 * CGFloat(k) * CGFloat(hashNoise(frame, 1) + 0.3), rect: rect)
            let slices = 3 + Int(hashNoise(frame, 2) * 5)
            for i in 0..<slices {
                let y = CGFloat(hashNoise(frame, 10 + i)) * h
                let bh = h * CGFloat(0.02 + hashNoise(frame, 30 + i) * 0.08)
                let shift = (CGFloat(hashNoise(frame, 50 + i)) - 0.5) * w * 0.12 * CGFloat(k)
                let band = out.cropped(to: CGRect(x: 0, y: y, width: w, height: bh))
                    .transformed(by: CGAffineTransform(translationX: shift, y: 0))
                out = band.composited(over: out)
            }
            return out

        case .rgbSplit:
            return rgbSplit(img, dx: w * 0.009 * CGFloat(k) * CGFloat(1 + 0.3 * sin(t * 6)), rect: rect)

        case .vhs:
            var out = rgbSplit(img, dx: w * 0.004 * CGFloat(0.5 + k), rect: rect)
            let blur = CIFilter.motionBlur()
            blur.inputImage = out.clampedToExtent(); blur.radius = Float(2 + 5 * k); blur.angle = 0
            out = (blur.outputImage ?? out).cropped(to: rect)
            let cc = CIFilter.colorControls(); cc.inputImage = out
            cc.saturation = Float(1 - 0.25 * k); cc.contrast = Float(1 + 0.1 * k); cc.brightness = Float(0.02 * k)
            out = cc.outputImage ?? out
            out = overlay(scanlines(rect: rect, opacity: 0.22 * k), on: out)
            // Banda de "tracking" que baja por la pantalla.
            let bandY = h - CGFloat((t * 0.35).truncatingRemainder(dividingBy: 1)) * h * 1.2
            if let noise = CIFilter.randomGenerator().outputImage {
                let band = alphaImg(noise.cropped(to: CGRect(x: 0, y: bandY, width: w, height: h * 0.05)), 0.35 * k)
                out = band.applyingFilter("CIScreenBlendMode", parameters: [kCIInputBackgroundImageKey: out])
            }
            return ColorGrader.grain(out, amount: 0.35 * k, rect: rect, time: t)

        case .oldFilm:
            var out = img.applyingFilter("CISepiaTone", parameters: [kCIInputIntensityKey: 0.6 * k])
            let ex = CIFilter.exposureAdjust(); ex.inputImage = out
            ex.ev = Float((hashNoise(frame, 3) - 0.5) * 0.35 * k)
            out = ex.outputImage ?? out
            out = out.clampedToExtent()
                .transformed(by: CGAffineTransform(translationX: 0, y: CGFloat(hashNoise(frame / 2, 4) - 0.5) * h * 0.006 * CGFloat(k)))
                .cropped(to: rect)
            for i in 0..<2 where hashNoise(frame, 60 + i) < 0.6 {
                let x = CGFloat(hashNoise(frame / 3, 70 + i)) * w
                let line = CIImage(color: CIColor(red: 1, green: 1, blue: 1, alpha: 0.35 * k))
                    .cropped(to: CGRect(x: x, y: 0, width: max(1, w * 0.0015), height: h))
                out = line.composited(over: out)
            }
            let v = CIFilter.vignetteEffect(); v.inputImage = out
            v.center = CGPoint(x: rect.midX, y: rect.midY); v.radius = Float(hypot(w, h) * 0.38)
            v.intensity = Float(0.7 * k); v.falloff = 0.5
            out = v.outputImage ?? out
            return ColorGrader.grain(out, amount: 0.6 * k, rect: rect, time: t)

        case .lightLeak:
            var leak = CIImage.empty()
            for i in 0..<2 {
                let g = CIFilter.radialGradient()
                let phase = t * (0.25 + 0.1 * Double(i)) + Double(i) * 2
                g.center = CGPoint(x: w * CGFloat(0.5 + 0.55 * sin(phase)), y: h * CGFloat(0.5 + 0.45 * cos(phase * 0.7)))
                g.radius0 = 0
                g.radius1 = Float(max(w, h) * 0.55)
                let c = i == 0 ? color : color2
                var r: CGFloat = 0, gg: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
                c.getRed(&r, green: &gg, blue: &b, alpha: &a)
                let strength = CGFloat(k) * CGFloat(0.55 + 0.25 * sin(t * 1.7 + Double(i)))
                g.color0 = CIColor(red: r, green: gg, blue: b, alpha: strength)
                g.color1 = CIColor(red: r, green: gg, blue: b, alpha: 0)
                if let o = g.outputImage { leak = o.cropped(to: rect).composited(over: leak) }
            }
            return leak.applyingFilter("CIScreenBlendMode", parameters: [kCIInputBackgroundImageKey: img])

        case .flash:
            let a = k * pow(1 - p, 2)
            return CIImage(color: CIColor(red: 1, green: 1, blue: 1, alpha: CGFloat(a))).cropped(to: rect).composited(over: img)

        case .strobe:
            guard frame % 4 < 2 else { return img }
            return CIImage(color: CIColor(red: 1, green: 1, blue: 1, alpha: CGFloat(0.75 * k))).cropped(to: rect).composited(over: img)

        case .zoomBlur:
            let f = CIFilter.zoomBlur(); f.inputImage = img.clampedToExtent()
            f.center = CGPoint(x: center.x, y: center.y); f.amount = Float(25 * k)
            return f.outputImage ?? img

        case .motionBlur:
            let f = CIFilter.motionBlur(); f.inputImage = img.clampedToExtent()
            f.radius = Float(30 * k); f.angle = 0
            return f.outputImage ?? img

        case .blur:
            return img.clampedToExtent().applyingGaussianBlur(sigma: 28 * k)

        case .focusIn:
            let sigma = 32 * k * (1 - easeOut(p))
            return sigma < 0.3 ? img : img.clampedToExtent().applyingGaussianBlur(sigma: sigma)

        case .mirror:
            let left = img.cropped(to: CGRect(x: 0, y: 0, width: w / 2, height: h))
            let flipped = left.transformed(by: CGAffineTransform(scaleX: -1, y: 1).concatenating(CGAffineTransform(translationX: w, y: 0)))
            return flipped.composited(over: left).composited(over: img)

        case .kaleidoscope:
            let f = CIFilter.kaleidoscope(); f.inputImage = img
            f.count = 6; f.center = CGPoint(x: center.x, y: center.y); f.angle = Float(local * 0.3)
            return ColorGrader.mix(img, (f.outputImage ?? img).cropped(to: rect), 0.4 + 0.6 * k, rect)

        case .pixelate:
            let f = CIFilter.pixellate(); f.inputImage = img.clampedToExtent()
            f.scale = Float(max(4, 45 * k)); f.center = CGPoint(x: rect.midX, y: rect.midY)
            return f.outputImage ?? img

        case .comic:
            let f = CIFilter.comicEffect(); f.inputImage = img
            return ColorGrader.mix(img, (f.outputImage ?? img).cropped(to: rect), 0.3 + 0.7 * k, rect)

        case .posterize:
            let f = CIFilter.colorPosterize(); f.inputImage = img; f.levels = Float(10 - 7 * k)
            return f.outputImage ?? img

        case .sketch:
            let f = CIFilter.lineOverlay(); f.inputImage = img
            let lines = f.outputImage ?? img
            let paper = CIImage(color: CIColor(red: 0.97, green: 0.96, blue: 0.93)).cropped(to: rect)
            return ColorGrader.mix(img, lines.composited(over: paper).cropped(to: rect), 0.4 + 0.6 * k, rect)

        case .neonEdges:
            let edges = CIFilter.edges(); edges.inputImage = img; edges.intensity = Float(6 + 10 * k)
            var lines = edges.outputImage ?? img
            if !e.color.isEmpty {
                let fc = CIFilter.falseColor(); fc.inputImage = lines
                fc.color0 = CIColor(red: 0, green: 0, blue: 0); fc.color1 = color.asCIColor
                lines = fc.outputImage ?? lines
            }
            let bloom = CIFilter.bloom(); bloom.inputImage = lines.clampedToExtent()
            bloom.radius = Float(w * 0.012); bloom.intensity = 1.2
            lines = (bloom.outputImage ?? lines).cropped(to: rect)
            let dark = CIFilter.exposureAdjust(); dark.inputImage = img; dark.ev = Float(-1.8 * k)
            return lines.applyingFilter("CIAdditionCompositing", parameters: [kCIInputBackgroundImageKey: dark.outputImage ?? img])

        case .duotone:
            let fc = CIFilter.falseColor(); fc.inputImage = img
            fc.color0 = UIColor(hex: e.color.isEmpty ? "#1B0B5A" : e.color).asCIColor
            fc.color1 = color2.asCIColor
            return ColorGrader.mix(img, (fc.outputImage ?? img).cropped(to: rect), k, rect)

        case .thermal:
            return ColorGrader.mix(img, img.applyingFilter("CIThermal").cropped(to: rect), k, rect)

        case .invert:
            return ColorGrader.mix(img, img.applyingFilter("CIColorInvert"), k, rect)

        case .hueCycle:
            let f = CIFilter.hueAdjust(); f.inputImage = img; f.angle = Float(local * 2.5 * k)
            return f.outputImage ?? img

        case .dreamyGlow:
            let f = CIFilter.bloom(); f.inputImage = img.clampedToExtent()
            f.radius = Float(w * 0.035); f.intensity = Float(0.6 + 0.8 * k)
            let bloomed = (f.outputImage ?? img).cropped(to: rect)
            let soft = img.clampedToExtent().applyingGaussianBlur(sigma: Double(w) * 0.01).cropped(to: rect)
            return ColorGrader.mix(bloomed, soft, 0.25 * k, rect)

        case .letterbox:
            let target = w / 2.39
            let bar = max(h * 0.06, (h - target) / 2) * CGFloat(easeOut(min(1, local / 0.5))) * CGFloat(0.4 + 0.6 * k)
            let black = CIImage(color: .black)
            return black.cropped(to: CGRect(x: 0, y: h - bar, width: w, height: bar))
                .composited(over: black.cropped(to: CGRect(x: 0, y: 0, width: w, height: bar)))
                .composited(over: img)

        case .bgBlur, .colorPop, .spotlight, .subjectGlow:
            guard let m = mask() else { return img }
            switch e.type {
            case .bgBlur:
                let bg = img.clampedToExtent().applyingGaussianBlur(sigma: 8 + 30 * k).cropped(to: rect)
                return blend(img, over: bg, mask: m)
            case .colorPop:
                let gray = img.applyingFilter("CIPhotoEffectNoir")
                return blend(img, over: ColorGrader.mix(img, gray, 0.5 + 0.5 * k, rect), mask: m)
            case .spotlight:
                let dark = CIFilter.exposureAdjust(); dark.inputImage = img; dark.ev = Float(-0.6 - 1.6 * k)
                return blend(img, over: dark.outputImage ?? img, mask: m)
            default:
                let glowColor = UIColor(hex: e.color.isEmpty ? "#00E5FF" : e.color)
                let shape = TextEngine.tint(maskToAlpha(m), glowColor)
                let glow = shape.applyingGaussianBlur(sigma: Double(w) * 0.012 * (0.5 + k)).cropped(to: rect)
                let pulse = 0.8 + 0.2 * sin(t * 4)
                let withGlow = TextEngine.alpha(glow, min(1, 1.4 * k * pulse)).applyingFilter("CIScreenBlendMode",
                    parameters: [kCIInputBackgroundImageKey: img])
                return blend(img, over: withGlow, mask: m)
            }
        }
    }

    // MARK: - Piezas reutilizables

    static func rgbSplit(_ img: CIImage, dx: CGFloat, rect: CGRect) -> CIImage {
        func channel(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat) -> CIImage {
            let f = CIFilter.colorMatrix(); f.inputImage = img
            f.rVector = CIVector(x: r, y: 0, z: 0, w: 0)
            f.gVector = CIVector(x: 0, y: g, z: 0, w: 0)
            f.bVector = CIVector(x: 0, y: 0, z: b, w: 0)
            f.aVector = CIVector(x: 0, y: 0, z: 0, w: 1)
            return f.outputImage ?? img
        }
        let red = channel(1, 0, 0).clampedToExtent().transformed(by: CGAffineTransform(translationX: dx, y: 0))
        let green = channel(0, 1, 0)
        let blue = channel(0, 0, 1).clampedToExtent().transformed(by: CGAffineTransform(translationX: -dx, y: 0))
        let rg = red.applyingFilter("CIAdditionCompositing", parameters: [kCIInputBackgroundImageKey: green])
        return blue.applyingFilter("CIAdditionCompositing", parameters: [kCIInputBackgroundImageKey: rg]).cropped(to: rect)
    }

    static func scanlines(rect: CGRect, opacity: Double) -> CIImage {
        let f = CIFilter.stripesGenerator()
        f.color0 = CIColor(red: 0, green: 0, blue: 0, alpha: CGFloat(opacity))
        f.color1 = CIColor(red: 0, green: 0, blue: 0, alpha: 0)
        f.width = Float(max(1.5, rect.height / 480))
        f.sharpness = 0.6
        return (f.outputImage ?? CIImage.empty())
            .transformed(by: CGAffineTransform(rotationAngle: .pi / 2))
            .cropped(to: rect)
    }

    static func overlay(_ top: CIImage, on base: CIImage) -> CIImage { top.composited(over: base) }

    static func alphaImg(_ img: CIImage, _ a: Double) -> CIImage { TextEngine.alpha(img, a) }

    /// Mezcla: dentro de la máscara `fg`, fuera `bg`.
    static func blend(_ fg: CIImage, over bg: CIImage, mask: CIImage) -> CIImage {
        let f = CIFilter.blendWithMask()
        f.inputImage = fg
        f.backgroundImage = bg
        f.maskImage = mask
        return f.outputImage ?? fg
    }

    static func maskToAlpha(_ mask: CIImage) -> CIImage {
        let f = CIFilter.maskToAlpha(); f.inputImage = mask
        return f.outputImage ?? mask
    }
}

/// Detecta a la persona en el cuadro (para fondo borroso, color pop, texto detrás de ti, etc.).
final class SubjectSegmenter {
    private let request: VNGeneratePersonSegmentationRequest = {
        let r = VNGeneratePersonSegmentationRequest()
        r.qualityLevel = .balanced
        r.outputPixelFormat = kCVPixelFormatType_OneComponent8
        return r
    }()

    func mask(for image: CIImage, rect: CGRect) -> CIImage? {
        let handler = VNImageRequestHandler(ciImage: image.cropped(to: rect), options: [:])
        do { try handler.perform([request]) } catch { return nil }
        guard let buffer = request.results?.first?.pixelBuffer else { return nil }
        let m = CIImage(cvPixelBuffer: buffer)
        let sx = rect.width / m.extent.width, sy = rect.height / m.extent.height
        return m.transformed(by: CGAffineTransform(scaleX: sx, y: sy)).cropped(to: rect)
    }
}
