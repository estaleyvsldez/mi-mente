import AVFoundation
import UIKit

/// Analiza un video de referencia (uno que te guste) para copiar su estilo de edición.
enum ReferenceAnalyzer {
    /// Devuelve una "guía de estilo" en texto que el director usa al editar.
    static func analyze(_ url: URL, client: ClaudeClient) async throws -> String {
        let media = try await SourceMedia.load(url)
        let cuts = await estimateCuts(media)
        let frames = await FrameSampler.sample(media)

        var content: [[String: Any]] = []
        for f in frames {
            content.append(["type": "text", "text": String(format: "Reference frame at %.1fs:", f.time)])
            content.append(["type": "image", "source": ["type": "base64", "media_type": "image/jpeg",
                                                        "data": f.jpeg.base64EncodedString()]])
        }
        let orientation = media.displaySize.height > media.displaySize.width ? "vertical" : "horizontal"
        content.append(["type": "text", "text": """
        This is a REFERENCE video the user loves (\(String(format: "%.1f", media.duration)) s, \(orientation)). \
        Measured cuts: about \(cuts.count) hard cuts (≈ \(String(format: "%.1f", cuts.perMinute)) per minute, \
        average shot \(String(format: "%.1f", cuts.averageShot)) s).
        Describe its editing style precisely so another editor can reproduce it with the app's tools: pacing and \
        shot length, color grade (closest preset and concrete adjustments: contrast, temperature, saturation, \
        split-tone colors, grain, etc.), typography (font feel, weight, size, case, colors, stroke/glow, \
        position, animations), captions style, transitions, effects (zooms, shakes, flashes, glitches, light \
        leaks…), format/aspect, and overall mood. Be concrete and use the app's vocabulary. 150–250 words.
        """])
        let schema: [String: Any] = ["type": "object", "properties": ["style": ["type": "string"]],
                                     "required": ["style"], "additionalProperties": false]
        let data = try await client.requestJSON(
            system: "You are a senior video editor who reverse-engineers editing styles.",
            content: content, schema: schema)
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let style = json["style"] as? String else {
            throw ClaudeError(message: "No pude analizar el video de referencia.")
        }
        return style
    }

    /// Cuenta cortes comparando cuadros pequeños cada 0.25 s.
    private static func estimateCuts(_ media: SourceMedia) async -> (count: Int, perMinute: Double, averageShot: Double) {
        let gen = AVAssetImageGenerator(asset: media.asset)
        gen.appliesPreferredTrackTransform = true
        gen.maximumSize = CGSize(width: 48, height: 48)
        gen.requestedTimeToleranceBefore = .zero
        gen.requestedTimeToleranceAfter = CMTime(seconds: 0.1, preferredTimescale: 600)
        let step = 0.25
        var previous: [UInt8]?
        var cuts = 0
        var t = 0.0
        while t < min(media.duration, 180) {
            if let img = try? await gen.image(at: CMTime(seconds: t, preferredTimescale: 600)).image,
               let px = pixels(img) {
                if let prev = previous, prev.count == px.count {
                    var diff = 0
                    for i in stride(from: 0, to: px.count, by: 4) {
                        diff += abs(Int(px[i]) - Int(prev[i])) + abs(Int(px[i + 1]) - Int(prev[i + 1])) + abs(Int(px[i + 2]) - Int(prev[i + 2]))
                    }
                    let mean = Double(diff) / Double(px.count / 4 * 3)
                    if mean > 38 { cuts += 1 }
                }
                previous = px
            }
            t += step
        }
        let minutes = max(media.duration, 1) / 60
        return (cuts, Double(cuts) / minutes, media.duration / Double(cuts + 1))
    }

    private static func pixels(_ image: CGImage) -> [UInt8]? {
        let w = 32, h = 32
        var data = [UInt8](repeating: 0, count: w * h * 4)
        let ok = data.withUnsafeMutableBytes { raw -> Bool in
            guard let ctx = CGContext(data: raw.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                                      space: CGColorSpaceCreateDeviceRGB(),
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return false }
            ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
            return true
        }
        return ok ? data : nil
    }
}
