/* MEMORY LAB — ANALYTICS & PROGRESS · calendario · historial · objetivos · logros. Todo derivado de intentos reales. */
(function () {
  'use strict';
  const { h, toast, pct, mins } = UI;
  const AN = window.Analytics = {};
  const MODNAME = m => (window.MEM && MEM.modById[m] ? MEM.modById[m].n : { english: 'Inglés', quick: 'Quick Memory', training: 'Entrenamiento progresivo', lab: 'Laboratorio', major: 'Major System', pao: 'PAO', delayed: 'Recuperación diferida', cards: 'Cartas', multimodal: 'Multimodal' }[m] || m);
  AN.rule = () => { const s = App.settings(); return { minExercises: s.minExercises, minMinutes: s.minMinutes, restPerWeek: s.restPerWeek }; };

  AN.viewStats = function (root) {
    const att = Store.attempts();
    const rule = AN.rule();
    const s = Stats.summary(att, { rule });
    root.append(h('h1', null, 'Analytics & Progress'), h('p', { class: 'muted small' }, 'Calculado a partir de ' + att.length + ' intentos guardados. Ningún dato es estimado ni decorativo.'));
    root.append(h('div', { class: 'grid g4' },
      [['Tiempo total', mins(s.totalMs)], ['Sesiones', s.sessions], ['Ejercicios', s.exercises], ['Precisión general', pct(s.exercises ? s.accuracy : null)], ['Días activos (válidos)', s.activeDays], ['Racha actual', s.streak + ' días'], ['Mejor racha', s.bestStreak + ' días'], ['Retención diferida', (r => r.rate == null ? '—' : pct(r.rate) + ' (' + r.n + ')')(Stats.retention(att))]]
        .map(([l, v]) => h('div', { class: 'stat' }, h('b', null, v), h('span', null, l)))));
    // gráficos
    const tabs = h('div', { class: 'tabs' }); const chartBox = h('div', { class: 'card' });
    const metricSel = h('select', { 'aria-label': 'Métrica' }, h('option', { value: 'n' }, 'Ejercicios'), h('option', { value: 'minutes' }, 'Minutos'), h('option', { value: 'accuracy' }, 'Precisión %'));
    const units = [['day', 'Diario', 30], ['week', 'Semanal', 12], ['month', 'Mensual', 12], ['year', 'Anual', 5]];
    let cur = 'day';
    const draw = () => {
      chartBox.innerHTML = '';
      const u = units.find(x => x[0] === cur);
      const ser = Stats.series(att, u[0], u[2]);
      const m = metricSel.value;
      chartBox.append(h('div', { class: 'row between' }, h('h3', { style: { margin: 0 } }, 'Evolución ' + u[1].toLowerCase()), metricSel),
        UI.barChart(ser.map(x => ({ label: u[0] === 'day' ? x.key.slice(8) : u[0] === 'week' ? x.key.slice(5) : u[0] === 'month' ? x.key.slice(5) + '/' + x.key.slice(2, 4) : x.key, value: m === 'accuracy' ? (x.accuracy == null ? 0 : Math.round(x.accuracy * 100)) : x[m], tip: x.key + ': ' + x.n + ' ejercicios · ' + x.minutes + ' min · precisión ' + pct(x.accuracy) })), { label: 'Evolución', unit: m === 'accuracy' ? ' %' : '' }));
      [...tabs.children].forEach(b => b.classList.toggle('on', b.dataset.u === cur));
    };
    units.forEach(([k, n]) => tabs.append(h('button', { type: 'button', 'data-u': k, onclick: () => { cur = k; draw(); } }, n)));
    metricSel.addEventListener('input', draw);
    root.append(tabs, chartBox); draw();
    // por módulo
    const mods = Stats.groupBy(att, 'module');
    root.append(h('div', { class: 'card' }, h('h2', null, 'Por módulo'), h('div', { class: 'table-wrap' }, h('table', null, h('tr', null, ['Módulo', 'Ejercicios', 'Precisión', 'Minutos', 'Días', 'Retención diferida'].map(x => h('th', null, x))),
      mods.map(m => { const r = Stats.retention(att.filter(a => a.module === m.key)); return h('tr', null, h('td', null, MODNAME(m.key)), h('td', null, m.n), h('td', null, pct(m.accuracy)), h('td', null, m.minutes), h('td', null, m.days), h('td', null, r.rate == null ? '—' : pct(r.rate))); })))));
    // inglés
    const en = Stats.english(att, Store.map('srs'));
    root.append(h('div', { class: 'card' }, h('h2', null, 'Inglés'), h('div', { class: 'grid g4' },
      [['Estructuras estudiadas', en.studied], ['Construyes (nivel 3+)', en.building], ['Dominadas (nivel 4+)', en.mastered], ['Vocabulario recordado', en.vocabulary], ['Oraciones originales', en.original], ['Combinaciones correctas', en.combos], ['Ejercicios orales', en.oral], ['Ejercicios escritos', en.written], ['Conversaciones completadas', en.conversations], ['Retención', en.retention.rate == null ? '—' : pct(en.retention.rate)]]
        .map(([l, v]) => h('div', { class: 'stat' }, h('b', null, v), h('span', null, l))))));
    // técnicas
    const tech = {}; att.forEach(a => { if (!a.technique) return; a.technique.split('+').forEach(t => { const r = tech[t] || (tech[t] = { n: 0, s: 0, ms: 0, err: 0, combos: 0 }); r.n++; r.s += a.score; r.ms += a.ms || 0; if (a.score < 0.7) r.err++; if (a.technique.includes('+')) r.combos++; }); });
    root.append(h('div', { class: 'card' }, h('h2', null, 'Técnicas'), h('div', { class: 'table-wrap' }, h('table', null, h('tr', null, ['Técnica', 'Usos', 'En combinación', 'Precisión', 'Errores', 'Minutos', 'Retención'].map(x => h('th', null, x))),
      Object.entries(tech).sort((a, b) => b[1].n - a[1].n).map(([t, r]) => { const ret = Stats.retention(att.filter(a => a.technique && a.technique.split('+').includes(t))); return h('tr', null, h('td', null, (SEM.techById[t] || { n: t }).n), h('td', null, r.n), h('td', null, r.combos), h('td', null, pct(r.s / r.n)), h('td', null, r.err), h('td', null, Math.round(r.ms / 60000)), h('td', null, ret.rate == null ? '—' : pct(ret.rate))); })))));
    // récords
    const rec = Stats.records(att);
    const R = (l, r, f) => h('div', { class: 'stat' }, h('b', null, r ? f(r.value) : '—'), h('span', null, l + (r ? ' · ' + UI.dateStr(r.ts) : '')));
    root.append(h('div', { class: 'card' }, h('h2', null, 'Récords personales'), h('div', { class: 'grid g3' },
      R('Más elementos recordados', rec.maxRecalled, v => v), R('Mayor precisión (≥5 elementos)', rec.bestAccuracy, v => v + ' %'), R('Mejor tiempo (perfecto, ≥5)', rec.bestTime, v => (v / 1000).toFixed(1) + ' s'),
      R('Secuencia más larga', rec.longestSequence, v => v), R('Más estructuras en una sesión', rec.mostStructures, v => v), R('Más oraciones originales en una sesión', rec.mostOriginal, v => v))));
  };

  AN.viewCalendar = function (root) {
    const att = Store.attempts(); const rule = AN.rule();
    const valid = new Set(Stats.validDays(att, rule));
    const st = Stats.streaks(att, rule);
    const byDay = Stats.byDay(att);
    root.append(h('h1', null, 'Calendario y racha'),
      h('div', { class: 'grid g4' }, h('div', { class: 'stat' }, h('b', null, st.current), h('span', null, 'racha actual')), h('div', { class: 'stat' }, h('b', null, st.best), h('span', null, 'mejor racha')), h('div', { class: 'stat' }, h('b', null, st.activeDays), h('span', null, 'días válidos')), h('div', { class: 'stat' }, h('b', null, rule.restPerWeek), h('span', null, 'descansos/semana permitidos'))),
      h('div', { class: 'card' }, h('p', { class: 'small muted' }, 'Un día cuenta si haces al menos ' + rule.minExercises + ' ejercicios' + (rule.minMinutes ? ' o ' + rule.minMinutes + ' minutos' : '') + '. Varias sesiones el mismo día cuentan como un día. El día se fija con la zona horaria de tu dispositivo en el momento de practicar. Se permiten ' + rule.restPerWeek + ' día(s) de descanso por semana sin romper la racha. Cambia la regla en Configuración.'), UI.heatmap(byDay, 26, valid)));
    const days = Object.keys(byDay).sort().reverse().slice(0, 60);
    root.append(h('div', { class: 'card' }, h('h2', null, 'Actividad por día'), h('div', { class: 'table-wrap' }, h('table', null, h('tr', null, ['Día', 'Sesiones', 'Ejercicios', 'Tiempo', 'Precisión', 'Válido'].map(x => h('th', null, x))),
      days.map(d => h('tr', null, h('td', null, d), h('td', null, byDay[d].sessions.size), h('td', null, byDay[d].n), h('td', null, mins(byDay[d].ms)), h('td', null, pct(byDay[d].score / byDay[d].n)), h('td', null, valid.has(d) ? '✓' : '—')))))));
  };

  AN.viewHistory = function (root) {
    const att = Store.attempts().slice().reverse();
    const mod = h('select', { 'aria-label': 'Módulo' }, h('option', { value: '' }, 'Todos los módulos'), [...new Set(att.map(a => a.module))].map(m => h('option', { value: m }, MODNAME(m))));
    const list = h('div', { class: 'table-wrap' });
    let page = 0;
    const draw = () => {
      const xs = att.filter(a => !mod.value || a.module === mod.value);
      list.innerHTML = '';
      list.append(h('table', null, h('tr', null, ['Fecha', 'Módulo', 'Elemento', 'Técnica', 'Resultado', 'Tiempo'].map(x => h('th', null, x))),
        xs.slice(page * 100, page * 100 + 100).map(a => h('tr', null, h('td', null, UI.timeStr(a.ts)), h('td', null, MODNAME(a.module)), h('td', { class: 'small' }, a.item ? (a.item.startsWith('en:') && SEM.byId[a.item.slice(3)] ? SEM.byId[a.item.slice(3)].t : a.item) : '—'), h('td', { class: 'small' }, a.technique ? a.technique.split('+').map(t => (SEM.techById[t] || { n: t }).n).join(' + ') : '—'), h('td', null, a.total ? a.correct + '/' + a.total : pct(a.score)), h('td', null, a.ms ? (a.ms / 1000).toFixed(1) + ' s' : '—')))),
        h('div', { class: 'row', style: { marginTop: '8px' } }, h('button', { class: 'btn small', type: 'button', disabled: !page, onclick: () => { page--; draw(); } }, '← Más recientes'), h('span', { class: 'small muted' }, 'Página ' + (page + 1) + ' de ' + Math.max(1, Math.ceil(xs.length / 100))), h('button', { class: 'btn small', type: 'button', disabled: (page + 1) * 100 >= xs.length, onclick: () => { page++; draw(); } }, 'Anteriores →')));
    };
    mod.addEventListener('input', () => { page = 0; draw(); });
    root.append(h('h1', null, 'Historial'), h('p', { class: 'muted small' }, att.length + ' intentos registrados. El historial no se modifica: es la fuente de todas las estadísticas.'), mod, list);
    draw();
  };

  AN.GOAL_TYPES = { minutes: 'Minutos de entrenamiento', exercises: 'Ejercicios', structures: 'Estructuras de inglés distintas', accuracy: 'Precisión media (%)', reviews: 'Completar repasos pendientes' };
  AN.goals = () => Store.list('goals');
  AN.goalExtra = () => ({ dueNow: window.EN ? EN.due().length : 0 });
  AN.viewGoals = function (root) {
    const att = Store.attempts();
    root.append(h('h1', null, 'Objetivos y logros'), h('p', { class: 'muted' }, 'Metas flexibles: si un día no llegas, no se pierde nada. Los logros se comprueban con tus intentos reales.'));
    const type = h('select', null, Object.entries(AN.GOAL_TYPES).map(([k, v]) => h('option', { value: k }, v)));
    const period = h('select', null, h('option', { value: 'day' }, 'Diario'), h('option', { value: 'week' }, 'Semanal'));
    const target = h('input', { type: 'number', value: 20, min: 1, 'aria-label': 'Meta' });
    root.append(h('div', { class: 'card' }, h('h2', null, 'Nuevo objetivo'), h('div', { class: 'grid g3' }, type, period, target),
      h('button', { class: 'btn primary', type: 'button', style: { marginTop: '8px' }, onclick: () => { Store.put('goals', 'g' + Date.now().toString(36), { type: type.value, period: period.value, target: Number(target.value) || 1, created: Date.now() }); App.route(); } }, 'Añadir')));
    const goals = AN.goals();
    if (goals.length) root.append(h('div', { class: 'card' }, h('h2', null, 'Mis objetivos'), goals.map(g => {
      const p = Stats.goalProgress(g, att, null, AN.goalExtra());
      return h('div', { class: 'card tight' }, h('div', { class: 'row between' }, h('b', null, AN.GOAL_TYPES[g.type] + ' · ' + (g.period === 'week' ? 'semanal' : 'diario')), h('span', { class: 'tag ' + (p.done ? 'good' : '') }, p.value + ' / ' + p.target)),
        h('div', { class: 'bar', style: { marginTop: '6px' } }, h('i', { style: { width: Math.min(100, p.value / p.target * 100) + '%' } })),
        h('button', { class: 'btn ghost small', type: 'button', onclick: () => { Store.del('goals', g._id); App.route(); } }, 'Quitar'));
    })));
    const ach = Stats.achievements(att, Store.map('srs'), { rule: AN.rule() });
    // los logros conseguidos se guardan con su fecha la primera vez (no se pierden aunque cambie la regla)
    ach.forEach(a => { if (a.done && !Store.get('achievements', a.id)) Store.put('achievements', a.id, { ts: Date.now() }); });
    root.append(h('div', { class: 'card' }, h('h2', null, 'Logros'), h('div', { class: 'grid g3' }, ach.map(a => { const got = Store.get('achievements', a.id); return h('div', { class: 'stat', style: { opacity: got ? 1 : 0.5 } }, h('b', null, (got ? '🏅 ' : '🔒 ') + a.name), h('span', null, a.desc + (got ? ' · ' + UI.dateStr(got.ts) : ''))); }))));
  };
})();
