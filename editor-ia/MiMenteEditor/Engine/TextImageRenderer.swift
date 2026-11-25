import UIKit

/// Dibuja un texto (título, subtítulo, etc.) en una imagen transparente.
enum TextImageRenderer {
    static func render(text: String, style: TextStyle, size: TextSize, colorHex: String,
                       canvasWidth: CGFloat, sizeFactor: CGFloat? = nil) -> CGImage? {
        let factor: CGFloat = sizeFactor ?? {
            switch size {
            case .small: return 0.045
            case .medium: return 0.065
            case .large: return 0.095
            }
        }()
        let fontSize = max(14, canvasWidth * factor)
        let color = UIColor(hex: colorHex)

        func font(_ weight: UIFont.Weight, rounded: Bool = false) -> UIFont {
            let base = UIFont.systemFont(ofSize: fontSize, weight: weight)
            if rounded, let d = base.fontDescriptor.withDesign(.rounded) { return UIFont(descriptor: d, size: fontSize) }
            return base
        }

        let para = NSMutableParagraphStyle()
        para.alignment = .center
        para.lineBreakMode = .byWordWrapping

        var attrs: [NSAttributedString.Key: Any] = [.paragraphStyle: para, .foregroundColor: color]
        let shadow = NSShadow()
        var boxColor: UIColor?

        switch style {
        case .title:
            attrs[.font] = font(.black, rounded: true)
            shadow.shadowColor = UIColor.black.withAlphaComponent(0.45)
            shadow.shadowBlurRadius = fontSize * 0.25
            shadow.shadowOffset = CGSize(width: 0, height: fontSize * 0.05)
            attrs[.shadow] = shadow
        case .bold:
            attrs[.font] = font(.heavy)
            attrs[.strokeColor] = UIColor.black
            attrs[.strokeWidth] = -4.0
            shadow.shadowColor = UIColor.black.withAlphaComponent(0.6)
            shadow.shadowBlurRadius = fontSize * 0.15
            attrs[.shadow] = shadow
        case .subtitle:
            attrs[.font] = font(.semibold)
            boxColor = UIColor.black.withAlphaComponent(0.55)
        case .neon:
            attrs[.font] = font(.bold, rounded: true)
            shadow.shadowColor = color
            shadow.shadowBlurRadius = fontSize * 0.45
            attrs[.shadow] = shadow
        case .minimal:
            attrs[.font] = font(.light)
            shadow.shadowColor = UIColor.black.withAlphaComponent(0.35)
            shadow.shadowBlurRadius = fontSize * 0.12
            attrs[.shadow] = shadow
        case .boxed:
            attrs[.font] = font(.bold)
            boxColor = color
            attrs[.foregroundColor] = color.luminance > 0.6 ? UIColor.black : UIColor.white
        }

        let maxWidth = canvasWidth * 0.86
        let ns = text as NSString
        let bounds = ns.boundingRect(with: CGSize(width: maxWidth, height: .greatestFiniteMagnitude),
                                     options: [.usesLineFragmentOrigin, .usesFontLeading],
                                     attributes: attrs, context: nil).integral
        let pad = fontSize * (boxColor != nil ? 0.45 : 0.5)
        let imageSize = CGSize(width: ceil(bounds.width + pad * 2), height: ceil(bounds.height + pad * 2))

        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = false
        let image = UIGraphicsImageRenderer(size: imageSize, format: format).image { _ in
            if let boxColor {
                boxColor.setFill()
                UIBezierPath(roundedRect: CGRect(origin: .zero, size: imageSize), cornerRadius: fontSize * 0.3).fill()
            }
            ns.draw(with: CGRect(x: pad, y: pad, width: bounds.width, height: bounds.height),
                    options: [.usesLineFragmentOrigin, .usesFontLeading], attributes: attrs, context: nil)
        }
        return image.cgImage
    }
}
