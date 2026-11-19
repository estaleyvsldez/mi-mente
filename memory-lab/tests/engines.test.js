/* Pruebas de los motores: repaso espaciado, estadísticas/rachas, estrategias, inglés y biblioteca. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const SRS = require('../public/js/srs.js');
const Stats = require('../public/js/stats.js');
const Strategy = require('../public/js/strategy.js');
const { load, validate } = require('../tools/validate.js');
const DAY = 86400000;

test('FSRS: aciertos alargan el intervalo, fallos lo acortan', () => {
  const t0 = Date.UTC(2026, 0, 1);
  let c = SRS.review(null, 3, t0);
  assert.ok(c.S > 0 && c.D >= 1 && c.D <= 10);
  const i1 = (c.due - t0) / DAY;
  c = SRS.review(c, 3, c.due);
  const i2 = (c.due - c.last) / DAY;
  assert.ok(i2 > i1, 'segundo intervalo mayor que el primero');
  const before = c.S;
  const f = SRS.review(c, 1, c.due);
  assert.ok(f.S < before, 'un fallo reduce la estabilidad');
  assert.strictEqual(f.lapses, 1);
  assert.ok(f.due - f.last <= 15 * 60000, 'tras un fallo vuelve en minutos');
  // repasar el mismo día no infla la estabilidad como un repaso espaciado
  const s1 = SRS.review(null, 3, t0);
  const same = SRS.review(s1, 3, t0 + 3600000);
  const spaced = SRS.review(s1, 3, t0 + 3 * DAY);
  assert.ok(spaced.S > same.S);
  assert.strictEqual(SRS.gradeFrom(0.3), 1);
  assert.strictEqual(SRS.gradeFrom(0.7), 2);
  assert.strictEqual(SRS.gradeFrom(0.9), 3);
  assert.strictEqual(SRS.gradeFrom(1, 1000, 4000), 4);
});

const mk = (day, n, ms, score) => Array.from({ length: n }, (_, i) => ({ id: day + i, ts: Date.parse(day + 'T12:00:00') + i, day, module: 'words', score: score == null ? 1 : score, ms: ms || 10000, meta: { session: 's-' + day } }));

test('Rachas: varios ejercicios el mismo día = 1 día; mínimo configurable; descanso permitido', () => {
  const at = [...mk('2026-03-01', 6), ...mk('2026-03-01', 6), ...mk('2026-03-02', 5), ...mk('2026-03-03', 2), ...mk('2026-03-04', 5), ...mk('2026-03-05', 5)];
  const st = Stats.streaks(at, { minExercises: 5, restPerWeek: 0 }, '2026-03-05');
  assert.strictEqual(st.activeDays, 4, 'el día 3 no llega al mínimo');
  assert.strictEqual(st.current, 2, 'sin descansos, el día 3 rompe la racha');
  assert.strictEqual(st.best, 2);
  const st2 = Stats.streaks(at, { minExercises: 5, restPerWeek: 1 }, '2026-03-05');
  assert.strictEqual(st2.current, 4, 'con 1 descanso semanal la racha continúa (sin sumar el día de descanso)');
  // hoy todavía sin practicar no rompe la racha
  const st3 = Stats.streaks(at, { minExercises: 5, restPerWeek: 0 }, '2026-03-06');
  assert.strictEqual(st3.current, 2);
  const st4 = Stats.streaks(at, { minExercises: 5, restPerWeek: 0 }, '2026-03-08');
  assert.strictEqual(st4.current, 0, 'dos días sin actividad rompen la racha');
});

test('Estadísticas coinciden exactamente con el historial', () => {
  const at = [...mk('2026-03-01', 4, 30000, 1), ...mk('2026-03-02', 6, 60000, 0.5)];
  const s = Stats.summary(at, { rule: { minExercises: 5 }, today: '2026-03-02' });
  assert.strictEqual(s.exercises, 10);
  assert.strictEqual(s.totalMs, 4 * 30000 + 6 * 60000);
  assert.strictEqual(s.sessions, 2);
  assert.ok(Math.abs(s.accuracy - (4 * 1 + 6 * 0.5) / 10) < 1e-9);
  const ser = Stats.series(at, 'day', 3, '2026-03-02');
  assert.deepStrictEqual(ser.map(x => x.n), [0, 4, 6]);
  const wk = Stats.series(at, 'week', 2, '2026-03-02');
  assert.strictEqual(wk.reduce((a, x) => a + x.n, 0), 10);
  const g = Stats.goalProgress({ type: 'exercises', period: 'day', target: 5 }, at, '2026-03-02');
  assert.strictEqual(g.value, 6); assert.ok(g.done);
  const gw = Stats.goalProgress({ type: 'minutes', period: 'week', target: 5 }, at, '2026-03-02');
  assert.strictEqual(gw.value, Math.round((6 * 60000) / 60000), 'la semana empieza el lunes 2 de marzo');
});

test('Récords y retención diferida', () => {
  const at = [
    { id: 'a', ts: 1e12 + 0, day: '2026-01-01', module: 'words', item: 'w', score: 1, total: 10, correct: 10, ms: 30000, meta: {} },
    { id: 'b', ts: 1e12 + 1000, day: '2026-01-01', module: 'numbers', item: 'n', score: 0.5, total: 20, correct: 12, ms: 1000, meta: { sequence: true } },
    { id: 'c', ts: 1e12 + 2 * DAY, day: '2026-01-03', module: 'words', item: 'w', score: 0.8, ms: 1000, meta: {} }
  ];
  const r = Stats.records(at);
  assert.strictEqual(r.maxRecalled.value, 12);
  assert.strictEqual(r.longestSequence.value, 12);
  assert.strictEqual(r.bestAccuracy.value, 100);
  const ret = Stats.retention(at);
  assert.strictEqual(ret.n, 1); assert.strictEqual(ret.rate, 0.8);
});

test('Dominio exige 85 %, varios días y evaluación diferida', () => {
  const one = mk('2026-03-01', 5, 1000, 1);
  assert.strictEqual(Stats.mastery(one).mastered, false, 'un solo día no basta');
  const multi = [...mk('2026-03-01', 3, 1000, 1), ...mk('2026-03-02', 3, 1000, 0.9), ...mk('2026-03-04', 3, 1000, 0.95)];
  assert.strictEqual(Stats.mastery(multi).mastered, true);
  const weak = [...mk('2026-03-01', 3, 1000, 0.6), ...mk('2026-03-02', 3, 1000, 0.7), ...mk('2026-03-04', 3, 1000, 0.8)];
  assert.strictEqual(Stats.mastery(weak).mastered, false);
});

test('Motor de estrategias: combinaciones por tipo y sustitución por técnicas dominadas', () => {
  const r = Strategy.recommend({ type: 'numbers', count: 50, ordered: true, retention: 'meses' }, []);
  const ids = r.plan.map(p => p.id);
  ['chunking', 'major', 'pao', 'palace'].forEach(t => assert.ok(ids.includes(t), t));
  assert.ok(ids.includes('spaced'), 'retención larga añade repaso espaciado');
  const r2 = Strategy.recommend({ type: 'list', count: 12, ordered: true }, ['story', 'chunking', 'image-chain', 'free-recall', 'rhyme-num']);
  const peg = r2.plan.find(p => p.instead === 'peg');
  assert.ok(peg && r2.plan.some(p => p.status === 'dominada'), 'sustituye peg por una técnica dominada');
  const conc = Strategy.recommend({ type: 'concepts' }, []);
  assert.ok(conc.plan.some(p => p.id === 'feynman'));
  const perf = { visualize: { n: 5, accuracy: 0.4 } };
  const img = Strategy.recommend({ type: 'images' }, [], perf);
  assert.ok(img.plan.find(p => p.id === 'visualize').note, 'avisa si la técnica rinde mal');
});

test('Diagnóstico: no cambia por un error aislado y detecta patrones', () => {
  assert.strictEqual(Strategy.diagnose([{ score: 0 }]).problem, null);
  const order = Array.from({ length: 4 }, () => ({ score: 0.6, meta: { itemsOk: 0.95, orderOk: 0.4 } }));
  assert.strictEqual(Strategy.diagnose(order).problem.id, 'order');
  const forget = [{ score: 0.95, meta: {} }, { score: 0.9, meta: {} }, { score: 0.4, meta: { delayed: true } }];
  assert.strictEqual(Strategy.diagnose(forget).problem.id, 'forget');
  const overload = [{ score: 0.9, total: 5 }, { score: 0.95, total: 5 }, { score: 0.3, total: 20 }, { score: 0.4, total: 20 }];
  const d = Strategy.diagnose(overload);
  assert.strictEqual(d.problem.id, 'overload'); assert.ok(d.problem.adjust.count > 5 && d.problem.adjust.count < 20);
});

test('Inglés: normalización, contracciones y verificación de respuestas', () => {
  const SEM = load();
  assert.strictEqual(SEM.check("I'm looking for my keys.", ['I am looking for my keys']).grade, 'ok');
  assert.strictEqual(SEM.check("i dont know how to drive", ["I don't know how to drive."]).grade, 'ok');
  assert.strictEqual(SEM.check('I wanna go home', ['I want to go home.']).grade, 'ok');
  assert.strictEqual(SEM.check('I want go home', ['I want to go home.']).grade, 'almost', 'falta palabra menor');
  assert.strictEqual(SEM.check('I want that you come', ['I want you to come.']).grade, 'no');
  assert.strictEqual(SEM.check('I have 30 years', ["I'm 30."]).grade, 'no');
  const d = SEM.wordDiff('I want go home', 'I want to go home');
  assert.ok(d.some(x => x.k === 'miss' && x.w === 'to'));
  // bloques: el molde con hueco genera oraciones
  const p = SEM.byId['i-want-to'];
  assert.strictEqual(SEM.plain(SEM.fill(p.f, 'eat')), 'I want to eat.');
  const segs = SEM.colorSegments("I don't [V:know] [Q:where] he is.");
  assert.ok(segs.some(s => s.c === 'NEG' && /don't/.test(s.t)), 'la negación se colorea aparte');
  assert.ok(SEM.chunks(p.ex[0][0]).length >= 2, 'se fragmenta en bloques');
  assert.ok(SEM.usesPattern('I want to buy a new car', p));
});

test('Biblioteca de inglés: válida, amplia y sin duplicados', () => {
  const SEM = load();
  const { errors } = validate(SEM);
  assert.deepStrictEqual(errors, []);
  assert.ok(SEM.patterns.length >= 250, 'al menos 250 estructuras');
  const cats = new Set(SEM.patterns.map(p => p.cat));
  SEM.CATS.forEach(c => assert.ok(cats.has(c.id), 'categoría con contenido: ' + c.id));
  for (let st = 1; st <= 6; st++) assert.ok(SEM.patterns.some(p => p.st === st), 'etapa ' + st + ' con contenido');
  ['i-want-to', 'i-need-to', 'i-have-to', 'going-to', 'looking-for', 'do-you-have', 'dont-know-how', 'what-think-about'].forEach(id => assert.ok(SEM.byId[id], 'estructura pedida: ' + id));
  const regs = new Set(SEM.patterns.map(p => p.reg));
  ['informal', 'neutro', 'formal', 'coloquial'].forEach(r => assert.ok(regs.has(r), 'registro ' + r));
  // cada molde con hueco genera al menos 3 oraciones sustituibles distintas
  SEM.patterns.filter(p => /___/.test(p.f)).forEach(p => assert.ok(new Set(SEM.generated(p).map(g => g.m)).size >= 3, p.id));
  assert.ok(SEM.dialogues.length >= 15 && SEM.combos.length >= 30);
});
