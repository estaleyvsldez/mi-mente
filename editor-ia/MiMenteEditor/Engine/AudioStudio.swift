import Accelerate
import AVFoundation

/// Estudio de audio en el iPhone: cancelador de ruido, EQ, compresor, de-esser, efectos de voz,
/// reverb, cambio de tono y volumen parejo. Procesa la voz del video y devuelve un archivo nuevo
/// alineado con el original (misma duración).
enum AudioStudio {
    static let sampleRate: Double = 44_100

    static func process(_ media: SourceMedia, settings a: AudioSettings) async throws -> URL? {
        guard media.audioTrack != nil, a.needsProcessing else { return nil }
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("voice-\(abs(a.processingKey.hashValue)).caf")
        if FileManager.default.fileExists(atPath: url.path) { return url }

        var samples = try await readMono(media.asset)
        guard !samples.isEmpty else { return nil }

        // 1. Cancelador de ruido (spectral gating).
        if a.noiseReduction > 0.01 {
            samples = NoiseReducer.reduce(samples, amount: a.noiseReduction)
        }
        // 2. Cadena de estudio (EQ, compresor, efectos, reverb, tono).
        samples = try renderChain(samples, settings: a)
        // 3. Volumen parejo + limitador.
        if a.normalize || a.compression > 0.01 || a.voicePreset != .none {
            samples = normalize(samples, enabled: a.normalize)
        }
        try write(samples, to: url)
        return url
    }

    // MARK: - Lectura / escritura

    private static func readMono(_ asset: AVAsset) async throws -> [Float] {
        guard let track = try await asset.loadTracks(withMediaType: .audio).first else { return [] }
        let reader = try AVAssetReader(asset: asset)
        let output = AVAssetReaderTrackOutput(track: track, outputSettings: [
            AVFormatIDKey: kAudioFormatLinearPCM,
            AVSampleRateKey: sampleRate,
            AVNumberOfChannelsKey: 1,
            AVLinearPCMBitDepthKey: 32,
            AVLinearPCMIsFloatKey: true,
            AVLinearPCMIsNonInterleaved: false,
            AVLinearPCMIsBigEndianKey: false,
        ])
        reader.add(output)
        guard reader.startReading() else { throw reader.error ?? ClaudeError(message: "No pude leer el audio.") }
        var samples: [Float] = []
        while let buffer = output.copyNextSampleBuffer(), let block = CMSampleBufferGetDataBuffer(buffer) {
            let length = CMBlockBufferGetDataLength(block)
            var chunk = [Float](repeating: 0, count: length / MemoryLayout<Float>.size)
            chunk.withUnsafeMutableBytes { raw in
                _ = CMBlockBufferCopyDataBytes(block, atOffset: 0, dataLength: length, destination: raw.baseAddress!)
            }
            samples.append(contentsOf: chunk)
        }
        return samples
    }

    private static func write(_ samples: [Float], to url: URL) throws {
        guard let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1),
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(samples.count))
        else { throw ClaudeError(message: "No pude guardar el audio.") }
        buffer.frameLength = AVAudioFrameCount(samples.count)
        samples.withUnsafeBufferPointer { src in
            buffer.floatChannelData![0].update(from: src.baseAddress!, count: samples.count)
        }
        try? FileManager.default.removeItem(at: url)
        let file = try AVAudioFile(forWriting: url, settings: format.settings)
        try file.write(from: buffer)
    }

    // MARK: - Cadena de efectos (AVAudioEngine sin tiempo real)

    private static func renderChain(_ samples: [Float], settings a: AudioSettings) throws -> [Float] {
        guard let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1),
              let input = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(samples.count))
        else { return samples }
        input.frameLength = AVAudioFrameCount(samples.count)
        samples.withUnsafeBufferPointer { input.floatChannelData![0].update(from: $0.baseAddress!, count: samples.count) }

        let engine = AVAudioEngine()
        let player = AVAudioPlayerNode()
        let eq = AVAudioUnitEQ(numberOfBands: 7)
        let pitch = AVAudioUnitTimePitch()
        let distortion = AVAudioUnitDistortion()
        let reverb = AVAudioUnitReverb()
        let compressor = AVAudioUnitEffect(audioComponentDescription: AudioComponentDescription(
            componentType: kAudioUnitType_Effect, componentSubType: kAudioUnitSubType_DynamicsProcessor,
            componentManufacturer: kAudioUnitManufacturer_Apple, componentFlags: 0, componentFlagsMask: 0))

        // Valores del preset + los ajustes manuales encima.
        var low = a.eqLow * 12, mid = a.eqMid * 12, high = a.eqHigh * 12
        var comp = a.compression, deEss = a.deEss
        var hp: Float = 70, lp: Float = 0     // lp 0 = sin filtro paso bajo
        var semitones = a.pitch
        var distPreset: AVAudioUnitDistortionPreset?
        var distMix: Float = 0
        var rev = a.reverb
        var space = a.reverbSpace
        switch a.voicePreset {
        case .none: break
        case .natural: comp = max(comp, 0.3); hp = 80
        case .podcast: comp = max(comp, 0.6); low += 2; mid += 3; deEss = max(deEss, 0.4); hp = 90
        case .radioHost: comp = max(comp, 0.85); low += 4; mid += 4; high += 2; deEss = max(deEss, 0.5); hp = 70
        case .warm: low += 4; high -= 3; comp = max(comp, 0.35)
        case .bright: high += 5; mid += 1; comp = max(comp, 0.35); hp = 110
        case .deep: semitones -= 4; low += 3
        case .chipmunk: semitones += 7
        case .robot: distPreset = .speechGoldenPi; distMix = 70; semitones -= 1
        case .alien: distPreset = .speechAlienChatter; distMix = 80
        case .telephone: hp = 400; lp = 3400; distPreset = .multiDecimated1; distMix = 25; comp = max(comp, 0.6)
        case .megaphone: hp = 600; lp = 4500; distPreset = .multiDistortedSquared; distMix = 35; mid += 6
        case .walkie: hp = 500; lp = 3000; distPreset = .speechRadioTower; distMix = 60; comp = max(comp, 0.8)
        case .cave: rev = max(rev, 0.6); space = .cathedral
        case .stadium: rev = max(rev, 0.5); space = .hall; comp = max(comp, 0.5)
        case .underwater: lp = 700; rev = max(rev, 0.35); space = .plate; semitones -= 1
        }

        let bands = eq.bands
        func band(_ i: Int, _ type: AVAudioUnitEQFilterType, _ freq: Float, _ gain: Double, _ bw: Float = 1, bypass: Bool = false) {
            bands[i].filterType = type
            bands[i].frequency = freq
            bands[i].gain = Float(gain.clamped(-24, 24))
            bands[i].bandwidth = bw
            bands[i].bypass = bypass
        }
        band(0, .highPass, hp, 0)
        band(1, .lowShelf, 150, low)
        band(2, .parametric, 1800, mid, 1.5)
        band(3, .highShelf, 8000, high)
        band(4, .parametric, 6500, -deEss * 9, 0.6, bypass: deEss < 0.01)        // de-esser (suaviza las "s")
        band(5, .lowPass, lp == 0 ? 20000 : lp, 0, bypass: lp == 0)
        band(6, .parametric, 250, comp > 0.5 ? -2 : 0, 1.2, bypass: comp <= 0.5)  // quita "caja" en voces comprimidas

        pitch.pitch = Float(semitones * 100)
        pitch.bypass = abs(semitones) < 0.01
        if let distPreset {
            distortion.loadFactoryPreset(distPreset)
            distortion.wetDryMix = distMix
        } else {
            distortion.bypass = true
        }
        switch space {
        case .room: reverb.loadFactoryPreset(.mediumRoom)
        case .studio: reverb.loadFactoryPreset(.smallRoom)
        case .hall: reverb.loadFactoryPreset(.largeHall)
        case .cathedral: reverb.loadFactoryPreset(.cathedral)
        case .plate: reverb.loadFactoryPreset(.plate)
        }
        reverb.wetDryMix = Float(rev * 60)
        reverb.bypass = rev < 0.01

        if comp > 0.01 {
            let au = compressor.audioUnit
            AudioUnitSetParameter(au, kDynamicsProcessorParam_Threshold, kAudioUnitScope_Global, 0, Float(-10 - comp * 22), 0)
            AudioUnitSetParameter(au, kDynamicsProcessorParam_HeadRoom, kAudioUnitScope_Global, 0, Float(8 - comp * 6), 0)
            AudioUnitSetParameter(au, kDynamicsProcessorParam_AttackTime, kAudioUnitScope_Global, 0, 0.005, 0)
            AudioUnitSetParameter(au, kDynamicsProcessorParam_ReleaseTime, kAudioUnitScope_Global, 0, 0.12, 0)
        } else {
            compressor.bypass = true
        }

        let chain: [AVAudioNode] = [player, eq, compressor, pitch, distortion, reverb]
        chain.forEach { engine.attach($0) }
        for i in 0..<(chain.count - 1) { engine.connect(chain[i], to: chain[i + 1], format: format) }
        engine.connect(reverb, to: engine.mainMixerNode, format: format)

        try engine.enableManualRenderingMode(.offline, format: format, maximumFrameCount: 4096)
        try engine.start()
        player.scheduleBuffer(input, completionHandler: nil)
        player.play()

        guard let out = AVAudioPCMBuffer(pcmFormat: engine.manualRenderingFormat, frameCapacity: 4096) else { return samples }
        var result: [Float] = []
        result.reserveCapacity(samples.count)
        while result.count < samples.count {
            let n = AVAudioFrameCount(min(4096, samples.count - result.count))
            let status = try engine.renderOffline(n, to: out)
            guard status == .success, let data = out.floatChannelData else { break }
            result.append(contentsOf: UnsafeBufferPointer(start: data[0], count: Int(out.frameLength)))
        }
        engine.stop()
        if result.count < samples.count { result.append(contentsOf: [Float](repeating: 0, count: samples.count - result.count)) }
        return result
    }

    // MARK: - Volumen parejo

    /// Lleva la voz a un nivel tipo redes (~ -16 LUFS aprox.) y evita que sature.
    private static func normalize(_ x: [Float], enabled: Bool) -> [Float] {
        var y = x
        if enabled {
            let window = Int(sampleRate * 0.4)
            var levels: [Float] = []
            var i = 0
            while i + window <= x.count {
                var rms: Float = 0
                x.withUnsafeBufferPointer { vDSP_rmsqv($0.baseAddress! + i, 1, &rms, vDSP_Length(window)) }
                levels.append(rms)
                i += window
            }
            levels.sort()
            if let loud = levels.isEmpty ? nil : levels[Int(Double(levels.count - 1) * 0.9)], loud > 0.0005 {
                let gain = min(8, max(0.25, 0.16 / loud))
                y = vDSP.multiply(gain, y)
            }
        }
        // Limitador suave.
        for i in y.indices {
            let v = y[i], m = abs(v)
            if m > 0.89 { y[i] = (v > 0 ? 1 : -1) * (0.89 + 0.1 * tanh((m - 0.89) / 0.1)) }
        }
        return y
    }
}

/// Cancelador de ruido por "spectral gating": aprende el ruido de fondo de las partes más
/// silenciosas y lo resta en cada frecuencia, sin tocar la voz.
enum NoiseReducer {
    static func reduce(_ x: [Float], amount: Double) -> [Float] {
        let n = 2048, hop = 512
        guard x.count > n * 2,
              let forward = vDSP.DFT(count: n, direction: .forward, transformType: .complexComplex, ofType: Float.self),
              let inverse = vDSP.DFT(count: n, direction: .inverse, transformType: .complexComplex, ofType: Float.self)
        else { return x }

        let window = vDSP.window(ofType: Float.self, usingSequence: .hanningDenormalized, count: n, isHalfWindow: false)
        let frames = (x.count - n) / hop + 1
        let bins = n / 2 + 1
        let zeros = [Float](repeating: 0, count: n)

        // Pasada 1: espectros y energía de cada cuadro.
        var mags = [[Float]](repeating: [], count: frames)
        var energy = [Float](repeating: 0, count: frames)
        var re = [Float](repeating: 0, count: n), im = [Float](repeating: 0, count: n)
        for f in 0..<frames {
            let frame = vDSP.multiply(window, x[(f * hop)..<(f * hop + n)])
            forward.transform(inputReal: frame, inputImaginary: zeros, outputReal: &re, outputImaginary: &im)
            var m = [Float](repeating: 0, count: bins)
            for k in 0..<bins { m[k] = sqrt(re[k] * re[k] + im[k] * im[k]) }
            mags[f] = m
            energy[f] = vDSP.sum(m)
        }
        // Perfil de ruido: promedio del 12% de cuadros más silenciosos.
        let quiet = energy.indices.sorted { energy[$0] < energy[$1] }.prefix(max(3, frames * 12 / 100))
        var noise = [Float](repeating: 0, count: bins)
        for f in quiet { noise = vDSP.add(noise, mags[f]) }
        noise = vDSP.multiply(1 / Float(quiet.count), noise)

        // Pasada 2: restar el ruido y reconstruir.
        let over = Float(1.2 + 2.3 * amount)        // sobre-resta
        let floor = Float(max(0.04, 1 - amount))    // cuánto ruido dejar (natural)
        var out = [Float](repeating: 0, count: x.count)
        var norm = [Float](repeating: 0, count: x.count)
        var prevGain = [Float](repeating: 1, count: bins)
        let winSq = vDSP.multiply(window, window)
        var oRe = [Float](repeating: 0, count: n), oIm = [Float](repeating: 0, count: n)
        for f in 0..<frames {
            let frame = vDSP.multiply(window, x[(f * hop)..<(f * hop + n)])
            forward.transform(inputReal: frame, inputImaginary: zeros, outputReal: &re, outputImaginary: &im)
            var gain = [Float](repeating: 1, count: bins)
            for k in 0..<bins {
                let g = 1 - over * noise[k] / max(mags[f][k], 1e-9)
                let target = max(floor, min(1, g))
                // Suavizado en el tiempo para evitar el sonido "metálico".
                gain[k] = target > prevGain[k] ? target : 0.55 * prevGain[k] + 0.45 * target
            }
            prevGain = gain
            for k in 0..<n {
                let gk = k < bins ? gain[k] : gain[n - k]
                re[k] *= gk; im[k] *= gk
            }
            inverse.transform(inputReal: re, inputImaginary: im, outputReal: &oRe, outputImaginary: &oIm)
            let start = f * hop
            for i in 0..<n {
                out[start + i] += oRe[i] / Float(n) * window[i]
                norm[start + i] += winSq[i]
            }
        }
        for i in out.indices { out[i] = norm[i] > 1e-6 ? out[i] / norm[i] : x[i] }
        return out
    }
}
