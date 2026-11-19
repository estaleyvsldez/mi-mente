/* MEMORY LAB — aplicación: autenticación, navegación, dashboard, Voice Recall y configuración. */
(function () {
  'use strict';
  const { h, $, toast, pct, mins } = UI;
  const App = window.App = {};
  const view = $('#view');
  let aiStatus = { enabled: false, reason: 'comprobando…' };

  const DEFAULTS = { theme: 'auto', voice: '', rate: 0.95, accent: 'en-US', autoplay: true, newPerDay: 3, maxReviews: 25, minExercises: 5, minMinutes: 0, restPerWeek: 1 };
  App.settings = () => Object.assign({}, DEFAULTS, Store.get('settings', 'main') || {});
  App.ai = () => aiStatus;
  App.applyTheme = () => { const t = App.settings().theme; if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); };

  const NAV = [
    ['grp', 'Inicio'], ['#/', '◆', 'Dashboard'],
    ['grp', 'Entrenamiento'], ['#/training', '📈', 'Progressive Training'], ['#/athlete', '🏅', 'Memory Athlete'], ['#/modules', '🧩', 'Módulos de memoria'], ['#/quick', '⚡', 'Quick & Hidden Memory'], ['#/multimodal', '🎛️', 'Desafíos multimodales'], ['#/voice', '🎙️', 'Voice Recall'], ['#/lab', '🧪', 'Strategy Lab'],
    ['grp', 'Inglés'], ['#/english', '🇬🇧', 'Structural English'], ['#/english/lib', '📚', 'Biblioteca de inglés'], ['#/english/talk', '💬', 'Conversaciones'],
    ['grp', 'Conocimiento'], ['#/techniques', '📖', 'Biblioteca de técnicas'], ['#/strategy', '🧠', 'Motor de estrategias'],
    ['grp', 'Progreso'], ['#/stats', '📊', 'Analytics'], ['#/calendar', '🗓️', 'Calendario y racha'], ['#/history', '🕘', 'Historial'], ['#/goals', '🎯', 'Objetivos y logros'], ['#/settings', '⚙️', 'Configuración']
  ];
  function drawNav() {
    const side = $('#side'); side.innerHTML = '';
    if (!Store.loggedIn) return;
    const cur = location.hash || '#/';
    NAV.forEach(n => {
      if (n[0] === 'grp') side.append(h('div', { class: 'grp' }, n[1]));
      else side.append(h('a', { href: n[0], class: cur === n[0] || (n[0] !== '#/' && cur.startsWith(n[0] + '/') && !NAV.some(m => m[0] !== n[0] && cur.startsWith(m[0]) && m[0].length > n[0].length)) ? 'on' : '', onclick: () => side.classList.remove('open') }, h('span', { class: 'ic' }, n[1]), n[2]));
    });
    side.append(h('div', { class: 'grp' }, Store.S.user ? Store.S.user.username : ''));
  }
  $('#menuBtn').addEventListener('click', () => $('#side').classList.toggle('open'));

  function drawSync() {
    const el = $('#sync');
    const s = Store.S;
    if (!Store.loggedIn) { el.innerHTML = ''; return; }
    const txt = { saved: 'Guardado', saving: 'Guardando…', offline: 'Sin conexión · ' + Store.pending + ' en cola', idle: Store.pending ? Store.pending + ' pendientes' : 'Al día', error: 'Error' }[s.status] || s.status;
    el.className = 'sync ' + s.status;
    el.innerHTML = ''; el.append(h('span', { class: 'dot' }), txt);
    el.title = s.lastError || (s.lastSaved ? 'Última confirmación del servidor: ' + new Date(s.lastSaved).toLocaleTimeString() : '');
  }
  Store.on(drawSync);

  /* ---------- sesiones ---------- */
  let pendingSession = null;
  App.start = function (session) { pendingSession = session; location.hash = '#/run'; if (location.hash === '#/run') App.route(); };

  /* ---------- router ---------- */
  App.route = function () {
    App.applyTheme();
    drawNav(); drawSync();
    view.innerHTML = '';
    if (!Store.loggedIn) return viewAuth(view);
    const hash = location.hash || '#/';
    const parts = hash.slice(2).split('/');
    const r = parts[0];
    try {
      if (r === '' ) return viewDashboard(view);
      if (r === 'run') {
        if (pendingSession) { const s = pendingSession; pendingSession = null; if (s.kind === 'learn' || s.kind === 'review' || s.kind === 'exam' || s.module === 'english') { const od = s.onDone; s.onDone = (ss, acc) => { const a = EN.onDone(ss); const b = od ? od(ss, acc) : null; return h('div', null, a, b); }; } return Ex.run(view, s); }
        const ip = Store.get('inprogress', 'current'); if (ip) return resume(ip);
        location.hash = '#/'; return;
      }
      if (r === 'english') {
        if (!parts[1]) return EN.viewHome(view);
        if (parts[1] === 'lib') return EN.viewLibrary(view, { cat: parts[2] });
        if (parts[1] === 'p') return EN.viewPattern(view, parts[2]);
        if (parts[1] === 'talk') return EN.viewTalk(view);
        if (parts[1] === 'mine') return EN.viewMine(view);
        if (parts[1] === 'grow') return EN.viewGrow(view);
      }
      if (r === 'training') return parts[1] ? Training.viewLesson(view, parts[1]) : Training.viewProgressive(view);
      if (r === 'techniques') return parts[1] ? Training.viewTechnique(view, parts[1]) : Training.viewTechniques(view);
      if (r === 'strategy') return Training.viewStrategy(view);
      if (r === 'athlete') {
        const m = { major: Athlete.viewMajor, pao: Athlete.viewPAO, peg: Athlete.viewPeg, palaces: Athlete.viewPalaces, challenges: Athlete.viewChallenges }[parts[1]];
        return (m || Athlete.viewHome)(view);
      }
      if (r === 'modules') return MEM.viewModules(view);
      if (r === 'quick') return MEM.viewQuick(view);
      if (r === 'multimodal') return viewMultimodal(view);
      if (r === 'voice') return viewVoice(view);
      if (r === 'lab') return Lab.view(view);
      if (r === 'stats') return Analytics.viewStats(view);
      if (r === 'calendar') return Analytics.viewCalendar(view);
      if (r === 'history') return Analytics.viewHistory(view);
      if (r === 'goals') return Analytics.viewGoals(view);
      if (r === 'settings') return viewSettings(view);
      view.append(h('p', null, 'Sección no encontrada. '), h('a', { href: '#/' }, 'Ir al inicio'));
    } catch (e) {
      console.error(e);
      view.append(h('div', { class: 'notice bad' }, 'Error al mostrar esta sección: ' + e.message));
    }
  };
  function resume(ip) {
    const s = Object.assign({}, ip, { onDone: ip.module === 'english' ? (ss) => EN.onDone(ss) : null });
    Ex.run(view, s);
  }
  window.addEventListener('hashchange', App.route);

  /* ---------- autenticación ---------- */
  function viewAuth(root) {
    let register = false;
    const user = h('input', { type: 'text', autocomplete: 'username', 'aria-label': 'Usuario', placeholder: 'Usuario' });
    const pass = h('input', { type: 'password', autocomplete: 'current-password', 'aria-label': 'Contraseña', placeholder: 'Contraseña (mínimo 8 caracteres)' });
    const msg = h('div');
    const title = h('h2', null, 'Iniciar sesión');
    const btn = h('button', { class: 'btn primary', type: 'submit' }, 'Entrar');
    const toggle = h('button', { class: 'btn ghost small', type: 'button', onclick: () => { register = !register; title.textContent = register ? 'Crear cuenta' : 'Iniciar sesión'; btn.textContent = register ? 'Crear cuenta' : 'Entrar'; toggle.textContent = register ? 'Ya tengo cuenta' : 'Crear una cuenta nueva'; pass.autocomplete = register ? 'new-password' : 'current-password'; } }, 'Crear una cuenta nueva');
    const form = h('form', { class: 'card auth', onsubmit: async e => {
      e.preventDefault(); btn.disabled = true; msg.innerHTML = '';
      try { await Store.login(user.value.trim(), pass.value, register); Ex.loadAccepted(); EN.loadExtra(); refreshAI(); location.hash = '#/'; App.route(); }
      catch (err) { msg.append(h('div', { class: 'notice bad' }, err.status ? err.message : 'No se pudo conectar con el servidor. ¿Está en marcha («npm start»)?')); }
      btn.disabled = false;
    } }, h('h1', null, '◆ Memory Lab'), h('p', { class: 'muted' }, 'Entrenamiento de memoria, técnicas de memorización e inglés estructural. Tu progreso se guarda en la base de datos del servidor y se sincroniza entre dispositivos.'), title, user, h('div', { style: { height: '8px' } }), pass, h('div', { class: 'row', style: { marginTop: '12px' } }, btn, toggle), msg);
    root.append(form);
    setTimeout(() => user.focus(), 30);
  }

  /* ---------- dashboard ---------- */
  function viewDashboard(root) {
    const att = Store.attempts();
    const rule = Analytics.rule();
    const s = Stats.summary(att, { rule });
    const today = Stats.localDay(Date.now());
    const td = att.filter(a => a.day === today);
    root.append(h('h1', null, 'Hola, ' + Store.S.user.username), h('p', { class: 'muted' }, 'Tu entrenador decide qué toca hoy según lo que necesitas recuperar, no según lo que «toca» en una lista.'));
    root.append(h('div', { class: 'grid g4' },
      h('div', { class: 'stat' }, h('b', null, s.streak + ' 🔥'), h('span', null, 'racha (mejor: ' + s.bestStreak + ')')),
      h('div', { class: 'stat' }, h('b', null, td.length), h('span', null, 'ejercicios hoy (mínimo ' + rule.minExercises + ')')),
      h('div', { class: 'stat' }, h('b', null, mins(td.reduce((x, a) => x + (a.ms || 0), 0))), h('span', null, 'tiempo hoy')),
      h('div', { class: 'stat' }, h('b', null, pct(td.length ? td.reduce((x, a) => x + a.score, 0) / td.length : null)), h('span', null, 'precisión hoy'))));
    const ip = Store.get('inprogress', 'current');
    if (ip) root.append(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('div', null, h('b', null, 'Sesión interrumpida: ' + ip.title), h('div', { class: 'muted small' }, 'Ejercicio ' + (ip.idx + 1) + ' de ' + ip.items.length + '. Los ejercicios ya hechos están guardados.')),
      h('div', { class: 'row' }, h('a', { class: 'btn primary', href: '#/run' }, 'Continuar'), h('button', { class: 'btn ghost small', type: 'button', onclick: () => { Store.del('inprogress', 'current'); App.route(); } }, 'Descartar')))));
    const plan = h('div', { class: 'card' }, h('h2', null, 'Plan de hoy'));
    const due = EN.due();
    const items = [];
    if (due.length) items.push(['🇬🇧', due.length + ' estructuras de inglés para repasar', 'Repaso espaciado FSRS', () => App.start(EN.reviewSession(due.slice(0, App.settings().maxReviews)))]);
    const fresh = due.length > 40 ? [] : EN.nextNew(Math.max(0, App.settings().newPerDay - EN.learnedToday()));
    if (fresh.length) items.push(['✨', 'Nueva estructura: ' + fresh[0].t, fresh[0].m, () => App.start(EN.learnSession(fresh[0].id))]);
    const dl = Store.list('delayed').filter(d => !d.done && d.due <= Date.now());
    if (dl.length) items.push(['⏳', dl.length + ' evaluaciones diferidas', 'Comprueba si lo que memorizaste sigue ahí', () => App.start({ title: 'Recuperación diferida', module: 'delayed', items: dl.slice(0, 5).map(d => Object.assign({}, d.item, { label: 'Recuperación diferida', skipStudy: true })), back: '#/' })]);
    const L = SEM.LESSONS[Training.unlockedIndex()];
    if (L) items.push(['📈', 'Entrenamiento progresivo: ' + L.n, L.goal, () => { location.hash = '#/training/' + L.id; }]);
    const weakMod = MEM.MODULES.map(m => ({ m, last: Store.attempts(a => a.module === m.id).pop() })).sort((a, b) => (a.last ? a.last.ts : 0) - (b.last ? b.last.ts : 0))[0];
    if (weakMod) items.push(['🧩', 'Módulo: ' + weakMod.m.n, weakMod.last ? 'El que llevas más tiempo sin practicar' : 'Aún no lo has probado', () => App.start({ title: weakMod.m.n, module: weakMod.m.id, items: [MEM.make(weakMod.m.id), MEM.make(weakMod.m.id)], back: '#/' })]);
    plan.append(h('ul', { class: 'list' }, items.map(([ic, t, d, fn]) => h('li', { class: 'row between' }, h('div', null, h('b', null, ic + ' ' + t), h('div', { class: 'muted small' }, d)), h('button', { class: 'btn small primary', type: 'button', onclick: fn }, 'Empezar')))));
    root.append(plan);
    const goals = Analytics.goals();
    if (goals.length) root.append(h('div', { class: 'card' }, h('h2', null, 'Objetivos'), goals.map(g => { const p = Stats.goalProgress(g, att, null, Analytics.goalExtra()); return h('div', { style: { marginBottom: '8px' } }, h('div', { class: 'row between small' }, h('span', null, Analytics.GOAL_TYPES[g.type] + (g.period === 'week' ? ' (semana)' : ' (hoy)')), h('span', null, p.value + ' / ' + p.target + (p.done ? ' ✓' : ''))), h('div', { class: 'bar' }, h('i', { style: { width: Math.min(100, p.value / p.target * 100) + '%' } }))); })));
    else root.append(h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Sin objetivos. '), h('a', { href: '#/goals' }, 'Crear un objetivo diario o semanal')));
    const en = Stats.english(att, Store.map('srs'));
    root.append(h('div', { class: 'grid g3' },
      h('a', { class: 'card', href: '#/english', style: { textDecoration: 'none', color: 'inherit' } }, h('h3', null, '🇬🇧 Inglés'), h('p', { class: 'small muted' }, en.studied + ' estructuras estudiadas · ' + en.building + ' construyes · ' + en.mastered + ' dominadas')),
      h('a', { class: 'card', href: '#/calendar', style: { textDecoration: 'none', color: 'inherit' } }, h('h3', null, '🗓️ Actividad'), UI.heatmap(Stats.byDay(att), 12, new Set(Stats.validDays(att, rule)))),
      h('a', { class: 'card', href: '#/stats', style: { textDecoration: 'none', color: 'inherit' } }, h('h3', null, '📊 Total'), h('p', { class: 'small muted' }, s.exercises + ' ejercicios · ' + mins(s.totalMs) + ' · ' + s.activeDays + ' días válidos'))));
  }

  /* ---------- desafíos multimodales ---------- */
  function viewMultimodal(root) {
    root.append(h('h1', null, 'Desafíos multimodales'), h('p', { class: 'muted' }, 'Objetos con colores, números, palabras en inglés y una estructura de oración. Todo desaparece y se evalúa cada capacidad por separado y el resultado combinado. La estructura elegida es una que ya estudiaste, para no evaluar contenido desconocido.'));
    root.append(h('div', { class: 'grid g3' }, [4, 6, 8, 10].map(n => h('div', { class: 'card' }, h('h3', null, n + ' objetos'), h('button', { class: 'btn primary', type: 'button', onclick: () => App.start({ title: 'Multimodal · ' + n, module: 'multimodal', items: [MEM.fill({ type: 'mem', module: 'multimodal', kind: 'multimodal', count: n, mode: 'normal', technique: 'scenes+chunking+major+sentence-build', fixed: true })], back: '#/multimodal' }) }, 'Empezar')))));
    root.append(h('div', { class: 'card' }, h('h2', null, 'Memoria visual, palabras y colores'), h('div', { class: 'row' },
      h('button', { class: 'btn', type: 'button', onclick: () => App.start({ title: 'Imagen ↔ palabra', module: 'visual', items: [MEM.make('visual')], back: '#/multimodal' }) }, 'Imagen ↔ palabra (bidireccional)'),
      h('button', { class: 'btn', type: 'button', onclick: () => App.start({ title: 'Objetos y colores', module: 'colors', items: [MEM.make('colors')], back: '#/multimodal' }) }, 'Objetos y colores'),
      h('button', { class: 'btn', type: 'button', onclick: () => App.start({ title: 'Reconstruir escena', module: 'visual', items: [MEM.fill({ type: 'mem', module: 'visual', kind: 'scene', count: 5, mode: 'normal', technique: 'scenes', fixed: true })], back: '#/multimodal' }) }, 'Reconstruir una escena'))));
  }

  /* ---------- Voice Recall ---------- */
  function viewVoice(root) {
    root.append(h('h1', null, 'Voice Recall'), h('p', { class: 'muted' }, 'La voz como forma principal de responder. Se transcribe lo que dices y se compara con lo esperado; puedes corregir la transcripción si el reconocimiento falla. Importante: una transcripción correcta no garantiza una pronunciación correcta.'));
    root.append(h('div', { class: 'card' }, h('div', { class: 'row' }, h('span', { class: 'tag ' + (Voice.canListen ? 'good' : 'bad') }, Voice.canListen ? 'Reconocimiento de voz disponible' : 'Sin reconocimiento de voz (usa Chrome o Edge; se ofrece respuesta escrita)'), h('span', { class: 'tag ' + (Voice.canSpeak ? 'good' : 'bad') }, Voice.canSpeak ? 'Síntesis de voz disponible' : 'Sin síntesis de voz')),
      h('button', { class: 'btn small', type: 'button', style: { marginTop: '8px' }, onclick: async () => { try { const r = await Voice.listen('en-US'); toast('Oí: «' + r.text + '» (confianza ' + pct(r.confidence) + ')'); } catch (e) { toast(e.message, 'bad'); } } }, '🎙️ Probar micrófono')));
    const learned = EN.learned();
    const speakItems = n => SEM.shuffle(learned.length ? learned : SEM.patterns.filter(p => p.st === 1)).slice(0, n).map(p => { const ex = p.ex.find(e => SEM.plain(e[0]).split(' ').length <= 12) || p.ex[0]; return { type: 'en-speak', pid: p.id, s: { m: ex[0], es: ex[1], alt: ex[2] || [] } }; });
    const opts = [
      ['Responder en inglés hablando', 'Del español al inglés, en voz alta, con estructuras que estudiaste.', () => App.start({ title: 'Voice Recall · inglés', module: 'english', items: speakItems(6), back: '#/voice' })],
      ['Recordar palabras oralmente', 'Escucha una lista y después dila (o escríbela).', () => App.start({ title: 'Voice Recall · palabras', module: 'auditory', items: [Object.assign(MEM.fill({ type: 'mem', module: 'auditory', kind: 'auditory', count: 6, mode: 'normal', technique: 'chunking+multisensory', fixed: true }), { data: MEM.words(6).map(w => w.es) })], back: '#/voice' })],
      ['Repetir secuencias', 'Escucha dígitos y repítelos.', () => App.start({ title: 'Voice Recall · secuencias', module: 'auditory', items: [Object.assign(MEM.fill({ type: 'mem', module: 'auditory', kind: 'auditory', count: 6, mode: 'normal', technique: 'chunking', fixed: true }), { data: MEM.digits(7) })], back: '#/voice' })],
      ['Describir una imagen en inglés', 'Describe la escena en voz alta; se comprueban las palabras clave.', () => App.start({ title: 'Describir imagen', module: 'english', items: [{ type: 'describe', objs: MEM.items(4).map((x, i) => Object.assign({}, x, { color: SEM.COLORS[i] })) }], back: '#/voice' })],
      ['Conversaciones por voz', 'Situaciones completas respondiendo hablando.', () => { location.hash = '#/english/talk'; }]
    ];
    root.append(h('div', { class: 'grid g2' }, opts.map(([t, d, fn]) => h('div', { class: 'card' }, h('h3', null, t), h('p', { class: 'muted small' }, d), h('button', { class: 'btn primary', type: 'button', onclick: fn }, 'Empezar')))));
  }
  Ex.types.describe = {
    label: 'Describir una imagen (voz)',
    render(el, it, done) {
      const t0 = performance.now();
      const words = it.objs.map(o => o.en).concat(it.objs.map(o => o.color.en));
      el.append(h('div', { class: 'tiles' }, it.objs.map(o => h('div', { class: 'tile', style: { boxShadow: 'inset 0 0 0 4px ' + o.color.hex } }, h('div', { class: 'em' }, o.e)))),
        h('p', { class: 'muted small' }, 'Describe en inglés lo que ves (objetos y colores). Ej.: «There\'s a red apple and a blue car…»'),
        Ex.answerBox({ answers: [it.objs.map(o => 'a ' + o.color.en + ' ' + o.en).join(' and ')], key: null, placeholder: 'Habla o escribe tu descripción', autoplay: false, onResult: r => {
          const t = ' ' + SEM.norm(r.text) + ' ';
          const hits = words.filter(w => t.includes(' ' + SEM.norm(w) + ' ')).length;
          done({ module: 'english', technique: 'visualize+sentence-build', item: 'describe', skill: r.viaVoice ? 'spk' : 'wri', score: hits / words.length, ms: performance.now() - t0, total: words.length, correct: hits, meta: { voice: r.viaVoice, free: true } });
        } }));
    }
  };

  /* ---------- configuración ---------- */
  function viewSettings(root) {
    const s = App.settings();
    const save = (k, v) => { const cur = App.settings(); cur[k] = v; Store.put('settings', 'main', cur); App.applyTheme(); toast('Guardado'); };
    const sel = (k, opts) => { const x = h('select', null, opts.map(([v, n]) => h('option', { value: v, selected: String(s[k]) === String(v) }, n))); x.addEventListener('change', () => save(k, isNaN(Number(x.value)) || x.value === '' ? x.value : Number(x.value))); return x; };
    const num = (k, min, max) => { const x = h('input', { type: 'number', value: s[k], min, max }); x.addEventListener('change', () => save(k, Math.max(min, Math.min(max, Number(x.value) || min)))); return x; };
    const voices = Voice.voices().filter(v => v.lang.startsWith('en'));
    const F = (l, c, d) => h('div', null, h('label', { class: 'f' }, l), c, d ? h('div', { class: 'small muted' }, d) : null);
    root.append(h('h1', null, 'Configuración'),
      h('div', { class: 'card' }, h('h2', null, 'Apariencia y voz'), h('div', { class: 'grid g3' },
        F('Tema', sel('theme', [['auto', 'Automático'], ['dark', 'Oscuro'], ['light', 'Claro']])),
        F('Acento', sel('accent', [['en-US', 'Inglés americano'], ['en-GB', 'Inglés británico']])),
        F('Voz', sel('voice', [['', 'Automática']].concat(voices.map(v => [v.name, v.name + ' (' + v.lang + ')'])))),
        F('Velocidad de voz', sel('rate', [[0.75, 'Lenta'], [0.95, 'Normal'], [1.1, 'Rápida']])),
        F('Leer en voz alta la respuesta modelo', sel('autoplay', [[true, 'Sí'], ['', 'No']])))),
      h('div', { class: 'card' }, h('h2', null, 'Ritmo de aprendizaje'), h('div', { class: 'grid g3' },
        F('Estructuras nuevas por día', num('newPerDay', 0, 20)), F('Máximo de repasos por sesión', num('maxReviews', 5, 200)))),
      h('div', { class: 'card' }, h('h2', null, 'Regla de racha'), h('div', { class: 'grid g3' },
        F('Ejercicios mínimos por día', num('minExercises', 1, 200)), F('o minutos mínimos (0 = no usar)', num('minMinutes', 0, 300)), F('Días de descanso por semana sin romper la racha', num('restPerWeek', 0, 3)))));
    const ai = App.ai();
    root.append(h('div', { class: 'card' }, h('h2', null, 'Inteligencia artificial'), h('p', null, ai.enabled ? '✓ Activada (' + ai.model + ')' : '✗ Desactivada: ' + ai.reason), h('p', { class: 'small muted' }, 'La IA es opcional y está separada del motor de aprendizaje. Para activarla, en el servidor: «npm install» y define la variable ANTHROPIC_API_KEY antes de «npm start».')));
    const restoreInput = h('input', { type: 'file', accept: 'application/json' });
    restoreInput.addEventListener('change', async () => {
      try { const obj = JSON.parse(await restoreInput.files[0].text()); const r = await Store.restore(obj); toast('Restaurado: ' + r.acked + ' registros (' + r.rejected + ' rechazados)'); App.route(); }
      catch (e) { toast('No se pudo restaurar: ' + e.message, 'bad'); }
    });
    root.append(h('div', { class: 'card' }, h('h2', null, 'Datos y copias de seguridad'), h('p', { class: 'small muted' }, 'Tus datos viven en la base de datos del servidor (y el servidor guarda copias diarias automáticas). Aquí puedes descargar tu propia copia o restaurarla (no duplica registros).'),
      h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: async () => { try { const d = await Store.backup(); const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(d)], { type: 'application/json' })), download: 'memory-lab-' + Stats.localDay(Date.now()) + '.json' }); document.body.append(a); a.click(); a.remove(); } catch (e) { toast(e.message, 'bad'); } } }, 'Descargar copia'),
        h('label', { class: 'btn' }, 'Restaurar copia', h('span', { style: { display: 'none' } }, restoreInput)),
        h('button', { class: 'btn ghost', type: 'button', onclick: async () => { if (await Store.logout()) App.route(); } }, 'Cerrar sesión'))));
    root.querySelector('label.btn').addEventListener('click', () => restoreInput.click());
  }

  async function refreshAI() { try { aiStatus = await Store.api('/api/ai/status'); } catch (e) { aiStatus = { enabled: false, reason: 'servidor no disponible' }; } }

  /* ---------- arranque ---------- */
  (async function boot() {
    if (Voice.canSpeak) speechSynthesis.onvoiceschanged = () => {};
    const ok = await Store.init();
    if (ok) { Ex.loadAccepted(); EN.loadExtra(); await refreshAI(); }
    App.route();
    Store.on(() => { /* refresca contenido aprobado y ajustes al sincronizar */ });
  })();
})();
