import Foundation

/// Canciones importadas por el usuario (Documentos/Música).
enum MusicLibrary {
    static var directory: URL {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("Musica")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    static func names() -> [String] {
        let files = (try? FileManager.default.contentsOfDirectory(atPath: directory.path)) ?? []
        return files.filter { !$0.hasPrefix(".") }.sorted()
    }

    static func url(for name: String) -> URL? {
        guard !name.isEmpty else { return nil }
        let url = directory.appendingPathComponent(name)
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }

    static func importSong(from url: URL) throws -> String {
        let access = url.startAccessingSecurityScopedResource()
        defer { if access { url.stopAccessingSecurityScopedResource() } }
        let name = url.lastPathComponent
        let dst = directory.appendingPathComponent(name)
        try? FileManager.default.removeItem(at: dst)
        try FileManager.default.copyItem(at: url, to: dst)
        return name
    }
}
