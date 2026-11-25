import CoreImage
import CoreImage.CIFilterBuiltins
import UIKit
import Vision

/// Renderiza una foto con su PhotoPlan: recorte, enderezar, fondo, retoque, color, efectos y textos.
enum PhotoRenderer {
    private static let context = CIContext(options: [.cacheIntermediates: false])

    static func render(_ base: CGImage, plan: PhotoPlan, maxSide: CGFloat? = nil) -> CGImage? {
        var img = CIImage(cgImage: base)
        if plan.flipHorizontal {
            img = img.transformed(by: CGAffineTransform(scaleX: -1, y: 1)).transformed(by: CGAffineTransform(translationX: img.extent.width, y: 0))
        }
        // Tamaño de trabajo
        var scale: CGFloat = 1
        if let maxSide { scale = min(1, maxSide / max(img.extent.width, img.extent.height)) }
        if scale < 1 { img = img.transformed(by: CGAffineTransform(scaleX: scale, y: scale)) }
        img = img.transformed(by: CGAffineTransform(translationX: -img.extent.minX, y: -img.extent.minY))

        // Enderezar (rota y amplía para no ver bordes).
        if abs(plan.straighten) > 0.05 {
            let a = CGFloat(plan.straighten * .pi / 180)
            let e = img.extent
            let cover = abs(cos(a)) + abs(sin(a)) * max(e.width / e.height, e.height / e.width)
            img = img.transformed(by: CGAffineTransform(translationX: -e.midX, y: -e.midY)
                .concatenating(CGAffineTransform(rotationAngle: a))
                .concatenating(CGAffineTransform(scaleX: cover, y: cover))
                .concatenating(CGAffineTransform(translationX: e.midX, y: e.midY))).cropped(to: e)
        }

        // Recorte al formato elegido, centrado en el punto de interés.
        let size = cropSize(for: plan.crop, extent: img.extent.size)
        let rect = CGRect(origin: .zero, size: size)
        let dx = (img.extent.width - size.width) * CGFloat(plan.focusX)
        let dy = (img.extent.height - size.height) * CGFloat(1 - plan.focusY)
        img = img.transformed(by: CGAffineTransform(translationX: -dx, y: -dy)).cropped(to: rect)

        // Máscara del sujeto (persona u objeto principal), solo si hace falta.
        let needsMask = plan.background != .keep || plan.retouch > 0.01 ||
            plan.effects.contains { $0.type.needsSubjectMask } || plan.texts.contains { $0.behindSubject }
        let mask = needsMask ? subjectMask(img, rect: rect) : nil

        // Retoque de piel (solo sobre la persona).
        if plan.retouch > 0.01, let mask {
            let smooth = img.clampedToExtent().applyingGaussianBlur(sigma: Double(size.width) * 0.003 * (0.5 + plan.retouch)).cropped(to: rect)
            let softened = ColorGrader.mix(img, smooth, plan.retouch * 0.55, rect)
            img = EffectsKit.blend(softened, over: img, mask: mask)
        }

        // Color pro.
        img = ColorGrader(grade: plan.color).apply(img, rect: rect, time: 0)

        // Efectos (los de cámara no aplican a fotos).
        let scheduled = plan.effects.map { ScheduledEffect(effect: $0, start: -1, end: 1) }
        img = EffectsKit.applyStyle(img, effects: scheduled, time: 0, rect: rect) { mask }

        // Fondo.
        let subject = img
        if let mask {
            switch plan.background {
            case .keep: break
            case .remove: img = EffectsKit.blend(img, over: CIImage.empty().cropped(to: rect), mask: mask)
            case .blur:
                let bg = img.clampedToExtent().applyingGaussianBlur(sigma: 6 + 40 * plan.backgroundBlur).cropped(to: rect)
                img = EffectsKit.blend(img, over: bg, mask: mask)
            case .color:
                img = EffectsKit.blend(img, over: CIImage(color: UIColor(hex: plan.backgroundColor).asCIColor).cropped(to: rect), mask: mask)
            case .darken:
                let f = CIFilter.exposureAdjust(); f.inputImage = img; f.ev = Float(-0.8 - 1.5 * plan.backgroundBlur)
                img = EffectsKit.blend(img, over: f.outputImage ?? img, mask: mask)
            case .blackWhite:
                img = EffectsKit.blend(img, over: img.applyingFilter("CIPhotoEffectNoir"), mask: mask)
            }
        }

        // Textos (algunos detrás del sujeto).
        let canvas = size
        func draw(_ t: TextOverlay, on base: CIImage) -> CIImage {
            guard let block = TextEngine.render(t, canvas: canvas) else { return base }
            var still = t
            still.animationIn = .none; still.animationOut = .none
            if still.loop != .rainbow { still.loop = .none }
            let item = TextItem(block: block, spec: still, start: -100, end: 100, wordTimes: nil)
            return TextAnimator.draw(item, at: 0, onto: base, canvas: canvas)
        }
        let behind = plan.texts.filter { $0.behindSubject }
        if !behind.isEmpty, let mask {
            let front = img
            for t in behind { img = draw(t, on: img) }
            img = EffectsKit.blend(front, over: img, mask: mask)
        }
        for t in plan.texts where !t.behindSubject { img = draw(t, on: img) }
        _ = subject

        return context.createCGImage(img.cropped(to: rect), from: rect, format: .RGBA8,
                                     colorSpace: CGColorSpace(name: CGColorSpace.sRGB))
    }

    static func cropSize(for format: VideoFormat, extent: CGSize) -> CGSize {
        let ratio: CGFloat
        switch format {
        case .original: return CGSize(width: floor(extent.width), height: floor(extent.height))
        case .vertical: ratio = 9.0 / 16
        case .portrait: ratio = 4.0 / 5
        case .square: ratio = 1
        case .horizontal: ratio = 16.0 / 9
        case .cinema: ratio = 21.0 / 9
        }
        if extent.width / extent.height > ratio {
            return CGSize(width: floor(extent.height * ratio), height: floor(extent.height))
        }
        return CGSize(width: floor(extent.width), height: floor(extent.width / ratio))
    }

    /// Máscara del sujeto: primero "objeto principal" (iOS 17), si no, persona.
    static func subjectMask(_ image: CIImage, rect: CGRect) -> CIImage? {
        let handler = VNImageRequestHandler(ciImage: image.cropped(to: rect), options: [:])
        let request = VNGenerateForegroundInstanceMaskRequest()
        if (try? handler.perform([request])) != nil, let result = request.results?.first,
           let buffer = try? result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler) {
            let m = CIImage(cvPixelBuffer: buffer)
            return m.transformed(by: CGAffineTransform(scaleX: rect.width / m.extent.width, y: rect.height / m.extent.height))
                .cropped(to: rect)
        }
        return SubjectSegmenter().mask(for: image, rect: rect)
    }
}
