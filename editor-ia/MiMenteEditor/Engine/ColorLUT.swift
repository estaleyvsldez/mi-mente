import CoreImage
import UIKit

/// Motor de color: convierte un ColorGrade en un LUT 3D (como DaVinci/Premiere) y lo aplica con Core Image.
/// Todo lo "tonal" (exposición, balance de blancos, ruedas, curvas, HSL, split toning, looks de película)
/// se hornea en el LUT; lo espacial (claridad, grano, bloom, halación, viñeta) se hace aparte.
enum ColorLUT {
    static let dimension = 33

    // MARK: - Looks predefinidos (cada uno es un grade completo)

    static func look(_ preset: ColorPreset) -> ColorGrade {
        var g = ColorGrade.neutral
        func split(_ s: String, _ h: String, _ amount: Double, _ balance: Double = 0) {
            g.splitShadows = s; g.splitHighlights = h; g.splitAmount = amount; g.splitBalance = balance
        }
        switch preset {
        case .none: break
        case .cinematic:
            g.contrast = 0.25; g.saturation = -0.1; g.blacks = -0.1; g.fade = 0.04; g.vignette = 0.3
            split("#1E5A6E", "#FFB070", 0.35); g.skinProtect = 0.6
        case .tealOrange:
            split("#00707A", "#FF9A3C", 0.55); g.contrast = 0.2; g.saturation = 0.1; g.skinProtect = 0.6
            g.hsl = [HSLAdjust(band: .orange, hue: 0, saturation: 0.2, luminance: 0.05),
                     HSLAdjust(band: .blue, hue: -0.35, saturation: 0.1, luminance: -0.1),
                     HSLAdjust(band: .green, hue: 0.35, saturation: -0.3, luminance: 0),
                     HSLAdjust(band: .aqua, hue: 0, saturation: 0.25, luminance: -0.05)]
        case .warm:
            g.temperature = 0.35; g.tint = 0.05; g.saturation = 0.05
        case .cool:
            g.temperature = -0.35; g.saturation = -0.05
        case .goldenHour:
            g.temperature = 0.5; g.tint = 0.1; g.highlights = -0.1; g.bloom = 0.25; g.saturation = 0.1
            split("#5A3A2A", "#FFC56E", 0.4, 0.3)
        case .kodakFilm:
            g.temperature = 0.15; g.contrast = 0.1; g.fade = 0.12; g.saturation = -0.05; g.grain = 0.25
            split("#3A4A5A", "#FFD8A8", 0.3); g.halation = 0.2
            g.hsl = [HSLAdjust(band: .green, hue: 0.15, saturation: -0.2, luminance: 0),
                     HSLAdjust(band: .red, hue: 0.05, saturation: 0.1, luminance: 0)]
        case .fujiFilm:
            g.tint = 0.08; g.contrast = 0.15; g.grain = 0.2
            split("#2D5A4E", "#FFF1D6", 0.3)
            g.hsl = [HSLAdjust(band: .green, hue: -0.15, saturation: 0.1, luminance: -0.05),
                     HSLAdjust(band: .blue, hue: 0, saturation: 0.15, luminance: -0.1)]
        case .bleachBypass:
            g.saturation = -0.55; g.contrast = 0.45; g.clarity = 0.3; g.highlights = -0.1; g.vignette = 0.25
        case .crossProcess:
            g.tint = -0.2; g.contrast = 0.3; g.saturation = 0.25
            split("#003C8F", "#FFF06A", 0.5)
        case .matrix:
            g.tint = -0.6; g.saturation = -0.3; g.contrast = 0.3
            split("#002A10", "#B6FFB0", 0.5)
        case .cyberpunk:
            g.saturation = 0.3; g.contrast = 0.3; g.temperature = -0.2; g.bloom = 0.35
            split("#2A00FF", "#FF2BD6", 0.55)
            g.hsl = [HSLAdjust(band: .blue, hue: 0, saturation: 0.3, luminance: 0)]
        case .nordic:
            g.temperature = -0.3; g.saturation = -0.35; g.fade = 0.15; g.contrast = -0.05; g.highlights = 0.1
        case .vintage:
            g.fade = 0.25; g.saturation = -0.25; g.temperature = 0.25; g.grain = 0.35; g.vignette = 0.35
            split("#3A2E4A", "#FFDCA0", 0.3)
        case .fadedFilm:
            g.fade = 0.4; g.contrast = -0.2; g.saturation = -0.2; g.grain = 0.3
        case .noir:
            g.saturation = -1; g.contrast = 0.6; g.blacks = -0.2; g.vignette = 0.5; g.grain = 0.3; g.clarity = 0.2
        case .blackWhite:
            g.saturation = -1; g.contrast = 0.15
        case .sepia:
            g.saturation = -1; g.contrast = 0.05; g.fade = 0.1
            split("#704214", "#E8C99A", 0.65)
        case .vibrant:
            g.vibrance = 0.5; g.saturation = 0.15; g.contrast = 0.1; g.clarity = 0.15
        case .hdrPop:
            g.shadows = 0.5; g.highlights = -0.5; g.clarity = 0.6; g.vibrance = 0.35; g.sharpen = 0.3
        case .moody:
            g.exposure = -0.25; g.saturation = -0.3; g.contrast = 0.3; g.temperature = -0.15
            g.vignette = 0.45; g.blacks = -0.1
            split("#1C2A3A", "#C9B8A0", 0.35)
        case .pastel:
            g.contrast = -0.3; g.saturation = -0.25; g.fade = 0.2; g.exposure = 0.15
            split("#B9A7D6", "#FFD6E8", 0.3)
        case .dreamy:
            g.bloom = 0.5; g.contrast = -0.15; g.fade = 0.1; g.highlights = 0.1; g.temperature = 0.1
        case .desert:
            g.temperature = 0.45; g.saturation = -0.1; g.contrast = 0.15
            g.hsl = [HSLAdjust(band: .orange, hue: 0, saturation: 0.2, luminance: 0),
                     HSLAdjust(band: .blue, hue: 0, saturation: -0.4, luminance: 0.1)]
        case .arctic:
            g.temperature = -0.5; g.saturation = -0.2; g.exposure = 0.15; g.highlights = 0.2
        case .neonNight:
            g.saturation = 0.35; g.bloom = 0.4; g.contrast = 0.25
            split("#14003C", "#00E5FF", 0.5)
        }
        return g
    }

    /// Los efectos espaciales finales combinando look + ajustes del usuario.
    static func spatial(_ grade: ColorGrade) -> (clarity: Double, sharpen: Double, grain: Double,
                                                 bloom: Double, halation: Double, vignette: Double) {
        let l = look(grade.preset)
        let k = grade.presetIntensity
        return ((l.clarity * k + grade.clarity).clamped(-1, 1),
                (l.sharpen * k + grade.sharpen).clamped(0, 1),
                (l.grain * k + grade.grain).clamped(0, 1),
                (l.bloom * k + grade.bloom).clamped(0, 1),
                (l.halation * k + grade.halation).clamped(0, 1),
                (l.vignette * k + grade.vignette).clamped(0, 1))
    }

    // MARK: - Generación del LUT

    static func cubeData(for grade: ColorGrade) -> Data {
        let n = dimension
        let presetLook = look(grade.preset)
        let usePreset = grade.preset != .none && grade.presetIntensity > 0
        var floats = [Float](repeating: 0, count: n * n * n * 4)
        var i = 0
        for b in 0..<n {
            for g in 0..<n {
                for r in 0..<n {
                    var c = RGB(Double(r) / Double(n - 1), Double(g) / Double(n - 1), Double(b) / Double(n - 1))
                    if usePreset {
                        let looked = process(c, presetLook)
                        c = c.mix(looked, grade.presetIntensity)
                    }
                    c = process(c, grade).clamped
                    floats[i] = Float(c.r); floats[i + 1] = Float(c.g); floats[i + 2] = Float(c.b); floats[i + 3] = 1
                    i += 4
                }
            }
        }
        return floats.withUnsafeBufferPointer { Data(buffer: $0) }
    }

    static func filter(for grade: ColorGrade) -> CIFilter? {
        let f = CIFilter(name: "CIColorCubeWithColorSpace")
        f?.setValue(dimension, forKey: "inputCubeDimension")
        f?.setValue(cubeData(for: grade), forKey: "inputCubeData")
        f?.setValue(CGColorSpace(name: CGColorSpace.sRGB), forKey: "inputColorSpace")
        return f
    }

    /// Todas las operaciones tonales, en orden de un colorista.
    private static func process(_ input: RGB, _ g: ColorGrade) -> RGB {
        var c = input
        let skinW = skinWeight(c) * g.skinProtect

        // 1. Exposición
        if g.exposure != 0 { c = c * pow(2, g.exposure) }

        // 2. Balance de blancos (temperatura / tinte)
        if g.temperature != 0 || g.tint != 0 {
            let t = g.temperature * 0.14, m = g.tint * 0.1
            c = RGB(c.r * (1 + t) * (1 + m * 0.5), c.g * (1 + t * 0.1) * (1 - m), c.b * (1 - t) * (1 + m * 0.5))
        }

        // 3. Ruedas de color: lift (sombras), gamma (medios), gain (altas)
        let lift = g.lift.offset, gam = g.gamma.offset, gain = g.gain.offset
        if g.lift.amount > 0 || g.lift.luma != 0 {
            let l = RGB(lift.r + g.lift.luma * 0.15, lift.g + g.lift.luma * 0.15, lift.b + g.lift.luma * 0.15)
            c = RGB(c.r + l.r * (1 - c.r), c.g + l.g * (1 - c.g), c.b + l.b * (1 - c.b))
        }
        if g.gamma.amount > 0 || g.gamma.luma != 0 {
            func gm(_ v: Double, _ o: Double) -> Double { pow(max(v, 0), 1 / max(0.2, 1 + o * 1.5 + g.gamma.luma * 0.5)) }
            c = RGB(gm(c.r, gam.r), gm(c.g, gam.g), gm(c.b, gam.b))
        }
        if g.gain.amount > 0 || g.gain.luma != 0 {
            c = RGB(c.r * (1 + gain.r * 1.2 + g.gain.luma * 0.3),
                    c.g * (1 + gain.g * 1.2 + g.gain.luma * 0.3),
                    c.b * (1 + gain.b * 1.2 + g.gain.luma * 0.3))
        }

        // 4. Tonos: altas, sombras, blancos, negros (preservando el color)
        if g.highlights != 0 || g.shadows != 0 || g.whites != 0 || g.blacks != 0 {
            let L = c.luma
            let ws = pow(1 - min(max(L, 0), 1), 2), wh = pow(min(max(L, 0), 1), 2)
            let wb = pow(1 - min(max(L, 0), 1), 5), ww = pow(min(max(L, 0), 1), 5)
            var L2 = L + g.shadows * 0.35 * ws * (1 - ws * 0.3) + g.highlights * 0.3 * wh
            L2 += g.whites * 0.25 * ww + g.blacks * 0.2 * wb
            c = L > 0.0005 ? c * (L2 / L) : c + (L2 - L)
        }

        // 5. Contraste (curva en S alrededor de los medios)
        if g.contrast != 0 {
            func s(_ x: Double) -> Double {
                let v = min(max(x, 0), 1)
                if g.contrast > 0 {
                    let curve = v * v * (3 - 2 * v)
                    return x + (curve - v) * g.contrast * 1.6
                } else {
                    return x + (0.5 - x) * (-g.contrast) * 0.5
                }
            }
            c = RGB(s(c.r), s(c.g), s(c.b))
        }

        // 6. Ajustes por color (HSL)
        if !g.hsl.isEmpty {
            var hsv = c.clamped.hsv
            var dh = 0.0, ds = 0.0, dl = 0.0
            for adj in g.hsl {
                let w = bandWeight(hsv.h, adj.band) * min(1, hsv.s * 3)
                dh += adj.hue * 30 * w
                ds += adj.saturation * w
                dl += adj.luminance * w
            }
            hsv.h = (hsv.h + dh * (1 - skinW * 0.7)).truncatingRemainder(dividingBy: 360)
            if hsv.h < 0 { hsv.h += 360 }
            hsv.s = (hsv.s * (1 + ds)).clamped(0, 1)
            hsv.v = (hsv.v * (1 + dl * 0.5)).clamped(0, 1.5)
            c = RGB(hsv: hsv)
        }

        // 7. Saturación y vibrancia (protegiendo la piel)
        if g.saturation != 0 || g.vibrance != 0 {
            let L = c.luma
            var amount = g.saturation
            if g.vibrance != 0 {
                let sat = c.clamped.hsv.s
                amount += g.vibrance * (1 - sat) * (1 - skinW * 0.6)
            }
            if amount > 0 { amount *= (1 - skinW * 0.5) }
            c = RGB(L + (c.r - L) * (1 + amount), L + (c.g - L) * (1 + amount), L + (c.b - L) * (1 + amount))
        }

        // 8. Split toning (color en sombras y en altas)
        if g.splitAmount > 0 {
            let L = min(max(c.luma, 0), 1)
            let shadowW = pow(1 - L, 1.5) * (1 - g.splitBalance * 0.5)
            let highW = pow(L, 1.5) * (1 + g.splitBalance * 0.5)
            let sc = RGB(hex: g.splitShadows), hc = RGB(hex: g.splitHighlights)
            let k = g.splitAmount * 0.45
            c = RGB(c.r + (sc.r - 0.5) * shadowW * k + (hc.r - 0.5) * highW * k,
                    c.g + (sc.g - 0.5) * shadowW * k + (hc.g - 0.5) * highW * k,
                    c.b + (sc.b - 0.5) * shadowW * k + (hc.b - 0.5) * highW * k)
            // Mantener la luminancia original para que no se "lave".
            let L2 = c.luma
            if L2 > 0.001 { c = c * (L / L2 * 0.6 + 0.4) }
        }

        // 9. Fade (negros mate de película)
        if g.fade > 0 {
            c = c * (1 - g.fade * 0.22) + g.fade * 0.11
        }
        return c
    }

    private static func bandWeight(_ hue: Double, _ band: HSLBand) -> Double {
        let center: Double
        switch band {
        case .red: center = 0
        case .orange: center = 30
        case .yellow: center = 60
        case .green: center = 120
        case .aqua: center = 180
        case .blue: center = 225
        case .purple: center = 275
        case .magenta: center = 320
        }
        var d = abs(hue - center).truncatingRemainder(dividingBy: 360)
        if d > 180 { d = 360 - d }
        let width = band == .green || band == .blue ? 45.0 : 30.0
        return max(0, 1 - d / width)
    }

    /// ¿Qué tanto parece piel este color? (tono 5°–50°, saturación media)
    private static func skinWeight(_ c: RGB) -> Double {
        let hsv = c.clamped.hsv
        guard hsv.s > 0.1, hsv.s < 0.7, hsv.v > 0.2 else { return 0 }
        let d = abs(hsv.h - 25)
        return max(0, 1 - d / 25)
    }

    // MARK: - LUTs .cube importados

    struct CubeLUT {
        let dimension: Int
        let data: Data
    }

    static var lutDirectory: URL {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("LUTs")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    static func importedLUTNames() -> [String] {
        let files = (try? FileManager.default.contentsOfDirectory(atPath: lutDirectory.path)) ?? []
        return files.filter { $0.lowercased().hasSuffix(".cube") }.map { String($0.dropLast(5)) }.sorted()
    }

    static func importLUT(from url: URL) throws -> String {
        let access = url.startAccessingSecurityScopedResource()
        defer { if access { url.stopAccessingSecurityScopedResource() } }
        let text = try String(contentsOf: url, encoding: .utf8)
        guard parseCube(text) != nil else { throw ClaudeError(message: "Ese archivo .cube no es válido.") }
        let name = url.deletingPathExtension().lastPathComponent
        let dst = lutDirectory.appendingPathComponent(name + ".cube")
        try? FileManager.default.removeItem(at: dst)
        try text.write(to: dst, atomically: true, encoding: .utf8)
        return name
    }

    static func loadLUT(named name: String) -> CubeLUT? {
        guard !name.isEmpty,
              let text = try? String(contentsOf: lutDirectory.appendingPathComponent(name + ".cube"), encoding: .utf8)
        else { return nil }
        return parseCube(text)
    }

    /// Lee el formato .cube estándar (Adobe/Resolve), 3D.
    static func parseCube(_ text: String) -> CubeLUT? {
        var size = 0
        var values: [Float] = []
        for raw in text.split(whereSeparator: \.isNewline) {
            let line = raw.trimmingCharacters(in: .whitespaces)
            if line.isEmpty || line.hasPrefix("#") { continue }
            if line.uppercased().hasPrefix("LUT_3D_SIZE") {
                size = Int(line.split(separator: " ").last ?? "") ?? 0
                continue
            }
            if let first = line.first, first.isLetter { continue }
            let parts = line.split(whereSeparator: { $0 == " " || $0 == "\t" }).compactMap { Float($0) }
            if parts.count == 3 { values.append(contentsOf: [parts[0], parts[1], parts[2], 1]) }
        }
        guard size >= 2, size <= 128, values.count == size * size * size * 4 else { return nil }
        return CubeLUT(dimension: size, data: values.withUnsafeBufferPointer { Data(buffer: $0) })
    }
}

// MARK: - Matemática de color

struct RGB {
    var r: Double, g: Double, b: Double
    init(_ r: Double, _ g: Double, _ b: Double) { self.r = r; self.g = g; self.b = b }
    init(hex: String) {
        var cr: CGFloat = 0, cg: CGFloat = 0, cb: CGFloat = 0, ca: CGFloat = 0
        UIColor(hex: hex, fallback: .gray).getRed(&cr, green: &cg, blue: &cb, alpha: &ca)
        self.init(Double(cr), Double(cg), Double(cb))
    }
    var luma: Double { 0.2126 * r + 0.7152 * g + 0.0722 * b }
    var clamped: RGB { RGB(r.clamped(0, 1), g.clamped(0, 1), b.clamped(0, 1)) }
    func mix(_ o: RGB, _ k: Double) -> RGB { RGB(r + (o.r - r) * k, g + (o.g - g) * k, b + (o.b - b) * k) }
    static func * (c: RGB, k: Double) -> RGB { RGB(c.r * k, c.g * k, c.b * k) }
    static func + (c: RGB, k: Double) -> RGB { RGB(c.r + k, c.g + k, c.b + k) }

    struct HSV { var h: Double; var s: Double; var v: Double }
    var hsv: HSV {
        let mx = max(r, g, b), mn = min(r, g, b), d = mx - mn
        var h = 0.0
        if d > 0.00001 {
            if mx == r { h = 60 * ((g - b) / d).truncatingRemainder(dividingBy: 6) }
            else if mx == g { h = 60 * ((b - r) / d + 2) }
            else { h = 60 * ((r - g) / d + 4) }
        }
        if h < 0 { h += 360 }
        return HSV(h: h, s: mx > 0 ? d / mx : 0, v: mx)
    }
    init(hsv: HSV) {
        let c = hsv.v * hsv.s
        let x = c * (1 - abs((hsv.h / 60).truncatingRemainder(dividingBy: 2) - 1))
        let m = hsv.v - c
        let (r1, g1, b1): (Double, Double, Double)
        switch hsv.h {
        case ..<60: (r1, g1, b1) = (c, x, 0)
        case ..<120: (r1, g1, b1) = (x, c, 0)
        case ..<180: (r1, g1, b1) = (0, c, x)
        case ..<240: (r1, g1, b1) = (0, x, c)
        case ..<300: (r1, g1, b1) = (x, 0, c)
        default: (r1, g1, b1) = (c, 0, x)
        }
        self.init(r1 + m, g1 + m, b1 + m)
    }
}

extension ColorWheel {
    /// Desplazamiento RGB (suma cero) hacia el tono de la rueda.
    var offset: RGB {
        guard amount > 0 else { return RGB(0, 0, 0) }
        let c = RGB(hsv: RGB.HSV(h: hue, s: 1, v: 1))
        let mean = (c.r + c.g + c.b) / 3
        let k = amount * 0.25
        return RGB((c.r - mean) * k, (c.g - mean) * k, (c.b - mean) * k)
    }
}
