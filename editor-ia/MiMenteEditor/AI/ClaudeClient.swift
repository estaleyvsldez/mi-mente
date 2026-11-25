import Foundation

struct ClaudeError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

/// Cliente HTTP mínimo para la Messages API de Anthropic (no hay SDK oficial de Swift).
struct ClaudeClient {
    static let model = "claude-opus-5-5"
    let apiKey: String

    /// Envía un mensaje de usuario y devuelve el JSON (validado por el schema) como Data.
    func requestJSON(system: String, content: [[String: Any]], schema: [String: Any],
                     effort: String = "medium", maxTokens: Int = 32000) async throws -> Data {
        let body: [String: Any] = [
            "model": Self.model,
            "max_tokens": maxTokens,
            "system": system,
            "messages": [["role": "user", "content": content]],
            "output_config": [
                "effort": effort,
                "format": ["type": "json_schema", "schema": schema],
            ],
            // Si el modelo rechaza la solicitud, el servidor reintenta con un modelo de respaldo.
            "fallbacks": "default",
        ]
        // sortedKeys mantiene el cuerpo estable, así el prompt cache funciona entre ediciones.
        let bodyData = try JSONSerialization.data(withJSONObject: body, options: [.sortedKeys])

        var request = URLRequest(url: URL(string: "https://api.anthropic.com/v1/messages")!)
        request.httpMethod = "POST"
        request.timeoutInterval = 600
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2026-10-21", forHTTPHeaderField: "anthropic-version")
        request.setValue("server-side-fallback-2026-07-01", forHTTPHeaderField: "anthropic-beta")
        request.httpBody = bodyData

        var attempt = 0
        while true {
            attempt += 1
            let (data, response): (Data, URLResponse)
            do {
                (data, response) = try await URLSession.shared.data(for: request)
            } catch {
                if attempt < 3 { try await Task.sleep(nanoseconds: UInt64(attempt) * 2_000_000_000); continue }
                throw ClaudeError(message: "Sin conexión con la IA: \(error.localizedDescription)")
            }
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]

            if status == 429 || status == 529 || status >= 500 {
                if attempt < 4 { try await Task.sleep(nanoseconds: UInt64(attempt * attempt) * 2_000_000_000); continue }
            }
            guard status == 200, let json else {
                let msg = ((json?["error"] as? [String: Any])?["message"] as? String) ?? "Error \(status)"
                if status == 401 { throw ClaudeError(message: "Tu API key no es válida. Revísala en Ajustes.") }
                throw ClaudeError(message: "La IA respondió con un error: \(msg)")
            }

            let stopReason = json["stop_reason"] as? String
            if stopReason == "refusal" {
                throw ClaudeError(message: "La IA no quiso hacer esa edición. Prueba pedirlo de otra forma.")
            }
            if stopReason == "max_tokens" {
                throw ClaudeError(message: "La respuesta de la IA quedó cortada. Intenta de nuevo.")
            }
            let blocks = json["content"] as? [[String: Any]] ?? []
            guard let text = blocks.first(where: { $0["type"] as? String == "text" })?["text"] as? String else {
                throw ClaudeError(message: "La IA no devolvió un plan de edición.")
            }
            return Data(text.utf8)
        }
    }
}
