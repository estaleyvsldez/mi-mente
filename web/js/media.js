// Archivos: videos, fotos y música del usuario; cuadros para la IA; audio y transcripción.
(function () {
  let audioCtx = null;
  MM.audioCtx = () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  };
  // iPhone: el audio solo arranca después de un toque. Se desbloquea en cada toque.
  const unlock = () => { const c = MM.audioCtx(); if (c.state !== 'running') c.resume().catch(() => {}); };
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('keydown', unlock, { capture: true });

  // Fuentes de los textos: se cargan antes de medir, y si llegan tarde se vuelve a maquetar.
  MM.fontsReady = (async () => {
    if (!document.fonts) return;
    try { await Promise.all(Object.values(MM.FONTS || {}).map((f) => document.fonts.load('900 40px ' + f).catch(() => {}))); } catch { /* */ }
  })();
  if (document.fonts) document.fonts.addEventListener('loadingdone', () => MM.onFontsChanged && MM.onFontsChanged());

  function waitEvent(el, ev, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { cleanup(); reject(new Error('timeout ' + ev)); }, timeout);
      const ok = () => { cleanup(); resolve(); };
      const bad = () => { cleanup(); reject(new Error('No pude leer el archivo.')); };
      function cleanup() { clearTimeout(t); el.removeEventListener(ev, ok); el.removeEventListener('error', bad); }
      el.addEventListener(ev, ok, { once: true });
      el.addEventListener('error', bad, { once: true });
    });
  }
  MM.waitEvent = waitEvent;

  /// Espera a que un video tenga listo el cuadro actual (después de cargar o de saltar).
  MM.videoReady = (v, timeout = 5000) => new Promise((resolve) => {
    if (!v.seeking && v.readyState >= 2) { resolve(true); return; }
    const evs = ['seeked', 'loadeddata', 'canplay', 'error'];
    const done = () => { clearTimeout(t); evs.forEach((e) => v.removeEventListener(e, check)); resolve(v.readyState >= 2); };
    const check = () => { if (!v.seeking && v.readyState >= 2) done(); else if (v.error) done(); };
    const t = setTimeout(done, timeout);
    evs.forEach((e) => v.addEventListener(e, check));
  });

  /// Un video, foto o clip generado listo para usar.
  MM.loadSource = async (fileOrBlob, name, kind) => {
    const url = URL.createObjectURL(fileOrBlob);
    const type = kind || (fileOrBlob.type || '').split('/')[0] || 'video';
    if (type === 'image') {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { id: MM.uid(), name, kind: 'image', url, el: img, duration: 6, width: img.naturalWidth, height: img.naturalHeight, audio: null, words: [] };
    }
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
    v.src = url;
    await waitEvent(v, 'loadedmetadata');
    const src = { id: MM.uid(), name, kind: 'video', url, el: v, duration: v.duration, width: v.videoWidth, height: v.videoHeight, audio: null, words: [], blob: fileOrBlob };
    const isPhone = /iPhone|iPad|Android/i.test(navigator.userAgent);
    if (isPhone && fileOrBlob.size > 450e6) {
      src.tooBig = true;   // el teléfono no aguanta leerlo entero: se usa sin audio procesable
      return src;
    }
    try {
      // Videos largos: audio a menor resolución para que quepa en la memoria del teléfono.
      const long = v.duration > 12 * 60;
      const buf = await fileOrBlob.arrayBuffer();
      const decoder = long ? new OfflineAudioContext(1, 1, 22050) : MM.audioCtx();
      src.audio = await decoder.decodeAudioData(buf);
    } catch { src.audio = null; }
    return src;
  };

  /// Cuadros JPEG pequeños para que la IA "vea" el video.
  MM.sampleFrames = async (src, count) => {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const scale = Math.min(1, 512 / Math.max(src.width, src.height));
    c.width = Math.max(2, Math.round(src.width * scale)); c.height = Math.max(2, Math.round(src.height * scale));
    if (src.kind === 'image') {
      ctx.drawImage(src.el, 0, 0, c.width, c.height);
      return [{ time: 0, data: c.toDataURL('image/jpeg', 0.6).split(',')[1] }];
    }
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = src.url;
    await waitEvent(v, 'loadeddata').catch(() => {});
    const n = count || MM.clamp(Math.round(src.duration / 4), 4, src.duration > 600 ? 24 : 12);
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = src.duration * (i + 0.5) / n;
      try {
        v.currentTime = t;
        await waitEvent(v, 'seeked', 6000);
        ctx.drawImage(v, 0, 0, c.width, c.height);
        out.push({ time: t, data: c.toDataURL('image/jpeg', 0.6).split(',')[1] });
      } catch { /* cuadro saltado */ }
    }
    v.removeAttribute('src'); v.load();
    return out;
  };

  /// Un cuadro como imagen (para escenas IA desde tu video).
  MM.frameDataURL = async (src, time, maxSide = 1280) => {
    const c = document.createElement('canvas');
    const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
    c.width = Math.round(src.width * scale); c.height = Math.round(src.height * scale);
    const ctx = c.getContext('2d');
    if (src.kind === 'image') { ctx.drawImage(src.el, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.88); }
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.src = src.url;
    await waitEvent(v, 'loadeddata').catch(() => {});
    v.currentTime = Math.min(time, Math.max(0, src.duration - 0.05));
    await waitEvent(v, 'seeked', 6000).catch(() => {});
    ctx.drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.88);
  };

  /// WAV mono 16 kHz (para la transcripción).
  MM.wavDataURL = (buffer) => {
    const rate = 16000;
    const len = Math.floor(buffer.duration * rate);
    const data = new Float32Array(len);
    const chans = buffer.numberOfChannels;
    for (let c = 0; c < chans; c++) {
      const ch = buffer.getChannelData(c);
      const ratio = buffer.sampleRate / rate;
      for (let i = 0; i < len; i++) data[i] += ch[Math.min(ch.length - 1, Math.floor(i * ratio))] / chans;
    }
    const bytes = new ArrayBuffer(44 + len * 2);
    const dv = new DataView(bytes);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); dv.setUint32(4, 36 + len * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
    w(36, 'data'); dv.setUint32(40, len * 2, true);
    for (let i = 0; i < len; i++) dv.setInt16(44 + i * 2, MM.clamp(data[i], -1, 1) * 32767, true);
    let bin = '';
    const u8 = new Uint8Array(bytes);
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return 'data:audio/wav;base64,' + btoa(bin);
  };

  /// Pedazo de un AudioBuffer (para transcribir videos largos por partes).
  function sliceBuffer(buffer, start, end) {
    const sr = buffer.sampleRate;
    const a = Math.floor(start * sr), b = Math.min(buffer.length, Math.floor(end * sr));
    const out = new AudioBuffer({ length: Math.max(1, b - a), numberOfChannels: buffer.numberOfChannels, sampleRate: sr });
    for (let c = 0; c < buffer.numberOfChannels; c++) out.copyToChannel(buffer.getChannelData(c).subarray(a, b), c);
    return out;
  }

  /// Transcribe lo que se dice (Whisper en fal.ai, cualquier idioma) → palabras con tiempos.
  /// Los videos largos se parten en bloques de 4 min que se transcriben a la vez.
  MM.transcribe = async (src, onStatus) => {
    if (!src.audio || !MM.settings.falKey) return [];
    const CH = 240;
    const parts = [];
    for (let t = 0; t < src.audio.duration; t += CH) parts.push([t, Math.min(src.audio.duration, t + CH)]);
    let done = 0;
    const all = [];
    const run = async ([a, b]) => {
      const words = await transcribePart(sliceBuffer(src.audio, a, b), parts.length > 1 ? null : onStatus);
      words.forEach((w) => { w.start += a; w.end += a; });
      all.push(...words);
      done++;
      if (parts.length > 1) onStatus?.(`${done}/${parts.length} partes`);
    };
    for (let i = 0; i < parts.length; i += 4) await Promise.all(parts.slice(i, i + 4).map(run));
    return all.sort((x, y) => x.start - y.start);
  };

  async function transcribePart(buffer, onStatus) {
    const audioURL = MM.wavDataURL(buffer);
    let result;
    try {
      result = await MM.fal.run(MM.settings.whisperModel, { audio_url: audioURL, task: 'transcribe', chunk_level: 'word' }, onStatus);
    } catch (e) {
      result = await MM.fal.run(MM.settings.whisperModel, { audio_url: audioURL }, onStatus);
    }
    const chunks = result.chunks || result.segments || [];
    const words = [];
    for (const c of chunks) {
      const ts = c.timestamp || [c.start, c.end];
      const s = Number(ts[0]), e = Number(ts[1] ?? ts[0] + 0.4);
      const text = String(c.text || '').trim();
      if (!text || !Number.isFinite(s)) continue;
      const parts = text.split(/\s+/);
      if (parts.length === 1) { words.push({ text, start: s, end: Number.isFinite(e) ? e : s + 0.4 }); continue; }
      const step = ((Number.isFinite(e) ? e : s + parts.length * 0.3) - s) / parts.length;
      parts.forEach((p, i) => words.push({ text: p, start: s + i * step, end: s + (i + 1) * step }));
    }
    return words;
  }

  /// Líneas de habla (para la IA y para bajar la música).
  MM.linesFromWords = (words, maxWords = 8) => {
    const lines = [];
    let cur = [];
    const flush = () => { if (cur.length) lines.push({ start: cur[0].start, end: cur[cur.length - 1].end, text: cur.map((w) => w.text).join(' '), words: cur }); cur = []; };
    for (const w of words) {
      const last = cur[cur.length - 1];
      if (last && (w.start - last.end > 0.6 || cur.length >= maxWords || /[.?!]$/.test(last.text))) flush();
      cur.push(w);
    }
    flush();
    return lines;
  };
})();
