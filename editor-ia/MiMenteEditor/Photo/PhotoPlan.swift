import Foundation

enum PhotoBackground: String, Codable, CaseIterable {
    case keep
    case remove      // fondo transparente (PNG)
    case blur        // modo retrato
    case color       // color sólido
    case darken      // foco de luz
    case blackWhite = "black_white"   // color pop
}

/// Todo lo que se le hace a una foto (lo decide la IA o tú a mano).
struct PhotoPlan: Codable, Equatable {
    var title: String
    var crop: VideoFormat
    var focusX: Double
    var focusY: Double
    var straighten: Double       // grados -45...45
    var flipHorizontal: Bool
    var color: ColorGrade
    var retouch: Double          // 0...1 suavizado de piel
    var background: PhotoBackground
    var backgroundColor: String
    var backgroundBlur: Double   // 0...1
    var effects: [Effect]
    var texts: [TextOverlay]

    static let original = PhotoPlan(
        title: "Foto", crop: .original, focusX: 0.5, focusY: 0.5, straighten: 0, flipHorizontal: false,
        color: .neutral, retouch: 0, background: .keep, backgroundColor: "#FFFFFF", backgroundBlur: 0.6,
        effects: [], texts: [])

    var sanitized: PhotoPlan {
        var p = self
        p.focusX = p.focusX.clamped(0, 1); p.focusY = p.focusY.clamped(0, 1)
        p.straighten = p.straighten.clamped(-45, 45)
        p.color = p.color.sanitized
        p.retouch = p.retouch.clamped(0, 1)
        p.backgroundBlur = p.backgroundBlur.clamped(0, 1)
        p.effects = p.effects.map { e in
            var e = e
            e.segmentIndex = -1; e.startOffset = 0; e.duration = 0
            e.intensity = e.intensity.clamped(0, 1)
            return e
        }
        p.texts = p.texts.compactMap { t in
            guard !t.text.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }
            var t = t
            t.segmentIndex = 0; t.startOffset = 0; t.duration = 10
            t.x = t.x.clamped(0, 1); t.y = t.y.clamped(0, 1)
            t.size = t.size.clamped(0.02, 0.3)
            return t
        }
        return p
    }
}
