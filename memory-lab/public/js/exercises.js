/* MEMORY LAB — motor de ejercicios.
   Ejecuta sesiones de ejercicios de cualquier módulo, guarda cada resultado al terminar cada ejercicio
   (Store.attempt) y conserva la sesión en curso para poder reanudarla si se interrumpe. */
(function () {
  'use strict';
  const { h, toast } = UI;
  const Ex = window.Ex = { types: {} };

  /* ---------- bloques de colores ---------- */
  Ex.blocks = function (markup, mode, opts) {
    opts = opts || {};
    const wrap = h('span', { class: 'sent colors-' + (mode || 'full') });
    SEM.colorSegments(markup).forEach(s => {
      if (s.c === 'F' && !s.t.trim()) { wrap.appendChild(document.createTextNode(' ')); return; }
      if (s.t === '___') wrap.appendChild(h('span', { class: 'blk slot ' + s.c, title: SEM.COLOR_NAMES[s.c] }, SEM.ROLES[s.r] ? SEM.ROLES[s.r].name.split(' ')[0] : '___'));
      else wrap.appendChild(h('span', { class: 'blk ' + s.c, title: SEM.COLOR_NAMES[s.c] }, s.t.trim()));
    });
    if (opts.speak !== false) wrap.appendChild(Ex.speakBtn(SEM.plain(markup)));
    return wrap;
  };
  Ex.speakBtn = function (text, lang) {
    if (!Voice.canSpeak) return h('span');
    return h('button', { class: 'speak-btn', type: 'button', title: 'Escuchar', 'aria-label': 'Escuchar', onclick: e => { e.stopPropagation(); Voice.speak(text, lang); } }, '🔊');
  };
  Ex.legend = function () {
    return h('div', { class: 'legend' }, Object.keys(SEM.COLOR_NAMES).map(k => h('span', { class: 'blk ' + k }, SEM.COLOR_NAMES[k])));
  };

  /* ---------- caja de respuesta (escrita o por voz) ----------
     opts: {answers:[], key, placeholder, voice, lang, hint, onResult(res)}
     res: {score, grade, text, ms, viaVoice, corrected} */
  Ex.answerBox = function (opts) {
    const t0 = performance.now();
    const input = h('input', { type: 'text', class: 'answer-input', placeholder: opts.placeholder || 'Escribe tu respuesta…', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Respuesta' });
    const fb = h('div', { class: 'feedback' });
    let viaVoice = false, done = false, transcript = null;
    const check = () => {
      if (done) return;
      const text = input.value.trim();
      if (!text) { input.focus(); return; }
      done = true;
      const answers = (opts.answers || []).concat((SEM.acceptedFor ? [] : []));
      const accepted = (Ex.accepted[opts.key] || []);
      let res = SEM.check(text, answers);
      if (res.grade !== 'ok' && accepted.includes(SEM.norm(text))) res = { grade: 'ok', score: 1, best: text, diff: [] };
      const ms = performance.now() - t0;
      showFeedback(res, text, ms);
    };
    function showFeedback(res, text, ms) {
      input.disabled = true; btn.disabled = true; if (mic) mic.disabled = true;
      fb.innerHTML = '';
      const cls = res.grade === 'ok' ? 'good' : res.grade === 'almost' ? 'warn' : 'bad';
      const msg = res.grade === 'ok' ? '✓ Correcto' : res.grade === 'almost' ? '≈ Casi: revisa los detalles' : '✗ No es correcto';
      const box = h('div', { class: 'notice ' + cls }, h('b', null, msg));
      if (res.grade !== 'ok') {
        box.appendChild(h('div', { class: 'diff small' }, 'Tu respuesta: ', res.diff.map(d => h('span', { class: d.k }, d.w + ' '))));
      }
      box.appendChild(h('div', { style: { marginTop: '6px' } }, h('span', { class: 'muted small' }, 'Respuesta modelo: '), opts.modelEl ? opts.modelEl() : h('b', null, SEM.plain(res.best || opts.answers[0])), Ex.speakBtn(SEM.plain(res.best || opts.answers[0]))));
      if (viaVoice) box.appendChild(h('div', { class: 'small muted', style: { marginTop: '6px' } }, '🎙️ Se evaluó la transcripción («' + transcript + '»). Una transcripción correcta no garantiza una pronunciación correcta: compara escuchando el modelo.'));
      fb.appendChild(box);
      let score = res.score;
      const next = h('button', { class: 'btn primary', type: 'button', onclick: () => finish() }, 'Continuar →');
      const finish = () => { opts.onResult({ score, grade: res.grade, text, ms, viaVoice, best: res.best }); };
      const row = h('div', { class: 'row', style: { marginTop: '10px' } }, next);
      if (res.grade !== 'ok') {
        row.appendChild(h('button', { class: 'btn ghost small', type: 'button', title: 'Si tu respuesta era válida y natural, márcala. Se aceptará en el futuro.', onclick: e => {
          score = 0.9; Ex.accept(opts.key, text); e.target.disabled = true; e.target.textContent = 'Aceptada como válida'; } }, 'Mi respuesta también es válida'));
      }
      fb.appendChild(row);
      if (Voice.canSpeak && App.settings().autoplay && opts.autoplay !== false) Voice.speak(SEM.plain(res.best || opts.answers[0]));
      setTimeout(() => next.focus(), 30);
    }
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    const btn = h('button', { class: 'btn primary', type: 'button', onclick: check }, 'Comprobar');
    let mic = null;
    if (opts.voice !== false && Voice.canListen) {
      mic = h('button', { class: 'btn', type: 'button', title: 'Responder hablando', onclick: async () => {
        mic.disabled = true; mic.textContent = '🎙️ Escuchando…';
        try {
          const r = await Voice.listen(opts.lang || 'en-US');
          // elige la alternativa de reconocimiento más cercana a una respuesta válida
          let best = r.alternatives[0] || '', bs = -1;
          r.alternatives.forEach(a => { const c = SEM.check(a, opts.answers); if (c.score > bs) { bs = c.score; best = a; } });
          input.value = best; transcript = best; viaVoice = true;
          fb.innerHTML = ''; fb.appendChild(h('div', { class: 'notice small' }, 'Transcripción: «' + best + '». Si el reconocimiento se equivocó, corrígela antes de comprobar.'));
          input.focus();
        } catch (e) { toast(e.message, 'bad'); }
        mic.disabled = false; mic.textContent = '🎙️ Hablar';
      } }, '🎙️ Hablar');
    }
    const skip = h('button', { class: 'btn ghost small', type: 'button', onclick: () => { if (done) return; input.value = input.value || '—'; done = true; showFeedback({ grade: 'no', score: 0, best: opts.answers[0], diff: SEM.wordDiff('', opts.answers[0]) }, '', performance.now() - t0); } }, 'No lo sé');
    const el = h('div', null, opts.hint ? h('div', { class: 'muted small' }, opts.hint) : null, h('div', { class: 'row', style: { marginTop: '6px' } }, h('div', { class: 'grow' }, input), btn, mic, skip), fb);
    setTimeout(() => input.focus(), 30);
    return el;
  };

  /* Respuestas aceptadas manualmente (persisten en la base de datos). */
  Ex.accepted = {};
  Ex.loadAccepted = () => { Ex.accepted = Store.get('accepted', 'all') || {}; };
  Ex.accept = function (key, text) {
    if (!key) return;
    const a = Ex.accepted[key] || (Ex.accepted[key] = []);
    const n = SEM.norm(text);
    if (!a.includes(n)) a.push(n);
    Store.put('accepted', 'all', Ex.accepted);
  };

  /* Autoevaluación (para ejercicios orales sin micrófono o producción libre). */
  Ex.selfGrade = function (onGrade) {
    return h('div', { class: 'row', style: { marginTop: '10px' } },
      h('span', { class: 'muted small' }, '¿Cómo te salió?'),
      h('button', { class: 'btn small', type: 'button', onclick: () => onGrade(0.2) }, 'No me salió'),
      h('button', { class: 'btn small', type: 'button', onclick: () => onGrade(0.6) }, 'Con dudas'),
      h('button', { class: 'btn small good', type: 'button', onclick: () => onGrade(0.9) }, 'Bien'),
      h('button', { class: 'btn small good', type: 'button', onclick: () => onGrade(1) }, 'Perfecto y rápido'));
  };

  /* ---------- ejecutor de sesiones ---------- */
  Ex.KIND_NAMES = {};
  Ex.run = function (root, session) {
    /* session: {id, title, module, items:[{type,...}], idx, results:[], back, onDone} */
    session.idx = session.idx || 0;
    session.results = session.results || [];
    session.id = session.id || 'x' + Date.now().toString(36);
    session.started = session.started || Date.now();
    const saveProgress = () => {
      if (session.idx < session.items.length) Store.put('inprogress', 'current', { id: session.id, title: session.title, module: session.module, items: session.items, idx: session.idx, results: session.results, back: session.back, kind: session.kind, ctx: session.ctx, started: session.started });
      else Store.del('inprogress', 'current');
    };
    function step() {
      root.innerHTML = '';
      if (session.idx >= session.items.length) return finish();
      const item = session.items[session.idx];
      const type = Ex.types[item.type];
      const head = h('div', { class: 'ex-head' },
        h('button', { class: 'btn ghost small', type: 'button', onclick: () => { saveProgress(); location.hash = session.back || '#/'; } }, '✕ Salir'),
        h('div', { class: 'bar', title: (session.idx + 1) + ' de ' + session.items.length }, h('i', { style: { width: (session.idx / session.items.length * 100) + '%' } })),
        h('span', { class: 'small muted' }, (session.idx + 1) + '/' + session.items.length));
      const body = h('div', { class: 'card' });
      root.appendChild(h('div', { class: 'ex' }, head, h('div', { class: 'ex-kind' }, (type && type.label) || item.type), body));
      if (!type) { body.textContent = 'Tipo de ejercicio desconocido: ' + item.type; return; }
      type.render(body, item, result => {
        if (result && result.score != null) {
          const rec = Store.attempt(Object.assign({ module: session.module || item.module || 'general' }, result, { meta: Object.assign({ session: Store.session, run: session.id, type: item.type }, result.meta || {}) }));
          session.results.push({ type: item.type, item: result.item, score: rec.score, skill: result.skill, ms: result.ms || 0 });
          if (type.after) type.after(item, result);
        }
        session.idx++;
        saveProgress();
        step();
      }, session);
      window.scrollTo(0, 0);
    }
    function finish() {
      Store.del('inprogress', 'current');
      const graded = session.results.filter(r => r.score != null);
      const acc = graded.length ? graded.reduce((s, r) => s + r.score, 0) / graded.length : 0;
      const card = h('div', { class: 'card' }, h('h2', null, 'Sesión terminada'),
        h('div', { class: 'grid g3' },
          h('div', { class: 'stat' }, h('b', null, graded.length), h('span', null, 'ejercicios evaluados')),
          h('div', { class: 'stat' }, h('b', null, UI.pct(acc)), h('span', null, 'precisión')),
          h('div', { class: 'stat' }, h('b', null, UI.mins(Date.now() - session.started)), h('span', null, 'duración'))),
        h('p', { class: 'muted small', id: 'saveState' }, 'Guardando resultados…'));
      root.innerHTML = '';
      root.appendChild(h('div', { class: 'ex' }, card));
      const extra = session.onDone ? session.onDone(session, acc) : null;
      if (extra) card.appendChild(extra);
      card.appendChild(h('div', { class: 'row', style: { marginTop: '12px' } }, h('a', { class: 'btn primary', href: session.back || '#/' }, 'Volver')));
      const upd = () => { const el = document.getElementById('saveState'); if (!el) return off(); el.textContent = Store.pending ? 'Pendiente de guardar en el servidor (' + Store.pending + ' cambios). Se enviará automáticamente.' : '✓ Resultados guardados en la base de datos.'; if (!Store.pending) off(); };
      const off = Store.on(upd); Store.flush().then(upd);
    }
    saveProgress();
    step();
  };

  /* ---------- tipos genéricos reutilizables ---------- */
  Ex.types.info = {
    label: 'Explicación',
    render(el, item, done) {
      el.appendChild(h('h2', null, item.title));
      (item.paras || []).forEach(p => el.appendChild(typeof p === 'string' ? h('p', null, p) : p));
      el.appendChild(h('button', { class: 'btn primary', type: 'button', onclick: () => done(null) }, item.button || 'Entendido →'));
    }
  };
})();
