/* MEMORY LAB — MEMORY ATHLETE TRAINING: Major System, PAO, Peg, palacios de la memoria y grandes desafíos. */
(function () {
  'use strict';
  const { h, toast, pct } = UI;
  const A = window.Athlete = {};
  const pad = n => String(n).padStart(2, '0');

  /* ---------- Major ---------- */
  A.majorWord = n => { const d = Store.get('major', pad(n)); return (d && d.word) || SEM.MAJOR[pad(n)]; };
  const MAJOR_MAP = { s: 0, z: 0, t: 1, d: 1, n: 2, 'ñ': 2, m: 3, r: 4, l: 5, ch: 6, j: 6, ll: 6, k: 7, q: 7, c: 7, g: 7, f: 8, v: 8, p: 9, b: 9 };
  /* Decodifica una palabra española a dígitos con el código Major (aproximación fonética). */
  A.majorDecode = function (word) {
    let w = SEM.norm(word).replace(/\s+/g, '').replace(/h/g, '').replace(/qu/g, 'k').replace(/c([ei])/g, 's$1').replace(/g([ei])/g, 'j$1').replace(/rr/g, 'r').replace(/x/g, 'ks');
    let out = '';
    for (let i = 0; i < w.length; i++) {
      const two = w.slice(i, i + 2);
      if (two === 'ch' || two === 'll') { out += '6'; i++; continue; }
      if (MAJOR_MAP[w[i]] != null) { if (out.length && w[i] === w[i - 1]) continue; out += MAJOR_MAP[w[i]]; }
    }
    return out;
  };
  A.viewMajor = function (root) {
    root.append(h('h1', null, 'Major System'), h('p', { class: 'muted' }, 'Cada dígito es un sonido consonante. Las vocales (y h, w, y) no cuentan. Construye tu lista 00-99 y practica hasta que la imagen salga sin pensar.'),
      h('div', { class: 'card' }, h('div', { class: 'grid g4' }, Object.entries(SEM.MAJOR_CODE).map(([d, s]) => h('div', { class: 'stat' }, h('b', null, d), h('span', null, s))))));
    const grid = h('div', { class: 'grid g4' });
    for (let n = 0; n < 100; n++) {
      const inp = h('input', { type: 'text', value: A.majorWord(n), 'aria-label': 'Palabra para ' + pad(n) });
      const warn = h('span', { class: 'small' });
      const chk = () => { const d = A.majorDecode(inp.value); warn.textContent = d === pad(n) || d === String(n) ? '✓' : '⚠ codifica ' + (d || '—'); warn.style.color = d === pad(n) || d === String(n) ? 'var(--good)' : 'var(--warn)'; };
      inp.addEventListener('change', () => { Store.put('major', pad(n), { word: inp.value.trim() }); chk(); });
      chk();
      grid.append(h('div', { class: 'card tight' }, h('b', { class: 'mono' }, pad(n)), inp, warn));
    }
    root.append(h('div', { class: 'card' }, h('h2', null, 'Practicar'), h('div', { class: 'row' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => App.start({ title: 'Major: número → palabra', module: 'major', items: [{ type: 'major-drill', dir: 'n2w', count: 10 }], back: '#/athlete/major' }) }, 'Número → palabra'),
      h('button', { class: 'btn', type: 'button', onclick: () => App.start({ title: 'Major: palabra → número', module: 'major', items: [{ type: 'major-drill', dir: 'w2n', count: 10 }], back: '#/athlete/major' }) }, 'Palabra → número'),
      h('button', { class: 'btn', type: 'button', onclick: () => App.start({ title: 'Números con Major', module: 'numbers', items: [MEM.fill({ type: 'mem', module: 'numbers', kind: 'digits', count: 12, mode: 'slow', technique: 'major+chunking', guided: true, fixed: true })], back: '#/athlete/major' }) }, 'Memorizar 12 dígitos con Major'))),
      h('h2', null, 'Tu lista 00-99'), h('p', { class: 'small muted' }, 'Sugerencias editables. Se guarda al salir de cada campo. ⚠ indica que la palabra no codifica exactamente ese número.'), grid);
  };
  Ex.types['major-drill'] = {
    label: 'Major System · recuperación rápida',
    render(el, it, done) {
      const nums = SEM.shuffle(Array.from({ length: 100 }, (_, i) => i)).slice(0, it.count);
      let k = 0, ok = 0; const t0 = performance.now();
      const ask = () => {
        el.innerHTML = '';
        if (k >= nums.length) return done({ module: 'major', technique: 'major', item: 'major:' + it.dir, skill: 'recall', score: ok / nums.length, ms: performance.now() - t0, total: nums.length, correct: ok });
        const n = nums[k];
        const q = it.dir === 'n2w' ? pad(n) : A.majorWord(n);
        const ans = it.dir === 'n2w' ? [A.majorWord(n)] : [pad(n), String(n)];
        el.append(h('div', { class: 'small muted' }, (k + 1) + ' / ' + nums.length), h('div', { class: 'digits', style: { fontSize: '2.4rem' } }, q),
          Ex.answerBox({ answers: ans, voice: false, autoplay: false, placeholder: it.dir === 'n2w' ? 'Tu imagen para este número' : '¿Qué número es?', onResult: r => { if (r.score >= 0.8) ok++; k++; ask(); } }));
      };
      ask();
    }
  };

  /* ---------- PAO ---------- */
  A.pao = n => Object.assign({ p: '', a: '', o: '' }, Store.get('pao', pad(n)) || {});
  A.viewPAO = function (root) {
    const filled = Array.from({ length: 100 }, (_, i) => A.pao(i)).filter(x => x.p && x.a && x.o).length;
    root.append(h('h1', null, 'Sistema PAO'), h('p', { class: 'muted' }, 'Cada número 00-99 = Persona + Acción + Objeto. Seis dígitos forman UNA escena: la persona del primer par, la acción del segundo y el objeto del tercero. Construye tu sistema poco a poco (empieza por 00-19).'),
      h('div', { class: 'card' }, h('b', null, filled + ' / 100 completos'), h('div', { class: 'bar' }, h('i', { style: { width: filled + '%' } })),
        h('div', { class: 'row', style: { marginTop: '8px' } }, h('button', { class: 'btn primary', type: 'button', disabled: filled < 10, onclick: () => App.start({ title: 'PAO: codificar 6 dígitos', module: 'pao', items: [{ type: 'pao-drill', count: 5 }], back: '#/athlete/pao' }) }, 'Practicar codificación (requiere ≥10)'))));
    const grid = h('div', { class: 'table-wrap' });
    const tbl = h('table', null, h('tr', null, h('th', null, '#'), h('th', null, 'Persona'), h('th', null, 'Acción'), h('th', null, 'Objeto')));
    for (let n = 0; n < 100; n++) {
      const v = A.pao(n);
      const cell = k => { const i = h('input', { type: 'text', value: v[k], 'aria-label': pad(n) + ' ' + k, placeholder: k === 'p' ? 'p. ej. ' + (A.majorWord(n) || '') : '' }); i.addEventListener('change', () => { const cur = A.pao(n); cur[k] = i.value.trim(); Store.put('pao', pad(n), cur); }); return h('td', null, i); };
      tbl.append(h('tr', null, h('td', { class: 'mono' }, pad(n)), cell('p'), cell('a'), cell('o')));
    }
    grid.append(tbl); root.append(grid);
  };
  Ex.types['pao-drill'] = {
    label: 'PAO · codifica y recupera',
    render(el, it, done) {
      const ready = Array.from({ length: 100 }, (_, i) => i).filter(i => { const x = A.pao(i); return x.p && x.a && x.o; });
      const seqs = Array.from({ length: it.count }, () => [SEM.pick(ready), SEM.pick(ready), SEM.pick(ready)]);
      let k = 0, ok = 0; const t0 = performance.now();
      const ask = () => {
        el.innerHTML = '';
        if (k >= seqs.length) return done({ module: 'pao', technique: 'pao', item: 'pao:encode', skill: 'encode', score: ok / seqs.length, ms: performance.now() - t0, total: seqs.length, correct: ok });
        const [a, b, c] = seqs[k];
        const digits = pad(a) + pad(b) + pad(c);
        el.append(h('div', { class: 'digits', style: { fontSize: '2.4rem' } }, digits.match(/../g).join(' ')),
          Ex.answerBox({ answers: [A.pao(a).p + ' ' + A.pao(b).a + ' ' + A.pao(c).o], voice: false, autoplay: false, placeholder: 'Persona + acción + objeto', modelEl: () => h('b', null, A.pao(a).p + ' · ' + A.pao(b).a + ' · ' + A.pao(c).o), onResult: r => { if (r.score >= 0.7) ok++; k++; ask(); } }));
      };
      ask();
    }
  };

  /* ---------- Peg ---------- */
  A.pegWord = i => { const d = Store.get('peg', String(i + 1)); return (d && d.word) || SEM.PEGS[i % SEM.PEGS.length]; };
  A.viewPeg = function (root) {
    root.append(h('h1', null, 'Sistema de anclajes (Peg)'), h('p', { class: 'muted' }, 'Anclajes fijos por posición. Apréndelos una vez; después cuelga cualquier lista en ellos y podrás saltar directamente a cualquier posición.'));
    const grid = h('div', { class: 'grid g4' });
    for (let i = 0; i < 20; i++) {
      const inp = h('input', { type: 'text', value: A.pegWord(i), 'aria-label': 'Anclaje ' + (i + 1) });
      inp.addEventListener('change', () => Store.put('peg', String(i + 1), { word: inp.value.trim() }));
      grid.append(h('div', { class: 'card tight' }, h('b', null, i + 1), inp));
    }
    root.append(grid, h('div', { class: 'row', style: { marginTop: '12px' } },
      h('button', { class: 'btn primary', type: 'button', onclick: () => App.start({ title: 'Lista con anclajes', module: 'words', items: [MEM.fill({ type: 'mem', module: 'words', kind: 'peg', count: 10, mode: 'slow', technique: 'peg', guided: true, fixed: true })], back: '#/athlete/peg' }) }, 'Practicar con 10 elementos')));
  };

  /* ---------- Palacios de la memoria ---------- */
  const TEMPLATES = {
    casa: ['puerta de entrada', 'recibidor', 'perchero', 'sofá', 'televisor', 'mesa del comedor', 'cocina', 'nevera', 'fregadero', 'baño', 'espejo', 'ducha', 'pasillo', 'dormitorio', 'cama', 'armario', 'ventana', 'escritorio', 'balcón', 'garaje'],
    escuela: ['portón', 'patio', 'conserjería', 'escaleras', 'pasillo', 'aula', 'pizarra', 'mesa del profesor', 'tu pupitre', 'ventana del aula', 'biblioteca', 'cafetería', 'gimnasio', 'baños', 'cancha'],
    oficina: ['entrada', 'recepción', 'ascensor', 'pasillo', 'tu escritorio', 'computadora', 'impresora', 'sala de reuniones', 'cocina', 'cafetera', 'baño', 'oficina del jefe', 'archivo', 'ventana', 'salida'],
    calle: ['tu puerta', 'esquina', 'semáforo', 'parada de autobús', 'panadería', 'farmacia', 'banco', 'parque', 'fuente', 'iglesia', 'supermercado', 'gasolinera', 'puente', 'estación', 'plaza'],
    habitación: ['puerta', 'interruptor', 'esquina izquierda', 'estantería', 'cama', 'almohada', 'mesita de noche', 'lámpara', 'ventana', 'cortina', 'armario', 'espejo', 'escritorio', 'silla', 'alfombra']
  };
  A.palaces = () => Store.list('palaces').filter(p => p.loci && p.loci.length).sort((a, b) => (a.created || 0) - (b.created || 0));
  A.viewPalaces = function (root) {
    const list = A.palaces();
    root.append(h('h1', null, 'Palacios de la memoria'), h('p', { class: 'muted' }, 'Crea recorridos con lugares en orden. Se guardan permanentemente con su historial de uso. Cuando domines 1 imagen por lugar, prueba 2 o 3.'));
    const name = h('input', { type: 'text', placeholder: 'Nombre (p. ej. «Casa de mis padres»)' });
    const tpl = h('select', null, Object.keys(TEMPLATES).map(k => h('option', { value: k }, 'Plantilla: ' + k)).concat([h('option', { value: '' }, 'En blanco (recorrido imaginario)')]));
    const loci = h('textarea', { placeholder: 'Un lugar por línea, en el orden del recorrido…' });
    tpl.addEventListener('change', () => { loci.value = (TEMPLATES[tpl.value] || []).join('\n'); });
    loci.value = TEMPLATES.casa.join('\n');
    root.append(h('div', { class: 'card' }, h('h2', null, 'Nuevo palacio'), h('div', { class: 'grid g2' }, name, tpl), h('label', { class: 'f' }, 'Lugares (edítalos para que sean TUS lugares reales):'), loci,
      h('button', { class: 'btn primary', type: 'button', style: { marginTop: '8px' }, onclick: () => {
        const L = loci.value.split('\n').map(s => s.trim()).filter(Boolean);
        if (!name.value.trim() || L.length < 3) return toast('Pon un nombre y al menos 3 lugares', 'bad');
        const id = 'p' + Date.now().toString(36);
        Store.put('palaces', id, { name: name.value.trim(), type: tpl.value || 'imaginario', loci: L, created: Date.now(), uses: [], perLocus: 1 });
        toast('Palacio guardado'); App.route();
      } }, 'Guardar palacio')));
    list.forEach(p => {
      const uses = p.uses || [];
      const last = uses[uses.length - 1];
      root.append(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h3', { style: { margin: 0 } }, '🏛️ ' + p.name), h('span', { class: 'tag' }, p.loci.length + ' lugares · capacidad ' + p.loci.length * (p.perLocus || 1))),
        h('p', { class: 'small muted' }, 'Recorrido: ' + p.loci.join(' → ')),
        h('p', { class: 'small muted' }, uses.length + ' usos' + (last ? ' · último ' + UI.dateStr(last.ts) + ' (' + pct(last.score) + ')' : '') + (last && Date.now() - last.ts < 86400000 ? ' · ⚠ usado hace menos de 24 h: puede haber interferencias' : '')),
        h('div', { class: 'row' },
          h('label', { class: 'small' }, 'Elementos por lugar: '), (() => { const s = h('select', { 'aria-label': 'Elementos por lugar' }, [1, 2, 3].map(n => h('option', { value: n, selected: (p.perLocus || 1) === n }, n))); s.addEventListener('change', () => Store.put('palaces', p._id, Object.assign({}, p, { perLocus: Number(s.value) }))); return s; })(),
          h('button', { class: 'btn primary small', type: 'button', onclick: () => App.start({ title: 'Palacio: ' + p.name, module: 'words', items: [A.palaceItem(p._id, Math.min(p.loci.length * (p.perLocus || 1), 10 * (p.perLocus || 1)))], back: '#/athlete/palaces' }) }, 'Usar con palabras'),
          h('button', { class: 'btn small', type: 'button', onclick: () => App.start({ title: 'Palacio + Major', module: 'numbers', items: [A.palaceItem(p._id, Math.min(p.loci.length, 10) * 2 * (p.perLocus || 1), 'digits')], back: '#/athlete/palaces' }) }, 'Usar con dígitos'),
          UI.confirmBtn('Borrar', '¿Seguro? Pulsa otra vez', () => { Store.del('palaces', p._id); App.route(); }))));
    });
  };
  A.palaceItem = function (pid, count, what, extra) {
    const p = Store.get('palaces', pid);
    const per = (extra && extra.perLocus) || (p && p.perLocus) || 1;
    const it = { type: 'mem', module: what === 'digits' ? 'numbers' : 'words', kind: 'palace', count, mode: 'slow', technique: what === 'digits' ? 'palace+major+chunking' : 'palace+visual-assoc', palace: pid, perLocus: per, what: what || 'words', fixed: true };
    it.data = what === 'digits' ? MEM.digits(count).match(/../g) : MEM.items(count);
    return Object.assign(it, extra || {});
  };
  A.studyPalace = function (el, it, mode, next, timed) {
    const p = Store.get('palaces', it.palace) || { loci: SEM.PEGS, name: 'Recorrido temporal' };
    const per = it.perLocus || 1;
    const rows = [];
    for (let i = 0; i < it.data.length; i += per) {
      const locus = p.loci[(i / per) % p.loci.length];
      const group = it.data.slice(i, i + per);
      const label = group.map(x => it.what === 'digits' ? x + ' = ' + A.majorWord(Number(x)) : x.e + ' ' + x.es).join(' + ');
      const assoc = h('input', { type: 'text', placeholder: 'Tu imagen (opcional): p. ej. «un plátano gigante bloquea la puerta»', 'aria-label': 'Asociación para ' + locus });
      rows.push({ locus, label, assoc });
    }
    const content = h('ol', { class: 'list' }, rows.map(r => h('li', null, h('span', { class: 'tag acc' }, '📍 ' + r.locus), ' ← ', h('b', null, r.label), it.guided || mode === MEM.MODES.slow ? r.assoc : null)));
    timed(el, it, mode, h('div', null, h('p', { class: 'small muted' }, 'Camina mentalmente por «' + p.name + '». Deja en cada lugar una imagen exagerada que interactúe con él.'), content), ms => {
      rows.forEach((r, i) => { if (r.assoc.value.trim()) Store.put('assoc', it.palace + '-' + Date.now().toString(36) + '-' + i, { kind: 'palace', palace: it.palace, locus: r.locus, item: r.label, text: r.assoc.value.trim(), t: Date.now() }); });
      next(ms);
    }, Math.max(20, Math.round(it.data.length * Math.max(mode.perItem, 6))));
  };
  A.recallPalace = function (el, it, cb, freeList) {
    const p = Store.get('palaces', it.palace) || { loci: SEM.PEGS };
    const per = it.perLocus || 1;
    const nLoci = Math.ceil(it.data.length / per);
    const inputs = [];
    const form = h('ol', { class: 'list' });
    for (let i = 0; i < nLoci; i++) { const inp = h('input', { type: 'text', 'aria-label': 'Lugar ' + (i + 1), placeholder: per > 1 ? per + ' elementos separados por comas' : '¿Qué había aquí?' }); inputs.push(inp); form.append(h('li', null, h('span', { class: 'tag acc' }, '📍 ' + p.loci[i % p.loci.length]), inp)); }
    el.append(h('div', { class: 'prompt' }, 'Recorre el palacio y escribe lo que dejaste en cada lugar.'), form, h('button', { class: 'btn primary', type: 'button', onclick: e => { if (e.currentTarget.disabled) return; e.currentTarget.disabled = true;
      let ok = 0, placed = 0, intr = 0;
      const all = it.data.map(x => SEM.norm(it.what === 'digits' ? x : x.es));
      inputs.forEach((inp, i) => {
        const want = it.data.slice(i * per, i * per + per).map(x => SEM.norm(it.what === 'digits' ? x : x.es));
        inp.value.split(',').map(s => SEM.norm(s)).filter(Boolean).forEach(g => {
          const g2 = g.replace(/^(el|la|los|las|un|una) /, '');
          if (want.some(w => w === g2 || (w.length > 4 && SEM.lev(w, g2) <= 1))) { ok++; placed++; }
          else if (all.includes(g2)) ok++; else intr++;
        });
      });
      const total = it.data.length;
      const k2 = it.what === 'digits' ? 2 : 1;
      const res = { total: total * k2, correct: ok * k2, itemsOk: ok / total, orderOk: placed / total, intrusions: intr, score: (ok / total + placed / total) / 2, detail: 'Elementos: ' + ok + '/' + total + ' · en su lugar correcto: ' + placed + '/' + total };
      const pal = Store.get('palaces', it.palace);
      if (pal) Store.put('palaces', it.palace, Object.assign({}, pal, { uses: (pal.uses || []).concat([{ ts: Date.now(), count: total, score: res.score, perLocus: per }]).slice(-200) }));
      res.review = h('div', { class: 'small' }, p.loci.slice(0, nLoci).map((l, i) => h('div', null, '📍 ' + l + ': ', it.data.slice(i * per, i * per + per).map(x => it.what === 'digits' ? x : x.es).join(', '))));
      cb(res);
    } }, 'Comprobar'));
  };

  /* ---------- grandes desafíos ---------- */
  A.LADDERS = {
    words: { n: 'Palabras', steps: [5, 10, 20, 50, 100, 250, 500, 1000, 1500], kind: 'words', module: 'words', tech: 'palace+visual-assoc+story' },
    digits: { n: 'Números', steps: [5, 10, 20, 50, 100, 200, 300], kind: 'digits', module: 'numbers', tech: 'chunking+major+palace' },
    images: { n: 'Imágenes', steps: [5, 10, 20, 30, 50], kind: 'images', module: 'visual', tech: 'scenes+visualize' },
    cards: { n: 'Cartas', steps: [5, 10, 13, 26, 52], kind: 'cards', module: 'cards', tech: 'chunking+pao+palace' },
    faces: { n: 'Rostros y nombres', steps: [3, 5, 8, 12, 20], kind: 'faces', module: 'faces', tech: 'visual-assoc+exaggerate' },
    dates: { n: 'Fechas', steps: [3, 5, 10, 20], kind: 'dates', module: 'numbers', tech: 'num-images+major' },
    sequence: { n: 'Secuencias', steps: [5, 8, 12, 16, 24], kind: 'sequence', module: 'sequence', tech: 'chunking+image-chain' },
    mixed: { n: 'Datos mixtos', steps: [4, 6, 8, 12], kind: 'multimodal', module: 'multimodal', tech: 'scenes+chunking+major+sentence-build' }
  };
  /* Estado de cada paso: inmediato (≥90 %) y diferido (≥80 % a 20 h+). Dominado = ambos. */
  A.stepState = function (lad, n) {
    const L = A.LADDERS[lad];
    const imm = Store.attempts(a => a.meta && a.meta.ladder === lad && a.total === n && !a.meta.delayed);
    const del = Store.list('delayed').filter(d => d.item && d.item.ladder === lad && d.item.count === n && d.done);
    const bestImm = Math.max(0, ...imm.map(a => a.score));
    const bestDel = Math.max(0, ...del.map(d => d.delayedScore || 0));
    return { tried: imm.length, bestImm, bestDel, immediate: bestImm >= 0.9, retained: bestDel >= 0.8, mastered: bestImm >= 0.9 && bestDel >= 0.8, L };
  };
  A.viewChallenges = function (root) {
    root.append(h('h1', null, 'Desafíos de gran cantidad'), h('p', { class: 'muted' }, 'Cada paso exige ≥90 % al momento y ≥80 % en la recuperación diferida (al día siguiente) para considerarse dominado. Para pasar al siguiente basta el resultado inmediato, pero la retención queda registrada aparte: memorizar un momento no es lo mismo que conservar.'));
    const pal = A.palaces();
    const palSel = h('select', null, h('option', { value: '' }, 'Sin palacio'), pal.map(p => h('option', { value: p._id }, '🏛️ ' + p.name + ' (' + p.loci.length * (p.perLocus || 1) + ')')));
    root.append(h('div', { class: 'card tight' }, h('label', { class: 'f' }, 'Palacio para listas de palabras y dígitos:'), palSel));
    Object.entries(A.LADDERS).forEach(([key, L]) => {
      const card = h('div', { class: 'card' }, h('h3', null, L.n), h('p', { class: 'small muted' }, 'Combinación sugerida: ' + L.tech.split('+').map(t => (SEM.techById[t] || { n: t }).n).join(' + ')));
      const row = h('div', { class: 'grid g4' });
      let prevOk = true;
      L.steps.forEach(n => {
        const s = A.stepState(key, n);
        const open = prevOk;
        row.append(h('div', { class: 'card tight' }, h('b', null, n), ' ', s.mastered ? h('span', { class: 'tag good' }, 'dominado') : s.immediate ? h('span', { class: 'tag warn' }, 'falta retención') : s.tried ? h('span', { class: 'tag' }, pct(s.bestImm)) : null,
          h('div', null, h('button', { class: 'btn small' + (open ? ' primary' : ''), type: 'button', disabled: !open, onclick: () => {
            let it;
            if ((key === 'words' || key === 'digits') && palSel.value && n > 10) it = A.palaceItem(palSel.value, n, key === 'digits' ? 'digits' : 'words', { perLocus: Math.max(1, Math.ceil((key === 'digits' ? n / 2 : n) / Store.get('palaces', palSel.value).loci.length)) });
            else it = MEM.fill({ type: 'mem', module: L.module, kind: L.kind, count: n, mode: n >= 50 ? 'slow' : 'normal', technique: L.tech, ordered: key === 'words', fixed: true });
            it.ladder = key; it.count = n; it.label = L.n + ' · ' + n;
            App.start({ title: 'Desafío ' + L.n + ' ' + n, module: L.module, items: [it], back: '#/athlete/challenges', ladder: key });
          } }, open ? 'Intentar' : '🔒'))));
        prevOk = s.immediate;
      });
      card.append(row); root.append(card);
    });
  };

  A.viewHome = function (root) {
    root.append(h('h1', null, 'Memory Athlete Training'), h('p', { class: 'muted' }, 'Sistemas de los atletas de memoria. Requieren práctica sostenida: construye primero tus sistemas, después úsalos en desafíos.'),
      h('div', { class: 'grid g2' },
        [['#/athlete/palaces', '🏛️ Palacios de la memoria', A.palaces().length + ' palacios guardados.'],
          ['#/athlete/major', '🔢 Major System', Array.from({ length: 100 }, (_, i) => Store.get('major', pad(i))).filter(Boolean).length + ' palabras personalizadas.'],
          ['#/athlete/pao', '🎭 Sistema PAO', Array.from({ length: 100 }, (_, i) => A.pao(i)).filter(x => x.p && x.a && x.o).length + ' / 100 completos.'],
          ['#/athlete/peg', '📌 Anclajes (Peg)', '20 anclajes de posición.'],
          ['#/athlete/challenges', '🏔️ Desafíos de gran cantidad', 'Palabras hasta 1.500, dígitos hasta 300, cartas, rostros, fechas, secuencias y datos mixtos.']]
          .map(([href, t, d]) => h('a', { class: 'card', href, style: { textDecoration: 'none', color: 'inherit' } }, h('h3', null, t), h('p', { class: 'muted small' }, d)))));
  };
})();
