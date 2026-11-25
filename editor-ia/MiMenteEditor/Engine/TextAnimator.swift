import CoreImage
import CoreImage.CIFilterBuiltins
import UIKit

/// Un texto listo para el compositor: el bloque horneado + cuándo y cómo aparece.
struct TextItem {
    let block: TextBlock
    let spec: TextOverlay
    let start: Double
    let end: Double
    /// Tiempos absolutos de cada palabra (karaoke). nil = no es karaoke.
    let wordTimes: [ClosedRange<Double>]?
}

/// Anima textos cuadro a cuadro: entradas, salidas, bucles y animación por palabra / letra.
enum TextAnimator {
    static func draw(_ item: TextItem, at t: Double, onto base: CIImage, canvas: CGSize) -> CIImage {
        let spec = item.spec
        let b = item.block
        let local = t - item.start
        let remain = item.end - t
        let fs = Double(b.fontSize)
        let frame = Int(t * 30)

        let unitsAreLetters = spec.animationIn.usesLetters
        let units = unitsAreLetters ? b.letters : b.words
        let stagger = unitsAreLetters ? 0.035 : 0.12
        let unitDur = spec.animationIn == .typewriter ? 0.001 : (unitsAreLetters ? 0.35 : 0.28)
        let inDur = spec.animationIn.perUnit
            ? min(2.5, Double(max(units.count - 1, 0)) * stagger + unitDur + 0.05)
            : (spec.animationIn == .none ? 0 : 0.45)
        let outDur = spec.animationOut == .none ? 0 : 0.35
        let pIn = inDur > 0 ? (local / inDur).clamped(0, 1) : 1
        let q = outDur > 0 ? (1 - remain / outDur).clamped(0, 1) : 0

        // Parámetros del bloque completo.
        var alpha = 1.0, scale = 1.0, dx = 0.0, dy = 0.0, rot = spec.rotation * .pi / 180, blur = 0.0
        var glitch = false
        var hue = 0.0

        if !spec.animationIn.perUnit {
            let e = easeOut(pIn)
            switch spec.animationIn {
            case .none: break
            case .fade: alpha *= e
            case .pop: scale *= 0.4 + 0.6 * backOut(pIn); alpha *= min(1, pIn * 3)
            case .slideUp: dy -= (1 - e) * Double(canvas.height) * 0.06; alpha *= e
            case .slideDown: dy += (1 - e) * Double(canvas.height) * 0.06; alpha *= e
            case .slideLeft: dx += (1 - e) * Double(canvas.width) * 0.2; alpha *= e
            case .slideRight: dx -= (1 - e) * Double(canvas.width) * 0.2; alpha *= e
            case .zoomIn: scale *= 1.8 - 0.8 * e; alpha *= e
            case .blurIn: blur += (1 - e) * fs * 0.45; alpha *= min(1, pIn * 2)
            case .drop: dy += (1 - bounceOut(pIn)) * Double(canvas.height) * 0.25; alpha *= min(1, pIn * 4)
            case .glitch:
                if pIn < 1 { glitch = true; alpha *= hashNoise(frame, 9) < 0.25 ? 0.2 : 1 }
            default: break
            }
        }
        if q > 0 {
            let e = easeInOut(q)
            switch spec.animationOut {
            case .none: break
            case .fade: alpha *= 1 - e
            case .popOut: scale *= 1 + 0.25 * e; alpha *= 1 - e
            case .slideUp: dy += e * Double(canvas.height) * 0.06; alpha *= 1 - e
            case .slideDown: dy -= e * Double(canvas.height) * 0.06; alpha *= 1 - e
            case .zoomOut: scale *= 1 - 0.6 * e; alpha *= 1 - e
            case .blurOut: blur += e * fs * 0.45; alpha *= 1 - e
            case .glitch: glitch = true; alpha *= hashNoise(frame, 11) < 0.4 ? 0 : 1 - e * 0.5
            }
        }
        switch spec.loop {
        case .none, .wave: break
        case .pulse: scale *= 1 + 0.045 * sin(local * 2 * .pi * 1.1)
        case .float: dy += sin(local * 2 * .pi * 0.45) * Double(canvas.height) * 0.008
        case .shake:
            dx += (hashNoise(frame, 21) - 0.5) * fs * 0.08
            dy += (hashNoise(frame, 22) - 0.5) * fs * 0.08
        case .glowPulse: alpha *= 0.78 + 0.22 * (0.5 + 0.5 * sin(local * 5))
        case .flicker: if hashNoise(frame / 2, 23) < 0.08 { alpha *= 0.25 }
        case .rainbow: hue = local * 2.2
        }
        guard alpha > 0.005, scale > 0.01 else { return base }

        // ¿Hay que dibujar palabra por palabra / letra por letra?
        let karaoke = item.wordTimes != nil
        let perUnitNow = (spec.animationIn.perUnit && pIn < 1) || spec.loop == .wave || karaoke

        var group: CIImage
        if perUnitNow {
            group = CIImage.empty()
            let unitList = karaoke ? b.words : units
            for (i, r) in unitList.enumerated() {
                var source = b.text
                var uScale = 1.0, uAlpha = 1.0, uDy = 0.0
                if karaoke, let times = item.wordTimes, i < times.count {
                    if times[i].contains(t) {
                        source = b.highlight ?? b.text
                        let k = ((t - times[i].lowerBound) / 0.12).clamped(0, 1)
                        uScale = 1 + 0.12 * backOut(k)
                    } else if t < times[i].lowerBound, spec.animationIn == .wordByWord {
                        uAlpha = 0
                    }
                } else if spec.animationIn.perUnit {
                    let u = ((local - Double(i) * stagger) / unitDur).clamped(0, 1)
                    switch spec.animationIn {
                    case .typewriter: uAlpha = u > 0 ? 1 : 0
                    case .wordByWord: uAlpha = easeOut(u); uDy = -(1 - easeOut(u)) * fs * 0.35
                    case .wordPop: uScale = 0.2 + 0.8 * backOut(u); uAlpha = min(1, u * 3)
                    case .letterBounce: uDy = (1 - bounceOut(u)) * fs * 0.7; uAlpha = min(1, u * 3)
                    case .letterFade: uAlpha = easeInOut(u)
                    default: break
                    }
                }
                if spec.loop == .wave {
                    uDy += sin(local * 5 + Double(i) * 0.55) * fs * 0.12
                }
                guard uAlpha > 0.005 else { continue }
                var piece = source.cropped(to: r)
                if uScale != 1 || uDy != 0 {
                    piece = piece.transformed(by: CGAffineTransform(translationX: -r.midX, y: -r.midY)
                        .concatenating(CGAffineTransform(scaleX: CGFloat(uScale), y: CGFloat(uScale)))
                        .concatenating(CGAffineTransform(translationX: r.midX, y: r.midY + CGFloat(uDy))))
                }
                piece = TextEngine.alpha(piece, uAlpha)
                group = piece.composited(over: group)
            }
        } else {
            group = b.text
        }
        if let bg = b.background {
            let bgAlpha = spec.animationIn.perUnit ? min(1, local / 0.25) : 1
            group = group.composited(over: TextEngine.alpha(bg, bgAlpha))
        }

        if hue != 0 {
            let f = CIFilter.hueAdjust(); f.inputImage = group; f.angle = Float(hue)
            group = f.outputImage ?? group
        }
        if blur > 0.3 { group = group.applyingGaussianBlur(sigma: blur) }
        if glitch {
            let ext = group.extent
            group = EffectsKit.rgbSplit(group, dx: CGFloat(fs * 0.08 * (hashNoise(frame, 12) + 0.3)), rect: ext.insetBy(dx: -40, dy: -10))
            dx += (hashNoise(frame, 13) - 0.5) * fs * 0.3
        }
        group = TextEngine.alpha(group, alpha)

        // Posición final (x, y del plan; y medido desde arriba).
        let size = b.size
        var cx = Double(canvas.width) * spec.x
        var cy = Double(canvas.height) * (1 - spec.y)
        let halfW = Double(size.width) / 2, halfH = Double(size.height) / 2
        if Double(canvas.width) > size.width { cx = cx.clamped(halfW, Double(canvas.width) - halfW) }
        if Double(canvas.height) > size.height { cy = cy.clamped(halfH, Double(canvas.height) - halfH) }

        let transform = CGAffineTransform(translationX: -size.width / 2, y: -size.height / 2)
            .concatenating(CGAffineTransform(scaleX: CGFloat(scale), y: CGFloat(scale)))
            .concatenating(CGAffineTransform(rotationAngle: CGFloat(rot)))
            .concatenating(CGAffineTransform(translationX: CGFloat(cx + dx), y: CGFloat(cy + dy)))
        return group.transformed(by: transform).composited(over: base)
    }
}
