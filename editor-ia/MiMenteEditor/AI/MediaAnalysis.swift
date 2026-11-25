import AVFoundation
import Speech
import UIKit

/// El video original ya cargado, con lo que el motor necesita saber de él.
struct SourceMedia {
    let url: URL
    let asset: AVURLAsset
    let videoTrack: AVAssetTrack
    let audioTrack: AVAssetTrack?
    let duration: Double
    let naturalSize: CGSize
    let transform: CGAffineTransform
    /// Tamaño ya rotado (como se ve en el iPhone).
    let displaySize: CGSize

    static func load(_ url: URL) async throws -> SourceMedia {
        let asset = AVURLAsset(url: url, options: [AVURLAssetPreferPreciseDurationAndTimingKey: true])
        let duration = try await asset.load(.duration).seconds
        guard let video = try await asset.loadTracks(withMediaType: .video).first else {
            throw ClaudeError(message: "Ese archivo no tiene video.")
        }
        let audio = try await asset.loadTracks(withMediaType: .audio).first
        let (size, transform) = try await video.load(.naturalSize, .preferredTransform)
        let rect = CGRect(origin: .zero, size: size).applying(transform)
        return SourceMedia(url: url, asset: asset, videoTrack: video, audioTrack: audio,
                           duration: duration, naturalSize: size, transform: transform,
                           displaySize: CGSize(width: abs(rect.width), height: abs(rect.height)))
    }

    /// Tamaño de render: la orientación del original, máximo 1920 px de lado largo, números pares.
    var renderSize: CGSize {
        let scale = min(1, 1920 / max(displaySize.width, displaySize.height, 1))
        func even(_ v: CGFloat) -> CGFloat { CGFloat(Int((v * scale) / 2) * 2) }
        return CGSize(width: max(even(displaySize.width), 2), height: max(even(displaySize.height), 2))
    }

    /// Cuadro del video en un momento dado (ya rotado).
    func frame(at seconds: Double, maxSize: CGSize = .zero) async -> CGImage? {
        let gen = AVAssetImageGenerator(asset: asset)
        gen.appliesPreferredTrackTransform = true
        gen.maximumSize = maxSize
        gen.requestedTimeToleranceBefore = CMTime(seconds: 0.3, preferredTimescale: 600)
        gen.requestedTimeToleranceAfter = CMTime(seconds: 0.3, preferredTimescale: 600)
        return try? await gen.image(at: CMTime(seconds: seconds, preferredTimescale: 600)).image
    }
}

enum FrameSampler {
    /// Toma entre 6 y 16 cuadros repartidos por el video, en JPEG pequeño para la IA.
    static func sample(_ media: SourceMedia) async -> [(time: Double, jpeg: Data)] {
        let count = Int((media.duration / 4).rounded()).clamped(6, 16)
        var result: [(Double, Data)] = []
        for i in 0..<count {
            let t = media.duration * (Double(i) + 0.5) / Double(count)
            if let img = await media.frame(at: t, maxSize: CGSize(width: 512, height: 512)),
               let jpeg = UIImage(cgImage: img).jpegData(compressionQuality: 0.6) {
                result.append((t, jpeg))
            }
        }
        return result
    }
}

private extension Int {
    func clamped(_ lo: Int, _ hi: Int) -> Int { Swift.min(Swift.max(self, lo), hi) }
}

/// Transcribe el audio del video con el reconocimiento de voz del iPhone (en el dispositivo si se puede).
enum Transcriber {
    static func transcribe(_ media: SourceMedia) async -> [CaptionLine] {
        guard media.audioTrack != nil else { return [] }
        let status = await withCheckedContinuation { cont in
            SFSpeechRecognizer.requestAuthorization { cont.resume(returning: $0) }
        }
        guard status == .authorized,
              let recognizer = SFSpeechRecognizer() ?? SFSpeechRecognizer(locale: Locale(identifier: "es-ES")),
              recognizer.isAvailable else { return [] }

        guard let audioURL = await extractAudio(media) else { return [] }
        defer { try? FileManager.default.removeItem(at: audioURL) }

        let request = SFSpeechURLRecognitionRequest(url: audioURL)
        request.shouldReportPartialResults = false
        if recognizer.supportsOnDeviceRecognition { request.requiresOnDeviceRecognition = true }
        request.addsPunctuation = true

        let segments: [SFTranscriptionSegment] = await withCheckedContinuation { cont in
            var finished = false
            recognizer.recognitionTask(with: request) { result, error in
                guard !finished else { return }
                if let result, result.isFinal {
                    finished = true
                    cont.resume(returning: result.bestTranscription.segments)
                } else if error != nil {
                    finished = true
                    cont.resume(returning: [])
                }
            }
        }
        return group(segments)
    }

    /// Junta palabras en líneas cortas de subtítulo (máx. ~6 palabras o una pausa).
    private static func group(_ words: [SFTranscriptionSegment]) -> [CaptionLine] {
        var lines: [CaptionLine] = []
        var current: [SFTranscriptionSegment] = []
        func flush() {
            guard let first = current.first, let last = current.last else { return }
            let text = current.map(\.substring).joined(separator: " ")
            let words = current.map { CaptionWord(text: $0.substring, start: $0.timestamp, end: $0.timestamp + $0.duration) }
            lines.append(CaptionLine(start: first.timestamp, end: last.timestamp + last.duration, text: text, words: words))
            current.removeAll()
        }
        for w in words {
            if let last = current.last {
                let gap = w.timestamp - (last.timestamp + last.duration)
                let endsSentence = last.substring.last.map { ".?!".contains($0) } ?? false
                if gap > 0.6 || current.count >= 8 || endsSentence { flush() }
            }
            current.append(w)
        }
        flush()
        return lines
    }

    private static func extractAudio(_ media: SourceMedia) async -> URL? {
        guard let export = AVAssetExportSession(asset: media.asset, presetName: AVAssetExportPresetAppleM4A) else { return nil }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("audio-\(UUID().uuidString).m4a")
        export.outputURL = url
        export.outputFileType = .m4a
        await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
            export.exportAsynchronously { cont.resume() }
        }
        return export.status == .completed ? url : nil
    }
}
