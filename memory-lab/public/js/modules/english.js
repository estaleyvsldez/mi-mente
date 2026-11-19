/* MEMORY LAB — STRUCTURAL ENGLISH MEMORY */
(function () {
  'use strict';
  const { h, toast, pct } = UI;
  const EN = window.EN = {};
  const DAY = 86400000;

  /* ---------- estado y dominio ---------- */
  EN.card = pid => Store.get('srs', 'en:' + pid);
  EN.state = () => Object.assign({ unlocked: 1, exams: {}, learned: {} }, Store.get('english', 'state') || {});
  EN.saveState = s => Store.put('english', 'state', s);
  EN.level = pid => { const c = EN.card(pid); return c ? c.lvl || 0 : 0; };
  EN.seen = pid => !!EN.card(pid);
  EN.patterns = () => SEM.patterns.filter(p => !p.hidden);

  function computeLevel(c) {
    if (!c || !c.n) return 0;
    const g = k => (c.sk[k] == null ? 0 : c.sk[k]);
    const days = (c.days || []).length;
    let l = 1;
    if (g('rec') >= 0.7) l = 2;
    if (l >= 2 && g('bld') >= 0.85 && g('rec') >= 0.85 && c.reps >= 2 && days >= 2) l = 3;
    if (l >= 3 && g('con') >= 0.85 && Math.max(g('spk'), g('wri')) >= 0.85 && c.S >= 7 && days >= 3) l = 4;
    if (l >= 4 && g('spd') >= 0.85 && ['rec', 'bld', 'con'].every(k => g(k) >= 0.85) && c.S >= 21 && days >= 5) l = 5;
    return l;
  }
  /* Nota una habilidad tras cada ejercicio (media móvil: lo reciente pesa más). */
  EN.note = function (pid, skill, score, ms) {
    const c = Object.assign({ sk: {}, n: 0, days: [], reps: 0, lapses: 0, lvl: 0 }, EN.card(pid) || {});
    c.sk = Object.assign({}, c.sk);
    c.sk[skill] = c.sk[skill] == null ? score : c.sk[skill] * 0.6 + score * 0.4;
    c.n++;
    const d = Stats.localDay(Date.now());
    c.days = (c.days || []).filter(x => x !== d).concat([d]).slice(-60);
    if (!c.first) c.first = Date.now();
    c.lvl = computeLevel(c);
    Store.put('srs', 'en:' + pid, c);
    return c;
  };
  /* Programa el próximo repaso (FSRS) con la media de la sesión para ese patrón. */
  EN.schedule = function (pid, mean, avgMs) {
    const c0 = EN.card(pid) || { sk: {}, n: 0, days: [] };
    const grade = SRS.gradeFrom(mean, avgMs, 4000);
    const c = Object.assign({}, c0, SRS.review(c0.S ? c0 : null, grade, Date.now()));
    c.sk = c0.sk; c.n = c0.n; c.days = c0.days; c.first = c0.first || Date.now();
    c.lvl = computeLevel(c);
    Store.put('srs', 'en:' + pid, c);
    return c;
  };
  EN.colorMode = pid => { const l = EN.level(pid); return l <= 1 ? 'full' : l === 2 ? 'light' : 'off'; };

  EN.stageStats = function (n) {
    const ps = EN.patterns().filter(p => p.st === n);
    const lv = ps.map(p => EN.level(p.id));
    const c = x => lv.filter(l => l >= x).length;
    return { total: ps.length, seen: c(1), recall: c(2), build: c(3), use: c(4), auto: c(5), ratio: ps.length ? c(3) / ps.length : 0 };
  };
  EN.unlocked = function () {
    const s = EN.state(); let u = 1;
    for (let n = 1; n < 6; n++) { if (s.exams[n] && s.exams[n].passed) u = n + 1; else break; }
    return Math.max(u, s.unlocked || 1);
  };
  EN.due = function () {
    const now = Date.now();
    return EN.patterns().filter(p => { const c = EN.card(p.id); return c && c.due && c.due <= now; })
      .sort((a, b) => EN.card(a.id).due - EN.card(b.id).due);
  };
  EN.learnedToday = function () {
    const d = Stats.localDay(Date.now());
    return EN.patterns().filter(p => { const c = EN.card(p.id); return c && c.first && Stats.localDay(c.first) === d; }).length;
  };
  /* Siguientes estructuras: etapa desbloqueada, prerrequisitos vistos, categorías intercaladas. */
  EN.nextNew = function (count) {
    const unl = EN.unlocked();
    const order = {}; SEM.CATS.forEach((c, i) => { order[c.id] = i; });
    const ready = EN.patterns().filter(p => p.st <= unl && !EN.seen(p.id) && (p.req || []).every(r => !SEM.byId[r] || EN.seen(r)));
    if (!ready.length) return [];
    const minSt = Math.min(...ready.map(p => p.st));
    const pool = ready.filter(p => p.st === minSt);
    const seenIn = c => EN.patterns().filter(p => p.cat === c && EN.seen(p.id)).length;
    const cats = [...new Set(pool.map(p => p.cat))].sort((a, b) => seenIn(a) - seenIn(b) || order[a] - order[b]);
    const out = [];
    for (let i = 0; out.length < count && i < 200; i++) {
      const c = cats[i % cats.length];
      const p = pool.find(x => x.cat === c && !out.includes(x));
      if (p) out.push(p);
      if (out.length === pool.length) break;
    }
    return out.slice(0, count);
  };
  EN.learned = () => EN.patterns().filter(p => EN.seen(p.id));
  const capital = s => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- material de ejercicio ---------- */
  function sentencesOf(p) {
    const hand = p.ex.map(e => ({ m: e[0], es: e[1], alt: e[2] || [] }));
    const gen = (p.sl || []).length && /___/.test(p.f) ? p.sl.map(([en, es]) => ({ m: SEM.fill(p.f, en), es: capital(SEM.fillEs(p.es, es)), alt: [], slot: en })) : [];
    return { hand, gen, all: hand.concat(gen) };
  }
  const answersOf = (s, key) => [SEM.plain(s.m)].concat(s.alt || []).concat((Ex.accepted[key] || []));
  /* Ejemplos «limpios» (una sola oración y sin barras) son mejores para recuperación desde el español. */
  const recallable = s => !/ \/ |—/.test(SEM.plain(s.m)) && SEM.plain(s.m).split(' ').length <= 16;

  /* ---------- tipos de ejercicio ---------- */
  const T = Ex.types;
  const P = id => SEM.byId[id];
  const done1 = (done, it, skill, score, ms, meta) => done({ module: 'english', technique: it.tech || 'chunking+active-recall', item: 'en:' + it.pid, skill, score, ms, meta });
  /* En evaluaciones de nivel, una estructura nunca estudiada solo entra en el repaso si se acierta (≥85 %). */
  const after = (it, r) => { if (!r || !r.skill) return; if (it.exam && !EN.seen(it.pid)) { if (r.score >= 0.85) { markSeen(it.pid); EN.note(it.pid, r.skill, r.score, r.ms); } return; } EN.note(it.pid, r.skill, r.score, r.ms); };

  T['en-present'] = {
    label: 'Nueva estructura · asociación visual y por colores',
    render(el, it, done) {
      const p = P(it.pid);
      const sx = sentencesOf(p);
      el.append(
        h('div', { class: 'hero' }, h('div', { style: { fontSize: '3rem' } }, p.img), h('div', null, h('h2', null, p.t), h('div', { class: 'muted' }, p.m),
          h('div', null, h('span', { class: 'tag acc' }, SEM.STAGES[p.st - 1].name), h('span', { class: 'tag' }, SEM.REGISTERS[p.reg].name), h('span', { class: 'tag' }, (SEM.catById[p.cat] || {}).name)))),
        (window.Route && Route.tipFor(p)) ? (t => h('div', { class: 'notice trick-tip' }, h('b', null, '🧠 Truco de memoria · ' + t.name + ': '), t.text))(Route.tipFor(p)) : null,
        h('h3', null, 'El molde'), h('div', null, Ex.blocks(p.f, 'full')), h('div', { class: 'muted small' }, p.es),
        h('div', { style: { margin: '8px 0' } }, Ex.legend()),
        h('p', { class: 'small muted' }, 'Fragmentación: la parte amarilla es fija y nunca cambia. El hueco cambia. Toca una palabra del banco para construir una oración nueva:'));
      if (sx.gen.length) {
        const out = h('div', { class: 'card tight' }, h('span', { class: 'muted small' }, 'Toca una palabra ↓'));
        const chips = h('div', { class: 'chips' }, p.sl.map(([en, es], i) => h('button', { class: 'blk O', type: 'button', onclick: () => { out.innerHTML = ''; out.append(Ex.blocks(sx.gen[i].m, 'full'), h('div', { class: 'muted small' }, sx.gen[i].es)); Voice.speak(SEM.plain(sx.gen[i].m)); } }, en)));
        el.append(chips, out);
      }
      el.append(h('h3', null, 'Ejemplos naturales'), h('ul', { class: 'list' }, sx.hand.map(s => h('li', null, Ex.blocks(s.m, 'full'), h('div', { class: 'muted small' }, s.es)))));
      if (p.n) el.append(h('div', { class: 'notice' }, h('b', null, 'Uso: '), p.n));
      if (p.bad.length) el.append(h('h3', null, 'Errores típicos (calcos del español)'), h('ul', { class: 'list' }, p.bad.map(b => h('li', null, h('span', { style: { color: 'var(--bad)', textDecoration: 'line-through' } }, b[0]), ' → ', h('b', { style: { color: 'var(--good)' } }, b[1]), h('div', { class: 'muted small' }, b[2])))));
      if (p.alt.length) el.append(h('h3', null, 'Otras formas naturales'), h('ul', { class: 'list' }, p.alt.map(a => h('li', null, Ex.blocks(a[0], 'full', { speak: false }), h('div', { class: 'muted small' }, a[1])))));
      if (p.odd) el.append(h('div', { class: 'notice warn' }, h('b', null, 'Cuándo puede sonar raro: '), p.odd));
      el.append(h('div', { class: 'row', style: { marginTop: '12px' } }, h('button', { class: 'btn primary', type: 'button', onclick: () => { if (!it.preview) markSeen(it.pid); done(null); } }, 'Empezar práctica →')));
      if (Voice.canSpeak && !it.preview) Voice.speak(SEM.plain(sx.hand[0].m));
    }
  };
  function markSeen(pid) { const c = Object.assign({ sk: {}, n: 0, days: [], reps: 0, lapses: 0 }, EN.card(pid) || {}); c.first = c.first || Date.now(); c.lvl = Math.max(1, c.lvl || 0); if (!c.days.length) c.days = [Stats.localDay(Date.now())]; Store.put('srs', 'en:' + pid, c); }

  T['en-cloze'] = {
    label: 'Recuperación activa · completa el bloque que falta',
    render(el, it, done) {
      const p = P(it.pid);
      const s = it.s;
      const segs = SEM.parse(s.m).filter(x => x.t.trim() && !/^[.,!?]+$/.test(x.t.trim()));
      // prioriza ocultar la estructura fija (lo que se quiere memorizar)
      const target = segs.find(x => x.r === 'F' && x.t.trim().split(' ').length >= 2) || segs[0];
      const hidden = target.t.trim();
      const shown = s.m.replace(target.r === 'F' ? target.t : '[' + target.r + ':' + target.t + ']', target.r === 'F' ? ' [F:___] ' : '[' + target.r + ':___]');
      el.append(h('div', { class: 'prompt' }, s.es), Ex.blocks(shown, EN.colorMode(it.pid), { speak: false }),
        Ex.answerBox({ answers: [hidden], key: 'cloze:' + it.pid + ':' + hidden, placeholder: 'Escribe el bloque que falta', voice: false, autoplay: false, modelEl: () => Ex.blocks(s.m, 'full'),
          onResult: r => done1(done, it, 'rec', r.score, r.ms) }));
    }, after
  };

  T['en-order'] = {
    label: 'Reconstrucción · ordena los bloques',
    render(el, it, done) {
      const s = it.s, fine = it.fine;
      const target = SEM.chunks(s.m, fine);
      let pool = SEM.shuffle(target.map((c, i) => Object.assign({ i }, c)));
      if (pool.every((c, k) => c.i === k) && pool.length > 1) pool.reverse();
      const picked = [];
      const t0 = performance.now();
      const mode = EN.colorMode(it.pid);
      const line = h('div', { class: 'chips colors-' + mode, 'aria-label': 'Tu oración' });
      const bank = h('div', { class: 'chips colors-' + mode });
      const fb = h('div', { class: 'feedback' });
      const draw = () => {
        line.innerHTML = ''; bank.innerHTML = '';
        picked.forEach((c, k) => line.appendChild(h('button', { class: 'blk ' + (c.c || 'F'), type: 'button', onclick: () => { picked.splice(k, 1); draw(); } }, c.t)));
        pool.forEach(c => bank.appendChild(h('button', { class: 'blk ' + (c.c || 'F') + (picked.includes(c) ? ' used' : ''), type: 'button', onclick: () => { picked.push(c); draw(); if (picked.length === pool.length) check(); } }, c.t)));
      };
      const check = () => {
        const given = picked.map(c => c.t).join(' ');
        const ok = SEM.norm(given) === SEM.norm(SEM.plain(s.m));
        const score = ok ? 1 : Math.max(0, 1 - SEM.lev(SEM.norm(given).split(' '), SEM.norm(SEM.plain(s.m)).split(' ')) / target.length) * 0.6;
        bank.remove();
        fb.append(h('div', { class: 'notice ' + (ok ? 'good' : 'bad') }, h('b', null, ok ? '✓ Orden correcto' : '✗ El orden natural es:'), h('div', null, Ex.blocks(s.m, 'full'))),
          h('button', { class: 'btn primary', type: 'button', onclick: () => done1(done, it, 'bld', score, performance.now() - t0, { reconstruct: true }) }, 'Continuar →'));
        Voice.speak(SEM.plain(s.m));
      };
      el.append(h('div', { class: 'prompt' }, s.es), h('div', { class: 'muted small' }, 'Toca los bloques en orden. Toca uno ya colocado para quitarlo.'), line, bank, fb);
      draw();
    }, after
  };

  T['en-subst'] = {
    label: 'Sustitución · construye una oración nueva con el molde',
    render(el, it, done) {
      const p = P(it.pid);
      const s = it.s;
      el.append(h('div', { class: 'muted small' }, 'Molde:'), Ex.blocks(p.f, EN.colorMode(it.pid), { speak: false }),
        h('div', { class: 'prompt' }, s.es),
        Ex.answerBox({ answers: answersOf(s, 'sub:' + it.pid + ':' + s.slot), key: 'sub:' + it.pid + ':' + s.slot, hint: it.slow ? 'Ejercicio lento: piensa en el molde, sustituye el bloque y escribe la oración completa.' : null, modelEl: () => Ex.blocks(s.m, 'full'),
          onResult: r => done1(done, it, 'bld', r.score, r.ms, { slot: s.slot, slow: !!it.slow }) }));
    }, after
  };

  T['en-recall'] = {
    label: 'Recuperación activa · del español al inglés, sin mirar',
    render(el, it, done) {
      const s = it.s;
      el.append(h('div', { class: 'prompt' }, s.es), it.cue ? h('div', { class: 'muted small' }, 'Pista: empieza por «' + SEM.plain(s.m).split(' ').slice(0, 2).join(' ') + '…»') : null,
        Ex.answerBox({ answers: answersOf(s, 'rec:' + SEM.norm(s.m)), key: 'rec:' + SEM.norm(s.m), modelEl: () => Ex.blocks(s.m, 'full'),
          onResult: r => done1(done, it, it.skill || 'rec', it.cue ? r.score * 0.85 : r.score, r.ms, { cued: !!it.cue, review: !!it.review }) }));
    }, after
  };

  T['en-quick'] = {
    label: 'Ejercicio rápido · elige la versión natural (6 s)',
    render(el, it, done) {
      const s = it.s, secs = it.secs || 6;
      const opts = SEM.shuffle([{ t: SEM.plain(s.m), ok: true }].concat(it.wrong.map(w => ({ t: w, ok: false }))));
      const t0 = performance.now(); let answered = false;
      const fb = h('div', { class: 'feedback' });
      const timer = UI.countdown(secs, () => choose(null));
      const btns = opts.map(o => h('button', { class: 'tile', type: 'button', style: { minHeight: '56px' }, onclick: () => choose(o) }, o.t));
      function choose(o) {
        if (answered) return; answered = true; timer.stop();
        const ms = performance.now() - t0;
        btns.forEach((b, i) => { b.disabled = true; if (opts[i].ok) b.classList.add('right'); else if (opts[i] === o) b.classList.add('wrong'); });
        const ok = o && o.ok;
        const score = ok ? (ms < secs * 500 ? 1 : 0.85) : 0;
        fb.append(h('div', { class: 'notice ' + (ok ? 'good' : 'bad') }, ok ? '✓ Correcto (' + (ms / 1000).toFixed(1) + ' s)' : o ? '✗ Esa no es la forma natural.' : '⏱ Se acabó el tiempo.', it.why ? h('div', { class: 'small muted' }, it.why) : null),
          h('button', { class: 'btn primary', type: 'button', onclick: () => done1(done, it, 'spd', score, ms, { recognition: 1 }) }, 'Continuar →'));
        Voice.speak(SEM.plain(s.m));
      }
      el.append(h('div', { class: 'prompt' }, s.es), timer, h('div', { class: 'grid', style: { gap: '8px' } }, btns), fb);
    }, after
  };

  T['en-listen'] = {
    label: 'Escucha y recuperación · escribe lo que oyes',
    render(el, it, done) {
      const s = it.s;
      const play = () => Voice.speak(SEM.plain(s.m));
      el.append(h('div', { class: 'prompt' }, 'Escucha y escribe la oración en inglés.'),
        h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: play }, '🔊 Escuchar'), h('button', { class: 'btn ghost small', type: 'button', onclick: () => Voice.speak(SEM.plain(s.m), null, 0.7) }, '🐢 Más lento')),
        Ex.answerBox({ answers: [SEM.plain(s.m)], key: null, voice: false, modelEl: () => h('span', null, Ex.blocks(s.m, 'full'), h('div', { class: 'muted small' }, s.es)), onResult: r => done1(done, it, 'lis', r.score, r.ms) }));
      setTimeout(play, 300);
    }, after
  };

  T['en-blind'] = {
    label: 'Escritura sin mirar · memoriza y escribe',
    render(el, it, done) {
      const s = it.s, secs = it.secs || 5;
      const box = h('div', { class: 'card tight' }, Ex.blocks(s.m, EN.colorMode(it.pid), { speak: false }), h('div', { class: 'muted small' }, s.es));
      const area = h('div');
      el.append(h('div', { class: 'prompt' }, 'Mira la oración. Desaparecerá.'), UI.countdown(secs, () => {
        box.remove();
        area.append(h('div', { class: 'muted' }, 'Escríbela de memoria:'), Ex.answerBox({ answers: [SEM.plain(s.m)], key: null, voice: false, modelEl: () => Ex.blocks(s.m, 'full'), onResult: r => done1(done, it, 'wri', r.score, r.ms) }));
      }), box, area);
    }, after
  };

  T['en-speak'] = {
    label: 'Respuesta oral · dilo en voz alta',
    render(el, it, done) {
      const s = it.s;
      el.append(h('div', { class: 'prompt' }, s.es));
      if (Voice.canListen) {
        el.append(h('p', { class: 'muted small' }, 'Pulsa «Hablar» y di la oración en inglés. Puedes corregir la transcripción si el reconocimiento se equivoca.'),
          Ex.answerBox({ answers: answersOf(s, 'rec:' + SEM.norm(s.m)), key: 'rec:' + SEM.norm(s.m), placeholder: 'Pulsa 🎙️ Hablar (o escribe si no puedes usar el micrófono)', modelEl: () => Ex.blocks(s.m, 'full'),
            onResult: r => done1(done, it, r.viaVoice ? 'spk' : 'wri', r.score, r.ms, { voice: r.viaVoice }) }));
      } else {
        const reveal = h('div');
        el.append(h('div', { class: 'notice warn small' }, 'Tu navegador no tiene reconocimiento de voz (prueba Chrome o Edge). Dilo en voz alta, después compara y autoevalúate.'),
          h('button', { class: 'btn primary', type: 'button', onclick: e => { e.target.remove(); reveal.append(Ex.blocks(s.m, 'full'), Ex.selfGrade(sc => done1(done, it, 'spk', sc, 0, { self: true }))); Voice.speak(SEM.plain(s.m)); } }, 'Ya lo dije → ver respuesta'), reveal);
      }
    }, after
  };

  T['en-free'] = {
    label: 'Ejercicio lento · producción libre con tu propia vida',
    render(el, it, done) {
      const p = P(it.pid);
      const t0 = performance.now();
      const ta = h('textarea', { placeholder: 'Escribe 1 o 2 oraciones verdaderas sobre ti usando la estructura…', 'aria-label': 'Tu oración' });
      const fb = h('div', { class: 'feedback' });
      const go = h('button', { class: 'btn primary', type: 'button', onclick: async () => {
        const text = ta.value.trim(); if (!text) return ta.focus();
        go.disabled = true;
        const uses = SEM.usesPattern(text, p);
        fb.append(h('div', { class: 'notice ' + (uses ? 'good' : 'warn') }, uses ? '✓ Usas la estructura.' : '⚠ No detecto la estructura «' + p.t + '» en tu oración.'),
          h('div', { class: 'small muted' }, 'Compárala con los ejemplos naturales:'), h('ul', { class: 'list' }, p.ex.slice(0, 3).map(e => h('li', null, Ex.blocks(e[0], 'full')))));
        let aiScore = null;
        if (App.ai().enabled) {
          const aiBox = h('div', { class: 'notice small' }, 'Pidiendo evaluación a la IA…'); fb.append(aiBox);
          try {
            const r = await Store.api('/api/ai', { body: { task: 'evaluate-english', input: { pattern: p.t, sentence: text } } });
            const d = r.data; aiScore = Math.max(0, Math.min(1, Number(d.score) || 0));
            aiBox.innerHTML = ''; aiBox.append(h('b', null, d.correct && d.natural ? '✓ Correcta y natural' : d.correct ? '≈ Correcta, pero poco natural' : '✗ Tiene errores'), h('div', null, 'Versión natural: ', h('b', null, d.fixed), Ex.speakBtn(d.fixed)), h('div', { class: 'muted' }, d.explanation));
          } catch (e) { aiBox.textContent = 'IA no disponible: ' + e.message; }
        }
        fb.append(h('div', { class: 'muted small' }, aiScore != null ? 'La IA puntuó ' + pct(aiScore) + '. Confirma tu valoración:' : '¿Suena natural comparada con los ejemplos?'),
          Ex.selfGrade(sc => { const score = uses ? (aiScore != null ? (sc + aiScore) / 2 : sc) : Math.min(sc, 0.5); SEM.norm(text) && Store.put('mine', 'en-' + Date.now().toString(36), { pid: it.pid, text, score, t: Date.now() }); done1(done, it, 'con', score, performance.now() - t0, { free: true }); }));
      } }, 'Revisar');
      el.append(h('div', { class: 'prompt' }, it.prompt || 'Crea una oración tuya con:'), Ex.blocks(p.f, 'full', { speak: false }), it.context ? h('p', { class: 'muted' }, 'Situación: ' + it.context) : null, ta, h('div', { class: 'row', style: { marginTop: '8px' } }, go), fb);
    }, after
  };

  T['en-dlg'] = {
    label: 'Conversación simulada · tu turno',
    render(el, it, done) {
      const lines = it.lines; const t0 = performance.now();
      const log = h('div');
      el.append(it.situation ? h('p', { class: 'muted' }, it.situation) : null, log);
      let i = 0; const scores = [];
      const nextLine = () => {
        if (i >= lines.length) {
          const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 1;
          return el.append(h('div', { class: 'notice good' }, '✓ Conversación completada'), h('button', { class: 'btn primary', type: 'button', onclick: () => done({ module: 'english', item: it.dialog ? 'dlg:' + it.dialog : 'en:' + it.pid, skill: 'con', score, ms: performance.now() - t0, meta: { dialog: it.dialog || null, complete: true, run: it.run || null } }) }, 'Continuar →'));
        }
        const L = lines[i];
        if (L[0] !== (it.you || 'B')) {
          log.append(h('div', { class: 'dialog-line A' }, L[1], Ex.speakBtn(L[1]), h('div', { class: 'es' }, L[2])));
          Voice.speak(L[1]); i++; setTimeout(nextLine, 200);
        } else {
          const slot = h('div', { class: 'dialog-line B' }, h('div', { class: 'es' }, 'Di en inglés: ', h('b', null, L[2])));
          log.append(slot);
          slot.append(Ex.answerBox({ answers: [L[1]].concat(L[3] || []), key: 'dlg:' + SEM.norm(L[1]), modelEl: () => h('span', null, L[1]), onResult: r => { scores.push(r.score); slot.innerHTML = ''; slot.append(L[1], Ex.speakBtn(L[1]), h('div', { class: 'es' }, r.score >= 0.7 ? '✓ ' + r.text : '✗ Dijiste: ' + r.text)); i++; nextLine(); } }));
        }
      };
      nextLine();
    },
    after(it, r) {
      if (it.pid) EN.note(it.pid, 'con', r.score, r.ms);
      (it.uses || []).forEach(u => { if (EN.seen(u)) EN.note(u, 'con', r.score, r.ms); });
    }
  };

  T['en-combo'] = {
    label: 'Desafío acumulativo · combina estructuras',
    render(el, it, done) {
      const c = it.c;
      const kinds = { pair: 'Dos oraciones conectadas', answer: 'Respuesta completa', follow: 'Responde y haz una pregunta de seguimiento', exchange: 'Intercambio de conversación' };
      el.append(h('div', { class: 'muted small' }, kinds[c.kind] + ' · estructuras: ', c.uses.map(u => h('span', { class: 'tag' }, P(u).t))),
        c.q ? h('div', { class: 'card tight' }, /[a-z]/.test(c.q) && /\?$/.test(c.q) ? h('span', null, h('b', null, c.q), Ex.speakBtn(c.q)) : c.q) : null,
        h('div', { class: 'prompt' }, c.es),
        Ex.answerBox({ answers: c.en, key: 'combo:' + c.id, onResult: r => done({ module: 'english', technique: 'cumulative+generation', item: 'combo:' + c.id, skill: 'con', score: r.score, ms: r.ms, meta: { combo: true, uses: c.uses } }) }));
      if (c.q && /\?$/.test(c.q)) Voice.speak(c.q);
    },
    after(it, r) { it.c.uses.forEach(u => { if (EN.seen(u)) EN.note(u, 'con', r.score, r.ms); }); }
  };

  /* ---------- construcción de sesiones ---------- */
  function wrongOptions(p, s) {
    const w = [];
    (p.bad || []).forEach(b => { if (!/\(/.test(b[0]) && w.length < 1) w.push(b[0].replace(/\s*\(.*\)$/, '')); });
    const others = SEM.shuffle(EN.patterns().filter(q => q.id !== p.id && q.cat === p.cat));
    for (const q of others) { if (w.length >= 2) break; const e = q.ex.find(recallable); if (e) w.push(SEM.plain(e[0])); }
    return w.slice(0, 2);
  }
  function pickFrom(arr, n) { return SEM.shuffle(arr).slice(0, n); }

  /* Ejercicios de un patrón según su nivel actual (de reconocer → producir → velocidad → conversación). */
  function itemsFor(p, n, opts) {
    opts = opts || {};
    const sx = sentencesOf(p);
    const rec = sx.hand.filter(recallable);
    const lvl = EN.level(p.id);
    const card = EN.card(p.id) || { sk: {} };
    const pool = [];
    const s1 = () => SEM.pick(rec.length ? rec : sx.all);
    const sg = () => SEM.pick(sx.gen.length ? sx.gen : sx.all);
    const add = (type, extra) => pool.push(Object.assign({ type, pid: p.id }, extra));
    const weak = Object.entries({ rec: 0, bld: 0, lis: 0, spk: 0, wri: 0, con: 0, spd: 0 }).map(([k]) => [k, card.sk[k] == null ? -1 : card.sk[k]]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
    const byskill = {
      rec: () => add(lvl <= 1 ? 'en-cloze' : 'en-recall', { s: s1(), cue: lvl <= 1, review: opts.review }),
      bld: () => sx.gen.length ? add('en-subst', { s: sg() }) : add('en-order', { s: s1(), fine: lvl >= 2 }),
      lis: () => Voice.canSpeak ? add('en-listen', { s: s1() }) : add('en-recall', { s: s1() }),
      spk: () => add('en-speak', { s: s1() }),
      wri: () => add('en-blind', { s: s1(), secs: lvl >= 3 ? 3 : 5 }),
      con: () => (lvl >= 2 && p.dlg ? add('en-dlg', { lines: p.dlg, you: 'B' }) : add('en-free', {})),
      spd: () => { const s = s1(); const w = wrongOptions(p, s); if (w.length) add('en-quick', { s, wrong: w, secs: lvl >= 3 ? 5 : 7, why: (p.bad[0] || [])[2] }); else add('en-recall', { s }); }
    };
    // Prioriza habilidades débiles, pero sin exigir conversación antes de recordar.
    const order = lvl <= 1 ? ['rec', 'bld', 'wri', 'spd'] : lvl === 2 ? weak.filter(k => k !== 'con').concat(['con']) : weak;
    for (let i = 0; pool.length < n && i < 20; i++) byskill[order[i % order.length]]();
    return pool.slice(0, n);
  }

  EN.learnSession = function (pid) {
    const p = P(pid);
    const sx = sentencesOf(p);
    const rec = sx.hand.filter(recallable);
    const items = [{ type: 'en-present', pid }];
    const ex = rec.length ? rec : sx.all;
    items.push({ type: 'en-cloze', pid, s: ex[0] });
    items.push({ type: 'en-order', pid, s: ex[0] });
    items.push({ type: 'en-order', pid, s: ex[1 % ex.length], fine: true });
    pickFrom(sx.gen, 3).forEach((s, i) => items.push({ type: 'en-subst', pid, s, slow: i === 0 }));
    items.push({ type: 'en-recall', pid, s: ex[2 % ex.length] || ex[0] });
    const w = wrongOptions(p, ex[0]);
    if (w.length) items.push({ type: 'en-quick', pid, s: ex[1 % ex.length], wrong: w, secs: 8, why: (p.bad[0] || [])[2] });
    if (Voice.canSpeak) items.push({ type: 'en-listen', pid, s: SEM.pick(sx.all) });
    items.push({ type: 'en-blind', pid, s: SEM.pick(ex), secs: 6 });
    items.push({ type: 'en-speak', pid, s: SEM.pick(ex) });
    items.push({ type: 'en-free', pid });
    if (p.dlg) items.push({ type: 'en-dlg', pid, lines: p.dlg, you: 'B' });
    // Lo anterior reaparece: las 2 estructuras aprendidas más débiles + una combinación conocida
    const old = EN.learned().filter(q => q.id !== pid).sort((a, b) => (SRS.recallProb(EN.card(a.id)) - SRS.recallProb(EN.card(b.id)))).slice(0, 2);
    old.forEach(q => items.push(...itemsFor(q, 1, { review: true })));
    const combo = SEM.combos.find(c => c.uses.includes(pid) && c.uses.every(u => u === pid || EN.seen(u)));
    if (combo) items.push({ type: 'en-combo', c: combo });
    return { title: 'Aprender: ' + p.t, module: 'english', kind: 'learn', ctx: { pids: [pid] }, items, back: '#/english' };
  };

  EN.reviewSession = function (list, perPattern) {
    const items = [];
    list.forEach(p => items.push(...itemsFor(p, perPattern || 2, { review: true })));
    const known = new Set(list.map(p => p.id));
    const combos = SEM.combos.filter(c => c.uses.every(u => EN.seen(u)) && c.uses.some(u => known.has(u)));
    pickFrom(combos, Math.min(2, Math.ceil(list.length / 4))).forEach(c => items.push({ type: 'en-combo', c }));
    return { title: 'Repaso espaciado', module: 'english', kind: 'review', ctx: { pids: list.map(p => p.id) }, items: SEM.shuffle(items), back: '#/english' };
  };

  /* Al terminar: programar repaso de cada patrón con su media en la sesión. */
  EN.onDone = function (session) {
    const by = {};
    session.results.forEach(r => { if (r.item && r.item.startsWith('en:') && r.skill !== 'intro') (by[r.item.slice(3)] = by[r.item.slice(3)] || []).push(r); });
    const rows = [];
    Object.keys(by).forEach(pid => {
      const xs = by[pid];
      const mean = xs.reduce((s, r) => s + r.score, 0) / xs.length;
      const ms = xs.reduce((s, r) => s + (r.ms || 0), 0) / xs.length;
      if (!EN.seen(pid)) return; // no se programa lo que no se ha estudiado
      const before = EN.level(pid);
      const c = EN.schedule(pid, mean, ms);
      rows.push(h('tr', null, h('td', null, P(pid).t), h('td', null, pct(mean)), h('td', null, SEM.LEVEL_NAMES[before] + ' → ' + SEM.LEVEL_NAMES[c.lvl]), h('td', null, 'en ' + Math.max(0, Math.round((c.due - Date.now()) / DAY)) + ' d')));
    });
    if (!rows.length) return null;
    return h('div', null, h('h3', null, 'Estructuras practicadas'), h('div', { class: 'table-wrap' }, h('table', null, h('tr', null, h('th', null, 'Estructura'), h('th', null, 'Sesión'), h('th', null, 'Nivel'), h('th', null, 'Próximo repaso')), rows)),
      h('p', { class: 'small muted' }, 'El nivel sube solo con evidencias: precisión ≥85 % en varias habilidades, en días distintos y con repasos diferidos.'));
  };
  SEM.LEVEL_NAMES = ['Nuevo', 'Visto', 'Lo recuerdas', 'Lo construyes', 'Lo usas', 'Automático'];

  /* Evaluación de etapa: material de esa etapa, sin colores ni pistas. */
  EN.examSession = function (n) {
    const ps = EN.patterns().filter(p => p.st === n);
    const chosen = pickFrom(ps, 12);
    const items = [];
    chosen.forEach((p, i) => {
      const sx = sentencesOf(p); const rec = sx.hand.filter(recallable);
      const s = SEM.pick(rec.length ? rec : sx.all);
      const k = i % 4;
      if (k === 0) items.push({ type: 'en-recall', pid: p.id, s });
      else if (k === 1 && sx.gen.length) items.push({ type: 'en-subst', pid: p.id, s: SEM.pick(sx.gen) });
      else if (k === 2) items.push({ type: 'en-order', pid: p.id, s, fine: true });
      else items.push(Voice.canSpeak ? { type: 'en-listen', pid: p.id, s } : { type: 'en-recall', pid: p.id, s });
    });
    items.forEach(x => { x.exam = true; });
    SEM.combos.filter(c => c.st === n).slice(0, 3).forEach(c => items.push({ type: 'en-combo', c }));
    return { title: 'Evaluación · ' + SEM.STAGES[n - 1].name, module: 'english', kind: 'exam', ctx: { stage: n }, items: SEM.shuffle(items), back: '#/english',
      onDone: (session, acc) => {
        const st = EN.state();
        const passed = acc >= 0.85;
        const prev = st.exams[n] || { attempts: 0 };
        st.exams[n] = { attempts: prev.attempts + 1, best: Math.max(prev.best || 0, acc), last: acc, passed: prev.passed || passed, ts: Date.now() };
        EN.saveState(st);
        return h('div', { class: 'notice ' + (passed ? 'good' : 'warn') }, passed ? '✓ Etapa superada (' + pct(acc) + '). Se desbloquea la siguiente etapa. Las estructuras de esta etapa siguen apareciendo en el repaso.' : 'Resultado ' + pct(acc) + '. Se necesita un 85 %. Repasa las estructuras más débiles y vuelve a intentarlo otro día.');
      } };
  };

  /* ---------- vistas ---------- */
  EN.viewHome = function (root) {
    const due = EN.due();
    const set = App.settings();
    const fresh = due.length > 40 ? [] : EN.nextNew(Math.max(0, set.newPerDay - EN.learnedToday()));
    const unl = EN.unlocked();
    root.append(h('h1', null, 'Structural English Memory'),
      h('p', { class: 'muted' }, 'Aprende patrones que generan miles de oraciones, no frases sueltas. Cada estructura pasa por colores, bloques, sustitución, recuperación, voz y conversación, y vuelve en el momento justo antes de olvidarla.'));
    const today = h('div', { class: 'card' }, h('h2', null, 'Hoy'));
    if (due.length) today.append(h('div', { class: 'row between' }, h('div', null, h('b', null, due.length + ' estructuras para repasar'), h('div', { class: 'muted small' }, 'Repaso espaciado programado con FSRS.')),
      h('button', { class: 'btn primary', type: 'button', onclick: () => App.start(EN.reviewSession(due.slice(0, set.maxReviews))) }, 'Repasar')));
    else today.append(h('p', { class: 'muted' }, 'No tienes repasos pendientes.'));
    if (due.length > 40) today.append(h('div', { class: 'notice warn small' }, 'Tienes muchos repasos acumulados: hoy no se añaden estructuras nuevas para consolidar primero.'));
    if (fresh.length) today.append(h('h3', null, 'Estructuras nuevas sugeridas'), h('ul', { class: 'list' }, fresh.map(p => h('li', { class: 'row between' }, h('div', null, p.img + ' ', h('b', null, p.t), h('div', { class: 'muted small' }, p.m)), h('button', { class: 'btn small', type: 'button', onclick: () => App.start(EN.learnSession(p.id)) }, 'Aprender')))));
    else if (!due.length) today.append(h('p', { class: 'muted small' }, 'Has alcanzado el límite de estructuras nuevas por hoy (' + set.newPerDay + '). Puedes cambiarlo en Configuración o elegir una en la biblioteca.'));
    root.append(today);

    const stages = h('div', { class: 'card' }, h('h2', null, 'Progresión por etapas'), h('p', { class: 'muted small' }, 'No se avanza por completar lecciones. Para presentarte a la evaluación de una etapa necesitas el 70 % de sus estructuras en nivel «Lo construyes»; para superarla, un 85 %. Si ya sabes inglés, puedes hacer la prueba de nivel directamente.'));
    SEM.STAGES.forEach(s => {
      const st = EN.stageStats(s.n), ex = EN.state().exams[s.n];
      const can = st.ratio >= 0.7;
      stages.append(h('div', { class: 'card tight' },
        h('div', { class: 'row between' }, h('div', null, h('b', null, s.name + (s.n > unl ? ' 🔒' : '')), h('div', { class: 'muted small' }, s.desc)),
          h('div', { class: 'row' }, ex && ex.passed ? h('span', { class: 'tag good' }, 'Superada ' + pct(ex.best)) : null,
            s.n <= unl ? h('button', { class: 'btn small', type: 'button', onclick: () => App.start(EN.examSession(s.n)) }, can ? 'Evaluación' : 'Prueba de nivel') : null)),
        h('div', { class: 'bar', style: { marginTop: '8px' } }, h('i', { style: { width: (st.ratio * 100) + '%' } })),
        h('div', { class: 'small muted' }, st.total + ' estructuras · ' + st.seen + ' vistas · ' + st.recall + ' recuerdas · ' + st.build + ' construyes · ' + st.use + ' usas · ' + st.auto + ' automáticas')));
    });
    root.append(stages);

    root.append(h('div', { class: 'grid g3' },
      h('a', { class: 'card', href: '#/english/lib', style: { textDecoration: 'none', color: 'inherit' } }, h('h3', null, '📚 Biblioteca'), h('p', { class: 'muted small' }, EN.patterns().length + ' estructuras en ' + SEM.CATS.length + ' categorías.')),
      h('a', { class: 'card', href: '#/english/talk', style: { textDecoration: 'none', color: 'inherit' } }, h('h3', null, '💬 Conversaciones'), h('p', { class: 'muted small' }, SEM.dialogues.length + ' situaciones reales y construcción progresiva de conversaciones.')),
      h('a', { class: 'card', href: '#/english/mine', style: { textDecoration: 'none', color: 'inherit' } }, h('h3', null, '✍️ Mis oraciones'), h('p', { class: 'muted small' }, 'Las oraciones originales que has creado.')),
      h('a', { class: 'card', href: '#/english/grow', style: { textDecoration: 'none', color: 'inherit' } }, h('h3', null, '🌱 Ampliar biblioteca'), h('p', { class: 'muted small' }, 'Generación asistida por IA o importación, con revisión antes de usarla.'))));
  };

  EN.viewLibrary = function (root, params) {
    const q = h('input', { type: 'search', placeholder: 'Buscar estructura, ejemplo o etiqueta…', 'aria-label': 'Buscar' });
    const catSel = h('select', { 'aria-label': 'Categoría' }, h('option', { value: '' }, 'Todas las categorías'), SEM.CATS.map(c => h('option', { value: c.id }, c.icon + ' ' + c.name)));
    const stSel = h('select', { 'aria-label': 'Etapa' }, h('option', { value: '' }, 'Todas las etapas'), SEM.STAGES.map(s => h('option', { value: s.n }, s.name)));
    const regSel = h('select', { 'aria-label': 'Registro' }, h('option', { value: '' }, 'Todos los registros'), Object.keys(SEM.REGISTERS).map(k => h('option', { value: k }, SEM.REGISTERS[k].name)));
    const lvlSel = h('select', { 'aria-label': 'Dominio' }, h('option', { value: '' }, 'Cualquier dominio'), SEM.LEVEL_NAMES.map((n, i) => h('option', { value: i }, n)));
    if (params && params.cat) catSel.value = params.cat;
    const list = h('div');
    const draw = () => {
      const t = SEM.norm(q.value);
      const res = EN.patterns().filter(p => (!catSel.value || p.cat === catSel.value) && (!stSel.value || p.st == stSel.value) && (!regSel.value || p.reg === regSel.value) && (lvlSel.value === '' || EN.level(p.id) == lvlSel.value)
        && (!t || SEM.norm(p.t + ' ' + p.m + ' ' + p.tags.join(' ') + ' ' + p.ex.map(e => e[0] + ' ' + e[1]).join(' ')).includes(t)));
      list.innerHTML = '';
      list.append(h('p', { class: 'muted small' }, res.length + ' estructuras'));
      const groups = {};
      res.forEach(p => (groups[p.cat] = groups[p.cat] || []).push(p));
      SEM.CATS.forEach(c => {
        if (!groups[c.id]) return;
        list.append(h('h3', null, c.icon + ' ' + c.name), h('div', { class: 'grid g2' }, groups[c.id].sort((a, b) => a.st - b.st).map(p => h('a', { class: 'card tight', href: '#/english/p/' + p.id, style: { textDecoration: 'none', color: 'inherit' } },
          h('div', { class: 'row between' }, h('b', null, p.img + ' ' + p.t), h('span', { class: 'tag' }, 'E' + p.st)),
          h('div', { class: 'muted small' }, p.m), h('div', null, h('span', { class: 'tag' + (EN.level(p.id) >= 3 ? ' good' : EN.level(p.id) ? ' acc' : '') }, SEM.LEVEL_NAMES[EN.level(p.id)]), h('span', { class: 'tag' }, SEM.REGISTERS[p.reg].name), p.src !== 'core' ? h('span', { class: 'tag warn' }, 'añadida') : null)))));
      });
    };
    [q, catSel, stSel, regSel, lvlSel].forEach(x => x.addEventListener('input', draw));
    root.append(h('h1', null, 'Biblioteca de inglés'), h('div', { class: 'grid g4' }, q, catSel, stSel, regSel, lvlSel), list);
    draw();
  };

  EN.viewPattern = function (root, pid) {
    const p = P(pid);
    if (!p) { root.append(h('p', null, 'Estructura no encontrada.')); return; }
    const c = EN.card(pid);
    root.append(h('a', { href: '#/english/lib', class: 'small' }, '← Biblioteca'));
    const fake = h('div', { class: 'card' });
    T['en-present'].render(fake, { pid, preview: true }, () => App.start(EN.learnSession(pid)));
    const btn = fake.querySelector('.btn.primary'); if (btn) btn.textContent = c ? 'Practicar de nuevo →' : 'Aprender esta estructura →';
    root.append(fake);
    if (c) {
      const sk = c.sk || {};
      root.append(h('div', { class: 'card' }, h('h3', null, 'Tu dominio: ' + SEM.LEVEL_NAMES[c.lvl || 0]), h('p', { class: 'muted small' }, (SEM.LEVELS || [])[c.lvl] ? '' : ''),
        h('div', { class: 'grid g4' }, Object.entries(SEM.SKILLS_ES).map(([k, n]) => h('div', { class: 'stat' }, h('b', null, sk[k] == null ? '—' : pct(sk[k])), h('span', null, n)))),
        h('p', { class: 'small muted' }, 'Próximo repaso: ' + (c.due ? UI.dateStr(c.due) : '—') + ' · Estabilidad: ' + (c.S ? c.S.toFixed(1) + ' días' : '—') + ' · Probabilidad de recordar hoy: ' + pct(SRS.recallProb(c)) + ' · Días practicados: ' + (c.days || []).length)));
    }
    const rel = (p.rel || []).concat(p.req || []).filter(x => SEM.byId[x]);
    if (rel.length) root.append(h('div', { class: 'card' }, h('h3', null, 'Relacionadas'), rel.map(r => h('a', { class: 'tag acc', href: '#/english/p/' + r }, P(r).t))));
  };
  SEM.SKILLS_ES = { rec: 'Recordar', bld: 'Construir', lis: 'Escuchar', spk: 'Hablar', wri: 'Escribir sin mirar', con: 'Usar / conversar', spd: 'Rapidez' };

  EN.viewTalk = function (root) {
    root.append(h('h1', null, 'Conversaciones'), h('p', { class: 'muted' }, 'De oraciones sueltas a conversaciones: primero dos oraciones conectadas, luego respuestas completas, preguntas de seguimiento, intercambios y situaciones completas.'));
    const known = c => c.uses.every(u => EN.seen(u));
    const steps = [['pair', 'Dos oraciones conectadas'], ['answer', 'Respuestas completas'], ['follow', 'Respuesta + pregunta de seguimiento'], ['exchange', 'Intercambios']];
    const prog = h('div', { class: 'card' }, h('h2', null, 'Construcción progresiva'), h('p', { class: 'muted small' }, 'Solo se incluyen combinaciones cuyas estructuras ya has estudiado: no se evalúa material desconocido.'));
    steps.forEach(([k, n]) => {
      const all = SEM.combos.filter(c => c.kind === k), ok = all.filter(known);
      prog.append(h('div', { class: 'row between card tight' }, h('div', null, h('b', null, n), h('div', { class: 'muted small' }, ok.length + ' de ' + all.length + ' disponibles con lo que sabes')),
        h('button', { class: 'btn small', type: 'button', disabled: !ok.length, onclick: () => App.start({ title: n, module: 'english', kind: 'combo', items: SEM.shuffle(ok).slice(0, 6).map(c => ({ type: 'en-combo', c })), back: '#/english/talk' }) }, 'Practicar')));
    });
    root.append(prog);
    const list = h('div', { class: 'card' }, h('h2', null, 'Situaciones completas'));
    SEM.dialogues.slice().sort((a, b) => a.st - b.st).forEach(d => {
      const knownN = d.uses.filter(u => EN.seen(u)).length;
      const best = Stats.groupBy(Store.attempts(a => a.item === 'dlg:' + d.id), 'item')[0];
      list.append(h('div', { class: 'row between card tight' }, h('div', null, h('b', null, d.t), h('span', { class: 'tag' }, 'E' + d.st), best ? h('span', { class: 'tag good' }, 'mejor ' + pct(best.accuracy)) : null, h('div', { class: 'muted small' }, d.situation + ' · conoces ' + knownN + '/' + d.uses.length + ' estructuras')),
        h('button', { class: 'btn small', type: 'button', onclick: () => App.start({ title: d.t, module: 'english', kind: 'dialog', items: [{ type: 'en-dlg', dialog: d.id, run: 'r' + Date.now(), lines: d.lines, you: d.you, situation: d.situation, uses: d.uses }], back: '#/english/talk' }) }, 'Empezar')));
    });
    root.append(list);
    root.append(EN.openTalk());
  };

  /* Conversación abierta: preguntas que no conoces de antemano; respuestas originales. */
  EN.openTalk = function () {
    const card = h('div', { class: 'card' }, h('h2', null, 'Conversación espontánea'));
    const ai = App.ai();
    const questions = [];
    SEM.dialogues.forEach(d => d.lines.forEach(l => { if (l[0] === 'A' && /\?$/.test(l[1])) questions.push({ q: l[1], es: l[2], uses: d.uses }); }));
    SEM.combos.forEach(c => { if (c.q && /\?$/.test(c.q)) questions.push({ q: c.q, uses: c.uses }); });
    const area = h('div');
    const ask = () => {
      area.innerHTML = '';
      const it = SEM.pick(questions);
      const ta = h('textarea', { placeholder: 'Responde con tus palabras (2-3 oraciones). Usa estructuras que conozcas.' });
      const fb = h('div');
      const t0 = performance.now();
      area.append(h('div', { class: 'prompt' }, it.q, Ex.speakBtn(it.q)), ta,
        h('div', { class: 'row', style: { marginTop: '8px' } }, h('button', { class: 'btn primary', type: 'button', onclick: async () => {
          const text = ta.value.trim(); if (!text) return;
          const used = EN.learned().filter(p => SEM.usesPattern(text, p) && SEM.frameKeys(p.f).join(' ').split(' ').length >= 2);
          fb.innerHTML = '';
          fb.append(h('div', { class: 'notice' }, used.length ? 'Estructuras detectadas: ' : 'No detecté estructuras estudiadas. ', used.slice(0, 6).map(p => h('span', { class: 'tag acc' }, p.t))));
          let aiScore = null;
          if (ai.enabled) { try { const r = await Store.api('/api/ai', { body: { task: 'evaluate-english', input: { pattern: 'respuesta libre a: ' + it.q, sentence: text } } }); aiScore = r.data.score; fb.append(h('div', { class: 'notice small' }, h('b', null, 'Versión natural: '), r.data.fixed, h('div', { class: 'muted' }, r.data.explanation))); } catch (e) { fb.append(h('div', { class: 'notice warn small' }, e.message)); } }
          fb.append(Ex.selfGrade(sc => {
            const score = aiScore != null ? (sc + aiScore) / 2 : sc;
            Store.attempt({ module: 'english', technique: 'generation+contexts', item: 'open', skill: 'con', score, ms: performance.now() - t0, meta: { free: true, open: true, uses: used.map(p => p.id) } });
            used.forEach(p => EN.note(p.id, 'con', score, 0));
            Store.put('mine', 'open-' + Date.now().toString(36), { q: it.q, text, score, t: Date.now() });
            toast('Guardado'); ask();
          }));
        } }, 'Revisar'), h('button', { class: 'btn ghost', type: 'button', onclick: ask }, 'Otra pregunta')), fb);
      Voice.speak(it.q);
    };
    card.append(h('p', { class: 'muted small' }, 'Preguntas reales que no has visto en este orden. Responde de forma original. ' + (ai.enabled ? 'La IA evaluará la naturalidad.' : 'Sin IA configurada: se detectan las estructuras usadas y te autoevalúas comparando con los modelos.')),
      h('button', { class: 'btn', type: 'button', onclick: ask }, 'Empezar'), area);
    if (ai.enabled) card.append(EN.aiChat());
    return card;
  };

  EN.aiChat = function () {
    const box = h('details', null, h('summary', null, 'Simulación con IA (situación libre)'));
    const sit = h('input', { type: 'text', placeholder: 'Situación: p. ej. «Devolver un producto en una tienda»' });
    const log = h('div'); const hist = [];
    const say = h('input', { type: 'text', placeholder: 'Tu respuesta en inglés…' });
    const send = async () => {
      const text = say.value.trim(); if (!text) return;
      hist.push({ who: 'me', text }); log.append(h('div', { class: 'dialog-line B' }, text)); say.value = '';
      try {
        const r = await Store.api('/api/ai', { body: { task: 'conversation', input: { situation: sit.value, patterns: EN.learned().slice(-12).map(p => p.t), history: hist } } });
        const d = r.data; hist.push({ who: 'ai', text: d.reply });
        log.append(h('div', { class: 'dialog-line A' }, d.reply, Ex.speakBtn(d.reply), h('div', { class: 'es' }, d.reply_es)), h('div', { class: 'small muted' }, '💡 ', d.feedback, d.better ? ' · Más natural: «' + d.better + '»' : ''));
        Voice.speak(d.reply);
        Store.attempt({ module: 'english', technique: 'contexts+generation', item: 'ai-chat', skill: 'con', score: Math.max(0, Math.min(1, Number(d.score) || 0)), ms: 0, meta: { free: true, ai: true } });
      } catch (e) { toast(e.message, 'bad'); }
    };
    say.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    box.append(sit, log, h('div', { class: 'row', style: { marginTop: '8px' } }, h('div', { class: 'grow' }, say), h('button', { class: 'btn', type: 'button', onclick: send }, 'Enviar')));
    return box;
  };

  EN.viewMine = function (root) {
    const mine = Store.list('mine').sort((a, b) => b.t - a.t);
    root.append(h('h1', null, 'Mis oraciones'), h('p', { class: 'muted' }, mine.length + ' oraciones originales guardadas. Reaparecen como modelo personal: lo que has dicho tú se recuerda mejor.'),
      h('div', { class: 'card' }, h('ul', { class: 'list' }, mine.slice(0, 300).map(m => h('li', null, h('b', null, m.text), Ex.speakBtn(m.text), h('div', { class: 'muted small' }, (m.pid ? P(m.pid) ? P(m.pid).t : m.pid : m.q) + ' · ' + UI.dateStr(m.t) + ' · ' + pct(m.score)))))));
  };

  /* ---------- ampliar la biblioteca (IA o importación) con revisión ---------- */
  EN.loadExtra = function () {
    Store.list('enpack').forEach(d => {
      if (d.status !== 'approved' || SEM.byId[d.p.id]) return;
      try { SEM.P(Object.assign({}, d.p, { src: 'user' })); } catch (e) { console.warn(e); }
    });
  };
  EN.validatePattern = function (p) {
    const errs = [];
    if (!p || typeof p !== 'object') return ['formato inválido'];
    if (!/^[a-z0-9-]{3,60}$/.test(p.id || '')) errs.push('id inválido');
    if (SEM.byId[p.id]) errs.push('ya existe una estructura con ese id');
    if (!SEM.catById[p.cat]) errs.push('categoría desconocida');
    if (!(p.st >= 1 && p.st <= 6)) errs.push('etapa inválida');
    if (!SEM.REGISTERS[p.reg]) errs.push('registro inválido');
    if (!p.f || (p.f.match(/___/g) || []).length !== 1) errs.push('el molde debe tener un hueco [R:___]');
    if (!p.es || !p.es.includes('[___]')) errs.push('molde en español sin [___]');
    if (!Array.isArray(p.sl) || p.sl.length < 3 || p.sl.some(s => !Array.isArray(s) || s.length !== 2)) errs.push('banco de sustitución insuficiente');
    if (!Array.isArray(p.ex) || p.ex.length < 3) errs.push('menos de 3 ejemplos');
    const known = new Set(); SEM.patterns.forEach(q => q.ex.forEach(e => known.add(SEM.norm(e[0]))));
    const dups = (p.ex || []).filter(e => known.has(SEM.norm(e[0])));
    if (dups.length > 1) errs.push('ejemplos duplicados con la biblioteca');
    const sameFrame = SEM.patterns.find(q => SEM.norm(SEM.plain(q.f)) === SEM.norm(SEM.plain(p.f || '')));
    if (sameFrame) errs.push('molde idéntico a «' + sameFrame.t + '»');
    return errs;
  };
  EN.viewGrow = function (root) {
    const ai = App.ai();
    root.append(h('h1', null, 'Ampliar la biblioteca'), h('p', { class: 'muted' }, 'La biblioteca no tiene límite. El contenido nuevo pasa por validación automática (formato, duplicados, molde) y por tu revisión antes de entrar al entrenamiento.'));
    const gen = h('div', { class: 'card' }, h('h2', null, 'Generar con IA'));
    if (!ai.enabled) gen.append(h('div', { class: 'notice warn' }, 'IA no disponible: ' + (ai.reason || 'sin configurar') + ' Puedes importar paquetes JSON abajo.'));
    else {
      const cat = h('select', null, SEM.CATS.map(c => h('option', { value: c.id }, c.name)));
      const st = h('select', null, SEM.STAGES.map(s => h('option', { value: s.n }, s.name)));
      const focus = h('input', { type: 'text', placeholder: 'Enfoque opcional (p. ej. «hablar con el pediatra»)' });
      const btn = h('button', { class: 'btn primary', type: 'button', onclick: async () => {
        btn.disabled = true; btn.textContent = 'Generando…';
        try {
          const r = await Store.api('/api/ai', { body: { task: 'english-patterns', input: { category: SEM.catById[cat.value].name, stage: Number(st.value), count: 3, focus: focus.value, existing: SEM.patterns.filter(p => p.cat === cat.value).map(p => p.t) } } });
          let n = 0;
          (r.data.patterns || []).forEach(p => { p.cat = cat.value; p.st = Number(st.value); p.tags = ['ia']; p.req = []; p.rel = []; p.dlg = null; p.bad = (p.bad || []).filter(b => b.length === 3); p.id = 'ai-' + String(p.id || p.t || 'x').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
            const errs = EN.validatePattern(p); Store.put('enpack', p.id, { p, status: 'pending', errs, t: Date.now(), via: 'ia' }); n++; });
          toast(n + ' estructuras generadas para revisar'); App.route();
        } catch (e) { toast(e.message, 'bad'); }
        btn.disabled = false; btn.textContent = 'Generar 3 estructuras';
      } }, 'Generar 3 estructuras');
      gen.append(h('div', { class: 'grid g3' }, cat, st, focus), h('div', { style: { marginTop: '8px' } }, btn));
    }
    root.append(gen);
    const imp = h('div', { class: 'card' }, h('h2', null, 'Importar paquete JSON'), h('p', { class: 'muted small' }, 'Formato: {"patterns":[{id, cat, st, reg, f, es, t, m, img, sl, ex, bad, alt, n, odd}]}. Ver docs/FORMATO-CONTENIDO.md.'));
    const file = h('input', { type: 'file', accept: 'application/json' });
    file.addEventListener('change', async () => {
      try { const obj = JSON.parse(await file.files[0].text()); (obj.patterns || []).forEach(p => { p.tags = p.tags || []; p.req = p.req || []; p.rel = []; p.bad = p.bad || []; p.alt = p.alt || []; Store.put('enpack', p.id, { p, status: 'pending', errs: EN.validatePattern(p), t: Date.now(), via: 'json' }); }); toast('Importado: pendiente de revisión'); App.route(); }
      catch (e) { toast('Archivo no válido: ' + e.message, 'bad'); }
    });
    imp.append(file); root.append(imp);
    const pend = Store.list('enpack').filter(d => d.status === 'pending');
    const rev = h('div', { class: 'card' }, h('h2', null, 'Pendientes de revisión (' + pend.length + ')'));
    pend.forEach(d => {
      const p = d.p;
      rev.append(h('div', { class: 'card tight' }, h('b', null, p.t || p.f), h('div', { class: 'muted small' }, p.m), h('div', null, Ex.blocks(p.f || '', 'full', { speak: false })),
        h('ul', { class: 'small' }, (p.ex || []).map(e => h('li', null, SEM.plain(e[0]), ' — ', h('span', { class: 'muted' }, e[1])))),
        d.errs && d.errs.length ? h('div', { class: 'notice bad small' }, 'Problemas: ' + d.errs.join('; ')) : h('div', { class: 'notice good small' }, 'Validación automática superada. Comprueba tú la naturalidad.'),
        h('div', { class: 'row' }, h('button', { class: 'btn small good', type: 'button', disabled: !!(d.errs && d.errs.length), onclick: () => { Store.put('enpack', p.id, Object.assign({}, d, { status: 'approved' })); EN.loadExtra(); toast('Añadida a la biblioteca'); App.route(); } }, 'Aprobar'),
          h('button', { class: 'btn small', type: 'button', onclick: () => { Store.put('enpack', p.id, Object.assign({}, d, { status: 'rejected' })); App.route(); } }, 'Rechazar'))));
    });
    root.append(rev);
  };
})();
