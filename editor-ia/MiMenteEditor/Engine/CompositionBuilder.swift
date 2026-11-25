import AVFoundation
import CoreImage

/// Resultado listo para reproducir o exportar.
struct BuiltEdit {
    let composition: AVComposition
    let videoComposition: AVVideoComposition
    let audioMix: AVAudioMix
    let duration: Double
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

    static func build(plan: EditPlan, source: SourceMedia, sceneURLs: [Int: URL],
                      transcript: [CaptionLine]) async throws -> BuiltEdit {
        let ts: CMTimeScale = 600
        let renderSize = source.renderSize
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

        for (i, seg) in plan.segments.enumerated() {
            // Rango de origen y duración final.
            let assetTrack: AVAssetTrack
            let audioTrack: AVAssetTrack?
            let sourceRange: CMTimeRange
            let duration: CMTime
            let orientation: CGImagePropertyOrientation

            switch seg.kind {
            case .clip:
                assetTrack = source.videoTrack
                audioTrack = source.audioTrack
                sourceRange = CMTimeRange(start: CMTime(seconds: seg.sourceStart, preferredTimescale: ts),
                                          end: CMTime(seconds: seg.sourceEnd, preferredTimescale: ts))
                duration = seg.speed == 1 ? sourceRange.duration
                    : CMTime(seconds: sourceRange.duration.seconds / seg.speed, preferredTimescale: ts)
                orientation = sourceOrientation
            case .scene:
                guard let url = sceneURLs[i] else { continue }
                let asset = AVURLAsset(url: url)
                guard let track = try await asset.loadTracks(withMediaType: .video).first else { continue }
                let assetDuration = try await asset.load(.duration)
                assetTrack = track
                audioTrack = nil
                sourceRange = CMTimeRange(start: .zero, duration: assetDuration)
                duration = CMTime(seconds: seg.sceneDuration, preferredTimescale: ts)
                orientation = .up
            }
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
            try vTrack.insertTimeRange(sourceRange, of: assetTrack, at: start)
            if sourceRange.duration != duration {
                vTrack.scaleTimeRange(CMTimeRange(start: start, duration: sourceRange.duration), toDuration: duration)
            }
            var hasAudio = false
            if let audioTrack {
                try aTrack.insertTimeRange(sourceRange, of: audioTrack, at: start)
                if sourceRange.duration != duration {
                    aTrack.scaleTimeRange(CMTimeRange(start: start, duration: sourceRange.duration), toDuration: duration)
                }
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
        // La duración real de la composición (puede variar unas milésimas por los cambios de velocidad).
        let totalEnd = composition.duration.seconds > 0 ? composition.duration : prevEnd

        // Textos y subtítulos, ya dibujados y con tiempos absolutos.
        let texts = renderTexts(plan: plan, placed: placed, transcript: transcript,
                                renderWidth: renderSize.width, total: totalEnd.seconds)
        let renderer = FrameRenderer(renderSize: renderSize, grade: plan.color, texts: texts)

        // Instrucciones: tramos normales y tramos de transición, sin huecos.
        var instructions: [EditInstruction] = []
        func ref(_ p: Placed) -> LayerRef { LayerRef(trackID: videoLanes[p.lane].trackID, orientation: p.orientation) }
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
        videoComposition.renderSize = renderSize
        videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
        videoComposition.instructions = instructions

        let audioMix = makeAudioMix(plan: plan, placed: placed, lanes: audioLanes, total: totalEnd)

        return BuiltEdit(composition: composition, videoComposition: videoComposition,
                         audioMix: audioMix, duration: totalEnd.seconds)
    }

    // MARK: - Audio

    private static func makeAudioMix(plan: EditPlan, placed: [Placed], lanes: [AVMutableCompositionTrack],
                                     total: CMTime) -> AVAudioMix {
        let volume = Float(plan.audio.originalVolume)
        let params = lanes.map { lane -> AVMutableAudioMixInputParameters in
            AVMutableAudioMixInputParameters(track: lane)
        }
        let fade = CMTime(seconds: 0.5, preferredTimescale: 600)
        for (k, p) in placed.enumerated() {
            let lane = params[p.lane]
            let isFirst = k == 0
            let isLast = k == placed.count - 1
            // Entrada: sube con la transición (o con el fade inicial).
            if p.overlapIn > .zero {
                lane.setVolumeRamp(fromStartVolume: 0, toEndVolume: volume,
                                   timeRange: CMTimeRange(start: p.start, duration: p.overlapIn))
            } else if isFirst && plan.audio.fadeInOut {
                lane.setVolumeRamp(fromStartVolume: 0, toEndVolume: volume,
                                   timeRange: CMTimeRange(start: p.start, duration: CMTimeMinimum(fade, p.duration)))
            } else {
                lane.setVolume(volume, at: p.start)
            }
            // Salida: baja durante la transición al siguiente (o con el fade final).
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
        let mix = AVMutableAudioMix()
        mix.inputParameters = params
        return mix
    }

    // MARK: - Textos

    private static func renderTexts(plan: EditPlan, placed: [Placed], transcript: [CaptionLine],
                                    renderWidth: CGFloat, total: Double) -> [RenderedText] {
        var result: [RenderedText] = []
        let byIndex = Dictionary(uniqueKeysWithValues: placed.map { ($0.index, $0) })

        for t in plan.texts {
            guard let p = byIndex[t.segmentIndex] else { continue }
            let start = p.start.seconds + t.startOffset
            let end = min(start + t.duration, total)
            guard end - start > 0.1,
                  let cg = TextImageRenderer.render(text: t.text, style: t.style, size: t.size,
                                                    colorHex: t.color, canvasWidth: renderWidth)
            else { continue }
            result.append(RenderedText(image: CIImage(cgImage: cg), start: start, end: end,
                                       position: t.position, animation: t.animation))
        }

        // Subtítulos: se mapean los tiempos del video original a la línea de tiempo editada.
        if plan.captions.enabled {
            for line in transcript {
                for p in placed {
                    let seg = plan.segments[p.index]
                    guard seg.kind == .clip else { continue }
                    let s = max(line.start, seg.sourceStart)
                    let e = min(line.end, seg.sourceEnd)
                    guard e - s > 0.25 else { continue }
                    let start = p.start.seconds + (s - seg.sourceStart) / seg.speed
                    let end = p.start.seconds + (e - seg.sourceStart) / seg.speed
                    guard let cg = TextImageRenderer.render(text: line.text, style: plan.captions.style, size: .medium,
                                                            colorHex: plan.captions.color, canvasWidth: renderWidth,
                                                            sizeFactor: 0.052)
                    else { continue }
                    result.append(RenderedText(image: CIImage(cgImage: cg), start: start, end: end,
                                               position: plan.captions.position, animation: .none))
                }
            }
        }
        return result
    }
}
