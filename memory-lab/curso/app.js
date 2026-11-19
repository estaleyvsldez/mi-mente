/* CURSO DE INGLÉS (versión simple) — una lección por estructura, siempre en orden, una cosa por pantalla.
   Usa la biblioteca de Memory Lab (SEM) y guarda el progreso en el almacén privado del usuario en claude.ai
   (o en este navegador si no hay almacén). Nunca bloquea: siempre hay un botón para seguir. */
(function () {
  'use strict';
  const $app = document.getElementById('app');
  const $foot = document.getElementById('foot');
  const CEFR = ['A1', 'A2', 'B1', 'B1+', 'B2', 'C1'];
  const DAY = 86400000;
  const BOX_DAYS = [1, 2, 4, 8, 16, 32];

  /* ---------- utilidades ---------- */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(9).forEach(c => { if (c != null && c !== false) el.append(c.nodeType ? c : String(c)); });
    return el;
  }
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  function speak(text) {
    try {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(SEM.plain(text));
      u.lang = 'en-US'; u.rate = 0.9;
      const v = speechSynthesis.getVoices().find(x => /en[-_]US/i.test(x.lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (_) { /* sin voz */ }
  }
  const speakBtn = text => ('speechSynthesis' in window) ? h('button', { class: 'btn speak', type: 'button', 'aria-label': 'Escuchar', onclick: () => speak(text) }, '🔊 Escuchar') : null;
  function blocks(markup) {
    return h('span', { class: 'sent' }, SEM.colorSegments(markup).map(s => (s.c === 'F' && !s.t.trim()) ? ' ' : (s.t === '___' ? h('span', { class: 'b ' + s.c }, '…') : h('span', { class: 'b ' + s.c }, s.t.trim()))));
  }

  /* ---------- curso: orden fijo de lecciones ---------- */
  const COURSE = (function () {
    const catIdx = {}; SEM.CATS.forEach((c, i) => { catIdx[c.id] = i; });
    const pos = {}; SEM.patterns.forEach((p, i) => { pos[p.id] = i; });
    const out = []; const placed = new Set();
    for (let st = 1; st <= 6; st++) {
      const list = SEM.patterns.filter(p => p.st === st).sort((a, b) => catIdx[a.cat] - catIdx[b.cat] || pos[a.id] - pos[b.id]);
      while (list.length) {
        const k = list.findIndex(p => (p.req || []).every(r => !SEM.byId[r] || placed.has(r) || SEM.byId[r].st > st));
        const p = list.splice(k < 0 ? 0 : k, 1)[0];
        out.push(p); placed.add(p.id);
      }
    }
    return out;
  })();

  /* ---------- trucos de memoria, en secuencia ---------- */
  const TRICKS = [
    { at: 1, n: 'Imagen viva', how: 'Convierte la frase en una imagen mental grande, con color y movimiento.', apply: p => 'Imagina ' + p.img + ' en tamaño gigante haciendo lo que dice la frase. Mira la imagen 3 segundos mientras lees la parte amarilla.' },
    { at: 4, n: 'Bloques', how: 'No memorices palabras sueltas: la parte amarilla es UN bloque fijo y solo cambia el hueco.', apply: p => 'Memoriza «' + SEM.plain(p.f).replace('___', '').replace(/\s+/g, ' ').trim() + '» como una sola pieza. Lo demás se cambia.' },
    { at: 8, n: 'Recordar sin mirar', how: 'Antes de ver la respuesta, intenta decirla en voz alta. Ese esfuerzo es lo que la fija.', apply: () => 'Tapa los ejemplos con la mano y di uno de memoria antes de pulsar Siguiente.' },
    { at: 12, n: 'Repasar justo a tiempo', how: 'No repases todo hoy. La app te trae cada frase de vuelta justo antes de que la olvides: mañana, en 2 días, en 4, en 8…', apply: () => 'Hoy no la repitas 20 veces. Confía en el repaso de mañana.' },
    { at: 17, n: 'Palacio de la memoria', how: 'Deja cada frase en un lugar de tu casa. Para recordarla, camina mentalmente hasta ese lugar.', apply: p => 'Pon ' + p.img + ' y esta frase en la puerta de tu casa. Mañana, «camina» hasta la puerta para recordarla.' },
    { at: 23, n: 'Mini historia', how: 'Une la frase nueva con la anterior en una historia corta tuya. Las historias guardan el orden.', apply: () => 'Inventa una escena donde uses esta frase justo después de la de la lección anterior.' },
    { at: 30, n: 'Palabra puente', how: 'Si una palabra inglesa te suena a una española, usa ese parecido como puente (y comprueba siempre el audio real).', apply: () => 'Busca en la frase una palabra que te suene a algo en español y crea una imagen con los dos significados.' },
    { at: 38, n: 'Tu propia vida', how: 'Lo que dices de ti mismo se recuerda mucho mejor que una frase de libro.', apply: () => 'Escribe en el último paso una frase VERDADERA sobre tu vida con esta estructura.' },
    { at: 47, n: 'Todos los sentidos', how: 'Ve la imagen, oye la frase, dila en voz alta y escríbela: cuantas más rutas, más fácil recordar.', apply: () => 'Pulsa Escuchar, repítela en voz alta dos veces y escríbela sin mirar.' }
  ];
  const trickFor = n => { let t = null; TRICKS.forEach(x => { if (n >= x.at) t = x; }); return t; };

  /* ---------- progreso guardado ---------- */
  let S = { v: 1, next: 0, done: {}, days: [], perDay: {} };
  const Save = {
    ref: null, label: 'Guardado en este navegador', timer: null, busy: false, again: false,
    async init() {
      try { const raw = localStorage.getItem('curso-ingles'); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch (_) { /* sin almacenamiento local */ }
      if (!(window.claude && typeof window.claude.use === 'function')) return;
      try {
        const res = await Promise.race([Promise.all([window.claude.use('db'), window.claude.use('user')]), new Promise(r => setTimeout(() => r(null), 9000))]);
        if (!res || !res[0] || !res[1]) return;
        const id = await res[1].id();
        if (!id) return;
        this.ref = res[0].collection('data/users/' + id).doc('curso');
        const snap = await this.ref.get();
        if (snap.exists) { const d = snap.data(); if (d && (d.next || 0) >= (S.next || 0)) S = Object.assign({ v: 1, next: 0, done: {}, days: [], perDay: {} }, JSON.parse(JSON.stringify(d))); }
        this.label = 'Guardado en tu cuenta';
      } catch (_) { this.ref = null; }
    },
    save() {
      try { localStorage.setItem('curso-ingles', JSON.stringify(S)); } catch (_) { /* sin almacenamiento local */ }
      if (!this.ref) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush(), 300);
    },
    async flush() {
      if (this.busy) { this.again = true; return; }
      this.busy = true;
      try { await this.ref.set(JSON.parse(JSON.stringify(S))); this.label = 'Guardado en tu cuenta'; }
      catch (_) { this.label = 'No se pudo guardar en tu cuenta; quedó en este navegador'; }
      this.busy = false;
      if (this.again) { this.again = false; this.flush(); }
      const el = document.getElementById('savelbl'); if (el) el.textContent = this.label;
    }
  };
  function markDay() { const d = today(); if (!S.days.includes(d)) S.days.push(d); if (S.days.length > 400) S.days.shift(); S.perDay[d] = (S.perDay[d] || 0); }
  function streak() {
    let n = 0; const d = new Date();
    const key = x => x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate();
    if (!S.days.includes(key(d))) d.setDate(d.getDate() - 1);
    while (S.days.includes(key(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  const dueReviews = () => Object.keys(S.done).filter(id => SEM.byId[id] && S.done[id].due <= Date.now()).sort((a, b) => S.done[a].due - S.done[b].due);

  /* ---------- material de cada lección ---------- */
  const clean = e => !/ \/ |—|\(/.test(SEM.plain(e[0])) && SEM.plain(e[0]).split(' ').length <= 14;
  function material(p) {
    const ex = p.ex.filter(clean).map(e => ({ m: e[0], es: e[1], alt: e[2] || [] }));
    const all = ex.length ? ex : p.ex.map(e => ({ m: e[0], es: e[1], alt: e[2] || [] }));
    const gen = (p.sl || []).length && /___/.test(p.f) ? p.sl.map(([en, es]) => ({ m: SEM.fill(p.f, en), es: cap(SEM.fillEs(p.es, es)), alt: [] })) : [];
    return { ex: all, gen };
  }
  function wrongOptions(p, s) {
    const w = [];
    (p.bad || []).forEach(b => { const t = b[0].replace(/\s*\(.*\)$/, ''); if (w.length < 1 && !/→/.test(t)) w.push(t); });
    const others = shuffle(SEM.patterns.filter(q => q.id !== p.id && q.st <= Math.max(p.st, 2)));
    for (const q of others) { if (w.length >= 2) break; const e = q.ex.find(clean); if (e && SEM.norm(e[0]) !== SEM.norm(s.m)) w.push(SEM.plain(e[0])); }
    return w;
  }

  /* ---------- pantallas ---------- */
  function foot(label, action, opts) {
    opts = opts || {};
    $foot.innerHTML = '';
    if (!label) { $foot.hidden = true; return; }
    $foot.hidden = false;
    const b = h('button', { class: 'btn main', type: 'button', id: 'mainbtn', onclick: action }, label);
    if (opts.disabled) b.disabled = true;
    $foot.append(h('div', { class: 'inner' }, b));
    return b;
  }
  function screen(...kids) { $app.innerHTML = ''; kids.forEach(k => k && $app.append(k)); window.scrollTo(0, 0); }

  function home() {
    const n = S.next;
    const p = COURSE[n];
    const due = dueReviews();
    const t = p ? trickFor(n + 1) : null;
    const doneN = Object.keys(S.done).length;
    const todayN = S.perDay[today()] || 0;
    screen(
      h('div', { class: 'top' }, h('b', null, 'Curso de inglés'), h('div', { class: 'bar' }, h('i', { style: 'width:' + (n / COURSE.length * 100) + '%' })), h('span', { class: 'small muted' }, n + '/' + COURSE.length)),
      p ? h('div', { class: 'card' },
        h('div', { class: 'step-name' }, 'Lección ' + (n + 1) + ' de ' + COURSE.length + ' · Nivel ' + CEFR[p.st - 1]),
        h('h1', null, cap(p.m.replace(/\.$/, ''))),
        h('p', { class: 'muted' }, 'Tema: ' + SEM.catById[p.cat].name + '. Vas a aprender: ', h('b', null, SEM.plain(p.f).replace('___', '…'))),
        due.length ? h('p', { class: 'note' }, 'Antes, un repaso rápido de ' + Math.min(due.length, 5) + ' frases que estás a punto de olvidar.') : null,
        todayN >= 3 ? h('p', { class: 'note' }, 'Hoy ya hiciste ' + todayN + ' lecciones. Puedes seguir, pero descansar ayuda a recordar.') : null)
        : h('div', { class: 'card' }, h('h1', null, '¡Terminaste el curso! 🎉'), h('p', null, 'Sigue con los repasos para no olvidar.')),
      t ? h('div', { class: 'card trick' }, h('div', { class: 't' }, '🧠 Truco de memoria actual: ' + t.n), h('div', null, t.how)) : null,
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', null, doneN), h('span', { class: 'small muted' }, 'lecciones hechas')),
        h('div', { class: 'stat' }, h('b', null, streak() + ' 🔥'), h('span', { class: 'small muted' }, 'días seguidos')),
        h('div', { class: 'stat' }, h('b', null, due.length), h('span', { class: 'small muted' }, 'repasos pendientes'))),
      syllabus(),
      h('p', { class: 'save', id: 'savelbl' }, Save.label));
    foot(due.length ? 'Empezar (repaso + lección ' + (n + 1) + ')' : p ? 'Empezar lección ' + (n + 1) : (due.length ? 'Repasar' : null), () => { if (due.length) review(due.slice(0, 5)); else if (p) lesson(p); });
  }

  function syllabus() {
    const box = h('details', { class: 'card' }, h('summary', null, 'Ver el temario completo (' + COURSE.length + ' lecciones)'));
    const map = h('div', { class: 'map' });
    let st = 0;
    COURSE.forEach((p, i) => {
      if (p.st !== st) { st = p.st; map.append(h('div', { class: 'stage' }, 'Nivel ' + CEFR[st - 1] + ' — ' + SEM.STAGES[st - 1].desc)); }
      const trick = TRICKS.find(t => t.at === i + 1);
      if (trick) map.append(h('div', { class: 'row' }, h('span', { class: 'n' }, '🧠'), h('span', { class: 'small' }, 'Truco nuevo: ' + trick.n)));
      map.append(h('div', { class: 'row' + (S.done[p.id] ? ' done' : '') + (i === S.next ? ' now' : '') }, h('span', { class: 'n' }, S.done[p.id] ? '✓' : i + 1), h('div', null, h('div', null, cap(p.m.replace(/\.$/, ''))), h('div', { class: 'small muted' }, SEM.plain(p.f).replace('___', '…')))));
    });
    box.append(map);
    return box;
  }

  /* ---------- lección: 5 pasos ---------- */
  function lesson(p) {
    const n = COURSE.indexOf(p);
    const mat = material(p);
    const sA = mat.ex[0], sB = mat.ex[1 % mat.ex.length], sC = mat.gen.length ? pick(mat.gen) : mat.ex[2 % mat.ex.length];
    const score = { ok: 0, total: 0 };
    const steps = [stepLook(p, n, mat), stepOrder(sA, score), stepChoose(p, sB, score), stepWrite(sC, score, p), stepOwn(p)];
    let i = 0;
    const header = () => h('div', { class: 'top' }, h('button', { class: 'btn', type: 'button', onclick: home, 'aria-label': 'Salir al inicio' }, '✕'), h('div', { class: 'bar' }, h('i', { style: 'width:' + (i / steps.length * 100) + '%' })), h('span', { class: 'small muted' }, 'Paso ' + (i + 1) + ' de ' + steps.length));
    const next = () => { i++; if (i >= steps.length) finish(); else run(); };
    const run = () => { const card = steps[i](next); screen(header(), card); };
    function finish() {
      const prev = S.done[p.id];
      const ratio = score.total ? score.ok / score.total : 1;
      const box = ratio >= 0.67 ? 1 : 0;
      S.done[p.id] = { score: ratio, box, ts: Date.now(), due: Date.now() + BOX_DAYS[box] * DAY - 3 * 3600000 };
      if (!prev && n === S.next) S.next = n + 1;
      markDay(); S.perDay[today()] = (S.perDay[today()] || 0) + 1;
      Save.save();
      screen(h('div', { class: 'card' }, h('h1', null, '✓ Lección completada'),
        h('p', null, 'Acertaste ' + score.ok + ' de ' + score.total + '.'),
        h('p', { class: 'muted' }, ratio >= 0.67 ? 'Muy bien. Volverá en un repaso dentro de ' + BOX_DAYS[box] + ' día(s).' : 'Volverá mañana en el repaso para reforzarla. Es normal: así se aprende.'),
        h('button', { class: 'btn', type: 'button', onclick: home }, 'Volver al inicio')),
        h('p', { class: 'save', id: 'savelbl' }, Save.label));
      const np = COURSE[S.next];
      foot(np ? 'Siguiente lección →' : 'Volver al inicio', () => { if (np) lesson(np); else home(); });
    }
    run();
  }

  function stepLook(p, n, mat) {
    return (next) => {
      const t = trickFor(n + 1);
      const isNew = t && t.at === n + 1;
      speak(mat.ex[0].m);
      foot('Siguiente →', next);
      return h('div', null,
        t ? h('div', { class: 'card trick' }, h('div', { class: 't' }, (isNew ? '🧠 NUEVO truco de memoria: ' : '🧠 Truco de memoria: ') + t.n), isNew ? h('p', null, t.how) : null, h('div', null, h('b', null, 'Con esta frase: '), t.apply(p))) : null,
        h('div', { class: 'card' },
          h('div', { class: 'step-name' }, 'Paso 1 · Mira y escucha'),
          h('div', { style: 'font-size:3rem' }, p.img),
          h('h1', null, cap(p.m.replace(/\.$/, ''))),
          h('p', { class: 'muted small' }, 'La parte de color amarillo nunca cambia. Lo demás lo cambias para decir lo que tú quieras.'),
          h('div', null, blocks(p.f)), h('div', { class: 'es' }, 'En español: ' + p.es.replace('[___]', '…')),
          h('h2', null, 'Ejemplos'),
          mat.ex.slice(0, 3).map(e => h('div', { class: 'ex' }, h('div', null, blocks(e.m), speakBtn(e.m)), h('div', { class: 'es' }, e.es))),
          p.n ? h('p', { class: 'note' }, '💡 ' + p.n) : null,
          p.bad && p.bad[0] ? h('p', { class: 'note' }, 'Error típico: ', h('span', { class: 'err' }, p.bad[0][0]), ' → ', h('span', { class: 'ok' }, p.bad[0][1])) : null));
    };
  }

  function stepOrder(s, score) {
    return (next) => {
      const target = SEM.chunks(s.m, false);
      let pool = shuffle(target.map((c, i) => Object.assign({ i }, c)));
      if (pool.length > 1 && pool.every((c, k) => c.i === k)) pool.reverse();
      const picked = [];
      const line = h('div', { class: 'chips', 'aria-label': 'Tu frase' });
      const bank = h('div', { class: 'chips' });
      const res = h('div');
      let checked = false;
      const check = () => {
        if (checked) return; checked = true;
        const ok = SEM.norm(picked.map(c => c.t).join(' ')) === SEM.norm(SEM.plain(s.m));
        score.total++; if (ok) score.ok++;
        bank.remove();
        res.append(h('div', { class: 'res ' + (ok ? 'good' : 'bad') }, h('b', null, ok ? '✓ ¡Correcto!' : 'Así es el orden correcto:'), h('div', null, blocks(s.m), speakBtn(s.m))));
        speak(s.m);
        foot('Siguiente →', next);
      };
      const draw = () => {
        line.innerHTML = ''; bank.innerHTML = '';
        picked.forEach((c, k) => line.append(h('button', { type: 'button', onclick: () => { if (!checked) { picked.splice(k, 1); draw(); } } }, c.t)));
        pool.forEach(c => bank.append(h('button', { type: 'button', class: picked.includes(c) ? 'used' : '', onclick: () => { picked.push(c); draw(); if (picked.length === pool.length) check(); } }, c.t)));
      };
      draw();
      foot('Ver la respuesta', () => { check(); });
      return h('div', { class: 'card' }, h('div', { class: 'step-name' }, 'Paso 2 · Ordena la frase'),
        h('p', { class: 'big-q' }, '«' + s.es + '»'), h('p', { class: 'muted small' }, 'Toca los bloques en orden para decirlo en inglés.'), line, bank, res);
    };
  }

  function stepChoose(p, s, score) {
    return (next) => {
      const opts = shuffle([{ t: SEM.plain(s.m), ok: true }].concat(wrongOptions(p, s).map(t => ({ t, ok: false }))));
      const res = h('div');
      let answered = false;
      const btns = opts.map(o => h('button', { type: 'button', onclick: () => choose(o) }, o.t));
      function choose(o) {
        if (answered) return; answered = true;
        score.total++; if (o && o.ok) score.ok++;
        btns.forEach((b, k) => { b.disabled = true; if (opts[k].ok) b.classList.add('right'); else if (opts[k] === o) b.classList.add('wrong'); });
        res.append(h('div', { class: 'res ' + (o && o.ok ? 'good' : 'bad') }, h('b', null, o && o.ok ? '✓ ¡Correcto!' : 'La correcta es la marcada en verde.'), speakBtn(s.m)));
        speak(s.m);
        foot('Siguiente →', next);
      }
      foot('Ver la respuesta', () => choose(null));
      return h('div', { class: 'card' }, h('div', { class: 'step-name' }, 'Paso 3 · Elige la correcta'),
        h('p', { class: 'big-q' }, '¿Cómo se dice «' + s.es + '»?'), h('div', { class: 'opts' }, btns), res);
    };
  }

  function stepWrite(s, score, p) {
    return (next) => {
      const inp = h('input', { type: 'text', id: 'answer', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Escribe la frase en inglés…', 'aria-label': 'Tu respuesta' });
      const res = h('div');
      let done = false;
      const check = () => {
        if (done) return; done = true;
        const r = SEM.check(inp.value, [SEM.plain(s.m)].concat(s.alt || []));
        const ok = r.grade !== 'no';
        score.total++; if (ok) score.ok++;
        inp.disabled = true;
        res.append(h('div', { class: 'res ' + (ok ? 'good' : 'bad') }, h('b', null, r.grade === 'ok' ? '✓ ¡Perfecto!' : r.grade === 'almost' ? '≈ Casi. Revisa la diferencia:' : inp.value.trim() ? 'No del todo. La respuesta es:' : 'La respuesta es:'),
          h('div', null, blocks(s.m), speakBtn(s.m))));
        speak(s.m);
        foot('Siguiente →', next);
      };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
      foot('Comprobar', check);
      setTimeout(() => inp.focus(), 50);
      return h('div', { class: 'card' }, h('div', { class: 'step-name' }, 'Paso 4 · Escríbela tú'),
        h('p', { class: 'big-q' }, '«' + s.es + '»'), h('p', { class: 'muted small' }, 'Usa el molde: ', blocks(p.f)), inp, res);
    };
  }

  function stepOwn(p) {
    return (next) => {
      const ta = h('textarea', { id: 'own', placeholder: 'Ejemplo: ' + SEM.plain(p.ex[0][0]) });
      foot('Terminar lección ✓', () => {
        if (ta.value.trim()) { S.mine = (S.mine || []).concat([{ id: p.id, t: ta.value.trim().slice(0, 300), ts: Date.now() }]).slice(-300); }
        next();
      });
      return h('div', { class: 'card' }, h('div', { class: 'step-name' }, 'Paso 5 · Tu propia frase (opcional)'),
        h('p', { class: 'big-q' }, 'Escribe una frase verdadera sobre tu vida con:'), h('div', null, blocks(p.f)),
        h('p', { class: 'muted small' }, 'Lo que dices de ti se recuerda mucho mejor. Si no quieres, pulsa Terminar.'), ta);
    };
  }

  /* ---------- repaso espaciado ---------- */
  function review(ids) {
    let i = 0;
    const steps = ids.map((id, k) => {
      const p = SEM.byId[id]; const mat = material(p);
      const s = pick(mat.ex.concat(mat.gen.slice(0, 3)));
      const sc = { ok: 0, total: 0 };
      return { id, sc, make: k % 2 === 0 ? stepChoose(p, s, sc) : stepWrite(s, sc, p) };
    });
    const run = () => {
      if (i >= steps.length) return afterReview();
      const st = steps[i];
      const card = st.make(() => {
        const d = S.done[st.id]; const ok = st.sc.ok === st.sc.total;
        d.box = ok ? Math.min(BOX_DAYS.length - 1, (d.box || 0) + 1) : 0;
        d.due = Date.now() + BOX_DAYS[d.box] * DAY - 3 * 3600000;
        markDay(); Save.save();
        i++; run();
      });
      screen(h('div', { class: 'top' }, h('button', { class: 'btn', type: 'button', onclick: home, 'aria-label': 'Salir al inicio' }, '✕'), h('div', { class: 'bar' }, h('i', { style: 'width:' + (i / steps.length * 100) + '%' })), h('span', { class: 'small muted' }, 'Repaso ' + (i + 1) + ' de ' + steps.length)), card);
    };
    function afterReview() {
      const p = COURSE[S.next];
      screen(h('div', { class: 'card' }, h('h1', null, '✓ Repaso hecho'), h('p', null, p ? 'Ahora sigue la lección ' + (S.next + 1) + ': ' + cap(p.m.replace(/\.$/, '')) : 'Todo al día.')));
      foot(p ? 'Empezar lección ' + (S.next + 1) + ' →' : 'Volver al inicio', () => { if (p) lesson(p); else home(); });
    }
    run();
  }

  /* ---------- arranque ---------- */
  screen(h('div', { class: 'card' }, h('h1', null, 'Curso de inglés'), h('p', { class: 'muted' }, 'Cargando tu progreso…')));
  $foot.hidden = true;
  Save.init().then(home, home);
  window.__curso = { COURSE, TRICKS, get state() { return S; }, home };
})();
