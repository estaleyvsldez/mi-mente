import PhotosUI
import SwiftUI
import UniformTypeIdentifiers

/// Video elegido de Fotos, copiado a una carpeta temporal de la app.
struct PickedMovie: Transferable {
    let url: URL

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(contentType: .movie) { movie in
            SentTransferredFile(movie.url)
        } importing: { received in
            let ext = received.file.pathExtension.isEmpty ? "mov" : received.file.pathExtension
            let dst = FileManager.default.temporaryDirectory.appendingPathComponent("source-\(UUID().uuidString).\(ext)")
            try FileManager.default.copyItem(at: received.file, to: dst)
            return PickedMovie(url: dst)
        }
    }
}

struct HomeView: View {
    @Environment(EditorModel.self) private var model
    @Environment(PhotoModel.self) private var photo
    @Binding var showSettings: Bool
    @State private var item: PhotosPickerItem?
    @State private var photoItem: PhotosPickerItem?
    @State private var idea = ""
    @State private var ideaFormat = VideoFormat.vertical
    @State private var loading = false
    @State private var errorText: String?

    var body: some View {
        ScrollView {
        VStack(spacing: 24) {
            Spacer(minLength: 24)
            Image(systemName: "wand.and.stars")
                .font(.system(size: 64, weight: .semibold))
                .foregroundStyle(.linearGradient(colors: [.purple, .pink, .orange], startPoint: .topLeading, endPoint: .bottomTrailing))
            VStack(spacing: 10) {
                Text("Mi Mente").font(.largeTitle.bold())
                Text("Sube un video o una foto y la IA la edita sola como un profesional: color, texto, efectos, audio de estudio y escenas con IA. Si algo no te gusta, solo escríbelo.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 24)
            }

            PhotosPicker(selection: $item, matching: .videos, photoLibrary: .shared()) {
                Label(loading ? "Cargando…" : "Elegir video", systemImage: "video.badge.plus")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(.tint, in: RoundedRectangle(cornerRadius: 16))
                    .foregroundStyle(.white)
            }
            .disabled(loading)
            .padding(.horizontal, 32)

            PhotosPicker(selection: $photoItem, matching: .images, photoLibrary: .shared()) {
                Label("Editar una foto", systemImage: "photo.badge.plus")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 16))
            }
            .disabled(loading)
            .padding(.horizontal, 32)

            VStack(alignment: .leading, spacing: 10) {
                Text("CREAR CON IA").font(.caption.weight(.bold)).foregroundStyle(.tint)
                TextField("Ej: un hombre saltando por encima de un carro de noche, cámara lenta", text: $idea, axis: .vertical)
                    .lineLimit(2...4)
                    .padding(12)
                    .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
                Picker("Formato", selection: $ideaFormat) {
                    Text("9:16").tag(VideoFormat.vertical)
                    Text("16:9").tag(VideoFormat.horizontal)
                    Text("1:1").tag(VideoFormat.square)
                }
                .pickerStyle(.segmented)
                Button {
                    let text = idea
                    Task { await model.createFromIdea(text, format: ideaFormat) }
                } label: {
                    Label("Crear video con IA", systemImage: "sparkles.tv")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 14))
                }
                .disabled(idea.trimmingCharacters(in: .whitespaces).isEmpty || loading)
            }
            .padding(.horizontal, 32)

            if model.apiKey.isEmpty {
                Button("Primero pon tu API key de Anthropic") { showSettings = true }
                    .font(.footnote)
            }
            if let errorText {
                Text(errorText).font(.footnote).foregroundStyle(.red).padding(.horizontal)
            }
            Spacer(minLength: 24)
        }
        }
        .onChange(of: photoItem) { _, newItem in
            guard let newItem else { return }
            loading = true
            Task {
                if let data = try? await newItem.loadTransferable(type: Data.self), let image = UIImage(data: data) {
                    await photo.load(image, keys: model)
                } else {
                    errorText = "No pude abrir esa foto."
                }
                loading = false
                photoItem = nil
            }
        }
        .onChange(of: item) { _, newItem in
            guard let newItem else { return }
            loading = true
            errorText = nil
            Task {
                do {
                    if let movie = try await newItem.loadTransferable(type: PickedMovie.self) {
                        await model.load(videoURL: movie.url)
                    } else {
                        errorText = "No pude abrir ese video."
                    }
                } catch {
                    errorText = "No pude abrir ese video: \(error.localizedDescription)"
                }
                loading = false
                item = nil
            }
        }
    }
}
