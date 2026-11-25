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
    start(plan, tl, project, t0, forRecording) {
      this.stop();
      const ctx = MM.audioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const a = plan.audio;
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      if (forRecording) {
        this.recordDest = ctx.createMediaStreamDestination();
        this.master.connect(this.recordDest);
      }
      const voiceIn = voiceChain(ctx, a, this.master);
      const now = ctx.currentTime + 0.06;
      this.startedAt = now; this.t0 = t0;
      const at = (tt) => now + (tt - t0);

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
        this.nodes.push(node);
      }

      // Música de fondo con ducking.
      const song = project.songs.find((x) => x.name === a.music);
      if (song && song.buffer) {
        const node = ctx.createBufferSource();
        node.buffer = song.buffer; node.loop = true;
        node.loopStart = Math.min(a.musicStart || 0, song.buffer.duration - 1);
        node.loopEnd = song.buffer.duration;
        const g = ctx.createGain();
        const base = MM.clamp(a.musicVolume, 0, 1), duck = base * (1 - MM.clamp(a.ducking, 0, 1));
        g.gain.setValueAtTime(a.fadeInOut && t0 < 1 ? 0 : base, now);
        if (a.fadeInOut && t0 < 1) g.gain.linearRampToValueAtTime(base, at(1));
        if (a.ducking > 0.01) {
          const ranges = [];
          for (const w of MM.timelineWords(plan, tl, project)) {
            const last = ranges[ranges.length - 1];
            if (last && w.start - last[1] < 0.8) last[1] = Math.max(last[1], w.end); else ranges.push([w.start, w.end]);
          }
          for (const [s, e] of ranges) {
            if (e < t0) continue;
            const ds = Math.max(t0 + 0.05, s - 0.3);
            g.gain.setValueAtTime(base, at(ds)); g.gain.linearRampToValueAtTime(duck, at(ds + 0.3));
            g.gain.setValueAtTime(duck, at(Math.max(ds + 0.3, e))); g.gain.linearRampToValueAtTime(base, at(Math.max(ds + 0.3, e) + 0.4));
          }
        }
        if (a.fadeInOut) {
          const fs = Math.max(t0, tl.total - 2);
          g.gain.setValueAtTime(base, at(fs)); g.gain.linearRampToValueAtTime(0, at(tl.total));
        }
        node.connect(g); g.connect(this.master);
        const offset = ((a.musicStart || 0) + t0) % song.buffer.duration;
        node.start(now, offset);
        node.stop(at(tl.total) + 0.1);
        this.nodes.push(node);
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
