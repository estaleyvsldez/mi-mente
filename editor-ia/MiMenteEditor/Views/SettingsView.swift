import SwiftUI

struct SettingsView: View {
    @Environment(EditorModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var key = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    SecureField("sk-ant-…", text: $key)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } header: {
                    Text("API key de Anthropic")
                } footer: {
                    Text("La IA que edita tus videos es Claude. Crea tu key en console.anthropic.com → API Keys. Se guarda solo en el llavero de este iPhone.")
                }
                Section("Cómo funciona") {
                    Label("La IA mira cuadros de tu video y escucha el audio", systemImage: "eye")
                    Label("Decide cortes, colores, textos, transiciones y escenas", systemImage: "wand.and.stars")
                    Label("Tu iPhone renderiza el video final", systemImage: "iphone")
                    Label("Escribe cualquier cambio y la IA lo rehace", systemImage: "text.bubble")
                }
            }
            .navigationTitle("Ajustes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Guardar") {
                        model.apiKey = key.trimmingCharacters(in: .whitespacesAndNewlines)
                        dismiss()
                    }
                }
                ToolbarItem(placement: .cancellationAction) { Button("Cancelar") { dismiss() } }
            }
            .onAppear { key = model.apiKey }
        }
    }
}
