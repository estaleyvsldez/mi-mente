/* MEMORY LAB — Biblioteca de técnicas · PROGRESSIVE MEMORY TRAINING · motor de estrategias y diagnóstico */
(function () {
  'use strict';
  const { h, toast, pct } = UI;
  const TR = window.Training = {};
  const HOUR = 3600000;

  /* ---------- lecciones progresivas ---------- */
  TR.lesson = id => Object.assign({ steps: {}, exams: [], mastered: false }, Store.get('lessons', id) || {});
  TR.unlockedIndex = function () {
    let i = 0;
    for (; i < SEM.LESSONS.length; i++) if (!TR.lesson(SEM.LESSONS[i].id).mastered) break;
    return i; // índice de la primera lección no dominada
  };
  /* Técnicas que el usuario domina: las de lecciones dominadas + las que superan el criterio de dominio con sus intentos. */
  TR.known = function () {
    const k = new Set();
    SEM.LESSONS.forEach(L => { if (TR.lesson(L.id).mastered) L.techs.forEach(t => k.add(t)); });
    const by = {};
    Store.attempts(a => a.technique).forEach(a => a.technique.split('+').forEach(t => (by[t] = by[t] || []).push(a)));
    Object.keys(by).forEach(t => { if (Stats.mastery(by[t]).mastered) k.add(t); });
    return k;
  };

  const cfgToItem = function (cfg, L, phase) {
    const base = { module: 'training', technique: L.techs.join('+'), mode: phase === 'guided' ? 'slow' : 'normal', guided: phase === 'guided', fixed: true, lesson: L.id, phase };
    const kinds = { 'visual-list': 'objects', groups: 'groups', pairs: 'pairs', story: 'story', peg: 'peg', multimodal: 'multimodal', digits: 'digits' };
    if (cfg.kind === 'major') return { type: 'major-drill', dir: 'n2w', count: cfg.count, lesson: L.id, phase };
    if (cfg.kind === 'palace') {
      const pal = Athlete.palaces()[0];
      if (!pal) return null;
      return Athlete.palaceItem(pal._id, cfg.count, 'words', Object.assign({}, base, { perLocus: cfg.perLocus || 1 }));
    }
    if (cfg.kind === 'delayed') return null;
    const it = MEM.fill(Object.assign({ type: 'mem', kind: kinds[cfg.kind] || cfg.kind, count: cfg.count, groups: cfg.groups, ordered: cfg.ordered }, base));
    if (cfg.seconds) it.seconds = cfg.seconds * (cfg.count || 1) / Math.max(1, cfg.count);
    return it;
  };

  /* Construye la sesión de una fase. Devuelve {session} o {error, wait}. */
  TR.buildPhase = function (L, phase) {
    const cfg = L[phase];
    const done = (s, acc) => TR.record(L, phase, acc, s);
    if (phase === 'exam' && cfg.kind === 'delayed') {
      const pend = Store.list('delayed').filter(d => d.item && d.item.lesson === 'L4' && !d.done);
      const ready = pend.filter(d => d.due <= Date.now());
      if (!ready.length) return { error: pend.length ? 'La evaluación diferida estará lista el ' + UI.timeStr(Math.min(...pend.map(d => d.due))) : 'Primero haz el ejercicio independiente: mañana te pediremos recordarlo.', wait: true };
      return { session: { title: L.n + ' · evaluación diferida', module: 'training', items: ready.slice(0, 2).map(d => Object.assign({}, d.item, { skipStudy: true, phase: 'exam', lesson: L.id })), back: '#/training/' + L.id, onDone: done } };
    }
    if (cfg.kind === 'palace' && !Athlete.palaces().length) {
      // palacio inicial automático (la casa) para no frenar la ruta; el usuario puede editarlo después
      Store.put('palaces', 'p-casa', { name: 'Mi casa', type: 'casa', loci: ['puerta de entrada', 'recibidor', 'sofá', 'televisor', 'mesa del comedor', 'cocina', 'nevera', 'baño', 'cama', 'ventana'], created: Date.now(), uses: [], perLocus: 1 });
    }
    const items = [];
    if (phase === 'guided') items.push({ type: 'info', title: 'Truco de memoria · ' + (SEM.techById[L.newTech] || {}).n, paras: [L.explain].concat(L.demo), button: 'Probar con guía →' });
    const it = cfgToItem(cfg, L, phase);
    if (!it) return { error: 'Esta fase no está disponible todavía.' };
    items.push(it);
    if (phase === 'practice') {
      const idx = SEM.LESSONS.indexOf(L);
      const prev = SEM.LESSONS.slice(0, idx).filter(P => P[phase] && P[phase].kind !== 'delayed' && P[phase].kind !== 'palace' && P[phase].kind !== 'major');
      if (prev.length) {
        const weakest = prev.map(P => ({ P, acc: Stats.summary(Store.attempts(a => a.meta && a.meta.lesson === P.id)).accuracy })).sort((a, b) => a.acc - b.acc)[0].P;
        const r = cfgToItem(weakest.practice, weakest, 'practice'); if (r) { r.label = 'Repaso acumulativo · ' + weakest.n; items.push(r); }
      }
    }
    return { session: { title: L.n + ' · ' + { guided: 'guiado', practice: 'independiente', exam: 'evaluación' }[phase], module: 'training', items, back: '#/training/' + L.id, onDone: done } };
  };
  TR.startPhase = function (L, phase) {
    const r = TR.buildPhase(L, phase);
    if (r.error) return toast(r.error, 'bad');
    App.start(r.session);
  };
  /* Próxima fase pendiente de una lección (o null si hoy no toca: evaluaciones separadas ≥20 h). */
  TR.nextPhase = function (L) {
    const st = TR.lesson(L.id);
    if (st.mastered) return null;
    if (!st.steps.guided) return 'guided';
    if (!st.steps.practice) return 'practice';
    const last = (st.exams || []).slice(-1)[0];
    const lastPass = (st.exams || []).filter(e => e.acc >= 0.85).slice(-1)[0];
    if (lastPass && Date.now() - lastPass.ts < 20 * HOUR) return null;
    if (last && last.acc < 0.85 && Date.now() - last.ts < 2 * HOUR) return 'practice';
    return 'exam';
  };
  TR.record = function (L, phase, acc, session) {
    const st = TR.lesson(L.id);
    st.steps[phase] = { best: Math.max((st.steps[phase] || {}).best || 0, acc), last: acc, ts: Date.now() };
    let msg;
    if (phase === 'exam') {
      st.exams = (st.exams || []).concat([{ ts: Date.now(), acc }]).slice(-20);
      const passes = st.exams.filter(e => e.acc >= 0.85);
      const spaced = passes.length >= 2 && passes[passes.length - 1].ts - passes[0].ts >= 20 * HOUR;
      if (L.exam.kind === 'delayed' ? passes.length >= 1 : spaced) { st.mastered = true; msg = '✓ Lección dominada. La siguiente técnica queda desbloqueada y esta seguirá apareciendo en los repasos.'; }
      else if (acc >= 0.85) msg = 'Bien (' + pct(acc) + '). Para dominarla, repite la evaluación otro día (≥20 h después) con ≥85 %: así comprobamos retención, no solo memoria inmediata.';
      else msg = 'Resultado ' + pct(acc) + '. Se necesita un 85 %. Revisa la demostración y vuelve a practicar.';
    }
    Store.put('lessons', L.id, st);
    return msg ? h('div', { class: 'notice ' + (st.mastered ? 'good' : 'warn') }, msg) : null;
  };

  TR.viewProgressive = function (root) {
    const unl = TR.unlockedIndex();
    root.append(h('h1', null, 'Progressive Memory Training'), h('p', { class: 'muted' }, 'Una técnica cada vez. Cada lección: explicación → demostración → ejercicio guiado → ejercicio independiente → evaluación → integración con lo anterior. Una lección se domina con ≥85 % en dos evaluaciones separadas por al menos 20 horas.'));
    SEM.LESSONS.forEach((L, i) => {
      const st = TR.lesson(L.id);
      const open = i <= unl;
      root.append(h('div', { class: 'card' + (open ? '' : ' muted') }, h('div', { class: 'row between' }, h('h3', { style: { margin: 0 } }, 'Lección ' + (i + 1) + ' · ' + L.n), st.mastered ? h('span', { class: 'tag good' }, 'dominada') : open ? h('span', { class: 'tag acc' }, 'disponible') : h('span', { class: 'tag' }, '🔒')),
        h('p', { class: 'small' }, L.goal), h('div', null, L.techs.map(t => h('span', { class: 'tag' + (t === L.newTech ? ' acc' : '') }, (SEM.techById[t] || { n: t }).n + (t === L.newTech ? ' (nueva)' : '')))),
        open ? h('a', { class: 'btn small primary', href: '#/training/' + L.id, style: { marginTop: '8px' } }, st.mastered ? 'Repasar' : 'Abrir') : h('p', { class: 'small muted' }, 'Se desbloquea al dominar la lección anterior.')));
    });
  };
  TR.viewLesson = function (root, id) {
    const L = SEM.LESSONS.find(x => x.id === id); if (!L) return;
    const st = TR.lesson(id);
    root.append(h('a', { href: '#/training', class: 'small' }, '← Entrenamiento progresivo'), h('h1', null, L.n),
      h('div', { class: 'card' }, h('h3', null, 'Objetivo'), h('p', null, L.goal), h('h3', null, 'Explicación'), h('p', null, L.explain), h('h3', null, 'Demostración'), h('ul', null, L.demo.map(d => h('li', null, d))),
        h('h3', null, 'Integración'), h('p', { class: 'muted' }, L.integrate)));
    const phases = [['guided', 'Ejercicio guiado', 'Con la técnica explicada paso a paso y más tiempo.'], ['practice', 'Ejercicio independiente', 'Sin guía. Incluye un repaso acumulativo de la técnica anterior más débil.'], ['exam', 'Evaluación', 'Sin ayudas. ≥85 % en dos días distintos.']];
    root.append(h('div', { class: 'grid g3' }, phases.map(([k, n, d]) => { const s = st.steps[k]; return h('div', { class: 'card' }, h('h3', null, n), h('p', { class: 'small muted' }, d), s ? h('p', { class: 'small' }, 'Mejor: ' + pct(s.best) + ' · último ' + UI.dateStr(s.ts)) : null, h('button', { class: 'btn' + (k === 'guided' && !s ? ' primary' : ''), type: 'button', onclick: () => TR.startPhase(L, k) }, 'Empezar')); })));
    if (st.exams && st.exams.length) root.append(h('div', { class: 'card' }, h('h3', null, 'Historial de evaluaciones'), h('ul', { class: 'list' }, st.exams.slice().reverse().map(e => h('li', null, UI.timeStr(e.ts) + ' · ' + pct(e.acc))))));
  };

  /* ---------- biblioteca de técnicas ---------- */
  TR.techStats = function (id) {
    const xs = Store.attempts(a => a.technique && a.technique.split('+').includes(id));
    const m = Stats.mastery(xs);
    const s = Stats.summary(xs);
    const combos = {}; xs.forEach(a => { if (a.technique.includes('+')) combos[a.technique] = (combos[a.technique] || 0) + 1; });
    return { n: xs.length, accuracy: s.accuracy, mastery: m, ret: Stats.retention(xs), combos, last: xs.length ? xs[xs.length - 1].ts : null, minutes: Math.round(s.totalMs / 60000) };
  };
  const DRILL = {
    'visual-list': () => MEM.fill({ type: 'mem', module: 'visual', kind: 'objects', count: 6, mode: 'slow', technique: 'visual-assoc', guided: true, fixed: true }),
    pairs: () => MEM.make('associative', { mode: 'slow', guided: true }),
    scene: () => MEM.fill({ type: 'mem', module: 'visual', kind: 'scene', count: 5, mode: 'normal', technique: 'scenes', guided: true, fixed: true }),
    chain: () => MEM.fill({ type: 'mem', module: 'words', kind: 'story', count: 8, mode: 'slow', technique: 'image-chain', guided: true, fixed: true }),
    story: () => MEM.fill({ type: 'mem', module: 'words', kind: 'story', count: 10, mode: 'slow', technique: 'story', guided: true, fixed: true }),
    palace: () => { const p = Athlete.palaces()[0]; return p ? Athlete.palaceItem(p._id, Math.min(10, p.loci.length)) : null; },
    peg: () => MEM.fill({ type: 'mem', module: 'words', kind: 'peg', count: 10, mode: 'slow', technique: 'peg', guided: true, fixed: true }),
    major: () => ({ type: 'major-drill', dir: 'n2w', count: 10 }),
    pao: () => ({ type: 'pao-drill', count: 5 }),
    'number-shape': () => MEM.fill({ type: 'mem', module: 'numbers', kind: 'digits', count: 6, mode: 'slow', technique: 'shapes', guided: true, fixed: true }),
    digits: () => MEM.make('numbers', { mode: 'normal', technique: 'chunking', guided: true }),
    acronym: () => MEM.fill({ type: 'mem', module: 'words', kind: 'words', count: 6, mode: 'slow', technique: 'acronym', ordered: true, guided: true, fixed: true }),
    'free-encode': () => MEM.fill({ type: 'mem', module: 'words', kind: 'words', count: 8, mode: 'slow', technique: 'prior', guided: true, fixed: true }),
    spelling: () => MEM.make('letters', { mode: 'slow', technique: 'word-frag' }),
    groups: () => MEM.fill({ type: 'mem', module: 'words', kind: 'groups', count: 9, groups: 3, mode: 'normal', technique: 'vocab-cat', guided: true, fixed: true }),
    concept: () => MEM.make('conceptual', { technique: 'elaboration', guided: true }),
    recall: () => MEM.make('words', { mode: 'normal', technique: 'active-recall' }),
    order: () => MEM.make('sequence', { technique: 'reconstruct' }),
    review: null, english: null
  };
  TR.practiceTechnique = function (t) {
    if (t.drill === 'english') { location.hash = '#/english'; return; }
    if (t.drill === 'review') { location.hash = '#/'; toast('Esta técnica está integrada en los repasos diarios.'); return; }
    if (t.drill === 'palace' && !Athlete.palaces().length) { toast('Crea primero un palacio.'); location.hash = '#/athlete/palaces'; return; }
    const make = DRILL[t.drill]; const it = make && make();
    if (!it) return toast('Sin ejercicio disponible', 'bad');
    it.technique = it.type === 'mem' ? t.id + (it.technique && it.technique !== t.id ? '' : '') : it.technique;
    if (it.type === 'mem') { it.technique = t.id; it.guided = true; }
    App.start({ title: t.n, module: it.module || 'techniques', items: [it, Object.assign({}, it.type === 'mem' ? MEM.fill(Object.assign({}, it, { guided: false })) : it)], back: '#/techniques/' + t.id });
  };
  TR.viewTechniques = function (root) {
    const known = TR.known();
    root.append(h('h1', null, 'Biblioteca de técnicas'), h('p', { class: 'muted' }, SEM.TECHNIQUES.length + ' técnicas. No todas son igual de eficaces para todo: cada una indica cuándo conviene, sus limitaciones y el respaldo de la evidencia. Empieza por el Entrenamiento progresivo; aquí puedes explorar y practicar libremente.'));
    Object.entries(SEM.TECH_GROUPS).forEach(([g, name]) => {
      root.append(h('h2', null, name), h('div', { class: 'grid g2' }, SEM.TECHNIQUES.filter(t => t.g === g).map(t => {
        const s = TR.techStats(t.id);
        return h('a', { class: 'card tight', href: '#/techniques/' + t.id, style: { textDecoration: 'none', color: 'inherit' } }, h('div', { class: 'row between' }, h('b', null, t.n), h('span', null, known.has(t.id) ? h('span', { class: 'tag good' }, 'dominada') : s.n ? h('span', { class: 'tag acc' }, s.n + ' usos') : null, h('span', { class: 'tag' }, 'dif. ' + t.lvl))),
          h('div', { class: 'muted small' }, t.what), h('div', { class: 'small' }, h('span', { class: 'tag' }, SEM.EVIDENCE[t.ev])));
      })));
    });
  };
  TR.viewTechnique = function (root, id) {
    const t = SEM.techById[id]; if (!t) return;
    const s = TR.techStats(id);
    root.append(h('a', { href: '#/techniques', class: 'small' }, '← Técnicas'), h('h1', null, t.n),
      h('div', null, h('span', { class: 'tag acc' }, SEM.TECH_GROUPS[t.g]), h('span', { class: 'tag' }, 'Dificultad ' + t.lvl + '/5'), h('span', { class: 'tag' }, SEM.EVIDENCE[t.ev]), t.info.map(i => h('span', { class: 'tag' }, i))),
      h('div', { class: 'card' }, h('h3', null, 'Qué es'), h('p', null, t.what), h('h3', null, 'Cómo se hace'), h('p', null, t.how), h('h3', null, 'Demostración'), h('div', { class: 'notice' }, t.demo),
        h('h3', null, 'Cuándo conviene'), h('p', null, t.when), h('h3', null, 'Limitaciones'), h('p', { class: 'muted' }, t.limits),
        h('button', { class: 'btn primary', type: 'button', onclick: () => TR.practiceTechnique(t) }, 'Practicar esta técnica')),
      h('div', { class: 'card' }, h('h3', null, 'Tu historial con esta técnica'),
        s.n ? h('div', { class: 'grid g4' },
          h('div', { class: 'stat' }, h('b', null, s.n), h('span', null, 'ejercicios')), h('div', { class: 'stat' }, h('b', null, pct(s.accuracy)), h('span', null, 'precisión')),
          h('div', { class: 'stat' }, h('b', null, s.ret.rate == null ? '—' : pct(s.ret.rate)), h('span', null, 'retención diferida (' + s.ret.n + ')')), h('div', { class: 'stat' }, h('b', null, s.minutes + ' min'), h('span', null, 'tiempo'))) : h('p', { class: 'muted' }, 'Todavía no la has usado.'),
        s.n ? h('p', { class: 'small muted' }, 'Dominio: ' + (s.mastery.mastered ? '✓ dominada' : 'precisión reciente ' + pct(s.mastery.accuracy) + ' en ' + s.mastery.days + ' días' + (s.mastery.delayed ? '' : ', falta evaluación diferida'))) : null,
        Object.keys(s.combos).length ? h('p', { class: 'small' }, 'Combinaciones usadas: ', Object.entries(s.combos).map(([c, n]) => h('span', { class: 'tag' }, c.split('+').map(x => (SEM.techById[x] || { n: x }).n).join(' + ') + ' ×' + n))) : null));
    if (App.ai().enabled) {
      const box = h('div', { class: 'card' }, h('h3', null, 'Explicación adaptada (IA)'));
      const info = h('input', { type: 'text', placeholder: '¿Qué quieres memorizar con ella? (opcional)' });
      const out = h('div');
      box.append(info, h('button', { class: 'btn', type: 'button', style: { marginTop: '8px' }, onclick: async e => {
        e.target.disabled = true; out.textContent = 'Pensando…';
        try { const r = await Store.api('/api/ai', { body: { task: 'explain-technique', input: { technique: t.n, info: info.value } } }); out.innerHTML = ''; out.append(h('p', null, r.data.explanation), h('div', { class: 'notice' }, r.data.example), h('ul', null, r.data.tips.map(x => h('li', null, x)))); }
        catch (err) { out.textContent = err.message; }
        e.target.disabled = false;
      } }, 'Explícamela para mi caso'), out);
      root.append(box);
    }
  };

  /* ---------- ADAPTIVE MEMORY STRATEGY ENGINE ---------- */
  const TYPE_OF_MODULE = { numbers: 'numbers', letters: 'sequence', words: 'words', visual: 'images', colors: 'images', spatial: 'images', faces: 'pairs', auditory: 'words', conceptual: 'concepts', sequence: 'sequence', working: 'numbers', associative: 'pairs', english: 'english', quick: 'images', cards: 'cards', multimodal: 'list' };
  TR.perfFor = function (type) {
    const perf = {};
    Store.attempts(a => a.technique && TYPE_OF_MODULE[a.module] === type).forEach(a => a.technique.split('+').forEach(t => { const p = perf[t] || (perf[t] = { n: 0, s: 0 }); p.n++; p.s += a.score; }));
    Object.values(perf).forEach(p => { p.accuracy = p.s / p.n; });
    return perf;
  };
  TR.viewStrategy = function (root) {
    root.append(h('h1', null, 'Motor de estrategias'), h('p', { class: 'muted' }, 'Describe qué quieres memorizar y el motor recomienda una combinación de técnicas, priorizando las que ya dominas y ajustándose a tu rendimiento real con cada tipo de información. Son puntos de partida, no reglas rígidas.'));
    const f = {
      type: h('select', null, Object.entries(Strategy.BASE).map(([k, v]) => h('option', { value: k }, v.label))),
      count: h('input', { type: 'number', value: 10, min: 1, max: 5000, 'aria-label': 'Cantidad' }),
      ordered: h('select', null, h('option', { value: '0' }, 'El orden no importa'), h('option', { value: '1' }, 'Debo recordar el orden')),
      abstract: h('select', null, h('option', { value: '0.2' }, 'Concreto'), h('option', { value: '0.5' }, 'Mixto'), h('option', { value: '0.8' }, 'Abstracto')),
      similarity: h('select', null, h('option', { value: '0.2' }, 'Elementos distintos'), h('option', { value: '0.5' }, 'Algo parecidos'), h('option', { value: '0.8' }, 'Muy parecidos (se confunden)')),
      minutes: h('input', { type: 'number', value: 15, min: 1, max: 600, 'aria-label': 'Minutos disponibles' }),
      retention: h('select', null, h('option', { value: 'hoy' }, 'Solo para hoy'), h('option', { value: 'semanas', selected: true }, 'Semanas'), h('option', { value: 'meses' }, 'Meses o años'))
    };
    const out = h('div');
    const calc = () => {
      const prof = { type: f.type.value, count: Number(f.count.value), ordered: f.ordered.value === '1', abstract: Number(f.abstract.value), similarity: Number(f.similarity.value), minutes: Number(f.minutes.value), retention: f.retention.value };
      const r = Strategy.recommend(prof, [...TR.known()], TR.perfFor(prof.type));
      out.innerHTML = '';
      out.append(h('div', { class: 'card' }, h('h2', null, 'Recomendación para ' + r.label.toLowerCase()),
        h('ol', null, r.plan.map(p => h('li', null, h('a', { href: '#/techniques/' + p.id }, (SEM.techById[p.id] || { n: p.id }).n), ' ', h('span', { class: 'tag ' + (p.status === 'dominada' ? 'good' : p.status === 'por aprender' ? 'warn' : '') }, p.status), p.instead ? h('span', { class: 'small muted' }, ' (en lugar de ' + SEM.techById[p.instead].n + ', que aún no dominas)') : null, p.perf != null ? h('span', { class: 'small muted' }, ' · tu precisión: ' + pct(p.perf)) : null, p.note ? h('div', { class: 'small', style: { color: 'var(--warn)' } }, p.note) : null))),
        r.reasons.length ? h('div', null, h('h3', null, 'Por qué'), h('ul', null, r.reasons.map(x => h('li', { class: 'small' }, h('b', null, (SEM.techById[x.id] || { n: x.id }).n + ': '), x.why)))) : null,
        r.nextToLearn ? h('div', { class: 'notice' }, 'Siguiente técnica que conviene aprender para este tipo de información: ', h('a', { href: '#/techniques/' + r.nextToLearn }, SEM.techById[r.nextToLearn].n), '. Introdúcela sola primero y combínala después.') : null));
    };
    Object.values(f).forEach(x => x.addEventListener('input', calc));
    root.append(h('div', { class: 'card' }, h('div', { class: 'grid g3' }, Object.entries({ type: 'Tipo de información', count: 'Cantidad de elementos', ordered: 'Orden', abstract: 'Abstracción', similarity: 'Similitud', minutes: 'Tiempo disponible (min)', retention: 'Duración deseada' }).map(([k, l]) => h('div', null, h('label', { class: 'f' }, l), f[k])))), out);
    calc();
    root.append(TR.viewDiagnosis());
  };

  /* Diagnóstico por módulo con comparación antes/después del cambio de estrategia. */
  TR.viewDiagnosis = function () {
    const card = h('div', { class: 'card' }, h('h2', null, 'Diagnóstico y cambio de estrategia'), h('p', { class: 'muted small' }, 'Se analizan tus últimos intentos por módulo. Solo se propone un cambio si hay un patrón (mínimo 3 intentos), nunca por un error aislado.'));
    const mods = [...new Set(Store.attempts().map(a => a.module))].filter(m => !['english', 'delayed'].includes(m));
    if (!mods.length) card.append(h('p', { class: 'muted' }, 'Todavía no hay datos suficientes.'));
    mods.forEach(m => {
      const xs = Store.attempts(a => a.module === m && a.total);
      const d = Strategy.diagnose(xs);
      const prev = Store.get('diag', m);
      const row = h('div', { class: 'card tight' }, h('b', null, (MEM.modById[m] || { n: m }).n || m), h('span', { class: 'muted small' }, ' · ' + xs.length + ' intentos'));
      if (!d.problem) row.append(h('div', { class: 'small muted' }, d.reason || 'Sin problemas detectados (precisión ' + pct(d.accuracy) + ').'));
      else {
        row.append(h('div', { class: 'notice warn small' }, h('b', null, d.problem.title), h('div', null, d.problem.explain), h('div', null, 'Recomendado: ', d.problem.recommend.map(t => h('a', { class: 'tag acc', href: '#/techniques/' + t }, SEM.techById[t].n)))));
        if (MEM.modById[m]) row.append(h('button', { class: 'btn small', type: 'button', onclick: () => {
          Store.put('diag', m, { problem: d.problem.id, technique: d.problem.recommend[0], ts: Date.now(), before: d.accuracy });
          const lvl = Math.max(1, MEM.modLevel(m).level - 1);
          App.start({ title: 'Nueva estrategia · ' + MEM.modById[m].n, module: m, items: [{ type: 'info', title: 'Demostración diferente', paras: [SEM.techById[d.problem.recommend[0]].how, h('div', { class: 'notice' }, SEM.techById[d.problem.recommend[0]].demo), 'Bajamos temporalmente la dificultad y volvemos a evaluar.'] }, MEM.make(m, { level: lvl, mode: d.problem.adjust.mode || 'slow', technique: d.problem.recommend.join('+'), guided: true, ordered: d.problem.adjust.ordered })], back: '#/strategy' });
        } }, 'Probar la estrategia recomendada'));
      }
      if (prev) {
        const after = xs.filter(a => a.ts > prev.ts);
        if (after.length) { const acc = after.reduce((s, a) => s + a.score, 0) / after.length; row.append(h('div', { class: 'small' }, 'Comparación: antes ' + pct(prev.before) + ' → después ' + pct(acc) + ' (' + after.length + ' intentos con ' + SEM.techById[prev.technique].n + ')' + (after.length < 5 ? '. Pocos datos: no es una conclusión firme.' : ''))); }
      }
      card.append(row);
    });
    return card;
  };
})();
