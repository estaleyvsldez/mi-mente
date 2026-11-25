import AVFoundation
import CoreImage
import CoreImage.CIFilterBuiltins

/// Qué pista, con qué rotación y de qué segmento es cada capa.
struct LayerRef {
    let trackID: CMPersistentTrackID
    let orientation: CGImagePropertyOrientation
    let segmentIndex: Int
    let focus: CGPoint   // 0...1, y desde arriba
}

/// Instrucción de composición: un tramo de tiempo con 1 capa (normal) o 2 (transición).
final class EditInstruction: NSObject, AVVideoCompositionInstructionProtocol {
    let timeRange: CMTimeRange
    let enablePostProcessing = false
    let containsTweening = true
    let requiredSourceTrackIDs: [NSValue]?
    let passthroughTrackID: CMPersistentTrackID = kCMPersistentTrackID_Invalid

    let layers: [LayerRef]
    let transition: TransitionType?
    let renderer: FrameRenderer

    init(timeRange: CMTimeRange, layers: [LayerRef], transition: TransitionType?, renderer: FrameRenderer) {
        self.timeRange = timeRange
        self.layers = layers
        self.transition = transition
        self.renderer = renderer
        self.requiredSourceTrackIDs = layers.map { NSNumber(value: $0.trackID) }
    }
}

/// Dibuja cada cuadro final:
/// capa → reencuadre → cámara → color → efectos → transición → efectos globales → textos.
final class FrameRenderer {
    let renderSize: CGSize
    private let rect: CGRect
    private let globalGrader: ColorGrader
    private let segmentGraders: [Int: ColorGrader]
    private let segmentEffects: [Int: [ScheduledEffect]]
    private let globalEffects: [ScheduledEffect]
    private let texts: [TextItem]
    private let context = CIContext(options: [.cacheIntermediates: false])
    private let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) ?? CGColorSpaceCreateDeviceRGB()
    private let segmenter = SubjectSegmenter()
    private let lock = NSLock()

    init(renderSize: CGSize, grade: ColorGrade, segmentGrades: [Int: ColorGrade],
         segmentEffects: [Int: [ScheduledEffect]], globalEffects: [ScheduledEffect], texts: [TextItem]) {
        self.renderSize = renderSize
        self.rect = CGRect(origin: .zero, size: renderSize)
        self.globalGrader = ColorGrader(grade: grade)
        self.segmentGraders = segmentGrades.mapValues { ColorGrader(grade: $0) }
        self.segmentEffects = segmentEffects
        self.globalEffects = globalEffects
        self.texts = texts
    }

    func render(_ request: AVAsynchronousVideoCompositionRequest, instruction: EditInstruction) {
        guard let output = request.renderContext.newPixelBuffer() else {
            request.finish(with: NSError(domain: "MiMente", code: 1))
            return
        }
        lock.lock()
        defer { lock.unlock() }

        let time = request.compositionTime.seconds
        let black = CIImage(color: .black).cropped(to: rect)

        func layer(_ i: Int) -> CIImage? {
            guard instruction.layers.indices.contains(i) else { return nil }
            let ref = instruction.layers[i]
            guard let px = request.sourceFrame(byTrackID: ref.trackID) else { return nil }
            return process(CIImage(cvPixelBuffer: px), ref: ref, time: time)
        }

        var image: CIImage
        if let transition = instruction.transition, instruction.layers.count == 2 {
            let from = layer(0) ?? black
            let to = layer(1) ?? black
            let range = instruction.timeRange
            let p = ((time - range.start.seconds) / max(range.duration.seconds, 0.001)).clamped(0, 1)
            image = blend(from: from, to: to, progress: p, type: transition, time: time)
        } else {
            image = layer(0) ?? layer(1) ?? black
        }

        // Efectos de todo el video.
        if !globalEffects.isEmpty {
            image = EffectsKit.applyCamera(image, effects: globalEffects, time: time, rect: rect)
            var cached: CIImage??
            let frameForMask = image
            image = EffectsKit.applyStyle(image, effects: globalEffects, time: time, rect: rect) { [segmenter, rect] in
                if cached == nil { cached = .some(segmenter.mask(for: frameForMask, rect: rect)) }
                return cached ?? nil
            }
        }

        // Textos (algunos pueden ir detrás de la persona).
        let active = texts.filter { time >= $0.start && time <= $0.end }
        if !active.isEmpty {
            let behind = active.filter { $0.spec.behindSubject }
            let front = active.filter { !$0.spec.behindSubject }
            if !behind.isEmpty {
                let frame = image
                for item in behind { image = TextAnimator.draw(item, at: time, onto: image, canvas: renderSize) }
                if let mask = segmenter.mask(for: frame, rect: rect) {
                    image = EffectsKit.blend(frame, over: image, mask: mask)
                }
            }
            for item in front { image = TextAnimator.draw(item, at: time, onto: image, canvas: renderSize) }
        }

        image = image.composited(over: black).cropped(to: rect)
        context.render(image, to: output, bounds: rect, colorSpace: colorSpace)
        request.finish(withComposedVideoFrame: output)
    }

    // MARK: - Capa

    private func process(_ raw: CIImage, ref: LayerRef, time: Double) -> CIImage {
        var img = fill(raw, orientation: ref.orientation, focus: ref.focus)
        let effects = segmentEffects[ref.segmentIndex] ?? []
        if !effects.isEmpty {
            img = EffectsKit.applyCamera(img, effects: effects, time: time, rect: rect)
        }
        let original = img
        let grader = segmentGraders[ref.segmentIndex] ?? globalGrader
        img = grader.apply(img, rect: rect, time: time)
        if !effects.isEmpty {
            var cached: CIImage??
            img = EffectsKit.applyStyle(img, effects: effects, time: time, rect: rect) { [segmenter, rect] in
                if cached == nil { cached = .some(segmenter.mask(for: original, rect: rect)) }
                return cached ?? nil
            }
        }
        return img
    }

    /// Gira el cuadro como se grabó y lo ajusta (aspect fill) al formato final, centrado en el punto de interés.
    func fill(_ input: CIImage, orientation: CGImagePropertyOrientation, focus: CGPoint) -> CIImage {
        var img = input.oriented(orientation)
        img = img.transformed(by: CGAffineTransform(translationX: -img.extent.minX, y: -img.extent.minY))
        let s = max(renderSize.width / img.extent.width, renderSize.height / img.extent.height)
        img = img.transformed(by: CGAffineTransform(scaleX: s, y: s))
        let iw = img.extent.width, ih = img.extent.height
        var dx = renderSize.width / 2 - focus.x * iw
        var dy = renderSize.height / 2 - (1 - focus.y) * ih
        dx = min(0, max(renderSize.width - iw, dx))
        dy = min(0, max(renderSize.height - ih, dy))
        return img.transformed(by: CGAffineTransform(translationX: dx, y: dy)).cropped(to: rect)
    }

    // MARK: - Transiciones

    private func blend(from: CIImage, to: CIImage, progress p: Double, type: TransitionType, time: Double) -> CIImage {
        let e = easeInOut(p)
        let w = rect.width, h = rect.height
        func scaled(_ img: CIImage, _ s: CGFloat, rot: CGFloat = 0) -> CIImage {
            img.clampedToExtent()
                .transformed(by: CGAffineTransform(translationX: -rect.midX, y: -rect.midY)
                    .concatenating(CGAffineTransform(rotationAngle: rot))
                    .concatenating(CGAffineTransform(scaleX: s, y: s))
                    .concatenating(CGAffineTransform(translationX: rect.midX, y: rect.midY)))
                .cropped(to: rect)
        }
        let mix = { (a: CIImage, b: CIImage, k: Double) in ColorGrader.mix(a, b, k, self.rect) }

        switch type {
        case .none:
            return p < 0.5 ? from : to
        case .crossfade:
            return mix(from, to, e)
        case .fadeBlack, .flashWhite:
            let mid = CIImage(color: type == .fadeBlack ? .black : .white).cropped(to: rect)
            return p < 0.5 ? mix(from, mid, e * 2) : mix(mid, to, (e - 0.5) * 2)
        case .zoomIn:
            let a = scaled(from, 1 + 0.6 * CGFloat(e))
            let b = scaled(to, 1.3 - 0.3 * CGFloat(e))
            return mix(a, b, e)
        case .zoomOut:
            let a = scaled(from, 1 - 0.25 * CGFloat(e))
            let b = scaled(to, 1.4 - 0.4 * CGFloat(e))
            return mix(a, b, e)
        case .slideLeft, .slideRight, .slideUp:
            let dir: CGFloat = type == .slideRight ? -1 : 1
            if type == .slideUp {
                let a = from.transformed(by: CGAffineTransform(translationX: 0, y: h * CGFloat(e)))
                let b = to.transformed(by: CGAffineTransform(translationX: 0, y: -h * CGFloat(1 - e)))
                return b.composited(over: a).cropped(to: rect)
            }
            let a = from.transformed(by: CGAffineTransform(translationX: -w * CGFloat(e) * dir, y: 0))
            let b = to.transformed(by: CGAffineTransform(translationX: w * CGFloat(1 - e) * dir, y: 0))
            return b.composited(over: a).cropped(to: rect)
        case .whipPan:
            let a = from.transformed(by: CGAffineTransform(translationX: -w * CGFloat(e), y: 0))
            let b = to.transformed(by: CGAffineTransform(translationX: w * CGFloat(1 - e), y: 0))
            let combined = b.composited(over: a).cropped(to: rect)
            let f = CIFilter.motionBlur()
            f.inputImage = combined.clampedToExtent()
            f.radius = Float(w * 0.12 * sin(.pi * p))
            f.angle = 0
            return (f.outputImage ?? combined).cropped(to: rect)
        case .spin:
            if p < 0.5 {
                return scaled(from, 1 + CGFloat(e) * 0.8, rot: CGFloat(e) * .pi * 0.6)
                    .applyingGaussianBlur(sigma: 12 * sin(.pi * p)).cropped(to: rect)
            }
            return scaled(to, 1.8 - CGFloat(e) * 0.8, rot: -(1 - CGFloat(e)) * .pi * 0.6)
                .applyingGaussianBlur(sigma: 12 * sin(.pi * p)).cropped(to: rect)
        case .glitch:
            let base = p < 0.5 ? from : to
            let k = sin(.pi * p)
            let frame = Int(time * 30)
            var out = EffectsKit.rgbSplit(base, dx: w * 0.04 * CGFloat(k), rect: rect)
            for i in 0..<6 {
                let y = CGFloat(hashNoise(frame, 80 + i)) * h
                let bh = h * CGFloat(0.03 + hashNoise(frame, 90 + i) * 0.1)
                let shift = (CGFloat(hashNoise(frame, 100 + i)) - 0.5) * w * 0.25 * CGFloat(k)
                out = out.cropped(to: CGRect(x: 0, y: y, width: w, height: bh))
                    .transformed(by: CGAffineTransform(translationX: shift, y: 0)).composited(over: out)
            }
            return out.cropped(to: rect)
        case .blur:
            let sigma = 30 * sin(.pi * p)
            let base = p < 0.5 ? from : to
            return base.clampedToExtent().applyingGaussianBlur(sigma: sigma).cropped(to: rect)
        case .iris:
            let g = CIFilter.radialGradient()
            g.center = CGPoint(x: rect.midX, y: rect.midY)
            let r = hypot(w, h) * 0.5 * CGFloat(e) * 1.05
            g.radius0 = Float(max(0, r - w * 0.02))
            g.radius1 = Float(r + 1)
            g.color0 = CIColor(red: 1, green: 1, blue: 1)
            g.color1 = CIColor(red: 0, green: 0, blue: 0)
            let mask = (g.outputImage ?? CIImage.empty()).cropped(to: rect)
            return EffectsKit.blend(to, over: from, mask: mask).cropped(to: rect)
        case .wipe:
            let g = CIFilter.linearGradient()
            let x = (w * 1.2) * CGFloat(e) - w * 0.1
            g.point0 = CGPoint(x: x - w * 0.08, y: 0)
            g.point1 = CGPoint(x: x + w * 0.08, y: 0)
            g.color0 = CIColor(red: 1, green: 1, blue: 1)
            g.color1 = CIColor(red: 0, green: 0, blue: 0)
            let mask = (g.outputImage ?? CIImage.empty()).cropped(to: rect)
            return EffectsKit.blend(to, over: from, mask: mask).cropped(to: rect)
        case .lightLeak:
            let base = mix(from, to, e)
            let leak = ScheduledEffect(effect: Effect(type: .lightLeak, segmentIndex: -1, startOffset: 0, duration: 1,
                                                      intensity: sin(.pi * p), focusX: 0.5, focusY: 0.5,
                                                      color: "#FF9A3C", secondaryColor: "#FF3D7F"),
                                       start: time - 0.5, end: time + 0.5)
            let flash = CIImage(color: CIColor(red: 1, green: 0.85, blue: 0.6, alpha: CGFloat(0.5 * sin(.pi * p)))).cropped(to: rect)
            return EffectsKit.applyStyle(flash.composited(over: base), effects: [leak], time: time, rect: rect) { nil }
        }
    }
}

/// El compositor que AVFoundation llama para cada cuadro (vista previa y exportación).
final class EditCompositor: NSObject, AVVideoCompositing {
    private static let attributes: [String: any Sendable] = [
        kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA),
        kCVPixelBufferIOSurfacePropertiesKey as String: [String: Int](),
    ]
    var sourcePixelBufferAttributes: [String: any Sendable]? { Self.attributes }
    var requiredPixelBufferAttributesForRenderContext: [String: any Sendable] { Self.attributes }

    private let queue = DispatchQueue(label: "mimente.compositor", qos: .userInitiated)
    private let lock = NSLock()
    private var generation = 0

    func renderContextChanged(_ newRenderContext: AVVideoCompositionRenderContext) {}

    func startRequest(_ request: AVAsynchronousVideoCompositionRequest) {
        lock.lock(); let gen = generation; lock.unlock()
        queue.async { [weak self] in
            guard let self else { return }
            self.lock.lock(); let current = self.generation; self.lock.unlock()
            if gen != current { request.finishCancelledRequest(); return }
            autoreleasepool {
                guard let instruction = request.videoCompositionInstruction as? EditInstruction else {
                    request.finish(with: NSError(domain: "MiMente", code: 2))
                    return
                }
                instruction.renderer.render(request, instruction: instruction)
            }
        }
    }

    func cancelAllPendingVideoCompositionRequests() {
        lock.lock(); generation += 1; lock.unlock()
    }
}

extension CGImagePropertyOrientation {
    /// Convierte la transformación de la pista (cómo se sostuvo el iPhone) en orientación de imagen.
    init(transform t: CGAffineTransform) {
        if t.a == 0 && t.b == 1 && t.c == -1 && t.d == 0 { self = .right }
        else if t.a == 0 && t.b == -1 && t.c == 1 && t.d == 0 { self = .left }
        else if t.a == -1 && t.b == 0 && t.c == 0 && t.d == -1 { self = .down }
        else { self = .up }
    }
}
