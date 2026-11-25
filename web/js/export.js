// Exportación profesional: cuadro por cuadro con WebCodecs (hasta 4K), sin saltos y más rápido que en tiempo real
// en equipos buenos. Si el navegador no lo soporta, se graba en tiempo real.
(function () {
  const FPS = 30;
  const BITRATE = { 720: 8e6, 1080: 16e6, 1440: 24e6, 2160: 45e6 };

  async function pickVideoCodec(w, h) {
    if (!window.VideoEncoder) return null;
    const bitrate = BITRATE[Math.min(w, h)] || 12e6;
    // H.264 primero (funciona en todas partes: Fotos, WhatsApp, TikTok); VP9 de respaldo.
    const options = [
      ...['avc1.640034', 'avc1.640033', 'avc1.640028', 'avc1.4d0034', 'avc1.42003e'].map((codec) => ({ mux: 'avc', cfg: { codec, avc: { format: 'avc' } } })),
      { mux: 'vp9', cfg: { codec: 'vp09.00.51.08' } },
      { mux: 'vp9', cfg: { codec: 'vp09.00.41.08' } },
    ];
    for (const o of options) {
      const cfg = Object.assign({ width: w, height: h, bitrate, framerate: FPS }, o.cfg);
      try { const r = await VideoEncoder.isConfigSupported(cfg); if (r.supported) return { mux: o.mux, cfg }; } catch { /* siguiente */ }
    }
    return null;
  }
  async function pickAudioCodec() {
    if (!window.AudioEncoder) return null;
    for (const o of [{ mux: 'aac', codec: 'mp4a.40.2' }, { mux: 'opus', codec: 'opus' }]) {
      const cfg = { codec: o.codec, sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 };
      try { const r = await AudioEncoder.isConfigSupported(cfg); if (r.supported) return { mux: o.mux, cfg }; } catch { /* siguiente */ }
    }
    return null;
  }

  /// ¿Se puede exportar cuadro por cuadro en este navegador?
  MM.offlineExportSupport = async (w, h) => {
    if (!window.Mp4Muxer) return null;
    const video = await pickVideoCodec(w, h);
    const audio = await pickAudioCodec();
    return video && audio ? { video, audio } : null;
  };

  /// Exporta cuadro por cuadro. `fileHandle` (opcional, Chrome de laptop) escribe directo al disco para videos largos.
  MM.Player.prototype.exportOffline = async function (quality, onProgress, fileHandle) {
    this.pause();
    const size = MM.renderSize(this.plan, this.project, quality);
    const support = await MM.offlineExportSupport(size.w, size.h);
    if (!support) return null;

    // Render al tamaño final (4K incluido) y textos rehechos a esa resolución.
    this.renderer.resize(size.w, size.h);
    this.textCanvas.width = size.w; this.textCanvas.height = size.h;
    this.textItems = MM.buildTextItems(this.plan, this.tl, this.project);

    let target, stream = null;
    if (fileHandle) {
      stream = await fileHandle.createWritable();
      target = new Mp4Muxer.FileSystemWritableFileStreamTarget(stream);
    } else {
      target = new Mp4Muxer.ArrayBufferTarget();
    }
    const muxer = new Mp4Muxer.Muxer({
      target,
      video: { codec: support.video.mux, width: size.w, height: size.h, frameRate: FPS },
      audio: { codec: support.audio.mux, numberOfChannels: 2, sampleRate: 48000 },
      fastStart: fileHandle ? false : 'in-memory',
      firstTimestampBehavior: 'offset',
    });
    let failure = null;
    const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { failure = e; } });
    venc.configure(support.video.cfg);
    const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { failure = e; } });
    aenc.configure(support.audio.cfg);

    const total = this.tl.total;
    const frames = Math.max(1, Math.ceil(total * FPS));
    const audioChunk = 20;   // segundos de audio por bloque (memoria baja en videos largos)
    let audioDoneUntil = 0;
    const engine = new MM.AudioEngine();

    const encodeAudioUntil = async (until) => {
      while (audioDoneUntil < Math.min(until, total)) {
        const t0 = audioDoneUntil, len = Math.min(audioChunk, total - t0);
        const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(len * 48000)), 48000);
        engine.start(this.plan, this.tl, this.project, t0, false, ctx);
        const buf = await ctx.startRendering();
        const n = buf.length;
        const data = new Float32Array(n * 2);
        data.set(buf.getChannelData(0), 0);
        data.set(buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0), n);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2,
          timestamp: Math.round(t0 * 1e6), data });
        aenc.encode(ad);
        ad.close();
        audioDoneUntil = t0 + len;
      }
    };

    try {
      for (let f = 0; f < frames; f++) {
        if (failure) throw failure;
        const t = Math.min(f / FPS, total - 0.001);
        await this.prepareExact(t);
        this.renderFrame(t, false);
        const frame = new VideoFrame(this.canvas, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
        venc.encode(frame, { keyFrame: f % (FPS * 2) === 0 });
        frame.close();
        while (venc.encodeQueueSize > 6) await MM.sleep(4);
        if (f % FPS === 0) {
          await encodeAudioUntil(t + audioChunk);
          onProgress?.(f / frames);
        }
      }
      await encodeAudioUntil(total);
      await venc.flush();
      await aenc.flush();
      if (failure) throw failure;
      muxer.finalize();
      if (stream) await stream.close();
    } finally {
      try { venc.close(); } catch { /* */ }
      try { aenc.close(); } catch { /* */ }
      this.load(this.project, this.plan);   // vuelve a la vista previa
    }
    onProgress?.(1);
    if (fileHandle) return { saved: true, ext: 'mp4', size };
    return { blob: new Blob([target.buffer], { type: 'video/mp4' }), ext: 'mp4', size };
  };

  /// Pone los clips exactamente en el cuadro t y espera a que estén listos.
  MM.Player.prototype.prepareExact = async function (t) {
    const act = this.activeAt(t);
    const items = [act.a, act.b].filter(Boolean);
    items.forEach((it) => this.deckFor(it, t, false));
    for (const it of items) {
      if (!it.src || it.src.kind !== 'video') continue;
      const d = this.decks[it.lane];
      await MM.videoReady(d, 8000);
      this.deckFor(it, t, false);
      await MM.videoReady(d, 8000);
    }
  };
})();
