// Interfaz: inicio, editor con el equipo de agentes, ajustes a mano y exportación.
(function () {
  const $ = (id) => document.getElementById(id);
  const project = { sources: [], songs: [], aiClips: {}, request: '', reference: '' };
  let plan = null;
  const undoStack = [];
  let busy = false;
  let player = null;
  let ideaFormat = '9:16';
  let pickedFiles = [];
  const pending = {};   // clips de IA generándose

  // ---------- Utilidades de UI ----------
  function show(screen) {
    $('home').hidden = screen !== 'home';
    $('editor').hidden = screen !== 'editor';
    if (screen === 'editor' && !player) {
      player = new MM.Player($('view'), $('mediaHost'));
      player.onTime = (t) => updateTransport(t);
      player.onEnd = () => { $('playBtn').textContent = '▶'; };
    }
  }
  function status(text) {
    $('status').hidden = !text;
    $('statusText').textContent = text || '';
  }
  function setBusy(b) {
    busy = b;
    $('send').disabled = b; $('exportBtn').disabled = b || !plan; $('undo').disabled = b || !undoStack.length;
    renderChips();
  }
  function say(role, text, agent) {
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    if (agent) {
      const who = document.createElement('span');
      who.className = 'who';
      who.textContent = `${MM.AGENTS[agent].icon} ${MM.AGENTS[agent].name}`;
      div.appendChild(who);
    }
    div.appendChild(document.createTextNode(text));
    $('chat').appendChild(div);
    $('chat').scrollTop = $('chat').scrollHeight;
  }
  function renderAgents() {
    const box = $('agents');
    box.innerHTML = '';
    ['producer', 'story', 'color', 'text', 'vfx', 'sound', 'director', 'generator'].forEach((k) => {
      const a = MM.AGENTS[k];
      const el = document.createElement('div');
      el.className = 'agent'; el.id = 'agent-' + k; el.dataset.state = 'idle';
      el.innerHTML = `<span class="dot"></span><span>${a.icon} ${a.name}</span>`;
      box.appendChild(el);
    });
  }
  function onAgent(key, state, text) {
    const el = $('agent-' + key);
    if (el) el.dataset.state = state;
    if (state === 'working') status(`${MM.AGENTS[key].icon} ${MM.AGENTS[key].name} trabajando…`);
    if (state === 'done' && text) say('ai', text, key);
    if (state === 'error') say('error', `${MM.AGENTS[key].name}: ${text}`);
  }
  function updateTransport(t) {
    const d = player ? player.duration : 0;
    $('tc').textContent = `${MM.fmtTime(t)} / ${MM.fmtTime(d)}`;
    if (!scrubbing) $('scrub').value = d ? Math.round((t / d) * 1000) : 0;
  }
  function applyPlan(newPlan, pushUndo = true) {
    if (plan && pushUndo) undoStack.push(JSON.parse(JSON.stringify(plan)));
    plan = newPlan;
    $('projTitle').textContent = plan.title || 'Mi video';
    player.load(project, plan);
    $('undo').disabled = busy || !undoStack.length;
    $('exportBtn').disabled = busy;
    renderManual();
    updateTransport(player.t);
  }

  // ---------- Ajustes ----------
  function openSettings() {
    $('kAnthropic').value = MM.settings.anthropicKey; $('kFal').value = MM.settings.falKey;
    $('quality').value = MM.settings.quality; $('mT2V').value = MM.settings.t2vModel;
    $('mI2V').value = MM.settings.i2vModel; $('mWhisper').value = MM.settings.whisperModel;
    $('settingsSheet').hidden = false;
  }
  $('openSettings').onclick = openSettings;
  $('openSettings2').onclick = openSettings;
  $('closeSettings').onclick = () => { $('settingsSheet').hidden = true; };
  $('saveSettings').onclick = () => {
    const q = MM.settings.quality;
    Object.assign(MM.settings, {
      anthropicKey: $('kAnthropic').value.trim(), falKey: $('kFal').value.trim(), quality: $('quality').value,
      t2vModel: $('mT2V').value.trim() || MM.defaults.t2vModel, i2vModel: $('mI2V').value.trim() || MM.defaults.i2vModel,
      whisperModel: $('mWhisper').value.trim() || MM.defaults.whisperModel,
    });
    MM.saveSettings();
    $('settingsSheet').hidden = true;
    refreshBanner();
    if (plan && q !== MM.settings.quality) player.load(project, plan);
  };
  function refreshBanner() { $('keyBanner').hidden = !!MM.settings.anthropicKey; }

  // ---------- Inicio ----------
  $('pickFiles').onclick = () => $('files').click();
  $('files').onchange = (e) => {
    pickedFiles = [...e.target.files];
    $('filesLabel').textContent = pickedFiles.length ? `${pickedFiles.length} archivo(s): ${pickedFiles.map((f) => f.name).join(', ').slice(0, 80)}` : 'Nada elegido';
    $('startEdit').disabled = !pickedFiles.length;
  };
  $('ideaFormat').onclick = (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    ideaFormat = b.dataset.f;
    [...$('ideaFormat').children].forEach((x) => x.setAttribute('aria-pressed', x === b));
  };
  $('startEdit').onclick = () => startEdit(pickedFiles, $('editRequest').value.trim());
  $('startCreate').onclick = () => startCreate($('idea').value.trim(), ideaFormat);
  $('back').onclick = () => {
    if (busy) return;
    player?.pause();
    show('home');
  };

  async function addSources(files) {
    const added = [];
    for (const f of files) {
      status(`Leyendo ${f.name}…`);
      try {
        const kind = f.type.startsWith('image') ? 'image' : 'video';
        const src = await MM.loadSource(f, f.name, kind);
        project.sources.push(src);
        added.push(src);
      } catch (e) { say('error', `No pude abrir ${f.name}.`); }
    }
    status('El equipo está mirando tus clips…');
    await Promise.all(added.map(async (src) => {
      src.frames = await MM.sampleFrames(src, project.sources.length > 3 ? 4 : undefined).catch(() => []);
    }));
    if (MM.settings.falKey) {
      onAgent('sound', 'working');
      await Promise.all(added.filter((s) => s.audio).map(async (src) => {
        try { src.words = await MM.transcribe(src, (s) => status('🎧 Escuchando el audio… ' + s)); } catch (e) { src.words = []; }
      }));
      $('agent-sound').dataset.state = 'idle';
    }
    return added;
  }

  async function startEdit(files, request) {
    if (!MM.settings.anthropicKey) { openSettings(); return; }
    resetProject();
    show('editor');
    setBusy(true);
    project.request = request;
    if (request) say('user', request);
    try {
      await addSources(files);
      if (!project.sources.length) throw new Error('No pude abrir ningún archivo.');
      applyPlan(MM.sanitizePlan(MM.emptyPlan(project), project), false);
      if (!MM.settings.falKey) say('ai', 'Tip: con una key de fal.ai en Ajustes también pongo subtítulos automáticos y escenas con IA.', 'producer');
      const t0 = performance.now();
      const result = await MM.teamEdit(project, onAgent, (p) => { kickGeneration(p); applyPlan(MM.sanitizePlan(JSON.parse(JSON.stringify(p)), project), false); });
      applyPlan(result, false);
      say('ai', `Listo en ${Math.round((performance.now() - t0) / 1000)} s. Dale ▶ y dime qué cambiar.`, 'producer');
    } catch (e) {
      say('error', e.message);
    }
    status('');
    setBusy(false);
  }

  async function startCreate(idea, format) {
    if (!idea) { $('idea').focus(); return; }
    if (!MM.settings.anthropicKey || !MM.settings.falKey) {
      openSettings();
      return;
    }
    resetProject();
    show('editor');
    setBusy(true);
    say('user', idea);
    try {
      onAgent('director', 'working');
      const d = await MM.directShots(idea, format);
      onAgent('director', 'done', d.reply + '\n' + d.shots.map((s, i) => `${i + 1}. ${s.prompt}`).join('\n'));
      const p = MM.emptyPlan(project);
      p.title = d.title; p.format = d.format;
      p.segments = d.shots.map((s, i) => Object.assign(MM.clipSegment(0, 0, 0), {
        kind: 'ai_video', aiPrompt: s.prompt, aiCamera: s.camera, aiUseFrame: false, aiDuration: s.seconds > 7.5 ? 10 : 5,
        transitionIn: { type: i === 0 ? 'none' : 'crossfade', duration: i === 0 ? 0 : 0.3 },
      }));
      MM.sanitizePlan(p, project);
      plan = p;
      $('projTitle').textContent = p.title;
      await generateAll(p);
      applyPlan(MM.sanitizePlan(p, project), false);
      const polished = await MM.teamPolish(project, JSON.parse(JSON.stringify(plan)),
        `This video was generated with AI from the idea: "${idea}". Do your department to make it look like a viral, cinematic social video (no speech: captions off; music only if a song is imported).`, onAgent);
      applyPlan(polished, false);
      say('ai', 'Tu video con IA está listo. Puedes pedir más tomas, cambiar el estilo o exportarlo.', 'producer');
    } catch (e) {
      say('error', e.message);
    }
    status('');
    setBusy(false);
  }

  // ---------- Generación de clips con IA ----------
  function aspectFor(p) { return ['9:16', '16:9', '1:1'].includes(p.format) ? p.format : '9:16'; }
  function kickGeneration(p) {
    const missing = p.segments.filter((s) => s.kind === 'ai_video' && !project.aiClips[MM.aiKey(s)] && !pending[MM.aiKey(s)]);
    if (!missing.length) return Promise.resolve();
    if (!MM.settings.falKey) { say('error', 'Para escenas con IA pon tu key de fal.ai en Ajustes.'); return Promise.resolve(); }
    return generateAll(p);
  }
  async function generateAll(p) {
    const segs = p.segments.filter((s) => s.kind === 'ai_video' && !project.aiClips[MM.aiKey(s)]);
    if (!segs.length) return;
    onAgent('generator', 'working');
    const progress = {};
    const update = () => status('🤖 Generando ' + Object.entries(progress).map(([i, s]) => `toma ${+i + 1}: ${s}`).join(' · '));
    await Promise.all(segs.map(async (seg, i) => {
      const key = MM.aiKey(seg);
      if (pending[key]) return pending[key];
      pending[key] = (async () => {
        try {
          let imageURL = null;
          if (seg.aiUseFrame && project.sources[seg.source]) imageURL = await MM.frameDataURL(project.sources[seg.source], seg.sourceStart);
          const src = await MM.generateClip({ prompt: seg.aiPrompt, camera: seg.aiCamera, imageURL, seconds: seg.aiDuration, aspect: aspectFor(p) },
            (s) => { progress[i] = s; update(); });
          src.generated = true; src.prompt = seg.aiPrompt;
          src.frames = await MM.sampleFrames(src, 2).catch(() => []);
          project.aiClips[key] = src;
          progress[i] = 'lista ✓'; update();
          if (plan && player) player.load(project, plan);
        } catch (e) {
          progress[i] = 'falló'; update();
          say('error', `Toma "${seg.aiPrompt.slice(0, 50)}…": ${e.message}`, 'generator');
        } finally { delete pending[key]; }
      })();
      return pending[key];
    }));
    onAgent('generator', 'done', `Generé ${segs.filter((s) => project.aiClips[MM.aiKey(s)]).length} de ${segs.length} toma(s) con IA.`);
  }

  // ---------- Chat ----------
  async function send(text) {
    text = (text || '').trim();
    if (!text || busy || !plan) return;
    $('input').value = '';
    say('user', text);
    if (/https?:\/\/|tiktok\.com|instagram\.com|youtu/i.test(text)) {
      say('ai', 'No puedo abrir links de TikTok, Instagram o YouTube (no lo permiten). Guarda el video en tu galería y súbelo con ＋ → Video de referencia: lo analizo y copio su estilo.', 'producer');
      return;
    }
    setBusy(true);
    player.pause(); $('playBtn').textContent = '▶';
    try {
      const t0 = performance.now();
      const result = await MM.teamRevise(project, plan, text, onAgent, (p) => kickGeneration(p));
      await Promise.all(Object.values(pending));
      applyPlan(result);
      say('ai', `Hecho en ${Math.round((performance.now() - t0) / 1000)} s.`, 'producer');
      player.seek(0).then(() => { player.play(); $('playBtn').textContent = '❚❚'; });
    } catch (e) { say('error', e.message); }
    status('');
    setBusy(false);
  }
  $('send').onclick = () => send($('input').value);
  $('input').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send($('input').value); } });
  $('input').addEventListener('input', () => { const t = $('input'); t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px'; });

  const SUGGESTIONS = ['Colores más fuertes', 'Look de película', 'Hazlo vertical para TikTok', 'Subtítulos karaoke',
    'Más efectos impresionantes', 'Cámara lenta en lo mejor', 'Escena con IA desde otro ángulo', 'Toma de dron con IA',
    'Título épico al inicio', 'Estilo cyberpunk', 'Limpia el audio', 'Voz de locutor', 'Hazlo más corto y rápido'];
  function renderChips() {
    const box = $('chips');
    box.innerHTML = '';
    if (busy || !plan) return;
    SUGGESTIONS.forEach((s) => {
      const b = document.createElement('button');
      b.className = 'pill'; b.textContent = s;
      b.onclick = () => send(s);
      box.appendChild(b);
    });
  }

  // ---------- Transporte ----------
  let scrubbing = false;
  $('playBtn').onclick = () => {
    if (!player || !plan) return;
    if (player.playing) { player.pause(); $('playBtn').textContent = '▶'; }
    else { player.play(); $('playBtn').textContent = '❚❚'; }
  };
  $('scrub').addEventListener('input', () => {
    scrubbing = true;
    if (player.playing) { player.pause(); $('playBtn').textContent = '▶'; }
    player.seek(($('scrub').value / 1000) * player.duration);
  });
  $('scrub').addEventListener('change', () => { scrubbing = false; });
  $('undo').onclick = () => {
    if (busy || !undoStack.length) return;
    applyPlan(undoStack.pop(), false);
    say('ai', 'Volví a la versión anterior.', 'producer');
  };

  // ---------- Pestañas ----------
  document.querySelectorAll('[data-tab]').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      $('chat').hidden = b.dataset.tab !== 'chat';
      $('manual').hidden = b.dataset.tab !== 'manual';
    };
  });

  // ---------- Ajustes a mano ----------
  let manualTimer = null;
  function manualChange(mut) {
    if (!plan) return;
    const next = JSON.parse(JSON.stringify(plan));
    mut(next);
    MM.sanitizePlan(next, project);
    clearTimeout(manualTimer);
    const pushUndo = !manualTimer;
    plan = next;
    manualTimer = setTimeout(() => { manualTimer = null; }, 1200);
    if (pushUndo) undoStack.push(JSON.parse(JSON.stringify(plan)));
    player.load(project, plan);
    $('undo').disabled = busy || !undoStack.length;
  }
  function slider(label, get, set, min, max, step = 0.01) {
    const wrap = document.createElement('div');
    wrap.className = 'ctl';
    const id = 'm-' + label.replace(/\W+/g, '');
    const v = get();
    wrap.innerHTML = `<label for="${id}"><span>${label}</span><span>${(+v).toFixed(2)}</span></label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${v}">`;
    const input = wrap.querySelector('input'), out = wrap.querySelector('label span:last-child');
    input.oninput = () => { out.textContent = (+input.value).toFixed(2); manualChange((p) => set(p, +input.value)); };
    return wrap;
  }
  function select(label, options, get, set) {
    const wrap = document.createElement('div');
    wrap.className = 'ctl';
    const id = 'm-' + label.replace(/\W+/g, '');
    wrap.innerHTML = `<label for="${id}"><span>${label}</span></label>`;
    const sel = document.createElement('select');
    sel.id = id;
    options.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); });
    sel.value = get();
    sel.onchange = () => manualChange((p) => set(p, sel.value));
    wrap.appendChild(sel);
    return wrap;
  }
  const nice = (s) => s.replace(/_/g, ' ');
  function renderManual() {
    const box = $('manual');
    box.innerHTML = '';
    if (!plan) return;
    const title = (t) => { const d = document.createElement('div'); d.className = 'section-title'; d.textContent = t; box.appendChild(d); };
    const grid = () => { const g = document.createElement('div'); g.className = 'grid2'; box.appendChild(g); return g; };
    title('Formato');
    let g = grid();
    g.appendChild(select('Formato', ['original', '9:16', '4:5', '1:1', '16:9', '21:9'].map((f) => [f, f]), () => plan.format, (p, v) => { p.format = v; }));
    title('Color');
    g = grid();
    g.appendChild(select('Look', MM.LOOK_NAMES.map((n) => [n, nice(n)]), () => plan.color.preset, (p, v) => { p.color.preset = v; }));
    [['Intensidad del look', 'presetIntensity', 0, 1], ['Exposición', 'exposure', -2, 2], ['Contraste', 'contrast', -1, 1],
      ['Altas luces', 'highlights', -1, 1], ['Sombras', 'shadows', -1, 1], ['Temperatura', 'temperature', -1, 1], ['Tinte', 'tint', -1, 1],
      ['Saturación', 'saturation', -1, 1], ['Vibrancia', 'vibrance', -1, 1], ['Fade', 'fade', 0, 1], ['Grano', 'grain', 0, 1],
      ['Viñeta', 'vignette', 0, 1], ['Bloom', 'bloom', 0, 1], ['Nitidez', 'sharpen', 0, 1]]
      .forEach(([l, k, a, b]) => g.appendChild(slider(l, () => plan.color[k] ?? 0, (p, v) => { p.color[k] = v; }, a, b)));
    title('Subtítulos');
    g = grid();
    g.appendChild(select('Subtítulos', [['off', 'Apagados'], ...MM.CAPTION_TEMPLATES.map((t) => [t, nice(t)])],
      () => (plan.captions.enabled ? plan.captions.template : 'off'),
      (p, v) => { p.captions.enabled = v !== 'off'; if (v !== 'off') p.captions.template = v; }));
    g.appendChild(select('Fuente', MM.FONT_NAMES.map((f) => [f, nice(f)]), () => plan.captions.font, (p, v) => { p.captions.font = v; }));
    g.appendChild(slider('Tamaño', () => plan.captions.size, (p, v) => { p.captions.size = v; }, 0.03, 0.12, 0.005));
    g.appendChild(slider('Posición', () => plan.captions.y, (p, v) => { p.captions.y = v; }, 0.05, 0.95));
    if (plan.texts.length) {
      title('Textos');
      plan.texts.forEach((t, i) => {
        const tg = grid();
        const wrap = document.createElement('div'); wrap.className = 'ctl';
        wrap.innerHTML = `<label for="m-text${i}"><span>Texto ${i + 1}</span></label>`;
        const inp = document.createElement('input'); inp.type = 'text'; inp.id = 'm-text' + i; inp.value = t.text;
        inp.onchange = () => manualChange((p) => { p.texts[i].text = inp.value; });
        wrap.appendChild(inp); tg.appendChild(wrap);
        tg.appendChild(select('Fuente', MM.FONT_NAMES.map((f) => [f, nice(f)]), () => t.font, (p, v) => { p.texts[i].font = v; }));
        tg.appendChild(select('Entrada', MM.ANIM_IN.map((f) => [f, nice(f)]), () => t.animationIn, (p, v) => { p.texts[i].animationIn = v; }));
        tg.appendChild(slider('Tamaño', () => t.size, (p, v) => { p.texts[i].size = v; }, 0.02, 0.25, 0.005));
      });
    }
    title('Audio');
    g = grid();
    g.appendChild(select('Voz', MM.VOICE_PRESETS.map((v) => [v, nice(v)]), () => plan.audio.voicePreset, (p, v) => { p.audio.voicePreset = v; }));
    [['Volumen voz', 'voiceVolume', 0, 2], ['Limpieza de ruido', 'cleanup', 0, 1], ['Compresor', 'compression', 0, 1],
      ['Graves', 'eqLow', -1, 1], ['Medios', 'eqMid', -1, 1], ['Agudos', 'eqHigh', -1, 1], ['Reverb', 'reverb', 0, 1]]
      .forEach(([l, k, a, b]) => g.appendChild(slider(l, () => plan.audio[k] ?? 0, (p, v) => { p.audio[k] = v; }, a, b)));
    g.appendChild(select('Música', [['', 'Sin música'], ...project.songs.map((s) => [s.name, s.name])], () => plan.audio.music, (p, v) => { p.audio.music = v; }));
    g.appendChild(slider('Volumen música', () => plan.audio.musicVolume, (p, v) => { p.audio.musicVolume = v; }, 0, 1));
    g.appendChild(slider('Bajar música al hablar', () => plan.audio.ducking, (p, v) => { p.audio.ducking = v; }, 0, 1));
  }

  // ---------- Menú ＋ ----------
  $('plus').onclick = () => { $('plusMenu').hidden = !$('plusMenu').hidden; };
  $('plusMenu').onclick = (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    $('plusMenu').hidden = true;
    if (busy) return;
    const act = b.dataset.act;
    if (act === 'media') $('addMedia').click();
    if (act === 'music') $('addMusic').click();
    if (act === 'reference') $('addRef').click();
    if (act === 'ai') {
      $('input').value = 'Crea una escena nueva con IA de ';
      $('input').focus();
    }
  };
  $('addMedia').onchange = async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length || !plan) return;
    setBusy(true);
    const added = await addSources(files);
    status('');
    setBusy(false);
    if (added.length) send(`Agregué ${added.length} archivo(s) nuevo(s) (sources ${added.map((s) => project.sources.indexOf(s)).join(', ')}). Intégralos en la edición donde mejor queden.`);
  };
  $('addMusic').onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f || !plan) return;
    try {
      status('Leyendo la canción…');
      const buffer = await MM.audioCtx().decodeAudioData(await f.arrayBuffer());
      project.songs.push({ name: f.name, buffer });
      status('');
      manualChange((p) => { p.audio.music = f.name; p.audio.musicVolume = p.audio.musicVolume || 0.35; });
      renderManual();
      say('ai', `Puse "${f.name}" de fondo y baja sola cuando alguien habla. Pide "ajusta la música" para que el ingeniero de sonido la afine.`, 'sound');
    } catch { status(''); say('error', 'No pude leer esa canción.'); }
  };
  $('addRef').onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f || !plan) return;
    setBusy(true);
    try {
      status('Estudiando el video de referencia…');
      const ref = await MM.loadSource(f, f.name, 'video');
      ref.frames = await MM.sampleFrames(ref, 10);
      project.reference = await MM.analyzeReference(ref);
      say('ai', 'Esto vi en la referencia:\n' + project.reference, 'producer');
    } catch (err) { say('error', err.message); }
    status('');
    setBusy(false);
    if (project.reference) send('Edítalo igual que el video de referencia: mismo ritmo, color, textos, efectos y formato.');
  };

  // ---------- Exportar ----------
  $('exportBtn').onclick = async () => {
    if (!plan || busy) return;
    setBusy(true);
    $('exportSheet').hidden = false;
    $('exportResult').hidden = true;
    $('exportTitle').textContent = 'Exportando…';
    $('exportBar').style.width = '0%';
    $('exportNote').textContent = 'Se graba en tiempo real: deja esta pantalla abierta.';
    try {
      const { blob, ext } = await player.export((p) => { $('exportBar').style.width = Math.round(p * 100) + '%'; });
      const url = URL.createObjectURL(blob);
      const name = (plan.title || 'mi-mente').replace(/[^\w\-]+/g, '-').toLowerCase() + '.' + ext;
      $('exportVideo').src = url;
      $('downloadLink').href = url;
      $('downloadLink').download = name;
      $('exportResult').hidden = false;
      $('exportTitle').textContent = '¡Tu video está listo!';
      $('exportBar').style.width = '100%';
      $('exportNote').textContent = `${(blob.size / 1e6).toFixed(1)} MB · ${ext.toUpperCase()}`;
      $('shareBtn').onclick = async () => {
        const file = new File([blob], name, { type: blob.type });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: plan.title }); } catch { /* cancelado */ }
        } else {
          $('downloadLink').click();
        }
      };
    } catch (e) {
      $('exportTitle').textContent = 'No se pudo exportar';
      $('exportNote').textContent = e.message;
    }
    setBusy(false);
  };
  $('closeExport').onclick = () => { $('exportSheet').hidden = true; };

  function resetProject() {
    player?.pause();
    project.sources = []; project.aiClips = {}; project.reference = ''; project.request = '';
    plan = null; undoStack.length = 0;
    $('chat').innerHTML = '';
    renderAgents();
  }

  // Arranque
  window.addEventListener('resize', () => player?.fit());
  refreshBanner();
  renderAgents();
  // Para pruebas automáticas.
  MM.debug = { project, getPlan: () => plan, applyPlan: (p) => applyPlan(MM.sanitizePlan(p, project), false), show, addSources, player: () => player };
})();
