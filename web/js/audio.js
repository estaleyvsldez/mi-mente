// Estudio de audio (Web Audio): limpieza de voz, EQ, compresor, reverb, efectos de voz y música con ducking.
(function () {
  MM.VOICE_PRESETS = ['none', 'natural', 'podcast', 'radio_host', 'warm', 'bright', 'telephone', 'megaphone', 'walkie',
    'cave', 'stadium', 'underwater'];

  function impulse(ctx, seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  function distortionCurve(amount) {
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; curve[i] = ((3 + amount) * x * 20 * Math.PI / 180) / (Math.PI + amount * Math.abs(x)); }
    return curve;
  }

  /// Cadena de voz según los ajustes (mismos valores en vista previa y exportación).
  function voiceChain(ctx, a, output) {
    const input = ctx.createGain();
    let node = input;
    const link = (n) => { node.connect(n); node = n; return n; };
    let hp = 60 + a.cleanup * 70, lp = 0, low = a.eqLow * 12, mid = a.eqMid * 12, high = a.eqHigh * 12;
    let comp = Math.max(a.compression, a.cleanup * 0.4), rev = a.reverb, revSeconds = 1.6, dist = 0;
    switch (a.voicePreset) {
      case 'natural': comp = Math.max(comp, 0.3); hp = Math.max(hp, 80); break;
      case 'podcast': comp = Math.max(comp, 0.6); low += 2; mid += 3; high += 1; hp = Math.max(hp, 90); break;
      case 'radio_host': comp = Math.max(comp, 0.85); low += 4; mid += 4; high += 2; break;
      case 'warm': low += 4; high -= 3; comp = Math.max(comp, 0.35); break;
      case 'bright': high += 5; mid += 1; comp = Math.max(comp, 0.35); hp = Math.max(hp, 110); break;
      case 'telephone': hp = 400; lp = 3400; comp = Math.max(comp, 0.6); dist = 8; break;
      case 'megaphone': hp = 600; lp = 4500; mid += 6; dist = 40; break;
      case 'walkie': hp = 500; lp = 3000; comp = Math.max(comp, 0.8); dist = 25; break;
      case 'cave': rev = Math.max(rev, 0.6); revSeconds = 4; break;
      case 'stadium': rev = Math.max(rev, 0.5); revSeconds = 3; comp = Math.max(comp, 0.5); break;
      case 'underwater': lp = 700; rev = Math.max(rev, 0.35); break;
    }
    const f = (type, freq, gain = 0, q = 0.9) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = freq; b.gain.value = gain; b.Q.value = q; return b; };
    link(f('highpass', hp, 0, 0.7));
    if (a.cleanup > 0.01) link(f('lowpass', 12000 - a.cleanup * 3000, 0, 0.7));
    if (lp) link(f('lowpass', lp, 0, 0.7));
    link(f('lowshelf', 150, MM.clamp(low, -24, 24)));
    link(f('peaking', 1800, MM.clamp(mid, -24, 24), 1));
    link(f('highshelf', 8000, MM.clamp(high, -24, 24)));
    if (a.cleanup > 0.01) link(f('peaking', 6500, -a.cleanup * 5, 2)); // menos siseo
    if (dist) { const ws = ctx.createWaveShaper(); ws.curve = distortionCurve(dist); ws.oversample = '2x'; link(ws); }
    if (comp > 0.01) {
      const c = ctx.createDynamicsCompressor();
      c.threshold.value = -10 - comp * 24; c.ratio.value = 2 + comp * 6; c.knee.value = 8; c.attack.value = 0.005; c.release.value = 0.15;
      link(c);
      const makeup = ctx.createGain(); makeup.gain.value = 1 + comp * 0.9; link(makeup);
    }
    const dry = ctx.createGain(); dry.gain.value = 1 - rev * 0.35;
    node.connect(dry); dry.connect(output);
    if (rev > 0.01) {
      const conv = ctx.createConvolver(); conv.buffer = impulse(ctx, revSeconds, 2.5);
      const wet = ctx.createGain(); wet.gain.value = rev * 0.6;
      node.connect(conv); conv.connect(wet); wet.connect(output);
    }
    return input;
  }

  class AudioEngine {
    constructor() { this.nodes = []; this.master = null; this.recordDest = null; }

    /// Programa todo el audio desde el segundo t0 de la línea de tiempo.
    /// Con `offline` (un OfflineAudioContext) mezcla sin tiempo real, para exportar.
    start(plan, tl, project, t0, forRecording, offline) {
      if (!offline) this.stop();
      const ctx = offline || MM.audioCtx();
      if (!offline && ctx.state !== 'running') ctx.resume().catch(() => {});
      const a = plan.audio;
      const master = ctx.createGain();
      master.connect(ctx.destination);
      if (!offline) this.master = master;
      if (forRecording && !offline) {
        this.recordDest = ctx.createMediaStreamDestination();
        master.connect(this.recordDest);
      }
      this.master = offline ? this.master : master;
      const voiceIn = voiceChain(ctx, a, master);
      const now = offline ? 0 : ctx.currentTime + 0.06;
      if (!offline) { this.startedAt = now; this.t0 = t0; }
      const at = (tt) => Math.max(now, now + (tt - t0));
      const nodes = offline ? [] : this.nodes;

      for (const it of tl.items) {
        if (it.seg.kind !== 'clip' || !it.src || !it.src.audio) continue;
        const end = it.start + it.dur;
        if (end <= t0) continue;
        const node = ctx.createBufferSource();
        node.buffer = it.src.audio;
        node.playbackRate.value = it.seg.speed;
        const g = ctx.createGain();
        const vol = MM.clamp(a.voiceVolume ?? 1, 0, 2);
        const s = Math.max(it.start, t0);
        g.gain.setValueAtTime(vol, at(s));
        if (it.overlapIn > 0 && it.start >= t0) { g.gain.setValueAtTime(0, at(it.start)); g.gain.linearRampToValueAtTime(vol, at(it.start + it.overlapIn)); }
        const next = tl.items.find((x) => x.start > it.start && x.overlapIn > 0 && x.start < end);
        if (next) { g.gain.setValueAtTime(vol, at(next.start)); g.gain.linearRampToValueAtTime(0, at(end)); }
        node.connect(g); g.connect(voiceIn);
        const offset = it.seg.sourceStart + (s - it.start) * it.seg.speed;
        node.start(at(s), offset, (end - s) * it.seg.speed);
        nodes.push(node);
      }

      // Música de fondo: una sola envolvente (fade × ducking), sin automatizaciones que choquen.
      const song = project.songs.find((x) => x.name === a.music);
      if (song && song.buffer && t0 < tl.total) {
        const node = ctx.createBufferSource();
        const dur = song.buffer.duration;
        const ls = Math.min(Math.max(0, a.musicStart || 0), Math.max(0, dur - 1));
        node.buffer = song.buffer; node.loop = true; node.loopStart = ls; node.loopEnd = dur;
        const g = ctx.createGain();
        const base = MM.clamp(a.musicVolume, 0, 1), duckK = 1 - MM.clamp(a.ducking, 0, 1);
        const ranges = [];
        if (a.ducking > 0.01) {
          const voRanges = (plan.voiceovers || []).map((vo) => {
            const it = tl.items.find((x) => x.index === vo.segmentIndex); const b = project.voices && project.voices[vo.key];
            return it && b ? { start: it.start + (vo.startOffset || 0), end: it.start + (vo.startOffset || 0) + b.duration } : null;
          }).filter(Boolean);
          for (const w of [...MM.timelineWords(plan, tl, project), ...voRanges].sort((x, y) => x.start - y.start)) {
            const last = ranges[ranges.length - 1];
            if (last && w.start - last[1] < 0.8) last[1] = Math.max(last[1], w.end); else ranges.push([w.start, w.end]);
          }
        }
        const level = (t) => {
          let k = base;
          if (a.fadeInOut) k *= Math.min(1, t / 1, (tl.total - t) / 2);
          for (const [s0, e0] of ranges) {
            if (t > s0 - 0.3 && t < e0 + 0.4) {
              const into = MM.clamp((t - (s0 - 0.3)) / 0.3, 0, 1), out = MM.clamp((e0 + 0.4 - t) / 0.4, 0, 1);
              k *= 1 - (1 - duckK) * Math.min(into, out);
              break;
            }
          }
          return Math.max(0, k);
        };
        const span = Math.max(0.1, tl.total - t0);
        const steps = Math.max(2, Math.min(200000, Math.ceil(span * 20)));
        const curve = new Float32Array(steps);
        for (let i = 0; i < steps; i++) curve[i] = level(t0 + (i / (steps - 1)) * span);
        g.gain.setValueAtTime(curve[0], now);
        g.gain.setValueCurveAtTime(curve, now + 0.001, span);
        node.connect(g); g.connect(master);
        const L = Math.max(0.1, dur - ls), pos = (a.musicStart || 0) + t0;
        const offset = pos < dur ? pos : ls + ((pos - dur) % L);
        node.start(now, offset);
        node.stop(now + span + 0.1);
        nodes.push(node);
      }

      // Narración / voces en off (Estudio de películas).
      const byIdx = {};
      tl.items.forEach((it) => { byIdx[it.index] = it; });
      for (const vo of plan.voiceovers || []) {
        const buf = project.voices && project.voices[vo.key];
        const it = byIdx[vo.segmentIndex];
        if (!buf || !it) continue;
        const time = it.start + (vo.startOffset || 0);
        if (time + buf.duration < t0) continue;
        const node = ctx.createBufferSource(); node.buffer = buf;
        const g = ctx.createGain(); g.gain.value = MM.clamp(vo.volume ?? 1, 0, 2);
        node.connect(g); g.connect(voiceIn);
        node.start(at(Math.max(time, t0)), Math.max(0, t0 - time));
        nodes.push(node);
      }

      // Arsenal de efectos de sonido.
      const sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
      for (const x of MM.scheduleSfx(plan, tl)) {
        const buf = MM.sfxReady[x.type];
        if (!buf || x.time + buf.duration < t0 || x.time > tl.total) continue;
        const node = ctx.createBufferSource(); node.buffer = buf;
        const g = ctx.createGain(); g.gain.value = x.volume;
        node.connect(g); g.connect(sfxBus);
        const offset = Math.max(0, t0 - x.time);
        node.start(at(Math.max(x.time, t0)), offset);
        nodes.push(node);
      }
      return this.recordDest ? this.recordDest.stream : null;
    }

    stop() {
      for (const n of this.nodes) { try { n.stop(); } catch { /* ya parado */ } }
      this.nodes = [];
      if (this.master) { try { this.master.disconnect(); } catch { /* */ } }
      this.master = null; this.recordDest = null;
    }
  }
  MM.AudioEngine = AudioEngine;
})();
