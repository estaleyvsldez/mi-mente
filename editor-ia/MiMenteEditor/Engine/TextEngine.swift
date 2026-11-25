import CoreImage
import CoreImage.CIFilterBuiltins
import UIKit

/// Un texto ya "horneado": la imagen final + dónde está cada palabra y cada letra (para animarlas).
struct TextBlock {
    let text: CIImage            // brillo + sombra + contorno + relleno
    let highlight: CIImage?      // mismo texto con el color de resaltado (karaoke)
    let background: CIImage?     // caja / píldora / barra
    let size: CGSize
    let words: [CGRect]          // en coordenadas del bloque (origen abajo-izquierda)
    let letters: [CGRect]
    let fontSize: CGFloat
}

/// Motor tipográfico: diseña el texto como en un programa de motion graphics.
enum TextEngine {
    private static let context = CIContext(options: [.cacheIntermediates: false])

    static func font(_ f: TextFont, _ w: TextWeight, size: CGFloat) -> UIFont {
        let weight: UIFont.Weight
        switch w {
        case .light: weight = .light
        case .regular: weight = .regular
        case .medium: weight = .medium
        case .bold: weight = .bold
        case .heavy: weight = .heavy
        case .black: weight = .black
        }
        let heavy = [.bold, .heavy, .black].contains(w)
        func named(_ names: [String]) -> UIFont {
            for n in names { if let f = UIFont(name: n, size: size) { return f } }
            return .systemFont(ofSize: size, weight: weight)
        }
        func designed(_ d: UIFontDescriptor.SystemDesign) -> UIFont {
            let base = UIFont.systemFont(ofSize: size, weight: weight)
            guard let desc = base.fontDescriptor.withDesign(d) else { return base }
            return UIFont(descriptor: desc, size: size)
        }
        switch f {
        case .system: return .systemFont(ofSize: size, weight: weight)
        case .rounded: return designed(.rounded)
        case .serif: return designed(.serif)
        case .mono: return .monospacedSystemFont(ofSize: size, weight: weight)
        case .condensed: return .systemFont(ofSize: size, weight: weight, width: .compressed)
        case .futura: return named(w == .black ? ["Futura-CondensedExtraBold"] : heavy ? ["Futura-Bold"] : ["Futura-Medium"])
        case .avenir:
            switch w {
            case .light: return named(["AvenirNext-UltraLight"])
            case .regular: return named(["AvenirNext-Regular"])
            case .medium: return named(["AvenirNext-Medium"])
            case .bold: return named(["AvenirNext-Bold"])
            case .heavy, .black: return named(["AvenirNext-Heavy"])
            }
        case .didot: return named(heavy ? ["Didot-Bold"] : ["Didot"])
        case .bodoni: return named(heavy ? ["BodoniSvtyTwoITCTT-Bold"] : ["BodoniSvtyTwoITCTT-Book"])
        case .georgia: return named(heavy ? ["Georgia-Bold"] : ["Georgia"])
        case .gillSans: return named(w == .black ? ["GillSans-UltraBold"] : heavy ? ["GillSans-Bold"] : w == .light ? ["GillSans-Light"] : ["GillSans"])
        case .optima: return named(w == .black ? ["Optima-ExtraBlack"] : heavy ? ["Optima-Bold"] : ["Optima-Regular"])
        case .baskerville: return named(heavy ? ["Baskerville-Bold"] : ["Baskerville"])
        case .typewriter: return named(heavy ? ["AmericanTypewriter-Bold"] : ["AmericanTypewriter"])
        case .marker: return named(heavy ? ["MarkerFelt-Wide"] : ["MarkerFelt-Thin"])
        case .chalk: return named(heavy ? ["ChalkboardSE-Bold"] : ["ChalkboardSE-Regular"])
        case .noteworthy: return named(heavy ? ["Noteworthy-Bold"] : ["Noteworthy-Light"])
        case .handwriting: return named(heavy ? ["SnellRoundhand-Black", "SnellRoundhand-Bold"] : ["SnellRoundhand"])
        case .copperplate: return named(heavy ? ["Copperplate-Bold"] : ["Copperplate"])
        case .rockwell: return named(heavy ? ["Rockwell-Bold"] : ["Rockwell-Regular"])
        case .party: return named(["PartyLetPlain"])
        }
    }

    /// Imagen completa (fondo + texto) — para escenas y vistas previas.
    static func image(for spec: TextOverlay, canvas: CGSize) -> CIImage? {
        guard let b = render(spec, canvas: canvas) else { return nil }
        if let bg = b.background { return b.text.composited(over: bg) }
        return b.text
    }

    static func render(_ spec: TextOverlay, canvas: CGSize, highlightColor: String? = nil) -> TextBlock? {
        let string = spec.uppercase ? spec.text.uppercased() : spec.text
        guard !string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
        let fontSize = max(10, canvas.width * CGFloat(spec.size))
        let uiFont = font(spec.font, spec.weight, size: fontSize)

        let para = NSMutableParagraphStyle()
        para.alignment = spec.align == .left ? .left : spec.align == .right ? .right : .center
        para.lineBreakMode = .byWordWrapping
        para.lineHeightMultiple = 0.92
        let baseAttrs: [NSAttributedString.Key: Any] = [
            .font: uiFont,
            .paragraphStyle: para,
            .kern: CGFloat(spec.letterSpacing) * fontSize,
        ]

        // Maquetación con TextKit para saber dónde cae cada palabra y letra.
        let storage = NSTextStorage(string: string, attributes: baseAttrs)
        let layout = NSLayoutManager()
        let container = NSTextContainer(size: CGSize(width: canvas.width * CGFloat(spec.maxWidth), height: .greatestFiniteMagnitude))
        container.lineFragmentPadding = 0
        layout.addTextContainer(container)
        storage.addLayoutManager(layout)
        layout.ensureLayout(for: container)
        let used = layout.usedRect(for: container).integral
        guard used.width > 0, used.height > 0 else { return nil }

        let glowExtra = spec.glowColor.isEmpty ? 0 : fontSize * CGFloat(spec.glowAmount) * 0.5
        let margin = ceil(fontSize * 0.5 + glowExtra)
        let size = CGSize(width: used.width + margin * 2, height: used.height + margin * 2)
        let origin = CGPoint(x: margin - used.minX, y: margin - used.minY)
        let extent = CGRect(origin: .zero, size: size)

        func draw(_ attrs: [NSAttributedString.Key: Any]) -> CIImage? {
            storage.setAttributes(baseAttrs.merging(attrs) { $1 }, range: NSRange(location: 0, length: storage.length))
            layout.ensureLayout(for: container)
            let format = UIGraphicsImageRendererFormat()
            format.scale = 1
            format.opaque = false
            let img = UIGraphicsImageRenderer(size: size, format: format).image { _ in
                let range = layout.glyphRange(for: container)
                layout.drawGlyphs(forGlyphRange: range, at: origin)
            }
            return img.cgImage.map { CIImage(cgImage: $0) }
        }

        guard let mask = draw([.foregroundColor: UIColor.white]) else { return nil }
        var strokeImage: CIImage?
        if spec.strokeWidth > 0.01 {
            strokeImage = draw([.foregroundColor: UIColor.clear,
                                .strokeColor: UIColor(hex: spec.strokeColor, fallback: .black),
                                .strokeWidth: CGFloat(spec.strokeWidth) * 22])
        }

        func fill(_ colorHex: String) -> CIImage {
            if !spec.gradientColor.isEmpty {
                let g = CIFilter.linearGradient()
                g.point0 = CGPoint(x: 0, y: size.height - margin)
                g.point1 = CGPoint(x: 0, y: margin)
                g.color0 = UIColor(hex: colorHex).asCIColor
                g.color1 = UIColor(hex: spec.gradientColor).asCIColor
                let grad = (g.outputImage ?? mask).cropped(to: extent)
                let blend = CIFilter.blendWithAlphaMask()
                blend.inputImage = grad
                blend.backgroundImage = CIImage.empty()
                blend.maskImage = mask
                return (blend.outputImage ?? mask).cropped(to: extent)
            }
            return tint(mask, UIColor(hex: colorHex))
        }

        func compose(_ colorHex: String) -> CIImage {
            var layers = CIImage.empty().cropped(to: extent)
            let shape = strokeImage.map { $0.composited(over: mask) } ?? mask
            if !spec.glowColor.isEmpty && spec.glowAmount > 0.01 {
                let glowColor = UIColor(hex: spec.glowColor)
                let tinted = tint(shape, glowColor)
                let small = tinted.applyingGaussianBlur(sigma: Double(fontSize) * 0.08)
                let large = tinted.applyingGaussianBlur(sigma: Double(fontSize) * 0.3 * spec.glowAmount + 2)
                let glow = alpha(large, min(1, spec.glowAmount * 1.4)).composited(over: alpha(small, spec.glowAmount))
                layers = glow.composited(over: alpha(large, spec.glowAmount * 0.6)).composited(over: layers)
            }
            if spec.shadow > 0.01 {
                let shadow = alpha(tint(shape, .black), 0.75 * spec.shadow)
                    .applyingGaussianBlur(sigma: Double(fontSize) * 0.06)
                    .transformed(by: CGAffineTransform(translationX: fontSize * 0.03, y: -fontSize * 0.05))
                layers = shadow.composited(over: layers)
            }
            if let strokeImage { layers = strokeImage.composited(over: layers) }
            layers = fill(colorHex).composited(over: layers)
            return bake(layers.cropped(to: extent), extent)
        }

        let text = compose(spec.color)
        let highlight = highlightColor.map { compose($0) }

        // Fondo
        var background: CIImage?
        if spec.background != .none {
            let pad = fontSize * 0.32
            let box = CGRect(x: margin - pad, y: margin - pad, width: used.width + pad * 2, height: used.height + pad * 2)
            let bgColor = UIColor(hex: spec.backgroundColor, fallback: .black)
            let width = spec.background == .bar ? canvas.width : size.width
            let fmt = UIGraphicsImageRendererFormat()
            fmt.scale = 1
            fmt.opaque = false
            let img = UIGraphicsImageRenderer(size: CGSize(width: width, height: size.height), format: fmt).image { _ in
                let dx = (width - size.width) / 2
                switch spec.background {
                case .none: break
                case .box:
                    bgColor.setFill()
                    UIBezierPath(roundedRect: box.offsetBy(dx: dx, dy: 0), cornerRadius: fontSize * 0.18).fill()
                case .pill:
                    bgColor.setFill()
                    UIBezierPath(roundedRect: box.insetBy(dx: -pad * 0.4, dy: 0).offsetBy(dx: dx, dy: 0),
                                 cornerRadius: box.height / 2).fill()
                case .bar:
                    bgColor.setFill()
                    UIBezierPath(rect: CGRect(x: 0, y: box.minY, width: width, height: box.height)).fill()
                case .outline:
                    bgColor.setStroke()
                    let path = UIBezierPath(roundedRect: box.offsetBy(dx: dx, dy: 0), cornerRadius: fontSize * 0.18)
                    path.lineWidth = max(2, fontSize * 0.06)
                    path.stroke()
                }
            }
            if let cg = img.cgImage {
                background = CIImage(cgImage: cg).transformed(by: CGAffineTransform(translationX: -(width - size.width) / 2, y: 0))
            }
        }

        // Rectángulos de palabras y letras (en coordenadas CI del bloque).
        storage.setAttributes(baseAttrs, range: NSRange(location: 0, length: storage.length))
        layout.ensureLayout(for: container)
        func ciRect(_ r: CGRect, padX: CGFloat, padY: CGFloat) -> CGRect {
            let x = r.minX + origin.x
            let yTop = r.minY + origin.y
            return CGRect(x: x - padX, y: size.height - (yTop + r.height) - padY,
                          width: r.width + padX * 2, height: r.height + padY * 2)
        }
        let ns = string as NSString
        var words: [CGRect] = []
        ns.enumerateSubstrings(in: NSRange(location: 0, length: ns.length), options: .byWords) { _, range, _, _ in
            let glyphs = layout.glyphRange(forCharacterRange: range, actualCharacterRange: nil)
            let r = layout.boundingRect(forGlyphRange: glyphs, in: container)
            words.append(ciRect(r, padX: fontSize * 0.1, padY: fontSize * 0.22))
        }
        var letters: [CGRect] = []
        ns.enumerateSubstrings(in: NSRange(location: 0, length: ns.length), options: .byComposedCharacterSequences) { sub, range, _, _ in
            guard let sub, !sub.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
            let glyphs = layout.glyphRange(forCharacterRange: range, actualCharacterRange: nil)
            let r = layout.boundingRect(forGlyphRange: glyphs, in: container)
            letters.append(ciRect(r, padX: 0, padY: fontSize * 0.22))
        }

        return TextBlock(text: text, highlight: highlight, background: background, size: size,
                         words: words, letters: letters, fontSize: fontSize)
    }

    // MARK: - Utilidades

    static func tint(_ img: CIImage, _ color: UIColor) -> CIImage {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        color.getRed(&r, green: &g, blue: &b, alpha: &a)
        let f = CIFilter.colorMatrix()
        f.inputImage = img
        f.rVector = CIVector(x: 0, y: 0, z: 0, w: 0)
        f.gVector = CIVector(x: 0, y: 0, z: 0, w: 0)
        f.bVector = CIVector(x: 0, y: 0, z: 0, w: 0)
        f.aVector = CIVector(x: 0, y: 0, z: 0, w: a)
        f.biasVector = CIVector(x: r, y: g, z: b, w: 0)
        return f.outputImage ?? img
    }

    static func alpha(_ img: CIImage, _ k: Double) -> CIImage {
        if k >= 0.999 { return img }
        let f = CIFilter.colorMatrix()
        f.inputImage = img
        f.aVector = CIVector(x: 0, y: 0, z: 0, w: CGFloat(max(0, k)))
        return f.outputImage ?? img
    }

    private static func bake(_ img: CIImage, _ extent: CGRect) -> CIImage {
        guard let cg = context.createCGImage(img, from: extent) else { return img }
        return CIImage(cgImage: cg)
    }
}
