// Motores GRATIS de IA open source:
//  • Hugging Face: demos públicos de modelos de video open source (LTX-Video, Wan). Sin instalar nada.
//  • Google Colab: tu propio servidor gratis (cuaderno en web/colab/) con video, subtítulos, música y voz.
//  • Whisper en tu navegador: subtítulos 100% gratis en el teléfono o la laptop.
(function () {
  MM.DEFAULT_HF_SPACES = 'Lightricks/ltx-video-distilled, multimodalart/wan2-1-fast, Wan-AI/Wan-2.2-5B, Lightricks/LTX-Video-Playground';

  /// Qué motor de video se usa: Colab si pegaste su link, si no Hugging Face (o fal.ai si lo elegiste).
  MM.videoEngine = () => {
    const pick = MM.settings.videoEngine || 'auto';
    if (pick === 'fal') return MM.settings.falKey ? 'fal' : 'hf';
    if (pick === 'colab') return MM.settings.colabURL ? 'colab' : 'hf';
    if (pick === 'hf') return 'hf';
    return MM.settings.colabURL ? 'colab' : 'hf';
  };
  MM.videoAvailable = () => true;   // Hugging Face siempre está (con fila y cuota diaria)
  MM.engineLabel = () => ({ colab: 'Colab (gratis)', hf: 'Hugging Face (gratis)', fal: 'fal.ai' })[MM.videoEngine()];

  const dataURLtoBlob = async (u) => (await fetch(u)).blob();
  const dims = (aspect) => (aspect === '16:9' ? [768, 448] : aspect === '1:1' ? [576, 576] : [448, 768]);

  // ---------- Hugging Face (Gradio) ----------
  let gradioMod = null;
  const gradio = async () => {
    if (gradioMod) return gradioMod;
    try { gradioMod = await import('https://cdn.jsdelivr.net/npm/@gradio/client@2.7.2/dist/browser.js'); }
    catch { throw new Error('No pude conectar con Hugging Face. Revisa tu internet e intenta otra vez.'); }
    return gradioMod;
  };

  /// Busca en el demo el botón que hace video y llena sus campos (prompt, imagen, duración, tamaño…).
  function pickEndpoint(api, wantImage) {
    const all = Object.entries(api.named_endpoints || {}).map(([name, info]) => ({ name, info }));
    const isVideoOut = (ep) => (ep.info.returns || []).some((r) => /video/i.test(r.component || '') || /video/i.test(r.label || ''));
    const hasText = (ep) => (ep.info.parameters || []).some((p) => /text/i.test(p.component || '') && /prompt/i.test((p.label || '') + p.parameter_name) && !/neg/i.test((p.label || '') + p.parameter_name));
    const needsImage = (ep) => (ep.info.parameters || []).some((p) => /image/i.test(p.component || '') && !p.parameter_has_default);
    const usable = all.filter((ep) => isVideoOut(ep) && hasText(ep));
    const score = (ep) => {
      const n = ep.name.toLowerCase();
      let s = 0;
      if (wantImage && /image|i2v|img/.test(n)) s += 3;
      if (!wantImage && /text|t2v|generate/.test(n)) s += 2;
      if (!wantImage && needsImage(ep)) s -= 10;
      return s;
    };
    return usable.sort((a, b) => score(b) - score(a))[0] || null;
  }
  function buildArgs(params, v, handle_file) {
    const out = {};
    const [w, h] = dims(v.aspect);
    for (const p of params) {
      const key = ((p.label || '') + ' ' + p.parameter_name).toLowerCase();
      const comp = (p.component || '').toLowerCase();
      let val = p.parameter_has_default ? p.parameter_default : undefined;
      if (/neg/.test(key) && /text/.test(comp)) val = 'blurry, low quality, distorted, watermark, text, logo, deformed';
      else if (/prompt/.test(key) && /text/.test(comp)) val = v.prompt;
      else if (/image/.test(comp)) val = v.image ? handle_file(v.image) : (p.parameter_has_default ? p.parameter_default : null);
      else if (/video/.test(comp)) val = p.parameter_has_default ? p.parameter_default : null;
      else if (/duration|second/.test(key)) val = v.seconds;
      else if (/width/.test(key)) val = w;
      else if (/height/.test(key)) val = h;
      else if (/mode/.test(key) && /radio|dropdown/.test(comp) && Array.isArray(p.parameter_default) === false) val = val ?? (v.image ? 'image-to-video' : 'text-to-video');
      else if (/randomize|random seed/.test(key)) val = true;
      if (val === undefined) {
        const t = (p.python_type && p.python_type.type) || '';
        val = /bool/.test(t) ? false : /int|float|number/.test(t) ? 0 : /str/.test(t) ? '' : null;
      }
      out[p.parameter_name] = val;
    }
    return out;
  }
  function findVideoURL(data) {
    const stack = [data];
    while (stack.length) {
      const x = stack.pop();
      if (!x) continue;
      if (typeof x === 'string' && /^https?:.*\.(mp4|webm|mov)(\?|$)/i.test(x)) return x;
      if (typeof x === 'object') {
        if (typeof x.url === 'string' && (/\.(mp4|webm|mov)/i.test(x.url) || /video/.test(x.mime_type || ''))) return x.url;
        if (x.video) stack.push(x.video);
        Object.values(x).forEach((y) => { if (y && typeof y === 'object') stack.push(y); else if (typeof y === 'string') stack.push(y); });
      }
    }
    return null;
  }

  MM.hfVideo = async ({ prompt, imageURL, seconds, aspect }, onStatus) => {
    const { Client, handle_file } = await gradio();
    const spaces = (MM.settings.hfSpaces || MM.DEFAULT_HF_SPACES).split(/[\s,]+/).filter(Boolean);
    const image = imageURL ? await dataURLtoBlob(imageURL) : null;
    const errors = [];
    for (const space of spaces) {
      try {
        onStatus?.(`conectando con ${space.split('/')[1]}…`);
        const opts = { events: ['data', 'status'] };
        if (MM.settings.hfToken) opts.token = MM.settings.hfToken;
        const app = await Client.connect(space, opts);
        const ep = pickEndpoint(await app.view_api(), !!image);
        if (!ep) { errors.push(`${space}: no tiene video`); continue; }
        const args = buildArgs(ep.info.parameters || [], { prompt, image, seconds, aspect }, handle_file);
        let result = null;
        for await (const msg of app.submit(ep.name, args)) {
          if (msg.type === 'status') {
            if (msg.stage === 'pending') onStatus?.(`en fila${msg.position != null ? ' #' + (msg.position + 1) : ''} (gratis)`);
            else if (msg.stage === 'generating') onStatus?.('generando gratis…');
            else if (msg.stage === 'error') throw new Error(msg.message || 'el demo falló');
          }
          if (msg.type === 'data') { result = msg.data; break; }
        }
        const url = findVideoURL(result);
        if (!url) { errors.push(`${space}: no devolvió video`); continue; }
        onStatus?.('descargando…');
        const headers = MM.settings.hfToken ? { Authorization: 'Bearer ' + MM.settings.hfToken } : {};
        const blob = await fetch(url, { headers }).then((r) => { if (!r.ok) throw new Error('descarga ' + r.status); return r.blob(); });
        return MM.loadSource(blob, 'IA gratis: ' + prompt.slice(0, 40), 'video');
      } catch (e) {
        errors.push(`${space.split('/')[1]}: ${String(e.message || e).slice(0, 120)}`);
      }
    }
    throw new Error('Los demos gratis de Hugging Face están llenos o sin cuota ahora (' + errors.slice(0, 2).join(' · ') +
      '). Prueba en unos minutos, conecta tu Colab gratis, o pon tu token gratis de Hugging Face en Ajustes para tener más cuota.');
  };

  // ---------- Google Colab (tu servidor gratis) ----------
  const colabBase = () => (MM.settings.colabURL || '').trim().replace(/\/+$/, '');
  async function colabJob(path, body, onStatus) {
    const base = colabBase();
    if (!base) throw new Error('Pega el link de tu Colab en Ajustes.');
    let r;
    try {
      r = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    } catch { throw new Error('No conecto con tu Colab. ¿Sigue abierto y corriendo? (el link cambia cada vez que lo arrancas)'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.id) throw new Error('Colab: ' + (j.detail || j.error || r.status));
    const started = Date.now();
    for (;;) {
      await MM.sleep(2000);
      const s = await fetch(base + '/job/' + j.id).then((x) => x.json()).catch(() => ({ status: 'unknown' }));
      if (s.status === 'done') return fetch(base + '/file/' + j.id).then((x) => { if (!x.ok) throw new Error('Colab: archivo'); return x; });
      if (s.status === 'error') throw new Error('Colab: ' + (s.error || 'falló'));
      if (s.status === 'queued') onStatus?.(`en fila en tu Colab${s.position ? ' #' + s.position : ''}`);
      else if (s.status === 'running') onStatus?.(`tu Colab está generando… ${s.progress ? Math.round(s.progress * 100) + '%' : Math.round((Date.now() - started) / 1000) + 's'}`);
      if (Date.now() - started > 30 * 60 * 1000) throw new Error('Tu Colab tardó demasiado.');
    }
  }
  MM.colabVideo = async ({ prompt, imageURL, seconds, aspect }, onStatus) => {
    const res = await colabJob('/video', { prompt, image: imageURL || null, seconds, aspect }, onStatus);
    return MM.loadSource(await res.blob(), 'IA Colab: ' + prompt.slice(0, 40), 'video');
  };
  MM.colabTranscribe = async (wavDataURL, onStatus) => {
    const res = await colabJob('/transcribe', { audio: wavDataURL }, onStatus);
    return (await res.json()).words || [];
  };
  MM.colabMusic = async (prompt, seconds, onStatus) => (await colabJob('/music', { prompt, seconds }, onStatus)).arrayBuffer();
  MM.colabVoice = async (text, onStatus) => (await colabJob('/tts', { text }, onStatus)).arrayBuffer();

  // ---------- Whisper en el navegador (subtítulos gratis) ----------
  let asr = null;
  async function localASR(onStatus) {
    if (asr) return asr;
    onStatus?.('bajando el modelo de subtítulos (una sola vez)…');
    let tf;
    try { tf = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1'); }
    catch {
      try { tf = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/+esm'); }
      catch { throw new Error('no pude bajar el modelo de subtítulos (revisa tu internet, o conecta tu Colab gratis).'); }
    }
    const device = navigator.gpu ? 'webgpu' : 'wasm';
    asr = await tf.pipeline('automatic-speech-recognition', 'onnx-community/whisper-base_timestamped', {
      device, dtype: device === 'webgpu' ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : 'q8',
      progress_callback: (p) => { if (p.status === 'progress' && p.progress) onStatus?.(`bajando el modelo de subtítulos… ${Math.round(p.progress)}%`); },
    });
    return asr;
  }
  /// Audio a 16 kHz mono para Whisper.
  function to16k(buffer) {
    const rate = 16000, len = Math.floor(buffer.duration * rate), out = new Float32Array(len);
    const ratio = buffer.sampleRate / rate, chans = buffer.numberOfChannels;
    for (let c = 0; c < chans; c++) { const d = buffer.getChannelData(c); for (let i = 0; i < len; i++) out[i] += d[Math.min(d.length - 1, Math.floor(i * ratio))] / chans; }
    return out;
  }
  MM.localTranscribe = async (buffer, onStatus) => {
    const pipe = await localASR(onStatus);
    onStatus?.('escuchando el audio en tu equipo…');
    const r = await pipe(to16k(buffer), { return_timestamps: 'word', chunk_length_s: 30, stride_length_s: 5, task: 'transcribe' });
    return (r.chunks || []).map((c) => ({ text: String(c.text || '').trim(), start: c.timestamp[0], end: c.timestamp[1] ?? c.timestamp[0] + 0.3 }))
      .filter((w) => w.text && Number.isFinite(w.start));
  };
})();
