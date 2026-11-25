import SwiftUI
import UniformTypeIdentifiers

/// Editor profesional: control manual total sobre lo que hizo la IA.
struct ProEditorView: View {
    @Environment(EditorModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var draft: EditPlan
    @State private var tab = Tab.color

    enum Tab: String, CaseIterable, Identifiable {
        case clips = "Clips", color = "Color", text = "Texto", effects = "Efectos", audio = "Audio", general = "Más"
        var id: String { rawValue }
        var icon: String {
            switch self {
            case .clips: return "film.stack"
            case .color: return "paintpalette"
            case .text: return "textformat"
            case .effects: return "sparkles"
            case .audio: return "waveform"
            case .general: return "slider.horizontal.3"
            }
        }
    }

    init(plan: EditPlan) { _draft = State(initialValue: plan) }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Sección", selection: $tab) {
                    ForEach(Tab.allCases) { t in Label(t.rawValue, systemImage: t.icon).tag(t) }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal).padding(.vertical, 8)

                Group {
                    switch tab {
                    case .clips: ClipsTab(plan: $draft, sourceDuration: model.sourceDuration)
                    case .color: ColorTab(plan: $draft)
                    case .text: TextsTab(plan: $draft)
                    case .effects: EffectsTab(plan: $draft)
                    case .audio: AudioTab(plan: $draft)
                    case .general: GeneralTab(plan: $draft)
                    }
                }
            }
            .navigationTitle("Editor pro")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cerrar") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Aplicar") { Task { await model.applyManual(draft) } }
                        .bold()
                        .disabled(model.isBusy || draft == model.plan)
                }
            }
            .onChange(of: model.plan) { _, newPlan in
                if let newPlan, model.isBusy == false { draft = newPlan }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationBackgroundInteraction(.enabled(upThrough: .medium))
    }
}

// MARK: - Clips

private struct ClipsTab: View {
    @Binding var plan: EditPlan
    let sourceDuration: Double

    var body: some View {
        Form {
            ForEach(plan.segments.indices, id: \.self) { i in
                DisclosureGroup {
                    segmentEditor(i)
                } label: {
                    let s = plan.segments[i]
                    switch s.kind {
                    case .clip:
                        Label(String(format: "Clip %d · %.1fs–%.1fs", i + 1, s.sourceStart, s.sourceEnd), systemImage: "film")
                    case .scene:
                        Label("Escena \(i + 1) · \(s.sceneTitle.isEmpty ? "sin título" : s.sceneTitle)", systemImage: "sparkles.rectangle.stack")
                    case .ai:
                        Label("IA \(i + 1) · \(s.aiCamera.rawValue.replacingOccurrences(of: "_", with: " "))", systemImage: "camera.aperture")
                    }
                }
            }
            Section {
                Button { plan.segments.append(Segment.clip(0, sourceDuration)) } label: {
                    Label("Agregar clip", systemImage: "plus")
                }
                Button {
                    var s = Segment.clip(0, 0)
                    s.kind = .scene; s.sceneDuration = 3; s.sceneTitle = "Nueva escena"; s.sceneStyle = .aurora
                    s.transitionIn = Transition(type: .crossfade, duration: 0.5)
                    plan.segments.append(s)
                } label: { Label("Agregar escena generada", systemImage: "wand.and.stars") }
                Button {
                    var s = Segment.clip(0, 0)
                    s.kind = .ai; s.sceneDuration = 5; s.aiCamera = .orbitRight
                    s.aiPrompt = "the same scene from a dramatic new angle"
                    s.transitionIn = Transition(type: .crossfade, duration: 0.4)
                    plan.segments.append(s)
                } label: { Label("Agregar escena con IA (otro ángulo)", systemImage: "camera.aperture") }
            }
        }
    }

    @ViewBuilder private func segmentEditor(_ i: Int) -> some View {
        let seg = $plan.segments[i]
        if plan.segments[i].kind == .ai {
            TextField("¿Qué pasa en la escena? (inglés funciona mejor)", text: seg.aiPrompt, axis: .vertical)
            EnumPicker("Movimiento de cámara", selection: seg.aiCamera)
            Toggle("Partir de un cuadro de mi video", isOn: seg.aiUseFrame)
            if plan.segments[i].aiUseFrame {
                SliderRow("Cuadro de partida", value: seg.sourceStart, range: 0...max(sourceDuration, 0.1), format: "%.1fs")
            }
            Picker("Duración", selection: seg.sceneDuration) {
                Text("5 s").tag(5.0)
                Text("10 s").tag(10.0)
            }
        } else if plan.segments[i].kind == .clip {
            SliderRow("Inicio", value: seg.sourceStart, range: 0...max(sourceDuration, 0.1), format: "%.2fs")
            SliderRow("Fin", value: seg.sourceEnd, range: 0...max(sourceDuration, 0.1), format: "%.2fs")
            SliderRow("Velocidad", value: seg.speed, range: 0.25...4, format: "%.2f×")
            EnumPicker("Rampa de velocidad", selection: seg.speedRamp)
            SliderRow("Encuadre X", value: seg.focusX, range: 0...1)
            SliderRow("Encuadre Y", value: seg.focusY, range: 0...1)
        } else {
            TextField("Título", text: seg.sceneTitle)
            TextField("Subtítulo", text: seg.sceneSubtitle)
            EnumPicker("Estilo", selection: seg.sceneStyle)
            SliderRow("Duración", value: seg.sceneDuration, range: 1...8, format: "%.1fs")
        }
        if i > 0 {
            EnumPicker("Transición de entrada", selection: seg.transitionIn.type)
            SliderRow("Duración transición", value: seg.transitionIn.duration, range: 0.1...1.5, format: "%.2fs")
        }
        Toggle("Color propio en este segmento", isOn: Binding(
            get: { plan.segments[i].color != nil },
            set: { plan.segments[i].color = $0 ? plan.color : nil }))
        HStack {
            Button { move(i, by: -1) } label: { Image(systemName: "arrow.up") }.disabled(i == 0)
            Button { move(i, by: 1) } label: { Image(systemName: "arrow.down") }.disabled(i == plan.segments.count - 1)
            Spacer()
            Button(role: .destructive) { delete(i) } label: { Image(systemName: "trash") }
                .disabled(plan.segments.count <= 1)
        }
        .buttonStyle(.borderless)
    }

    private func move(_ i: Int, by d: Int) {
        let j = i + d
        guard plan.segments.indices.contains(j) else { return }
        plan.segments.swapAt(i, j)
        for k in plan.texts.indices {
            if plan.texts[k].segmentIndex == i { plan.texts[k].segmentIndex = j }
            else if plan.texts[k].segmentIndex == j { plan.texts[k].segmentIndex = i }
        }
        for k in plan.effects.indices {
            if plan.effects[k].segmentIndex == i { plan.effects[k].segmentIndex = j }
            else if plan.effects[k].segmentIndex == j { plan.effects[k].segmentIndex = i }
        }
    }

    private func delete(_ i: Int) {
        plan.segments.remove(at: i)
        plan.texts.removeAll { $0.segmentIndex == i }
        plan.effects.removeAll { $0.segmentIndex == i }
        for k in plan.texts.indices where plan.texts[k].segmentIndex > i { plan.texts[k].segmentIndex -= 1 }
        for k in plan.effects.indices where plan.effects[k].segmentIndex > i { plan.effects[k].segmentIndex -= 1 }
    }
}

// MARK: - Color

private struct ColorTab: View {
    @Binding var plan: EditPlan
    @State private var target = -1   // -1 = general

    private var grade: Binding<ColorGrade> {
        Binding(
            get: { target >= 0 && plan.segments.indices.contains(target) ? (plan.segments[target].color ?? plan.color) : plan.color },
            set: { newValue in
                if target >= 0 && plan.segments.indices.contains(target) { plan.segments[target].color = newValue }
                else { plan.color = newValue }
            })
    }

    var body: some View {
        Form {
            Section {
                Picker("Aplicar a", selection: $target) {
                    Text("Todo el video").tag(-1)
                    ForEach(plan.segments.indices, id: \.self) { i in Text("Segmento \(i + 1)").tag(i) }
                }
            }
            GradeSections(grade: grade)
        }
    }
}

/// Todos los controles de color de un colorista (se usan en video y en fotos).
struct GradeSections: View {
    @Environment(EditorModel.self) private var model
    @Binding var grade: ColorGrade
    @State private var band = HSLBand.orange
    @State private var importing = false

    var body: some View {
        Group {
            Section {
                EnumPicker("Look", selection: $grade.preset)
                SliderRow("Intensidad del look", value: $grade.presetIntensity, range: 0...1)
                Button("Restablecer color") { grade = .neutral }
            }
            Section("Luz") {
                SliderRow("Exposición", value: $grade.exposure, range: -2...2, format: "%.2f EV")
                SliderRow("Contraste", value: $grade.contrast, range: -1...1)
                SliderRow("Altas luces", value: $grade.highlights, range: -1...1)
                SliderRow("Sombras", value: $grade.shadows, range: -1...1)
                SliderRow("Blancos", value: $grade.whites, range: -1...1)
                SliderRow("Negros", value: $grade.blacks, range: -1...1)
            }
            Section("Color") {
                SliderRow("Temperatura", value: $grade.temperature, range: -1...1)
                SliderRow("Tinte", value: $grade.tint, range: -1...1)
                SliderRow("Saturación", value: $grade.saturation, range: -1...1)
                SliderRow("Vibrancia", value: $grade.vibrance, range: -1...1)
                SliderRow("Proteger piel", value: $grade.skinProtect, range: 0...1)
            }
            Section("Ruedas de color") {
                WheelEditor(title: "Lift · sombras", wheel: $grade.lift)
                WheelEditor(title: "Gamma · medios", wheel: $grade.gamma)
                WheelEditor(title: "Gain · altas", wheel: $grade.gain)
            }
            Section("Split toning") {
                HexColorPicker("Sombras", hex: $grade.splitShadows)
                HexColorPicker("Altas luces", hex: $grade.splitHighlights)
                SliderRow("Cantidad", value: $grade.splitAmount, range: 0...1)
                SliderRow("Balance", value: $grade.splitBalance, range: -1...1)
            }
            Section("HSL por color") {
                EnumPicker("Color", selection: $band)
                SliderRow("Tono", value: hslBinding(\.hue), range: -1...1)
                SliderRow("Saturación", value: hslBinding(\.saturation), range: -1...1)
                SliderRow("Luminancia", value: hslBinding(\.luminance), range: -1...1)
            }
            Section("Acabado") {
                SliderRow("Fade (negros mate)", value: $grade.fade, range: 0...1)
                SliderRow("Claridad", value: $grade.clarity, range: -1...1)
                SliderRow("Nitidez", value: $grade.sharpen, range: 0...1)
                SliderRow("Grano", value: $grade.grain, range: 0...1)
                SliderRow("Bloom", value: $grade.bloom, range: 0...1)
                SliderRow("Halación", value: $grade.halation, range: 0...1)
                SliderRow("Viñeta", value: $grade.vignette, range: 0...1)
            }
            Section("LUT (.cube)") {
                Picker("LUT", selection: $grade.lut) {
                    Text("Ninguno").tag("")
                    ForEach(model.importedLUTs, id: \.self) { Text($0).tag($0) }
                }
                SliderRow("Intensidad LUT", value: $grade.lutIntensity, range: 0...1)
                Button { importing = true } label: { Label("Importar LUT…", systemImage: "square.and.arrow.down") }
            }
        }
        .fileImporter(isPresented: $importing,
                      allowedContentTypes: [UTType(filenameExtension: "cube") ?? .data, .data]) { result in
            if case .success(let url) = result, let name = model.importLUT(url) {
                grade.lut = name
            }
        }
    }

    private func hslBinding(_ kp: WritableKeyPath<HSLAdjust, Double>) -> Binding<Double> {
        Binding(
            get: { grade.hsl.first(where: { $0.band == band })?[keyPath: kp] ?? 0 },
            set: { v in
                if let i = grade.hsl.firstIndex(where: { $0.band == band }) {
                    grade.hsl[i][keyPath: kp] = v
                } else {
                    var adj = HSLAdjust(band: band, hue: 0, saturation: 0, luminance: 0)
                    adj[keyPath: kp] = v
                    grade.hsl.append(adj)
                }
            })
    }
}

private struct WheelEditor: View {
    let title: String
    @Binding var wheel: ColorWheel

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title).font(.subheadline.weight(.semibold))
                Spacer()
                Circle()
                    .fill(Color(hue: wheel.hue / 360, saturation: wheel.amount, brightness: 0.6 + 0.4 * (wheel.luma + 1) / 2))
                    .frame(width: 22, height: 22)
                    .overlay(Circle().stroke(.white.opacity(0.4)))
            }
            ZStack {
                LinearGradient(colors: stride(from: 0.0, through: 1.0, by: 1.0 / 6).map { Color(hue: $0, saturation: 0.9, brightness: 0.9) },
                               startPoint: .leading, endPoint: .trailing)
                    .frame(height: 6).clipShape(Capsule())
                Slider(value: $wheel.hue, in: 0...360)
            }
            SliderRow("Cantidad", value: $wheel.amount, range: 0...1)
            SliderRow("Luz", value: $wheel.luma, range: -1...1)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Texto

private struct TextsTab: View {
    @Binding var plan: EditPlan

    var body: some View {
        Form {
            Section {
                ForEach(plan.texts.indices, id: \.self) { i in
                    NavigationLink {
                        TextInspector(text: $plan.texts[i], segmentCount: plan.segments.count)
                    } label: {
                        VStack(alignment: .leading) {
                            Text(plan.texts[i].text).lineLimit(1)
                            Text("\(plan.texts[i].font.rawValue) · \(plan.texts[i].animationIn.rawValue) · segmento \(plan.texts[i].segmentIndex + 1)")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
                .onDelete { plan.texts.remove(atOffsets: $0) }
                Button { plan.texts.append(.basic("Tu texto")) } label: { Label("Agregar texto", systemImage: "plus") }
            } header: { Text("Textos") }

            Section("Subtítulos automáticos") {
                Toggle("Activados", isOn: $plan.captions.enabled)
                EnumPicker("Plantilla", selection: $plan.captions.template)
                EnumPicker("Fuente", selection: $plan.captions.font)
                HexColorPicker("Color", hex: $plan.captions.color)
                HexColorPicker("Resaltado", hex: $plan.captions.highlightColor)
                SliderRow("Posición vertical", value: $plan.captions.y, range: 0.05...0.95)
                SliderRow("Tamaño", value: $plan.captions.size, range: 0.03...0.15)
                Toggle("MAYÚSCULAS", isOn: $plan.captions.uppercase)
                Stepper("Palabras por línea: \(plan.captions.maxWords)", value: $plan.captions.maxWords, in: 1...10)
            }
        }
    }
}

struct TextInspector: View {
    @Binding var text: TextOverlay
    let segmentCount: Int
    var forPhoto = false

    var body: some View {
        Form {
            Section("Texto") {
                TextField("Texto", text: $text.text, axis: .vertical)
                if !forPhoto {
                    Stepper("Segmento \(text.segmentIndex + 1)", value: $text.segmentIndex, in: 0...max(segmentCount - 1, 0))
                    SliderRow("Empieza en", value: $text.startOffset, range: 0...20, format: "%.1fs")
                    SliderRow("Dura", value: $text.duration, range: 0.3...20, format: "%.1fs")
                }
            }
            Section("Tipografía") {
                EnumPicker("Fuente", selection: $text.font)
                EnumPicker("Grosor", selection: $text.weight)
                SliderRow("Tamaño", value: $text.size, range: 0.02...0.3)
                SliderRow("Espaciado", value: $text.letterSpacing, range: -0.1...0.6)
                EnumPicker("Alineación", selection: $text.align)
                Toggle("MAYÚSCULAS", isOn: $text.uppercase)
                SliderRow("Ancho máximo", value: $text.maxWidth, range: 0.2...1)
            }
            Section("Estilo") {
                HexColorPicker("Color", hex: $text.color)
                OptionalHexColorPicker("Degradado", hex: $text.gradientColor)
                HexColorPicker("Contorno", hex: $text.strokeColor)
                SliderRow("Grosor contorno", value: $text.strokeWidth, range: 0...1)
                SliderRow("Sombra", value: $text.shadow, range: 0...1)
                OptionalHexColorPicker("Brillo neón", hex: $text.glowColor)
                SliderRow("Intensidad brillo", value: $text.glowAmount, range: 0...1)
                EnumPicker("Fondo", selection: $text.background)
                HexColorPicker("Color de fondo", hex: $text.backgroundColor)
            }
            Section("Posición") {
                SliderRow("Horizontal", value: $text.x, range: 0...1)
                SliderRow("Vertical", value: $text.y, range: 0...1)
                SliderRow("Rotación", value: $text.rotation, range: -45...45, format: "%.0f°")
                Toggle("Detrás de la persona", isOn: $text.behindSubject)
            }
            if !forPhoto {
                Section("Animación") {
                    EnumPicker("Entrada", selection: $text.animationIn)
                    EnumPicker("Salida", selection: $text.animationOut)
                    EnumPicker("En bucle", selection: $text.loop)
                }
            }
        }
        .navigationTitle("Texto")
    }
}

// MARK: - Efectos

private struct EffectsTab: View {
    @Binding var plan: EditPlan

    var body: some View {
        Form {
            ForEach(plan.effects.indices, id: \.self) { i in
                DisclosureGroup {
                    let e = $plan.effects[i]
                    EnumPicker("Efecto", selection: e.type)
                    Picker("Dónde", selection: e.segmentIndex) {
                        Text("Todo el video").tag(-1)
                        ForEach(plan.segments.indices, id: \.self) { s in Text("Segmento \(s + 1)").tag(s) }
                    }
                    SliderRow("Empieza en", value: e.startOffset, range: 0...30, format: "%.1fs")
                    SliderRow("Dura (0 = todo)", value: e.duration, range: 0...30, format: "%.1fs")
                    SliderRow("Intensidad", value: e.intensity, range: 0...1)
                    SliderRow("Foco X", value: e.focusX, range: 0...1)
                    SliderRow("Foco Y", value: e.focusY, range: 0...1)
                    OptionalHexColorPicker("Color", hex: e.color)
                    OptionalHexColorPicker("Color 2", hex: e.secondaryColor)
                } label: {
                    Label("\(plan.effects[i].type.rawValue.replacingOccurrences(of: "_", with: " ")) · \(plan.effects[i].segmentIndex < 0 ? "todo" : "seg. \(plan.effects[i].segmentIndex + 1)")",
                          systemImage: plan.effects[i].type.needsSubjectMask ? "person.crop.circle.badge.checkmark" : "sparkles")
                }
            }
            .onDelete { plan.effects.remove(atOffsets: $0) }
            Section {
                Menu {
                    ForEach(EffectType.allCases, id: \.self) { type in
                        Button(type.rawValue.replacingOccurrences(of: "_", with: " ")) {
                            plan.effects.append(Effect(type: type, segmentIndex: 0, startOffset: 0, duration: 0,
                                                       intensity: 0.7, focusX: 0.5, focusY: 0.45, color: "", secondaryColor: ""))
                        }
                    }
                } label: { Label("Agregar efecto", systemImage: "plus") }
            }
        }
    }
}

// MARK: - General

private struct GeneralTab: View {
    @Binding var plan: EditPlan

    var body: some View {
        Form {
            Section("Proyecto") {
                TextField("Título", text: $plan.title)
                EnumPicker("Formato", selection: $plan.format)
            }
        }
    }
}

// MARK: - Audio

private struct AudioTab: View {
    @Environment(EditorModel.self) private var model
    @Binding var plan: EditPlan
    @State private var importing = false

    var body: some View {
        Form {
            Section {
                SliderRow("Volumen de la voz", value: $plan.audio.originalVolume, range: 0...2)
                SliderRow("Cancelador de ruido", value: $plan.audio.noiseReduction, range: 0...1)
                EnumPicker("Efecto de voz", selection: $plan.audio.voicePreset)
                SliderRow("Tono (semitonos)", value: $plan.audio.pitch, range: -12...12, format: "%.1f")
                Toggle("Volumen parejo (normalizar)", isOn: $plan.audio.normalize)
                Toggle("Fundido al inicio y final", isOn: $plan.audio.fadeInOut)
            } header: { Text("Voz") } footer: { Text("Todo se procesa en tu iPhone, como en un estudio.") }
            Section("Ecualizador") {
                SliderRow("Graves", value: $plan.audio.eqLow, range: -1...1)
                SliderRow("Medios / presencia", value: $plan.audio.eqMid, range: -1...1)
                SliderRow("Agudos / aire", value: $plan.audio.eqHigh, range: -1...1)
            }
            Section("Dinámica y espacio") {
                SliderRow("Compresor", value: $plan.audio.compression, range: 0...1)
                SliderRow("De-esser (suaviza las S)", value: $plan.audio.deEss, range: 0...1)
                SliderRow("Reverb", value: $plan.audio.reverb, range: 0...1)
                EnumPicker("Espacio", selection: $plan.audio.reverbSpace)
            }
            Section("Música de fondo") {
                Picker("Canción", selection: $plan.audio.music) {
                    Text("Sin música").tag("")
                    ForEach(model.songs, id: \.self) { Text($0).tag($0) }
                }
                Button { importing = true } label: { Label("Importar canción…", systemImage: "music.note.list") }
                SliderRow("Volumen música", value: $plan.audio.musicVolume, range: 0...1)
                SliderRow("Empieza en (seg. de la canción)", value: $plan.audio.musicStart, range: 0...240, format: "%.0fs")
                SliderRow("Bajar música al hablar", value: $plan.audio.ducking, range: 0...1)
                Toggle("Fundido de música", isOn: $plan.audio.musicFade)
            }
        }
        .fileImporter(isPresented: $importing, allowedContentTypes: [.audio, .mp3, .mpeg4Audio, .wav]) { result in
            if case .success(let url) = result, let name = model.importSong(url) { plan.audio.music = name }
        }
    }
}

// MARK: - Controles reutilizables

struct SliderRow: View {
    let title: String
    @Binding var value: Double
    let range: ClosedRange<Double>
    let format: String

    init(_ title: String, value: Binding<Double>, range: ClosedRange<Double>, format: String = "%.2f") {
        self.title = title
        self._value = value
        self.range = range
        self.format = format
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text(title).font(.subheadline)
                Spacer()
                Text(String(format: format, value)).font(.caption.monospacedDigit()).foregroundStyle(.secondary)
            }
            Slider(value: $value, in: range)
        }
    }
}

struct EnumPicker<T: CaseIterable & RawRepresentable & Hashable>: View where T.RawValue == String, T.AllCases: RandomAccessCollection {
    let title: String
    @Binding var selection: T
    init(_ title: String, selection: Binding<T>) { self.title = title; self._selection = selection }

    var body: some View {
        Picker(title, selection: $selection) {
            ForEach(T.allCases, id: \.self) { v in
                Text(v.rawValue.replacingOccurrences(of: "_", with: " ").capitalized).tag(v)
            }
        }
    }
}

struct HexColorPicker: View {
    let title: String
    @Binding var hex: String
    init(_ title: String, hex: Binding<String>) { self.title = title; self._hex = hex }

    var body: some View {
        ColorPicker(title, selection: Binding(
            get: { Color(UIColor(hex: hex)) },
            set: { hex = UIColor($0).hexString }))
    }
}

/// Color que puede estar apagado ("" en el plan).
struct OptionalHexColorPicker: View {
    let title: String
    @Binding var hex: String
    init(_ title: String, hex: Binding<String>) { self.title = title; self._hex = hex }

    var body: some View {
        HStack {
            Toggle(title, isOn: Binding(get: { !hex.isEmpty }, set: { hex = $0 ? "#FF2BD6" : "" }))
            if !hex.isEmpty {
                ColorPicker("", selection: Binding(
                    get: { Color(UIColor(hex: hex)) },
                    set: { hex = UIColor($0).hexString }))
                .labelsHidden()
            }
        }
    }
}
