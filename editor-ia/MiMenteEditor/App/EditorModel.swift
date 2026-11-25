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
    var songs: [String] = MusicLibrary.names()
    let player = AVPlayer()

    var apiKey: String = Keychain.load("anthropic_api_key") ?? "" {
        didSet { Keychain.save(apiKey, for: "anthropic_api_key") }
    }
    var falKey: String = Keychain.load("fal_api_key") ?? "" {
        didSet { Keychain.save(falKey, for: "fal_api_key") }
    }
    var imageToVideoModel: String = UserDefaults.standard.string(forKey: "i2v_model") ?? FalClient.defaultImageToVideo {
        didSet { UserDefaults.standard.set(imageToVideoModel, forKey: "i2v_model") }
    }
    var textToVideoModel: String = UserDefaults.standard.string(forKey: "t2v_model") ?? FalClient.defaultTextToVideo {
        didSet { UserDefaults.standard.set(textToVideoModel, forKey: "t2v_model") }
    }
    var imageEditModel: String = UserDefaults.standard.string(forKey: "img_edit_model") ?? FalClient.defaultImageEdit {
        didSet { UserDefaults.standard.set(imageEditModel, forKey: "img_edit_model") }
    }

    // Estado interno
    private var source: SourceMedia?
    private var context: MediaContext?
    private var requestHistory: [String] = []
    private var undoStack: [EditPlan] = []
    private var built: BuiltEdit?
    private var sceneCache: [String: URL] = [:]
    private var failedAIKeys = Set<String>()
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
        if request.range(of: #"https?://|www\.|tiktok\.com|instagram\.com|youtu"#, options: .regularExpression) != nil {
            messages.append(ChatMessage(role: .ai, text: "No puedo abrir links de TikTok, Instagram o YouTube (esas apps no lo permiten). Guarda ese video en tu galería (o grábalo con la grabación de pantalla) y toca el botón de película (a la izquierda del chat): lo analizo y edito el tuyo con el mismo estilo."))
            return
        }
        do {
            try await runDirector(request: request)
        } catch {
            messages.append(ChatMessage(role: .error, text: error.localizedDescription))
        }
        status = nil
    }

    /// Copia el estilo de un video de referencia y re-edita el tuyo igual.
    func useReference(_ url: URL) async {
        guard !isBusy, context != nil else { return }
        let key = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else {
            messages.append(ChatMessage(role: .error, text: "Falta tu API key de Anthropic (Ajustes)."))
            return
        }
        messages.append(ChatMessage(role: .user, text: "🎞️ Edítalo como este video de referencia"))
        do {
            status = "Estudiando el video de referencia…"
            let style = try await ReferenceAnalyzer.analyze(url, client: ClaudeClient(apiKey: key))
            context?.reference = style
            messages.append(ChatMessage(role: .ai, text: "Esto es lo que vi en la referencia:\n\(style)"))
            try await runDirector(request: "Re-edit my video so it matches the REFERENCE STYLE in the context as closely as possible (pacing, cuts, color, typography, captions, transitions, effects, format), while keeping my own content and story.")
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

    func importSong(_ url: URL) -> String? {
        do {
            let name = try MusicLibrary.importSong(from: url)
            songs = MusicLibrary.names()
            return name
        } catch {
            messages.append(ChatMessage(role: .error, text: "No pude importar la canción: \(error.localizedDescription)"))
            return nil
        }
    }

    // MARK: - Internos

    private func runDirector(request: String?) async throws {
        context?.aiVideoAvailable = !falKey.trimmingCharacters(in: .whitespaces).isEmpty
        guard let context else { return }
        let key = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else {
            throw ClaudeError(message: "Falta tu API key de Anthropic. Ponla en Ajustes (el engranaje).")
        }
        let director = makeDirector(key: key)
        let response: DirectorResponse
        let started = Date()
        if let request, let plan {
            status = "🧭 El productor está repartiendo el trabajo…"
            response = try await director.revise(plan: plan, request: request, history: requestHistory, context: context)
            requestHistory.append(request)
        } else {
            status = "🎬 El equipo está editando tu video…"
            response = try await director.createPlan(context: context)
        }
        status = "Renderizando…"
        if let current = plan { undoStack.append(current) }
        try await apply(response.plan, autoplay: true)
        messages.append(ChatMessage(role: .ai, text: "✅ Listo en \(Int(Date().timeIntervalSince(started))) s."))
    }

    /// El equipo de agentes, avisando a la pantalla qué hace cada experto.
    private func makeDirector(key: String) -> EditDirector {
        var director = EditDirector(client: ClaudeClient(apiKey: key))
        director.onAgent = { [weak self] name, reply in
            Task { @MainActor in
                guard let self else { return }
                if let reply {
                    self.messages.append(ChatMessage(role: .ai, text: "\(name): \(reply)"))
                } else {
                    self.status = "\(name) trabajando…"
                }
            }
        }
        return director
    }

    /// "Haz un video de un hombre saltando sobre un carro": video 100% hecho con IA.
    func createFromIdea(_ idea: String, format: VideoFormat) async {
        let key = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        let fal = falKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !idea.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        reset()
        guard !key.isEmpty, !fal.isEmpty else {
            messages.append(ChatMessage(role: .error, text: "Para crear videos con IA necesitas tu API key de Anthropic y tu key de fal.ai (Ajustes)."))
            return
        }
        messages.append(ChatMessage(role: .user, text: idea))
        do {
            // Lienzo vacío: el video se arma solo con tomas generadas.
            status = "Preparando el proyecto…"
            let size: CGSize = format == .horizontal ? CGSize(width: 1920, height: 1080)
                : format == .square ? CGSize(width: 1080, height: 1080) : CGSize(width: 1080, height: 1920)
            var blank = Segment.clip(0, 0)
            blank.kind = .scene; blank.sceneDuration = 1; blank.sceneStyle = .dark
            let blankURL = FileManager.default.temporaryDirectory.appendingPathComponent("blank-\(UUID().uuidString).mp4")
            try await SceneRenderer.render(segment: blank, size: size, background: nil, to: blankURL)
            let media = try await SourceMedia.load(blankURL)
            source = media
            context = MediaContext(duration: media.duration, width: Int(size.width), height: Int(size.height),
                                   frames: [], transcript: [], aiVideoAvailable: true)

            status = "🎥 El Director IA está planeando las tomas…"
            let director = makeDirector(key: key)
            let shots = try await director.planShots(idea: idea, format: format.rawValue)
            messages.append(ChatMessage(role: .ai, text: "🎥 Director IA: \(shots.reply)\n" + shots.shots.enumerated().map { "\($0.offset + 1). \($0.element.prompt)" }.joined(separator: "\n")))

            var p = EditPlan.passthrough(duration: media.duration)
            p.title = shots.title
            p.format = VideoFormat(rawValue: shots.format) ?? format
            p.segments = shots.shots.enumerated().map { i, shot in
                var s = Segment.clip(0, 0)
                s.kind = .ai
                s.aiPrompt = shot.prompt
                s.aiCamera = shot.camera
                s.aiUseFrame = false
                s.sceneDuration = shot.seconds > 7.5 ? 10 : 5
                s.transitionIn = Transition(type: i == 0 ? .none : .crossfade, duration: i == 0 ? 0 : 0.3)
                return s
            }
            p = p.sanitized(sourceDuration: media.duration)
            try await apply(p, autoplay: false)

            // Que el equipo "vea" las tomas generadas para terminar el video.
            context?.frames = await generatedFrames(p)
            if let ctx = context {
                let polished = await director.polish(
                    plan: p,
                    brief: "This video was generated with AI from the idea: \"\(idea)\". Do your department so it looks like a viral, cinematic social video (no speech: captions off; music only if a song is imported).",
                    context: ctx)
                undoStack.append(p)
                try await apply(polished.plan, autoplay: true)
            }
            messages.append(ChatMessage(role: .ai, text: "✅ Tu video con IA está listo. Pide más tomas, otro estilo o expórtalo."))
        } catch {
            messages.append(ChatMessage(role: .error, text: error.localizedDescription))
        }
        status = nil
    }

    private func generatedFrames(_ plan: EditPlan) async -> [(time: Double, jpeg: Data)] {
        var frames: [(time: Double, jpeg: Data)] = []
        for seg in plan.segments where seg.kind == .ai {
            guard let url = sceneCache[Self.aiKey(seg)] else { continue }
            let gen = AVAssetImageGenerator(asset: AVURLAsset(url: url))
            gen.appliesPreferredTrackTransform = true
            gen.maximumSize = CGSize(width: 512, height: 512)
            if let img = try? await gen.image(at: CMTime(seconds: 1.5, preferredTimescale: 600)).image,
               let jpeg = UIImage(cgImage: img).jpegData(compressionQuality: 0.6) {
                frames.append((Double(frames.count), jpeg))
            }
        }
        return frames
    }

    static func aiKey(_ seg: Segment) -> String {
        "ai|\(seg.aiPrompt)|\(seg.aiCamera.rawValue)|\(seg.aiUseFrame)|\(seg.aiUseFrame ? String(format: "%.2f", seg.sourceStart) : "")|\(seg.sceneDuration)"
    }

    private func apply(_ newPlan: EditPlan, autoplay: Bool) async throws {
        guard let source else { return }
        let sceneURLs = try await prepareScenes(newPlan, source: source)
        var voiceURL: URL?
        if newPlan.audio.needsProcessing {
            status = "Procesando el audio en el estudio…"
            voiceURL = try? await AudioStudio.process(source, settings: newPlan.audio)
        }
        let edit = try await CompositionBuilder.build(plan: newPlan, source: source, sceneURLs: sceneURLs,
                                                      transcript: context?.transcript ?? [],
                                                      voiceURL: voiceURL,
                                                      musicURL: MusicLibrary.url(for: newPlan.audio.music))
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

    /// Genera a la vez todas las escenas con IA que falten (en vez de una por una).
    private func generateAIScenesInParallel(_ plan: EditPlan, source: SourceMedia) async {
        let fal = falKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !fal.isEmpty else { return }
        var todo: [(String, Segment, CGImage?)] = []
        var seen = Set<String>()
        for seg in plan.segments where seg.kind == .ai {
            let key = Self.aiKey(seg)
            guard sceneCache[key] == nil, !seen.contains(key) else { continue }
            seen.insert(key)
            var frame: CGImage?
            if seg.aiUseFrame { frame = await source.frame(at: seg.sourceStart, maxSize: CGSize(width: 1280, height: 1280)) }
            todo.append((key, seg, frame))
        }
        guard !todo.isEmpty else { return }
        status = "🤖 Generando \(todo.count) escena(s) con IA a la vez…"
        let client = FalClient(key: fal)
        let i2v = imageToVideoModel, t2v = textToVideoModel
        let results = await withTaskGroup(of: (String, URL?, String?).self) { group -> [(String, URL?, String?)] in
            for (key, seg, frame) in todo {
                group.addTask {
                    do {
                        let url = try await client.generateScene(prompt: seg.aiPrompt, camera: seg.aiCamera, startFrame: frame,
                                                                 seconds: seg.sceneDuration, imageToVideoModel: i2v,
                                                                 textToVideoModel: t2v) { _ in }
                        return (key, url, nil)
                    } catch {
                        return (key, nil, error.localizedDescription)
                    }
                }
            }
            var all: [(String, URL?, String?)] = []
            for await r in group {
                all.append(r)
                let done = all.count
                await MainActor.run { self.status = "🤖 Escenas con IA: \(done) de \(todo.count) listas…" }
            }
            return all
        }
        for (key, url, err) in results {
            if let url { sceneCache[key] = url }
            if let err {
                failedAIKeys.insert(key)
                messages.append(ChatMessage(role: .error, text: "🤖 Escena IA: \(err)"))
            }
        }
    }

    /// Genera (o reutiliza) los clips de las escenas: gráficos locales y video con IA (fal.ai).
    private func prepareScenes(_ plan: EditPlan, source: SourceMedia) async throws -> [Int: URL] {
        var urls: [Int: URL] = [:]
        let size = CompositionBuilder.renderSize(for: plan.format, source: source)
        var warnedNoKey = false
        await generateAIScenesInParallel(plan, source: source)
        for (i, seg) in plan.segments.enumerated() where seg.kind != .clip {
            // La clave ignora transición y color: cambiar eso no vuelve a generar (ni a cobrar) la escena.
            let key: String
            if seg.kind == .ai {
                key = Self.aiKey(seg)
            } else {
                key = "scene|\(seg.sceneTitle)|\(seg.sceneSubtitle)|\(seg.sceneStyle.rawValue)|\(seg.sceneColors)|\(seg.sceneDuration)|\(seg.sourceStart)|\(Int(size.width))x\(Int(size.height))"
            }
            if let cached = sceneCache[key], FileManager.default.fileExists(atPath: cached.path) {
                urls[i] = cached
                continue
            }

            if seg.kind == .ai {
                let falKey = self.falKey.trimmingCharacters(in: .whitespacesAndNewlines)
                if !falKey.isEmpty && failedAIKeys.contains(key) == false {
                    status = "Preparando escena con IA…"
                    var frame: CGImage?
                    if seg.aiUseFrame { frame = await source.frame(at: seg.sourceStart, maxSize: CGSize(width: 1280, height: 1280)) }
                    do {
                        let url = try await FalClient(key: falKey).generateScene(
                            prompt: seg.aiPrompt, camera: seg.aiCamera, startFrame: frame, seconds: seg.sceneDuration,
                            imageToVideoModel: imageToVideoModel, textToVideoModel: textToVideoModel
                        ) { [weak self] text in Task { @MainActor in self?.status = text } }
                        sceneCache[key] = url
                        urls[i] = url
                        continue
                    } catch {
                        messages.append(ChatMessage(role: .error, text: "Escena IA: \(error.localizedDescription) Puse una escena animada en su lugar."))
                    }
                } else if falKey.isEmpty && !warnedNoKey {
                    warnedNoKey = true
                    messages.append(ChatMessage(role: .error, text: "Para escenas con IA real (otro ángulo de cámara, escenas nuevas) pon tu key de fal.ai en Ajustes. Mientras, puse una escena animada."))
                }
                // Respaldo: escena animada local con un cuadro del video.
                var fallback = seg
                fallback.kind = .scene
                fallback.sceneStyle = .photoKenBurns
                fallback.sceneTitle = ""
                fallback.sceneSubtitle = ""
                let background = await source.frame(at: seg.sourceStart, maxSize: size)
                let url = FileManager.default.temporaryDirectory.appendingPathComponent("scene-\(UUID().uuidString).mp4")
                try await SceneRenderer.render(segment: fallback, size: size, background: background, to: url)
                urls[i] = url
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
