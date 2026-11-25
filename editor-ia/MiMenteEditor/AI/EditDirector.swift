import Foundation
import CoreGraphics

/// Todo lo que la IA "ve" del video: cuadros de muestra, transcripción y datos básicos.
struct MediaContext {
    var duration: Double
    var width: Int
    var height: Int
    var frames: [(time: Double, jpeg: Data)]
    var transcript: [CaptionLine]
}

/// El "director": le pide a Claude que edite el video o que cambie la edición actual.
struct EditDirector {
    let client: ClaudeClient

    func createPlan(context: MediaContext) async throws -> DirectorResponse {
        let task = """
        Edit this video from scratch. Make it look professional and engaging: cut dead time and \
        mistakes, choose a fitting color grade, add tasteful transitions, a few short text overlays \
        where they help, and turn on captions if there is speech. If it fits the content, add a short \
        generated intro and/or outro scene. In "reply", tell the user in 1-2 casual sentences (in Spanish) \
        what you did.
        """
        return try await run(context: context, task: task)
    }

    func revise(plan: EditPlan, request: String, history: [String], context: MediaContext) async throws -> DirectorResponse {
        let planJSON = (try? String(data: JSONEncoder.sorted.encode(plan), encoding: .utf8)) ?? "{}"
        let past = history.isEmpty ? "(none)" : history.enumerated().map { "\($0.offset + 1). \($0.element)" }.joined(separator: "\n")
        let task = """
        The user already has this edit and wants a change.

        Previous requests from the user (already applied):
        \(past)

        Current edit plan:
        \(planJSON)

        New request from the user:
        \(request)

        Return the full updated plan. Change only what the request implies and keep everything else \
        exactly as it is. If indices shift because you add or remove segments, fix the segmentIndex of \
        the texts. In "reply", confirm in 1-2 casual sentences, in the user's language, what you changed \
        (or explain briefly what you could not do and what you did instead).
        """
        return try await run(context: context, task: task)
    }

    private func run(context: MediaContext, task: String) async throws -> DirectorResponse {
        var content: [[String: Any]] = []
        for frame in context.frames {
            content.append(["type": "text", "text": String(format: "Frame at %.1fs:", frame.time)])
            content.append(["type": "image",
                            "source": ["type": "base64", "media_type": "image/jpeg",
                                       "data": frame.jpeg.base64EncodedString()]])
        }
        // El bloque de contexto lleva cache_control: los cuadros y la transcripción no cambian
        // entre ediciones, así que cada cambio que pidas sale más rápido y barato.
        content.append(["type": "text", "text": contextText(context), "cache_control": ["type": "ephemeral"]])
        content.append(["type": "text", "text": task])

        let data = try await client.requestJSON(system: Self.systemPrompt, content: content, schema: PlanSchema.response)
        do {
            var result = try JSONDecoder().decode(DirectorResponse.self, from: data)
            result.plan = result.plan.sanitized(sourceDuration: context.duration)
            return result
        } catch {
            throw ClaudeError(message: "No pude leer el plan de la IA. Intenta de nuevo.")
        }
    }

    private func contextText(_ c: MediaContext) -> String {
        let orientation = c.height > c.width ? "vertical" : (c.height == c.width ? "square" : "horizontal")
        var lines = [
            "Source video duration: \(String(format: "%.2f", c.duration)) s",
            "Resolution: \(c.width)x\(c.height) (\(orientation))",
            "",
            "Speech transcript (source-video seconds):",
        ]
        if c.transcript.isEmpty {
            lines.append("(no speech detected)")
        } else {
            for l in c.transcript {
                lines.append(String(format: "[%.2f–%.2f] ", l.start, l.end) + l.text)
            }
        }
        return lines.joined(separator: "\n")
    }

    static let systemPrompt = """
    You are the automatic video editor inside an iPhone app. The user uploads a raw video; you receive \
    frames sampled from it (with timestamps), the speech transcript and basic metadata, and you return a \
    complete edit plan as JSON. The app renders your plan exactly, so every number matters.

    How the plan works:
    - segments: the final timeline, in order. You can cut, reorder, repeat, speed up or slow down parts.
      - kind "clip": a piece of the source video from sourceStart to sourceEnd (seconds, within the \
    source duration, at least 0.5 s long). speed: 1 = normal, 0.25–4 allowed (0.5 slow motion, 2 fast). \
    For clips set sceneDuration 0, sceneTitle "", sceneSubtitle "", sceneStyle "aurora", sceneColors [].
      - kind "scene": a generated motion-graphics scene (intro, outro, chapter card). sceneDuration 1.5–6 s, \
    sceneTitle short (max ~5 words), sceneSubtitle optional (can be ""). sceneStyle: aurora, sunset, neon, \
    dark, light = animated gradients; photo_kenburns = a slow zoom over a blurred, darkened frame of the \
    source video taken at sourceStart (great for intros/outros that match the video). sceneColors: 2–3 hex \
    colors for the gradient, or [] for the style's defaults. For scenes set sourceEnd = sourceStart and speed 1.
      - transitionIn: how this segment enters from the previous one. The first segment must use "none". \
    Types: none (hard cut), crossfade, fade_black, flash_white, zoom, slide_left. Duration 0.2–1.2 s. \
    Hard cuts are fine and often better for fast-paced content; don't put a fancy transition everywhere.
    - texts: overlays. segmentIndex = index in segments; startOffset = seconds after that segment starts; \
    duration in seconds. Keep text short and readable. position: top, center, bottom, lower_third. \
    style: title, bold, subtitle, neon, minimal, boxed. size: small, medium, large. color: hex like "#FFFFFF". \
    animation: none, fade, pop, slide_up, typewriter. Avoid the captions' position while captions are on.
    - captions: automatic subtitles from the transcript (the app places them). enabled, style (usually \
    subtitle or bold), position (usually bottom), color hex.
    - color: preset (none, cinematic, warm, cool, vintage, black_white, vibrant, teal_orange, moody, pastel) \
    plus fine adjustments applied on top: exposure -1..1 (0 neutral), contrast 0.5..1.5 (1 neutral), \
    saturation 0..2 (1 neutral), temperature -1 (cool) .. 1 (warm), vignette 0..1.
    - audio: originalVolume 0..2 (1 normal, 0 mute), fadeInOut.

    Editing guidance:
    - Look at the frames to understand what happens and when; use the transcript to keep complete \
    sentences and cut silences, filler and false starts. Never cut a sentence in the middle.
    - Match the style to the content (vlog, travel, sports, tutorial, party, product...).
    - When the user asks for a change, they write casually in Spanish or English ("ponle colores más \
    cálidos", "quita la parte del principio", "el texto más grande"). Interpret it like a human editor would.
    - You cannot add music or new real footage. If asked, say so in reply and offer what you can do \
    (e.g. a generated scene).
    """
}

extension JSONEncoder {
    static var sorted: JSONEncoder {
        let e = JSONEncoder()
        e.outputFormatting = [.sortedKeys]
        return e
    }
}
