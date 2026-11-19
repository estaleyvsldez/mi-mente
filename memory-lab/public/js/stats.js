/* MEMORY LAB — estadísticas, rachas, récords, objetivos y logros.
   TODO se calcula a partir de la lista real de intentos guardados. No hay números inventados. */
(function (root, factory) {
  const m = factory();
  if (typeof module !== 'undefined') module.exports = m; else root.Stats = m;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const DAY = 86400000;

  function localDay(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function addDays(day, n) {
    const [y, m, d] = day.split('-').map(Number);
    const dt = new Date(y, m - 1, d + n, 12);
    return localDay(dt.getTime());
  }
  const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

  /* Agrupa los intentos por día local (el día se fija en el momento de la actividad). */
  function byDay(attempts) {
    const m = {};
    for (const a of attempts) {
      const k = a.day;
      const r = m[k] || (m[k] = { n: 0, ms: 0, score: 0, sessions: new Set() });
      r.n++; r.ms += a.ms || 0; r.score += a.score;
      if (a.meta && a.meta.session) r.sessions.add(a.meta.session);
    }
    return m;
  }

  /* Un día cuenta si cumple el mínimo configurable (ejercicios o minutos). */
  function validDays(attempts, rule) {
    rule = Object.assign({ minExercises: 5, minMinutes: 0 }, rule || {});
    const d = byDay(attempts);
    return Object.keys(d).filter(k => d[k].n >= rule.minExercises || (rule.minMinutes > 0 && d[k].ms >= rule.minMinutes * 60000)).sort();
  }

  /* Racha: días válidos consecutivos. Los días de descanso permitidos (restPerWeek) unen la racha
     sin sumar; varias sesiones el mismo día cuentan como un solo día. */
  function streaks(attempts, rule, today) {
    rule = Object.assign({ restPerWeek: 1 }, rule || {});
    const days = validDays(attempts, rule);
    const set = new Set(days);
    today = today || localDay(Date.now());
    if (!days.length) return { current: 0, best: 0, activeDays: 0, restUsed: 0 };
    // recorre desde el primer día válido hasta hoy
    let best = 0, cur = 0, rests = [], d = days[0];
    const end = today > days[days.length - 1] ? today : days[days.length - 1];
    let currentAlive = 0;
    while (d <= end) {
      if (set.has(d)) { cur++; }
      else if (d !== today) {
        rests = rests.filter(r => r > addDays(d, -7));
        if (cur > 0 && rests.length < rule.restPerWeek) rests.push(d);
        else { cur = 0; rests = []; }
      }
      best = Math.max(best, cur);
      currentAlive = cur;
      d = addDays(d, 1);
    }
    return { current: currentAlive, best, activeDays: days.length, restUsed: rests.length };
  }

  function summary(attempts, opts) {
    opts = opts || {};
    const sessions = new Set(attempts.map(a => a.meta && a.meta.session).filter(Boolean));
    const st = streaks(attempts, opts.rule, opts.today);
    return {
      exercises: attempts.length,
      sessions: sessions.size,
      totalMs: attempts.reduce((s, a) => s + (a.ms || 0), 0),
      accuracy: mean(attempts.map(a => a.score)),
      daysWithActivity: Object.keys(byDay(attempts)).length,
      activeDays: st.activeDays,
      streak: st.current,
      bestStreak: st.best
    };
  }

  /* Series temporales: 'day' (últimos 30 días), 'week' (12 semanas), 'month' (12 meses), 'year'. */
  function series(attempts, unit, count, today) {
    today = today || localDay(Date.now());
    const keyOf = day => {
      if (unit === 'day') return day;
      if (unit === 'month') return day.slice(0, 7);
      if (unit === 'year') return day.slice(0, 4);
      // semana: lunes de esa semana
      const [y, m, d] = day.split('-').map(Number);
      const dt = new Date(y, m - 1, d, 12); const wd = (dt.getDay() + 6) % 7;
      return addDays(day, -wd);
    };
    const keys = [];
    let k = today;
    for (let i = 0; i < count; i++) {
      const kk = keyOf(k);
      if (!keys.includes(kk)) keys.unshift(kk);
      if (unit === 'day') k = addDays(k, -1);
      else if (unit === 'week') k = addDays(keyOf(k), -7);
      else if (unit === 'month') { const [y, m] = k.split('-').map(Number); k = localDay(new Date(y, m - 2, 15).getTime()); }
      else k = (Number(k.slice(0, 4)) - 1) + '-06-15';
    }
    const agg = {};
    keys.forEach(x => { agg[x] = { key: x, n: 0, ms: 0, score: 0 }; });
    for (const a of attempts) { const x = agg[keyOf(a.day)]; if (x) { x.n++; x.ms += a.ms || 0; x.score += a.score; } }
    return keys.map(x => ({ key: x, n: agg[x].n, minutes: Math.round(agg[x].ms / 6000) / 10, accuracy: agg[x].n ? agg[x].score / agg[x].n : null }));
  }

  function groupBy(attempts, field) {
    const g = {};
    for (const a of attempts) {
      const k = a[field] || '—';
      const r = g[k] || (g[k] = { key: k, n: 0, score: 0, ms: 0, items: new Set(), days: new Set() });
      r.n++; r.score += a.score; r.ms += a.ms || 0; if (a.item) r.items.add(a.item); r.days.add(a.day);
    }
    return Object.values(g).map(r => ({ key: r.key, n: r.n, accuracy: r.score / r.n, minutes: Math.round(r.ms / 600) / 100, items: r.items.size, days: r.days.size })).sort((a, b) => b.n - a.n);
  }

  /* Retención diferida: aciertos en intentos hechos ≥1 día después del primer contacto con el elemento. */
  function retention(attempts) {
    const first = {};
    const sorted = attempts.slice().sort((a, b) => a.ts - b.ts);
    const delayed = [];
    for (const a of sorted) {
      if (!a.item) continue;
      if (first[a.item] == null) first[a.item] = a.ts;
      else if (a.ts - first[a.item] >= DAY) delayed.push(a.score);
    }
    return { n: delayed.length, rate: delayed.length ? mean(delayed) : null };
  }

  function english(attempts, cards) {
    const en = attempts.filter(a => a.module === 'english');
    const items = new Set(en.filter(a => a.item && a.item.startsWith('en:')).map(a => a.item));
    const words = new Set();
    en.forEach(a => { if (a.meta && a.meta.slot && a.score >= 0.7) words.add(a.meta.slot.toLowerCase()); });
    const cs = Object.entries(cards || {}).filter(([k]) => k.startsWith('en:'));
    return {
      studied: items.size,
      mastered: cs.filter(([, c]) => (c.lvl || 0) >= 4).length,
      building: cs.filter(([, c]) => (c.lvl || 0) >= 3).length,
      vocabulary: words.size,
      original: en.filter(a => a.skill === 'con' && a.meta && a.meta.free && a.score >= 0.7).length,
      combos: en.filter(a => a.meta && a.meta.combo && a.score >= 0.7).length,
      oral: en.filter(a => a.skill === 'spk').length,
      written: en.filter(a => a.skill === 'wri' || a.skill === 'rec' || a.skill === 'bld').length,
      conversations: new Set(en.filter(a => a.meta && a.meta.dialog && a.meta.complete).map(a => a.meta.run)).size,
      retention: retention(en)
    };
  }

  function records(attempts) {
    const r = { maxRecalled: null, bestAccuracy: null, bestTime: null, longestSequence: null, mostStructures: null, mostOriginal: null };
    const better = (cur, val, a, lower) => (!cur || (lower ? val < cur.value : val > cur.value)) ? { value: val, ts: a.ts, module: a.module, item: a.item } : cur;
    const perSession = {};
    for (const a of attempts) {
      if (a.correct != null && a.total) {
        r.maxRecalled = better(r.maxRecalled, a.correct, a);
        if (a.total >= 5) r.bestAccuracy = better(r.bestAccuracy, Math.round(a.correct / a.total * 1000) / 10, a);
        if (a.meta && a.meta.sequence) r.longestSequence = better(r.longestSequence, a.correct, a);
        if (a.ms && a.correct === a.total && a.total >= 5) r.bestTime = better(r.bestTime, a.ms, a, true);
      }
      if (a.module === 'english' && a.meta && a.meta.session) {
        const s = perSession[a.meta.session] || (perSession[a.meta.session] = { items: new Set(), orig: 0, a });
        if (a.item) s.items.add(a.item);
        if (a.meta.free && a.score >= 0.7) s.orig++;
      }
    }
    Object.values(perSession).forEach(s => {
      r.mostStructures = better(r.mostStructures, s.items.size, s.a);
      if (s.orig) r.mostOriginal = better(r.mostOriginal, s.orig, s.a);
    });
    return r;
  }

  /* Objetivos: se evalúan sobre la actividad real del día o de la semana. */
  function goalProgress(goal, attempts, today, extra) {
    today = today || localDay(Date.now());
    let from = today;
    if (goal.period === 'week') {
      const [y, m, d] = today.split('-').map(Number);
      from = addDays(today, -((new Date(y, m - 1, d, 12).getDay() + 6) % 7));
    }
    const sel = attempts.filter(a => a.day >= from && a.day <= today && (!goal.module || a.module === goal.module));
    let value = 0;
    if (goal.type === 'minutes') value = Math.round(sel.reduce((s, a) => s + (a.ms || 0), 0) / 60000);
    else if (goal.type === 'exercises') value = sel.length;
    else if (goal.type === 'structures') value = new Set(sel.filter(a => a.item && a.item.startsWith('en:')).map(a => a.item)).size;
    else if (goal.type === 'accuracy') value = sel.length ? Math.round(mean(sel.map(a => a.score)) * 100) : 0;
    else if (goal.type === 'reviews') value = extra && extra.dueNow === 0 && sel.some(a => a.meta && a.meta.review) ? goal.target : (extra ? Math.max(0, goal.target - extra.dueNow) : 0);
    return { value, target: goal.target, done: value >= goal.target, from };
  }

  const ACHIEVEMENTS = [
    { id: 'first', name: 'Primer paso', desc: 'Completa tu primer ejercicio.', test: c => c.s.exercises >= 1 },
    { id: 'ex100', name: 'Cien repeticiones', desc: '100 ejercicios realizados.', test: c => c.s.exercises >= 100 },
    { id: 'ex1000', name: 'Mil repeticiones', desc: '1.000 ejercicios realizados.', test: c => c.s.exercises >= 1000 },
    { id: 'streak3', name: 'Constancia', desc: 'Racha de 3 días.', test: c => c.s.bestStreak >= 3 },
    { id: 'streak7', name: 'Una semana entera', desc: 'Racha de 7 días.', test: c => c.s.bestStreak >= 7 },
    { id: 'streak30', name: 'Hábito', desc: 'Racha de 30 días.', test: c => c.s.bestStreak >= 30 },
    { id: 'hour', name: 'Primera hora', desc: '60 minutos de entrenamiento acumulado.', test: c => c.s.totalMs >= 3600000 },
    { id: 'en10', name: '10 estructuras', desc: 'Estudia 10 estructuras de inglés.', test: c => c.en.studied >= 10 },
    { id: 'en50', name: '50 estructuras', desc: 'Estudia 50 estructuras de inglés.', test: c => c.en.studied >= 50 },
    { id: 'enm10', name: 'Dominio real', desc: '10 estructuras en nivel «Lo usas» o más.', test: c => c.en.mastered >= 10 },
    { id: 'orig25', name: 'Voz propia', desc: '25 oraciones originales correctas.', test: c => c.en.original >= 25 },
    { id: 'conv5', name: 'Conversador', desc: 'Completa 5 conversaciones simuladas.', test: c => c.en.conversations >= 5 },
    { id: 'rec10', name: 'Diez de memoria', desc: 'Recuerda 10 elementos en un solo ejercicio.', test: c => c.rec.maxRecalled && c.rec.maxRecalled.value >= 10 },
    { id: 'rec20', name: 'Veinte de memoria', desc: 'Recuerda 20 elementos en un solo ejercicio.', test: c => c.rec.maxRecalled && c.rec.maxRecalled.value >= 20 },
    { id: 'rec50', name: 'Cincuenta', desc: 'Recuerda 50 elementos en un solo ejercicio.', test: c => c.rec.maxRecalled && c.rec.maxRecalled.value >= 50 },
    { id: 'digits20', name: '20 dígitos', desc: 'Recuerda 20 dígitos en orden sin errores.', test: c => c.digits >= 20 },
    { id: 'digits50', name: '50 dígitos', desc: 'Recuerda 50 dígitos en orden sin errores.', test: c => c.digits >= 50 },
    { id: 'retain', name: 'Retención', desc: '20 aciertos en repasos diferidos (≥1 día).', test: c => c.ret.n >= 20 && c.ret.rate >= 0.8 },
    { id: 'palace', name: 'Arquitecto', desc: 'Usa un palacio de memoria en un desafío.', test: c => c.techs.has('palace') },
    { id: 'combo3', name: 'Combinador', desc: 'Usa 3 técnicas distintas en un solo desafío.', test: c => c.maxTechCombo >= 3 }
  ];

  function context(attempts, cards, opts) {
    const s = summary(attempts, opts);
    const techs = new Set();
    let maxTechCombo = 0, digits = 0;
    for (const a of attempts) {
      if (a.technique) a.technique.split('+').forEach(t => techs.add(t));
      if (a.technique) maxTechCombo = Math.max(maxTechCombo, a.technique.split('+').length);
      if (a.module === 'numbers' && a.total && a.correct === a.total) digits = Math.max(digits, a.total);
    }
    return { s, en: english(attempts, cards), rec: records(attempts), ret: retention(attempts), techs, maxTechCombo, digits };
  }
  function achievements(attempts, cards, opts) {
    const c = context(attempts, cards, opts);
    return ACHIEVEMENTS.map(a => ({ id: a.id, name: a.name, desc: a.desc, done: !!a.test(c) }));
  }

  /* Dominio: ≥85 % de precisión en ≥3 sesiones de días distintos, con al menos una evaluación diferida. */
  function mastery(attemptsOfItem, opts) {
    opts = Object.assign({ threshold: 0.85, days: 3 }, opts || {});
    const xs = attemptsOfItem.slice().sort((a, b) => a.ts - b.ts);
    if (!xs.length) return { mastered: false, accuracy: 0, days: 0, delayed: false };
    const recent = xs.slice(-20);
    const days = new Set(recent.map(a => a.day));
    const acc = mean(recent.map(a => a.score));
    const delayed = xs.some(a => a.ts - xs[0].ts >= DAY && a.score >= opts.threshold);
    return { mastered: acc >= opts.threshold && days.size >= opts.days && delayed, accuracy: acc, days: days.size, delayed };
  }

  return { localDay, addDays, byDay, validDays, streaks, summary, series, groupBy, retention, english, records, goalProgress, achievements, mastery, ACHIEVEMENTS };
});
