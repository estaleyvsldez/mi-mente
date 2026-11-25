// IA: Claude (equipo de agentes expertos) + fal.ai (video generativo, transcripción).
(function () {
  const MODEL = 'claude-opus-5-5';

  // ---------- Claude ----------
  async function claude({ system, content, schema, effort = 'low', maxTokens = 16000, timeoutMs = 180000 }) {
    const key = (MM.settings.anthropicKey || '').trim();
    if (!key) throw new Error('Falta tu API key de Anthropic (Ajustes ⚙︎).');
    let cap = maxTokens;
    for (let attempt = 1; ; attempt++) {
      const body = {
        model: MODEL, max_tokens: cap, system,
        messages: [{ role: 'user', content }],
        output_config: { effort, format: { type: 'json_schema', schema } },
        fallbacks: 'default',
      };
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      let res;
      try {
        res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST', signal: ctrl.signal,
          headers: {
            'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2026-10-21',
            'anthropic-beta': 'server-side-fallback-2026-07-01', 'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify(body),
        });
      } catch (e) {
        clearTimeout(timer);
        if (attempt < 3) { await MM.sleep(1500 * attempt); continue; }
        throw new Error(e.name === 'AbortError' ? 'La IA tardó demasiado en responder. Intenta de nuevo.' : 'Sin conexión con la IA.');
      }
      clearTimeout(timer);
      if ((res.status === 429 || res.status === 529 || res.status >= 500) && attempt < 5) {
        const ra = parseFloat(res.headers.get('retry-after'));
        await MM.sleep(Number.isFinite(ra) ? Math.min(60, ra) * 1000 : 2000 * attempt * attempt);
        continue;
      }
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error('Tu API key de Anthropic no es válida (Ajustes ⚙︎).');
      if (!res.ok) throw new Error('La IA respondió con un error: ' + (json.error?.message || res.status));
      if (json.stop_reason === 'refusal') throw new Error('La IA no quiso hacer eso. Pídelo de otra forma.');
      if (json.stop_reason === 'max_tokens') {
        if (attempt < 3 && cap < 64000) { cap = Math.min(64000, cap * 2); continue; }
        throw new Error('La respuesta quedó cortada. Intenta de nuevo.');
      }
      const text = (json.content || []).find((b) => b.type === 'text')?.text;
      if (!text) throw new Error('La IA no devolvió nada.');
      return JSON.parse(text);
    }
  }

  // ---------- fal.ai ----------
  MM.fal = {
    async run(model, input, onStatus) {
      const key = (MM.settings.falKey || '').trim();
      if (!key) throw new Error('Falta tu key de fal.ai (Ajustes ⚙︎).');
      const headers = { Authorization: 'Key ' + key, 'Content-Type': 'application/json' };
      const sub = await fetch('https://queue.fal.run/' + model, { method: 'POST', headers, body: JSON.stringify(input) });
      const sj = await sub.json().catch(() => ({}));
      if (sub.status === 401 || sub.status === 403) throw new Error('Tu key de fal.ai no es válida.');
      if (!sub.ok || !sj.status_url) throw new Error('fal.ai: ' + errText(sj, sub.status));
      const started = Date.now();
      for (;;) {
        await MM.sleep(2500);
        if (Date.now() - started > 15 * 60 * 1000) throw new Error('La IA tardó demasiado.');
        const st = await fetch(sj.status_url, { headers }).then((r) => r.json()).catch(() => ({}));
        if (st.status === 'IN_QUEUE') onStatus?.(`en fila${st.queue_position != null ? ' (#' + (st.queue_position + 1) + ')' : ''}`);
        else if (st.status === 'IN_PROGRESS') onStatus?.(`generando… ${Math.round((Date.now() - started) / 1000)}s`);
        else if (st.status === 'COMPLETED') {
          const r = await fetch(sj.response_url, { headers });
          const rj = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error('fal.ai: ' + errText(rj, r.status));
          return rj;
        }
      }
    },
    videoURL(j) { return j?.video?.url || j?.videos?.[0]?.url || null; },
  };
  function errText(j, status) {
    if (typeof j?.detail === 'string') return j.detail;
    if (Array.isArray(j?.detail)) return j.detail.map((d) => d.msg).join('; ');
    return j?.error || ('error ' + status);
  }

  /// Genera un clip de video con IA (desde texto o desde una imagen).
  MM.generateClip = async ({ prompt, camera, imageURL, seconds, aspect }, onStatus) => {
    const full = `${prompt}. Camera: ${MM.CAMERA_TEXT[camera] || 'steady camera'}.`;
    const engine = MM.videoEngine();
    if (engine === 'colab') return MM.colabVideo({ prompt: full, imageURL, seconds, aspect }, onStatus);
    if (engine === 'hf') return MM.hfVideo({ prompt: full, imageURL, seconds, aspect }, onStatus);
    const model = imageURL ? MM.settings.i2vModel : MM.settings.t2vModel;
    const input = { prompt: full };
    if (imageURL) input.image_url = imageURL;
    if (model.includes('kling')) {
      input.duration = seconds > 7.5 ? '10' : '5';
      if (!imageURL && aspect) input.aspect_ratio = aspect;
    }
    const r = await MM.fal.run(model, input, onStatus);
    const url = MM.fal.videoURL(r);
    if (!url) throw new Error('La IA no devolvió video.');
    onStatus?.('descargando…');
    const blob = await fetch(url).then((x) => { if (!x.ok) throw new Error('descarga'); return x.blob(); });
    return MM.loadSource(blob, 'IA: ' + prompt.slice(0, 40), 'video');
  };

  /// Música original generada con IA (fal.ai).
  MM.generateMusic = async (prompt, onStatus) => {
    if (MM.videoEngine() !== 'fal') {
      if (!MM.settings.colabURL) throw new Error('la música IA gratis necesita tu Colab conectado');
      return MM.audioCtx().decodeAudioData(await MM.colabMusic(prompt, 30, onStatus));
    }
    const r = await MM.fal.run(MM.settings.musicModel, { prompt }, onStatus);
    const url = r?.audio?.url || r?.audio_file?.url || r?.output?.audio?.url || r?.audio_url || (Array.isArray(r?.audios) && r.audios[0]?.url);
    if (!url) throw new Error('La IA no devolvió música.');
    const buf = await fetch(url).then((x) => x.arrayBuffer());
    return MM.audioCtx().decodeAudioData(buf);
  };

  /// Narración con voz IA: devuelve los bytes del audio (para guardarlos y no pagar dos veces).
  MM.generateVoiceBytes = async (text, onStatus) => {
    if (MM.videoEngine() !== 'fal') {
      if (!MM.settings.colabURL) throw new Error('la voz IA gratis necesita tu Colab conectado');
      return MM.colabVoice(text, onStatus);
    }
    const r = await MM.fal.run(MM.settings.ttsModel, { text }, onStatus);
    const url = r?.audio?.url || r?.audio_file?.url || r?.audio_url || r?.output?.url;
    if (!url) throw new Error('La IA no devolvió la voz.');
    return fetch(url).then((x) => x.arrayBuffer());
  };

  /// Narración con voz IA (fal.ai). Devuelve un AudioBuffer.
  MM.generateVoice = async (text, onStatus) => {
    const r = await MM.fal.run(MM.settings.ttsModel, { text }, onStatus);
    const url = r?.audio?.url || r?.audio_file?.url || r?.audio_url || r?.output?.url;
    if (!url) throw new Error('La IA no devolvió la voz.');
    const buf = await fetch(url).then((x) => x.arrayBuffer());
    return MM.audioCtx().decodeAudioData(buf);
  };

  MM.CAMERA_TEXT = {
    static: 'static locked-off camera', dolly_in: 'slow cinematic dolly-in toward the subject',
    dolly_out: 'dolly-out pulling back to reveal the scene', orbit_left: 'camera orbits around the subject to the left',
    orbit_right: 'camera orbits around the subject to the right', crane_up: 'crane shot rising up over the scene',
    crane_down: 'crane shot descending toward the subject', pan_left: 'smooth pan left', pan_right: 'smooth pan right',
    tilt_up: 'camera tilts up', low_angle: 'dramatic low-angle shot looking up', high_angle: 'high-angle shot looking down',
    top_down: "top-down bird's-eye view", fpv_drone: 'fast FPV drone flythrough', handheld: 'handheld documentary camera',
    crash_zoom: 'sudden crash zoom into the subject', bullet_time: 'bullet-time frozen moment, camera sweeping around',
    close_up: 'extreme close-up', wide_shot: 'wide establishing shot', tracking: 'tracking shot following the subject',
    slow_motion: 'slow-motion, high frame rate look',
  };
  MM.CAMERAS = Object.keys(MM.CAMERA_TEXT);

  // ---------- Esquemas ----------
  const S = { type: 'string' }, N = { type: 'number' }, I = { type: 'integer' }, B = { type: 'boolean' };
  const E = (values) => ({ type: 'string', enum: values });
  const A = (items) => ({ type: 'array', items });
  const O = (props) => ({ type: 'object', properties: props, required: Object.keys(props).sort(), additionalProperties: false });
  const FORMATS = ['original', '9:16', '4:5', '1:1', '16:9', '21:9'];
  const wheel = O({ hue: N, amount: N, luma: N });
  const SFX_OR_NONE = () => E(['none', ...MM.SFX_TYPES]);
  const gradeSchema = () => O({
    preset: E(MM.LOOK_NAMES), presetIntensity: N, exposure: N, contrast: N, highlights: N, shadows: N, whites: N,
    blacks: N, temperature: N, tint: N, saturation: N, vibrance: N, lift: wheel, gamma: wheel, gain: wheel,
    splitShadows: S, splitHighlights: S, splitAmount: N, fade: N, grain: N, vignette: N, bloom: N, sharpen: N, skinProtect: N,
  });
  const segmentSchema = () => O({
    id: I, kind: E(['clip', 'ai_video']), source: I, sourceStart: N, sourceEnd: N, speed: N, focusX: N, focusY: N,
    transitionIn: O({ type: E(MM.TRANSITIONS), duration: N }),
    aiPrompt: S, aiCamera: E(MM.CAMERAS), aiUseFrame: B, aiDuration: N,
  });
  const textSchema = () => O({
    text: S, segmentIndex: I, startOffset: N, duration: N, x: N, y: N, font: E(MM.FONT_NAMES), weight: E(MM.WEIGHT_NAMES),
    size: N, color: S, gradientColor: S, strokeColor: S, strokeWidth: N, shadow: N, glowColor: S, glowAmount: N,
    background: E(MM.TEXT_BG), backgroundColor: S, uppercase: B, letterSpacing: N, align: E(['left', 'center', 'right']),
    rotation: N, maxWidth: N, animationIn: E(MM.ANIM_IN), animationOut: E(MM.ANIM_OUT), loop: E(MM.LOOPS), sfx: SFX_OR_NONE(),
  });
  const captionsSchema = () => O({
    enabled: B, template: E(MM.CAPTION_TEMPLATES), font: E(MM.FONT_NAMES), color: S, highlightColor: S, y: N, size: N,
    uppercase: B, maxWords: I,
  });
  const effectSchema = () => O({
    type: E(MM.EFFECTS), segmentIndex: I, startOffset: N, duration: N, intensity: N, color: S, secondaryColor: S, sfx: SFX_OR_NONE(),
  });
  const audioSchema = () => O({
    voiceVolume: N, cleanup: N, voicePreset: E(MM.VOICE_PRESETS), eqLow: N, eqMid: N, eqHigh: N, compression: N,
    reverb: N, music: S, musicVolume: N, musicStart: N, ducking: N, fadeInOut: B, musicMood: E(MM.MUSIC_MOODS), musicPrompt: S,
  });
  const sfxSchema = () => O({ type: E(MM.SFX_TYPES), segmentIndex: I, startOffset: N, volume: N });

  // ---------- Contexto compartido (idéntico para todos los expertos → se reutiliza la caché) ----------
  function cachedContext(project) {
    const content = [];
    // Cuadros repartidos entre todos los videos (no solo el primero).
    const pools = project.sources.map((src, si) => (src.frames || []).map((f) => ({ si, src, f })));
    const picked = [];
    for (let round = 0; picked.length < 16 && pools.some((p) => p.length > round); round++) {
      pools.forEach((p) => { if (p[round] && picked.length < 16) picked.push(p[round]); });
    }
    picked.sort((a, b) => a.si - b.si || a.f.time - b.f.time).forEach(({ si, src, f }) => {
      content.push({ type: 'text', text: `Source ${si} (${src.kind}) frame at ${f.time.toFixed(1)}s:` });
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.data } });
    });
    const lines = ['SOURCES:'];
    project.sources.forEach((src, si) => {
      lines.push(`- source ${si}: ${src.kind}, ${src.kind === 'image' ? 'still image' : src.duration.toFixed(2) + ' s'}, ${src.width}x${src.height}${src.audio ? ', has audio' : ', no audio'}`);
      const speech = MM.linesFromWords(src.words || []);
      if (speech.length) {
        lines.push('  transcript (source seconds):');
        speech.forEach((l) => lines.push(`  [${l.start.toFixed(2)}–${l.end.toFixed(2)}] ${l.text}`));
      }
    });
    if (project.reference) lines.push('', 'REFERENCE STYLE the user wants to match (copy it and make it even better):', project.reference);
    content.push({ type: 'text', text: lines.join('\n'), cache_control: { type: 'ephemeral' } });
    return content;
  }
  /// Lo que cambia seguido (tomas IA, canciones) va después de la caché.
  function volatileContext(project, plan) {
    const content = [];
    const keys = new Set(plan ? plan.segments.filter((s) => s.kind === 'ai_video').map((s) => MM.aiKey(s)) : []);
    Object.entries(project.aiClips || {}).filter(([k]) => keys.has(k)).slice(0, 8).forEach(([, clip]) => {
      const f = (clip.frames || [])[0];
      if (!f) return;
      content.push({ type: 'text', text: `AI-generated shot "${(clip.prompt || '').slice(0, 80)}":` });
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.data } });
    });
    content.push({ type: 'text', text: [
      'Imported songs: ' + (project.songs.length ? project.songs.map((s) => s.name).join(', ') : '(none)'),
      'AI video generation: AVAILABLE via ' + MM.engineLabel() + (MM.videoEngine() === 'hf' ? ' — free public demos: slow and with a daily quota, so use at most 1–2 new ai_video shots and only when they add a lot' : ''),
      'AI music: ' + (MM.videoEngine() === 'fal' || MM.settings.colabURL ? 'available via musicPrompt' : 'only composed mood beds (leave musicPrompt "")'),
    ].join('\n') });
    return content;
  }
  /// Línea de tiempo final con lo que se dice en cada segmento (tiempos relativos al segmento).
  function timelineText(plan, project) {
    const tl = MM.buildTimeline(plan, project);
    const rows = [];
    tl.items.forEach((it) => {
      const s = it.seg;
      rows.push(`#${it.index} (id ${s.id}) ${s.kind} ${s.kind === 'clip' ? `source ${s.source} ${s.sourceStart.toFixed(2)}–${s.sourceEnd.toFixed(2)}s x${s.speed}` : `"${s.aiPrompt.slice(0, 60)}"`} → timeline ${it.start.toFixed(2)}–${(it.start + it.dur).toFixed(2)}s (${it.dur.toFixed(2)} s)`);
      if (s.kind === 'clip' && it.src && it.src.words) {
        const ws = it.src.words.filter((w) => w.start >= s.sourceStart && w.end <= s.sourceEnd).slice(0, 60);
        if (ws.length) rows.push('   says: ' + ws.map((w) => `${w.text}@${((w.start - s.sourceStart) / s.speed).toFixed(1)}`).join(' '));
      }
    });
    return `FINAL TIMELINE (${tl.total.toFixed(2)} s, format ${plan.format}). Offsets are seconds after each segment starts:\n` + rows.join('\n');
  }

  const PLATFORM = `PLATFORM & FORMAT (decide from the user's words, also in slang): "reel", "reels", "tiktok", "short(s)", "historia/story", "para el cel", "vertical" → format 9:16 short-form: hook in the first 1–2 s, fast cuts, big captions (karaoke/word_pop), punch-ins, usually 15–90 s. "post de instagram", "feed" → 4:5. "youtube", "video largo", "vlog largo", "película", "documental", "capítulo", "horizontal", "para la tele" → 16:9 long-form: keep the story and breathing room, classic/boxed captions, lower-thirds, chapter-like structure, effects sparse. "cuadrado" → 1:1. "cine", "cinemático" alone → keep the format but add letterbox/cinematic look. If the user doesn't say, keep the current format. When the format changes, refocus every clip (focusX/focusY on the subject) so nothing important is cropped.`;

  const LANGUAGE = `LANGUAGE & HUMOR: speech can be in any language or dialect and full of slang (Dominican, Mexican, Puerto Rican, Colombian, Venezuelan, Argentine, Spanish, Spanglish, English, Portuguese…). Understand the jokes, double meanings, punchlines, emotional beats and cultural references like a native ("klk", "qué lo qué", "wey", "pana", "un chin", "bien perrón"…), and time the edit to them: comedy → punch_in + boing/record_scratch right after the punchline, quick cuts, meme-style captions; suspense → slow zoom_in, darker look, suspense_drone/heartbeat, longer shots; scare → flash + shake + horror_sting on the jump; hype → fast cuts, glitch, bass_drop. Reply to the user in the language/slang they write in.`;

  const SECTIONS = {
    story: `ROLE story — THE EDITOR (cuts, structure, pacing, transitions, format, AI shots).
segments[] in timeline order. id: keep the id of every segment you keep or modify (copy it exactly); use -1 for NEW segments.
- kind "clip": source (index), sourceStart/sourceEnd in source seconds (≥0.4 s; for images 0→1.5–4 s), speed 0.25–4, focusX/focusY (0–1, y from top) = the subject to keep when the format crops. For clips: aiPrompt "", aiCamera "static", aiUseFrame false, aiDuration 0.
- kind "ai_video" (only if AI video generation is AVAILABLE): a NEW shot from a video model (like Higgsfield). aiPrompt: vivid English description of subject, action, setting, lighting, style — do NOT describe camera movement there, use aiCamera. aiUseFrame true = starts from the frame of the source at sourceStart (same person/place, new angle or motion). aiDuration 5 or 10. Costs money and minutes: max 1–3 new ones, only when asked or clearly valuable. An existing ai_video you keep MUST keep its id (then it is not regenerated). For ai_video set sourceEnd = sourceStart, speed 1.
- transitionIn: first must be "none". none (hard cut), crossfade, fade_black, flash_white, zoom_in, zoom_out, slide_left, slide_right, slide_up, whip_pan, spin, glitch, blur, iris, wipe, light_leak; 0.15–1.0 s. Cuts on action/speech beats are usually best; fancy transitions sparingly.
Craft: cut on word boundaries from the transcript, remove silences/filler/false starts, never cut mid-sentence, vary rhythm, end clean. Short-form vertical (TikTok/Reels): hook in the first 2 s, fast pace. Long-form (YouTube, films, chapters): keep the story and breathing room, no frantic cutting. format: original, 9:16, 4:5, 1:1, 16:9, 21:9 (keep original unless asked or clearly better).`,
    color: `ROLE color — THE COLORIST. Return one grade. Neutral = zeros, presetIntensity 1, skinProtect 0.5.
preset (full look mixed by presetIntensity): ${MM.LOOK_NAMES.join(', ')}.
exposure −2..2 EV; contrast, highlights, shadows, whites, blacks, temperature (−cool/+warm), tint (−green/+magenta), saturation, vibrance −1..1; lift/gamma/gain wheels {hue 0–360, amount 0–1, luma −1..1}; splitShadows/splitHighlights hex + splitAmount 0–1; fade, grain, vignette, bloom, sharpen 0–1; skinProtect 0–1.
First correct what you see in the frames (exposure, white balance, skin), then build a look that fits the content and mood. Bold looks are welcome when asked ("colores fuertes").`,
    text: `ROLE text — THE MOTION DESIGNER (titles, text overlays, captions). Use the FINAL TIMELINE (it shows what is said in each segment with offsets).
texts[]: segmentIndex (timeline #) + startOffset (s after that segment starts) + duration; x,y center 0–1 (y from top: 0.12 top, 0.5 center, 0.75 lower third); font ${MM.FONT_NAMES.join('|')}; weight ${MM.WEIGHT_NAMES.join('|')}; size = fraction of width (0.05 small, 0.09 big, 0.14+ huge); color, gradientColor (""=none), strokeColor + strokeWidth 0–1, shadow 0–1, glowColor (""=none) + glowAmount 0–1, background none|box|pill|bar|outline + backgroundColor (hex, 8-digit allowed), uppercase, letterSpacing −0.1..0.5, align, rotation deg, maxWidth 0.2–1, animationIn ${MM.ANIM_IN.join('|')}, animationOut ${MM.ANIM_OUT.join('|')}, loop ${MM.LOOPS.join('|')}; sfx = the sound when it appears (pop, whoosh, impact, typing for typewriter, ding…) or "none".
captions (from speech, auto-timed): enabled only if there is a transcript; template ${MM.CAPTION_TEMPLATES.join('|')} (karaoke/word_pop great for vertical social; classic/boxed for long-form); font, color, highlightColor, y (~0.78), size (~0.055), uppercase, maxWords 3–6.
Design with intent: few words, strong hierarchy, max 2 font families, keep texts clear of captions and faces. Slang/dialect spelling in captions is intentional.
Texts with "userEdited": true were placed or edited BY HAND by the user: return them unchanged (same text, x, y, size) unless the instruction explicitly asks to change that text.`,
    vfx: `ROLE vfx — THE VFX ARTIST. effects[]: type ${MM.EFFECTS.join('|')}; segmentIndex (timeline #, or −1 = whole video where startOffset counts from the video start); startOffset; duration (0 = until end of segment/video); intensity 0–1; color/secondaryColor ("" = default; duotone and light_leak use them); sfx = the matching sound (punch_in→impact or hit, shake→impact/boom, flash→hit, glitch→glitch, light_leak→whoosh…) or "none".
Camera moves (zoom_in, zoom_out, punch_in on emphasis words/punchlines using the word offsets, ken_burns for stills, shake for impacts, handheld for life) + style moments (flash on a hit, glitch for energy, light_leak for warm montages, vhs/old_film for retro, letterbox for cinematic). Create 2–6 deliberate "wow" moments (more for long videos, spread out); never random noise.`,
    sound: `ROLE sound — THE SOUND ENGINEER. audio: voiceVolume 0–2; cleanup 0–1 (removes rumble/hiss, evens the voice); voicePreset ${MM.VOICE_PRESETS.join('|')}; eqLow/eqMid/eqHigh −1..1 (±12 dB); compression 0–1; reverb 0–1; music = exact name of an imported song or ""; musicVolume 0–1 (0.2–0.35 under speech, 0.7–0.9 montage); musicStart (seconds into the song, start at the drop/chorus); ducking 0–1; fadeInOut. For talking videos a light cleanup (0.4), podcast or natural, compression ~0.5 sounds pro.
MUSIC: if no song is imported and music fits, set music "" and musicMood (${MM.MUSIC_MOODS.join('|')}) — the app composes a bed in that mood, or generates real AI music when musicPrompt is a vivid English description (genre, instruments, tempo, energy); musicPrompt "" = composed bed.
SFX ARSENAL (sfx[]): ${MM.SFX_TYPES.join(', ')}. Each: segmentIndex (timeline #, or −1 for absolute time from the video start) + startOffset (may be −1..0 to land just before a cut) + volume 0–1.5. Texts and effects already bring their own sounds; you add the rest: whoosh/swoosh_fast/swipe on transitions, riser before a reveal or drop, bass_drop on the drop, cash on money talk, ding/notification on tips. Comedy: boing, record_scratch, fail_trombone, crowd_laugh right after the punchline (use the word offsets). Suspense/horror: suspense_drone, heartbeat, horror_sting, thunder, wind. Usually 3–12; never bury the speech.`,
  };

  /// Un solo "manual del equipo" para todos los expertos: así la caché se comparte entre ellos.
  const HANDBOOK = `${LANGUAGE}
${PLATFORM}
You are one expert of a team of AI editors inside a mobile video app. Each call names your ROLE; you only return your own department's part and the app merges everything and renders it frame by frame. Work fast and decisively, with the taste of a top creator / commercial / film editor. "reply": 1 short casual sentence in the user's language about what you did.

${Object.values(SECTIONS).join('\n\n')}`;

  // ---------- Los expertos ----------
  MM.AGENTS = {
    producer: { name: 'Productor', icon: '🧭' },
    story: { name: 'Editor', icon: '🎬' },
    color: { name: 'Colorista', icon: '🎨' },
    text: { name: 'Diseñador', icon: '✍️' },
    vfx: { name: 'VFX', icon: '✨' },
    sound: { name: 'Sonido', icon: '🎧' },
    director: { name: 'Director IA', icon: '🎥' },
    generator: { name: 'Generador', icon: '🤖' },
    qa: { name: 'Calidad', icon: '🛡️' },
    writer: { name: 'Guionista', icon: '📝' },
  };

  const PRODUCER = `${LANGUAGE}
${PLATFORM}
If the request implies a platform/format change, the story department must set the new format and refocus clips, and text/vfx/sound must adapt to it (caption style, pacing of effects).
You are the PRODUCER of a team of expert video editors. The user asks for a change to an existing edit (they write casually, often with slang). Decide which departments must act and write each one a precise English instruction ("" = that department does nothing):
- story: cuts, order, length, speed, transitions, format, AI-generated shots / new camera angles
- color: color grade / look
- text: titles, text overlays, captions/subtitles
- vfx: zooms, shakes, glitch, flashes, light leaks and other effects
- sound: voice cleanup, voice effects, EQ, music (songs, mood beds, AI music), volume, sound effects
Only activate what the request needs (often 1–2 departments). Use the recent conversation to resolve "más", "otra vez", "como antes". The user may also edit by hand (userManualEdits): keep those decisions unless the new request changes them. If story will add/remove/reorder segments, also tell text, vfx and sound to re-check their timing. "reply": 1 short casual sentence in the user's language saying who is working on it.`;

  const QA = `You are the QUALITY CONTROL DEPARTMENT of a professional video studio. Nothing is published without your approval. You see real frames of the FINAL render (each labeled with its segment and the texts/effects active then) plus the plan. Judge like a broadcast QC + senior editor:
- text: legible (contrast, size), not cut off, not covering faces or captions, inside safe margins, real typos (dialect/slang spellings and meme captions are intentional — never flag them), timing makes sense
- color: no accidental crushed blacks/blown highlights, natural skin unless a stylized look is intended, consistent shots
- story: strong opening, no cuts mid-sentence, pacing fits the platform, transitions not overused, no black/missing shots
- vfx: effects support moments, not overused
- sound: music level sensible under speech, effects not excessive
Each issue: severity blocker|major|minor, ONE department (story|color|text|vfx|sound), the segment (#), and a precise English fix. approved = true when there are no blocker or major issues. If previous-round issues are listed, verify whether they were fixed instead of inventing new nitpicks. score 0–100. summary: 1–2 sentences in Spanish for the user.`;

  const DIRECTOR = `You are an AI FILM DIRECTOR (like Higgsfield) planning a short video made entirely with a text-to-video model. Write 1–6 shots that tell the user's idea visually, with continuity: repeat the same exact character description (age, look, wardrobe), setting, lighting and style string in every shot. Each prompt: vivid English, shot size + subject + one continuous action + environment + lighting + style, ≤ 60 words, no on-screen text, and do NOT describe camera movement in the prompt (use "camera"). seconds: 5 or 10. format: decide from the user's words (reel/tiktok/short → 9:16; youtube/película/largo → 16:9; post → 4:5; default 9:16). "reply": 1 short casual sentence in the user's language.`;

  const SCHEMAS = {
    story: () => O({ reply: S, title: S, summary: S, format: E(FORMATS), segments: A(segmentSchema()) }),
    color: () => O({ reply: S, color: gradeSchema() }),
    text: () => O({ reply: S, texts: A(textSchema()), captions: captionsSchema() }),
    vfx: () => O({ reply: S, effects: A(effectSchema()) }),
    sound: () => O({ reply: S, audio: audioSchema(), sfx: A(sfxSchema()) }),
    producer: () => O({ reply: S, story: S, color: S, text: S, vfx: S, sound: S }),
    qa: () => O({ approved: B, score: N, summary: S, issues: A(O({ severity: E(['blocker', 'major', 'minor']), department: E(['story', 'color', 'text', 'vfx', 'sound']), segment: I, problem: S, fix: S })) }),
    director: () => O({ reply: S, title: S, format: E(['9:16', '16:9', '1:1', '4:5']), shots: A(O({ prompt: S, camera: E(MM.CAMERAS), seconds: N })) }),
  };

  function partOf(dept, plan) {
    switch (dept) {
      case 'story': return { title: plan.title, summary: plan.summary, format: plan.format, segments: plan.segments };
      case 'color': return { color: plan.color };
      case 'text': return { texts: plan.texts, captions: plan.captions };
      case 'vfx': return { effects: plan.effects };
      case 'sound': return { audio: plan.audio, sfx: (plan.sfx || []).filter((x) => !x.from || x.from === 'sound') };
    }
    return {};
  }

  async function runExpert(dept, project, plan, instruction, effort, userWords) {
    const content = [...cachedContext(project), ...volatileContext(project, plan)];
    const parts = [`ROLE: ${dept}`];
    if (plan) parts.push(timelineText(plan, project));
    if (project.manualNotes && project.manualNotes.length) parts.push('MANUAL EDITS the user made by hand (respect them unless asked otherwise): ' + project.manualNotes.slice(-12).join('; '));
    if (userWords) parts.push('USER SAID (verbatim, may be slang): ' + userWords);
    if (plan) parts.push('CURRENT ' + dept.toUpperCase() + ' (keep anything the instruction does not ask to change):\n' + JSON.stringify(partOf(dept, plan)));
    parts.push('INSTRUCTION: ' + instruction);
    content.push({ type: 'text', text: parts.join('\n\n') });
    return claude({ system: HANDBOOK, content, schema: SCHEMAS[dept](), effort, maxTokens: dept === 'story' ? 32000 : 16000, timeoutMs: dept === 'story' ? 300000 : 180000 });
  }

  const segById = (plan, id) => plan.segments.find((s) => s.id === id);
  /// Une el trabajo de un experto al plan sin pisar lo de los demás.
  function applyPart(plan, dept, r) {
    switch (dept) {
      case 'story': {
        const old = plan.segments || [];
        const segs = (r.segments || []).map((s) => {
          const prev = s.id >= 0 ? old.find((o) => o.id === s.id) : null;
          // Una toma IA que se conserva no se vuelve a generar (ni a cobrar).
          if (prev && prev.kind === 'ai_video' && s.kind === 'ai_video') {
            Object.assign(s, { aiPrompt: prev.aiPrompt, aiCamera: prev.aiCamera, aiUseFrame: prev.aiUseFrame, aiDuration: prev.aiDuration, source: prev.source, sourceStart: prev.sourceStart });
          }
          if (!prev) s.id = -1;
          return s;
        });
        Object.assign(plan, { title: r.title, summary: r.summary, format: r.format, segments: segs });
        break;
      }
      case 'color': plan.color = r.color; break;
      case 'text': {
        const manual = (plan.texts || []).filter((t) => t.userEdited);
        const next = (r.texts || []).map((t) => withSegId(plan, t));
        const used = new Set();
        manual.forEach((m) => {
          const match = next.find((t) => !used.has(t) && t.text.trim().toLowerCase() === m.text.trim().toLowerCase());
          if (match) { used.add(match); Object.assign(match, { x: m.x, y: m.y, size: m.size, rotation: m.rotation, userEdited: true }); }
          else next.push(m);   // lo que el usuario puso a mano no desaparece solo
        });
        plan.sfx = (plan.sfx || []).filter((x) => x.from !== 'text').concat(next.filter((t) => t.sfx && t.sfx !== 'none')
          .map((t) => ({ type: t.sfx, segmentIndex: t.segmentIndex, segmentId: t.segmentId, startOffset: Math.max(-1, (t.startOffset || 0) - 0.05), volume: 0.7, from: 'text' })));
        next.forEach((t) => { delete t.sfx; });
        plan.texts = next;
        if (plan.captions && plan.captions.userEdited) Object.assign(r.captions, { y: plan.captions.y, size: plan.captions.size, userEdited: true });
        plan.captions = r.captions;
        break;
      }
      case 'vfx': {
        const next = (r.effects || []).map((e) => withSegId(plan, e));
        plan.sfx = (plan.sfx || []).filter((x) => x.from !== 'vfx').concat(next.filter((e) => e.sfx && e.sfx !== 'none')
          .map((e) => ({ type: e.sfx, segmentIndex: e.segmentIndex, segmentId: e.segmentId, startOffset: e.startOffset || 0, volume: 0.85, from: 'vfx' })));
        next.forEach((e) => { delete e.sfx; });
        plan.effects = next;
        break;
      }
      case 'sound':
        plan.audio = r.audio;
        plan.sfx = (plan.sfx || []).filter((x) => x.from && x.from !== 'sound').concat((r.sfx || []).map((x) => withSegId(plan, Object.assign({}, x, { from: 'sound' }))));
        break;
    }
  }
  function withSegId(plan, item) {
    const seg = item.segmentIndex >= 0 ? plan.segments[item.segmentIndex] : null;
    item.segmentId = seg ? seg.id : null;
    return item;
  }

  async function runDept(dept, project, plan, instruction, effort, onAgent, userWords) {
    onAgent(dept, 'working');
    try {
      const r = await runExpert(dept, project, plan, instruction, effort, userWords);
      applyPart(plan, dept, r);
      if (dept === 'story') MM.sanitizePlan(plan, project);
      onAgent(dept, 'done', r.reply);
      return true;
    } catch (e) {
      onAgent(dept, 'error', e.message);
      return false;
    }
  }

  /// Primera edición: Editor y Colorista arrancan juntos; luego Diseñador, VFX y Sonido en paralelo.
  MM.teamEdit = async (project, onAgent, onStory) => {
    const plan = MM.sanitizePlan(MM.emptyPlan(project), project);
    const ask = project.request || '';
    const brief = 'Do your department for this edit from scratch, for maximum impact. ' + (ask ? 'The user wants: ' + ask : '');
    const colorPlan = JSON.parse(JSON.stringify(plan));
    const [storyOk] = await Promise.all([
      runDept('story', project, plan, 'Edit this footage from scratch for maximum impact. ' + (ask ? 'The user wants: ' + ask : ''), 'medium', onAgent, ask),
      runDept('color', project, colorPlan, brief, 'low', onAgent, ask),
    ]);
    if (!storyOk) throw new Error('El Editor no pudo armar la edición. Intenta de nuevo.');
    plan.color = colorPlan.color;
    MM.sanitizePlan(plan, project);
    onStory?.(plan);
    await Promise.all(['text', 'vfx', 'sound'].map((d) => runDept(d, project, plan, brief, 'low', onAgent, ask)));
    return MM.sanitizePlan(plan, project);
  };

  /// Cambio pedido por chat: el productor reparte y solo trabajan los expertos necesarios.
  MM.teamRevise = async (project, current, request, onAgent, onStory) => {
    onAgent('producer', 'working');
    const summary = {
      title: current.title, format: current.format, segments: current.segments.length,
      aiShots: current.segments.filter((s) => s.kind === 'ai_video').length,
      look: current.color.preset, texts: current.texts.map((t) => t.text), captions: current.captions.enabled ? current.captions.template : 'off',
      effects: current.effects.map((e) => e.type), music: current.audio.music || current.audio.musicMood || 'none', voice: current.audio.voicePreset,
      sfx: (current.sfx || []).map((x) => x.type), userManualEdits: (project.manualNotes || []).slice(-12),
    };
    let route;
    try {
      route = await claude({
        system: PRODUCER, effort: 'low', maxTokens: 8000, schema: SCHEMAS.producer(), timeoutMs: 90000,
        content: [{ type: 'text', text: `Current edit: ${JSON.stringify(summary)}\nAI video generation: available via ${MM.engineLabel()}\nRecent conversation:\n${(project.chatLog || []).slice(-6).join('\n') || '(none)'}\nUser request (verbatim): ${request}` }],
      });
    } catch (e) { onAgent('producer', 'error', e.message); throw e; }
    onAgent('producer', 'done', route.reply);
    const plan = JSON.parse(JSON.stringify(current));
    const jobs = [];
    if (route.story) {
      const colorPlan = JSON.parse(JSON.stringify(plan));
      await Promise.all([
        runDept('story', project, plan, route.story, 'low', onAgent, request),
        route.color ? runDept('color', project, colorPlan, route.color, 'low', onAgent, request).then((ok) => { if (ok) plan.color = colorPlan.color; }) : null,
      ]);
      MM.sanitizePlan(plan, project);
      onStory?.(plan);
    } else if (route.color) jobs.push(runDept('color', project, plan, route.color, 'low', onAgent, request));
    ['text', 'vfx', 'sound'].filter((d) => route[d]).forEach((d) => jobs.push(runDept(d, project, plan, route[d], 'low', onAgent, request)));
    await Promise.all(jobs);
    return MM.sanitizePlan(plan, project);
  };

  /// Departamento de Control de Calidad: revisa el video final antes de que salga.
  MM.qualityCheck = async (project, plan, snapshots, autoChecks, round, previousIssues) => {
    const content = [];
    snapshots.forEach((s) => {
      content.push({ type: 'text', text: `Final render at ${s.time.toFixed(2)}s${s.label ? ' — ' + s.label : ''}:` });
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: s.data } });
    });
    const tl = MM.buildTimeline(plan, project);
    content.push({ type: 'text', text: [
      timelineText(plan, project),
      'PLAN: ' + JSON.stringify({ format: plan.format, color: plan.color.preset, texts: plan.texts.map((t) => ({ text: t.text, seg: t.segmentIndex, at: t.startOffset, y: t.y, size: t.size, byUser: !!t.userEdited })),
        captions: plan.captions.enabled ? plan.captions.template : 'off', effects: plan.effects.map((e) => e.type + '@' + e.segmentIndex),
        sfx: (plan.sfx || []).length, audio: plan.audio, duration: tl.total.toFixed(1) }),
      'AUTOMATIC CHECKS: ' + (autoChecks.length ? autoChecks.join(' | ') : 'all passed'),
      previousIssues && previousIssues.length ? 'PREVIOUS ROUND ISSUES (verify if fixed): ' + previousIssues.map((i) => `[${i.department} #${i.segment}] ${i.problem}`).join(' | ') : '',
      `Review round ${round}. ${project.request ? 'User goal: ' + project.request : ''}`,
    ].filter(Boolean).join('\n\n') });
    const r = await claude({ system: QA, content, schema: SCHEMAS.qa(), effort: 'low', maxTokens: 16000, timeoutMs: 150000 });
    r.approved = !r.issues.some((i) => i.severity === 'blocker' || i.severity === 'major');
    return r;
  };

  /// Los expertos arreglan lo que pidió Calidad.
  MM.teamFix = async (project, current, issues, onAgent) => {
    const plan = JSON.parse(JSON.stringify(current));
    const byDept = {};
    issues.filter((i) => i.severity !== 'minor').forEach((i) => { (byDept[i.department] = byDept[i.department] || []).push(`segment #${i.segment}: ${i.fix}`); });
    if (byDept.story) await runDept('story', project, plan, 'Quality control asks: ' + byDept.story.join(' / '), 'low', onAgent);
    await Promise.all(['color', 'text', 'vfx', 'sound'].filter((d) => byDept[d])
      .map((d) => runDept(d, project, plan, 'Quality control asks: ' + byDept[d].join(' / '), 'low', onAgent)));
    return MM.sanitizePlan(plan, project);
  };

  /// Pulido en paralelo de un video ya armado.
  MM.teamPolish = async (project, plan, brief, onAgent, depts = ['color', 'text', 'vfx', 'sound']) => {
    await Promise.all(depts.map((d) => runDept(d, project, plan, brief, 'low', onAgent)));
    return MM.sanitizePlan(plan, project);
  };

  /// "Crea un video de un hombre saltando sobre un carro": el director planea las tomas.
  MM.directShots = async (idea, format) => claude({
    system: DIRECTOR, effort: 'low', maxTokens: 16000, schema: SCHEMAS.director(), timeoutMs: 120000,
    content: [{ type: 'text', text: `Idea: ${idea}\nPreferred format: ${format || '9:16'}\nAvailable camera moves: ${MM.CAMERAS.join(', ')}` }],
  });

  // ---------- Estudio de películas y series ----------
  const WRITER = `${LANGUAGE}
You are the HEAD SCREENWRITER and SHOWRUNNER of a studio that makes films, series and telenovelas entirely with AI video models (text-to-video, 5 or 10 second shots). Write like a pro: strong hooks, conflict, twists, a cliffhanger at the end of each chapter, emotional beats; narration and dialogue in the user's language with natural slang for the setting.
Visual consistency is critical: every character has an extremely specific visual description (age, ethnicity, build, face, hair, wardrobe, distinctive marks) and the production has ONE style string. The app builds each final shot prompt as: style + looks of the characters in the shot + your shot description — so in a shot's "prompt" do NOT repeat looks or style and do NOT describe camera movement (use "camera"). A shot prompt is vivid English: shot size + one continuous action + location + lighting/mood, ≤ 45 words, no on-screen text, no lip-sync dialogue (prefer narration/voice-over and reactions). characters = names of the characters visible. narration ≤ 2.5 words per second of the shot. speaker = who says the narration ("Narrador" or a character name). "reply": 1 short sentence in the user's language.`;
  const characterS = O({ name: S, look: S, voice: S });
  const bibleSchema = () => O({ reply: S, title: S, logline: S, style: S, language: S, characters: A(characterS), chapters: A(O({ number: I, title: S, summary: S })) });
  const shotS = () => O({ prompt: S, characters: A(S), camera: E(MM.CAMERAS), seconds: N, narration: S, speaker: S, sfx: SFX_OR_NONE() });
  const sceneS = () => O({ heading: S, shots: A(shotS()) });
  const scriptSchema = () => O({ reply: S, title: S, musicMood: E(MM.MUSIC_MOODS), scenes: A(sceneS()) });
  const outlineSchema = () => O({ reply: S, title: S, musicMood: E(MM.MUSIC_MOODS), scenes: A(O({ heading: S, beats: S, shots: I })) });
  const bibleBlock = (bible) => ({ type: 'text', text: 'SERIES BIBLE:\n' + JSON.stringify(bible), cache_control: { type: 'ephemeral' } });

  /// Prompt final de una toma: estilo + cómo se ven los personajes + la acción (consistencia entre tomas).
  MM.composeShotPrompt = (bible, shot) => {
    const looks = (shot.characters || []).map((n) => (bible.characters || []).find((c) => c.name.toLowerCase() === String(n).toLowerCase()))
      .filter(Boolean).map((c) => `${c.name}: ${c.look}`).join('. ');
    return [bible.style, looks, shot.prompt].filter(Boolean).join('. ');
  };

  MM.writeBible = (req) => claude({
    system: WRITER, effort: 'medium', maxTokens: 16000, schema: bibleSchema(), timeoutMs: 240000,
    content: [{ type: 'text', text: `Create the production bible.\nKind: ${req.kind}\nPremise from the user: ${req.premise}\nNumber of chapters: ${req.chapters}\nTarget length per chapter: ${req.minutes} min\nVisual style wanted: ${req.style || 'your choice, cinematic'}\nLanguage: ${req.language || 'same as the premise'}` }],
  });
  MM.reviseBible = (bible, instruction) => claude({
    system: WRITER, effort: 'low', maxTokens: 16000, schema: bibleSchema(), timeoutMs: 240000,
    content: [bibleBlock(bible), { type: 'text', text: `The user asks: ${instruction}\nReturn the full updated bible.` }],
  });
  /// Guion de un capítulo. Los capítulos largos se escriben por escenas, varias a la vez.
  MM.writeChapter = async (bible, number, minutes, previous) => {
    const seconds = Math.round(minutes * 60);
    const shotsTotal = Math.max(3, Math.round(seconds / 5));
    const prev = previous ? `Story so far / previous chapter ending: ${previous}\n` : '';
    if (shotsTotal <= 40) {
      return claude({
        system: WRITER, effort: 'medium', maxTokens: 32000, schema: scriptSchema(), timeoutMs: 300000,
        content: [bibleBlock(bible), { type: 'text', text: `${prev}Write the full shooting script for chapter ${number}. Target ≈ ${seconds} s total (sum of shot seconds) ≈ ${shotsTotal} shots of 5 s (10 s only for long takes), grouped into scenes. sfx: one sound effect for the shot or "none".` }],
      });
    }
    const outline = await claude({
      system: WRITER, effort: 'medium', maxTokens: 16000, schema: outlineSchema(), timeoutMs: 240000,
      content: [bibleBlock(bible), { type: 'text', text: `${prev}Outline chapter ${number}: scenes with their beats and number of 5-second shots each, totaling ≈ ${shotsTotal} shots (${seconds} s).` }],
    });
    const scenes = await Promise.all(outline.scenes.map((sc, i) => claude({
      system: WRITER, effort: 'low', maxTokens: 32000, schema: sceneS(), timeoutMs: 300000,
      content: [bibleBlock(bible), { type: 'text', text: `${prev}Chapter ${number} outline: ${JSON.stringify(outline.scenes.map((s) => ({ heading: s.heading, beats: s.beats })))}\nWrite ONLY scene ${i + 1} ("${sc.heading}": ${sc.beats}) as exactly ${Math.max(1, sc.shots)} shots. sfx: one sound effect per shot or "none".` }],
    })));
    return { reply: outline.reply, title: outline.title, musicMood: outline.musicMood, scenes };
  };
  MM.reviseChapter = (bible, script, instruction) => claude({
    system: WRITER, effort: 'low', maxTokens: 64000, schema: scriptSchema(), timeoutMs: 300000,
    content: [bibleBlock(bible), { type: 'text', text: `Current chapter script:\n${JSON.stringify(script)}\n\nThe user asks: ${instruction}\nReturn the full updated script.` }],
  });

  /// Copia el estilo de un video de referencia.
  MM.analyzeReference = async (src) => {
    const content = (src.frames || []).flatMap((f) => [
      { type: 'text', text: `Reference frame at ${f.time.toFixed(1)}s:` },
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.data } },
    ]);
    content.push({ type: 'text', text: `Reference video: ${src.duration.toFixed(1)} s, ${src.width}x${src.height}. Describe its editing style concretely so a team (editor, colorist, motion designer, VFX, sound) can reproduce it: pacing/shot length, color look (preset + adjustments), typography and captions, transitions, effects, format, mood. 120–200 words.` });
    const r = await claude({ system: 'You are a senior editor who reverse-engineers editing styles.', content, schema: O({ style: S }), effort: 'low', maxTokens: 3000 });
    return r.style;
  };
})();
