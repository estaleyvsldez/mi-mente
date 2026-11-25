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
    @Binding var showSettings: Bool
    @State private var item: PhotosPickerItem?
    @State private var loading = false
    @State private var errorText: String?

    var body: some View {
        VStack(spacing: 28) {
            Spacer()
            Image(systemName: "wand.and.stars")
                .font(.system(size: 64, weight: .semibold))
                .foregroundStyle(.linearGradient(colors: [.purple, .pink, .orange], startPoint: .topLeading, endPoint: .bottomTrailing))
            VStack(spacing: 10) {
                Text("Mi Mente").font(.largeTitle.bold())
                Text("Sube un video y la IA lo edita sola: cortes, colores, textos, transiciones, subtítulos y escenas nuevas. Si algo no te gusta, solo escríbelo.")
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

            if model.apiKey.isEmpty {
                Button("Primero pon tu API key de Anthropic") { showSettings = true }
                    .font(.footnote)
            }
            if let errorText {
                Text(errorText).font(.footnote).foregroundStyle(.red).padding(.horizontal)
            }
            Spacer()
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
