import Foundation
import CoreGraphics

/// Todo lo que la IA "ve" del video: cuadros de muestra, transcripción y datos básicos.
struct MediaContext {
    var duration: Double
    var width: Int
    var height: Int
    var frames: [(time: Double, jpeg: Data)]
    var transcript: [CaptionLine]
    var aiVideoAvailable = false
    var reference: String = ""   // estilo del video de referencia (si hay)
}

/// Los departamentos del equipo de agentes expertos.
enum Department: String, CaseIterable {
    case story, color, text, vfx, sound

    var name: String {
        switch self {
        case .story: return "🎬 Editor"
        case .color: return "🎨 Colorista"
        case .text: return "✍️ Diseñador"
        case .vfx: return "✨ VFX"
        case .sound: return "🎧 Sonido"
        }
    }

    var role: String {
        switch self {
        case .story: return "YOU ARE THE EDITOR. Your department: title, summary, format and segments (cuts, order, speed, speed ramps, reframing focus, transitions, generated scenes and ai_video shots). Return only that."
        case .color: return "YOU ARE THE COLORIST. Your department: the global color grade. Return only that. (Per-segment grades belong to the editor.)"
        case .text: return "YOU ARE THE MOTION DESIGNER. Your department: texts (titles, overlays) and captions. Use the FINAL TIMELINE to place texts. Return only that."
        case .vfx: return "YOU ARE THE VFX ARTIST. Your department: effects (camera moves and style effects, person-aware ones included). Use the FINAL TIMELINE. Return only that."
        case .sound: return "YOU ARE THE SOUND ENGINEER. Your department: audio (voice cleanup, voice preset, EQ, dynamics, reverb, pitch, loudness, music and ducking). Return only that."
        }
    }
}

private struct StoryPart: Codable { var reply: String; var title: String; var summary: String; var format: VideoFormat; var segments: [Segment] }
private struct ColorPart: Codable { var reply: String; var color: ColorGrade }
private struct TextPart: Codable { var reply: String; var texts: [TextOverlay]; var captions: Captions }
private struct VFXPart: Codable { var reply: String; var effects: [Effect] }
private struct SoundPart: Codable { var reply: String; var audio: AudioSettings }
private struct Route: Codable { var reply: String; var story: String; var color: String; var text: String; var vfx: String; var sound: String }
struct ShotPlan: Codable {
    struct Shot: Codable { var prompt: String; var camera: CameraMove; var seconds: Double }
    var reply: String
    var title: String
    var format: String
    var shots: [Shot]
}

/// El equipo: un productor reparte el trabajo y cada experto hace solo lo suyo, en paralelo.
struct EditDirector {
    let client: ClaudeClient
    /// Avisa a la interfaz qué experto empezó (reply nil) o terminó (reply con su mensaje).
    var onAgent: (String, String?) -> Void = { _, _ in }

    func createPlan(context: MediaContext) async throws -> DirectorResponse {
        var plan = EditPlan.passthrough(duration: context.duration)
        let brief = """
        Edit this video from scratch like a senior editor for a top creator: hook in the first seconds, cut dead \
        time and mistakes, strong color that fits the content, motion typography with intent, captions if there \
        is speech, purposeful transitions and 2–6 "wow" effect moments (punch-ins, flashes, light leaks, \
        person-aware effects, text behind the subject). Do YOUR department only.
        """
        onAgent(Department.story.name, nil)
        let story: StoryPart = try await run(.story, context: context, plan: nil, instruction: brief, effort: "medium")
        apply(story, to: &plan)
        plan = plan.sanitized(sourceDuration: context.duration)
        onAgent(Department.story.name, story.reply)
        var replies = [story.reply]
        replies += await runParallel([.color, .text, .vfx, .sound], context: context, plan: &plan,
                                     instructions: Dictionary(uniqueKeysWithValues: Department.allCases.map { ($0, brief) }))
        return DirectorResponse(reply: replies.joined(separator: "\n"), plan: plan.sanitized(sourceDuration: context.duration))
    }

    func revise(plan current: EditPlan, request: String, history: [String], context: MediaContext) async throws -> DirectorResponse {
        // 1. El productor decide quién trabaja.
        onAgent("🧭 Productor", nil)
        let summary: [String: Any] = [
            "title": current.title, "format": current.format.rawValue, "segments": current.segments.count,
            "aiScenes": current.segments.filter { $0.kind == .ai }.count,
            "look": current.color.preset.rawValue, "texts": current.texts.map(\.text),
            "captions": current.captions.enabled ? current.captions.template.rawValue : "off",
            "effects": current.effects.map(\.type.rawValue), "music": current.audio.music,
            "voice": current.audio.voicePreset.rawValue,
        ]
        let summaryJSON = (try? JSONSerialization.data(withJSONObject: summary, options: [.sortedKeys]))
            .flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
        let routeData = try await client.requestJSON(
            system: Self.producerPrompt,
            content: [["type": "text", "text": """
            Current edit: \(summaryJSON)
            Previous requests: \(history.joined(separator: " | "))
            AI video generation: \(context.aiVideoAvailable ? "available" : "not configured")
            User request: \(request)
            """]],
            schema: PlanSchema.route, effort: "low", maxTokens: 2000)
        let route = try JSONDecoder().decode(Route.self, from: routeData)
        onAgent("🧭 Productor", route.reply)

        var plan = current
        var replies: [String] = []
        if !route.story.isEmpty {
            onAgent(Department.story.name, nil)
            let story: StoryPart = try await run(.story, context: context, plan: plan, instruction: route.story, effort: "low")
            apply(story, to: &plan)
            plan = plan.sanitized(sourceDuration: context.duration)
            onAgent(Department.story.name, story.reply)
            replies.append(story.reply)
        }
        let instructions: [Department: String] = [.color: route.color, .text: route.text, .vfx: route.vfx, .sound: route.sound]
        let active = instructions.filter { !$0.value.isEmpty }.map(\.key)
        replies += await runParallel(active, context: context, plan: &plan, instructions: instructions)
        if replies.isEmpty { replies = [route.reply] }
        return DirectorResponse(reply: replies.joined(separator: "\n"), plan: plan.sanitized(sourceDuration: context.duration))
    }

    /// "Haz un video de un hombre saltando sobre un carro": el Director IA planea las tomas.
    func planShots(idea: String, format: String) async throws -> ShotPlan {
        let data = try await client.requestJSON(
            system: Self.shotsPrompt,
            content: [["type": "text", "text": "Idea: \(idea)\nPreferred format: \(format)\nCamera moves: \(CameraMove.allCases.map(\.rawValue).joined(separator: ", "))"]],
            schema: PlanSchema.shots, effort: "low", maxTokens: 4000)
        return try JSONDecoder().decode(ShotPlan.self, from: data)
    }

    /// Pulido de un video ya armado (color, texto, efectos, sonido en paralelo).
    func polish(plan: EditPlan, brief: String, context: MediaContext) async -> DirectorResponse {
        var p = plan
        let replies = await runParallel([.color, .text, .vfx, .sound], context: context, plan: &p,
                                        instructions: Dictionary(uniqueKeysWithValues: Department.allCases.map { ($0, brief) }))
        return DirectorResponse(reply: replies.joined(separator: "\n"), plan: p.sanitized(sourceDuration: context.duration))
    }

    // MARK: - Internos

    private func runParallel(_ depts: [Department], context: MediaContext, plan: inout EditPlan,
                             instructions: [Department: String]) async -> [String] {
        let snapshot = plan
        var replies: [String] = []
        let results = await withTaskGroup(of: (Department, Any?, String?).self) { group -> [(Department, Any?, String?)] in
            for d in depts {
                group.addTask {
                    onAgent(d.name, nil)
                    let instruction = instructions[d] ?? ""
                    do {
                        switch d {
                        case .color: let r: ColorPart = try await run(d, context: context, plan: snapshot, instruction: instruction, effort: "low"); return (d, r, nil)
                        case .text: let r: TextPart = try await run(d, context: context, plan: snapshot, instruction: instruction, effort: "low"); return (d, r, nil)
                        case .vfx: let r: VFXPart = try await run(d, context: context, plan: snapshot, instruction: instruction, effort: "low"); return (d, r, nil)
                        case .sound: let r: SoundPart = try await run(d, context: context, plan: snapshot, instruction: instruction, effort: "low"); return (d, r, nil)
                        case .story: let r: StoryPart = try await run(d, context: context, plan: snapshot, instruction: instruction, effort: "low"); return (d, r, nil)
                        }
                    } catch {
                        return (d, nil, error.localizedDescription)
                    }
                }
            }
            var all: [(Department, Any?, String?)] = []
            for await r in group { all.append(r) }
            return all
        }
        for (d, part, err) in results {
            if let err { onAgent(d.name, "⚠️ \(err)"); continue }
            guard let part else { continue }
            switch part {
            case let r as ColorPart: plan.color = r.color; replies.append(r.reply); onAgent(d.name, r.reply)
            case let r as TextPart: plan.texts = r.texts; plan.captions = r.captions; replies.append(r.reply); onAgent(d.name, r.reply)
            case let r as VFXPart: plan.effects = r.effects; replies.append(r.reply); onAgent(d.name, r.reply)
            case let r as SoundPart: plan.audio = r.audio; replies.append(r.reply); onAgent(d.name, r.reply)
            case let r as StoryPart: apply(r, to: &plan); replies.append(r.reply); onAgent(d.name, r.reply)
            default: break
            }
        }
        return replies
    }

    private func apply(_ s: StoryPart, to plan: inout EditPlan) {
        plan.title = s.title
        plan.summary = s.summary
        plan.format = s.format
        plan.segments = s.segments
    }

    private func run<T: Decodable>(_ dept: Department, context: MediaContext, plan: EditPlan?,
                                   instruction: String, effort: String) async throws -> T {
        var content: [[String: Any]] = []
        let frames = dept == .sound ? Array(context.frames.prefix(2)) : context.frames
        for frame in frames {
            content.append(["type": "text", "text": String(format: "Frame at %.1fs:", frame.time)])
            content.append(["type": "image",
                            "source": ["type": "base64", "media_type": "image/jpeg",
                                       "data": frame.jpeg.base64EncodedString()]])
        }
        content.append(["type": "text", "text": contextText(context), "cache_control": ["type": "ephemeral"]])
        var parts = [dept.role]
        if let plan {
            if dept != .story { parts.append(timelineText(plan)) }
            parts.append("CURRENT \(dept.rawValue.uppercased()) (keep anything the instruction does not ask to change):\n" + currentPart(dept, plan))
        }
        parts.append("INSTRUCTION: " + instruction)
        parts.append("In \"reply\": one short casual sentence in Spanish (or the user's language) about what you did.")
        content.append(["type": "text", "text": parts.joined(separator: "\n\n")])
        let data = try await client.requestJSON(system: Self.systemPrompt, content: content,
                                                schema: PlanSchema.department(dept), effort: effort,
                                                maxTokens: dept == .story ? 16000 : 8000)
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw ClaudeError(message: "\(dept.name): no pude leer su respuesta.")
        }
    }

    private func currentPart(_ d: Department, _ p: EditPlan) -> String {
        let e = JSONEncoder.sorted
        func str<T: Encodable>(_ v: T) -> String { (try? String(data: e.encode(v), encoding: .utf8)) ?? "{}" }
        switch d {
        case .story: return str(StoryPart(reply: "", title: p.title, summary: p.summary, format: p.format, segments: p.segments))
        case .color: return str(p.color)
        case .text: return str(TextPart(reply: "", texts: p.texts, captions: p.captions))
        case .vfx: return str(p.effects)
        case .sound: return str(p.audio)
        }
    }

    private func timelineText(_ plan: EditPlan) -> String {
        var t = 0.0
        var rows: [String] = []
        for (i, s) in plan.segments.enumerated() {
            let overlap = i > 0 && s.transitionIn.type != .none
                ? min(s.transitionIn.duration, min(s.timelineDuration, plan.segments[i - 1].timelineDuration) / 2) : 0
            t -= overlap
            let what: String
            switch s.kind {
            case .clip: what = String(format: "clip %.2f–%.2fs x%.2f", s.sourceStart, s.sourceEnd, s.speed)
            case .scene: what = "scene \"\(s.sceneTitle)\""
            case .ai: what = "ai_video \"\(s.aiPrompt.prefix(60))\""
            }
            rows.append(String(format: "#%d %@ → timeline %.2f–%.2fs", i, what, t, t + s.timelineDuration))
            t += s.timelineDuration
        }
        return String(format: "FINAL TIMELINE (%.2f s, format %@):\n", t, plan.format.rawValue) + rows.joined(separator: "\n")
    }

    static let producerPrompt = """
    You are the PRODUCER of a team of expert video editors. The user asks for a change to an existing edit. \
    Decide which departments must act and write each a precise English instruction ("" = does nothing):
    - story: cuts, order, length, speed, transitions, format, generated scenes, AI shots / new camera angles
    - color: color grade / look
    - text: titles, text overlays, captions
    - vfx: zooms, shakes, glitch, flashes, light leaks, person-aware effects (background blur, color pop…)
    - sound: noise cleanup, voice effects, EQ, music, volume
    Activate only what the request needs (often 1–2). If story changes the number or order of segments, also \
    tell text and vfx to re-check their segment indices. "reply": one short casual sentence in Spanish saying \
    who is working on it.
    """

    static let shotsPrompt = """
    You are an AI FILM DIRECTOR (like Higgsfield) planning a short video made entirely with a text-to-video \
    model. Write 1–6 shots that tell the idea visually with continuity (same character description, wardrobe, \
    setting and lighting in every shot) and cinematic camera work. Each prompt: vivid English, subject + action \
    + environment + lighting + lens/mood, ≤ 60 words. camera: one move. seconds: 5 or 10. format: 9:16 for \
    social unless asked. "reply": one short casual sentence in Spanish.
    """

    private func contextText(_ c: MediaContext) -> String {
        let orientation = c.height > c.width ? "vertical" : (c.height == c.width ? "square" : "horizontal")
        var lines = [
            "Source video duration: \(String(format: "%.2f", c.duration)) s",
            "Resolution: \(c.width)x\(c.height) (\(orientation))",
            "AI video generation (ai_video segments): " + (c.aiVideoAvailable ? "AVAILABLE" : "NOT configured — the app will substitute an animated scene; still use ai_video if the user asks, and mention they need a fal.ai key in Settings"),
            "Imported songs available for audio.music: " + (MusicLibrary.names().isEmpty ? "(none — music can't be added until the user imports a song)" : MusicLibrary.names().joined(separator: ", ")),
            "Imported LUTs available: " + (ColorLUT.importedLUTNames().isEmpty ? "(none)" : ColorLUT.importedLUTNames().joined(separator: ", ")),
            "",
            "Speech transcript (source-video seconds):",
        ]
        if !c.reference.isEmpty {
            lines.append("")
            lines.append("REFERENCE STYLE (the user wants their edit to look like this reference video):")
            lines.append(c.reference)
            lines.append("")
            lines.append("Speech transcript (source-video seconds):")
        }
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
    You are a world-class video editor, colorist and motion designer living inside an iPhone app. The user \
    uploads raw footage; you receive frames sampled from it (with timestamps), the speech transcript and \
    metadata, and you return a COMPLETE edit plan as JSON. The app renders your plan exactly, frame by frame, \
    so every number matters. Aim for the quality of a top creator's edit or a commercial, not a template app: \
    deliberate pacing, a strong color look, typography with intent, and effects that serve the story.

    TIMELINE — segments, in order. You can cut, reorder, repeat, speed up or slow down.
    - kind "clip": source video from sourceStart to sourceEnd (seconds, ≥0.5 s). speed 0.25–4. \
    speedRamp: none, slow_middle (hero slow-mo moment), fast_middle, slow_to_fast, fast_to_slow. \
    focusX/focusY (0–1, y from top): the point of interest, used to reframe when the format crops the image \
    (e.g. a horizontal video turned 9:16 — center on the face/action you see in the frames). \
    For clips: sceneDuration 0, sceneTitle "", sceneSubtitle "", sceneStyle "aurora", sceneColors [].
    - kind "scene": generated motion-graphics card (intro, outro, chapter). sceneDuration 1.5–6, short \
    sceneTitle, optional sceneSubtitle, sceneStyle aurora|sunset|neon|dark|light (animated gradients) or \
    photo_kenburns (slow zoom over a blurred frame of the video at sourceStart). sceneColors: 2–3 hex or []. \
    For scenes: sourceEnd = sourceStart, speed 1, speedRamp none, focus 0.5.
    - transitionIn (first segment must be "none"): none, crossfade, fade_black, flash_white, zoom_in, \
    zoom_out, slide_left, slide_right, slide_up, whip_pan, spin, glitch, blur, iris, wipe, light_leak. \
    0.2–1.2 s. Hard cuts on the beat of speech/action are often best; use flashy transitions sparingly and \
    consistently with the style.
    - color: null to use the global grade, or a full grade for this segment (shot matching, a flashback in \
    black_white, etc.).

    - kind "ai_video": a REAL generated video shot made by a video-generation model (Kling/Wan, like \
    Higgsfield). Use it when the user asks for a new scene, a different camera angle, a shot that doesn't exist \
    in the footage, or "make it epic". aiUseFrame true = starts from the source frame at sourceStart, so it keeps \
    the same person/place but the camera moves or the angle changes; false = generated only from aiPrompt. \
    aiPrompt: a vivid English shot description (subject, action, environment, lighting, mood). aiCamera: static, \
    dolly_in, dolly_out, orbit_left, orbit_right, crane_up, crane_down, pan_left, pan_right, tilt_up, low_angle, \
    high_angle, top_down, fpv_drone, handheld, crash_zoom, bullet_time, close_up, wide_shot, over_the_shoulder. \
    sceneDuration 5 or 10. Each generation costs the user money and takes 1–5 min: use 1–3 per edit at most, \
    only where they add real value, and never regenerate existing ones unless asked (keep their fields identical). \
    For ai_video: sourceEnd = sourceStart, speed 1, speedRamp none, focus 0.5, scene fields like a clip. \
    For clip and scene segments: aiPrompt "", aiCamera "static", aiUseFrame true.

    FORMAT: original, 9:16, 4:5, 1:1, 16:9, 21:9. Keep "original" unless the user asks or it clearly helps.

    COLOR — a real grading pipeline (neutral = all zeros, presetIntensity 1, lutIntensity 1, skinProtect 0.5):
    - preset (a complete look, mixed by presetIntensity 0–1): none, cinematic, teal_orange, warm, cool, \
    golden_hour, kodak_film, fuji_film, bleach_bypass, cross_process, matrix, cyberpunk, nordic, vintage, \
    faded_film, noir, black_white, sepia, vibrant, hdr_pop, moody, pastel, dreamy, desert, arctic, neon_night.
    - Adjustments on top: exposure −2..2 EV; contrast, highlights, shadows, whites, blacks, temperature \
    (− cool, + warm), tint (− green, + magenta), saturation, vibrance: −1..1.
    - Color wheels lift (shadows), gamma (midtones), gain (highlights): hue 0–360°, amount 0–1, luma −1..1. \
    (Hues: 0 red, 30 orange, 60 yellow, 120 green, 180 cyan, 210 teal-blue, 240 blue, 300 magenta.)
    - Split toning: splitShadows/splitHighlights hex, splitAmount 0–1, splitBalance −1..1.
    - hsl: per-band (red, orange, yellow, green, aqua, blue, purple, magenta) hue/saturation/luminance −1..1.
    - Finishing: fade (matte blacks), clarity −1..1, sharpen, grain, bloom, halation (film glow), vignette: 0–1.
    - skinProtect 0–1 keeps skin tones natural. lut: "" unless the user names an imported LUT.
    Grade with intent: analyze the frames' exposure and white balance first, correct, then build the look. \
    Strong looks are welcome when they fit ("dura en colores").

    TEXT — motion typography (texts[]):
    - segmentIndex + startOffset (seconds after that segment starts) + duration.
    - x, y: center position 0–1 (y from top; 0.5 center, 0.12 top, 0.78 lower third). Keep clear of captions.
    - font: system, rounded, serif, mono, condensed, futura, avenir, didot, bodoni, georgia, gill_sans, optima, \
    baskerville, typewriter, marker, chalk, noteworthy, handwriting, copperplate, rockwell, party. \
    weight: light..black. size: fraction of frame width (0.04 small, 0.08 big, 0.14+ huge statement).
    - color, gradientColor ("" none), strokeColor + strokeWidth 0–1, shadow 0–1, glowColor ("" none) + \
    glowAmount 0–1, background none|box|pill|bar|outline + backgroundColor (hex, may be 8-digit with alpha), \
    uppercase, letterSpacing −0.1..0.5 em, align, rotation degrees, maxWidth 0.2–1.
    - animationIn: none, fade, pop, slide_up, slide_down, slide_left, slide_right, zoom_in, blur_in, drop, \
    typewriter, word_by_word, word_pop, letter_bounce, letter_fade, glitch. animationOut: none, fade, pop_out, \
    slide_up, slide_down, zoom_out, blur_out, glitch. loop: none, pulse, float, shake, wave, glow_pulse, \
    flicker, rainbow.
    - behindSubject: true puts the text BEHIND the person (the viral depth effect) — great for big titles \
    when a person fills the frame.
    Design text like a motion designer: hierarchy, few words, strong contrast, consistent fonts (max 2 families).

    CAPTIONS (automatic from speech): enabled, template classic|karaoke (active word highlighted)|word_pop \
    (one big word at a time)|boxed|bold_stroke|neon|minimal, font, color, highlightColor, y (0.8 typical for \
    vertical), size (~0.055), uppercase, maxWords per line (3–6).

    EFFECTS (effects[]): segmentIndex (−1 = whole video; then startOffset is from the video start), \
    startOffset, duration (0 = until the end of the segment/video), intensity 0–1, focusX/focusY, color, \
    secondaryColor ("" for defaults).
    - Camera: zoom_in, zoom_out, punch_in (snap zoom on an emphasis word or beat), ken_burns, shake (impact), \
    handheld (subtle life).
    - Style: glitch, rgb_split, vhs, old_film, light_leak, flash (short white hit), strobe, zoom_blur, \
    motion_blur, blur, focus_in (blur→sharp), mirror, kaleidoscope, pixelate, comic, posterize, sketch, \
    neon_edges, duotone (color + secondaryColor), thermal, invert, hue_cycle, dreamy_glow, letterbox.
    - Person-aware (on-device segmentation): bg_blur (portrait-mode background), color_pop (person in color, \
    world in B&W), subject_glow (glowing outline around the person, use color), spotlight (darken background).
    Use effects to create moments: a punch_in + flash on a key phrase, a shake on an impact, color_pop for a \
    reveal, light_leak in a warm montage. Impressive, but never random.

    AUDIO — an on-device studio for the voice + background music:
    - originalVolume 0–2, fadeInOut, noiseReduction 0–1 (noise canceller; 0.5–0.8 for noisy street/wind/hum), \
    voicePreset: none, natural, podcast, radio_host, warm, bright, deep, chipmunk, robot, alien, telephone, \
    megaphone, walkie, cave, stadium, underwater. eqLow/eqMid/eqHigh −1..1 (±12 dB), compression 0–1, \
    deEss 0–1, reverb 0–1 + reverbSpace room|studio|hall|cathedral|plate, pitch −12..12 semitones, \
    normalize (consistent loudness, recommended when there is speech).
    - music: exact name of an imported song ("" if none or none available), musicVolume 0–1 (0.2–0.35 under \
    speech, 0.6–0.9 for pure montages), musicStart seconds into the song (start at a drop/chorus), ducking 0–1 \
    (auto-lower music while someone speaks), musicFade.
    - For talking videos: a light cleanup is usually good (noiseReduction ~0.4, podcast or natural, normalize).

    EDITING CRAFT
    - Study the frames to understand what happens and when; use the transcript to keep complete sentences and \
    remove silences, filler words, false starts. Never cut mid-sentence.
    - Pacing: open with a hook (best moment or a bold title in the first 2 s), vary shot length, end clean.
    - Match the style to the content (vlog, travel, sports, tutorial, party, product, cinematic...).
    - When revising, the user writes casually in Spanish or English ("ponle colores más fuertes", "el texto \
    detrás de mí", "más efectos", "quita el glitch"). Interpret like a senior editor and change only what is \
    implied; keep everything else identical.
    - You can only use songs the user imported (listed in the context). If they ask for music and none is \
    imported, tell them to import one in Editor pro → Audio.
    """
}

extension JSONEncoder {
    static var sorted: JSONEncoder {
        let e = JSONEncoder()
        e.outputFormatting = [.sortedKeys]
        return e
    }
}
