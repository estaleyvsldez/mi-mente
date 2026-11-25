import AVFoundation
import CoreImage
import CoreImage.CIFilterBuiltins
import UIKit

/// Genera las escenas nuevas que pide la IA (intros, outros, tarjetas) como clips de video .mp4.
/// Todo se crea en el iPhone: degradados animados o un "Ken Burns" sobre un cuadro del video.
enum SceneRenderer {
    static let fps: Int32 = 30

    static func defaultColors(_ style: SceneStyle) -> [String] {
        switch style {
        case .aurora: return ["#00C9A7", "#845EC2", "#4D8076"]
        case .sunset: return ["#FF6F61", "#FFC75F", "#D65DB1"]
        case .neon: return ["#0B0B1E", "#FF00E5", "#00F0FF"]
        case .dark: return ["#0D0D0D", "#2B2B2B", "#444444"]
        case .light: return ["#FFFFFF", "#E8E8E8", "#DADADA"]
        case .photoKenBurns: return ["#000000", "#000000", "#000000"]
        }
    }

    static func render(segment: Segment, size: CGSize, background: CGImage?, to url: URL) async throws {
        try? FileManager.default.removeItem(at: url)
        let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: Int(size.width),
            AVVideoHeightKey: Int(size.height),
        ])
        input.expectsMediaDataInRealTime = false
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
            kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA),
            kCVPixelBufferWidthKey as String: Int(size.width),
            kCVPixelBufferHeightKey as String: Int(size.height),
            kCVPixelBufferIOSurfacePropertiesKey as String: [String: Int](),
        ])
        writer.add(input)
        guard writer.startWriting() else { throw writer.error ?? ClaudeError(message: "No pude crear la escena.") }
        writer.startSession(atSourceTime: .zero)

        let rect = CGRect(origin: .zero, size: size)
        let context = CIContext(options: [.cacheIntermediates: false])
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        let painter = ScenePainter(segment: segment, rect: rect, background: background)
        let frameCount = max(1, Int(segment.sceneDuration * Double(fps)))

        for f in 0..<frameCount {
            while !input.isReadyForMoreMediaData { try await Task.sleep(nanoseconds: 3_000_000) }
            guard let pool = adaptor.pixelBufferPool else { break }
            var buffer: CVPixelBuffer?
            CVPixelBufferPoolCreatePixelBuffer(nil, pool, &buffer)
            guard let buffer else { continue }
            let t = Double(f) / Double(fps)
            autoreleasepool {
                context.render(painter.frame(at: t), to: buffer, bounds: rect, colorSpace: colorSpace)
            }
            adaptor.append(buffer, withPresentationTime: CMTime(value: CMTimeValue(f), timescale: fps))
        }
        input.markAsFinished()
        await writer.finishWriting()
        if writer.status != .completed {
            throw writer.error ?? ClaudeError(message: "No pude crear la escena.")
        }
    }
}

private struct ScenePainter {
    let segment: Segment
    let rect: CGRect
    let colors: [CIColor]
    let background: CIImage?
    let title: CIImage?
    let subtitle: CIImage?

    init(segment: Segment, rect: CGRect, background: CGImage?) {
        self.segment = segment
        self.rect = rect
        var hex = segment.sceneColors.isEmpty ? SceneRenderer.defaultColors(segment.sceneStyle) : segment.sceneColors
        while hex.count < 3 { hex.append(hex.last ?? "#000000") }
        self.colors = hex.map { CIColor(color: UIColor(hex: $0, fallback: .black)) }

        if segment.sceneStyle == .photoKenBurns, let background {
            self.background = CIImage(cgImage: background)
        } else {
            self.background = nil
        }
        let textColor = segment.sceneStyle == .light ? "#111111" : "#FFFFFF"
        let isNeon = segment.sceneStyle == .neon
        var titleSpec = TextOverlay.basic(segment.sceneTitle)
        titleSpec.size = 0.1
        titleSpec.color = textColor
        titleSpec.font = isNeon ? .rounded : .futura
        titleSpec.weight = .black
        titleSpec.uppercase = true
        titleSpec.letterSpacing = 0.04
        titleSpec.shadow = segment.sceneStyle == .light ? 0 : 0.5
        if isNeon { titleSpec.glowColor = segment.sceneColors.last ?? "#FF00E5"; titleSpec.glowAmount = 0.8 }
        var subSpec = TextOverlay.basic(segment.sceneSubtitle)
        subSpec.size = 0.045
        subSpec.color = textColor
        subSpec.font = .avenir
        subSpec.weight = .medium
        subSpec.letterSpacing = 0.15
        subSpec.uppercase = true
        subSpec.shadow = 0.3
        self.title = segment.sceneTitle.isEmpty ? nil : TextEngine.image(for: titleSpec, canvas: rect.size)
        self.subtitle = segment.sceneSubtitle.isEmpty ? nil : TextEngine.image(for: subSpec, canvas: rect.size)
    }

    func frame(at t: Double) -> CIImage {
        let duration = max(segment.sceneDuration, 0.1)
        let p = t / duration
        var image = backgroundFrame(p)

        func place(_ img: CIImage?, centerY: CGFloat, delay: Double) {
            guard let img else { return }
            let local = t - delay
            let inP = smooth((local / 0.7).clamped(0, 1))
            let outP = ((duration - t) / 0.45).clamped(0, 1)
            let alpha = inP * outP
            guard alpha > 0.001 else { return }
            let s = CGFloat(0.92 + 0.08 * inP)
            let e = img.extent
            var placed = img.transformed(by: CGAffineTransform(translationX: -e.midX, y: -e.midY)
                .concatenating(CGAffineTransform(scaleX: s, y: s))
                .concatenating(CGAffineTransform(translationX: rect.midX, y: centerY)))
            let f = CIFilter.colorMatrix()
            f.inputImage = placed
            f.aVector = CIVector(x: 0, y: 0, z: 0, w: alpha)
            placed = f.outputImage ?? placed
            image = placed.composited(over: image)
        }
        let titleH = title?.extent.height ?? 0
        let subH = subtitle?.extent.height ?? 0
        let block = titleH + subH
        let top = rect.midY + block / 2
        place(title, centerY: top - titleH / 2, delay: 0)
        place(subtitle, centerY: top - titleH - subH / 2, delay: 0.3)
        return image.cropped(to: rect)
    }

    private func smooth(_ x: Double) -> Double { x * x * (3 - 2 * x) }

    private func backgroundFrame(_ p: Double) -> CIImage {
        if let background {
            // Ken Burns: zoom lento + desenfoque + oscurecido para que el título se lea.
            var img = background
            let s0 = max(rect.width / img.extent.width, rect.height / img.extent.height)
            let s = s0 * (1.0 + 0.12 * CGFloat(p))
            img = img.transformed(by: CGAffineTransform(translationX: -img.extent.midX, y: -img.extent.midY)
                .concatenating(CGAffineTransform(scaleX: s, y: s))
                .concatenating(CGAffineTransform(translationX: rect.midX, y: rect.midY)))
            img = img.clampedToExtent().applyingGaussianBlur(sigma: 6).cropped(to: rect)
            let f = CIFilter.exposureAdjust(); f.inputImage = img; f.ev = -1.2
            return (f.outputImage ?? img).cropped(to: rect)
        }

        // Degradado que gira lentamente + un brillo que se mueve.
        let cp = CGFloat(p)
        let angle = CGFloat.pi * (0.25 + 0.5 * cp)
        let r = max(rect.width, rect.height) * 0.6
        let c = CGPoint(x: rect.midX, y: rect.midY)
        let lin = CIFilter.linearGradient()
        lin.point0 = CGPoint(x: c.x + cos(angle) * r, y: c.y + sin(angle) * r)
        lin.point1 = CGPoint(x: c.x - cos(angle) * r, y: c.y - sin(angle) * r)
        lin.color0 = colors[0]
        lin.color1 = colors[1]
        var img = (lin.outputImage ?? CIImage(color: colors[0])).cropped(to: rect)

        let glow = CIFilter.radialGradient()
        glow.center = CGPoint(x: rect.width * (0.25 + 0.5 * cp), y: rect.height * (0.65 - 0.3 * cp))
        glow.radius0 = 0
        glow.radius1 = Float(rect.width * 0.7)
        glow.color0 = CIColor(red: colors[2].red, green: colors[2].green, blue: colors[2].blue, alpha: 0.55)
        glow.color1 = CIColor(red: 0, green: 0, blue: 0, alpha: 0)
        if let g = glow.outputImage?.cropped(to: rect) { img = g.composited(over: img) }
        return img
    }
}
