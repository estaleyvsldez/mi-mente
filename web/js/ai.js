// IA: Claude (equipo de agentes expertos) + fal.ai (video generativo, transcripción).
(function () {
  const MODEL = 'claude-opus-5-5';

  // ---------- Claude ----------
  async function claude({ system, content, schema, effort = 'low', maxTokens = 16000 }) {
    const key = (MM.settings.anthropicKey || '').trim();
    if (!key) throw new Error('Falta tu API key de Anthropic (Ajustes ⚙︎).');
    const body = {
      model: MODEL, max_tokens: maxTokens, system,
      messages: [{ role: 'user', content }],
      output_config: { effort, format: { type: 'json_schema', schema } },
      fallbacks: 'default',
    };
    for (let attempt = 1; ; attempt++) {
      let res;
      try {
        res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2026-10-21',
            'anthropic-beta': 'server-side-fallback-2026-07-01', 'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify(body),
        });
      } catch (e) {
        if (attempt < 3) { await MM.sleep(1500 * attempt); continue; }
        throw new Error('Sin conexión con la IA.');
      }
      if ((res.status === 429 || res.status >= 500) && attempt < 4) { await MM.sleep(2000 * attempt * attempt); continue; }
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error('Tu API key de Anthropic no es válida (Ajustes ⚙︎).');
      if (!res.ok) throw new Error('La IA respondió con un error: ' + (json.error?.message || res.status));
      if (json.stop_reason === 'refusal') throw new Error('La IA no quiso hacer eso. Pídelo de otra forma.');
      if (json.stop_reason === 'max_tokens') throw new Error('La respuesta quedó cortada. Intenta de nuevo.');
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
    const full = `${prompt}. Camera: ${MM.CAMERA_TEXT[camera] || 'cinematic camera'}. Cinematic, highly detailed, realistic motion.`;
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
  const gradeSchema = () => O({
    preset: E(MM.LOOK_NAMES), presetIntensity: N, exposure: N, contrast: N, highlights: N, shadows: N, whites: N,
    blacks: N, temperature: N, tint: N, saturation: N, vibrance: N, lift: wheel, gamma: wheel, gain: wheel,
    splitShadows: S, splitHighlights: S, splitAmount: N, fade: N, grain: N, vignette: N, bloom: N, sharpen: N, skinProtect: N,
  });
  const segmentSchema = () => O({
    kind: E(['clip', 'ai_video']), source: I, sourceStart: N, sourceEnd: N, speed: N, focusX: N, focusY: N,
    transitionIn: O({ type: E(MM.TRANSITIONS), duration: N }),
    aiPrompt: S, aiCamera: E(MM.CAMERAS), aiUseFrame: B, aiDuration: N,
  });
  const textSchema = () => O({
    text: S, segmentIndex: I, startOffset: N, duration: N, x: N, y: N, font: E(MM.FONT_NAMES), weight: E(MM.WEIGHT_NAMES),
    size: N, color: S, gradientColor: S, strokeColor: S, strokeWidth: N, shadow: N, glowColor: S, glowAmount: N,
    background: E(MM.TEXT_BG), backgroundColor: S, uppercase: B, letterSpacing: N, align: E(['left', 'center', 'right']),
    rotation: N, maxWidth: N, animationIn: E(MM.ANIM_IN), animationOut: E(MM.ANIM_OUT), loop: E(MM.LOOPS),
  });
  const captionsSchema = () => O({
    enabled: B, template: E(MM.CAPTION_TEMPLATES), font: E(MM.FONT_NAMES), color: S, highlightColor: S, y: N, size: N,
    uppercase: B, maxWords: I,
  });
  const effectSchema = () => O({
    type: E(MM.EFFECTS), segmentIndex: I, startOffset: N, duration: N, intensity: N, color: S, secondaryColor: S,
  });
  const audioSchema = () => O({
    voiceVolume: N, cleanup: N, voicePreset: E(MM.VOICE_PRESETS), eqLow: N, eqMid: N, eqHigh: N, compression: N,
    reverb: N, music: S, musicVolume: N, musicStart: N, ducking: N, fadeInOut: B,
  });

  // ---------- Contexto compartido ----------
  function mediaContent(project, { frames = true, maxFrames = 24 } = {}) {
    const content = [];
    if (frames) {
      let total = 0;
      project.sources.forEach((src, si) => {
        for (const f of src.frames || []) {
          if (total >= maxFrames) break;
          content.push({ type: 'text', text: `Source ${si} (${src.kind}) frame at ${f.time.toFixed(1)}s:` });
          content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.data } });
          total++;
        }
      });
    }
    if (frames) {
      Object.values(project.aiClips || {}).forEach((clip) => {
        for (const f of (clip.frames || []).slice(0, 2)) {
          content.push({ type: 'text', text: `AI-generated clip "${(clip.prompt || '').slice(0, 80)}" frame at ${f.time.toFixed(1)}s:` });
          content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.data } });
        }
      });
    }
    const lines = ['SOURCES:'];
    project.sources.forEach((src, si) => {
      lines.push(`- source ${si}: ${src.kind}${src.generated ? ' (AI-generated clip)' : ''}, ${src.kind === 'image' ? 'still image' : src.duration.toFixed(2) + ' s'}, ${src.width}x${src.height}${src.audio ? ', has audio' : ', no audio'}`);
      const speech = MM.linesFromWords(src.words || []);
      if (speech.length) {
        lines.push('  transcript (source seconds):');
        speech.forEach((l) => lines.push(`  [${l.start.toFixed(2)}–${l.end.toFixed(2)}] ${l.text}`));
      }
    });
    lines.push('', 'Imported songs: ' + (project.songs.length ? project.songs.map((s) => s.name).join(', ') : '(none)'));
    lines.push('AI video generation: ' + (MM.settings.falKey ? 'AVAILABLE' : 'NOT configured (no fal.ai key) — do not use ai_video'));
    if (project.reference) lines.push('', 'REFERENCE STYLE the user wants to match:', project.reference);
    content.push({ type: 'text', text: lines.join('\n'), cache_control: { type: 'ephemeral' } });
    return content;
  }
  function timelineText(plan, project) {
    const tl = MM.buildTimeline(plan, project);
    const rows = tl.items.map((it) => `#${it.index} ${it.seg.kind} ${it.seg.kind === 'clip' ? `source ${it.seg.source} ${it.seg.sourceStart.toFixed(2)}–${it.seg.sourceEnd.toFixed(2)}s x${it.seg.speed}` : `"${it.seg.aiPrompt.slice(0, 60)}"`} → timeline ${it.start.toFixed(2)}–${(it.start + it.dur).toFixed(2)}s`);
    return `FINAL TIMELINE (${tl.total.toFixed(2)} s, format ${plan.format}):\n` + rows.join('\n');
  }

  const CRAFT = `You are part of a team of expert AI editors inside a mobile video app. Each expert owns ONE department and only returns its own part; the app merges everything and renders it frame by frame. Work fast and decisively, with the taste of a top creator / commercial editor. "reply": 1 short casual sentence in Spanish (or the user's language) about what you did in your department.`;

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
  };

  const PROMPTS = {
    story: `${CRAFT}
YOU ARE THE EDITOR (cuts, structure, pacing, transitions, format, AI shots).
segments[] in timeline order:
- kind "clip": source (index), sourceStart/sourceEnd in source seconds (≥0.4 s; for images use 0→desired seconds, 1.5–4 s), speed 0.25–4, focusX/focusY (0–1, y from top) = the subject to keep when the format crops. For clips: aiPrompt "", aiCamera "static", aiUseFrame false, aiDuration 0.
- kind "ai_video" (only if AI video generation is AVAILABLE): a NEW shot made by a video model (like Higgsfield). aiPrompt: vivid English shot description. aiCamera: camera move. aiUseFrame true = starts from the frame of source at sourceStart (same person/place, new angle or motion). aiDuration 5 or 10. Costs money and 1–4 min: max 1–3, only when asked or clearly valuable. For ai_video set sourceEnd = sourceStart, speed 1.
- transitionIn: first must be "none". none (hard cut), crossfade, fade_black, flash_white, zoom_in, zoom_out, slide_left, slide_right, slide_up, whip_pan, spin, glitch, blur, iris, wipe, light_leak; 0.15–1.0 s. Cuts on action/speech beats are usually best; fancy transitions sparingly.
Craft: hook in the first 2 s, remove silences/filler/false starts using the transcript, never cut mid-sentence, vary rhythm, end clean. format: original, 9:16, 4:5, 1:1, 16:9, 21:9 (keep original unless asked or clearly better for social).`,
    color: `${CRAFT}
YOU ARE THE COLORIST. Return one grade. Neutral = zeros, presetIntensity 1, skinProtect 0.5.
preset (full look mixed by presetIntensity): ${MM.LOOK_NAMES.join(', ')}.
exposure −2..2 EV; contrast, highlights, shadows, whites, blacks, temperature (−cool/+warm), tint (−green/+magenta), saturation, vibrance −1..1; lift/gamma/gain wheels {hue 0–360, amount 0–1, luma −1..1}; splitShadows/splitHighlights hex + splitAmount 0–1; fade, grain, vignette, bloom, sharpen 0–1; skinProtect 0–1.
First correct what you see in the frames (exposure, white balance), then build a look that fits the content. Bold looks are welcome when asked ("colores fuertes").`,
    text: `${CRAFT}
YOU ARE THE MOTION DESIGNER (titles, text overlays and captions). Use the FINAL TIMELINE to place texts.
texts[]: segmentIndex (timeline #) + startOffset (s after that segment starts) + duration; x,y center 0–1 (y from top: 0.12 top, 0.5 center, 0.75 lower third); font ${MM.FONT_NAMES.join('|')}; weight ${MM.WEIGHT_NAMES.join('|')}; size = fraction of width (0.05 small, 0.09 big, 0.14+ huge); color, gradientColor (""=none), strokeColor + strokeWidth 0–1, shadow 0–1, glowColor (""=none) + glowAmount 0–1, background none|box|pill|bar|outline + backgroundColor (hex, 8-digit allowed), uppercase, letterSpacing −0.1..0.5, align, rotation deg, maxWidth 0.2–1, animationIn ${MM.ANIM_IN.join('|')}, animationOut ${MM.ANIM_OUT.join('|')}, loop ${MM.LOOPS.join('|')}.
captions (from speech, auto-timed): enabled only if there is a transcript; template ${MM.CAPTION_TEMPLATES.join('|')} (karaoke/word_pop great for vertical social); font, color, highlightColor, y (~0.78), size (~0.055), uppercase, maxWords 3–6.
Design with intent: few words, strong hierarchy, max 2 font families, keep texts clear of captions.`,
    vfx: `${CRAFT}
YOU ARE THE VFX ARTIST. effects[]: type ${MM.EFFECTS.join('|')}; segmentIndex (timeline #, or −1 = whole video where startOffset counts from the video start); startOffset; duration (0 = until end of segment/video); intensity 0–1; color/secondaryColor ("" = default; used by duotone and light_leak).
Camera moves (zoom_in, zoom_out, punch_in on emphasis words/beats, ken_burns for stills, shake for impacts, handheld for life) + style moments (flash on a hit, glitch for energy, light_leak for warm montages, vhs/old_film for retro, letterbox for cinematic). Create 2–6 deliberate "wow" moments; never random noise.`,
    sound: `${CRAFT}
YOU ARE THE SOUND ENGINEER. audio: voiceVolume 0–2; cleanup 0–1 (removes rumble/hiss and evens the voice); voicePreset ${MM.VOICE_PRESETS.join('|')}; eqLow/eqMid/eqHigh −1..1 (±12 dB); compression 0–1; reverb 0–1; music = exact name of an imported song or ""; musicVolume 0–1 (0.2–0.35 under speech, 0.7–0.9 montage); musicStart (seconds into the song, start at the drop/chorus); ducking 0–1 (auto-lower music while people talk); fadeInOut.
For talking videos a light cleanup (0.4), podcast or natural, compression ~0.5 usually sounds pro.`,
    producer: `You are the PRODUCER of a team of expert video editors. The user asks for a change to an existing edit. Decide which departments must act and write each one a precise instruction in English ("" = that department does nothing):
- story: cuts, order, length, speed, transitions, format, AI-generated shots / new camera angles
- color: color grade / look
- text: titles, text overlays, captions/subtitles
- vfx: zooms, shakes, glitch, flashes, light leaks and other effects
- sound: voice cleanup, voice effects, EQ, music, volume
Only activate what the request needs (often 1–2 departments). If the story changes the number or order of segments, also tell text and vfx to re-check their segment indices. "reply": 1 short casual sentence in Spanish saying who is working on it.`,
    director: `You are an AI FILM DIRECTOR (like Higgsfield) planning a short video made entirely with a text-to-video model. Write 1–6 shots that tell the user's idea visually, with continuity (same character description, wardrobe, setting, lighting in every shot) and cinematic camera work. Each shot prompt: vivid English, subject + action + environment + lighting + lens/mood, ≤ 60 words. camera: one camera move. seconds: 5 or 10. format: 9:16 for social unless asked. "reply": 1 short casual sentence in Spanish.`,
  };

  const SCHEMAS = {
    story: () => O({ reply: S, title: S, summary: S, format: E(FORMATS), segments: A(segmentSchema()) }),
    color: () => O({ reply: S, color: gradeSchema() }),
    text: () => O({ reply: S, texts: A(textSchema()), captions: captionsSchema() }),
    vfx: () => O({ reply: S, effects: A(effectSchema()) }),
    sound: () => O({ reply: S, audio: audioSchema() }),
    producer: () => O({ reply: S, story: S, color: S, text: S, vfx: S, sound: S }),
    director: () => O({ reply: S, title: S, format: E(['9:16', '16:9', '1:1', '4:5']), shots: A(O({ prompt: S, camera: E(MM.CAMERAS), seconds: N })) }),
  };

  function partOf(dept, plan) {
    switch (dept) {
      case 'story': return { title: plan.title, summary: plan.summary, format: plan.format, segments: plan.segments };
      case 'color': return { color: plan.color };
      case 'text': return { texts: plan.texts, captions: plan.captions };
      case 'vfx': return { effects: plan.effects };
      case 'sound': return { audio: plan.audio };
    }
    return {};
  }

  async function runExpert(dept, project, plan, instruction, effort) {
    const withFrames = dept !== 'sound';
    const content = mediaContent(project, { frames: withFrames, maxFrames: dept === 'story' ? 24 : 12 });
    const parts = [];
    if (plan && dept !== 'story') parts.push(timelineText(plan, project));
    if (plan) parts.push('CURRENT ' + dept.toUpperCase() + ' (keep anything the instruction does not ask to change):\n' + JSON.stringify(partOf(dept, plan)));
    parts.push('INSTRUCTION: ' + instruction);
    content.push({ type: 'text', text: parts.join('\n\n') });
    return claude({ system: PROMPTS[dept], content, schema: SCHEMAS[dept](), effort, maxTokens: dept === 'story' ? 16000 : 8000 });
  }

  function applyPart(plan, dept, r) {
    switch (dept) {
      case 'story': Object.assign(plan, { title: r.title, summary: r.summary, format: r.format, segments: r.segments }); break;
      case 'color': plan.color = r.color; break;
      case 'text': plan.texts = r.texts; plan.captions = r.captions; break;
      case 'vfx': plan.effects = r.effects; break;
      case 'sound': plan.audio = r.audio; break;
    }
  }

  /// Primera edición: el editor arma la historia y luego los demás expertos trabajan en paralelo.
  MM.teamEdit = async (project, onAgent, onStory) => {
    const plan = MM.emptyPlan(project);
    onAgent('story', 'working');
    const story = await runExpert('story', project, null,
      'Edit this footage from scratch for maximum impact. ' + (project.request || ''), 'medium');
    applyPart(plan, 'story', story);
    MM.sanitizePlan(plan, project);
    onAgent('story', 'done', story.reply);
    onStory?.(plan);
    const brief = 'Do your department for this edit from scratch. ' + (project.request || '');
    await Promise.all(['color', 'text', 'vfx', 'sound'].map(async (d) => {
      onAgent(d, 'working');
      try {
        const r = await runExpert(d, project, plan, brief, 'low');
        applyPart(plan, d, r);
        onAgent(d, 'done', r.reply);
      } catch (e) { onAgent(d, 'error', e.message); }
    }));
    return MM.sanitizePlan(plan, project);
  };

  /// Cambio pedido por chat: el productor reparte el trabajo y solo trabajan los expertos necesarios.
  MM.teamRevise = async (project, current, request, onAgent, onStory) => {
    onAgent('producer', 'working');
    const summary = {
      title: current.title, format: current.format, segments: current.segments.length,
      look: current.color.preset, texts: current.texts.map((t) => t.text), captions: current.captions.enabled ? current.captions.template : 'off',
      effects: current.effects.map((e) => e.type), music: current.audio.music || 'none', voice: current.audio.voicePreset,
    };
    const route = await claude({
      system: PROMPTS.producer,
      content: [{ type: 'text', text: `Current edit: ${JSON.stringify(summary)}\nAI video generation: ${MM.settings.falKey ? 'available' : 'not configured'}\nUser request: ${request}` }],
      schema: SCHEMAS.producer(), effort: 'low', maxTokens: 2000,
    });
    onAgent('producer', 'done', route.reply);
    const plan = JSON.parse(JSON.stringify(current));
    if (route.story) {
      onAgent('story', 'working');
      const r = await runExpert('story', project, plan, route.story, 'low');
      applyPart(plan, 'story', r);
      MM.sanitizePlan(plan, project);
      onAgent('story', 'done', r.reply);
      onStory?.(plan);
    }
    await Promise.all(['color', 'text', 'vfx', 'sound'].filter((d) => route[d]).map(async (d) => {
      onAgent(d, 'working');
      try {
        const r = await runExpert(d, project, plan, route[d], 'low');
        applyPart(plan, d, r);
        onAgent(d, 'done', r.reply);
      } catch (e) { onAgent(d, 'error', e.message); }
    }));
    return MM.sanitizePlan(plan, project);
  };

  /// Pulido en paralelo (color, texto, efectos, sonido) de un video ya armado.
  MM.teamPolish = async (project, plan, brief, onAgent) => {
    await Promise.all(['color', 'text', 'vfx', 'sound'].map(async (d) => {
      onAgent(d, 'working');
      try {
        const r = await runExpert(d, project, plan, brief, 'low');
        applyPart(plan, d, r);
        onAgent(d, 'done', r.reply);
      } catch (e) { onAgent(d, 'error', e.message); }
    }));
    return MM.sanitizePlan(plan, project);
  };

  /// "Crea un video de un hombre saltando sobre un carro": el director planea las tomas.
  MM.directShots = async (idea, format) => {
    return claude({
      system: PROMPTS.director,
      content: [{ type: 'text', text: `Idea: ${idea}\nPreferred format: ${format || '9:16'}\nAvailable camera moves: ${MM.CAMERAS.join(', ')}` }],
      schema: SCHEMAS.director(), effort: 'low', maxTokens: 4000,
    });
  };

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
