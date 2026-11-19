/* MEMORY LAB — validador de la biblioteca de inglés.
   Uso: node tools/validate.js           (sale con código 1 si hay errores)
   Comprueba: ids únicos, categorías y etapas válidas, molde con un hueco, banco de sustitución
   coherente, ejemplos sin duplicados, bloques bien formados, referencias (req/rel/uses) existentes. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load() {
  const root = path.join(__dirname, '..', 'public');
  const ctx = { console, module: undefined };
  ctx.globalThis = ctx; ctx.window = undefined;
  vm.createContext(ctx);
  const run = f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  run('js/english-core.js');
  const dir = path.join(root, 'data', 'english');
  run('data/english/categories.js');
  fs.readdirSync(dir).filter(f => /^p\d+.*\.js$/.test(f)).sort().forEach(f => run('data/english/' + f));
  ['dialogues.js', 'combos.js'].forEach(f => { if (fs.existsSync(path.join(dir, f))) run('data/english/' + f); });
  return ctx.SEM;
}

function validate(SEM) {
  const errors = [], warnings = [];
  const E = (id, m) => errors.push(id + ': ' + m);
  const W = (id, m) => warnings.push(id + ': ' + m);
  SEM.issues.forEach(i => errors.push(i));
  const cats = new Set(SEM.CATS.map(c => c.id));
  const allEx = new Map();
  for (const p of SEM.patterns) {
    if (!/^[a-z0-9-]+$/.test(p.id)) E(p.id, 'id con formato inválido');
    if (!cats.has(p.cat)) E(p.id, 'categoría desconocida ' + p.cat);
    if (!(p.st >= 1 && p.st <= 6)) E(p.id, 'etapa fuera de rango');
    if (!SEM.REGISTERS[p.reg]) E(p.id, 'registro desconocido ' + p.reg);
    if (!p.f || !p.m) E(p.id, 'faltan f o m');
    const holes = (p.f.match(/___/g) || []).length;
    if (holes > 1) E(p.id, 'el molde tiene más de un hueco');
    if (holes === 1 && !(p.sl && p.sl.length >= 3)) E(p.id, 'molde con hueco pero banco de sustitución < 3');
    if (holes === 1 && p.es && !p.es.includes('[___]')) E(p.id, 'molde español sin [___]');
    if (holes === 0 && p.sl && p.sl.length) W(p.id, 'banco de sustitución sin hueco en el molde');
    const seenSl = new Set();
    (p.sl || []).forEach(s => {
      if (!Array.isArray(s) || s.length !== 2 || !s[0] || !s[1]) E(p.id, 'elemento de banco inválido ' + JSON.stringify(s));
      const k = SEM.norm(s[0]);
      if (seenSl.has(k)) E(p.id, 'sustitución duplicada «' + s[0] + '»'); seenSl.add(k);
    });
    if (!p.ex || p.ex.length < 3) E(p.id, 'menos de 3 ejemplos');
    (p.ex || []).forEach(e => {
      if (!e[0] || !e[1]) E(p.id, 'ejemplo incompleto');
      const opens = (e[0].match(/\[/g) || []).length, closes = (e[0].match(/\]/g) || []).length;
      if (opens !== closes) E(p.id, 'corchetes desbalanceados en «' + e[0] + '»');
      if (/\[[a-z]:/.test(e[0])) E(p.id, 'rol en minúscula en «' + e[0] + '»');
      (e[0].match(/\[([A-Z]):/g) || []).forEach(r => { if (!SEM.ROLES[r[1]]) E(p.id, 'rol desconocido ' + r); });
      const k = SEM.norm(e[0]);
      if (allEx.has(k) && allEx.get(k) !== p.id) W(p.id, 'ejemplo repetido en ' + allEx.get(k) + ': «' + SEM.plain(e[0]) + '»');
      allEx.set(k, p.id);
    });
    (p.bad || []).forEach(b => { if (b.length !== 3) E(p.id, 'error típico debe tener [incorrecto, correcto, por qué]'); });
    (p.req || []).concat(p.rel || []).forEach(r => { if (!SEM.byId[r]) E(p.id, 'referencia inexistente «' + r + '»'); });
    (p.req || []).forEach(r => { const q = SEM.byId[r]; if (q && q.st > p.st) W(p.id, 'requiere «' + r + '» de etapa superior (' + q.st + ' > ' + p.st + ')'); });
    if (p.dlg) p.dlg.forEach(l => { if (l.length !== 3 || !['A', 'B'].includes(l[0])) E(p.id, 'línea de diálogo inválida'); });
  }
  for (const d of SEM.dialogues) {
    (d.uses || []).forEach(u => { if (!SEM.byId[u]) E('diálogo ' + d.id, 'usa estructura inexistente «' + u + '»'); });
    if (!d.lines || d.lines.length < 4) E('diálogo ' + d.id, 'menos de 4 líneas');
    if (!d.lines.some(l => l[0] === d.you)) E('diálogo ' + d.id, 'el usuario no tiene turnos');
  }
  SEM.combos.forEach((c, i) => {
    (c.uses || []).forEach(u => { if (!SEM.byId[u]) E('combo ' + (c.id || i), 'usa estructura inexistente «' + u + '»'); });
    if (!c.es || !c.en || !c.en.length) E('combo ' + (c.id || i), 'faltan es/en');
  });
  return { errors, warnings };
}

if (require.main === module) {
  const SEM = load();
  const { errors, warnings } = validate(SEM);
  const byStage = {}; SEM.patterns.forEach(p => { byStage[p.st] = (byStage[p.st] || 0) + 1; });
  const byCat = {}; SEM.patterns.forEach(p => { byCat[p.cat] = (byCat[p.cat] || 0) + 1; });
  const sentences = SEM.patterns.reduce((n, p) => n + p.ex.length + (p.sl || []).length, 0);
  console.log('Estructuras: ' + SEM.patterns.length + ' · Diálogos: ' + SEM.dialogues.length + ' · Combinaciones: ' + SEM.combos.length + ' · Oraciones modelo: ' + sentences);
  console.log('Por etapa: ' + JSON.stringify(byStage));
  const empty = SEM.CATS.filter(c => !byCat[c.id]).map(c => c.id);
  if (empty.length) warnings.push('Categorías vacías: ' + empty.join(', '));
  warnings.forEach(w => console.log('AVISO  ' + w));
  errors.forEach(e => console.log('ERROR  ' + e));
  console.log(errors.length ? errors.length + ' errores' : 'Sin errores');
  process.exit(errors.length ? 1 : 0);
}
module.exports = { load, validate };
