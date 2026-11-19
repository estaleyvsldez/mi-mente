/* MEMORY LAB — MEMORY STRATEGY LAB: comparar técnicas con conjuntos equivalentes y retención diferida. */
(function () {
  'use strict';
  const { h, toast, pct } = UI;
  const LAB = window.Lab = {};
  const DAY = 86400000;
  const METHODS = {
    'visual-assoc': { n: 'Asociación visual', needsPalace: false },
    'story': { n: 'Cadena de historia', needsPalace: false },
    'loci': { n: 'Palacio de la memoria', needsPalace: true },
    'visual-assoc+loci': { n: 'Asociación visual + palacio', needsPalace: true },
    'vocab-cat': { n: 'Agrupación por categorías', needsPalace: false },
    'chunking': { n: 'Chunking', needsPalace: false },
    'major': { n: 'Major System', needsPalace: false, digits: true },
    'major+loci': { n: 'Major + palacio', needsPalace: true, digits: true }
  };
  LAB.METHODS = METHODS;
  LAB.list = () => Store.list('labexp').sort((a, b) => b.created - a.created);

  Ex.types['rate-effort'] = {
    label: 'Esfuerzo percibido',
    render(el, it, done) {
      el.append(h('div', { class: 'prompt' }, '¿Cuánto esfuerzo te costó este método?'), h('div', { class: 'row' }, [1, 2, 3, 4, 5].map(n => h('button', { class: 'btn', type: 'button', onclick: () => { it.effort = n; done(null); } }, n + (n === 1 ? ' · muy poco' : n === 5 ? ' · muchísimo' : '')))));
    }
  };

  /* Orden contrabalanceado: cada sesión rota el método inicial (cuadrado latino simple). */
  LAB.nextMethod = function (exp) {
    const k = exp.trials.length;
    const m = exp.methods.length;
    const round = Math.floor(k / m), pos = k % m;
    return exp.methods[(pos + round) % m];
  };
  LAB.runTrial = function (exp) {
    const method = LAB.nextMethod(exp);
    const meta = METHODS[method];
    const pal = Athlete.palaces()[0];
    if (meta.needsPalace && !pal) { toast('Este método necesita un palacio. Créalo primero.'); App.go('#/athlete/palaces'); return; }
    let it;
    if (meta.needsPalace) it = Athlete.palaceItem(pal._id, meta.digits ? exp.n * 2 : exp.n, meta.digits ? 'digits' : 'words', { technique: method, schedule: false });
    else it = MEM.fill({ type: 'mem', module: 'lab', kind: meta.digits ? 'digits' : method === 'story' ? 'story' : method === 'vocab-cat' ? 'groups' : 'words', count: meta.digits ? exp.n * 2 : exp.n, groups: 3, mode: 'normal', technique: method, ordered: exp.ordered, schedule: false, fixed: true });
    it.module = 'lab'; it.schedule = false; it.label = 'Laboratorio · ' + meta.n;
    const tid = 't' + Date.now().toString(36);
    const rate = { type: 'rate-effort' };
    App.start({ title: 'Laboratorio: ' + exp.name, module: 'lab', items: [{ type: 'info', title: 'Método de este ensayo: ' + meta.n, paras: [SEM.techById[method.split('+')[0]].how, 'Usa SOLO este método. Después valorarás el esfuerzo y te pediremos recordar a las 24 h, 7 días y 30 días.'] }, it, rate], back: '#/lab',
      onDone: (session) => {
        const r = session.results.find(x => x.type === 'mem');
        if (!r) return null;
        const last = Store.attempts(a => a.meta && a.meta.run === session.id && a.meta.type === 'mem').pop();
        const trial = { id: tid, method, ts: Date.now(), immediate: r.score, encodeMs: last && last.meta ? last.meta.encodeMs : null, orderOk: last && last.meta ? last.meta.orderOk : null, effort: session.items[2].effort || null };
        const cur = Store.get('labexp', exp._id);
        Store.put('labexp', exp._id, Object.assign({}, cur, { trials: (cur.trials || []).concat([trial]) }));
        [1, 7, 30].forEach(d => Store.put('delayed', 'lab-' + tid + '-' + d, { id: 'lab-' + tid + '-' + d, due: Date.now() + d * DAY - 2 * 3600000, created: Date.now(), item: Object.assign({}, it, { delayedOf: 'lab-' + tid + '-' + d, lab: { exp: exp._id, trial: tid, horizon: d } }), module: 'lab', technique: method }));
        return h('div', { class: 'notice' }, 'Ensayo guardado. Te pediremos recordarlo en 1, 7 y 30 días (aparecerá en el inicio como evaluación diferida).');
      } });
  };
  LAB.results = function (exp) {
    const delayed = Store.list('delayed').filter(d => d.item && d.item.lab && d.item.lab.exp === exp._id && d.done);
    const by = {};
    exp.methods.forEach(m => { by[m] = { n: 0, imm: [], enc: [], ord: [], eff: [], d1: [], d7: [], d30: [] }; });
    (exp.trials || []).forEach(t => {
      const b = by[t.method]; if (!b) return;
      b.n++; b.imm.push(t.immediate); if (t.encodeMs) b.enc.push(t.encodeMs / 1000); if (t.orderOk != null) b.ord.push(t.orderOk); if (t.effort) b.eff.push(t.effort);
      delayed.filter(d => d.item.lab.trial === t.id).forEach(d => b['d' + d.item.lab.horizon].push(d.delayedScore));
    });
    const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    return exp.methods.map(m => ({ m, n: by[m].n, imm: mean(by[m].imm), enc: mean(by[m].enc), ord: mean(by[m].ord), eff: mean(by[m].eff), d1: mean(by[m].d1), d7: mean(by[m].d7), d30: mean(by[m].d30), nd1: by[m].d1.length }));
  };

  LAB.view = function (root) {
    root.append(h('h1', null, 'Memory Strategy Lab'), h('p', { class: 'muted' }, 'Compara técnicas con conjuntos equivalentes (mismo tamaño y tipo, elementos distintos). El orden de los métodos se alterna para reducir el efecto de la práctica. Se mide tiempo de aprendizaje, precisión inmediata, retención a 24 h, 7 días y 30 días, orden y esfuerzo percibido.'));
    const name = h('input', { type: 'text', placeholder: 'Nombre del experimento', value: 'Palabras: visual vs palacio' });
    const n = h('input', { type: 'number', value: 10, min: 4, max: 40, 'aria-label': 'Elementos por ensayo' });
    const boxes = Object.entries(METHODS).map(([k, m]) => { const c = h('input', { type: 'checkbox', value: k, checked: ['visual-assoc', 'loci', 'visual-assoc+loci'].includes(k) }); return h('label', { class: 'tag', style: { cursor: 'pointer' } }, c, ' ' + m.n); });
    root.append(h('div', { class: 'card' }, h('h2', null, 'Nuevo experimento'), h('div', { class: 'grid g2' }, name, n), h('div', { style: { margin: '8px 0' } }, boxes),
      h('button', { class: 'btn primary', type: 'button', onclick: () => {
        const methods = boxes.map(b => b.querySelector('input')).filter(c => c.checked).map(c => c.value);
        if (methods.length < 2) return toast('Elige al menos 2 métodos', 'bad');
        if (methods.some(m => METHODS[m].digits) && methods.some(m => !METHODS[m].digits)) return toast('No mezcles métodos de números con métodos de palabras: los conjuntos no serían equivalentes.', 'bad');
        const id = 'e' + Date.now().toString(36);
        Store.put('labexp', id, { name: name.value.trim() || 'Experimento', n: Number(n.value) || 10, methods, ordered: true, trials: [], created: Date.now() });
        App.route();
      } }, 'Crear')));
    LAB.list().forEach(exp => {
      const res = LAB.results(exp);
      const next = LAB.nextMethod(exp);
      const enough = res.every(r => r.n >= 3 && r.nd1 >= 2);
      const ranked = res.filter(r => r.d1 != null).sort((a, b) => b.d1 - a.d1);
      let verdict = 'Aún no hay datos suficientes (se necesitan ≥3 ensayos por método con su recuperación a 24 h).';
      if (enough && ranked.length >= 2) {
        const diff = ranked[0].d1 - ranked[1].d1;
        verdict = diff < 0.1 ? 'Diferencia pequeña (' + Math.round(diff * 100) + ' puntos): no permite concluir que un método sea mejor. Sigue registrando ensayos.' : 'Con tus datos, «' + METHODS[ranked[0].m].n + '» retiene mejor a 24 h (+' + Math.round(diff * 100) + ' puntos). Es una tendencia personal, no una conclusión científica.';
      }
      const fmt = v => (v == null ? '—' : pct(v));
      root.append(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h3', { style: { margin: 0 } }, '🧪 ' + exp.name), h('span', { class: 'tag' }, (exp.trials || []).length + ' ensayos · ' + exp.n + ' elementos')),
        h('div', { class: 'table-wrap' }, h('table', null, h('tr', null, ['Método', 'Ensayos', 'Tiempo aprendizaje', 'Inmediata', 'Orden', '24 h', '7 días', '30 días', 'Esfuerzo'].map(x => h('th', null, x))),
          res.map(r => h('tr', null, h('td', null, METHODS[r.m].n), h('td', null, r.n), h('td', null, r.enc == null ? '—' : Math.round(r.enc) + ' s'), h('td', null, fmt(r.imm)), h('td', null, fmt(r.ord)), h('td', null, fmt(r.d1)), h('td', null, fmt(r.d7)), h('td', null, fmt(r.d30)), h('td', null, r.eff == null ? '—' : r.eff.toFixed(1) + '/5'))))),
        h('div', { class: 'notice small' }, verdict),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: () => LAB.runTrial(exp) }, 'Siguiente ensayo: ' + METHODS[next].n),
          UI.confirmBtn('Borrar', '¿Seguro? Pulsa otra vez', () => { Store.del('labexp', exp._id); App.route(); }))));
    });
  };
})();
