import AVFoundation
import CoreImage
import CoreImage.CIFilterBuiltins

/// Qué pista y con qué rotación se dibuja un segmento.
struct LayerRef {
    let trackID: CMPersistentTrackID
    let orientation: CGImagePropertyOrientation
}

/// Un texto ya dibujado, con su tiempo absoluto en la línea de tiempo final.
struct RenderedText {
    let image: CIImage
    let start: Double
    let end: Double
    let position: TextPosition
    let animation: TextAnimation
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

/// Dibuja cada cuadro final: video rotado + transición + color + textos.
final class FrameRenderer {
    let renderSize: CGSize
    let grade: ColorGrade
    let texts: [RenderedText]
    private let rect: CGRect
    private let context = CIContext(options: [.cacheIntermediates: false])
    private let colorSpace = CGColorSpaceCreateDeviceRGB()

    init(renderSize: CGSize, grade: ColorGrade, texts: [RenderedText]) {
        self.renderSize = renderSize
        self.grade = grade
        self.texts = texts
        self.rect = CGRect(origin: .zero, size: renderSize)
    }

    func render(_ request: AVAsynchronousVideoCompositionRequest, instruction: EditInstruction) {
        guard let output = request.renderContext.newPixelBuffer() else {
            request.finish(with: NSError(domain: "MiMente", code: 1))
            return
        }
        let time = request.compositionTime.seconds
        let black = CIImage(color: .black).cropped(to: rect)

        func layer(_ i: Int) -> CIImage? {
            guard instruction.layers.indices.contains(i) else { return nil }
            let ref = instruction.layers[i]
            guard let px = request.sourceFrame(byTrackID: ref.trackID) else { return nil }
            return fill(CIImage(cvPixelBuffer: px), orientation: ref.orientation)
        }

        var image: CIImage
        if let transition = instruction.transition, instruction.layers.count == 2 {
            let from = layer(0) ?? black
            let to = layer(1) ?? black
            let range = instruction.timeRange
            let p = ((time - range.start.seconds) / max(range.duration.seconds, 0.001)).clamped(0, 1)
            image = blend(from: from, to: to, progress: p, type: transition)
        } else {
            image = layer(0) ?? layer(1) ?? black
        }

        image = ColorGrader.apply(image, grade: grade, rect: rect)
        image = overlayTexts(on: image, at: time)
        image = image.composited(over: black).cropped(to: rect)

        context.render(image, to: output, bounds: rect, colorSpace: colorSpace)
        request.finish(withComposedVideoFrame: output)
    }

    // MARK: - Video

    /// Gira el cuadro como se grabó y lo ajusta (aspect fill) al tamaño final.
    func fill(_ input: CIImage, orientation: CGImagePropertyOrientation) -> CIImage {
        var img = input.oriented(orientation)
        img = img.transformed(by: CGAffineTransform(translationX: -img.extent.minX, y: -img.extent.minY))
        let s = max(renderSize.width / img.extent.width, renderSize.height / img.extent.height)
        img = img.transformed(by: CGAffineTransform(scaleX: s, y: s))
        let dx = (renderSize.width - img.extent.width) / 2
        let dy = (renderSize.height - img.extent.height) / 2
        return img.transformed(by: CGAffineTransform(translationX: dx, y: dy)).cropped(to: rect)
    }

    private func mix(_ a: CIImage, _ b: CIImage, _ k: Double) -> CIImage {
        let f = CIFilter.dissolveTransition()
        f.inputImage = a
        f.targetImage = b
        f.time = Float(k.clamped(0, 1))
        return (f.outputImage ?? b).cropped(to: rect)
    }

    private func blend(from: CIImage, to: CIImage, progress p: Double, type: TransitionType) -> CIImage {
        let e = p * p * (3 - 2 * p) // suavizado
        switch type {
        case .none:
            return p < 0.5 ? from : to
        case .crossfade:
            return mix(from, to, e)
        case .fadeBlack, .flashWhite:
            let mid = CIImage(color: type == .fadeBlack ? .black : .white).cropped(to: rect)
            return p < 0.5 ? mix(from, mid, e * 2) : mix(mid, to, (e - 0.5) * 2)
        case .zoom:
            let s = 1 + 0.35 * e
            let zoomed = from
                .transformed(by: CGAffineTransform(translationX: -rect.midX, y: -rect.midY)
                    .concatenating(CGAffineTransform(scaleX: s, y: s))
                    .concatenating(CGAffineTransform(translationX: rect.midX, y: rect.midY)))
                .cropped(to: rect)
            return mix(zoomed, to, e)
        case .slideLeft:
            let w = rect.width
            let a = from.transformed(by: CGAffineTransform(translationX: -w * e, y: 0))
            let b = to.transformed(by: CGAffineTransform(translationX: w * (1 - e), y: 0))
            return b.composited(over: a).cropped(to: rect)
        }
    }

    // MARK: - Textos

    private func overlayTexts(on base: CIImage, at t: Double) -> CIImage {
        var out = base
        for item in texts where t >= item.start && t <= item.end {
            let local = t - item.start
            let fadeIn = item.animation == .none ? 1 : (local / 0.35).clamped(0, 1)
            let fadeOut = item.animation == .none ? 1 : ((item.end - t) / 0.3).clamped(0, 1)
            var alpha = fadeIn * fadeOut
            var img = item.image
            let ext = img.extent

            var scale = 1.0
            var dy = 0.0
            switch item.animation {
            case .pop:
                // "Back ease out": crece un poquito de más y se asienta.
                let x = fadeIn
                let c1 = 1.70158, c3 = c1 + 1
                scale = 0.6 + 0.4 * (1 + c3 * pow(x - 1, 3) + c1 * pow(x - 1, 2))
            case .slideUp:
                dy = -renderSize.height * 0.04 * (1 - fadeIn)
            case .typewriter:
                let total = max(0.5, Double(max(item.end - item.start, 1)) * 0.6)
                let f = (local / total).clamped(0, 1)
                img = img.cropped(to: CGRect(x: ext.minX, y: ext.minY, width: ext.width * f, height: ext.height))
                alpha = fadeOut
            case .fade, .none:
                break
            }

            // Posición (Core Image tiene el origen abajo a la izquierda).
            let x = (renderSize.width - ext.width) / 2
            let y: CGFloat
            switch item.position {
            case .top: y = renderSize.height * 0.88 - ext.height
            case .center: y = (renderSize.height - ext.height) / 2
            case .lowerThird: y = renderSize.height * 0.24
            case .bottom: y = renderSize.height * 0.08
            }
            var transform = CGAffineTransform(translationX: -ext.midX, y: -ext.midY)
                .concatenating(CGAffineTransform(scaleX: scale, y: scale))
                .concatenating(CGAffineTransform(translationX: x + ext.width / 2, y: y + ext.height / 2 + dy))
            if item.animation == .typewriter {
                // Mantener el texto anclado a la izquierda mientras aparece.
                transform = CGAffineTransform(translationX: x - ext.minX, y: y - ext.minY)
            }
            img = img.transformed(by: transform)

            if alpha < 0.999 {
                let f = CIFilter.colorMatrix()
                f.inputImage = img
                f.aVector = CIVector(x: 0, y: 0, z: 0, w: alpha)
                img = f.outputImage ?? img
            }
            out = img.composited(over: out)
        }
        return out
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
