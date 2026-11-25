import PhotosUI
import SwiftUI

struct PhotoEditorView: View {
    @Environment(EditorModel.self) private var keys
    @Environment(PhotoModel.self) private var photo
    @State private var draft = ""
    @State private var showPanel = false
    @FocusState private var typing: Bool

    private let suggestions = [
        "Colores de película", "Quita el fondo", "Fondo desenfocado", "Retoque de piel natural",
        "Cielo de atardecer épico", "Quita a la gente del fondo", "Póster con título", "Blanco y negro dramático",
        "Estilo cyberpunk", "Texto detrás de mí", "Formato 4:5 para Instagram", "Otro ángulo de cámara",
    ]

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Color.black
                if let img = photo.preview {
                    Image(uiImage: img).resizable().scaledToFit()
                        .background(CheckerboardView().opacity(photo.plan.background == .remove ? 1 : 0))
                } else {
                    ProgressView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: 400)
            .overlay(alignment: .bottom) {
                if let s = photo.status {
                    HStack(spacing: 10) { ProgressView(); Text(s) }
                        .font(.footnote.weight(.medium))
                        .padding(.horizontal, 14).padding(.vertical, 8)
                        .background(.ultraThinMaterial, in: Capsule())
                        .padding(.bottom, 12)
                }
            }

            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 10) {
                        ForEach(photo.messages) { m in
                            Text(m.text)
                                .padding(.horizontal, 14).padding(.vertical, 10)
                                .background(m.role == .user ? Color.accentColor.opacity(0.35) : m.role == .error ? Color.red.opacity(0.12) : Color.white.opacity(0.08),
                                            in: RoundedRectangle(cornerRadius: 18))
                                .foregroundStyle(m.role == .error ? Color.red : Color.primary)
                                .frame(maxWidth: .infinity, alignment: m.role == .user ? .trailing : .leading)
                                .id(m.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: photo.messages) { _, msgs in
                    if let last = msgs.last { withAnimation { proxy.scrollTo(last.id, anchor: .bottom) } }
                }
            }

            if !photo.isBusy {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(suggestions, id: \.self) { s in
                            Button(s) { send(s) }
                                .font(.footnote)
                                .padding(.horizontal, 12).padding(.vertical, 7)
                                .background(.white.opacity(0.08), in: Capsule())
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical, 6)
            }

            HStack(alignment: .bottom, spacing: 10) {
                TextField("Dime cómo editarla…", text: $draft, axis: .vertical)
                    .lineLimit(1...4)
                    .focused($typing)
                    .padding(.horizontal, 14).padding(.vertical, 10)
                    .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
                    .onSubmit { send(draft) }
                Button { send(draft) } label: { Image(systemName: "arrow.up.circle.fill").font(.system(size: 34)) }
                    .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty || photo.isBusy)
            }
            .padding(.horizontal).padding(.vertical, 8)
            .background(.bar)
        }
        .navigationTitle("Foto")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button { photo.beginManualEdit(); showPanel = true } label: { Image(systemName: "slider.horizontal.3") }
                    .disabled(photo.isBusy || !photo.hasPhoto)
                Button { Task { await photo.undo() } } label: { Image(systemName: "arrow.uturn.backward") }
                    .disabled(!photo.canUndo || photo.isBusy)
                Button { Task { await photo.save() } } label: { Image(systemName: "square.and.arrow.down") }
                    .disabled(photo.isBusy || !photo.hasPhoto)
            }
        }
        .sheet(isPresented: $showPanel) { PhotoProPanel() }
        .alert(photo.savedMessage ?? "", isPresented: Binding(get: { photo.savedMessage != nil },
                                                              set: { if !$0 { photo.savedMessage = nil } })) {
            Button("OK") {}
        }
    }

    private func send(_ text: String) {
        let t = text
        draft = ""
        typing = false
        Task { await photo.send(t, keys: keys) }
    }
}

/// Controles manuales del editor de fotos.
struct PhotoProPanel: View {
    @Environment(EditorModel.self) private var keys
    @Environment(PhotoModel.self) private var photo
    @Environment(\.dismiss) private var dismiss
    @State private var tab = 0
    @State private var genPrompt = ""

    private var plan: Binding<PhotoPlan> {
        Binding(get: { photo.plan }, set: { photo.setPlanLive($0) })
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("", selection: $tab) {
                    Text("Ajustes").tag(0); Text("Color").tag(1); Text("Texto").tag(2)
                    Text("Efectos").tag(3); Text("IA").tag(4)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal).padding(.vertical, 8)
                Form {
                    switch tab {
                    case 0: adjustments
                    case 1: GradeSections(grade: plan.color)
                    case 2: texts
                    case 3: effects
                    default: generative
                    }
                }
            }
            .navigationTitle("Editor de foto")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Listo") { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
        .presentationBackgroundInteraction(.enabled(upThrough: .medium))
    }

    @ViewBuilder private var adjustments: some View {
        Section("Recorte") {
            EnumPicker("Formato", selection: plan.crop)
            SliderRow("Encuadre X", value: plan.focusX, range: 0...1)
            SliderRow("Encuadre Y", value: plan.focusY, range: 0...1)
            SliderRow("Enderezar", value: plan.straighten, range: -45...45, format: "%.1f°")
            Toggle("Voltear horizontal", isOn: plan.flipHorizontal)
        }
        Section("Retoque y fondo") {
            SliderRow("Suavizar piel", value: plan.retouch, range: 0...1)
            EnumPicker("Fondo", selection: plan.background)
            if photo.plan.background == .color { HexColorPicker("Color de fondo", hex: plan.backgroundColor) }
            if photo.plan.background == .blur || photo.plan.background == .darken {
                SliderRow("Intensidad", value: plan.backgroundBlur, range: 0...1)
            }
        }
    }

    @ViewBuilder private var texts: some View {
        Section {
            ForEach(photo.plan.texts.indices, id: \.self) { i in
                NavigationLink {
                    TextInspector(text: plan.texts[i], segmentCount: 1, forPhoto: true)
                } label: { Text(photo.plan.texts[i].text).lineLimit(1) }
            }
            .onDelete { idx in var p = photo.plan; p.texts.remove(atOffsets: idx); photo.setPlanLive(p) }
            Button {
                var p = photo.plan
                var t = TextOverlay.basic("Tu texto")
                t.animationIn = .none; t.animationOut = .none; t.duration = 10; t.startOffset = 0
                p.texts.append(t)
                photo.setPlanLive(p)
            } label: { Label("Agregar texto", systemImage: "plus") }
        }
    }

    @ViewBuilder private var effects: some View {
        Section {
            ForEach(photo.plan.effects.indices, id: \.self) { i in
                DisclosureGroup(photo.plan.effects[i].type.rawValue.replacingOccurrences(of: "_", with: " ")) {
                    SliderRow("Intensidad", value: plan.effects[i].intensity, range: 0...1)
                    SliderRow("Foco X", value: plan.effects[i].focusX, range: 0...1)
                    SliderRow("Foco Y", value: plan.effects[i].focusY, range: 0...1)
                    OptionalHexColorPicker("Color", hex: plan.effects[i].color)
                    OptionalHexColorPicker("Color 2", hex: plan.effects[i].secondaryColor)
                }
            }
            .onDelete { idx in var p = photo.plan; p.effects.remove(atOffsets: idx); photo.setPlanLive(p) }
            Menu {
                ForEach(EffectType.allCases.filter { !ScheduledEffect(effect: Effect(type: $0, segmentIndex: -1, startOffset: 0, duration: 0, intensity: 1, focusX: 0.5, focusY: 0.5, color: "", secondaryColor: ""), start: 0, end: 0).isCamera && $0 != .strobe && $0 != .flash }, id: \.self) { type in
                    Button(type.rawValue.replacingOccurrences(of: "_", with: " ")) {
                        var p = photo.plan
                        p.effects.append(Effect(type: type, segmentIndex: -1, startOffset: 0, duration: 0, intensity: 0.7,
                                                focusX: 0.5, focusY: 0.45, color: "", secondaryColor: ""))
                        photo.setPlanLive(p)
                    }
                }
            } label: { Label("Agregar efecto", systemImage: "plus") }
        }
    }

    @ViewBuilder private var generative: some View {
        Section {
            TextField("Ej: quita los cables del cielo", text: $genPrompt, axis: .vertical)
            Button {
                let p = genPrompt
                dismiss()
                Task { await photo.generative(p, keys: keys) }
            } label: { Label("Aplicar con IA generativa", systemImage: "wand.and.stars") }
            .disabled(genPrompt.trimmingCharacters(in: .whitespaces).isEmpty)
        } header: {
            Text("Relleno generativo")
        } footer: {
            Text("Quitar o agregar cosas, cambiar el cielo, la ropa o el fondo, expandir la foto… Usa tu key de fal.ai (Ajustes). Escribe en inglés para mejores resultados.")
        }
        Section("Rápidos") {
            ForEach([
                ("Quitar personas del fondo", "Remove all the people in the background, fill the area naturally"),
                ("Cielo de atardecer", "Replace the sky with a dramatic golden sunset sky, matching lighting"),
                ("Quitar objetos que distraen", "Remove distracting objects, trash and wires, keep the main subject unchanged"),
                ("Otro ángulo de cámara", "Show the same scene and subject from a low-angle three-quarter view, same lighting and style"),
                ("Fondo de estudio", "Place the subject in a clean professional photo studio with soft lighting"),
            ], id: \.0) { item in
                Button(item.0) {
                    dismiss()
                    Task { await photo.generative(item.1, keys: keys) }
                }
            }
        }
    }
}

/// Fondo de cuadritos para ver la transparencia.
struct CheckerboardView: View {
    var body: some View {
        Canvas { ctx, size in
            let s: CGFloat = 12
            for y in stride(from: 0, to: size.height, by: s) {
                for x in stride(from: 0, to: size.width, by: s) where (Int(x / s) + Int(y / s)) % 2 == 0 {
                    ctx.fill(Path(CGRect(x: x, y: y, width: s, height: s)), with: .color(.gray.opacity(0.4)))
                }
            }
        }
    }
}
