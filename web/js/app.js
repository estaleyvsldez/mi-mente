// Interfaz: inicio, editor con el equipo de agentes, ajustes a mano y exportación.
(function () {
  const $ = (id) => document.getElementById(id);
  const project = { sources: [], songs: [], aiClips: {}, voices: {}, request: '', reference: '' };
  let plan = null;
  const undoStack = [];
  let busy = false;
  let forceExport = false;
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
    project.chatLog = project.chatLog || [];
    project.chatLog.push(`${role === 'user' ? 'USER' : agent ? MM.AGENTS[agent].name : 'APP'}: ${String(text).slice(0, 300)}`);
    if (project.chatLog.length > 30) project.chatLog.shift();
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
    ['producer', 'story', 'color', 'text', 'vfx', 'sound', 'director', 'generator', 'qa'].forEach((k) => {
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
    forceExport = false;
    if (typeof selectText === 'function') selectText(null);
    $('exportBtn').textContent = 'Exportar';
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
    $('mI2V').value = MM.settings.i2vModel; $('mWhisper').value = MM.settings.whisperModel; $('mMusic').value = MM.settings.musicModel; $('mTTS').value = MM.settings.ttsModel;
    $('engine').value = MM.settings.videoEngine || 'auto'; $('colabURL').value = MM.settings.colabURL || '';
    $('hfToken').value = MM.settings.hfToken || ''; $('hfSpaces').value = MM.settings.hfSpaces || MM.DEFAULT_HF_SPACES;
    $('settingsSheet').hidden = false;
  }
  $('openSettings').onclick = openSettings;
  $('openSettings2').onclick = openSettings;
  $('closeSettings').onclick = () => { $('settingsSheet').hidden = true; };
  // Botón "Probar key"
  (() => {
    const input = $('kAnthropic');
    const row = document.createElement('div');
    row.className = 'row';
    const btn = document.createElement('button');
    btn.className = 'btn ghost'; btn.type = 'button'; btn.id = 'testKey'; btn.textContent = 'Probar key';
    const out = document.createElement('p');
    out.className = 'small'; out.id = 'testKeyResult'; out.style.margin = '0';
    row.append(btn, out);
    input.parentNode.appendChild(row);
    btn.onclick = async () => {
      btn.disabled = true; out.textContent = 'Probando…'; out.style.color = '';
      const r = await MM.testAnthropicKey(input.value);
      out.textContent = r.msg; out.style.color = r.ok ? 'var(--ok, #4ADE80)' : 'var(--err, #F87171)';
      btn.disabled = false;
    };
  })();
  $('saveSettings').onclick = () => {
    const q = MM.settings.quality;
    Object.assign(MM.settings, {
      anthropicKey: $('kAnthropic').value.replace(/\s+/g, ''), falKey: $('kFal').value.trim(), quality: $('quality').value,
      t2vModel: $('mT2V').value.trim() || MM.defaults.t2vModel, i2vModel: $('mI2V').value.trim() || MM.defaults.i2vModel,
      whisperModel: $('mWhisper').value.trim() || MM.defaults.whisperModel,
      musicModel: $('mMusic').value.trim() || MM.defaults.musicModel,
      ttsModel: $('mTTS').value.trim() || MM.defaults.ttsModel,
      videoEngine: $('engine').value, colabURL: $('colabURL').value.trim(), hfToken: $('hfToken').value.trim(),
      hfSpaces: $('hfSpaces').value.trim() || MM.DEFAULT_HF_SPACES,
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
        if (src.tooBig) say('error', `"${f.name}" pesa ${(f.size / 1e9).toFixed(1)} GB: el iPhone no puede procesar su audio. Para videos tan pesados usa la laptop, o recórtalo en Fotos antes de subirlo.`);
        added.push(src);
      } catch (e) { say('error', `No pude abrir ${f.name}.`); }
    }
    status('El equipo está mirando tus clips…');
    await Promise.all(added.map(async (src) => {
      src.frames = await MM.sampleFrames(src, project.sources.length > 3 ? 4 : undefined).catch(() => []);
    }));
    if (added.some((s) => s.audio)) {
      onAgent('sound', 'working');
      for (const src of added.filter((s) => s.audio)) {
        try { src.words = await MM.transcribe(src, (s) => status('🎧 Escuchando el audio… ' + s)); }
        catch (e) { src.words = []; say('error', 'Subtítulos: ' + e.message); }
      }
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
      const t0 = performance.now();
      const result = await MM.teamEdit(project, onAgent, (p) => { kickGeneration(p); applyPlan(MM.sanitizePlan(JSON.parse(JSON.stringify(p)), project), false); });
      applyPlan(result, false);
      await ensureMusic();
      await Promise.all(Object.values(pending));
      await autoQuality();
      say('ai', `Listo en ${Math.round((performance.now() - t0) / 1000)} s. Dale ▶ y dime qué cambiar, o exporta.`, 'producer');
    } catch (e) {
      say('error', e.message);
    }
    status('');
    setBusy(false);
  }

  async function startCreate(idea, format) {
    if (!idea) { $('idea').focus(); return; }
    if (!MM.settings.anthropicKey) {
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
        `This video was generated with AI from the idea: "${idea}". Do your department to make it look like a viral, cinematic social video (no speech: captions off; give it music via musicMood/musicPrompt and cinematic sound effects).`, onAgent);
      applyPlan(polished, false);
      await ensureMusic();
      await autoQuality();
      say('ai', 'Tu video con IA está listo. Puedes pedir más tomas, cambiar el estilo o exportarlo.', 'producer');
    } catch (e) {
      say('error', e.message);
    }
    status('');
    setBusy(false);
  }

  // ---------- Música (base por estado de ánimo o música IA) ----------
  async function ensureMusic() {
    if (!plan) return;
    const a = plan.audio;
    if (a.music || !a.musicMood || a.musicMood === 'none') return;
    const useAI = !!(a.musicPrompt && (MM.settings.colabURL || (MM.settings.falKey && MM.videoEngine() === 'fal')));
    const name = useAI ? 'IA · ' + a.musicPrompt.slice(0, 40) : 'Base · ' + a.musicMood;
    let song = project.songs.find((s) => s.name === name);
    if (!song) {
      onAgent('sound', 'working');
      status(useAI ? '🎧 Componiendo música original con IA…' : '🎧 Componiendo la base musical…');
      let buffer = null, finalName = name;
      if (useAI) {
        try { buffer = await MM.generateMusic(a.musicPrompt, (s) => status('🎧 Música IA ' + s)); }
        catch (e) { say('error', 'Música IA: ' + e.message + ' Uso una base compuesta en su lugar.', 'sound'); }
      }
      if (!buffer) { buffer = await MM.renderMusicBed(a.musicMood === 'none' ? 'chill' : a.musicMood); finalName = 'Base · ' + a.musicMood; }
      song = project.songs.find((s) => s.name === finalName) || { name: finalName, buffer };
      if (!project.songs.includes(song)) project.songs.push(song);
      $('agent-sound').dataset.state = 'done';
      if (!busy) status('');
    }
    plan.audio.music = song.name;
    player.load(project, plan);
    renderManual();
  }

  // ---------- Generación de clips con IA ----------
  function aspectFor(p) { return ['9:16', '16:9', '1:1'].includes(p.format) ? p.format : '9:16'; }
  function kickGeneration(p) {
    const missing = p.segments.filter((s) => s.kind === 'ai_video' && !project.aiClips[MM.aiKey(s)] && !pending[MM.aiKey(s)]);
    if (!missing.length) return Promise.resolve();
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
    if (!busy) status('');
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
      await ensureMusic();
      await autoQuality();
      say('ai', `Hecho en ${Math.round((performance.now() - t0) / 1000)} s.`, 'producer');
      await player.seek(0); player.play(); $('playBtn').textContent = '❚❚';
    } catch (e) { say('error', e.message); }
    status('');
    setBusy(false);
  }
  $('send').onclick = () => send($('input').value);

  // Hablarle con la voz (dictado del navegador).
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    const mic = document.createElement('button');
    mic.className = 'icon-btn'; mic.id = 'mic'; mic.type = 'button';
    mic.setAttribute('aria-label', 'Hablarle al equipo'); mic.title = 'Hablarle al equipo';
    mic.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
    $('send').parentNode.insertBefore(mic, $('send'));
    let rec = null;
    mic.onclick = () => {
      if (rec) { rec.stop(); return; }
      if (busy) return;
      rec = new SR();
      rec.lang = navigator.language || 'es-ES';
      rec.interimResults = true;
      rec.continuous = false;
      let finalText = '';
      mic.style.background = 'var(--tally, #FF4D2E)'; mic.style.color = '#fff';
      $('input').placeholder = 'Te escucho…';
      rec.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalText += e.results[i][0].transcript; else interim += e.results[i][0].transcript;
        }
        $('input').value = (finalText + interim).trim();
      };
      rec.onerror = (e) => { if (e.error === 'not-allowed') say('error', 'Dale permiso al micrófono en tu navegador para hablarle al equipo.'); };
      rec.onend = () => {
        rec = null;
        mic.style.background = ''; mic.style.color = '';
        $('input').placeholder = 'Dile al equipo qué cambiar…';
        if (finalText.trim()) send(finalText.trim());
      };
      try { rec.start(); } catch { rec = null; }
    };
  }
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

  // ---------- Edición directa sobre el video (tocar, arrastrar, agrandar) ----------
  const view = $('view');
  let drag = null;
  let selected = null;          // { spec, idx, isCaption }
  const bar = document.createElement('div');
  bar.id = 'textBar';
  bar.hidden = true;
  bar.style.cssText = 'position:absolute;z-index:4;display:flex;gap:6px;padding:6px;border-radius:14px;background:rgba(14,13,18,.9);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)';
  const mkBtn = (label, title, fn) => {
    const b = document.createElement('button');
    b.className = 'icon-btn'; b.textContent = label; b.title = title; b.setAttribute('aria-label', title);
    b.onclick = (e) => { e.stopPropagation(); fn(); };
    bar.appendChild(b);
    return b;
  };
  const barInput = document.createElement('input');
  barInput.type = 'text'; barInput.id = 'textBarInput';
  barInput.style.cssText = 'width:9.5em;min-width:0;padding:8px 10px;border-radius:10px';
  barInput.setAttribute('aria-label', 'Texto');
  mkBtn('A−', 'Más pequeño', () => resizeSelected(0.88));
  mkBtn('A+', 'Más grande', () => resizeSelected(1.14));
  bar.appendChild(barInput);
  mkBtn('🗑', 'Borrar texto', () => deleteSelected());
  mkBtn('✕', 'Listo', () => selectText(null));
  $('stage').appendChild(bar);

  function canvasPoint(e) {
    const r = view.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * view.width, y: ((e.clientY - r.top) / r.height) * view.height };
  }
  function hitText(pt) {
    const t = player.t;
    const items = (player.textItems || []).filter((it) => it.box && Math.abs(it.box.t - t) < 0.05 && t >= it.start && t <= it.end);
    for (let i = items.length - 1; i >= 0; i--) {
      const b = items[i].box;
      if (pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) return items[i];
    }
    return null;
  }
  function positionBar() {
    if (!selected) return;
    const item = (player.textItems || []).find((it) => it.spec === selected.spec) || (player.textItems || []).find((it) => selected.isCaption && it.spec.y === plan.captions.y);
    const r = view.getBoundingClientRect(), sr = $('stage').getBoundingClientRect();
    const b = item && item.box;
    const k = r.width / view.width;
    let top = b ? r.top - sr.top + (b.y + b.h) * k + 6 : 8;
    if (top > sr.height - 60) top = Math.max(8, (b ? r.top - sr.top + b.y * k : 8) - 58);
    bar.style.top = top + 'px';
    bar.style.left = Math.max(8, Math.min(sr.width - bar.offsetWidth - 8, (b ? r.left - sr.left + (b.x + b.w / 2) * k : sr.width / 2) - bar.offsetWidth / 2)) + 'px';
  }
  function selectText(sel) {
    selected = sel;
    bar.hidden = !sel;
    if (!sel) return;
    barInput.value = sel.isCaption ? '(subtítulos)' : sel.spec.text;
    barInput.disabled = sel.isCaption;
    positionBar();
  }
  function commitManual(before, note) {
    undoStack.push(before);
    noteManual(note);
    $('undo').disabled = busy || !undoStack.length;
    player.load(project, plan);
    renderManual();
    if (selected && !selected.isCaption) selected.spec = plan.texts[selected.idx] || null;
    if (selected && !selected.spec && !selected.isCaption) selectText(null); else positionBar();
  }
  function resizeSelected(k) {
    if (!selected) return;
    const before = JSON.parse(JSON.stringify(plan));
    if (selected.isCaption) { plan.captions.size = MM.clamp(plan.captions.size * k, 0.03, 0.15); plan.captions.userEdited = true; commitManual(before, `captions size ${plan.captions.size.toFixed(3)}`); return; }
    const t = plan.texts[selected.idx];
    t.size = MM.clamp(t.size * k, 0.02, 0.3); t.userEdited = true;
    commitManual(before, `text "${t.text}" resized to ${t.size.toFixed(3)}`);
  }
  function deleteSelected() {
    if (!selected) return;
    const before = JSON.parse(JSON.stringify(plan));
    if (selected.isCaption) { plan.captions.enabled = false; commitManual(before, 'captions turned off'); selectText(null); return; }
    const [t] = plan.texts.splice(selected.idx, 1);
    selectText(null);
    commitManual(before, `deleted text "${t.text}"`);
  }
  barInput.addEventListener('change', () => {
    if (!selected || selected.isCaption || !barInput.value.trim()) return;
    const before = JSON.parse(JSON.stringify(plan));
    const t = plan.texts[selected.idx];
    t.text = barInput.value.trim(); t.userEdited = true;
    commitManual(before, `text changed to "${t.text}"`);
  });

  view.addEventListener('pointerdown', (e) => {
    if (!plan || busy || !player) return;
    const pt = canvasPoint(e);
    const item = hitText(pt);
    if (!item) { selectText(null); return; }
    e.preventDefault();
    try { view.setPointerCapture(e.pointerId); } catch { /* */ }
    if (player.playing) { player.pause(); $('playBtn').textContent = '▶'; }
    const idx = plan.texts.indexOf(item.spec);
    const isCaption = idx < 0;
    drag = { item, idx, isCaption, start: pt, x0: item.spec.x, y0: item.spec.y, moved: false, before: JSON.parse(JSON.stringify(plan)) };
    selectText({ spec: item.spec, idx, isCaption });
  });
  view.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const pt = canvasPoint(e);
    const dx = (pt.x - drag.start.x) / view.width, dy = (pt.y - drag.start.y) / view.height;
    if (!drag.moved && Math.hypot(dx, dy) < 0.01) return;
    drag.moved = true;
    if (drag.isCaption) {
      const y = MM.clamp(drag.y0 + dy, 0.05, 0.95);
      (player.textItems || []).forEach((it) => { if (plan.texts.indexOf(it.spec) < 0) it.spec.y = y; });
      plan.captions.y = y;
    } else {
      drag.item.spec.x = MM.clamp(drag.x0 + dx, 0, 1);
      drag.item.spec.y = MM.clamp(drag.y0 + dy, 0, 1);
    }
    player.renderFrame(player.t, false);
    positionBar();
  });
  const endDrag = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (!d.moved) return;
    if (d.isCaption) {
      plan.captions.userEdited = true;
      commitManual(d.before, `captions moved to y=${plan.captions.y.toFixed(2)}`);
    } else {
      const t = plan.texts[d.idx];
      t.userEdited = true;
      commitManual(d.before, `text "${t.text}" moved by hand to x=${t.x.toFixed(2)}, y=${t.y.toFixed(2)}`);
    }
  };
  view.addEventListener('pointerup', endDrag);
  view.addEventListener('pointercancel', endDrag);
  view.style.touchAction = 'none';

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
  /// Guarda lo que el usuario cambió a mano para que el equipo lo respete.
  function noteManual(note) {
    project.manualNotes = project.manualNotes || [];
    const last = project.manualNotes[project.manualNotes.length - 1];
    if (last !== note) project.manualNotes.push(note);
    if (project.manualNotes.length > 30) project.manualNotes.shift();
  }
  function manualChange(mut, note) {
    if (!plan) return;
    if (note) noteManual(note);
    const prev = JSON.parse(JSON.stringify(plan));
    const next = JSON.parse(JSON.stringify(plan));
    mut(next);
    MM.sanitizePlan(next, project);
    clearTimeout(manualTimer);
    const pushUndo = !manualTimer;
    plan = next;
    manualTimer = setTimeout(() => { manualTimer = null; }, 1200);
    if (pushUndo) undoStack.push(prev);
    player.load(project, plan);
    $('undo').disabled = busy || !undoStack.length;
    if (!plan.audio.music && plan.audio.musicMood !== 'none') ensureMusic();
  }
  function slider(label, get, set, min, max, step = 0.01) {
    const wrap = document.createElement('div');
    wrap.className = 'ctl';
    const id = 'm-' + label.replace(/\W+/g, '');
    const v = get();
    wrap.innerHTML = `<label for="${id}"><span>${label}</span><span>${(+v).toFixed(2)}</span></label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${v}">`;
    const input = wrap.querySelector('input'), out = wrap.querySelector('label span:last-child');
    input.oninput = () => { out.textContent = (+input.value).toFixed(2); manualChange((p) => set(p, +input.value), `${label} = ${(+input.value).toFixed(2)}`); };
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
    sel.onchange = () => manualChange((p) => set(p, sel.value), `${label} = ${sel.value}`);
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
        inp.onchange = () => manualChange((p) => { p.texts[i].text = inp.value; p.texts[i].userEdited = true; }, `text ${i + 1} changed to "${inp.value}"`);
        wrap.appendChild(inp); tg.appendChild(wrap);
        tg.appendChild(select('Fuente', MM.FONT_NAMES.map((f) => [f, nice(f)]), () => t.font, (p, v) => { p.texts[i].font = v; }));
        tg.appendChild(select('Entrada', MM.ANIM_IN.map((f) => [f, nice(f)]), () => t.animationIn, (p, v) => { p.texts[i].animationIn = v; }));
        tg.appendChild(slider('Tamaño', () => t.size, (p, v) => { p.texts[i].size = v; p.texts[i].userEdited = true; }, 0.02, 0.25, 0.005));
        tg.appendChild(slider('Horizontal', () => t.x, (p, v) => { p.texts[i].x = v; p.texts[i].userEdited = true; }, 0, 1));
        tg.appendChild(slider('Vertical', () => t.y, (p, v) => { p.texts[i].y = v; p.texts[i].userEdited = true; }, 0, 1));
        tg.appendChild(slider('Rotación', () => t.rotation || 0, (p, v) => { p.texts[i].rotation = v; p.texts[i].userEdited = true; }, -45, 45, 1));
        const del = document.createElement('button');
        del.className = 'pill'; del.textContent = 'Borrar este texto';
        del.onclick = () => { manualChange((p) => { p.texts.splice(i, 1); }, `deleted text "${t.text}"`); renderManual(); };
        tg.appendChild(del);
      });
    }
    const addText = document.createElement('button');
    addText.className = 'pill'; addText.textContent = '＋ Agregar texto';
    addText.onclick = () => {
      const tl = MM.buildTimeline(plan, project);
      const cur = tl.items.find((it) => player.t >= it.start && player.t < it.start + it.dur) || tl.items[0];
      if (!cur) return;
      manualChange((p) => { p.texts.push(Object.assign(MM.basicText('Tu texto'), { segmentIndex: cur.index, startOffset: Math.max(0, player.t - cur.start), duration: 3, userEdited: true })); }, 'added a text by hand');
      renderManual();
      say('ai', 'Agregué un texto donde está la reproducción. Arrástralo sobre el video para moverlo y cámbiale las palabras aquí.', 'text');
    };
    box.appendChild(addText);
        title('Audio');
    g = grid();
    g.appendChild(select('Voz', MM.VOICE_PRESETS.map((v) => [v, nice(v)]), () => plan.audio.voicePreset, (p, v) => { p.audio.voicePreset = v; }));
    [['Volumen voz', 'voiceVolume', 0, 2], ['Limpieza de ruido', 'cleanup', 0, 1], ['Compresor', 'compression', 0, 1],
      ['Graves', 'eqLow', -1, 1], ['Medios', 'eqMid', -1, 1], ['Agudos', 'eqHigh', -1, 1], ['Reverb', 'reverb', 0, 1]]
      .forEach(([l, k, a, b]) => g.appendChild(slider(l, () => plan.audio[k] ?? 0, (p, v) => { p.audio[k] = v; }, a, b)));
    g.appendChild(select('Música', [['', 'Sin música'], ...project.songs.map((s) => [s.name, s.name])], () => plan.audio.music, (p, v) => { p.audio.music = v; if (!v) p.audio.musicMood = 'none'; }));
    g.appendChild(select('Crear base musical', MM.MUSIC_MOODS.map((m) => [m, m === 'none' ? '—' : nice(m)]), () => (plan.audio.music ? 'none' : plan.audio.musicMood),
      (p, v) => { p.audio.music = ''; p.audio.musicMood = v; p.audio.musicPrompt = ''; }));
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
      status('🎧 Buscando la mejor parte de la canción…');
      const info = MM.analyzeSong(buffer);
      project.songs.push({ name: f.name, buffer, info });
      status('');
      manualChange((p) => { p.audio.music = f.name; p.audio.musicStart = info.best; p.audio.musicVolume = p.audio.musicVolume || 0.35; p.audio.musicMood = 'none'; }, `imported song "${f.name}" placed at its best part (${info.best.toFixed(1)} s)`);
      renderManual();
      say('ai', `Puse "${f.name}" desde su mejor parte (segundo ${info.best.toFixed(0)}${info.bpm ? `, ~${info.bpm} BPM` : ''}) y baja sola cuando alguien habla. Si quieres, pídeme "corta al ritmo de la música".`, 'sound');
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

  // ---------- Control de Calidad ----------
  function autoChecks() {
    const issues = [];
    const tl = MM.buildTimeline(plan, project);
    plan.segments.forEach((s, i) => { if (s.kind === 'ai_video' && !project.aiClips[MM.aiKey(s)]) issues.push(`segment #${i} is an AI shot that failed to generate (shows black)`); });
    tl.items.forEach((it) => { if (it.dur < 0.35) issues.push(`segment #${it.index} is very short (${it.dur.toFixed(2)}s)`); });
    plan.texts.forEach((t) => { if (t.size * (t.text.length / Math.max(1, Math.round(t.text.length / 18))) > 1.4) issues.push(`text "${t.text}" may be too big for the frame`); });
    if (plan.audio.music && plan.audio.musicVolume > 0.6 && project.sources.some((s) => (s.words || []).length)) issues.push('music volume high for a video with speech');
    if (tl.total < 1) issues.push('video shorter than 1 second');
    return issues;
  }
  /// El video tiene que pasar por Calidad antes de salir (hasta 2 rondas de arreglos).
  async function qualityGate() {
    if (!MM.settings.anthropicKey) return true;
    let previous = [];
    for (let round = 1; round <= 3; round++) {
      onAgent('qa', 'working');
      status(`🛡️ Control de Calidad revisando (ronda ${round})…`);
      const tl = MM.buildTimeline(plan, project);
      const textItems = MM.buildTextItems(plan, tl, project);
      const times = [];
      const n = MM.clamp(Math.round(tl.total / 3), 6, 12);
      for (let i = 0; i < n; i++) times.push(tl.total * (i + 0.5) / n);
      textItems.slice(0, 6).forEach((t) => times.push(Math.min(tl.total - 0.05, t.start + Math.min(0.8, (t.end - t.start) / 2))));
      times.sort((a, b) => a - b);
      const shots = await player.snapshots(times);
      const fx = MM.scheduleEffects(plan, tl);
      shots.forEach((sh) => {
        const it = tl.items.find((x) => sh.time >= x.start && sh.time < x.start + x.dur);
        const texts = textItems.filter((x) => sh.time >= x.start && sh.time <= x.end).map((x) => `"${x.spec.text}"`);
        const effs = [...fx.global, ...(it ? fx.bySeg[it.index] || [] : [])].filter((x) => sh.time >= x.start && sh.time <= x.end).map((x) => x.e.type);
        sh.label = `segment #${it ? it.index : '?'}${texts.length ? ', texts ' + texts.join(' ') : ''}${effs.length ? ', effects ' + effs.join(' ') : ''}`;
      });
      let qa;
      try { qa = await MM.qualityCheck(project, plan, shots, autoChecks(), round, previous); }
      catch (e) { onAgent('qa', 'error', e.message); return true; }
      const serious = qa.issues.filter((i) => i.severity !== 'minor');
      if (qa.approved || !serious.length) {
        onAgent('qa', 'done', `✅ Aprobado (${Math.round(qa.score)}/100). ${qa.summary}`);
        return true;
      }
      onAgent('qa', 'done', `❌ No aprobado (${Math.round(qa.score)}/100). ${qa.summary}\n` + serious.map((i) => `• ${MM.AGENTS[i.department].icon} ${i.problem}`).join('\n'));
      if (round === 3) break;
      previous = serious;
      const fixed = await MM.teamFix(project, plan, serious, onAgent);
      await Promise.all(Object.values(pending));
      applyPlan(fixed);
      await ensureMusic();
    }
    say('ai', 'Calidad todavía ve detalles. Puedes pedir cambios por chat o exportar igual con "Exportar sin revisión".', 'qa');
    return false;
  }

  /// Control de Calidad revisa solo después de cada trabajo del equipo.
  let approvedKey = null;
  const planKey = () => JSON.stringify(plan);
  async function autoQuality() {
    if (!plan || !MM.settings.anthropicKey) return;
    try {
      if (await qualityGate()) { approvedKey = planKey(); say('ai', '✅ Aprobado por Control de Calidad: listo para exportar.', 'qa'); }
    } catch (e) { say('error', 'Calidad: ' + e.message); }
    await player.seek(0);   // Calidad revisa cuadros de todo el video: la reproducción vuelve al inicio
  }

  // ---------- Exportar ----------
  let saveHandle = null;
  let lastExportURL = null;
  $('exportBtn').onclick = async () => {
    if (!plan || busy) return;
    const longVideo = player.duration > 10 * 60 || (MM.settings.quality === '4k' && player.duration > 3 * 60);
    if (longVideo && window.showSaveFilePicker) {
      try {
        saveHandle = await window.showSaveFilePicker({ suggestedName: (plan.title || 'mi-mente').replace(/[^\w\-]+/g, '-') + '.mp4',
          types: [{ description: 'Video MP4', accept: { 'video/mp4': ['.mp4'] } }] });
      } catch { saveHandle = null; }
    }
    setBusy(true);
    player.pause(); $('playBtn').textContent = '▶';
    let approved;
    try { approved = forceExport || approvedKey === planKey() ? true : await qualityGate(); }
    catch (e) { say('error', e.message); approved = false; }
    forceExport = false;
    if (!approved) {
      status('');
      setBusy(false);
      $('exportBtn').textContent = 'Exportar sin revisión';
      forceExport = true;
      return;
    }
    $('exportBtn').textContent = 'Exportar';
    status('');
    $('exportSheet').hidden = false;
    $('exportResult').hidden = true;
    $('exportTitle').textContent = 'Exportando…';
    $('exportBar').style.width = '0%';
    $('exportNote').textContent = 'Se graba en tiempo real: deja esta pantalla abierta.';
    try {
      const progress = (p) => { $('exportBar').style.width = Math.round(p * 100) + '%'; };
      const quality = MM.settings.quality;
      let result = null;
      const sz = MM.renderSize(plan, project, quality);
      if (await MM.offlineExportSupport(sz.w, sz.h)) {
        $('exportNote').textContent = `Exportando ${sz.w}×${sz.h} cuadro por cuadro (máxima calidad)…`;
        result = await player.exportOffline(quality, progress, saveHandle);
      }
      if (!result) {
        $('exportNote').textContent = 'Este navegador graba en tiempo real: deja esta pantalla abierta.';
        result = await player.export(progress);
      }
      saveHandle = null;
      if (result.saved) {
        $('exportTitle').textContent = '¡Guardado en tu computadora!';
        $('exportNote').textContent = `${result.size.w}×${result.size.h} MP4`;
        $('exportBar').style.width = '100%';
        setBusy(false);
        return;
      }
      const { blob, ext } = result;
      if (lastExportURL) URL.revokeObjectURL(lastExportURL);
      const url = URL.createObjectURL(blob);
      lastExportURL = url;
      const name = (plan.title || 'mi-mente').replace(/[^\w\-]+/g, '-').toLowerCase() + '.' + ext;
      $('exportVideo').src = url;
      $('downloadLink').href = url;
      $('downloadLink').download = name;
      $('exportResult').hidden = false;
      $('exportTitle').textContent = '¡Tu video está listo!';
      $('exportBar').style.width = '100%';
      $('exportNote').textContent = `${(blob.size / 1e6).toFixed(1)} MB · ${ext.toUpperCase()}${result.size ? ` · ${result.size.w}×${result.size.h}` : ''}`;
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
    project.sources = []; project.aiClips = {}; project.voices = {}; project.reference = ''; project.request = ''; project.manualNotes = []; project.chatLog = [];
    plan = null; undoStack.length = 0;
    $('chat').innerHTML = '';
    renderAgents();
  }

  // Abrir en el editor algo hecho en el Estudio de películas.
  MM.app = {
    async openProject(data, newPlan, opts = {}) {
      resetProject();
      $('studio').hidden = true;
      show('editor');
      setBusy(true);
      Object.assign(project.aiClips, data.aiClips || {});
      project.voices = data.voices || {};
      applyPlan(MM.sanitizePlan(newPlan, project), false);
      try {
        if (opts.polish && MM.settings.anthropicKey) {
          status('El equipo está mirando las tomas…');
          await Promise.all(Object.values(project.aiClips).slice(0, 12).map(async (c) => { if (!c.frames) c.frames = await MM.sampleFrames(c, 1).catch(() => []); }));
          const p = await MM.teamPolish(project, JSON.parse(JSON.stringify(plan)), opts.polish, onAgent, ['color', 'vfx']);
          applyPlan(p, false);
        }
        await ensureMusic();
        if (opts.onPlan) await opts.onPlan(JSON.parse(JSON.stringify(plan)));
        await autoQuality();
        say('ai', 'Capítulo armado y revisado por Control de Calidad. Pide cambios por chat o expórtalo.', 'producer');
      } catch (e) { say('error', e.message); }
      status('');
      setBusy(false);
    },
  };

  // Arranque
  window.addEventListener('resize', () => player?.fit());
  MM.onFontsChanged = () => {
    if (!player || !player.textItems) return;
    player.textItems.forEach((i) => { delete i.layout; });
    if (!player.playing) player.renderFrame(player.t, false);
  };
  refreshBanner();
  renderAgents();
  // Para pruebas automáticas.
  MM.debug = { project, getPlan: () => plan, applyPlan: (p) => applyPlan(MM.sanitizePlan(p, project), false), show, addSources, player: () => player };
})();
