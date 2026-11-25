import AVFoundation
import Photos

enum Exporter {
    /// Renderiza la edición a un .mp4 en alta calidad.
    static func export(_ edit: BuiltEdit, progress: @escaping (Double) -> Void) async throws -> URL {
        guard let session = AVAssetExportSession(asset: edit.composition, presetName: AVAssetExportPresetHighestQuality) else {
            throw ClaudeError(message: "No pude preparar la exportación.")
        }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("MiMente-\(UUID().uuidString.prefix(6)).mp4")
        session.outputURL = url
        session.outputFileType = .mp4
        session.videoComposition = edit.videoComposition
        session.audioMix = edit.audioMix
        session.audioTimePitchAlgorithm = .spectral
        session.shouldOptimizeForNetworkUse = true

        let ticker = Task {
            while !Task.isCancelled {
                progress(Double(session.progress))
                try? await Task.sleep(nanoseconds: 200_000_000)
            }
        }
        await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
            session.exportAsynchronously { cont.resume() }
        }
        ticker.cancel()
        guard session.status == .completed else {
            throw ClaudeError(message: "Falló la exportación: \(session.error?.localizedDescription ?? "error desconocido")")
        }
        progress(1)
        return url
    }

    static func saveToPhotos(_ url: URL) async throws {
        let status = await PHPhotoLibrary.requestAuthorization(for: .addOnly)
        guard status == .authorized || status == .limited else {
            throw ClaudeError(message: "Necesito permiso para guardar en Fotos (Ajustes > Privacidad > Fotos).")
        }
        try await PHPhotoLibrary.shared().performChanges {
            PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: url)
        }
    }
}
