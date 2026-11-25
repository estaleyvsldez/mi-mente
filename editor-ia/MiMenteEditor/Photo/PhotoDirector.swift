import Foundation

struct PhotoResponse: Codable {
    var reply: String
    var plan: PhotoPlan
    /// Si no está vacío, la app hace una edición generativa con IA (fal.ai) con este prompt.
    var generativePrompt: String
}

/// El "retocador": Claude decide la edición de la foto como un retocador de Photoshop.
struct PhotoDirector {
    let client: ClaudeClient

    static let schema: [String: Any] = {
        func obj(_ props: [String: Any]) -> [String: Any] {
            ["type": "object", "properties": props, "required": props.keys.sorted(), "additionalProperties": false]
        }
        let number: [String: Any] = ["type": "number"]
        let string: [String: Any] = ["type": "string"]
        let boolean: [String: Any] = ["type": "boolean"]
        let plan = obj([
            "title": string,
            "crop": ["type": "string", "enum": VideoFormat.allCases.map(\.rawValue)],
            "focusX": number, "focusY": number,
            "straighten": number,
            "flipHorizontal": boolean,
            "color": PlanSchema.colorGrade,
            "retouch": number,
            "background": ["type": "string", "enum": PhotoBackground.allCases.map(\.rawValue)],
            "backgroundColor": string,
            "backgroundBlur": number,
            "effects": ["type": "array", "items": PlanSchema.effect],
            "texts": ["type": "array", "items": PlanSchema.text],
        ])
        return obj(["reply": string, "plan": plan, "generativePrompt": string])
    }()

    func edit(image jpeg: Data, plan: PhotoPlan, request: String?, history: [String], width: Int, height: Int) async throws -> PhotoResponse {
        let planJSON = (try? String(data: JSONEncoder.sorted.encode(plan), encoding: .utf8)) ?? "{}"
        let past = history.isEmpty ? "(none)" : history.enumerated().map { "\($0.offset + 1). \($0.element)" }.joined(separator: "\n")
        let task: String
        if let request {
            task = """
            Previous requests (already applied):
            \(past)

            Current photo plan:
            \(planJSON)

            New request from the user: \(request)

            Return the full updated plan, changing only what the request implies. In "reply", confirm in 1–2 \
            casual sentences in the user's language.
            """
        } else {
            task = """
            Retouch this photo from scratch like a top retoucher: correct exposure and white balance, then give \
            it a strong, tasteful look that fits the content; add subtle retouch for portraits. Don't add text or \
            effects unless they clearly help. generativePrompt "". In "reply", 1–2 casual sentences in Spanish.
            """
        }
        let content: [[String: Any]] = [
            ["type": "image", "source": ["type": "base64", "media_type": "image/jpeg", "data": jpeg.base64EncodedString()]],
            ["type": "text", "text": "Photo: \(width)x\(height). Imported LUTs: \(ColorLUT.importedLUTNames().joined(separator: ", "))",
             "cache_control": ["type": "ephemeral"]],
            ["type": "text", "text": task],
        ]
        let data = try await client.requestJSON(system: Self.systemPrompt, content: content, schema: Self.schema)
        do {
            var r = try JSONDecoder().decode(PhotoResponse.self, from: data)
            r.plan = r.plan.sanitized
            return r
        } catch {
            throw ClaudeError(message: "No pude leer la edición de la IA. Intenta de nuevo.")
        }
    }

    static let systemPrompt = """
    You are a world-class photo retoucher and designer inside an iPhone app (think Photoshop + Lightroom). \
    You see the photo and return a COMPLETE photo plan as JSON that the app renders exactly.

    - crop: original, 9:16, 4:5, 1:1, 16:9, 21:9 with focusX/focusY (0–1, y from top) as the point to keep. \
    straighten −45..45°, flipHorizontal.
    - color: the same pro grading pipeline as a colorist (neutral = all zeros, presetIntensity 1, lutIntensity 1, \
    skinProtect 0.5). preset: none, cinematic, teal_orange, warm, cool, golden_hour, kodak_film, fuji_film, \
    bleach_bypass, cross_process, matrix, cyberpunk, nordic, vintage, faded_film, noir, black_white, sepia, \
    vibrant, hdr_pop, moody, pastel, dreamy, desert, arctic, neon_night; exposure −2..2; contrast, highlights, \
    shadows, whites, blacks, temperature, tint, saturation, vibrance −1..1; lift/gamma/gain wheels (hue 0–360, \
    amount 0–1, luma −1..1); split toning; hsl per band; fade, clarity, sharpen, grain, bloom, halation, vignette.
    - retouch 0–1: skin smoothing on the person (0.2–0.4 natural).
    - background: keep, remove (transparent cutout), blur (portrait mode, backgroundBlur 0–1), color \
    (backgroundColor), darken (spotlight), black_white (color pop).
    - effects: same types as video (style ones; camera moves do nothing on photos). segmentIndex −1, \
    startOffset 0, duration 0, intensity 0–1, focus, color, secondaryColor.
    - texts: like a designer (x, y center 0–1, font, weight, size as fraction of width, color, gradientColor, \
    stroke, shadow, glow, background, uppercase, letterSpacing, align, rotation, maxWidth, behindSubject for the \
    depth effect). For photos set segmentIndex 0, startOffset 0, duration 10, animationIn/out "none", loop "none".
    - generativePrompt: ONLY when the user asks for something that needs generative AI (remove an object or \
    person, add or replace objects, change the sky/background to a new scene, change clothes, expand the image, \
    change the camera angle or pose…). Write a precise English instruction for an image-editing model \
    ("Remove the person in the red shirt on the left, fill naturally"). Otherwise "". When you use it, keep the \
    rest of the plan as it was (the edit is applied to the photo first, then your plan).
    """
}
