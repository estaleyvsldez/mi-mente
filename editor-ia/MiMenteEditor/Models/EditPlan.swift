import Foundation

// El "plan de edición" es todo lo que la IA (o tú, a mano) decide sobre el video.
// La app lo convierte en un video real con AVFoundation + Core Image.

// MARK: - Enumeraciones

enum VideoFormat: String, Codable, CaseIterable {
    case original
    case vertical = "9:16"
    case portrait = "4:5"
    case square = "1:1"
    case horizontal = "16:9"
    case cinema = "21:9"
}

enum SegmentKind: String, Codable, CaseIterable { case clip, scene }

enum SpeedRamp: String, Codable, CaseIterable {
    case none
    case slowMiddle = "slow_middle"
    case fastMiddle = "fast_middle"
    case slowToFast = "slow_to_fast"
    case fastToSlow = "fast_to_slow"
}

enum TransitionType: String, Codable, CaseIterable {
    case none, crossfade
    case fadeBlack = "fade_black"
    case flashWhite = "flash_white"
    case zoomIn = "zoom_in"
    case zoomOut = "zoom_out"
    case slideLeft = "slide_left"
    case slideRight = "slide_right"
    case slideUp = "slide_up"
    case whipPan = "whip_pan"
    case spin, glitch, blur, iris, wipe
    case lightLeak = "light_leak"
}

enum SceneStyle: String, Codable, CaseIterable {
    case aurora, sunset, neon, dark, light
    case photoKenBurns = "photo_kenburns"
}

enum ColorPreset: String, Codable, CaseIterable {
    case none, cinematic
    case tealOrange = "teal_orange"
    case warm, cool
    case goldenHour = "golden_hour"
    case kodakFilm = "kodak_film"
    case fujiFilm = "fuji_film"
    case bleachBypass = "bleach_bypass"
    case crossProcess = "cross_process"
    case matrix, cyberpunk, nordic, vintage
    case fadedFilm = "faded_film"
    case noir
    case blackWhite = "black_white"
    case sepia, vibrant
    case hdrPop = "hdr_pop"
    case moody, pastel, dreamy, desert, arctic
    case neonNight = "neon_night"
}

enum HSLBand: String, Codable, CaseIterable { case red, orange, yellow, green, aqua, blue, purple, magenta }

enum EffectType: String, Codable, CaseIterable {
    // Cámara
    case zoomIn = "zoom_in"
    case zoomOut = "zoom_out"
    case punchIn = "punch_in"
    case kenBurns = "ken_burns"
    case shake, handheld
    // Estilo
    case glitch
    case rgbSplit = "rgb_split"
    case vhs
    case oldFilm = "old_film"
    case lightLeak = "light_leak"
    case flash, strobe
    case zoomBlur = "zoom_blur"
    case motionBlur = "motion_blur"
    case blur
    case focusIn = "focus_in"
    case mirror, kaleidoscope, pixelate, comic, posterize, sketch
    case neonEdges = "neon_edges"
    case duotone, thermal, invert
    case hueCycle = "hue_cycle"
    case dreamyGlow = "dreamy_glow"
    case letterbox
    // Con detección de persona (IA en el iPhone)
    case bgBlur = "bg_blur"
    case colorPop = "color_pop"
    case subjectGlow = "subject_glow"
    case spotlight

    var needsSubjectMask: Bool { [.bgBlur, .colorPop, .subjectGlow, .spotlight].contains(self) }
}

enum TextFont: String, Codable, CaseIterable {
    case system, rounded, serif, mono, condensed, futura, avenir, didot, bodoni, georgia
    case gillSans = "gill_sans"
    case optima, baskerville, typewriter, marker, chalk, noteworthy, handwriting, copperplate, rockwell, party
}

enum TextWeight: String, Codable, CaseIterable { case light, regular, medium, bold, heavy, black }
enum TextAlign: String, Codable, CaseIterable { case left, center, right }
enum TextBackground: String, Codable, CaseIterable {
    case none, box, pill, bar, outline
}

enum TextAnimIn: String, Codable, CaseIterable {
    case none, fade, pop
    case slideUp = "slide_up"
    case slideDown = "slide_down"
    case slideLeft = "slide_left"
    case slideRight = "slide_right"
    case zoomIn = "zoom_in"
    case blurIn = "blur_in"
    case drop
    case typewriter
    case wordByWord = "word_by_word"
    case wordPop = "word_pop"
    case letterBounce = "letter_bounce"
    case letterFade = "letter_fade"
    case glitch

    var perUnit: Bool { [.typewriter, .wordByWord, .wordPop, .letterBounce, .letterFade].contains(self) }
    var usesLetters: Bool { [.typewriter, .letterBounce, .letterFade].contains(self) }
}

enum TextAnimOut: String, Codable, CaseIterable {
    case none, fade
    case popOut = "pop_out"
    case slideUp = "slide_up"
    case slideDown = "slide_down"
    case zoomOut = "zoom_out"
    case blurOut = "blur_out"
    case glitch
}

enum TextLoop: String, Codable, CaseIterable {
    case none, pulse, float, shake, wave
    case glowPulse = "glow_pulse"
    case flicker
    case rainbow
}

enum CaptionTemplate: String, Codable, CaseIterable {
    case classic, karaoke
    case wordPop = "word_pop"
    case boxed
    case boldStroke = "bold_stroke"
    case neon, minimal
}

// MARK: - Piezas del plan

struct Transition: Codable, Equatable {
    var type: TransitionType
    var duration: Double
}

/// Rueda de color (lift / gamma / gain): hacia qué tono empujar y cuánto.
struct ColorWheel: Codable, Equatable {
    var hue: Double      // 0...360 grados
    var amount: Double   // 0...1
    var luma: Double     // -1...1

    static let zero = ColorWheel(hue: 0, amount: 0, luma: 0)
}

struct HSLAdjust: Codable, Equatable {
    var band: HSLBand
    var hue: Double         // -1...1
    var saturation: Double  // -1...1
    var luminance: Double   // -1...1
}

struct ColorGrade: Codable, Equatable {
    var preset: ColorPreset
    var presetIntensity: Double // 0...1
    var exposure: Double        // -2...2 (EV)
    var contrast: Double        // -1...1
    var highlights: Double      // -1...1
    var shadows: Double         // -1...1
    var whites: Double          // -1...1
    var blacks: Double          // -1...1
    var temperature: Double     // -1 frío ... 1 cálido
    var tint: Double            // -1 verde ... 1 magenta
    var saturation: Double      // -1...1
    var vibrance: Double        // -1...1
    var lift: ColorWheel
    var gamma: ColorWheel
    var gain: ColorWheel
    var splitShadows: String     // hex
    var splitHighlights: String  // hex
    var splitAmount: Double      // 0...1
    var splitBalance: Double     // -1...1
    var hsl: [HSLAdjust]
    var fade: Double             // 0...1
    var clarity: Double          // -1...1
    var sharpen: Double          // 0...1
    var grain: Double            // 0...1
    var bloom: Double            // 0...1
    var halation: Double         // 0...1
    var vignette: Double         // 0...1
    var skinProtect: Double      // 0...1
    var lut: String              // nombre de un LUT .cube importado, "" = ninguno
    var lutIntensity: Double     // 0...1

    static let neutral = ColorGrade(
        preset: .none, presetIntensity: 1, exposure: 0, contrast: 0, highlights: 0, shadows: 0,
        whites: 0, blacks: 0, temperature: 0, tint: 0, saturation: 0, vibrance: 0,
        lift: .zero, gamma: .zero, gain: .zero, splitShadows: "#000000", splitHighlights: "#FFFFFF",
        splitAmount: 0, splitBalance: 0, hsl: [], fade: 0, clarity: 0, sharpen: 0, grain: 0,
        bloom: 0, halation: 0, vignette: 0, skinProtect: 0.5, lut: "", lutIntensity: 1)
}

struct Segment: Codable, Equatable {
    var kind: SegmentKind
    /// Segundos del video original (clip). En escenas, el cuadro de fondo para photo_kenburns.
    var sourceStart: Double
    var sourceEnd: Double
    var speed: Double
    var speedRamp: SpeedRamp
    /// Punto de interés (0...1) para reencuadrar cuando el formato corta la imagen.
    var focusX: Double
    var focusY: Double
    var sceneDuration: Double
    var sceneTitle: String
    var sceneSubtitle: String
    var sceneStyle: SceneStyle
    var sceneColors: [String]
    var transitionIn: Transition
    /// Color propio de este segmento (si es nil usa el color general).
    var color: ColorGrade?

    var ramp: RampMap { RampMap(segment: self) }
    /// Duración en la línea de tiempo final.
    var timelineDuration: Double {
        kind == .scene ? sceneDuration : ramp.timelineDuration
    }
}

struct TextOverlay: Codable, Equatable {
    var text: String
    var segmentIndex: Int
    var startOffset: Double
    var duration: Double
    var x: Double              // 0...1 centro horizontal
    var y: Double              // 0...1 centro vertical (0 = arriba)
    var font: TextFont
    var weight: TextWeight
    var size: Double           // fracción del ancho (0.02...0.25)
    var color: String
    var gradientColor: String  // "" = sin degradado
    var strokeColor: String
    var strokeWidth: Double    // 0...1
    var shadow: Double         // 0...1
    var glowColor: String      // "" = sin brillo
    var glowAmount: Double     // 0...1
    var background: TextBackground
    var backgroundColor: String
    var uppercase: Bool
    var letterSpacing: Double  // -0.1...0.5 (em)
    var align: TextAlign
    var rotation: Double       // grados
    var maxWidth: Double       // 0.2...1 fracción del ancho
    var animationIn: TextAnimIn
    var animationOut: TextAnimOut
    var loop: TextLoop
    var behindSubject: Bool

    static func basic(_ text: String, segment: Int = 0) -> TextOverlay {
        TextOverlay(text: text, segmentIndex: segment, startOffset: 0.3, duration: 2.5, x: 0.5, y: 0.5,
                    font: .rounded, weight: .black, size: 0.09, color: "#FFFFFF", gradientColor: "",
                    strokeColor: "#000000", strokeWidth: 0, shadow: 0.5, glowColor: "", glowAmount: 0,
                    background: .none, backgroundColor: "#000000", uppercase: false, letterSpacing: 0,
                    align: .center, rotation: 0, maxWidth: 0.86, animationIn: .pop, animationOut: .fade,
                    loop: .none, behindSubject: false)
    }
}

struct Effect: Codable, Equatable {
    var type: EffectType
    var segmentIndex: Int   // -1 = todo el video
    var startOffset: Double
    var duration: Double    // 0 = hasta el final del segmento (o del video)
    var intensity: Double   // 0...1
    var focusX: Double
    var focusY: Double
    var color: String
    var secondaryColor: String
}

struct Captions: Codable, Equatable {
    var enabled: Bool
    var template: CaptionTemplate
    var font: TextFont
    var color: String
    var highlightColor: String
    var y: Double
    var size: Double
    var uppercase: Bool
    var maxWords: Int
}

enum VoicePreset: String, Codable, CaseIterable {
    case none, natural, podcast
    case radioHost = "radio_host"
    case warm, bright, deep, chipmunk, robot, alien, telephone, megaphone, walkie, cave, stadium, underwater
}

enum ReverbSpace: String, Codable, CaseIterable {
    case room, studio, hall, cathedral, plate
}

struct AudioSettings: Codable, Equatable {
    var originalVolume: Double   // 0...2
    var fadeInOut: Bool
    // Estudio de voz (se procesa en el iPhone)
    var noiseReduction: Double   // 0...1 (cancelador de ruido)
    var voicePreset: VoicePreset
    var eqLow: Double            // -1...1 (±12 dB)
    var eqMid: Double
    var eqHigh: Double
    var compression: Double      // 0...1
    var deEss: Double            // 0...1
    var reverb: Double           // 0...1
    var reverbSpace: ReverbSpace
    var pitch: Double            // semitonos -12...12
    var normalize: Bool          // volumen parejo tipo plataforma
    // Música
    var music: String            // nombre de una canción importada, "" = sin música
    var musicVolume: Double      // 0...1
    var musicStart: Double       // segundos dentro de la canción
    var ducking: Double          // 0...1 cuánto baja la música cuando alguien habla
    var musicFade: Bool

    static let standard = AudioSettings(
        originalVolume: 1, fadeInOut: false, noiseReduction: 0, voicePreset: .none, eqLow: 0, eqMid: 0,
        eqHigh: 0, compression: 0, deEss: 0, reverb: 0, reverbSpace: .room, pitch: 0, normalize: false,
        music: "", musicVolume: 0.5, musicStart: 0, ducking: 0.6, musicFade: true)

    /// ¿Hay que procesar la voz? (si no, se usa el audio original tal cual)
    var needsProcessing: Bool {
        noiseReduction > 0.01 || voicePreset != .none || abs(eqLow) > 0.01 || abs(eqMid) > 0.01 ||
            abs(eqHigh) > 0.01 || compression > 0.01 || deEss > 0.01 || reverb > 0.01 || abs(pitch) > 0.01 || normalize
    }

    /// Clave para reutilizar el audio ya procesado.
    var processingKey: String {
        [noiseReduction, eqLow, eqMid, eqHigh, compression, deEss, reverb, pitch]
            .map { String(format: "%.3f", $0) }.joined(separator: "_")
            + "_\(voicePreset.rawValue)_\(reverbSpace.rawValue)_\(normalize)"
    }
}

struct EditPlan: Codable, Equatable {
    var title: String
    var summary: String
    var format: VideoFormat
    var segments: [Segment]
    var texts: [TextOverlay]
    var effects: [Effect]
    var color: ColorGrade
    var captions: Captions
    var audio: AudioSettings

    /// Plan "sin editar": el video completo tal cual.
    static func passthrough(duration: Double) -> EditPlan {
        EditPlan(
            title: "Original", summary: "Video sin editar", format: .original,
            segments: [Segment.clip(0, duration)], texts: [], effects: [], color: .neutral,
            captions: Captions(enabled: false, template: .classic, font: .rounded, color: "#FFFFFF",
                               highlightColor: "#FFE600", y: 0.82, size: 0.055, uppercase: false, maxWords: 5),
            audio: .standard)
    }

    var totalDuration: Double {
        var total = 0.0
        for (i, s) in segments.enumerated() {
            total += s.timelineDuration
            if i > 0 && s.transitionIn.type != .none {
                total -= min(s.transitionIn.duration, min(s.timelineDuration, segments[i - 1].timelineDuration) / 2)
            }
        }
        return total
    }

    /// Corrige cualquier valor fuera de rango que venga de la IA o de los controles.
    func sanitized(sourceDuration d: Double) -> EditPlan {
        var p = self
        p.segments = segments.compactMap { seg -> Segment? in
            var s = seg
            s.speed = (s.speed.isFinite && s.speed > 0) ? s.speed.clamped(0.25, 4) : 1
            s.transitionIn.duration = s.transitionIn.duration.clamped(0, 1.5)
            s.focusX = s.focusX.clamped(0, 1)
            s.focusY = s.focusY.clamped(0, 1)
            s.color = s.color?.sanitized
            switch s.kind {
            case .clip:
                s.sourceStart = s.sourceStart.clamped(0, d)
                s.sourceEnd = s.sourceEnd.clamped(0, d)
                if s.sourceEnd - s.sourceStart < 0.2 { return nil }
            case .scene:
                s.sceneDuration = s.sceneDuration.clamped(1, 8)
                s.sourceStart = s.sourceStart.clamped(0, max(0, d - 0.1))
                s.sourceEnd = s.sourceStart
                s.speed = 1
                s.speedRamp = .none
            }
            return s
        }
        if p.segments.isEmpty { p.segments = [Segment.clip(0, d)] }
        p.segments[0].transitionIn = Transition(type: .none, duration: 0)

        p.texts = texts.compactMap { t -> TextOverlay? in
            guard p.segments.indices.contains(t.segmentIndex),
                  !t.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
            var t = t
            t.startOffset = max(0, t.startOffset)
            t.duration = t.duration.clamped(0.3, 120)
            t.x = t.x.clamped(0, 1); t.y = t.y.clamped(0, 1)
            t.size = t.size.clamped(0.02, 0.3)
            t.strokeWidth = t.strokeWidth.clamped(0, 1)
            t.shadow = t.shadow.clamped(0, 1)
            t.glowAmount = t.glowAmount.clamped(0, 1)
            t.letterSpacing = t.letterSpacing.clamped(-0.1, 0.6)
            t.rotation = t.rotation.clamped(-180, 180)
            t.maxWidth = t.maxWidth.clamped(0.2, 1)
            return t
        }
        p.effects = effects.compactMap { e -> Effect? in
            guard e.segmentIndex == -1 || p.segments.indices.contains(e.segmentIndex) else { return nil }
            var e = e
            e.startOffset = max(0, e.startOffset)
            e.duration = max(0, e.duration)
            e.intensity = e.intensity.clamped(0, 1)
            e.focusX = e.focusX.clamped(0, 1); e.focusY = e.focusY.clamped(0, 1)
            return e
        }
        p.color = p.color.sanitized
        p.captions.y = p.captions.y.clamped(0.05, 0.95)
        p.captions.size = p.captions.size.clamped(0.03, 0.15)
        p.captions.maxWords = min(max(p.captions.maxWords, 1), 10)
        p.audio.originalVolume = p.audio.originalVolume.clamped(0, 2)
        for kp in [\AudioSettings.noiseReduction, \.compression, \.deEss, \.reverb, \.musicVolume, \.ducking] {
            p.audio[keyPath: kp] = p.audio[keyPath: kp].clamped(0, 1)
        }
        for kp in [\AudioSettings.eqLow, \.eqMid, \.eqHigh] {
            p.audio[keyPath: kp] = p.audio[keyPath: kp].clamped(-1, 1)
        }
        p.audio.pitch = p.audio.pitch.clamped(-12, 12)
        p.audio.musicStart = max(0, p.audio.musicStart)
        return p
    }
}

extension ColorGrade {
    var sanitized: ColorGrade {
        var g = self
        g.presetIntensity = g.presetIntensity.clamped(0, 1)
        g.exposure = g.exposure.clamped(-2, 2)
        for kp in [\ColorGrade.contrast, \.highlights, \.shadows, \.whites, \.blacks, \.temperature, \.tint,
                   \.saturation, \.vibrance, \.splitBalance, \.clarity] {
            g[keyPath: kp] = g[keyPath: kp].clamped(-1, 1)
        }
        for kp in [\ColorGrade.splitAmount, \.fade, \.sharpen, \.grain, \.bloom, \.halation, \.vignette,
                   \.skinProtect, \.lutIntensity] {
            g[keyPath: kp] = g[keyPath: kp].clamped(0, 1)
        }
        for kp in [\ColorGrade.lift, \.gamma, \.gain] {
            var w = g[keyPath: kp]
            w.hue = w.hue.truncatingRemainder(dividingBy: 360)
            if w.hue < 0 { w.hue += 360 }
            w.amount = w.amount.clamped(0, 1)
            w.luma = w.luma.clamped(-1, 1)
            g[keyPath: kp] = w
        }
        g.hsl = g.hsl.map { h in
            HSLAdjust(band: h.band, hue: h.hue.clamped(-1, 1), saturation: h.saturation.clamped(-1, 1),
                      luminance: h.luminance.clamped(-1, 1))
        }
        return g
    }
}

extension Segment {
    static func clip(_ start: Double, _ end: Double) -> Segment {
        Segment(kind: .clip, sourceStart: start, sourceEnd: end, speed: 1, speedRamp: .none,
                focusX: 0.5, focusY: 0.5, sceneDuration: 0, sceneTitle: "", sceneSubtitle: "",
                sceneStyle: .aurora, sceneColors: [], transitionIn: Transition(type: .none, duration: 0),
                color: nil)
    }
}

/// Mapa de velocidad de un clip: lo divide en tramos con velocidades distintas (rampas).
struct RampMap {
    struct Piece { let sourceStart: Double; let sourceDuration: Double; let speed: Double }
    let pieces: [Piece]

    init(segment s: Segment) {
        let total = max(0, s.sourceEnd - s.sourceStart)
        guard s.speedRamp != .none, total > 0.4 else {
            pieces = [Piece(sourceStart: s.sourceStart, sourceDuration: total, speed: s.speed)]
            return
        }
        let n = 10
        pieces = (0..<n).map { i in
            let u = (Double(i) + 0.5) / Double(n)
            let bump = pow(sin(Double.pi * u), 2)
            let factor: Double
            switch s.speedRamp {
            case .none: factor = 1
            case .slowMiddle: factor = 1 - 0.75 * bump
            case .fastMiddle: factor = 1 + 2.5 * bump
            case .slowToFast: factor = 0.3 + 2.2 * u
            case .fastToSlow: factor = 2.5 - 2.2 * u
            }
            return Piece(sourceStart: s.sourceStart + total * Double(i) / Double(n),
                         sourceDuration: total / Double(n),
                         speed: (s.speed * factor).clamped(0.1, 8))
        }
    }

    var timelineDuration: Double { pieces.reduce(0) { $0 + $1.sourceDuration / $1.speed } }

    /// Segundos dentro del segmento (línea de tiempo) para un segundo del video original.
    func timelineOffset(forSource t: Double) -> Double {
        var acc = 0.0
        for p in pieces {
            if t <= p.sourceStart + p.sourceDuration {
                return acc + max(0, t - p.sourceStart) / p.speed
            }
            acc += p.sourceDuration / p.speed
        }
        return acc
    }
}

extension Double {
    func clamped(_ lo: Double, _ hi: Double) -> Double {
        guard isFinite else { return lo }
        return Swift.min(Swift.max(self, lo), hi)
    }
}

/// Una palabra con su tiempo en el video original.
struct CaptionWord: Codable, Equatable {
    var text: String
    var start: Double
    var end: Double
}

/// Una línea de subtítulo con tiempos del video original.
struct CaptionLine: Codable, Equatable {
    var start: Double
    var end: Double
    var text: String
    var words: [CaptionWord]
}
