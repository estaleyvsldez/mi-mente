/* MEMORY LAB — LA RUTA: un solo camino, un solo botón.
   Curso de inglés americano ordenado en unidades (de cero a avanzado) con los trucos de memoria
   intercalados en secuencia. Cada día, «Empezar» encadena: lo que quedó a medias → repasos que tocan →
   el siguiente truco de memoria → las estructuras nuevas del día → la evaluación de etapa cuando corresponde. */
(function () {
  'use strict';
  const { h, toast, pct } = UI;
  const R = window.Route = {};
  const CEFR = ['A1', 'A2', 'B1', 'B1+', 'B2', 'C1'];
  const PER_UNIT = 3;
  /* Unidad a partir de la cual se introduce cada truco (siempre en este orden). */
  const TRICK_AT = [0, 2, 4, 6, 9, 12, 16, 21, 27];

  /* ---------- curso ---------- */
  let cache = null;
  R.course = function () {
    if (cache && cache.n === SEM.patterns.length) return cache;
    const catIdx = {}; SEM.CATS.forEach((c, i) => { catIdx[c.id] = i; });
    const pos = {}; SEM.patterns.forEach((p, i) => { pos[p.id] = i; });
    const units = [];
    for (let st = 1; st <= 6; st++) {
      let list = SEM.patterns.filter(p => p.st === st && !p.hidden).sort((a, b) => catIdx[a.cat] - catIdx[b.cat] || pos[a.id] - pos[b.id]);
      // prerrequisitos antes (orden topológico estable)
      const placed = new Set(units.flatMap(u => u.pids)); const ordered = [];
      let guard = 0;
      while (list.length && guard++ < 2000) {
        const k = list.findIndex(p => (p.req || []).every(r => !SEM.byId[r] || placed.has(r) || SEM.byId[r].st > st));
        const p = list.splice(k < 0 ? 0 : k, 1)[0];
        ordered.push(p); placed.add(p.id);
      }
      // agrupar en unidades de la misma categoría
      // tramos consecutivos de la misma categoría, repartidos en unidades equilibradas (4 → 2+2, 5 → 3+2)
      const runs = [];
      ordered.forEach(p => { const r = runs[runs.length - 1]; if (r && r.cat === p.cat) r.ids.push(p.id); else runs.push({ cat: p.cat, ids: [p.id] }); });
      runs.forEach(r => {
        const k = Math.ceil(r.ids.length / PER_UNIT), size = Math.ceil(r.ids.length / k);
        for (let i = 0; i < r.ids.length; i += size) units.push({ st, cat: r.cat, pids: r.ids.slice(i, i + size) });
      });
    }
    units.forEach((u, i) => { u.n = i + 1; u.title = (SEM.catById[u.cat] || {}).name || u.cat; });
    const tricks = SEM.LESSONS.map((L, i) => ({ L, at: Math.min(TRICK_AT[i] != null ? TRICK_AT[i] : i * 4, units.length - 1) }));
    cache = { n: SEM.patterns.length, units, tricks, total: units.reduce((s, u) => s + u.pids.length, 0) };
    return cache;
  };

  /* Unidad actual: la primera con estructuras sin estudiar dentro de las etapas desbloqueadas. */
  R.position = function () {
    const c = R.course();
    const unl = EN.unlocked();
    const learned = c.units.reduce((s, u) => s + u.pids.filter(EN.seen).length, 0);
    let unitIdx = c.units.findIndex(u => u.pids.some(pid => !EN.seen(pid)));
    if (unitIdx < 0) unitIdx = c.units.length;
    const unit = c.units[unitIdx] || null;
    const blockedStage = unit && unit.st > unl ? unit.st - 1 : null; // hay que superar la evaluación de la etapa anterior
    return { unitIdx, unit, learned, total: c.total, blockedStage, unl };
  };

  /* El truco que toca practicar ahora (sin bloquear el inglés: van en paralelo). */
  R.trickToday = function (unitIdx) {
    const c = R.course();
    for (const t of c.tricks) {
      if (t.at > unitIdx) break;
      if (Training.lesson(t.L.id).mastered) continue;
      const phase = Training.nextPhase(t.L);
      if (!phase) return { t, phase: null };
      return { t, phase };
    }
    return null;
  };
  /* Truco ya aprendido más reciente, para aplicarlo al inglés. */
  R.activeTrick = function () {
    const c = R.course();
    let last = null;
    c.tricks.forEach(t => { if (Training.lesson(t.L.id).steps.guided) last = t.L; });
    return last;
  };
  const TRICK_TIPS = {
    L1: p => 'Asociación visual: imagina ' + p.img + ' haciendo la acción de la frase, grande y con color. Asocia esa imagen a la parte amarilla del molde.',
    L2: () => 'Agrupación: no memorices palabras sueltas. El molde es UN bloque (amarillo) + un hueco. Recuerdas 2 piezas, no 6 palabras.',
    L3: () => 'Recuperación activa: antes de mirar la respuesta, intenta decirla en voz alta. El esfuerzo de recordar es lo que fija la memoria.',
    L4: () => 'Repaso espaciado: no repases todo hoy. La app te traerá esta estructura justo antes de que la olvides (mañana, en 3 días, en una semana…).',
    L5: p => 'Palacio de la memoria: deja ' + p.img + ' y la frase en un lugar de tu casa (por ejemplo, la puerta). Para recordarla, camina mentalmente hasta allí.',
    L6: () => 'Historia: une esta estructura con la anterior en una mini historia tuya. Las historias guardan el orden.',
    L7: () => 'Combina: bloques de colores + imagen + lugar del palacio + decirla sin mirar. Cuatro trucos en una sola frase.',
    L8: () => 'Números con imágenes: si la frase lleva números (precios, horas), conviértelos en tus palabras Major.',
    L9: () => 'Multimodal: ve la imagen, oye la frase, dila en voz alta y escríbela. Cuantos más sentidos, más rutas para recordar.'
  };
  R.tipFor = function (p) { const L = R.activeTrick(); return L && TRICK_TIPS[L.id] ? { name: (SEM.techById[L.newTech] || {}).n, text: TRICK_TIPS[L.id](p) } : null; };

  /* ---------- plan del día: lista ordenada de pasos ---------- */
  R.today = function () {
    const steps = [];
    const set = App.settings();
    const ip = Store.get('inprogress', 'current');
    if (ip) steps.push({ icon: '⏯️', label: 'Terminar lo que dejaste a medias', why: ip.title, build: () => Object.assign({}, ip, { resume: true }) });
    const dl = Store.list('delayed').filter(d => !d.done && d.due <= Date.now() && !(d.item && d.item.lab));
    if (dl.length) steps.push({ icon: '⏳', label: 'Recordar lo de ayer', why: 'Comprobamos si sigue en tu memoria', build: () => ({ title: 'Recordar lo de ayer', module: 'delayed', items: dl.slice(0, 3).map(d => Object.assign({}, d.item, { label: 'Recuperación diferida', skipStudy: true })), back: '#/' }) });
    const due = EN.due();
    if (due.length) steps.push({ icon: '🔁', label: 'Repaso de inglés (' + Math.min(due.length, set.maxReviews) + ')', why: 'Estructuras que estás a punto de olvidar', build: () => EN.reviewSession(EN.due().slice(0, set.maxReviews)) });
    const pos = R.position();
    const tr = R.trickToday(pos.unitIdx);
    const trickDoneToday = Store.attempts(a => a.module === 'training' && a.day === Stats.localDay(Date.now())).length > 0;
    if (tr && tr.phase && !trickDoneToday) {
      const names = { guided: 'aprender', practice: 'practicar', exam: 'evaluar' };
      steps.push({ icon: '🧠', label: 'Truco de memoria: ' + tr.t.L.n + ' (' + names[tr.phase] + ')', why: tr.t.L.goal, build: () => { const r = Training.buildPhase(tr.t.L, tr.phase); return r.session || null; } });
    }
    if (pos.blockedStage) {
      const st = EN.stageStats(pos.blockedStage);
      if (st.ratio >= 0.7) steps.push({ icon: '🎓', label: 'Evaluación final de la Etapa ' + pos.blockedStage, why: 'Necesitas 85 % para pasar a la siguiente etapa', build: () => EN.examSession(pos.blockedStage) });
    } else if (pos.unit) {
      const room = due.length > 40 ? 0 : Math.max(0, set.newPerDay - EN.learnedToday());
      const next = R.course().units.slice(pos.unitIdx).flatMap(u => u.pids.filter(pid => !EN.seen(pid)).map(pid => ({ pid, u }))).filter(x => x.u.st <= pos.unl).slice(0, room);
      next.forEach(({ pid, u }) => steps.push({ icon: '✨', label: 'Nueva: ' + SEM.byId[pid].t, why: SEM.byId[pid].m + ' (Unidad ' + u.n + ')', build: () => EN.learnSession(pid) }));
    }
    return { steps, pos };
  };

  /* Ejecuta los pasos uno tras otro con un solo botón. */
  R.run = function (steps, i) {
    i = i || 0;
    if (i >= steps.length) { App.go('#/'); return; }
    const s = steps[i].build();
    if (!s) return R.run(steps, i + 1);
    if (s.resume) { delete s.resume; }
    const od = s.onDone;
    const nextStep = steps[i + 1];
    s.back = '#/';
    s.onDone = (ss, acc) => h('div', null, od ? od(ss, acc) : null,
      nextStep ? h('div', { class: 'notice', style: { marginTop: '12px' } }, h('div', { class: 'small muted' }, 'Siguiente paso (' + (i + 2) + ' de ' + steps.length + ')'), h('b', null, nextStep.icon + ' ' + nextStep.label),
        h('div', { style: { marginTop: '8px' } }, h('button', { class: 'btn primary', type: 'button', onclick: () => R.run(steps, i + 1) }, 'Continuar →')))
        : h('div', { class: 'notice good', style: { marginTop: '12px' } }, h('b', null, '✓ Terminaste la sesión de hoy.'), h('div', { class: 'small' }, 'Lo más importante para aprender es volver mañana: la app te traerá lo que necesitas repasar.')));
    App.start(s);
  };

  /* ---------- vista principal ---------- */
  R.view = function (root) {
    const { steps, pos } = R.today();
    const c = R.course();
    const s = Stats.summary(Store.attempts(), { rule: Analytics.rule() });
    const unit = pos.unit;
    const pctCourse = pos.total ? pos.learned / pos.total : 0;
    // cabecera: dónde estás
    root.append(h('div', { class: 'route-hero card' },
      h('div', { class: 'small muted' }, unit ? 'Etapa ' + unit.st + ' de 6 · nivel ' + CEFR[unit.st - 1] + ' · Unidad ' + unit.n + ' de ' + c.units.length : 'Curso completado'),
      h('h1', { style: { margin: '4px 0 6px' } }, unit ? unit.title : '¡Llegaste al final del curso!'),
      h('div', { class: 'bar', title: pct(pctCourse) }, h('i', { style: { width: (pctCourse * 100) + '%' } })),
      h('div', { class: 'small muted', style: { marginTop: '6px' } }, pos.learned + ' de ' + pos.total + ' estructuras estudiadas · racha ' + s.streak + ' 🔥'),
      steps.length
        ? h('button', { class: 'btn primary big', type: 'button', onclick: () => R.run(steps, 0) }, s.exercises ? 'Continuar' : 'Empezar')
        : h('div', { class: 'notice good' }, h('b', null, '✓ Por hoy está todo hecho.'), ' Vuelve mañana: tu memoria trabaja mientras descansas.'),
      steps.length ? h('ol', { class: 'today' }, steps.map(x => h('li', null, h('span', null, x.icon + ' ' + x.label), h('span', { class: 'small muted' }, x.why)))) : null,
      pos.blockedStage && EN.stageStats(pos.blockedStage).ratio < 0.7 ? h('p', { class: 'small muted' }, 'Terminaste las estructuras de la Etapa ' + pos.blockedStage + '. Antes de la evaluación final, los repasos de los próximos días tienen que consolidarlas (' + pct(EN.stageStats(pos.blockedStage).ratio) + ' de 70 %).') : null));

    // el camino completo
    const path = h('div', { class: 'path' });
    let lastSt = 0;
    const trickAt = {}; c.tricks.forEach(t => { (trickAt[t.at] = trickAt[t.at] || []).push(t.L); });
    c.units.forEach((u, i) => {
      if (u.st !== lastSt) {
        lastSt = u.st;
        const ex = EN.state().exams[u.st];
        path.append(h('div', { class: 'stage-head' }, h('b', null, 'Etapa ' + u.st + ' · ' + CEFR[u.st - 1]), h('span', { class: 'small muted' }, SEM.STAGES[u.st - 1].desc), ex && ex.passed ? h('span', { class: 'tag good' }, 'superada') : null));
      }
      (trickAt[i] || []).forEach(L => {
        const st = Training.lesson(L.id);
        path.append(h('div', { class: 'step trick ' + (st.mastered ? 'done' : i <= pos.unitIdx ? 'now' : 'lock') },
          h('span', { class: 'dot' }, st.mastered ? '✓' : '🧠'), h('div', null, h('b', null, 'Truco: ' + L.n), h('div', { class: 'small muted' }, L.goal))));
      });
      const doneN = u.pids.filter(EN.seen).length;
      const state = doneN === u.pids.length ? 'done' : i === pos.unitIdx ? 'now' : 'lock';
      const det = h('details', { class: 'step ' + state, open: state === 'now' || null },
        h('summary', null, h('span', { class: 'dot' }, state === 'done' ? '✓' : u.n), h('div', null, h('b', null, 'Unidad ' + u.n + ' · ' + u.title), h('div', { class: 'small muted' }, u.pids.map(pid => SEM.byId[pid].t).join(' · ')))),
        h('ul', { class: 'list' }, u.pids.map(pid => { const p = SEM.byId[pid]; return h('li', { class: 'row between' }, h('div', null, p.img + ' ', h('b', null, p.t), h('div', { class: 'small muted' }, p.m)), EN.seen(pid) ? h('a', { class: 'tag good', href: '#/english/p/' + pid }, SEM.LEVEL_NAMES[EN.level(pid)]) : h('span', { class: 'tag' }, 'pendiente')); })));
      path.append(det);
    });
    root.append(h('h2', null, 'Tu camino'), h('p', { class: 'small muted' }, 'Inglés americano, de cero a avanzado, en el orden en que conviene aprenderlo. Los trucos de memoria aparecen en su momento y se aplican a cada estructura.'), path);
  };
})();
