import AVKit
import SwiftUI

struct EditorView: View {
    @Environment(EditorModel.self) private var model
    @State private var draft = ""
    @State private var showExport = false
    @State private var showPro = false
    @FocusState private var typing: Bool

    private let suggestions = [
        "Colores más fuertes", "Look de película", "Hazlo vertical para TikTok",
        "Subtítulos karaoke", "Texto detrás de mí", "Más efectos impresionantes",
        "Fondo desenfocado", "Color pop", "Cámara lenta en lo mejor",
        "Agrega una intro", "Estilo cyberpunk", "Hazlo más corto y rápido",
        "Escena IA con otro ángulo", "Toma de dron con IA", "Limpia el ruido del audio", "Voz de locutor",
    ]

    var body: some View {
        VStack(spacing: 0) {
            VideoPlayer(player: model.player)
                .aspectRatio(model.aspectRatio, contentMode: .fit)
                .frame(maxWidth: .infinity, maxHeight: 380)
                .background(Color.black)
                .overlay(alignment: .bottom) { statusBanner }

            chat

            if !model.isBusy && model.plan != nil {
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

            inputBar
        }
        .navigationTitle(model.plan?.title ?? "Editando")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button { showPro = true } label: { Image(systemName: "slider.horizontal.3") }
                    .disabled(model.plan == nil || model.isBusy)
                Button { Task { await model.undo() } } label: { Image(systemName: "arrow.uturn.backward") }
                    .disabled(!model.canUndo || model.isBusy)
                Button {
                    Task {
                        await model.export()
                        if model.exportedURL != nil { showExport = true }
                    }
                } label: { Image(systemName: "square.and.arrow.up") }
                    .disabled(model.isBusy || model.plan == nil)
            }
        }
        .sheet(isPresented: $showExport) { ExportSheet() }
        .sheet(isPresented: $showPro) {
            if let plan = model.plan { ProEditorView(plan: plan) }
        }
    }

    @ViewBuilder private var statusBanner: some View {
        if let status = model.status {
            HStack(spacing: 10) {
                if let p = model.exportProgress {
                    ProgressView(value: p).frame(width: 80)
                    Text("\(status) \(Int(p * 100))%")
                } else {
                    ProgressView()
                    Text(status)
                }
            }
            .font(.footnote.weight(.medium))
            .padding(.horizontal, 14).padding(.vertical, 8)
            .background(.ultraThinMaterial, in: Capsule())
            .padding(.bottom, 12)
        }
    }

    private var chat: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 10) {
                    if let plan = model.plan, plan.title != "Original" {
                        PlanSummary(plan: plan)
                    }
                    ForEach(model.messages) { m in
                        Bubble(message: m).id(m.id)
                    }
                }
                .padding()
            }
            .onChange(of: model.messages) { _, msgs in
                if let last = msgs.last { withAnimation { proxy.scrollTo(last.id, anchor: .bottom) } }
            }
        }
    }

    private var inputBar: some View {
        HStack(alignment: .bottom, spacing: 10) {
            TextField("Dime qué cambiar…", text: $draft, axis: .vertical)
                .lineLimit(1...4)
                .focused($typing)
                .padding(.horizontal, 14).padding(.vertical, 10)
                .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
                .submitLabel(.send)
                .onSubmit { send(draft) }
            Button { send(draft) } label: {
                Image(systemName: "arrow.up.circle.fill").font(.system(size: 34))
            }
            .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty || model.isBusy)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(.bar)
    }

    private func send(_ text: String) {
        let t = text
        draft = ""
        typing = false
        Task { await model.send(t) }
    }
}

private struct Bubble: View {
    let message: ChatMessage
    var body: some View {
        HStack {
            if message.role == .user { Spacer(minLength: 40) }
            Text(message.text)
                .padding(.horizontal, 14).padding(.vertical, 10)
                .background(background, in: RoundedRectangle(cornerRadius: 18))
                .foregroundStyle(message.role == .error ? Color.red : Color.primary)
            if message.role != .user { Spacer(minLength: 40) }
        }
    }
    private var background: Color {
        switch message.role {
        case .user: return Color.accentColor.opacity(0.35)
        case .ai: return Color.white.opacity(0.08)
        case .error: return Color.red.opacity(0.12)
        }
    }
}

/// Resumen rápido de lo que decidió la IA.
private struct PlanSummary: View {
    let plan: EditPlan
    var body: some View {
        let scenes = plan.segments.filter { $0.kind != .clip }.count
        let cuts = plan.segments.filter { $0.kind == .clip }.count
        let transitions = plan.segments.dropFirst().filter { $0.transitionIn.type != .none }.count
        VStack(alignment: .leading, spacing: 8) {
            Text(plan.summary).font(.subheadline).foregroundStyle(.secondary)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    Chip(icon: "scissors", text: "\(cuts) cortes")
                    Chip(icon: "timer", text: String(format: "%.0fs", plan.totalDuration))
                    Chip(icon: "camera.filters", text: plan.color.preset.rawValue.replacingOccurrences(of: "_", with: " "))
                    if transitions > 0 { Chip(icon: "rectangle.2.swap", text: "\(transitions) transiciones") }
                    if !plan.texts.isEmpty { Chip(icon: "textformat", text: "\(plan.texts.count) textos") }
                    if plan.captions.enabled { Chip(icon: "captions.bubble", text: "subtítulos \(plan.captions.template.rawValue)") }
                    if scenes > 0 { Chip(icon: "sparkles.rectangle.stack", text: "\(scenes) escenas IA") }
                    if !plan.effects.isEmpty { Chip(icon: "sparkles", text: "\(plan.effects.count) efectos") }
                    if plan.format != .original { Chip(icon: "aspectratio", text: plan.format.rawValue) }
                }
            }
        }
    }
}

private struct Chip: View {
    let icon: String
    let text: String
    var body: some View {
        Label(text, systemImage: icon)
            .font(.caption.weight(.medium))
            .padding(.horizontal, 10).padding(.vertical, 5)
            .background(.white.opacity(0.08), in: Capsule())
    }
}

struct ExportSheet: View {
    @Environment(EditorModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var saved = false
    @State private var error: String?

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "checkmark.seal.fill").font(.system(size: 56)).foregroundStyle(.green)
            Text("¡Tu video está listo!").font(.title2.bold())
            if let url = model.exportedURL {
                Button {
                    Task {
                        do { try await Exporter.saveToPhotos(url); saved = true }
                        catch { self.error = error.localizedDescription }
                    }
                } label: {
                    Label(saved ? "Guardado en Fotos" : "Guardar en Fotos", systemImage: saved ? "checkmark" : "photo.on.rectangle")
                        .frame(maxWidth: .infinity).padding(.vertical, 14)
                        .background(.tint, in: RoundedRectangle(cornerRadius: 14))
                        .foregroundStyle(.white)
                }
                .disabled(saved)
                ShareLink(item: url) {
                    Label("Compartir", systemImage: "square.and.arrow.up")
                        .frame(maxWidth: .infinity).padding(.vertical, 14)
                        .background(.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 14))
                }
            }
            if let error { Text(error).font(.footnote).foregroundStyle(.red) }
            Button("Cerrar") { dismiss() }.padding(.top, 4)
        }
        .padding(28)
        .presentationDetents([.medium])
    }
}
