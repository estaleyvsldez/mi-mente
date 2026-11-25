import SwiftUI

@main
struct MiMenteApp: App {
    @State private var model = EditorModel()
    @State private var photo = PhotoModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .environment(photo)
                .preferredColorScheme(.dark)
                .tint(Color(red: 0.62, green: 0.45, blue: 1.0))
        }
    }
}

struct RootView: View {
    @Environment(EditorModel.self) private var model
    @Environment(PhotoModel.self) private var photo
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            Group {
                if model.hasVideo {
                    EditorView()
                } else if photo.hasPhoto {
                    PhotoEditorView()
                } else {
                    HomeView(showSettings: $showSettings)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if model.hasVideo || photo.hasPhoto {
                        Button { model.reset(); photo.reset() } label: { Image(systemName: "chevron.left") }
                            .disabled(model.isBusy || photo.isBusy)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showSettings = true } label: { Image(systemName: "gearshape") }
                }
            }
        }
        .sheet(isPresented: $showSettings) { SettingsView() }
    }
}
