import Observation
import Photos
import SwiftUI
import UIKit

/// Estado del editor de fotos.
@MainActor
@Observable
final class PhotoModel {
    var status: String?
    var messages: [ChatMessage] = []
    var plan = PhotoPlan.original
    var preview: UIImage?
    var hasPhoto: Bool { base != nil }
    var isBusy: Bool { status != nil }
    var canUndo: Bool { !undoStack.isEmpty }
    var savedMessage: String?

    private var base: CGImage?
    private var undoStack: [(base: CGImage, plan: PhotoPlan)] = []
    private var history: [String] = []
    private var renderTask: Task<Void, Never>?

    func load(_ image: UIImage, keys: EditorModel) async {
        reset()
        guard let cg = image.normalizedCGImage() else { return }
        base = cg
        await rerender()
        await ask(nil, keys: keys)
    }

    func reset() {
        base = nil; preview = nil; plan = .original
        messages = []; undoStack = []; history = []
    }

    func send(_ text: String, keys: EditorModel) async {
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty, !isBusy else { return }
        messages.append(ChatMessage(role: .user, text: t))
        await ask(t, keys: keys)
    }

    /// Al abrir los controles manuales: un solo paso de deshacer para toda la sesión de ajustes.
    func beginManualEdit() {
        guard let base else { return }
        undoStack.append((base, plan))
    }

    /// Cambios en vivo desde los controles (render con pequeña espera).
    func setPlanLive(_ newPlan: PhotoPlan) {
        guard newPlan != plan else { return }
        plan = newPlan
        scheduleRender()
    }

    func undo() async {
        guard let last = undoStack.popLast() else { return }
        base = last.base
        plan = last.plan
        await rerender()
    }

    /// Edición generativa directa (relleno generativo).
    func generative(_ prompt: String, keys: EditorModel) async {
        guard let base, !isBusy else { return }
        let fal = keys.falKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !fal.isEmpty else {
            messages.append(ChatMessage(role: .error, text: "Para relleno generativo pon tu key de fal.ai en Ajustes."))
            return
        }
        status = "La IA está editando la foto…"
        do {
            let url = try await FalClient(key: fal).editImage(base, prompt: prompt, model: keys.imageEditModel) { [weak self] s in
                Task { @MainActor in self?.status = s }
            }
            guard let img = UIImage(contentsOfFile: url.path)?.normalizedCGImage() else {
                throw ClaudeError(message: "No pude abrir la imagen generada.")
            }
            undoStack.append((base, plan))
            self.base = img
            await rerender()
        } catch {
            messages.append(ChatMessage(role: .error, text: error.localizedDescription))
        }
        status = nil
    }

    func save() async {
        guard let base, !isBusy else { return }
        status = "Guardando en alta calidad…"
        let plan = self.plan
        let output = await Task.detached { PhotoRenderer.render(base, plan: plan) }.value
        defer { status = nil }
        guard let output else { return }
        let ui = UIImage(cgImage: output)
        let transparent = plan.background == .remove
        guard let data = transparent ? ui.pngData() : ui.jpegData(compressionQuality: 0.95) else { return }
        do {
            let auth = await PHPhotoLibrary.requestAuthorization(for: .addOnly)
            guard auth == .authorized || auth == .limited else {
                throw ClaudeError(message: "Necesito permiso para guardar en Fotos.")
            }
            try await PHPhotoLibrary.shared().performChanges {
                PHAssetCreationRequest.forAsset().addResource(with: .photo, data: data, options: nil)
            }
            savedMessage = "Guardada en Fotos ✅"
        } catch {
            messages.append(ChatMessage(role: .error, text: error.localizedDescription))
        }
    }

    // MARK: - Internos

    private func ask(_ request: String?, keys: EditorModel) async {
        guard let base else { return }
        let key = keys.apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else {
            messages.append(ChatMessage(role: .error, text: "Falta tu API key de Anthropic (Ajustes)."))
            return
        }
        status = request == nil ? "La IA está retocando tu foto…" : "Aplicando tu cambio…"
        do {
            let small = UIImage(cgImage: base).resized(maxSide: 1280)
            guard let jpeg = small.jpegData(compressionQuality: 0.8) else { status = nil; return }
            let r = try await PhotoDirector(client: ClaudeClient(apiKey: key)).edit(
                image: jpeg, plan: plan, request: request, history: history, width: base.width, height: base.height)
            undoStack.append((base, plan))
            if let request { history.append(request) }
            if !r.generativePrompt.trimmingCharacters(in: .whitespaces).isEmpty {
                status = nil
                await generative(r.generativePrompt, keys: keys)
                status = "Aplicando…"
            }
            plan = r.plan
            await rerender()
            messages.append(ChatMessage(role: .ai, text: r.reply))
        } catch {
            messages.append(ChatMessage(role: .error, text: error.localizedDescription))
        }
        status = nil
    }

    private func scheduleRender() {
        renderTask?.cancel()
        renderTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 150_000_000)
            guard !Task.isCancelled else { return }
            await self?.rerender()
        }
    }

    private func rerender() async {
        guard let base else { return }
        let plan = self.plan
        let img = await Task.detached { PhotoRenderer.render(base, plan: plan, maxSide: 1600) }.value
        if let img { preview = UIImage(cgImage: img) }
    }
}

extension UIImage {
    /// CGImage con la orientación ya aplicada (las fotos del iPhone vienen rotadas).
    func normalizedCGImage() -> CGImage? {
        if imageOrientation == .up, let cg = cgImage { return cg }
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: size, format: format).image { _ in draw(in: CGRect(origin: .zero, size: size)) }.cgImage
    }

    func resized(maxSide: CGFloat) -> UIImage {
        let s = min(1, maxSide / max(size.width, size.height))
        guard s < 1 else { return self }
        let newSize = CGSize(width: size.width * s, height: size.height * s)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: newSize, format: format).image { _ in draw(in: CGRect(origin: .zero, size: newSize)) }
    }
}
