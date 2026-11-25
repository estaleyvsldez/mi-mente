import SwiftUI

struct SettingsView: View {
    @Environment(EditorModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var key = ""
    @State private var fal = ""
    @State private var i2v = ""
    @State private var t2v = ""
    @State private var imgEdit = ""

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
                Section {
                    SecureField("Key de fal.ai", text: $fal)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    DisclosureGroup("Modelos (avanzado)") {
                        TextField("Imagen → video", text: $i2v).font(.footnote.monospaced())
                        TextField("Texto → video", text: $t2v).font(.footnote.monospaced())
                        TextField("Edición de foto", text: $imgEdit).font(.footnote.monospaced())
                        Button("Restablecer modelos") {
                            i2v = FalClient.defaultImageToVideo
                            t2v = FalClient.defaultTextToVideo
                            imgEdit = FalClient.defaultImageEdit
                        }
                    }
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                } header: {
                    Text("Video y fotos con IA (fal.ai)")
                } footer: {
                    Text("Para escenas con IA real, otros ángulos de cámara y relleno generativo en fotos. Crea tu key en fal.ai → Dashboard → Keys. Pagas solo lo que uses (centavos a ~1 USD por escena).")
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
                        model.falKey = fal.trimmingCharacters(in: .whitespacesAndNewlines)
                        if !i2v.isEmpty { model.imageToVideoModel = i2v.trimmingCharacters(in: .whitespaces) }
                        if !t2v.isEmpty { model.textToVideoModel = t2v.trimmingCharacters(in: .whitespaces) }
                        if !imgEdit.isEmpty { model.imageEditModel = imgEdit.trimmingCharacters(in: .whitespaces) }
                        dismiss()
                    }
                }
                ToolbarItem(placement: .cancellationAction) { Button("Cancelar") { dismiss() } }
            }
            .onAppear {
                key = model.apiKey
                fal = model.falKey
                i2v = model.imageToVideoModel
                t2v = model.textToVideoModel
                imgEdit = model.imageEditModel
            }
        }
    }
}
