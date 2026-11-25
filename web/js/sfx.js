// Arsenal de sonido: efectos y bases musicales sintetizados en el momento (no se descarga nada).
(function () {
  const SR = 44100;

  function noiseBuffer(ctx, seconds, color = 'white') {
    const len = Math.max(1, Math.floor(seconds * ctx.sampleRate));
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (color === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return b;
  }
  function env(param, t0, a, peak, hold, r, end = 0.0001) {
    param.setValueAtTime(0.0001, t0);
    param.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + Math.max(a, 0.001));
    param.setValueAtTime(Math.max(peak, 0.0002), t0 + a + hold);
    param.exponentialRampToValueAtTime(end, t0 + a + hold + r);
  }
  function noise(ctx, out, t, dur, { type = 'bandpass', f0 = 800, f1 = 800, q = 1, gain = 0.6, a = 0.01, r = 0.2, color = 'white' } = {}) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, dur, color);
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); env(g.gain, t, a, gain, Math.max(0, dur - a - r), r);
    src.connect(f); f.connect(g); g.connect(out); src.start(t); src.stop(t + dur + 0.05);
  }
  function tone(ctx, out, t, dur, { type = 'sine', f0 = 440, f1 = null, gain = 0.5, a = 0.005, r = 0.2, detune = 0 } = {}) {
    const o = ctx.createOscillator(); o.type = type; o.detune.value = detune;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); env(g.gain, t, a, gain, Math.max(0, dur - a - r), r);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  }

  // Cada efecto: [duración, función que lo dibuja].
  const DEFS = {
    whoosh: [0.7, (c, o) => noise(c, o, 0, 0.7, { f0: 300, f1: 3500, q: 2.5, gain: 0.7, a: 0.35, r: 0.33 })],
    swoosh_fast: [0.35, (c, o) => noise(c, o, 0, 0.35, { f0: 1200, f1: 6000, q: 3, gain: 0.7, a: 0.08, r: 0.25 })],
    swipe: [0.25, (c, o) => noise(c, o, 0, 0.25, { type: 'highpass', f0: 2500, f1: 7000, gain: 0.5, a: 0.02, r: 0.2 })],
    impact: [1.2, (c, o) => { tone(c, o, 0, 1.0, { f0: 120, f1: 38, gain: 0.95, r: 0.9 }); noise(c, o, 0, 0.3, { type: 'lowpass', f0: 2500, f1: 300, gain: 0.8, r: 0.28 }); }],
    boom: [2.8, (c, o) => { tone(c, o, 0, 2.6, { f0: 70, f1: 28, gain: 1, a: 0.01, r: 2.4 }); noise(c, o, 0, 2.2, { type: 'lowpass', f0: 900, f1: 60, gain: 0.7, r: 2, color: 'brown' }); }],
    hit: [0.4, (c, o) => { tone(c, o, 0, 0.25, { f0: 180, f1: 60, gain: 0.9, r: 0.22 }); noise(c, o, 0, 0.12, { type: 'highpass', f0: 1800, f1: 1800, gain: 0.6, r: 0.1 }); }],
    riser: [3, (c, o) => {
      noise(c, o, 0, 3, { f0: 200, f1: 8000, q: 4, gain: 0.5, a: 2.8, r: 0.15 });
      tone(c, o, 0, 3, { type: 'sawtooth', f0: 110, f1: 880, gain: 0.12, a: 2.8, r: 0.15 });
    }],
    downlifter: [2, (c, o) => { noise(c, o, 0, 2, { f0: 6000, f1: 150, q: 3, gain: 0.5, a: 0.02, r: 1.9 }); tone(c, o, 0, 2, { type: 'sawtooth', f0: 600, f1: 60, gain: 0.1, r: 1.9 }); }],
    bass_drop: [2.5, (c, o) => { tone(c, o, 0, 2.4, { f0: 160, f1: 30, gain: 1, a: 0.005, r: 2.2 }); tone(c, o, 0, 2.4, { type: 'square', f0: 80, f1: 25, gain: 0.15, r: 2.2 }); }],
    pop: [0.15, (c, o) => tone(c, o, 0, 0.12, { f0: 900, f1: 300, gain: 0.7, r: 0.1 })],
    click: [0.05, (c, o) => noise(c, o, 0, 0.04, { type: 'highpass', f0: 3000, f1: 3000, gain: 0.6, a: 0.001, r: 0.03 })],
    ding: [1.4, (c, o) => { tone(c, o, 0, 1.3, { f0: 1760, gain: 0.4, r: 1.25 }); tone(c, o, 0, 1.3, { f0: 2640, gain: 0.15, r: 1 }); }],
    notification: [0.5, (c, o) => { tone(c, o, 0, 0.15, { f0: 988, gain: 0.4, r: 0.12 }); tone(c, o, 0.15, 0.3, { f0: 1319, gain: 0.4, r: 0.28 }); }],
    glitch: [0.5, (c, o) => { for (let i = 0; i < 8; i++) tone(c, o, i * 0.055, 0.05, { type: 'square', f0: 200 + Math.random() * 2000, gain: 0.25, a: 0.001, r: 0.04 }); noise(c, o, 0, 0.45, { type: 'highpass', f0: 4000, f1: 4000, gain: 0.25, r: 0.1 }); }],
    laser: [0.4, (c, o) => tone(c, o, 0, 0.35, { type: 'sawtooth', f0: 1800, f1: 120, gain: 0.35, r: 0.3 })],
    magic: [1.5, (c, o) => { for (let i = 0; i < 10; i++) tone(c, o, i * 0.07, 0.6, { f0: 1500 + i * 180, gain: 0.12, r: 0.55 }); }],
    camera_shutter: [0.25, (c, o) => { noise(c, o, 0, 0.05, { type: 'highpass', f0: 2000, f1: 2000, gain: 0.8, a: 0.001, r: 0.04 }); noise(c, o, 0.09, 0.07, { type: 'bandpass', f0: 1500, f1: 1500, gain: 0.6, a: 0.001, r: 0.06 }); }],
    typing: [1.2, (c, o) => { for (let i = 0; i < 10; i++) noise(c, o, i * 0.11 + Math.random() * 0.03, 0.04, { type: 'bandpass', f0: 2500 + Math.random() * 1500, f1: 2500, q: 2, gain: 0.5, a: 0.001, r: 0.03 }); }],
    heartbeat: [1.6, (c, o) => { [0, 0.28, 0.8, 1.08].forEach((t, i) => tone(c, o, t, 0.18, { f0: i % 2 ? 50 : 60, f1: 35, gain: i % 2 ? 0.7 : 0.95, r: 0.16 })); }],
    record_scratch: [0.6, (c, o) => { noise(c, o, 0, 0.25, { f0: 400, f1: 2500, q: 5, gain: 0.7, a: 0.01, r: 0.2 }); noise(c, o, 0.25, 0.3, { f0: 2500, f1: 300, q: 5, gain: 0.7, a: 0.01, r: 0.28 }); }],
    boing: [0.9, (c, o) => { const os = c.createOscillator(); const lfo = c.createOscillator(); const lg = c.createGain(); const g = c.createGain();
      os.frequency.value = 220; lfo.frequency.value = 14; lg.gain.setValueAtTime(120, 0); lg.gain.exponentialRampToValueAtTime(2, 0.85);
      lfo.connect(lg); lg.connect(os.frequency); env(g.gain, 0, 0.005, 0.5, 0.3, 0.55); os.connect(g); g.connect(o);
      os.start(0); lfo.start(0); os.stop(0.9); lfo.stop(0.9); }],
    fail_trombone: [2.2, (c, o) => { [[392, 0], [370, 0.45], [349, 0.9]].forEach(([f, t]) => tone(c, o, t, 0.42, { type: 'sawtooth', f0: f, gain: 0.18, r: 0.15 }));
      tone(c, o, 1.35, 0.85, { type: 'sawtooth', f0: 330, f1: 300, gain: 0.18, r: 0.5 }); }],
    drum_roll: [2, (c, o) => { for (let i = 0; i < 40; i++) noise(c, o, i * 0.045, 0.05, { type: 'bandpass', f0: 1800, f1: 1800, q: 1, gain: 0.15 + i * 0.012, a: 0.001, r: 0.04 }); }],
    cymbal: [2.5, (c, o) => noise(c, o, 0, 2.5, { type: 'highpass', f0: 5000, f1: 7000, gain: 0.45, a: 0.002, r: 2.4 })],
    applause: [3, (c, o) => { for (let i = 0; i < 90; i++) noise(c, o, Math.random() * 2.7, 0.03, { type: 'bandpass', f0: 1200 + Math.random() * 2000, f1: 1500, q: 1.5, gain: 0.3, a: 0.001, r: 0.025 }); }],
    crowd_laugh: [2.5, (c, o) => { for (let k = 0; k < 6; k++) { const t0 = Math.random() * 0.4; for (let i = 0; i < 7; i++) tone(c, o, t0 + i * 0.22, 0.16, { type: 'triangle', f0: 260 + k * 60 + Math.random() * 40, f1: 200 + k * 50, gain: 0.08, r: 0.12 }); } }],
    suspense_drone: [6, (c, o) => { [55, 58.3, 82.4].forEach((f, i) => tone(c, o, 0, 6, { type: 'sawtooth', f0: f, gain: 0.08, a: 2, r: 2, detune: i * 7 })); noise(c, o, 0, 6, { type: 'lowpass', f0: 300, f1: 200, gain: 0.15, a: 2, r: 2, color: 'brown' }); }],
    horror_sting: [2, (c, o) => { [233, 247, 262, 277, 311].forEach((f) => tone(c, o, 0, 1.9, { type: 'sawtooth', f0: f, f1: f * 0.97, gain: 0.12, a: 0.01, r: 1.7 })); noise(c, o, 0, 0.6, { type: 'highpass', f0: 3000, f1: 3000, gain: 0.35, r: 0.5 }); }],
    thunder: [4, (c, o) => noise(c, o, 0, 4, { type: 'lowpass', f0: 1500, f1: 80, gain: 1, a: 0.02, r: 3.8, color: 'brown' })],
    wind: [5, (c, o) => noise(c, o, 0, 5, { f0: 400, f1: 900, q: 0.8, gain: 0.35, a: 1.5, r: 2, color: 'brown' })],
    cash: [0.9, (c, o) => { tone(c, o, 0, 0.6, { f0: 2093, gain: 0.3, r: 0.5 }); tone(c, o, 0.08, 0.7, { f0: 2637, gain: 0.25, r: 0.6 }); noise(c, o, 0, 0.1, { type: 'highpass', f0: 4000, f1: 4000, gain: 0.3, r: 0.08 }); }],
  };
  MM.SFX_TYPES = Object.keys(DEFS);

  /// Deja el pico en `target` para que todo suene parejo.
  function normalize(buf, target) {
    let peak = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i])); }
    if (peak < 1e-4) return buf;
    const k = target / peak;
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; }
    return buf;
  }
  const cache = {};
  MM.sfxReady = {};
  /// Renderiza un efecto una vez y lo guarda.
  MM.sfxBuffer = (type) => {
    if (!DEFS[type]) return Promise.resolve(null);
    if (cache[type]) return cache[type];
    const [dur, draw] = DEFS[type];
    const ctx = new OfflineAudioContext(2, Math.ceil((dur + 0.2) * SR), SR);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -6; comp.ratio.value = 4;
    comp.connect(ctx.destination);
    draw(ctx, comp);
    cache[type] = ctx.startRendering().then((b) => { normalize(b, 0.8); MM.sfxReady[type] = b; return b; }).catch(() => null);
    return cache[type];
  };

  /// Analiza una canción: mejor parte (coro / drop), otros momentos fuertes y BPM aproximado.
  MM.analyzeSong = (buf) => {
    const d = buf.getChannelData(0), sr = buf.sampleRate;
    const hop = Math.floor(sr * 0.05), n = Math.floor(d.length / hop);
    const env = new Float32Array(n);
    for (let i = 0; i < n; i++) { let e = 0; for (let j = i * hop, k = j + hop; j < k; j += 4) e += d[j] * d[j]; env[i] = Math.sqrt(e / (hop / 4)); }
    // Energía en ventanas de 8 s: la más alta y sostenida es el coro/drop.
    const win = Math.round(8 / 0.05), score = [];
    let acc = 0;
    for (let i = 0; i < n; i++) { acc += env[i]; if (i >= win) acc -= env[i - win]; if (i >= win - 1) score.push({ t: (i - win + 1) * 0.05, v: acc }); }
    score.sort((a, b) => b.v - a.v);
    const picks = [];
    for (const c of score) { if (picks.every((p) => Math.abs(p - c.t) > 12)) picks.push(c.t); if (picks.length >= 4) break; }
    // Subida brusca justo antes de la mejor parte (el "drop").
    let best = picks[0] || 0;
    const i0 = Math.max(1, Math.round(best / 0.05) - 40), i1 = Math.min(n - 1, Math.round(best / 0.05) + 40);
    let jump = 0;
    for (let i = i0; i < i1; i++) { const dj = env[i] - env[i - 1]; if (dj > jump) { jump = dj; best = i * 0.05; } }
    // BPM por autocorrelación de los golpes.
    const onset = new Float32Array(n);
    for (let i = 1; i < n; i++) onset[i] = Math.max(0, env[i] - env[i - 1]);
    let bestLag = 0, bestV = 0;
    for (let lag = Math.round(60 / 180 / 0.05); lag <= Math.round(60 / 70 / 0.05); lag++) {
      let v = 0; for (let i = lag; i < n; i++) v += onset[i] * onset[i - lag];
      if (v > bestV) { bestV = v; bestLag = lag; }
    }
    return { duration: buf.duration, best: Math.max(0, best - 0.1), peaks: picks.slice(1).sort((a, b) => a - b), bpm: bestLag ? Math.round(60 / (bestLag * 0.05)) : 0 };
  };

  // ---------- Bases musicales por estado de ánimo ----------
  MM.MUSIC_MOODS = ['none', 'hype', 'chill', 'epic', 'suspense', 'horror', 'comedy', 'sad', 'romantic', 'action', 'lofi'];
  const MOODS = {
    hype: { bpm: 128, root: 41, chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]], kick: 'four', hats: 8, pad: 'sawtooth', bass: true },
    chill: { bpm: 90, root: 45, chords: [[0, 4, 7, 11], [5, 9, 12, 16], [2, 5, 9, 12], [7, 11, 14, 17]], kick: 'half', hats: 4, pad: 'triangle', bass: true },
    lofi: { bpm: 78, root: 43, chords: [[0, 3, 7, 10], [5, 8, 12, 15], [-2, 2, 5, 9], [3, 7, 10, 14]], kick: 'half', hats: 8, pad: 'triangle', bass: true, crackle: true },
    epic: { bpm: 100, root: 38, chords: [[0, 3, 7], [-4, 0, 3], [-7, -3, 0], [-2, 2, 5]], kick: 'epic', hats: 0, pad: 'sawtooth', bass: true },
    action: { bpm: 140, root: 40, chords: [[0, 3, 7], [1, 4, 8], [0, 3, 7], [-2, 1, 5]], kick: 'four', hats: 16, pad: 'square', bass: true },
    suspense: { bpm: 70, root: 36, chords: [[0, 1, 7], [0, 3, 6], [0, 1, 7], [-1, 3, 6]], kick: 'pulse', hats: 0, pad: 'sawtooth', bass: false },
    horror: { bpm: 60, root: 34, chords: [[0, 1, 6], [0, 6, 11], [0, 1, 6], [-1, 5, 6]], kick: 'none', hats: 0, pad: 'sawtooth', bass: false },
    comedy: { bpm: 118, root: 48, chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], kick: 'bounce', hats: 4, pad: 'square', bass: true },
    sad: { bpm: 72, root: 45, chords: [[0, 3, 7], [-4, 0, 3], [-9, -5, -2], [-2, 2, 5]], kick: 'none', hats: 0, pad: 'triangle', bass: true },
    romantic: { bpm: 80, root: 43, chords: [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]], kick: 'half', hats: 0, pad: 'triangle', bass: true },
  };
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  /// Compone una base de 32 compases (~1 min) en el estado de ánimo pedido.
  MM.renderMusicBed = async (mood) => {
    const m = MOODS[mood];
    if (!m) return null;
    const beat = 60 / m.bpm, bars = 16, dur = bars * 4 * beat;
    const ctx = new OfflineAudioContext(2, Math.ceil((dur + 1) * SR), SR);
    const master = ctx.createGain(); master.gain.value = 0.7;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 3;
    master.connect(comp); comp.connect(ctx.destination);
    const padBus = ctx.createBiquadFilter(); padBus.type = 'lowpass'; padBus.frequency.value = mood === 'hype' || mood === 'action' ? 2400 : 1400;
    padBus.connect(master);
    for (let bar = 0; bar < bars; bar++) {
      const t = bar * 4 * beat;
      const chord = m.chords[bar % m.chords.length];
      chord.forEach((n, i) => tone(ctx, padBus, t, 4 * beat, { type: m.pad, f0: midi(m.root + 24 + n), gain: 0.05, a: 0.3, r: 0.6, detune: i * 4 - 4 }));
      if (m.bass) for (let b = 0; b < 4; b++) tone(ctx, master, t + b * beat, beat * 0.9, { type: 'triangle', f0: midi(m.root + 12 + chord[0]), gain: 0.25, r: 0.3 });
      for (let b = 0; b < 4; b++) {
        const bt = t + b * beat;
        const kick = (when, g = 0.9) => tone(ctx, master, when, 0.3, { f0: 140, f1: 40, gain: g, r: 0.28 });
        const snare = (when) => noise(ctx, master, when, 0.18, { type: 'bandpass', f0: 1800, f1: 1800, q: 0.7, gain: 0.4, a: 0.001, r: 0.16 });
        switch (m.kick) {
          case 'four': kick(bt); if (b % 2) snare(bt); break;
          case 'half': if (b % 2 === 0) kick(bt, 0.75); else snare(bt); break;
          case 'epic': if (b === 0 || b === 2) { tone(ctx, master, bt, 0.9, { f0: 90, f1: 35, gain: 1, r: 0.85 }); noise(ctx, master, bt, 0.5, { type: 'lowpass', f0: 600, f1: 100, gain: 0.5, r: 0.45, color: 'brown' }); } break;
          case 'pulse': tone(ctx, master, bt, 0.25, { f0: 55, gain: 0.6, r: 0.2 }); break;
          case 'bounce': kick(bt, 0.6); if (b % 2) noise(ctx, master, bt, 0.08, { type: 'highpass', f0: 3000, f1: 3000, gain: 0.3, r: 0.06 }); break;
        }
        for (let h = 0; h < m.hats / 4; h++) noise(ctx, master, bt + h * beat / (m.hats / 4), 0.04, { type: 'highpass', f0: 7000, f1: 7000, gain: 0.12, a: 0.001, r: 0.03 });
      }
      if (mood === 'horror' && bar % 4 === 3) noise(ctx, master, t + 2 * beat, 1.5, { type: 'highpass', f0: 2500, f1: 6000, gain: 0.12, a: 0.5, r: 0.9 });
      if (m.crackle) for (let i = 0; i < 4; i++) noise(ctx, master, t + Math.random() * 4 * beat, 0.01, { type: 'highpass', f0: 3000, f1: 3000, gain: 0.08, a: 0.001, r: 0.008 });
    }
    return normalize(await ctx.startRendering(), 0.85);
  };
})();
