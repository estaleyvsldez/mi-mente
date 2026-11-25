import AVFoundation
import CoreImage

/// Resultado listo para reproducir o exportar.
struct BuiltEdit {
    let composition: AVComposition
    let videoComposition: AVVideoComposition
    let audioMix: AVAudioMix
    let duration: Double
    let renderSize: CGSize
}

/// Convierte un EditPlan en una composición de AVFoundation.
/// Usa dos pistas de video y dos de audio (A/B) para que los segmentos se puedan solapar en las transiciones.
enum CompositionBuilder {
    private struct Placed {
        let index: Int
        let start: CMTime
        let duration: CMTime
        let overlapIn: CMTime
        let lane: Int
        let orientation: CGImagePropertyOrientation
        let hasAudio: Bool
    }

    static func renderSize(for format: VideoFormat, source: SourceMedia) -> CGSize {
        switch format {
        case .original: return source.renderSize
        case .vertical: return CGSize(width: 1080, height: 1920)
        case .portrait: return CGSize(width: 1080, height: 1350)
        case .square: return CGSize(width: 1080, height: 1080)
        case .horizontal: return CGSize(width: 1920, height: 1080)
        case .cinema: return CGSize(width: 1920, height: 804)
        }
    }

    static func build(plan: EditPlan, source: SourceMedia, sceneURLs: [Int: URL],
                      transcript: [CaptionLine], voiceURL: URL? = nil, musicURL: URL? = nil) async throws -> BuiltEdit {
        let ts: CMTimeScale = 600
        let size = renderSize(for: plan.format, source: source)
        let composition = AVMutableComposition()
        guard let v0 = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
              let v1 = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
              let a0 = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid),
              let a1 = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
        else { throw ClaudeError(message: "No pude preparar la edición.") }
        let videoLanes = [v0, v1]
        let audioLanes = [a0, a1]
        var laneEnds = [CMTime.zero, CMTime.zero]

        var placed: [Placed] = []
        var prevEnd = CMTime.zero
        var prevDuration = CMTime.zero
        let sourceOrientation = CGImagePropertyOrientation(transform: source.transform)
        // Voz procesada en el estudio (si hay), alineada con el video original.
        var voiceTrack = source.audioTrack
        if let voiceURL, let t = try? await AVURLAsset(url: voiceURL).loadTracks(withMediaType: .audio).first {
            voiceTrack = t
        }

        for (i, seg) in plan.segments.enumerated() {
            let assetTrack: AVAssetTrack
            let audioTrack: AVAssetTrack?
            let sourceRange: CMTimeRange
            let orientation: CGImagePropertyOrientation
            var pieces: [(source: CMTime, target: CMTime)] = []  // duraciones por tramo (rampas)

            switch seg.kind {
            case .clip:
                assetTrack = source.videoTrack
                audioTrack = voiceTrack
                sourceRange = CMTimeRange(start: CMTime(seconds: seg.sourceStart, preferredTimescale: ts),
                                          end: CMTime(seconds: seg.sourceEnd, preferredTimescale: ts))
                orientation = sourceOrientation
                let ramp = seg.ramp
                if ramp.pieces.count == 1 && ramp.pieces[0].speed == 1 {
                    pieces = [(sourceRange.duration, sourceRange.duration)]
                } else {
                    var used = CMTime.zero
                    for (k, p) in ramp.pieces.enumerated() {
                        let src = k == ramp.pieces.count - 1
                            ? CMTimeSubtract(sourceRange.duration, used)
                            : CMTime(seconds: p.sourceDuration, preferredTimescale: ts)
                        used = CMTimeAdd(used, src)
                        pieces.append((src, CMTime(seconds: src.seconds / p.speed, preferredTimescale: ts)))
                    }
                }
            case .scene:
                guard let url = sceneURLs[i] else { continue }
                let asset = AVURLAsset(url: url)
                guard let track = try await asset.loadTracks(withMediaType: .video).first else { continue }
                let assetDuration = try await asset.load(.duration)
                assetTrack = track
                audioTrack = nil
                sourceRange = CMTimeRange(start: .zero, duration: assetDuration)
                orientation = .up
                pieces = [(assetDuration, CMTime(seconds: seg.sceneDuration, preferredTimescale: ts))]
            }
            let duration = pieces.reduce(CMTime.zero) { CMTimeAdd($0, $1.target) }
            guard duration.seconds > 0.05 else { continue }

            var overlap = CMTime.zero
            if !placed.isEmpty, seg.transitionIn.type != .none {
                let limit = CMTimeMultiplyByFloat64(CMTimeMinimum(prevDuration, duration), multiplier: 0.5)
                overlap = CMTimeMinimum(CMTime(seconds: seg.transitionIn.duration, preferredTimescale: ts), limit)
            }
            let start = placed.isEmpty ? .zero : CMTimeSubtract(prevEnd, overlap)
            let lane = placed.count % 2

            let vTrack = videoLanes[lane]
            let aTrack = audioLanes[lane]
            if start > laneEnds[lane] {
                let gap = CMTimeRange(start: laneEnds[lane], end: start)
                vTrack.insertEmptyTimeRange(gap)
                aTrack.insertEmptyTimeRange(gap)
            }

            func insertScaled(_ track: AVMutableCompositionTrack, from asset: AVAssetTrack) throws {
                try track.insertTimeRange(sourceRange, of: asset, at: start)
                var cursor = start
                for piece in pieces {
                    if piece.source != piece.target {
                        track.scaleTimeRange(CMTimeRange(start: cursor, duration: piece.source), toDuration: piece.target)
                    }
                    cursor = CMTimeAdd(cursor, piece.target)
                }
            }
            try insertScaled(vTrack, from: assetTrack)
            var hasAudio = false
            if let audioTrack {
                try insertScaled(aTrack, from: audioTrack)
                hasAudio = true
            } else {
                aTrack.insertEmptyTimeRange(CMTimeRange(start: start, duration: duration))
            }
            laneEnds[lane] = CMTimeAdd(start, duration)

            placed.append(Placed(index: i, start: start, duration: duration, overlapIn: overlap,
                                 lane: lane, orientation: orientation, hasAudio: hasAudio))
            prevEnd = CMTimeAdd(start, duration)
            prevDuration = duration
        }
        guard !placed.isEmpty else { throw ClaudeError(message: "La edición quedó vacía.") }
        let totalEnd = composition.duration.seconds > 0 ? composition.duration : prevEnd
        let total = totalEnd.seconds

        // Color por segmento, efectos y textos.
        var segmentGrades: [Int: ColorGrade] = [:]
        for p in placed { if let c = plan.segments[p.index].color { segmentGrades[p.index] = c } }

        var segmentEffects: [Int: [ScheduledEffect]] = [:]
        var globalEffects: [ScheduledEffect] = []
        let byIndex = Dictionary(uniqueKeysWithValues: placed.map { ($0.index, $0) })
        for e in plan.effects {
            if e.segmentIndex == -1 {
                let start = e.startOffset
                let end = e.duration > 0 ? start + e.duration : total
                globalEffects.append(ScheduledEffect(effect: e, start: start, end: min(end, total)))
            } else if let p = byIndex[e.segmentIndex] {
                let segEnd = p.start.seconds + p.duration.seconds
                let start = p.start.seconds + e.startOffset
                let end = e.duration > 0 ? min(start + e.duration, segEnd) : segEnd
                if end > start {
                    segmentEffects[e.segmentIndex, default: []].append(ScheduledEffect(effect: e, start: start, end: end))
                }
            }
        }

        let texts = buildTexts(plan: plan, byIndex: byIndex, placed: placed, transcript: transcript,
                               canvas: size, total: total)
        let renderer = FrameRenderer(renderSize: size, grade: plan.color, segmentGrades: segmentGrades,
                                     segmentEffects: segmentEffects, globalEffects: globalEffects, texts: texts)

        // Instrucciones: tramos normales y tramos de transición, sin huecos.
        var instructions: [EditInstruction] = []
        func ref(_ p: Placed) -> LayerRef {
            let seg = plan.segments[p.index]
            let focus = seg.kind == .clip ? CGPoint(x: seg.focusX, y: seg.focusY) : CGPoint(x: 0.5, y: 0.5)
            return LayerRef(trackID: videoLanes[p.lane].trackID, orientation: p.orientation,
                            segmentIndex: p.index, focus: focus)
        }
        for (k, p) in placed.enumerated() {
            let soloStart = CMTimeAdd(p.start, p.overlapIn)
            let soloEnd = k + 1 < placed.count ? placed[k + 1].start : totalEnd
            if soloEnd > soloStart {
                instructions.append(EditInstruction(timeRange: CMTimeRange(start: soloStart, end: soloEnd),
                                                    layers: [ref(p)], transition: nil, renderer: renderer))
            }
            if k + 1 < placed.count, placed[k + 1].overlapIn > .zero {
                let next = placed[k + 1]
                instructions.append(EditInstruction(
                    timeRange: CMTimeRange(start: next.start, duration: next.overlapIn),
                    layers: [ref(p), ref(next)],
                    transition: plan.segments[next.index].transitionIn.type,
                    renderer: renderer))
            }
        }

        let videoComposition = AVMutableVideoComposition()
        videoComposition.customVideoCompositorClass = EditCompositor.self
        videoComposition.renderSize = size
        videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
        videoComposition.instructions = instructions

        var mixParams = makeAudioParams(plan: plan, placed: placed, lanes: audioLanes, total: totalEnd)
        if let musicURL, let music = try await addMusic(musicURL, to: composition, plan: plan, placed: placed,
                                                         transcript: transcript, total: totalEnd) {
            mixParams.append(music)
        }
        let audioMix = AVMutableAudioMix()
        audioMix.inputParameters = mixParams

        return BuiltEdit(composition: composition, videoComposition: videoComposition,
                         audioMix: audioMix, duration: total, renderSize: size)
    }

    // MARK: - Audio

    /// Pone la música de fondo (en bucle si es corta) y la baja sola cuando alguien habla.
    private static func addMusic(_ url: URL, to composition: AVMutableComposition, plan: EditPlan,
                                 placed: [Placed], transcript: [CaptionLine],
                                 total: CMTime) async throws -> AVMutableAudioMixInputParameters? {
        let asset = AVURLAsset(url: url)
        guard let musicTrack = try await asset.loadTracks(withMediaType: .audio).first,
              let lane = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
        else { return nil }
        let songDuration = try await asset.load(.duration)
        guard songDuration.seconds > 0.5 else { return nil }
        let a = plan.audio
        var cursor = CMTime.zero
        var from = CMTime(seconds: min(a.musicStart, max(0, songDuration.seconds - 1)), preferredTimescale: 600)
        while cursor < total {
            let available = CMTimeSubtract(songDuration, from)
            guard available.seconds > 0.1 else { from = .zero; continue }
            let take = CMTimeMinimum(available, CMTimeSubtract(total, cursor))
            try lane.insertTimeRange(CMTimeRange(start: from, duration: take), of: musicTrack, at: cursor)
            cursor = CMTimeAdd(cursor, take)
            from = .zero
        }

        let params = AVMutableAudioMixInputParameters(track: lane)
        let base = Float(a.musicVolume)
        let ducked = Float(a.musicVolume * (1 - a.ducking))
        let ramp = 0.3
        // Zonas con voz en la línea de tiempo final.
        var speech: [(Double, Double)] = []
        if a.ducking > 0.01 {
            for p in placed where plan.segments[p.index].kind == .clip {
                let seg = plan.segments[p.index]
                for line in transcript {
                    let s = max(line.start, seg.sourceStart), e = min(line.end, seg.sourceEnd)
                    guard e > s else { continue }
                    speech.append((p.start.seconds + seg.ramp.timelineOffset(forSource: s),
                                   p.start.seconds + seg.ramp.timelineOffset(forSource: e)))
                }
            }
            speech.sort { $0.0 < $1.0 }
            var merged: [(Double, Double)] = []
            for r in speech {
                if let last = merged.last, r.0 - last.1 < 0.8 { merged[merged.count - 1].1 = max(last.1, r.1) }
                else { merged.append(r) }
            }
            speech = merged
        }
        func t(_ s: Double) -> CMTime { CMTime(seconds: max(0, s), preferredTimescale: 600) }
        var now = 0.0
        let fadeIn = a.musicFade ? 1.0 : 0
        if fadeIn > 0 {
            params.setVolumeRamp(fromStartVolume: 0, toEndVolume: speech.first.map { $0.0 < 1.2 } == true ? ducked : base,
                                 timeRange: CMTimeRange(start: .zero, duration: t(fadeIn)))
            now = fadeIn
        } else {
            params.setVolume(base, at: .zero)
        }
        for (s, e) in speech {
            let downStart = max(now, s - ramp)
            if downStart + ramp <= e {
                params.setVolumeRamp(fromStartVolume: base, toEndVolume: ducked,
                                     timeRange: CMTimeRange(start: t(downStart), duration: t(ramp)))
                params.setVolumeRamp(fromStartVolume: ducked, toEndVolume: base,
                                     timeRange: CMTimeRange(start: t(e), duration: t(ramp)))
                now = e + ramp
            }
        }
        if a.musicFade {
            let out = min(2.0, total.seconds * 0.2)
            let start = max(now, total.seconds - out)
            params.setVolumeRamp(fromStartVolume: base, toEndVolume: 0,
                                 timeRange: CMTimeRange(start: t(start), duration: t(total.seconds - start)))
        }
        return params
    }

    private static func makeAudioParams(plan: EditPlan, placed: [Placed], lanes: [AVMutableCompositionTrack],
                                        total: CMTime) -> [AVMutableAudioMixInputParameters] {
        let volume = Float(plan.audio.originalVolume)
        let params = lanes.map { lane -> AVMutableAudioMixInputParameters in
            AVMutableAudioMixInputParameters(track: lane)
        }
        let fade = CMTime(seconds: 0.5, preferredTimescale: 600)
        for (k, p) in placed.enumerated() {
            let lane = params[p.lane]
            let isFirst = k == 0
            let isLast = k == placed.count - 1
            if p.overlapIn > .zero {
                lane.setVolumeRamp(fromStartVolume: 0, toEndVolume: volume,
                                   timeRange: CMTimeRange(start: p.start, duration: p.overlapIn))
            } else if isFirst && plan.audio.fadeInOut {
                lane.setVolumeRamp(fromStartVolume: 0, toEndVolume: volume,
                                   timeRange: CMTimeRange(start: p.start, duration: CMTimeMinimum(fade, p.duration)))
            } else {
                lane.setVolume(volume, at: p.start)
            }
            if !isLast, placed[k + 1].overlapIn > .zero {
                let next = placed[k + 1]
                lane.setVolumeRamp(fromStartVolume: volume, toEndVolume: 0,
                                   timeRange: CMTimeRange(start: next.start, duration: next.overlapIn))
            } else if isLast && plan.audio.fadeInOut {
                let out = CMTimeMinimum(CMTime(seconds: 0.8, preferredTimescale: 600),
                                        CMTimeMultiplyByFloat64(p.duration, multiplier: 0.4))
                lane.setVolumeRamp(fromStartVolume: volume, toEndVolume: 0,
                                   timeRange: CMTimeRange(start: CMTimeSubtract(total, out), duration: out))
            }
        }
        return params
    }

    // MARK: - Textos y subtítulos

    private static func buildTexts(plan: EditPlan, byIndex: [Int: Placed], placed: [Placed],
                                   transcript: [CaptionLine], canvas: CGSize, total: Double) -> [TextItem] {
        var items: [TextItem] = []
        for t in plan.texts {
            guard let p = byIndex[t.segmentIndex] else { continue }
            let start = p.start.seconds + t.startOffset
            let end = min(start + t.duration, total)
            guard end - start > 0.1, let block = TextEngine.render(t, canvas: canvas) else { continue }
            items.append(TextItem(block: block, spec: t, start: start, end: end, wordTimes: nil))
        }

        let c = plan.captions
        guard c.enabled else { return items }
        // Pasar cada palabra del audio original a la línea de tiempo editada.
        func mapTime(_ s: Double, _ p: Placed) -> Double? {
            let seg = plan.segments[p.index]
            guard seg.kind == .clip, s >= seg.sourceStart, s <= seg.sourceEnd else { return nil }
            return p.start.seconds + seg.ramp.timelineOffset(forSource: s)
        }
        for p in placed where plan.segments[p.index].kind == .clip {
            for line in transcript {
                var words: [(text: String, start: Double, end: Double)] = []
                let source = line.words.isEmpty ? [CaptionWord(text: line.text, start: line.start, end: line.end)] : line.words
                for w in source {
                    guard let s = mapTime(max(w.start, plan.segments[p.index].sourceStart), p),
                          let e = mapTime(min(w.end, plan.segments[p.index].sourceEnd), p), e > s else { continue }
                    words.append((w.text, s, e))
                }
                guard !words.isEmpty else { continue }

                if c.template == .wordPop {
                    for w in words {
                        var spec = captionSpec(c, text: w.text)
                        spec.size = c.size * 1.6
                        if w.text.count > 6 { spec.color = c.highlightColor }
                        guard let block = TextEngine.render(spec, canvas: canvas) else { continue }
                        items.append(TextItem(block: block, spec: spec, start: w.start, end: max(w.end, w.start + 0.25),
                                              wordTimes: nil))
                    }
                    continue
                }
                // Partir la línea en grupos de maxWords palabras.
                var i = 0
                while i < words.count {
                    let chunk = Array(words[i..<min(i + c.maxWords, words.count)])
                    i += c.maxWords
                    let text = chunk.map(\.text).joined(separator: " ")
                    let spec = captionSpec(c, text: text)
                    let karaoke = c.template == .karaoke
                    guard let block = TextEngine.render(spec, canvas: canvas,
                                                        highlightColor: karaoke ? c.highlightColor : nil),
                          let first = chunk.first, let last = chunk.last else { continue }
                    let times = karaoke && block.words.count == chunk.count
                        ? chunk.map { $0.start...max($0.end, $0.start + 0.05) } : nil
                    items.append(TextItem(block: block, spec: spec, start: first.start,
                                          end: max(last.end + 0.15, first.start + 0.4), wordTimes: times))
                }
            }
        }
        return items
    }

    /// Diseño de subtítulos según la plantilla.
    static func captionSpec(_ c: Captions, text: String) -> TextOverlay {
        var s = TextOverlay.basic(text)
        s.font = c.font
        s.size = c.size
        s.color = c.color
        s.y = c.y
        s.uppercase = c.uppercase
        s.maxWidth = 0.86
        s.animationOut = .none
        s.shadow = 0.6
        s.weight = .bold
        switch c.template {
        case .classic:
            s.animationIn = .fade
        case .karaoke:
            s.weight = .black; s.strokeWidth = 0.35; s.strokeColor = "#000000"; s.animationIn = .pop
        case .wordPop:
            s.weight = .black; s.strokeWidth = 0.45; s.strokeColor = "#000000"; s.animationIn = .pop; s.y = c.y
        case .boxed:
            s.background = .box; s.backgroundColor = "#000000B3"; s.shadow = 0; s.animationIn = .fade
        case .boldStroke:
            s.weight = .heavy; s.strokeWidth = 0.5; s.strokeColor = "#000000"; s.shadow = 0.4; s.animationIn = .wordByWord
        case .neon:
            s.glowColor = c.highlightColor; s.glowAmount = 0.8; s.shadow = 0; s.animationIn = .fade; s.loop = .glowPulse
        case .minimal:
            s.weight = .medium; s.size = c.size * 0.85; s.shadow = 0.35; s.animationIn = .fade
        }
        return s
    }
}
