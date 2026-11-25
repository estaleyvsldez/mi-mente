import Foundation

// El "plan de edición" es todo lo que la IA decide sobre el video.
// La app lo convierte en un video real con AVFoundation + Core Image.

enum SegmentKind: String, Codable, CaseIterable { case clip, scene }

enum TransitionType: String, Codable, CaseIterable {
    case none, crossfade
    case fadeBlack = "fade_black"
    case flashWhite = "flash_white"
    case zoom
    case slideLeft = "slide_left"
}

enum SceneStyle: String, Codable, CaseIterable {
    case aurora, sunset, neon, dark, light
    case photoKenBurns = "photo_kenburns"
}

enum TextPosition: String, Codable, CaseIterable {
    case top, center, bottom
    case lowerThird = "lower_third"
}

enum TextStyle: String, Codable, CaseIterable { case title, bold, subtitle, neon, minimal, boxed }
enum TextSize: String, Codable, CaseIterable { case small, medium, large }

enum TextAnimation: String, Codable, CaseIterable {
    case none, fade, pop
    case slideUp = "slide_up"
    case typewriter
}

enum ColorPreset: String, Codable, CaseIterable {
    case none, cinematic, warm, cool, vintage
    case blackWhite = "black_white"
    case vibrant
    case tealOrange = "teal_orange"
    case moody, pastel
}

struct Transition: Codable, Equatable {
    var type: TransitionType
    var duration: Double
}

struct Segment: Codable, Equatable {
    var kind: SegmentKind
    /// Segundos del video original (clip). En escenas, el cuadro de fondo para photo_kenburns.
    var sourceStart: Double
    var sourceEnd: Double
    var speed: Double
    var sceneDuration: Double
    var sceneTitle: String
    var sceneSubtitle: String
    var sceneStyle: SceneStyle
    var sceneColors: [String]
    var transitionIn: Transition

    /// Duración en la línea de tiempo final.
    var timelineDuration: Double {
        switch kind {
        case .clip: return max(0, sourceEnd - sourceStart) / max(speed, 0.01)
        case .scene: return sceneDuration
        }
    }
}

struct TextOverlay: Codable, Equatable {
    var text: String
    var segmentIndex: Int
    var startOffset: Double
    var duration: Double
    var position: TextPosition
    var style: TextStyle
    var size: TextSize
    var color: String
    var animation: TextAnimation
}

struct ColorGrade: Codable, Equatable {
    var preset: ColorPreset
    var exposure: Double     // -1 ... 1  (0 neutro)
    var contrast: Double     // 0.5 ... 1.5 (1 neutro)
    var saturation: Double   // 0 ... 2 (1 neutro)
    var temperature: Double  // -1 frío ... 1 cálido
    var vignette: Double     // 0 ... 1

    static let neutral = ColorGrade(preset: .none, exposure: 0, contrast: 1, saturation: 1, temperature: 0, vignette: 0)
}

struct Captions: Codable, Equatable {
    var enabled: Bool
    var style: TextStyle
    var position: TextPosition
    var color: String
}

struct AudioSettings: Codable, Equatable {
    var originalVolume: Double
    var fadeInOut: Bool
}

struct EditPlan: Codable, Equatable {
    var title: String
    var summary: String
    var segments: [Segment]
    var texts: [TextOverlay]
    var color: ColorGrade
    var captions: Captions
    var audio: AudioSettings

    /// Plan "sin editar": el video completo tal cual.
    static func passthrough(duration: Double) -> EditPlan {
        EditPlan(
            title: "Original",
            summary: "Video sin editar",
            segments: [Segment.clip(0, duration)],
            texts: [],
            color: .neutral,
            captions: Captions(enabled: false, style: .subtitle, position: .bottom, color: "#FFFFFF"),
            audio: AudioSettings(originalVolume: 1, fadeInOut: false)
        )
    }

    /// Corrige cualquier valor fuera de rango que venga de la IA.
    func sanitized(sourceDuration d: Double) -> EditPlan {
        var p = self
        p.segments = segments.compactMap { seg -> Segment? in
            var s = seg
            s.speed = (s.speed.isFinite && s.speed > 0) ? s.speed.clamped(0.25, 4) : 1
            s.transitionIn.duration = s.transitionIn.duration.clamped(0, 1.5)
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
            t.duration = t.duration.clamped(0.3, 60)
            return t
        }
        p.color.exposure = p.color.exposure.clamped(-1, 1)
        p.color.contrast = p.color.contrast.clamped(0.5, 1.5)
        p.color.saturation = p.color.saturation.clamped(0, 2)
        p.color.temperature = p.color.temperature.clamped(-1, 1)
        p.color.vignette = p.color.vignette.clamped(0, 1)
        p.audio.originalVolume = p.audio.originalVolume.clamped(0, 2)
        return p
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
}

extension Segment {
    static func clip(_ start: Double, _ end: Double) -> Segment {
        Segment(kind: .clip, sourceStart: start, sourceEnd: end, speed: 1, sceneDuration: 0,
                sceneTitle: "", sceneSubtitle: "", sceneStyle: .aurora, sceneColors: [],
                transitionIn: Transition(type: .none, duration: 0))
    }
}

extension Double {
    func clamped(_ lo: Double, _ hi: Double) -> Double {
        guard isFinite else { return lo }
        return Swift.min(Swift.max(self, lo), hi)
    }
}

/// Una línea de subtítulo con tiempos del video original.
struct CaptionLine: Codable, Equatable {
    var start: Double
    var end: Double
    var text: String
}
