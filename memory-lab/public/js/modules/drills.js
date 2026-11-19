/* MEMORY LAB — motor de memorización y módulos de memoria.
   Un único tipo de ejercicio «mem» cubre: estudio (con técnica) → actividad intermedia opcional → recuperación → resultado.
   Lo usan los 12 módulos, Quick Memory, Hidden Memory, las lecciones progresivas y Memory Athlete. */
(function () {
  'use strict';
  const { h, toast, pct } = UI;
  const M = window.MEM = {};

  /* ---------- generadores de material ---------- */
  M.rng = (seed) => { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  M.items = function (n, opts) {
    opts = opts || {};
    let pool = SEM.BANK.slice();
    if (opts.cats) pool = pool.filter(i => opts.cats.includes(i.cat));
    if (opts.groups) {
      const cats = SEM.shuffle([...new Set(pool.map(i => i.cat))]).slice(0, opts.groups);
      const per = Math.ceil(n / opts.groups);
      return SEM.shuffle(cats.flatMap(c => SEM.shuffle(pool.filter(i => i.cat === c)).slice(0, per))).slice(0, n);
    }
    const out = SEM.shuffle(pool).slice(0, n);
    while (out.length < n) out.push(...SEM.shuffle(pool).slice(0, n - out.length)); // listas muy largas: repetición inevitable
    return out;
  };
  M.digits = n => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
  M.letters = n => Array.from({ length: n }, () => 'BCDFGHJKLMNPRSTVXZ'[Math.floor(Math.random() * 18)]).join('');
  M.words = n => {
    const all = SEM.BANK.map(i => ({ e: i.e, es: i.es, en: i.en })).concat(SEM.ABSTRACT.map(w => ({ e: '💭', es: w, en: '' })));
    const out = SEM.shuffle(all).slice(0, n);
    while (out.length < n) out.push(...SEM.shuffle(all).slice(0, n - out.length));
    return out;
  };
  const SUITS = [['♠', 'picas', 0], ['♥', 'corazones', 1], ['♦', 'diamantes', 1], ['♣', 'tréboles', 0]];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  M.deck = () => SUITS.flatMap(s => RANKS.map(r => ({ id: r + s[0], r, s: s[0], red: !!s[2] })));
  M.cardEl = c => h('span', { class: 'cardface' + (c.red ? ' red' : '') }, c.r + c.s);

  /* Rostros sintéticos (SVG) para memoria de caras y nombres. */
  M.face = function (seed) {
    const r = M.rng(seed);
    const pick = a => a[Math.floor(r() * a.length)];
    const skin = pick(['#f1c7a5', '#e0ac85', '#c68863', '#9b6a4a', '#6f4a33', '#f6d5bd']);
    const hair = pick(['#1d1a17', '#4a2f1d', '#8a5a2b', '#c9a15a', '#b33a2a', '#9a9a9a', '#e8e1d0']);
    const style = Math.floor(r() * 5), glasses = r() < 0.3, beard = r() < 0.3, shirt = pick(['#3e63dd', '#30a46c', '#e5484d', '#8e4ec6', '#f76b15', '#1c2024', '#7cc4f8']);
    const eye = pick(['#2b1d12', '#3b6ea5', '#4f7a3a']);
    const hairPaths = [
      `<path d="M28 44 Q30 18 55 16 Q80 18 82 44 Q78 30 55 28 Q32 30 28 44Z" fill="${hair}"/>`,
      `<path d="M26 50 Q24 14 55 14 Q86 14 84 50 L84 78 Q80 50 76 36 Q55 26 34 36 Q30 50 26 78Z" fill="${hair}"/>`,
      `<path d="M30 40 Q40 20 55 22 Q70 20 80 40 Q70 32 55 33 Q40 32 30 40Z" fill="${hair}"/>`,
      `<circle cx="55" cy="26" r="20" fill="${hair}"/><circle cx="36" cy="34" r="10" fill="${hair}"/><circle cx="74" cy="34" r="10" fill="${hair}"/>`,
      ``];
    return `<svg viewBox="0 0 110 110" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="rostro"><rect width="110" height="110" rx="14" fill="#2a3550" opacity=".25"/>
      <path d="M18 110 Q20 84 55 82 Q90 84 92 110Z" fill="${shirt}"/>
      <rect x="47" y="70" width="16" height="16" fill="${skin}"/>
      <ellipse cx="55" cy="52" rx="25" ry="29" fill="${skin}"/>
      ${hairPaths[style]}
      <circle cx="45" cy="52" r="3" fill="${eye}"/><circle cx="65" cy="52" r="3" fill="${eye}"/>
      <path d="M41 45 Q45 ${42 + Math.floor(r() * 3)} 49 45 M61 45 Q65 ${42 + Math.floor(r() * 3)} 69 45" stroke="${hair}" stroke-width="2" fill="none"/>
      <path d="M55 55 L53 63 L57 63" stroke="#00000044" stroke-width="1.5" fill="none"/>
      <path d="M47 ${69 + Math.floor(r() * 2)} Q55 ${73 + Math.floor(r() * 3)} 63 69" stroke="#7a3b2e" stroke-width="2" fill="none"/>
      ${beard ? `<path d="M32 60 Q34 84 55 86 Q76 84 78 60 Q72 76 55 76 Q38 76 32 60Z" fill="${hair}" opacity=".85"/>` : ''}
      ${glasses ? `<circle cx="45" cy="52" r="7" stroke="#111" stroke-width="2" fill="none"/><circle cx="65" cy="52" r="7" stroke="#111" stroke-width="2" fill="none"/><path d="M52 52 L58 52" stroke="#111" stroke-width="2"/>` : ''}
    </svg>`;
  };
  M.people = n => SEM.shuffle(SEM.NAMES).slice(0, n).map((name, i) => ({ seed: Math.floor(Math.random() * 1e9), name, sur: SEM.pick(SEM.SURNAMES), job: SEM.pick(SEM.JOBS) }));

  /* ---------- módulos de memoria ---------- */
  M.MODULES = [
    { id: 'numbers', n: 'Memoria numérica', icon: '🔢', kind: 'digits', base: 5, step: 2, techs: ['chunking', 'shapes', 'major'], desc: 'Secuencias de dígitos en orden.' },
    { id: 'letters', n: 'Memoria de letras', icon: '🔤', kind: 'letters', base: 4, step: 1, techs: ['chunking', 'acronym'], desc: 'Secuencias de letras.' },
    { id: 'words', n: 'Memoria de palabras', icon: '📝', kind: 'words', base: 5, step: 2, techs: ['visual-assoc', 'story', 'vocab-cat'], desc: 'Listas de palabras concretas y abstractas.' },
    { id: 'visual', n: 'Memoria visual', icon: '🖼️', kind: 'images', base: 4, step: 2, techs: ['visualize', 'scenes'], desc: 'Imágenes que aparecen y desaparecen; reconocimiento entre distractores.' },
    { id: 'colors', n: 'Memoria de colores', icon: '🎨', kind: 'colors', base: 3, step: 1, techs: ['visual-assoc', 'scenes'], desc: 'Objetos con colores: qué color tenía cada uno.' },
    { id: 'spatial', n: 'Memoria espacial', icon: '🧭', kind: 'spatial', base: 3, step: 1, techs: ['chunking', 'visualize'], desc: 'Posiciones en una cuadrícula.' },
    { id: 'faces', n: 'Memoria de rostros', icon: '🧑', kind: 'faces', base: 3, step: 1, techs: ['visual-assoc', 'exaggerate'], desc: 'Caras y nombres.' },
    { id: 'auditory', n: 'Memoria auditiva', icon: '👂', kind: 'auditory', base: 4, step: 1, techs: ['chunking', 'multisensory'], desc: 'Palabras o dígitos que solo escuchas.' },
    { id: 'conceptual', n: 'Memoria conceptual', icon: '🧠', kind: 'concept', base: 1, step: 0, techs: ['elaboration', 'feynman', 'analogy'], desc: 'Comprender y explicar conceptos con tus palabras.' },
    { id: 'sequence', n: 'Memoria de secuencias', icon: '➿', kind: 'sequence', base: 4, step: 1, techs: ['chunking', 'image-chain'], desc: 'Orden de elementos.' },
    { id: 'working', n: 'Memoria de trabajo', icon: '⚙️', kind: 'span', base: 3, step: 1, techs: ['chunking'], desc: 'Retener y manipular: repetir dígitos al revés.' },
    { id: 'associative', n: 'Memoria asociativa', icon: '🔗', kind: 'pairs', base: 4, step: 2, techs: ['visual-assoc', 'keyword', 'phonetic'], desc: 'Pares español → inglés y otros vínculos.' }
  ];
  M.modById = {}; M.MODULES.forEach(m => { M.modById[m.id] = m; });

  /* Nivel por módulo: sube con ≥85 % en 2 sesiones de días distintos; baja tras 2 sesiones <50 %. */
  M.modLevel = id => Object.assign({ level: 1, hist: [] }, Store.get('modlevel', id) || {});
  M.updateLevel = function (id, score) {
    const s = M.modLevel(id);
    const day = Stats.localDay(Date.now());
    s.hist = s.hist.concat([{ day, score }]).slice(-10);
    const recent = s.hist.slice(-2);
    let msg = null;
    if (recent.length === 2 && recent.every(x => x.score >= 0.85) && recent[0].day !== recent[1].day) { s.level++; s.hist = []; msg = '⬆ Subes al nivel ' + s.level + ' (85 % en dos días distintos).'; }
    else if (recent.length === 2 && recent.every(x => x.score < 0.5) && s.level > 1) { s.level--; s.hist = []; msg = '⬇ Bajamos temporalmente al nivel ' + s.level + ' para consolidar.'; }
    else if (recent.length === 2 && recent.every(x => x.score >= 0.85)) msg = 'Buen resultado. Para subir de nivel, repite con ≥85 % otro día (la retención diferida cuenta).';
    Store.put('modlevel', id, s);
    return msg;
  };
  M.MODES = {
    slow: { n: 'Lento', perItem: 6, mult: 1, desc: 'Aprendizaje guiado: tiempo amplio por elemento.' },
    normal: { n: 'Normal', perItem: 3, mult: 1, desc: 'Velocidad moderada.' },
    fast: { n: 'Rápido', perItem: 1.4, mult: 1.2, flash: true, desc: 'Presentación rápida, uno a uno, y recuperación inmediata.' },
    extreme: { n: 'Extremo', perItem: 0.8, mult: 2, flash: true, desc: 'Grandes cantidades y presentación muy rápida.' }
  };
  M.countFor = (mod, level, mode) => Math.max(1, Math.round((mod.base + (level - 1) * mod.step) * (M.MODES[mode] || M.MODES.normal).mult));

  /* Construye un ejercicio «mem» para un módulo. */
  M.make = function (modId, opts) {
    opts = opts || {};
    const mod = M.modById[modId];
    const lvl = opts.level || M.modLevel(modId).level;
    const mode = opts.mode || 'normal';
    const count = opts.count || M.countFor(mod, lvl, mode);
    const it = { type: 'mem', module: modId, kind: opts.kind || mod.kind, count, mode, technique: opts.technique || mod.techs[0], distractor: opts.distractor || 0, ordered: opts.ordered, recall: opts.recall, guided: opts.guided, label: opts.label };
    return M.fill(it);
  };
  M.fill = function (it) {
    const n = it.count;
    switch (it.kind) {
      case 'digits': it.data = M.digits(n); break;
      case 'letters': it.data = M.letters(n); break;
      case 'span': it.data = M.digits(n); break;
      case 'words': it.data = M.words(n); break;
      case 'images': case 'objects': it.data = M.items(n); break;
      case 'groups': it.data = M.items(n, { groups: it.groups || 3 }); break;
      case 'colors': it.data = M.items(n).map((x, i) => Object.assign({}, x, { color: SEM.shuffle(SEM.COLORS)[i % SEM.COLORS.length] })); break;
      case 'spatial': { const g = n <= 4 ? 4 : n <= 7 ? 5 : 6; it.grid = g; it.data = SEM.shuffle(Array.from({ length: g * g }, (_, i) => i)).slice(0, n); break; }
      case 'faces': it.data = M.people(n); break;
      case 'auditory': it.data = Math.random() < 0.5 ? M.digits(n + 2) : M.words(n).map(w => w.es); break;
      case 'concept': it.data = SEM.pick(SEM.CONCEPTS); break;
      case 'sequence': it.data = Array.from({ length: n }, () => SEM.pick(['⬆️', '➡️', '⬇️', '⬅️', '🔴', '🟢', '🔵', '🟡'])); break;
      case 'pairs': it.data = M.items(n).map(x => ({ e: x.e, es: x.es, en: x.en })); break;
      case 'cards': it.data = SEM.shuffle(M.deck()).slice(0, n); break;
      case 'dates': it.data = M.items(n).map(x => ({ e: x.e, es: x.es, year: 1500 + Math.floor(Math.random() * 525) })); break;
      case 'scene': it.data = M.items(n).map((x, i) => Object.assign({}, x, { color: SEM.shuffle(SEM.COLORS)[i % 12], pos: Math.floor(Math.random() * 9) })); break;
      case 'multimodal': {
        const objs = M.items(n).map((x, i) => Object.assign({}, x, { color: SEM.shuffle(SEM.COLORS)[i % 12], num: i % 2 === 0 ? Math.floor(Math.random() * 90) + 10 : null }));
        const known = (window.EN ? EN.learned() : []).filter(p => p.st <= 2);
        const p = known.length ? SEM.pick(known) : SEM.byId['looking-for'];
        it.data = { objs, pattern: p.id }; break;
      }
      default: it.data = M.items(n);
    }
    return it;
  };

  /* ---------- ejercicio «mem» ---------- */
  const KIND_LABEL = { digits: 'Memoria numérica', letters: 'Letras', span: 'Memoria de trabajo · al revés', words: 'Palabras', images: 'Memoria visual', groups: 'Agrupación', colors: 'Objetos y colores', spatial: 'Memoria espacial', faces: 'Rostros y nombres', auditory: 'Memoria auditiva', concept: 'Memoria conceptual', sequence: 'Secuencias', pairs: 'Memoria asociativa', cards: 'Cartas', dates: 'Fechas', scene: 'Escena', multimodal: 'Desafío multimodal', palace: 'Palacio de la memoria', peg: 'Anclajes (Peg)', story: 'Cadena de historia', delayed: 'Recuperación diferida' };

  Ex.types.mem = {
    get label() { return 'Memorización'; },
    render(el, it, done, session) {
      const mode = M.MODES[it.mode] || M.MODES.normal;
      const tech = SEM.techById[it.technique.split('+')[0]] || null;
      el.append(h('div', { class: 'row between' }, h('h2', { style: { margin: 0 } }, it.label || KIND_LABEL[it.kind] || 'Memorización'), h('span', { class: 'tag acc' }, (it.count) + ' elementos · ' + mode.n)));
      if (tech) el.append(h('div', { class: 'notice small' }, h('b', null, 'Técnica: ' + it.technique.split('+').map(t => (SEM.techById[t] || { n: t }).n).join(' + ') + '. '), it.guided ? tech.how : tech.what));
      const stage = h('div'); el.append(stage);
      const t0 = performance.now();
      const study = M.study[it.kind] || M.study.images;
      study(stage, it, mode, encodeMs => {
        const go = () => { stage.innerHTML = ''; (M.recall[it.kind] || M.recall.images)(stage, it, res => finish(res, encodeMs)); };
        if (it.distractor) M.distract(stage, it.distractor, go); else go();
      });
      function finish(res, encodeMs) {
        const total = res.total, correct = res.correct;
        const score = total ? Math.max(0, Math.min(1, (res.score != null ? res.score : correct / total))) : 0;
        stage.innerHTML = '';
        stage.append(h('div', { class: 'notice ' + (score >= 0.85 ? 'good' : score >= 0.6 ? 'warn' : 'bad') }, h('b', null, correct + ' / ' + total + ' (' + pct(score) + ')'), res.detail ? h('div', { class: 'small' }, res.detail) : null),
          res.review || h('span'));
        const meta = Object.assign({ itemsOk: res.itemsOk, orderOk: res.orderOk, intrusions: res.intrusions, encodeMs, count: it.count, mode: it.mode, kind: it.kind, delayed: !!it.delayedOf, ladder: it.ladder || null, sequence: ['digits', 'letters', 'span', 'sequence', 'cards'].includes(it.kind) }, res.meta || {});
        // Guardar para evaluación diferida (retención a 24 h) salvo si ya lo es.
        if (!it.delayedOf && it.kind !== 'concept' && it.kind !== 'span' && it.schedule !== false && score >= 0.5) {
          const id = 'd' + Date.now().toString(36);
          Store.put('delayed', id, { id, due: Date.now() + 20 * 3600000, created: Date.now(), item: Object.assign({}, it, { delayedOf: id, distractor: 0 }), immediate: score, module: it.module, technique: it.technique });
        }
        if (it.delayedOf) { const d = Store.get('delayed', it.delayedOf); if (d) Store.put('delayed', it.delayedOf, Object.assign({}, d, { done: Date.now(), delayedScore: score })); }
        const levelMsg = !it.delayedOf && M.modById[it.module] && !it.fixed ? M.updateLevel(it.module, score) : null;
        if (levelMsg) stage.append(h('div', { class: 'notice small' }, levelMsg));
        stage.append(h('button', { class: 'btn primary', type: 'button', onclick: () => done({ module: it.module || 'memory', technique: it.technique, item: (it.module || 'mem') + ':' + it.kind, skill: it.kind, score, ms: performance.now() - t0, total, correct, meta }) }, 'Continuar →'));
      }
    }
  };

  /* Actividad intermedia (Hidden Memory): sumas durante N segundos para impedir el repaso mental. */
  M.distract = function (el, secs, next) {
    el.innerHTML = '';
    let a, b, ok = 0, n = 0;
    const q = h('div', { class: 'prompt' }); const inp = h('input', { type: 'number', inputmode: 'numeric', 'aria-label': 'Resultado' });
    const newQ = () => { a = 2 + Math.floor(Math.random() * 30); b = 2 + Math.floor(Math.random() * 30); q.textContent = a + ' + ' + b + ' = ?'; inp.value = ''; inp.focus(); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { n++; if (Number(inp.value) === a + b) ok++; newQ(); } });
    el.append(h('div', { class: 'notice warn' }, 'Actividad intermedia: resuelve sumas. Lo memorizado está oculto; no lo repases.'), UI.countdown(secs, () => next()), q, inp);
    newQ();
  };

  /* ---------- fase de estudio ---------- */
  const tileOf = x => h('div', { class: 'tile' }, h('div', { class: 'em' }, x.e), h('div', { class: 'lbl' }, x.es));
  function timed(el, it, mode, content, next, secsOverride) {
    const secs = secsOverride || Math.max(4, Math.round(it.count * mode.perItem));
    const t0 = performance.now(); let fired = false;
    const end = () => { if (fired) return; fired = true; timer.stop(); next(performance.now() - t0); };
    const timer = UI.countdown(secs, end);
    el.append(timer, content, h('div', { class: 'row', style: { marginTop: '10px' } }, h('button', { class: 'btn', type: 'button', onclick: end }, 'Ya lo tengo →')));
  }
  function flash(el, list, ms, render, next) {
    const box = h('div', { class: 'card tight', style: { textAlign: 'center', minHeight: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' } });
    const prog = h('div', { class: 'small muted' });
    el.append(prog, box);
    let i = 0; const t0 = performance.now();
    const tick = () => {
      if (i >= list.length) { box.innerHTML = ''; return next(performance.now() - t0); }
      box.innerHTML = ''; box.append(render(list[i], i)); prog.textContent = (i + 1) + ' / ' + list.length; i++;
      setTimeout(tick, ms);
    };
    tick();
  }
  M.study = {
    objects(el, it, mode, next) { M.study.images(el, it, mode, next); },
    images(el, it, mode, next) {
      if (mode.flash) return flash(el, it.data, mode.perItem * 1000, x => h('div', null, h('div', { style: { fontSize: '4rem' } }, x.e), h('div', null, x.es)), next);
      timed(el, it, mode, h('div', { class: 'tiles' }, it.data.map(tileOf)), next);
    },
    words(el, it, mode, next) {
      const big = it.count > 30;
      if (mode.flash && !big) return flash(el, it.data, mode.perItem * 1000, x => h('div', { style: { fontSize: '1.8rem' } }, x.es), next);
      const pages = []; for (let i = 0; i < it.data.length; i += 25) pages.push(it.data.slice(i, i + 25));
      const content = h('div', null, pages.map((pg, k) => h('div', { class: 'card tight' }, h('div', { class: 'small muted' }, 'Bloque ' + (k + 1) + ' (' + (k * 25 + 1) + '-' + (k * 25 + pg.length) + ')'), h('ol', { start: k * 25 + 1, style: { columns: big ? 3 : 2 } }, pg.map(x => h('li', null, x.es))))));
      timed(el, it, mode, content, next, big ? Math.round(it.count * Math.max(mode.perItem, 4)) : null);
    },
    groups(el, it, mode, next) {
      const by = {}; it.data.forEach(x => (by[x.cat] = by[x.cat] || []).push(x));
      timed(el, it, mode, h('div', null, Object.keys(by).map(c => h('div', { class: 'card tight' }, h('b', null, c.toUpperCase()), h('div', { class: 'tiles', style: { marginTop: '6px' } }, by[c].map(tileOf))))), next, it.seconds);
    },
    digits(el, it, mode, next) {
      const chunk = it.technique.includes('major') ? 2 : 3;
      const chunks = it.data.match(new RegExp('.{1,' + chunk + '}', 'g'));
      if (mode.flash) return flash(el, chunks, mode.perItem * 1000 * chunk, c => h('div', { class: 'digits', style: { fontSize: '3rem' } }, c), next);
      const content = h('div', null, h('div', { class: 'digits' }, chunks.map(c => h('span', { class: 'chunk' }, c))));
      if (it.technique.includes('major')) content.append(h('div', { class: 'small muted', style: { marginTop: '8px' } }, 'Tus imágenes Major: ', chunks.filter(c => c.length === 2).slice(0, 30).map(c => h('span', { class: 'tag' }, c + ' = ' + (Athlete.majorWord(c) || '?')))));
      timed(el, it, mode, content, next, it.seconds);
    },
    letters(el, it, mode, next) { M.study.digits(el, Object.assign({}, it, { technique: 'chunking' }), mode, next); },
    span(el, it, mode, next) { flash(el, it.data.split(''), 1000, d => h('div', { class: 'digits', style: { fontSize: '3.5rem' } }, d), next); },
    colors(el, it, mode, next) {
      timed(el, it, mode, h('div', { class: 'tiles' }, it.data.map(x => h('div', { class: 'tile', style: { borderColor: x.color.hex, boxShadow: 'inset 0 0 0 3px ' + x.color.hex } }, h('div', { class: 'em' }, x.e), h('div', { class: 'lbl' }, x.es + ' ' + x.color.id)))), next);
    },
    scene(el, it, mode, next) {
      const grid = h('div', { class: 'gridboard', style: { gridTemplateColumns: 'repeat(3,1fr)', maxWidth: '360px' } }, Array.from({ length: 9 }, (_, i) => { const x = it.data.find(d => d.pos === i); return h('button', { type: 'button', style: x ? { borderColor: x.color.hex, boxShadow: 'inset 0 0 0 3px ' + x.color.hex, fontSize: '1.8rem' } : {} }, x ? x.e : ''); }));
      timed(el, it, mode, h('div', null, grid, h('div', { class: 'small muted' }, it.data.map(x => x.es + ' (' + x.color.id + ')').join(' · '))), next);
    },
    spatial(el, it, mode, next) {
      const g = it.grid;
      const board = h('div', { class: 'gridboard', style: { gridTemplateColumns: 'repeat(' + g + ',1fr)' } }, Array.from({ length: g * g }, (_, i) => h('button', { type: 'button', class: it.data.includes(i) ? 'on' : '', tabindex: '-1' })));
      timed(el, it, mode, board, next, Math.max(3, Math.round(it.count * mode.perItem * 0.7)));
    },
    faces(el, it, mode, next) {
      timed(el, it, mode, h('div', { class: 'tiles', style: { gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))' } }, it.data.map(p => h('div', { class: 'tile face' }, h('div', { html: M.face(p.seed) }), h('b', null, p.name + ' ' + p.sur), h('span', { class: 'small muted' }, p.job)))), next, Math.round(it.count * Math.max(mode.perItem, 5)));
    },
    auditory(el, it, mode, next) {
      const list = Array.isArray(it.data) ? it.data : it.data.split('');
      el.append(h('div', { class: 'prompt' }, '👂 Escucha con atención. No se muestra nada en pantalla.'));
      if (!Voice.canSpeak) { el.append(h('div', { class: 'notice bad' }, 'Tu navegador no tiene síntesis de voz.')); return next(0); }
      const t0 = performance.now();
      (async () => { for (const w of list) { await Voice.speak(String(w), 'es-ES', 0.9); await new Promise(r => setTimeout(r, Math.max(150, mode.perItem * 300))); } next(performance.now() - t0); })();
    },
    concept(el, it, mode, next) {
      timed(el, it, mode, h('div', { class: 'card tight' }, h('h3', null, it.data.t), h('p', null, it.data.text), h('p', { class: 'small muted' }, 'Elabora: ¿por qué es cierto? ¿a qué se parece? ¿dónde lo has vivido?')), next, 60);
    },
    sequence(el, it, mode, next) { flash(el, it.data, Math.max(500, mode.perItem * 700), x => h('div', { style: { fontSize: '4rem' } }, x), next); },
    pairs(el, it, mode, next) {
      timed(el, it, mode, h('ul', { class: 'list' }, it.data.map(p => h('li', null, h('span', { style: { fontSize: '1.6rem' } }, p.e), ' ', h('b', null, p.es), ' → ', h('span', { style: { color: 'var(--accent)', fontWeight: 700 } }, p.en), Ex.speakBtn(p.en)))), next, Math.round(it.count * Math.max(mode.perItem, 5)));
    },
    cards(el, it, mode, next) {
      if (mode.flash) return flash(el, it.data, mode.perItem * 1000, M.cardEl, next);
      timed(el, it, mode, h('div', null, it.data.map(M.cardEl)), next, Math.round(it.count * Math.max(mode.perItem, 3)));
    },
    dates(el, it, mode, next) {
      timed(el, it, mode, h('ul', { class: 'list' }, it.data.map(d => h('li', null, d.e + ' ' + d.es + ' → ', h('b', { class: 'mono' }, d.year)))), next, Math.round(it.count * Math.max(mode.perItem, 6)));
    },
    multimodal(el, it, mode, next) {
      const p = SEM.byId[it.data.pattern];
      timed(el, it, mode, h('div', null,
        h('div', { class: 'tiles' }, it.data.objs.map(x => h('div', { class: 'tile', style: { boxShadow: 'inset 0 0 0 3px ' + x.color.hex } }, h('div', { class: 'em' }, x.e), h('div', { class: 'lbl' }, x.es + ' · ' + x.color.id), x.num != null ? h('b', { class: 'mono' }, '#' + x.num) : null, h('span', { class: 'small', style: { color: 'var(--accent)' } }, x.en)))),
        h('div', { class: 'card tight', style: { marginTop: '10px' } }, h('span', { class: 'muted small' }, 'Estructura: '), Ex.blocks(p.f, 'full', { speak: false }))), next, Math.max(20, it.count * 6));
    },
    palace(el, it, mode, next) { Athlete.studyPalace(el, it, mode, next, timed); },
    peg(el, it, mode, next) {
      timed(el, it, mode, h('ol', { class: 'list' }, it.data.map((x, i) => h('li', null, h('span', { class: 'tag acc' }, (i + 1) + ' = ' + Athlete.pegWord(i)), ' ← ', x.e + ' ' + x.es))), next, Math.round(it.count * Math.max(mode.perItem, 6)));
    },
    story(el, it, mode, next) {
      const ta = h('textarea', { placeholder: 'Escribe (o imagina) una historia que conecte las palabras en orden…' });
      timed(el, it, mode, h('div', null, h('ol', null, it.data.map(x => h('li', null, x.e + ' ' + x.es))), ta), ms => { if (ta.value.trim()) Store.put('assoc', 'story-' + Date.now().toString(36), { kind: 'story', items: it.data.map(x => x.es), text: ta.value.trim(), t: Date.now() }); next(ms); }, Math.max(it.seconds || 0, it.count * 8));
    }
  };

  /* ---------- fase de recuperación ---------- */
  const normW = s => SEM.norm(s).replace(/^(el|la|los|las|un|una|the|a|an) /, '');
  function freeList(el, prompt, targets, ordered, cb, extra) {
    const ta = h('textarea', { placeholder: 'Escribe lo que recuerdes, uno por línea o separados por comas…', 'aria-label': 'Respuesta' });
    el.append(h('div', { class: 'prompt' }, prompt), extra || null, ta, h('button', { class: 'btn primary', type: 'button', style: { marginTop: '8px' }, onclick: e => { if (e.currentTarget.disabled) return; e.currentTarget.disabled = true;
      const given = ta.value.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
      const T = targets.map(normW);
      const G = given.map(normW);
      const used = new Set(); let hits = 0, intr = 0;
      const matched = [];
      G.forEach(g => { const k = T.findIndex((t, i) => !used.has(i) && (t === g || (t.length > 4 && SEM.lev(t, g) <= 1))); if (k >= 0) { used.add(k); hits++; matched.push(k); } else intr++; });
      // orden: subsecuencia creciente más larga de índices recordados
      let orderOk = null;
      if (ordered && matched.length) { const lis = []; matched.forEach(v => { let i = lis.findIndex(x => x >= v); if (i < 0) lis.push(v); else lis[i] = v; }); orderOk = lis.length / targets.length; }
      const itemsOk = hits / targets.length;
      const score = ordered ? (itemsOk + orderOk) / 2 : itemsOk;
      const review = h('div', { class: 'small' }, 'Lista original: ', targets.map((t, i) => h('span', { class: 'tag ' + (used.has(i) ? 'good' : 'bad') }, (ordered ? (i + 1) + '. ' : '') + t)));
      cb({ total: targets.length, correct: hits, score, itemsOk, orderOk, intrusions: intr, detail: (ordered ? 'Elementos: ' + pct(itemsOk) + ' · Orden: ' + pct(orderOk) : '') + (intr ? ' · ' + intr + ' respuestas que no estaban' : ''), review });
    } }, 'Comprobar'));
    setTimeout(() => ta.focus(), 30);
  }
  function seqInput(el, prompt, target, cb, opts) {
    opts = opts || {};
    const inp = h('input', { type: 'text', class: 'mono', inputmode: opts.numeric ? 'numeric' : 'text', autocomplete: 'off', 'aria-label': 'Secuencia' });
    let used = false;
    const go = () => {
      if (used) return; used = true;
      const g = inp.value.replace(/\s+/g, '').toUpperCase(), t = target.toUpperCase();
      let ok = 0; for (let i = 0; i < t.length; i++) if (g[i] === t[i]) ok++;
      let firstErr = [...t].findIndex((c, i) => g[i] !== c); if (firstErr < 0) firstErr = t.length;
      cb({ total: t.length, correct: ok, score: ok / t.length, detail: 'Primer error en la posición ' + (firstErr < t.length ? firstErr + 1 : '—') + '. Correcto: ' + t.match(/.{1,5}/g).join(' '), meta: { prefix: firstErr } });
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    el.append(h('div', { class: 'prompt' }, prompt), inp, h('button', { class: 'btn primary', type: 'button', style: { marginTop: '8px' }, onclick: go }, 'Comprobar'));
    setTimeout(() => inp.focus(), 30);
  }
  M.recall = {
    digits(el, it, cb) { seqInput(el, 'Escribe los dígitos en orden:', it.data, cb, { numeric: true }); },
    letters(el, it, cb) { seqInput(el, 'Escribe las letras en orden:', it.data, cb); },
    span(el, it, cb) { seqInput(el, 'Escribe los dígitos AL REVÉS (del último al primero):', it.data.split('').reverse().join(''), cb, { numeric: true }); },
    objects(el, it, cb) { freeList(el, 'Escribe los nombres de los objetos que viste:', it.data.map(x => x.es), it.ordered, cb); },
    words(el, it, cb) { freeList(el, 'Recuperación libre: escribe todas las palabras que recuerdes' + (it.ordered ? ', en orden.' : ' (cualquier orden).'), it.data.map(x => x.es), it.ordered, cb); },
    groups(el, it, cb) { freeList(el, 'Escribe todos los objetos. Usa las categorías como pistas.', it.data.map(x => x.es), false, cb, h('div', { class: 'small muted' }, 'Categorías: ' + [...new Set(it.data.map(x => x.cat))].join(', '))); },
    story(el, it, cb) { freeList(el, 'Recorre tu historia y escribe las palabras EN ORDEN:', it.data.map(x => x.es), true, cb); },
    peg(el, it, cb) {
      const qs = SEM.shuffle(it.data.map((x, i) => i)).slice(0, Math.min(it.data.length, 6));
      let ok = 0, k = 0; const area = h('div'); el.append(area);
      const ask = () => {
        if (k >= qs.length) {
          area.innerHTML = '';
          return freeList(area, 'Ahora escribe toda la lista en orden (1, 2, 3…):', it.data.map(x => x.es), true, r => cb(Object.assign(r, { score: (r.score + ok / qs.length) / 2, detail: 'Acceso directo: ' + ok + '/' + qs.length + ' · ' + r.detail })));
        }
        area.innerHTML = '';
        const i = qs[k];
        area.append(Ex.answerBox({ answers: [it.data[i].es], voice: false, autoplay: false, hint: 'Acceso directo con anclajes', placeholder: '¿Qué había en la posición ' + (i + 1) + ' (' + Athlete.pegWord(i) + ')?', onResult: r => { if (r.score >= 0.7) ok++; k++; ask(); } }));
      };
      ask();
    },
    images(el, it, cb) {
      // Reconocimiento entre distractores (imagen → palabra lo prueban otros modos).
      const distract = M.items(it.data.length * 2).filter(x => !it.data.some(d => d.es === x.es)).slice(0, Math.max(4, it.data.length));
      const opts = SEM.shuffle(it.data.map(x => Object.assign({ t: true }, x)).concat(distract.map(x => Object.assign({ t: false }, x))));
      const sel = new Set();
      const grid = h('div', { class: 'tiles' }, opts.map((o, i) => h('button', { class: 'tile', type: 'button', onclick: e => { sel.has(i) ? sel.delete(i) : sel.add(i); e.currentTarget.classList.toggle('sel'); } }, h('div', { class: 'em' }, o.e))));
      el.append(h('div', { class: 'prompt' }, 'Selecciona SOLO las imágenes que aparecieron.'), grid, h('button', { class: 'btn primary', type: 'button', style: { marginTop: '10px' }, onclick: e => { if (e.currentTarget.disabled) return; e.currentTarget.disabled = true;
        let hits = 0, fa = 0; opts.forEach((o, i) => { if (sel.has(i)) o.t ? hits++ : fa++; });
        [...grid.children].forEach((b, i) => { b.disabled = true; if (opts[i].t) b.classList.add(sel.has(i) ? 'right' : 'wrong'); else if (sel.has(i)) b.classList.add('wrong'); });
        const score = Math.max(0, (hits - fa) / it.data.length);
        // segunda fase: imagen → palabra en inglés (bidireccional)
        const sample = SEM.shuffle(it.data).slice(0, Math.min(3, it.data.length));
        const area = h('div'); el.append(area);
        let k = 0, en = 0;
        const ask = () => {
          if (k >= sample.length) return cb({ total: it.data.length, correct: hits, score: score * 0.75 + (en / sample.length) * 0.25, intrusions: fa, detail: 'Aciertos ' + hits + ' · Falsas alarmas ' + fa + ' · Imagen→inglés ' + en + '/' + sample.length, meta: { recognition: hits / it.data.length } });
          area.innerHTML = '';
          area.append(h('div', { style: { fontSize: '3rem' } }, sample[k].e), Ex.answerBox({ answers: [sample[k].en], voice: true, placeholder: '¿Cómo se dice en inglés?', hint: 'Imagen → palabra', onResult: r => { if (r.score >= 0.7) en++; k++; ask(); } }));
        };
        setTimeout(ask, 400);
      } }, 'Comprobar'));
    },
    colors(el, it, cb) {
      const qs = SEM.shuffle(it.data); let ok = 0, k = 0;
      const area = h('div'); el.append(area);
      const ask = () => {
        if (k >= qs.length) {
          // pregunta inversa: ¿qué objeto era de este color?
          const x = SEM.pick(it.data);
          area.innerHTML = '';
          area.append(h('div', { class: 'prompt' }, '¿Qué objeto era ', h('span', { style: { color: x.color.hex } }, '■ ' + x.color.id), '?'), h('div', { class: 'tiles' }, SEM.shuffle(it.data).map(o => h('button', { class: 'tile', type: 'button', onclick: () => { const inv = o.es === x.es ? 1 : 0; cb({ total: qs.length + 1, correct: ok + inv, detail: 'Colores ' + ok + '/' + qs.length + ' · inverso ' + (inv ? '✓' : '✗ era ' + x.es) }); } }, h('div', { class: 'em' }, o.e)))));
          return;
        }
        const x = qs[k]; area.innerHTML = '';
        area.append(h('div', { class: 'prompt' }, '¿De qué color era: ' + x.e + ' ' + x.es + '?'), h('div', { class: 'row' }, SEM.COLORS.map(c => h('button', { class: 'btn small', type: 'button', style: { borderColor: c.hex, boxShadow: 'inset 4px 0 0 ' + c.hex }, onclick: () => { if (c.id === x.color.id) ok++; k++; ask(); } }, c.id))));
      };
      ask();
    },
    scene(el, it, cb) {
      // Reconstrucción: coloca cada objeto en su casilla.
      let ok = 0, k = 0; const qs = SEM.shuffle(it.data);
      const area = h('div'); el.append(area);
      const ask = () => {
        if (k >= qs.length) return cb({ total: qs.length, correct: ok, detail: 'Posiciones correctas: ' + ok + '/' + qs.length });
        const x = qs[k]; area.innerHTML = '';
        area.append(h('div', { class: 'prompt' }, '¿Dónde estaba ' + x.e + ' ' + x.es + '?'), h('div', { class: 'gridboard', style: { gridTemplateColumns: 'repeat(3,1fr)', maxWidth: '300px' } }, Array.from({ length: 9 }, (_, i) => h('button', { type: 'button', onclick: () => { if (i === x.pos) ok++; k++; ask(); } }))));
      };
      ask();
    },
    spatial(el, it, cb) {
      const g = it.grid, sel = new Set();
      const board = h('div', { class: 'gridboard', style: { gridTemplateColumns: 'repeat(' + g + ',1fr)' } }, Array.from({ length: g * g }, (_, i) => h('button', { type: 'button', 'aria-label': 'casilla ' + (i + 1), onclick: e => { sel.has(i) ? sel.delete(i) : sel.add(i); e.currentTarget.classList.toggle('on'); } })));
      el.append(h('div', { class: 'prompt' }, 'Marca las ' + it.count + ' casillas que estaban iluminadas.'), board, h('button', { class: 'btn primary', type: 'button', style: { marginTop: '10px' }, onclick: e => { if (e.currentTarget.disabled) return; e.currentTarget.disabled = true;
        let hits = 0, fa = 0; sel.forEach(i => it.data.includes(i) ? hits++ : fa++);
        [...board.children].forEach((b, i) => { b.disabled = true; b.classList.remove('on'); if (it.data.includes(i)) b.classList.add(sel.has(i) ? 'right' : 'wrong'); else if (sel.has(i)) b.classList.add('wrong'); });
        setTimeout(() => cb({ total: it.count, correct: hits, score: Math.max(0, (hits - fa) / it.count), intrusions: fa, detail: 'Aciertos ' + hits + ' · errores ' + fa }), 900);
      } }, 'Comprobar'));
    },
    faces(el, it, cb) {
      const qs = SEM.shuffle(it.data); let ok = 0, k = 0; const area = h('div'); el.append(area);
      const ask = () => {
        if (k >= qs.length) return cb({ total: qs.length, correct: ok, detail: 'Nombres recordados: ' + ok + '/' + qs.length });
        const p = qs[k]; area.innerHTML = '';
        area.append(h('div', { class: 'face', html: M.face(p.seed) }), Ex.answerBox({ answers: [p.name, p.name + ' ' + p.sur], voice: false, autoplay: false, placeholder: '¿Cómo se llama?', modelEl: () => h('b', null, p.name + ' ' + p.sur + ' (' + p.job + ')'), onResult: r => { if (r.score >= 0.7) ok++; k++; ask(); } }));
      };
      ask();
    },
    auditory(el, it, cb) {
      if (Array.isArray(it.data)) return freeList(el, 'Escribe las palabras que escuchaste:', it.data, true, cb);
      seqInput(el, 'Escribe los dígitos que escuchaste, en orden:', it.data, cb, { numeric: true });
    },
    concept(el, it, cb) {
      const ta = h('textarea', { placeholder: 'Explícalo con tus palabras, como si se lo contaras a un niño de 12 años (método Feynman)…' });
      el.append(h('div', { class: 'prompt' }, 'Explica: ' + it.data.t), ta, h('button', { class: 'btn primary', type: 'button', style: { marginTop: '8px' }, onclick: e => { if (e.currentTarget.disabled) return; e.currentTarget.disabled = true;
        const t = ' ' + SEM.norm(ta.value) + ' ';
        const got = it.data.keys.map(group => group.some(k => t.includes(' ' + SEM.norm(k)) || t.includes(SEM.norm(k))));
        const ok = got.filter(Boolean).length;
        cb({ total: got.length, correct: ok, detail: 'Ideas clave cubiertas: ' + ok + '/' + got.length + '. Texto original: «' + it.data.text + '»', meta: { concept: true } });
      } }, 'Comprobar'));
    },
    sequence(el, it, cb) {
      const opts = ['⬆️', '➡️', '⬇️', '⬅️', '🔴', '🟢', '🔵', '🟡'];
      const given = []; const line = h('div', { class: 'digits' });
      el.append(h('div', { class: 'prompt' }, 'Reproduce la secuencia en orden:'), line, h('div', { class: 'row' }, opts.map(o => h('button', { class: 'btn', type: 'button', style: { fontSize: '1.5rem' }, onclick: () => { given.push(o); line.textContent = given.join(' '); if (given.length === it.data.length) check(); } }, o))),
        h('button', { class: 'btn ghost small', type: 'button', onclick: () => { given.pop(); line.textContent = given.join(' '); } }, '⌫ Borrar'));
      let checked = false; const check = () => { if (checked) return; checked = true; let ok = 0; it.data.forEach((x, i) => { if (given[i] === x) ok++; }); cb({ total: it.data.length, correct: ok, detail: 'Correcta: ' + it.data.join(' '), meta: { orderOk: ok / it.data.length } }); };
    },
    pairs(el, it, cb) {
      const qs = SEM.shuffle(it.data); let ok = 0, k = 0; const area = h('div'); el.append(area);
      const ask = () => {
        if (k >= qs.length) return cb({ total: qs.length, correct: ok, detail: 'Pares recordados: ' + ok + '/' + qs.length });
        const p = qs[k]; area.innerHTML = '';
        area.append(h('div', { class: 'prompt' }, p.e + ' ' + p.es + ' → ?'), Ex.answerBox({ answers: [p.en], placeholder: 'en inglés', onResult: r => { if (r.score >= 0.7) ok++; k++; ask(); } }));
      };
      ask();
    },
    cards(el, it, cb) {
      const given = []; const line = h('div');
      const deck = M.deck();
      el.append(h('div', { class: 'prompt' }, 'Toca las cartas en el orden en que aparecieron (' + it.data.length + ').'), line,
        h('div', null, deck.map(c => h('button', { type: 'button', class: 'cardface' + (c.red ? ' red' : ''), style: { cursor: 'pointer', width: '44px', height: '62px', fontSize: '1rem' }, onclick: () => { given.push(c.id); line.innerHTML = ''; given.forEach(id => line.append(M.cardEl(deck.find(d => d.id === id)))); if (given.length === it.data.length) check(); } }, c.r + c.s))),
        h('button', { class: 'btn ghost small', type: 'button', onclick: () => { given.pop(); line.innerHTML = ''; given.forEach(id => line.append(M.cardEl(deck.find(d => d.id === id)))); } }, '⌫ Borrar'));
      let checked = false; const check = () => { if (checked) return; checked = true; let ok = 0; it.data.forEach((c, i) => { if (given[i] === c.id) ok++; }); cb({ total: it.data.length, correct: ok, detail: 'Orden correcto: ' + it.data.map(c => c.r + c.s).join(' ') }); };
    },
    dates(el, it, cb) {
      const qs = SEM.shuffle(it.data); let ok = 0, k = 0; const area = h('div'); el.append(area);
      const ask = () => {
        if (k >= qs.length) return cb({ total: qs.length, correct: ok });
        const d = qs[k]; area.innerHTML = '';
        area.append(h('div', { class: 'prompt' }, d.e + ' ' + d.es + ' → ¿año?'), Ex.answerBox({ answers: [String(d.year)], voice: false, autoplay: false, onResult: r => { if (r.score === 1) ok++; k++; ask(); } }));
      };
      ask();
    },
    palace(el, it, cb) { Athlete.recallPalace(el, it, cb, freeList); },
    multimodal(el, it, cb) {
      const objs = it.data.objs; const p = SEM.byId[it.data.pattern];
      const parts = {}; const area = h('div'); el.append(area);
      const steps = [
        next => freeList(area, '1/6 · Objetos: escribe los que recuerdes.', objs.map(o => o.es), false, r => { parts.objetos = r.itemsOk; next(); }),
        next => { const x = SEM.pick(objs); area.append(h('div', { class: 'prompt' }, '2/6 · ¿De qué color era ' + x.e + '?'), h('div', { class: 'row' }, SEM.COLORS.map(c => h('button', { class: 'btn small', type: 'button', style: { boxShadow: 'inset 4px 0 0 ' + c.hex }, onclick: () => { parts.colores = c.id === x.color.id ? 1 : 0; next(); } }, c.id)))); },
        next => { const nums = objs.filter(o => o.num != null); const x = SEM.pick(nums); area.append(h('div', { class: 'prompt' }, '3/6 · ¿Qué número tenía ' + x.e + ' ' + x.es + '?'), Ex.answerBox({ answers: [String(x.num)], voice: false, autoplay: false, onResult: r => { parts.numeros = r.score === 1 ? 1 : 0; next(); } })); },
        next => { const x = SEM.pick(objs); area.append(h('div', { class: 'prompt' }, '4/6 · Palabra en inglés para ' + x.e + ':'), Ex.answerBox({ answers: [x.en], voice: false, onResult: r => { parts.palabras = r.score; next(); } })); },
        next => { const target = SEM.frameKeys(p.f).join(' ... '); area.append(h('div', { class: 'prompt' }, '5/6 · Reconstruye la estructura (la parte fija):'), Ex.answerBox({ answers: [SEM.plain(p.f).replace('___', '').trim(), SEM.frameKeys(p.f)[0]], voice: false, modelEl: () => Ex.blocks(p.f, 'full', { speak: false }), placeholder: 'p. ej. ' + target.replace(/[a-z]/g, '·'), onResult: r => { parts.estructura = r.score; next(); } })); },
        next => { const ta = h('textarea', { placeholder: 'Crea una oración con la estructura y uno de los objetos. Después dila en voz alta.' }); area.append(h('div', { class: 'prompt' }, '6/6 · Crea una oración y dila en voz alta'), ta, h('button', { class: 'btn primary', type: 'button', onclick: async () => {
          const ok = SEM.usesPattern(ta.value, p) && objs.some(o => SEM.norm(ta.value).includes(SEM.norm(o.en)));
          parts.oracion = ok ? 1 : 0.3;
          if (Voice.canListen) { try { toast('Di la oración…'); const r = await Voice.listen('en-US'); parts.voz = SEM.check(r.text, [ta.value]).score; toast('Transcripción: ' + r.text); } catch (e) { parts.voz = null; toast(e.message, 'bad'); } }
          next();
        } }, Voice.canListen ? 'Comprobar y decirla 🎙️' : 'Comprobar')); }
      ];
      let k = 0;
      const run = () => { area.innerHTML = ''; if (k >= steps.length) { const vals = Object.values(parts).filter(v => v != null); const score = vals.reduce((a, b) => a + b, 0) / vals.length; return cb({ total: vals.length, correct: Math.round(score * vals.length), score, detail: Object.entries(parts).map(([k2, v]) => k2 + ': ' + (v == null ? '—' : pct(v))).join(' · '), meta: { parts } }); } steps[k++](run); };
      run();
    }
  };

  /* ---------- vistas ---------- */
  M.viewModules = function (root) {
    root.append(h('h1', null, 'Módulos de memoria'), h('p', { class: 'muted' }, 'Cada módulo tiene su nivel, que solo sube con un 85 % en dos días distintos. Las estadísticas salen de tus intentos reales.'));
    const att = Store.attempts();
    root.append(h('div', { class: 'grid g2' }, M.MODULES.map(m => {
      const lv = M.modLevel(m.id).level;
      const st = Stats.summary(att.filter(a => a.module === m.id));
      return h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h3', { style: { margin: 0 } }, m.icon + ' ' + m.n), h('span', { class: 'tag acc' }, 'Nivel ' + lv)),
        h('p', { class: 'muted small' }, m.desc + ' Técnicas: ' + m.techs.map(t => SEM.techById[t].n).join(', ') + '.'),
        h('div', { class: 'small muted' }, st.exercises + ' ejercicios · precisión ' + pct(st.exercises ? st.accuracy : null)),
        h('div', { class: 'row', style: { marginTop: '8px' } }, ['slow', 'normal', 'fast'].map(mode => h('button', { class: 'btn small' + (mode === 'normal' ? ' primary' : ''), type: 'button', onclick: () => App.start({ title: m.n, module: m.id, items: [M.make(m.id, { mode }), M.make(m.id, { mode })], back: '#/modules' }) }, M.MODES[mode].n))));
    })));
  };

  M.viewQuick = function (root) {
    root.append(h('h1', null, 'Quick Memory'), h('p', { class: 'muted' }, 'Los elementos aparecen durante un tiempo limitado y desaparecen. Progresión: 2 → 4 → 6 → 10 → 15 → 20 → 30 elementos.'));
    const counts = [2, 4, 6, 10, 15, 20, 30];
    const best = {}; Store.attempts(a => a.module === 'quick' && a.correct === a.total).forEach(a => { best[a.total] = Math.max(best[a.total] || 0, a.score); });
    const kind = h('select', null, [['images', 'Imágenes'], ['words', 'Palabras'], ['digits', 'Números'], ['colors', 'Objetos y colores']].map(([v, n]) => h('option', { value: v }, n)));
    const dist = h('select', null, [[0, 'Sin actividad intermedia'], [15, 'Hidden Memory: 15 s de distracción'], [30, 'Hidden Memory: 30 s de distracción']].map(([v, n]) => h('option', { value: v }, n)));
    root.append(h('div', { class: 'card' }, h('div', { class: 'grid g3' }, kind, dist), h('div', { class: 'small muted', style: { marginTop: '8px' } }, Object.entries(M.MODES).map(([k, m]) => m.n + ': ' + m.desc).join(' · '))));
    root.append(h('div', { class: 'grid g3' }, counts.map(n => h('div', { class: 'card tight' }, h('b', null, n + ' elementos'), best[n] ? h('span', { class: 'tag good' }, '✓ perfecto') : null,
      h('div', { class: 'row', style: { marginTop: '6px' } }, Object.keys(M.MODES).map(mode => h('button', { class: 'btn small', type: 'button', onclick: () => {
        const it = M.fill({ type: 'mem', module: 'quick', kind: kind.value, count: n, mode, technique: n > 6 ? 'chunking+visual-assoc' : 'visual-assoc', distractor: Number(dist.value), fixed: true });
        App.start({ title: 'Quick Memory · ' + n, module: 'quick', items: [it], back: '#/quick' });
      } }, M.MODES[mode].n)))))));
  };

  M.viewDelayed = function (root) {
    const due = Store.list('delayed').filter(d => !d.done && d.due <= Date.now());
    if (!due.length) return null;
    return h('div', { class: 'card' }, h('h3', null, '⏳ Evaluaciones diferidas pendientes (' + due.length + ')'), h('p', { class: 'muted small' }, 'Comprobamos si lo que memorizaste ayer sigue ahí: así se distingue memorizar un momento de conservarlo.'),
      h('button', { class: 'btn primary', type: 'button', onclick: () => App.start({ title: 'Recuperación diferida', module: 'delayed', items: due.slice(0, 5).map(d => Object.assign({}, d.item, { label: 'Recuperación diferida · ' + (KIND_LABEL[d.item.kind] || d.item.kind), skipStudy: true })), back: '#/' }) }, 'Hacer ahora'));
  };
  /* En la recuperación diferida no se vuelve a estudiar: se pasa directo a recordar. */
  const origRender = Ex.types.mem.render;
  Ex.types.mem.render = function (el, it, done, s) {
    if (!it.skipStudy) return origRender.call(this, el, it, done, s);
    const saved = M.study[it.kind];
    M.study[it.kind] = (e, i, m, next) => { e.append(h('div', { class: 'notice' }, 'Sin volver a estudiar: recuerda lo que memorizaste el ' + UI.dateStr((Store.get('delayed', it.delayedOf) || {}).created || Date.now()) + '.')); next(0); };
    try { origRender.call(this, el, it, done, s); } finally { M.study[it.kind] = saved; }
  };
})();
