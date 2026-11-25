// Estudio de Películas y Series: el Guionista escribe, tú apruebas, y la app produce capítulo a capítulo.
(function () {
  const $ = (id) => document.getElementById(id);
  let current = null;   // serie abierta
  let working = false;

  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n[k] = v;
      else if (k === 'text') n.textContent = v;
      else n.setAttribute(k, v);
    });
    kids.flat().forEach((k) => { if (k != null) n.appendChild(typeof k === 'string' ? document.createTextNode(k) : k); });
    return n;
  };
  const log = (text, kind = '') => {
    const box = $('studioLog');
    box.hidden = false;
    box.appendChild(el('div', { class: 'msg ' + kind, text }));
    box.scrollTop = box.scrollHeight;
  };
  const setWorking = (b, text) => {
    working = b;
    document.querySelectorAll('#studio button[data-busy]').forEach((x) => { x.disabled = b; });
    $('studioStatus').hidden = !b;
    $('studioStatusText').textContent = text || '';
  };
  async function save() { if (current) await MM.db.set('series:' + current.id, current); }

  MM.studio = {
    async open() {
      $('home').hidden = true; $('editor').hidden = true; $('studio').hidden = false;
      await renderList();
    },
  };

  async function renderList() {
    current = null;
    const box = $('studioBody');
    box.innerHTML = '';
    const keys = (await MM.db.keys()).filter((k) => String(k).startsWith('series:'));
    const series = (await Promise.all(keys.map((k) => MM.db.get(k)))).filter(Boolean).sort((a, b) => b.created - a.created);

    const form = el('div', { class: 'card' },
      el('span', { class: 'eyebrow', text: 'Nueva producción' }),
      el('h2', { text: '¿Qué quieres crear?' }),
      el('textarea', { id: 'stPremise', rows: '4', placeholder: 'Ej: Una novela dominicana sobre dos hermanos que heredan un colmado en Santo Domingo y descubren que su papá tenía una doble vida. Drama con humor.' }),
      el('div', { class: 'grid2' },
        ctl('Tipo', sel('stKind', [['película', 'Película'], ['serie', 'Serie'], ['novela', 'Novela / telenovela'], ['corto', 'Cortometraje'], ['anime', 'Anime'], ['documental', 'Documental']])),
        ctl('Capítulos', el('input', { id: 'stChapters', type: 'number', min: '1', max: '60', value: '3' })),
        ctl('Duración por capítulo', sel('stMinutes', [['0.5', '30 segundos'], ['1', '1 minuto'], ['2', '2 minutos'], ['3', '3 minutos'], ['5', '5 minutos'], ['10', '10 minutos'], ['20', '20 minutos']], '1')),
        ctl('Estilo visual', el('input', { id: 'stStyle', type: 'text', placeholder: 'realista cinematográfico, anime, 3D tipo Pixar…' })),
        ctl('Formato', sel('stFormat', [['16:9', '16:9 YouTube / TV'], ['9:16', '9:16 TikTok / Reels'], ['1:1', '1:1']])),
      ),
      el('label', { class: 'small' }, el('input', { id: 'stVoice', type: 'checkbox', checked: 'checked' }), ' Narración con voz IA (fal.ai)'),
      el('button', { class: 'btn', 'data-busy': '1', onclick: createSeries, text: '📝 Escribir la historia' }),
      el('p', { class: 'small', text: 'Cada toma de 5 s cuesta en fal.ai entre centavos y ~0.5 USD según el modelo. Un capítulo de 1 min ≈ 12 tomas. Tú apruebas el guion antes de que se genere nada.' }),
    );
    box.appendChild(form);
    if (series.length) {
      box.appendChild(el('div', { class: 'section-title', text: 'Tus producciones' }));
      series.forEach((s) => box.appendChild(el('button', { class: 'card', style: 'text-align:left', onclick: () => openSeries(s) },
        el('h2', { text: s.bible?.title || 'Sin título' }),
        el('p', { text: `${s.req.kind} · ${s.req.chapters} cap. · ${Object.values(s.chapters || {}).filter((c) => c.produced).length} producidos` }))));
    }
  }

  function ctl(label, input) { return el('div', { class: 'ctl' }, el('label', {}, el('span', { text: label })), input); }
  function sel(id, options, value) {
    const s = el('select', { id });
    options.forEach(([v, t]) => s.appendChild(el('option', { value: v, text: t })));
    if (value) s.value = value;
    return s;
  }

  async function createSeries() {
    const premise = $('stPremise').value.trim();
    if (!premise) { $('stPremise').focus(); return; }
    if (!MM.settings.anthropicKey) { log('Pon tu API key de Anthropic en ⚙︎ Ajustes.', 'error'); return; }
    const req = { premise, kind: $('stKind').value, chapters: MM.clamp(+$('stChapters').value || 1, 1, 60),
      minutes: +$('stMinutes').value, style: $('stStyle').value.trim(), voice: $('stVoice').checked, language: '', format: $('stFormat').value };
    setWorking(true, '📝 El Guionista está escribiendo la biblia de la historia…');
    try {
      const bible = await MM.writeBible(req);
      current = { id: MM.uid(), created: Date.now(), req, bible, chapters: {} };
      await save();
      log('📝 ' + bible.reply);
      renderSeries();
    } catch (e) { log(e.message, 'error'); }
    setWorking(false);
  }

  function openSeries(s) { current = s; renderSeries(); }

  function renderSeries() {
    const s = current;
    const b = s.bible;
    const box = $('studioBody');
    box.innerHTML = '';
    box.appendChild(el('button', { class: 'pill', onclick: renderList, text: '‹ Todas las producciones' }));
    const chars = el('div', { class: 'grid2' });
    b.characters.forEach((c, i) => chars.appendChild(el('div', { class: 'ctl' },
      el('label', {}, el('span', { text: c.name })),
      el('textarea', { rows: '3', oninput: (e) => { b.characters[i].look = e.target.value; save(); } }, c.look))));
    box.appendChild(el('div', { class: 'card' },
      el('span', { class: 'eyebrow', text: `${s.req.kind} · ${b.chapters.length} capítulos · ${s.req.minutes} min c/u` }),
      el('h2', { text: b.title }),
      el('p', { text: b.logline }),
      el('div', { class: 'ctl' }, el('label', {}, el('span', { text: 'Estilo visual (se repite en cada toma)' })),
        el('textarea', { rows: '2', oninput: (e) => { b.style = e.target.value; save(); } }, b.style)),
      el('div', { class: 'section-title', text: 'Personajes' }), chars,
      el('div', { class: 'row' },
        el('input', { id: 'bibleAsk', type: 'text', placeholder: 'Pídele cambios al guionista: más drama, otro final, un villano…' }),
        el('button', { class: 'btn ghost', 'data-busy': '1', onclick: reviseBible, text: 'Cambiar historia' })),
    ));
    b.chapters.forEach((ch) => box.appendChild(chapterCard(ch)));
  }

  async function reviseBible() {
    const ask = $('bibleAsk').value.trim();
    if (!ask) return;
    setWorking(true, '📝 El Guionista está reescribiendo…');
    try {
      const nb = await MM.reviseBible(current.bible, ask);
      current.bible = nb;
      await save();
      log('📝 ' + nb.reply);
      renderSeries();
    } catch (e) { log(e.message, 'error'); }
    setWorking(false);
  }

  function chapterCard(ch) {
    const state = current.chapters[ch.number] || {};
    const card = el('div', { class: 'card' },
      el('span', { class: 'eyebrow', text: `Capítulo ${ch.number} · ${state.produced ? 'producido ✓' : state.approved ? 'guion aprobado' : state.script ? 'guion para revisar' : 'sin guion'}` }),
      el('h2', { text: ch.title }),
      el('p', { text: ch.summary }));
    const actions = el('div', { class: 'row' });
    if (!state.script) {
      actions.appendChild(el('button', { class: 'btn', 'data-busy': '1', onclick: () => writeChapter(ch.number), text: '📝 Escribir guion' }));
    } else {
      const shots = state.script.scenes.flatMap((sc) => sc.shots);
      const secs = shots.reduce((a, x) => a + (x.seconds > 7.5 ? 10 : 5), 0);
      const list = el('div', { class: 'grid2' });
      state.script.scenes.forEach((sc, si) => {
        list.appendChild(el('div', { class: 'section-title', text: `Escena ${si + 1}: ${sc.heading}` }));
        sc.shots.forEach((sh, hi) => list.appendChild(el('div', { class: 'ctl' },
          el('label', {}, el('span', { text: `Toma ${hi + 1} · ${sh.camera.replace(/_/g, ' ')} · ${sh.seconds > 7.5 ? 10 : 5}s${sh.sfx !== 'none' ? ' · 🔊 ' + sh.sfx : ''}` })),
          el('textarea', { rows: '3', oninput: (e) => { sh.prompt = e.target.value; state.approved = false; save(); } }, sh.prompt),
          el('input', { type: 'text', value: sh.narration, placeholder: 'Narración / diálogo', oninput: (e) => { sh.narration = e.target.value; save(); } }))));
      });
      card.appendChild(el('details', {}, el('summary', { class: 'small', text: `Ver y editar el guion (${shots.length} tomas · ${Math.round(secs)} s)` }), list));
      card.appendChild(el('div', { class: 'row' },
        el('input', { id: 'chAsk' + ch.number, type: 'text', placeholder: 'Cambios al guion de este capítulo…' }),
        el('button', { class: 'btn ghost', 'data-busy': '1', onclick: () => reviseChapter(ch.number), text: 'Cambiar guion' })));
      if (!state.produced) actions.appendChild(el('button', { class: 'btn', 'data-busy': '1', onclick: () => produce(ch.number), text: `✅ Aprobar y producir (${shots.length} tomas)` }));
      else {
        actions.appendChild(el('button', { class: 'btn', 'data-busy': '1', onclick: () => produce(ch.number), text: '🎬 Abrir en el editor' }));
      }
    }
    card.appendChild(actions);
    return card;
  }

  async function writeChapter(n) {
    setWorking(true, `📝 Escribiendo el guion del capítulo ${n}…`);
    try {
      const prev = current.chapters[n - 1]?.script;
      const prevEnd = prev ? prev.scenes[prev.scenes.length - 1]?.shots.slice(-1)[0]?.prompt : '';
      const script = await MM.writeChapter(current.bible, n, current.req.minutes, prevEnd);
      current.chapters[n] = { script, approved: false, produced: false };
      await save();
      log(`📝 Capítulo ${n}: ${script.reply}`);
      renderSeries();
    } catch (e) { log(e.message, 'error'); }
    setWorking(false);
  }

  async function reviseChapter(n) {
    const ask = $('chAsk' + n).value.trim();
    if (!ask) return;
    setWorking(true, `📝 Reescribiendo el capítulo ${n}…`);
    try {
      const script = await MM.reviseChapter(current.bible, current.chapters[n].script, ask);
      current.chapters[n] = { script, approved: false, produced: false };
      await save();
      log(`📝 ${script.reply}`);
      renderSeries();
    } catch (e) { log(e.message, 'error'); }
    setWorking(false);
  }

  /// Produce el capítulo: genera todas las tomas (4 a la vez), la narración, y lo arma en el editor.
  async function produce(n) {
    if (!MM.settings.falKey) { log('Para producir necesitas tu key de fal.ai (⚙︎ Ajustes).', 'error'); return; }
    const state = current.chapters[n];
    state.approved = true;
    await save();
    const shots = state.script.scenes.flatMap((sc, si) => sc.shots.map((sh) => ({ ...sh, scene: si })));
    const format = current.req.format || '16:9';
    const aiClips = {}, voices = {};
    const segments = shots.map((sh, i) => Object.assign(MM.clipSegment(0, 0, 0), {
      kind: 'ai_video', aiPrompt: sh.prompt, aiCamera: sh.camera, aiUseFrame: false, aiDuration: sh.seconds > 7.5 ? 10 : 5,
      transitionIn: { type: i === 0 ? 'none' : (sh.scene !== shots[i - 1].scene ? 'fade_black' : 'none'), duration: i === 0 ? 0 : 0.5 },
    }));
    let done = 0, failed = 0;
    setWorking(true, `🤖 Generando ${shots.length} tomas…`);
    const queue = segments.map((seg, i) => async () => {
      const key = MM.aiKey(seg);
      try {
        let blob = await MM.db.getBlob('clip:' + key);
        if (!blob) {
          const src = await MM.generateClip({ prompt: seg.aiPrompt, camera: seg.aiCamera, seconds: seg.aiDuration, aspect: format },
            (s) => $('studioStatusText').textContent = `🤖 Toma ${i + 1}/${shots.length}: ${s} · listas ${done}/${shots.length}`);
          blob = src.blob;
          await MM.db.setBlob('clip:' + key, blob);
          aiClips[key] = Object.assign(src, { generated: true, prompt: seg.aiPrompt });
        } else {
          aiClips[key] = Object.assign(await MM.loadSource(blob, 'IA', 'video'), { generated: true, prompt: seg.aiPrompt });
        }
        done++;
      } catch (e) { failed++; log(`Toma ${i + 1}: ${e.message}`, 'error'); }
      $('studioStatusText').textContent = `🤖 Tomas listas ${done}/${shots.length}${failed ? ` · ${failed} fallaron` : ''}`;
    });
    // Voces en off
    if (current.req.voice) {
      shots.forEach((sh, i) => {
        if (!sh.narration || !sh.narration.trim()) return;
        queue.push(async () => {
          try { voices['vo' + i] = await MM.generateVoice(sh.narration); }
          catch (e) { if (!voices.__warned) { voices.__warned = true; log('Voz IA: ' + e.message + ' (uso subtítulos).', 'error'); } }
        });
      });
    }
    // 4 trabajos a la vez
    const workers = Array.from({ length: 4 }, async () => { while (queue.length) await queue.shift()(); });
    await Promise.all(workers);
    delete voices.__warned;

    // Armar el plan del capítulo.
    const plan = {
      title: `${current.bible.title} · Cap. ${n}`, summary: state.script.title, format, segments,
      color: MM.neutralGrade(), captions: MM.defaultCaptions(), effects: [], audio: Object.assign(MM.defaultAudio(), { musicMood: state.script.musicMood, musicVolume: 0.35 }),
      texts: [], sfx: [], voiceovers: [],
    };
    const title = Object.assign(MM.basicText(`${current.bible.title}\nCapítulo ${n}: ${state.script.title}`), {
      segmentIndex: 0, startOffset: 0.4, duration: 3.2, y: 0.5, font: 'playfair', weight: 'black', size: 0.06,
      shadow: 0.8, animationIn: 'blur_in', animationOut: 'fade', letterSpacing: 0.04 });
    plan.texts.push(title);
    shots.forEach((sh, i) => {
      if (sh.narration && sh.narration.trim()) {
        if (voices['vo' + i]) plan.voiceovers.push({ key: 'vo' + i, segmentIndex: i, startOffset: 0.2, volume: 1 });
        plan.texts.push(Object.assign(MM.basicText(sh.narration), {
          segmentIndex: i, startOffset: 0.2, duration: (sh.seconds > 7.5 ? 10 : 5) - 0.4, y: 0.86, size: 0.032, weight: 'bold',
          font: 'inter', background: 'box', backgroundColor: '#000000A6', shadow: 0, animationIn: 'fade', animationOut: 'fade', maxWidth: 0.8 }));
      }
      if (sh.sfx && sh.sfx !== 'none') plan.sfx.push({ type: sh.sfx, segmentIndex: i, startOffset: 0.1, volume: 0.8 });
    });
    state.produced = done > 0;
    await save();
    setWorking(false);
    log(`🎬 Capítulo ${n}: ${done} tomas listas${failed ? `, ${failed} fallaron (puedes reintentar)` : ''}. Abriendo el editor…`);
    MM.app.openProject({ aiClips, voices }, plan, {
      polish: `This is chapter ${n} of "${current.bible.title}" (${current.req.kind}). Style: ${current.bible.style}. Give it a cohesive cinematic grade and subtle purposeful effects that fit the story. Keep narration subtitles and title as they are.`,
    });
  }

  // Botones del estudio
  $('openStudio').onclick = () => MM.studio.open();
  $('studioBack').onclick = () => { if (!working) { $('studio').hidden = true; $('home').hidden = false; } };
})();
