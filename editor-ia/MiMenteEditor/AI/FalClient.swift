import Foundation
import UIKit

/// Cliente de fal.ai: corre modelos de video/imagen con IA en GPUs en la nube
/// (Kling, Wan, Veo, Flux… lo mismo que usan Higgsfield y sus clones open source).
struct FalClient {
    let key: String

    static let defaultImageToVideo = "fal-ai/kling-video/v2.1/standard/image-to-video"
    static let defaultTextToVideo = "fal-ai/kling-video/v2.1/master/text-to-video"
    static let defaultImageEdit = "fal-ai/flux-pro/kontext"

    /// Envía un trabajo a la cola, espera a que termine y devuelve el JSON del resultado.
    func run(model: String, input: [String: Any], onStatus: @escaping (String) -> Void) async throws -> [String: Any] {
        var submit = request(URL(string: "https://queue.fal.run/\(model)")!)
        submit.httpMethod = "POST"
        submit.httpBody = try JSONSerialization.data(withJSONObject: input)
        let (data, response) = try await URLSession.shared.data(for: submit)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status),
              let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let statusURL = (json["status_url"] as? String).flatMap(URL.init(string:)),
              let responseURL = (json["response_url"] as? String).flatMap(URL.init(string:))
        else {
            if status == 401 || status == 403 { throw ClaudeError(message: "Tu key de fal.ai no es válida (Ajustes).") }
            throw ClaudeError(message: "fal.ai rechazó el trabajo (\(status)): \(Self.errorText(data))")
        }

        let started = Date()
        while true {
            try await Task.sleep(nanoseconds: 3_000_000_000)
            try Task.checkCancellation()
            if Date().timeIntervalSince(started) > 900 {
                throw ClaudeError(message: "La IA de video tardó demasiado. Intenta de nuevo.")
            }
            let (sData, _) = try await URLSession.shared.data(for: request(statusURL))
            let s = (try? JSONSerialization.jsonObject(with: sData)) as? [String: Any] ?? [:]
            switch s["status"] as? String {
            case "IN_QUEUE":
                let pos = s["queue_position"] as? Int
                onStatus(pos.map { "En fila para la IA (posición \($0 + 1))…" } ?? "En fila para la IA…")
            case "IN_PROGRESS":
                onStatus("La IA está generando la escena… \(Int(Date().timeIntervalSince(started)))s")
            case "COMPLETED":
                let (rData, rResp) = try await URLSession.shared.data(for: request(responseURL))
                let code = (rResp as? HTTPURLResponse)?.statusCode ?? 0
                guard (200..<300).contains(code),
                      let result = try JSONSerialization.jsonObject(with: rData) as? [String: Any] else {
                    throw ClaudeError(message: "La IA de video falló: \(Self.errorText(rData))")
                }
                return result
            default:
                continue
            }
        }
    }

    private func request(_ url: URL) -> URLRequest {
        var r = URLRequest(url: url)
        r.timeoutInterval = 120
        r.setValue("Key \(key)", forHTTPHeaderField: "Authorization")
        r.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return r
    }

    private static func errorText(_ data: Data) -> String {
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            if let d = json["detail"] as? String { return d }
            if let d = json["detail"] as? [[String: Any]], let m = d.first?["msg"] as? String { return m }
            if let e = json["error"] as? String { return e }
        }
        return String(data: data.prefix(300), encoding: .utf8) ?? "error desconocido"
    }

    // MARK: - Ayudas

    static func dataURI(_ image: CGImage, maxSide: CGFloat = 1280) -> String? {
        let ui = UIImage(cgImage: image)
        let scale = min(1, maxSide / max(ui.size.width, ui.size.height))
        let size = CGSize(width: ui.size.width * scale, height: ui.size.height * scale)
        let resized = UIGraphicsImageRenderer(size: size).image { _ in ui.draw(in: CGRect(origin: .zero, size: size)) }
        guard let jpeg = resized.jpegData(compressionQuality: 0.88) else { return nil }
        return "data:image/jpeg;base64," + jpeg.base64EncodedString()
    }

    static func videoURL(in json: [String: Any]) -> URL? {
        if let v = json["video"] as? [String: Any], let u = v["url"] as? String { return URL(string: u) }
        if let vs = json["videos"] as? [[String: Any]], let u = vs.first?["url"] as? String { return URL(string: u) }
        return nil
    }

    static func imageURL(in json: [String: Any]) -> URL? {
        if let i = json["images"] as? [[String: Any]], let u = i.first?["url"] as? String { return URL(string: u) }
        if let i = json["image"] as? [String: Any], let u = i["url"] as? String { return URL(string: u) }
        return nil
    }

    static func download(_ url: URL, ext: String) async throws -> URL {
        let (tmp, _) = try await URLSession.shared.download(from: url)
        let dst = FileManager.default.temporaryDirectory.appendingPathComponent("fal-\(UUID().uuidString).\(ext)")
        try FileManager.default.moveItem(at: tmp, to: dst)
        return dst
    }

    // MARK: - Casos de uso

    /// Escena de video con IA: desde un cuadro de tu video (otro ángulo) o solo desde texto.
    func generateScene(prompt: String, camera: CameraMove, startFrame: CGImage?, seconds: Double,
                       imageToVideoModel: String, textToVideoModel: String,
                       onStatus: @escaping (String) -> Void) async throws -> URL {
        let fullPrompt = "\(prompt). Camera: \(camera.promptText). Cinematic, highly detailed, realistic motion."
        var input: [String: Any] = ["prompt": fullPrompt]
        let model: String
        if let startFrame, let uri = Self.dataURI(startFrame) {
            input["image_url"] = uri
            model = imageToVideoModel
        } else {
            model = textToVideoModel
        }
        if model.contains("kling") { input["duration"] = seconds > 7.5 ? "10" : "5" }
        let result = try await run(model: model, input: input, onStatus: onStatus)
        guard let url = Self.videoURL(in: result) else { throw ClaudeError(message: "La IA no devolvió un video.") }
        onStatus("Descargando la escena…")
        return try await Self.download(url, ext: "mp4")
    }

    /// Edición de foto con IA (tipo relleno generativo): "quita a la persona", "cambia el cielo"…
    func editImage(_ image: CGImage, prompt: String, model: String, onStatus: @escaping (String) -> Void) async throws -> URL {
        guard let uri = Self.dataURI(image, maxSide: 2048) else { throw ClaudeError(message: "No pude preparar la foto.") }
        var input: [String: Any] = ["prompt": prompt]
        if model.contains("nano-banana") || model.contains("seedream") { input["image_urls"] = [uri] } else { input["image_url"] = uri }
        let result = try await run(model: model, input: input, onStatus: onStatus)
        guard let url = Self.imageURL(in: result) else { throw ClaudeError(message: "La IA no devolvió una imagen.") }
        return try await Self.download(url, ext: "png")
    }
}
