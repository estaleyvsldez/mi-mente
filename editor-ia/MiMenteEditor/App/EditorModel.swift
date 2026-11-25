import AVFoundation
import Observation
import SwiftUI

struct ChatMessage: Identifiable, Equatable {
    enum Role { case user, ai, error }
    let id = UUID()
    let role: Role
    let text: String
}

@MainActor
@Observable
final class EditorModel {
    // Estado visible
    var status: String?          // "La IA está editando…" mientras trabaja
    var messages: [ChatMessage] = []
    var plan: EditPlan?
    var canUndo: Bool { !undoStack.isEmpty }
    var exportProgress: Double?
    var exportedURL: URL?
    var hasVideo: Bool { source != nil }
    var aspectRatio: CGFloat {
        guard let s = built?.renderSize ?? source?.renderSize, s.height > 0 else { return 9 / 16 }
        return s.width / s.height
    }
    var sourceDuration: Double { source?.duration ?? 0 }
    var transcript: [CaptionLine] { context?.transcript ?? [] }
    var importedLUTs: [String] = ColorLUT.importedLUTNames()
    let player = AVPlayer()

    var apiKey: String = Keychain.load("anthropic_api_key") ?? "" {
        didSet { Keychain.save(apiKey, for: "anthropic_api_key") }
    }

    // Estado interno
    private var source: SourceMedia?
    private var context: MediaContext?
    private var requestHistory: [String] = []
    private var undoStack: [EditPlan] = []
    private var built: BuiltEdit?
    private var sceneCache: [String: URL] = [:]
    private var loopObserver: NSObjectProtocol?

    var isBusy: Bool { status != nil }

    // MARK: - Flujo principal

    func load(videoURL: URL) async {
        reset()
        do {
            status = "Leyendo tu video…"
            let media = try await SourceMedia.load(videoURL)
            source = media
            // Mostrar el original mientras la IA trabaja.
            try await apply(EditPlan.passthrough(duration: media.duration), autoplay: false)

            status = "Mirando las escenas…"
            let frames = await FrameSampler.sample(media)
            status = "Escuchando lo que se dice…"
            let transcript = await Transcriber.transcribe(media)
            context = MediaContext(duration: media.duration,
                                   width: Int(media.displaySize.width), height: Int(media.displaySize.height),
                                   frames: frames, transcript: transcript)
            try await runDirector(request: nil)
        } catch {
            messages.append(ChatMessage(role: .error, text: error.localizedDescription))
        }
        status = nil
    }

    /// El usuario escribe lo que quiere cambiar.
    func send(_ text: String) async {
        let request = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !request.isEmpty, !isBusy else { return }
        messages.append(ChatMessage(role: .user, text: request))
        do {
            try await runDirector(request: request)
        } catch {
            messages.append(ChatMessage(role: .error, text: error.localizedDescription))
        }
        status = nil
    }

    func undo() async {
        guard let previous = undoStack.popLast() else { return }
        status = "Deshaciendo…"
        do {
            try await apply(previous, autoplay: true)
            if !requestHistory.isEmpty { requestHistory.removeLast() }
            messages.append(ChatMessage(role: .ai, text: "Listo, volví a la versión anterior."))
        } catch {
            messages.append(ChatMessage(role: .error, text: error.localizedDescription))
        }
        status = nil
    }

    func export() async {
        guard let built, !isBusy else { return }
        status = "Exportando tu video…"
        exportProgress = 0
        player.pause()
        do {
            exportedURL = try await Exporter.export(built) { [weak self] p in
                Task { @MainActor in self?.exportProgress = p }
            }
        } catch {
            messages.append(ChatMessage(role: .error, text: error.localizedDescription))
        }
        exportProgress = nil
        status = nil
    }

    func reset() {
        player.replaceCurrentItem(with: nil)
        source = nil; context = nil; plan = nil; built = nil
        messages = []; requestHistory = []; undoStack = []
        exportedURL = nil
    }

    /// Cambios hechos a mano desde el editor profesional.
    func applyManual(_ edited: EditPlan) async {
        guard let source, let current = plan, edited != current else { return }
        let clean = edited.sanitized(sourceDuration: source.duration)
        status = "Renderizando…"
        do {
            undoStack.append(current)
            try await apply(clean, autoplay: true)
            requestHistory.append("(manual edit in the pro editor)")
        } catch {
            messages.append(ChatMessage(role: .error, text: error.localizedDescription))
        }
        status = nil
    }

    func importLUT(_ url: URL) -> String? {
        do {
            let name = try ColorLUT.importLUT(from: url)
            importedLUTs = ColorLUT.importedLUTNames()
            return name
        } catch {
            messages.append(ChatMessage(role: .error, text: error.localizedDescription))
            return nil
        }
    }

    // MARK: - Internos

    private func runDirector(request: String?) async throws {
        guard let context else { return }
        let key = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else {
            throw ClaudeError(message: "Falta tu API key de Anthropic. Ponla en Ajustes (el engranaje).")
        }
        let director = EditDirector(client: ClaudeClient(apiKey: key))
        let response: DirectorResponse
        if let request, let plan {
            status = "Aplicando tu cambio…"
            response = try await director.revise(plan: plan, request: request, history: requestHistory, context: context)
            requestHistory.append(request)
        } else {
            status = "La IA está editando tu video…"
            response = try await director.createPlan(context: context)
        }
        status = "Renderizando…"
        if let current = plan { undoStack.append(current) }
        try await apply(response.plan, autoplay: true)
        messages.append(ChatMessage(role: .ai, text: response.reply))
    }

    private func apply(_ newPlan: EditPlan, autoplay: Bool) async throws {
        guard let source else { return }
        let sceneURLs = try await prepareScenes(newPlan, source: source)
        let edit = try await CompositionBuilder.build(plan: newPlan, source: source, sceneURLs: sceneURLs,
                                                      transcript: context?.transcript ?? [])
        built = edit
        plan = newPlan

        let item = AVPlayerItem(asset: edit.composition)
        item.videoComposition = edit.videoComposition
        item.audioMix = edit.audioMix
        item.audioTimePitchAlgorithm = .spectral
        player.replaceCurrentItem(with: item)

        if let loopObserver { NotificationCenter.default.removeObserver(loopObserver) }
        loopObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime, object: item, queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.player.seek(to: .zero)
                self?.player.play()
            }
        }
        if autoplay { player.play() }
    }

    /// Genera (o reutiliza) los clips de las escenas creadas por la IA.
    private func prepareScenes(_ plan: EditPlan, source: SourceMedia) async throws -> [Int: URL] {
        var urls: [Int: URL] = [:]
        let size = CompositionBuilder.renderSize(for: plan.format, source: source)
        for (i, seg) in plan.segments.enumerated() where seg.kind == .scene {
            let data = (try? JSONEncoder.sorted.encode(seg)) ?? Data()
            let key = "\(data.hashValue)-\(Int(size.width))x\(Int(size.height))"
            if let cached = sceneCache[key], FileManager.default.fileExists(atPath: cached.path) {
                urls[i] = cached
                continue
            }
            status = "Creando escena: \(seg.sceneTitle.isEmpty ? "nueva" : seg.sceneTitle)…"
            var background: CGImage?
            if seg.sceneStyle == .photoKenBurns {
                background = await source.frame(at: seg.sourceStart, maxSize: size)
            }
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("scene-\(UUID().uuidString).mp4")
            try await SceneRenderer.render(segment: seg, size: size, background: background, to: url)
            sceneCache[key] = url
            urls[i] = url
        }
        return urls
    }
}
