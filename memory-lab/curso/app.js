/* CURSO DE INGLÉS AMERICANO PARA HABLAR
   80 % hablar: escuchar y repetir como un nativo, conversación A/B guiada (con ayuda y luego sin ayuda), decirlo sin mirar.
   20 % práctica: ordenar la frase y escuchar y elegir.
   Debajo de cada frase en inglés: cómo se pronuncia (con letras del español) y qué significa.
   Un botón grande abajo que SIEMPRE deja avanzar. Progreso guardado en tu cuenta (claude.ai) o en este navegador. */
(function () {
  'use strict';
  const $app = document.getElementById('app');
  const $foot = document.getElementById('foot');
  const CEFR = ['A1', 'A2', 'B1', 'B1+', 'B2', 'C1'];
  const DAY = 86400000;
  const BOX_DAYS = [1, 2, 4, 8, 16, 32];

  /* ---------- utilidades ---------- */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(9).forEach(c => { if (c != null && c !== false) el.append(c.nodeType ? c : String(c)); });
    return el;
  }
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const plain = t => SEM.plain(t);

  /* ---------- pronunciación escrita «a la española» ---------- */
  const LINKS = (window.PRON_LINKS || []).map(([en, es]) => [en.split(' '), es]).sort((a, b) => b[0].length - a[0].length);
  function pron(text) {
    const words = plain(text).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9áéíóúñü' -]/g, ' ').split(/\s+/).filter(Boolean);
    const out = [];
    for (let i = 0; i < words.length;) {
      const L = LINKS.find(([seq]) => seq.every((w, k) => words[i + k] === w));
      if (L) { out.push(L[1]); i += L[0].length; continue; }
      const w = words[i].replace(/^'+|'+$/g, '');
      out.push((window.PRON || {})[w] || (/^\d+$/.test(w) ? w : (window.pronGuess ? window.pronGuess(w) : w)));
      i++;
    }
    return out.join(' ') + (/\?\s*$/.test(plain(text)) ? '?' : '');
  }

  /* ---------- voz ---------- */
  let TTS = null;
  function speak(text, slow) {
    if (TTS && !slow) { try { TTS.speak(plain(text).slice(0, 1900), { language: 'en', rate: 0.95 }).catch(() => fallbackSpeak(text, slow)); return; } catch (_) { /* usa la del navegador */ } }
    fallbackSpeak(text, slow);
  }
  function fallbackSpeak(text, slow) {
    try {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(plain(text));
      u.lang = 'en-US'; u.rate = slow ? 0.62 : 0.92;
      const v = speechSynthesis.getVoices().find(x => /en[-_]US/i.test(x.lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (_) { /* sin voz */ }
  }
  const canSpeak = 'speechSynthesis' in window;
  const listenBtns = text => canSpeak ? h('span', { class: 'lb' }, h('button', { class: 'btn speak', type: 'button', onclick: () => speak(text) }, '🔊 Escuchar'), h('button', { class: 'btn speak', type: 'button', onclick: () => speak(text, true) }, '🐢 Lento')) : null;

  /* Dictado (micrófono) a través de claude.ai cuando está disponible; si no, el usuario confirma que lo dijo. */
  let DICT = null;
  let activeMic = null; // solo una frase escucha a la vez
  async function initDictation() {
    try { if (window.claude && window.claude.use) DICT = await window.claude.use('dictation'); } catch (_) { DICT = null; }
    if (!DICT) return;
    try {
      DICT.onFinal(({ text }) => { if (activeMic) { activeMic.heard = (activeMic.heard + ' ' + text).trim(); activeMic.partial && activeMic.partial(activeMic.heard); } });
      DICT.onPartial && DICT.onPartial(({ text }) => { if (activeMic && activeMic.partial) activeMic.partial((activeMic.heard + ' ' + text).trim()); });
      DICT.onState(({ state }) => { if (state === 'idle' && activeMic) { const m = activeMic; activeMic = null; m.end(); } });
    } catch (_) { DICT = null; }
  }

  function blocks(markup) {
    return h('span', { class: 'sent' }, SEM.colorSegments(markup).map(s => {
      if (!s.t.trim()) return ' ';
      const sp = h('span', { class: 'b ' + s.c }, s.t === '___' ? '…' : s.t.trim());
      return [/^\s/.test(s.t) ? ' ' : null, sp, /\s$/.test(s.t) ? ' ' : null];
    }));
  }
  /* Una frase con sus tres líneas: inglés · cómo se pronuncia · qué significa. */
  function line(markup, es, opts) {
    opts = opts || {};
    return h('div', { class: 'say' + (opts.big ? ' big' : '') },
      h('div', { class: 'en' }, opts.colors === false ? h('span', { class: 'sent' }, plain(markup)) : blocks(markup)),
      h('div', { class: 'pr' }, '🗣️ ', pron(markup)),
      es ? h('div', { class: 'es' }, '🇪🇸 ', es) : null,
      opts.noAudio ? null : listenBtns(markup));
  }

  /* ---------- curso: orden fijo ---------- */
  const COURSE = (function () {
    const catIdx = {}; SEM.CATS.forEach((c, i) => { catIdx[c.id] = i; });
    const pos = {}; SEM.patterns.forEach((p, i) => { pos[p.id] = i; });
    const out = []; const placed = new Set();
    for (let st = 1; st <= 6; st++) {
      const list = SEM.patterns.filter(p => p.st === st).sort((a, b) => catIdx[a.cat] - catIdx[b.cat] || pos[a.id] - pos[b.id]);
      while (list.length) {
        const k = list.findIndex(p => (p.req || []).every(r => !SEM.byId[r] || placed.has(r) || SEM.byId[r].st > st));
        const p = list.splice(k < 0 ? 0 : k, 1)[0];
        out.push(p); placed.add(p.id);
      }
    }
    return out;
  })();

  /* ---------- trucos de memoria en secuencia ---------- */
  const TRICKS = [
    { at: 1, n: 'Imagen viva', how: 'Convierte la frase en una imagen mental grande, con color y movimiento.', apply: p => 'Imagina ' + p.img + ' gigante haciendo lo que dice la frase mientras la dices en voz alta.' },
    { at: 4, n: 'Bloques', how: 'La parte amarilla es UN bloque fijo que se dice de un tirón; solo cambia el hueco.', apply: p => 'Di «' + plain(p.f).replace('___', '').replace(/\s+/g, ' ').trim() + '» como si fuera una sola palabra: «' + pron(p.f.replace(/\[[A-Z]:___\]/, '')).trim() + '».' },
    { at: 8, n: 'Decirlo sin mirar', how: 'Antes de ver la ayuda, intenta decir la frase. Ese esfuerzo es lo que la fija en la memoria.', apply: () => 'En la conversación sin ayuda, intenta primero y solo después pulsa «Ver ayuda».' },
    { at: 12, n: 'Repasar justo a tiempo', how: 'No repitas todo hoy: la app te devuelve cada frase justo antes de que la olvides.', apply: () => 'Hoy dila bien 3 veces y mañana el repaso hará el resto.' },
    { at: 17, n: 'Palacio de la memoria', how: 'Deja cada frase en un lugar de tu casa y recórrela mentalmente.', apply: p => 'Pon ' + p.img + ' y esta frase en la puerta de tu casa. Cuando pases por la puerta, dila.' },
    { at: 23, n: 'Mini historia', how: 'Une la frase nueva con la anterior en una historia corta. Las historias guardan el orden.', apply: () => 'Inventa una escena donde dices esta frase justo después de la de la lección anterior.' },
    { at: 30, n: 'Sombra (shadowing)', how: 'Pulsa Escuchar y habla AL MISMO TIEMPO que la voz, copiando su ritmo y su música.', apply: () => 'Pulsa 🐢 Lento y habla a la vez que la voz; luego a velocidad normal.' },
    { at: 38, n: 'Tu propia vida', how: 'Lo que dices de ti mismo se recuerda mucho mejor que una frase de libro.', apply: () => 'Cambia la frase para que sea verdad sobre ti y dila en voz alta.' },
    { at: 47, n: 'Todos los sentidos', how: 'Ve la imagen, oye la frase, dila y muévete: cuantas más rutas, más fácil recordar.', apply: () => 'Di la frase con el gesto que harías en la vida real.' }
  ];
  const trickFor = n => { let t = null; TRICKS.forEach(x => { if (n >= x.at) t = x; }); return t; };

  /* ---------- conversaciones A/B por tema (la persona B eres tú) ---------- */
  const OPENERS = {
    yo: [['So, tell me a little about yourself.', 'Cuéntame un poco sobre ti.'], ['Oh, nice. What else?', 'Qué bien. ¿Qué más?'], ['Cool. Nice to meet you!', 'Genial. ¡Un gusto conocerte!']],
    saludos: [['Hey! Long time no see.', '¡Hola! Cuánto tiempo.'], ['Ha, yeah. So what\'s new?', 'Ja, sí. ¿Y qué hay de nuevo?'], ['Good to see you!', '¡Qué bueno verte!']],
    necesidades: [['Hey, are you okay? What\'s going on?', 'Oye, ¿estás bien? ¿Qué pasa?'], ['I see. Anything else?', 'Ya veo. ¿Algo más?'], ['Got it. Let me know if I can help.', 'Entendido. Avísame si puedo ayudar.']],
    diario: [['So what\'s a normal day like for you?', '¿Y cómo es un día normal para ti?'], ['Really? And then?', '¿En serio? ¿Y luego?'], ['Sounds like a busy day!', '¡Suena a un día ocupado!']],
    casa: [['How\'s everything at home?', '¿Cómo va todo en casa?'], ['Oh yeah? Tell me more.', '¿Ah, sí? Cuéntame más.'], ['That\'s nice.', 'Qué lindo.']],
    trabajo: [['So how\'s work going?', '¿Y cómo va el trabajo?'], ['Interesting. What else?', 'Interesante. ¿Qué más?'], ['Good luck with that!', '¡Mucha suerte con eso!']],
    comida: [['Hi, are you ready to order?', 'Hola, ¿ya sabe qué va a pedir?'], ['Sure. Anything else?', 'Claro. ¿Algo más?'], ['Perfect, coming right up.', 'Perfecto, enseguida se lo traigo.']],
    compras: [['Hi, can I help you with anything?', 'Hola, ¿le ayudo en algo?'], ['Sure, let me check.', 'Claro, déjeme ver.'], ['Here you go. Have a nice day!', 'Aquí tiene. ¡Que tenga un buen día!']],
    transporte: [['Hey, you look lost. Can I help?', 'Oye, pareces perdido. ¿Te ayudo?'], ['Okay. What else do you need?', 'Vale. ¿Qué más necesitas?'], ['No problem. Have a good one!', 'De nada. ¡Que te vaya bien!']],
    preguntas: [['Sure, go ahead. Ask me anything.', 'Claro, adelante. Pregúntame lo que quieras.'], ['Hmm, good question. Anything else?', 'Mmm, buena pregunta. ¿Algo más?'], ['Ha, okay. Let me think about it.', 'Ja, vale. Déjame pensarlo.']],
    peticiones: [['Hey, what do you need?', 'Oye, ¿qué necesitas?'], ['Sure, no problem. Anything else?', 'Claro, sin problema. ¿Algo más?'], ['Of course. I\'ll do it.', 'Claro. Yo lo hago.']],
    permisos: [['Hi, how can I help you?', 'Hola, ¿en qué te puedo ayudar?'], ['Sure, go ahead. Anything else?', 'Claro, adelante. ¿Algo más?'], ['No problem at all.', 'Ningún problema.']],
    opiniones: [['So, what do you think?', '¿Y tú qué piensas?'], ['Really? Why?', '¿En serio? ¿Por qué?'], ['Interesting point.', 'Buen punto.']],
    emociones: [['Hey, how are you feeling?', 'Oye, ¿cómo te sientes?'], ['Really? Tell me more.', '¿En serio? Cuéntame más.'], ['I hear you.', 'Te entiendo.']],
    describir: [['So, what\'s it like?', '¿Y cómo es?'], ['Oh, interesting. What else?', 'Ah, interesante. ¿Qué más?'], ['Sounds great.', 'Suena genial.']],
    explicar: [['So what happened?', '¿Y qué pasó?'], ['Oh, wow. And then?', 'Uy. ¿Y luego?'], ['I see. Thanks for explaining.', 'Ya veo. Gracias por explicarme.']],
    experiencias: [['So, how was it?', '¿Y qué tal fue?'], ['No way! And then?', '¡No puede ser! ¿Y luego?'], ['What a story!', '¡Qué historia!']],
    pasado: [['So what did you do yesterday?', '¿Y qué hiciste ayer?'], ['Nice. What else?', 'Qué bien. ¿Qué más?'], ['Sounds like a good day.', 'Suena a un buen día.']],
    presente: [['Hey, what are you up to these days?', 'Oye, ¿en qué andas estos días?'], ['Oh really? How\'s that going?', '¿Ah, sí? ¿Y cómo va eso?'], ['Cool, good for you.', 'Genial, me alegro por ti.']],
    futuro: [['So what are your plans?', '¿Y cuáles son tus planes?'], ['Nice! When?', '¡Qué bien! ¿Cuándo?'], ['Sounds exciting!', '¡Suena emocionante!']],
    planes: [['Hey, what are you doing this weekend?', 'Oye, ¿qué haces este fin de semana?'], ['Oh, cool. Anything else?', 'Ah, genial. ¿Algo más?'], ['Sounds like a plan!', '¡Me parece un buen plan!']],
    problemas: [['You look worried. What\'s wrong?', 'Pareces preocupado. ¿Qué pasa?'], ['Oh no. What are you going to do?', 'Ay, no. ¿Qué vas a hacer?'], ['I hope it works out.', 'Espero que salga bien.']],
    acuerdos: [['I think we should leave early. What do you think?', 'Creo que deberíamos salir temprano. ¿Qué opinas?'], ['Hmm, okay. Anything else?', 'Mmm, vale. ¿Algo más?'], ['Fair enough.', 'Me parece justo.']],
    telefono: [['Hello?', '¿Hola?'], ['Okay, sure. Anything else?', 'Vale, claro. ¿Algo más?'], ['Got it. Talk to you later!', 'Entendido. ¡Hablamos luego!']],
    informal: [['Hey! What\'s up?', '¡Hola! ¿Qué tal?'], ['Ha, nice. What else?', 'Ja, genial. ¿Qué más?'], ['Cool, see you around!', '¡Genial, nos vemos!']],
    coloquial: [['So how did it go?', '¿Y cómo te fue?'], ['Ha, really?', 'Ja, ¿en serio?'], ['Nice!', '¡Genial!']],
    conectores: [['So how\'s it going? Tell me everything.', '¿Y cómo va todo? Cuéntamelo todo.'], ['Oh, I see. And?', 'Ah, ya veo. ¿Y?'], ['Makes sense.', 'Tiene sentido.']],
    complejas: [['So what would you do?', '¿Y tú qué harías?'], ['Hmm, interesting. Why?', 'Mmm, interesante. ¿Por qué?'], ['That makes sense.', 'Eso tiene sentido.']],
    profesional: [['Thanks for coming in. Shall we get started?', 'Gracias por venir. ¿Empezamos?'], ['Great. Anything else to add?', 'Perfecto. ¿Algo más que añadir?'], ['Perfect, thank you.', 'Perfecto, gracias.']],
    avanzado: [['So, what\'s your take on it?', '¿Y tú qué opinas de eso?'], ['Hmm, fair point. Go on.', 'Mmm, buen punto. Sigue.'], ['I see where you\'re coming from.', 'Entiendo tu punto de vista.']],
    viajes: [['Hi there, how can I help you today?', 'Hola, ¿en qué le puedo ayudar hoy?'], ['Sure. Anything else?', 'Claro. ¿Algo más?'], ['Enjoy your stay!', '¡Disfrute su estancia!']],
    salud: [['So what brings you in today?', '¿Y qué le trae por aquí hoy?'], ['I see. Anything else?', 'Ya veo. ¿Algo más?'], ['Okay, let\'s take a look.', 'Bien, vamos a ver.']],
    relaciones: [['So how do you two know each other?', '¿Y de qué se conocen ustedes?'], ['Aw, that\'s nice. What else?', 'Qué lindo. ¿Qué más?'], ['That\'s so sweet.', 'Qué tierno.']]
  };

  /* ---------- material de cada lección ---------- */
  const clean = e => !/ \/ |—|\(/.test(plain(e[0])) && plain(e[0]).split(' ').length <= 14;
  function material(p) {
    const ex = p.ex.filter(clean).map(e => ({ m: e[0], es: e[1], alt: e[2] || [] }));
    const all = ex.length ? ex : p.ex.map(e => ({ m: e[0], es: e[1], alt: e[2] || [] }));
    const gen = (p.sl || []).length && /___/.test(p.f) ? p.sl.map(([en, es]) => ({ m: SEM.fill(p.f, en), es: cap(SEM.fillEs(p.es, es)), alt: [] })) : [];
    return { ex: all, gen };
  }
  /* Conversación A/B: la de la estructura si existe; si no, una con la apertura del tema y tus frases. */
  function conversation(p, mat) {
    if (p.dlg && p.dlg.length >= 3) return p.dlg.map(l => ({ who: l[0], en: l[1], es: l[2], alt: l[3] || [] }));
    const op = OPENERS[p.cat] || OPENERS.informal;
    const pool = mat.ex.filter(s => !/\?\s*$/.test(plain(s.m)) || p.cat === 'preguntas').concat(mat.gen);
    const b1 = pool[0] || mat.ex[0], b2 = pool.find(s => s !== b1 && SEM.norm(s.m) !== SEM.norm(b1.m)) || mat.gen[1] || mat.ex[1] || b1;
    return [
      { who: 'A', en: op[0][0], es: op[0][1] },
      { who: 'B', en: plain(b1.m), es: b1.es, alt: b1.alt },
      { who: 'A', en: op[1][0], es: op[1][1] },
      { who: 'B', en: plain(b2.m), es: b2.es, alt: b2.alt },
      { who: 'A', en: op[2][0], es: op[2][1] }
    ];
  }
  /* Guion de respaldo con varias respuestas tuyas: la conversación base + preguntas de seguimiento del tema. */
  function longScript(p, mat, minB) {
    const base = conversation(p, mat);
    const used = new Set(base.filter(l => l.who === 'B').map(l => SEM.norm(l.en)));
    const op = OPENERS[p.cat] || OPENERS.informal;
    const pool = shuffle(mat.gen.concat(mat.ex)).filter(x => !used.has(SEM.norm(x.m)) && !/\?\s*$/.test(plain(x.m)));
    const out = base.slice();
    const closing = out[out.length - 1] && out[out.length - 1].who === 'A' ? out.pop() : { who: 'A', en: op[2][0], es: op[2][1] };
    const follow = [['Oh, really? Tell me more.', '¿Ah, sí? Cuéntame más.'], [op[1][0], op[1][1]], ['Cool. What else?', 'Genial. ¿Qué más?'], ['Interesting!', '¡Interesante!']];
    let k = 0;
    while (out.filter(l => l.who === 'B').length < minB && pool.length) {
      const f = follow[k++ % follow.length]; const x = pool.shift();
      out.push({ who: 'A', en: f[0], es: f[1] }, { who: 'B', en: plain(x.m), es: x.es, alt: x.alt });
    }
    out.push(closing);
    return out;
  }
  function meaningOptions(p, s) {
    const others = shuffle(SEM.patterns.filter(q => q.id !== p.id)).map(q => q.ex.find(clean)).filter(Boolean).filter(e => e[1] !== s.es).slice(0, 2).map(e => e[1]);
    return shuffle([{ t: s.es, ok: true }].concat(others.map(t => ({ t, ok: false }))));
  }

  /* ---------- progreso guardado ---------- */
  let S = { v: 2, next: 0, done: {}, days: [], perDay: {} };
  const Save = {
    ref: null, label: 'Guardado en este navegador', timer: null, busy: false, again: false,
    async init() {
      try { const raw = localStorage.getItem('curso-ingles'); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch (_) { /* sin almacenamiento local */ }
      if (!(window.claude && typeof window.claude.use === 'function')) return;
      try {
        const res = await Promise.race([Promise.all([window.claude.use('db'), window.claude.use('user')]), new Promise(r => setTimeout(() => r(null), 9000))]);
        if (!res || !res[0] || !res[1]) return;
        const id = await res[1].id();
        if (!id) return;
        this.ref = res[0].collection('data/users/' + id).doc('curso');
        const snap = await this.ref.get();
        if (snap.exists) { const d = snap.data(); if (d && (d.next || 0) >= (S.next || 0)) S = Object.assign({ v: 2, next: 0, done: {}, days: [], perDay: {} }, JSON.parse(JSON.stringify(d))); }
        this.label = 'Guardado en tu cuenta';
      } catch (_) { this.ref = null; }
    },
    save() {
      try { localStorage.setItem('curso-ingles', JSON.stringify(S)); } catch (_) { /* sin almacenamiento local */ }
      if (!this.ref) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush(), 300);
    },
    async flush() {
      if (this.busy) { this.again = true; return; }
      this.busy = true;
      try { await this.ref.set(JSON.parse(JSON.stringify(S))); this.label = 'Guardado en tu cuenta'; }
      catch (_) { this.label = 'No se pudo guardar en tu cuenta; quedó en este navegador'; }
      this.busy = false;
      if (this.again) { this.again = false; this.flush(); }
      const el = document.getElementById('savelbl'); if (el) el.textContent = this.label;
    }
  };
  function markDay() { const d = today(); if (!S.days.includes(d)) S.days.push(d); if (S.days.length > 400) S.days.shift(); }
  function streak() {
    let n = 0; const d = new Date();
    const key = x => x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate();
    if (!S.days.includes(key(d))) d.setDate(d.getDate() - 1);
    while (S.days.includes(key(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  const dueReviews = () => Object.keys(S.done).filter(id => SEM.byId[id] && S.done[id].due <= Date.now()).sort((a, b) => S.done[a].due - S.done[b].due);

  /* ---------- marco de pantalla ---------- */
  function foot(label, action) {
    $foot.innerHTML = '';
    if (!label) { $foot.hidden = true; return; }
    $foot.hidden = false;
    $foot.append(h('div', { class: 'inner' }, h('button', { class: 'btn main', type: 'button', id: 'mainbtn', onclick: action }, label)));
  }
  const appendAll = (el, ...kids) => kids.forEach(k => { if (k != null && k !== false) el.append(k); });
  function screen(...kids) { $app.innerHTML = ''; kids.forEach(k => k && $app.append(k)); window.scrollTo(0, 0); }
  function topbar(i, n, label) {
    return h('div', { class: 'top' }, h('button', { class: 'btn', type: 'button', onclick: home, 'aria-label': 'Salir al inicio' }, '✕'), h('div', { class: 'bar' }, h('i', { style: 'width:' + (i / n * 100) + '%' })), h('span', { class: 'small muted' }, label));
  }

  /* Bloque «Dilo en voz alta»: micrófono si está disponible, si no confirmación propia. Nunca bloquea. */
  function sayIt(target, alts, onResult) {
    const box = h('div', { class: 'mic' });
    const fb = h('div');
    let finished = false;
    if (DICT) {
      const btn = h('button', { class: 'btn mic-btn', type: 'button' }, '🎙️ Pulsa y dilo');
      const mic = { heard: '', end: () => {
        btn.textContent = '🎙️ Decirlo otra vez';
        const r = SEM.check(mic.heard, [plain(target)].concat(alts || []));
        fb.innerHTML = '';
        fb.append(h('div', { class: 'res ' + (r.grade !== 'no' ? 'good' : 'bad') }, h('div', null, 'Te entendí: «' + (mic.heard || '…') + '»'),
          h('b', null, r.grade === 'ok' ? '✓ ¡Muy bien!' : r.grade === 'almost' ? '≈ ¡Casi! Repite la parte que falta.' : 'Inténtalo otra vez escuchando el audio.'),
          h('div', { class: 'small muted' }, 'Si el micrófono te entendió, vas bien. La pronunciación compárala con el audio.')));
        if (!finished && r.grade !== 'no') { finished = true; onResult(true); }
      } };
      btn.addEventListener('click', () => {
        if (activeMic === mic) { try { DICT.stop(); } catch (_) { /* ya parado */ } return; }
        mic.heard = ''; activeMic = mic;
        btn.textContent = '🎙️ Te escucho… (toca para terminar)';
        let p; try { p = DICT.start({ language: 'en-US' }); } catch (e) { p = Promise.reject(e); }
        Promise.resolve(p).catch(() => { activeMic = null; btn.remove(); fb.innerHTML = ''; fb.append(h('p', { class: 'small muted' }, 'No se pudo usar el micrófono. Dila en voz alta y sigue con el botón de abajo.')); });
      });
      box.append(btn);
    } else {
      box.append(h('p', { class: 'small muted' }, '🎙️ Dila en voz alta (ayúdate con la pronunciación) y sigue con el botón de abajo.'));
    }
    box.append(fb);
    return box;
  }

  /* ---------- inicio ---------- */
  function home() {
    const n = S.next;
    const p = COURSE[n];
    const due = dueReviews();
    const t = p ? trickFor(n + 1) : null;
    const todayN = S.perDay[today()] || 0;
    screen(
      h('div', { class: 'top' }, h('b', null, 'Inglés para hablar'), h('div', { class: 'bar' }, h('i', { style: 'width:' + (n / COURSE.length * 100) + '%' })), h('span', { class: 'small muted' }, n + '/' + COURSE.length)),
      p ? h('div', { class: 'card' },
        h('div', { class: 'step-name' }, 'Lección ' + (n + 1) + ' de ' + COURSE.length + ' · Nivel ' + CEFR[p.st - 1]),
        h('h1', null, cap(p.m.replace(/\.$/, ''))),
        h('p', { class: 'muted' }, 'Tema: ' + SEM.catById[p.cat].name + '. Vas a aprender a decir:'),
        line(p.ex.filter(clean)[0] ? p.ex.filter(clean)[0][0] : p.ex[0][0], (p.ex.filter(clean)[0] || p.ex[0])[1], { noAudio: true }),
        due.length ? h('p', { class: 'note' }, 'Antes, un repaso hablado de ' + Math.min(due.length, 5) + ' frases que estás a punto de olvidar.') : null,
        todayN >= 3 ? h('p', { class: 'note' }, 'Hoy ya hiciste ' + todayN + ' lecciones. Puedes seguir, pero descansar ayuda a recordar.') : null)
        : h('div', { class: 'card' }, h('h1', null, '¡Terminaste el curso! 🎉'), h('p', null, 'Sigue con los repasos para no olvidar.')),
      t ? h('div', { class: 'card trick' }, h('div', { class: 't' }, '🧠 Truco de memoria actual: ' + t.n), h('div', null, t.how)) : null,
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', null, Object.keys(S.done).length), h('span', { class: 'small muted' }, 'lecciones hechas')),
        h('div', { class: 'stat' }, h('b', null, streak() + ' 🔥'), h('span', { class: 'small muted' }, 'días seguidos')),
        h('div', { class: 'stat' }, h('b', null, due.length), h('span', { class: 'small muted' }, 'repasos pendientes'))),
      h('details', { class: 'card' }, h('summary', null, 'Cómo leer la pronunciación'), h('p', { class: 'small' }, '🗣️ es cómo suena, escrito con letras del español. La tilde marca la parte fuerte. «j» suena como una h suave. «z» se dice con la lengua entre los dientes (como la «th» inglesa). La «r» suave entre vocales es la «t» americana (water = uárer). Las palabras se juntan como al hablar rápido: «want to» suena «uána»; «going to», «góna».')),
      Object.keys(S.done).length ? h('div', { class: 'card' }, h('b', null, '💬 Conversación libre por voz'), h('p', { class: 'small muted' }, 'Habla de tu vida usando todo lo que ya aprendiste. Cuanto más avanzas, menos ayuda verás.'),
        h('button', { class: 'btn', type: 'button', onclick: freeTalk }, 'Hablar ahora')) : null,
      syllabus(),
      h('p', { class: 'save', id: 'savelbl' }, Save.label));
    foot(due.length ? 'Empezar (repaso + lección ' + (n + 1) + ')' : p ? 'Empezar lección ' + (n + 1) : null, () => { if (due.length) review(due.slice(0, 5)); else if (p) lesson(p); });
  }
  function syllabus() {
    const box = h('details', { class: 'card' }, h('summary', null, 'Ver el temario completo (' + COURSE.length + ' lecciones)'));
    const map = h('div', { class: 'map' });
    let st = 0;
    COURSE.forEach((p, i) => {
      if (p.st !== st) { st = p.st; map.append(h('div', { class: 'stage' }, 'Nivel ' + CEFR[st - 1] + ' — ' + SEM.STAGES[st - 1].desc)); }
      const trick = TRICKS.find(t => t.at === i + 1);
      if (trick) map.append(h('div', { class: 'row' }, h('span', { class: 'n' }, '🧠'), h('span', { class: 'small' }, 'Truco nuevo: ' + trick.n)));
      map.append(h('div', { class: 'row' + (S.done[p.id] ? ' done' : '') + (i === S.next ? ' now' : '') }, h('span', { class: 'n' }, S.done[p.id] ? '✓' : i + 1), h('div', null, h('div', null, cap(p.m.replace(/\.$/, ''))), h('div', { class: 'small muted' }, plain(p.f).replace('___', '…')))));
    });
    box.append(map);
    return box;
  }

  /* ---------- lección ---------- */
  function lesson(p) {
    const n = COURSE.indexOf(p);
    const mat = material(p);
    const conv = conversation(p, mat);
    const score = { ok: 0, total: 0 };
    const steps = [stepLook(p, n, mat), stepTalk({ p, n, mat, conv: longScript(p, mat, 4), score, mode: 'lesson' })];
    let i = 0;
    const next = () => { i++; if (i >= steps.length) finish(); else run(); };
    const run = () => { const card = steps[i](next); screen(topbar(i, steps.length, 'Paso ' + (i + 1) + ' de ' + steps.length), card); };
    function finish() {
      const prev = S.done[p.id];
      const ratio = score.turns ? Math.min(1, (score.target + 1) / score.turns + 0.3) : 1;
      const box = ratio >= 0.7 ? 1 : 0;
      S.done[p.id] = { score: ratio, box, ts: Date.now(), due: Date.now() + BOX_DAYS[box] * DAY - 3 * 3600000 };
      if (!prev && n === S.next) S.next = n + 1;
      markDay(); S.perDay[today()] = (S.perDay[today()] || 0) + 1;
      Save.save();
      screen(h('div', { class: 'card' }, h('h1', null, '✓ Lección completada'),
        h('p', null, 'Respondiste ' + (score.turns || 0) + ' veces en inglés' + (score.target ? ' y usaste la estructura nueva ' + score.target + ' veces.' : '.')),
        score.fixes && score.fixes.length ? h('div', { class: 'note' }, h('b', null, 'Para la próxima, dilo así:'), score.fixes.slice(-4).map(f => line(f.en, null))) : null,
        h('p', { class: 'muted' }, ratio >= 0.7 ? 'Muy bien. Volverá en un repaso hablado dentro de ' + BOX_DAYS[box] + ' día(s).' : 'Volverá mañana en el repaso para reforzarla. Es normal: así se aprende.'),
        h('button', { class: 'btn', type: 'button', onclick: home }, 'Volver al inicio')),
        h('p', { class: 'save', id: 'savelbl' }, Save.label));
      const np = COURSE[S.next];
      foot(np ? 'Siguiente lección →' : 'Volver al inicio', () => { if (np) lesson(np); else home(); });
    }
    run();
  }

  function stepLook(p, n, mat) {
    return (next) => {
      const t = trickFor(n + 1);
      const isNew = t && t.at === n + 1;
      speak(mat.ex[0].m);
      foot('Siguiente →', next);
      return h('div', null,
        t ? h('div', { class: 'card trick' }, h('div', { class: 't' }, (isNew ? '🧠 NUEVO truco de memoria: ' : '🧠 Truco de memoria: ') + t.n), isNew ? h('p', null, t.how) : null, h('div', null, h('b', null, 'Con esta frase: '), t.apply(p))) : null,
        h('div', { class: 'card' },
          h('div', { class: 'step-name' }, '1 · Mira y escucha'),
          h('div', { style: 'font-size:2.6rem' }, p.img),
          h('h1', null, cap(p.m.replace(/\.$/, ''))),
          h('p', { class: 'muted small' }, 'La parte amarilla nunca cambia; se dice de un tirón. Lo demás lo cambias para decir lo que quieras.'),
          line(p.f, 'En español: ' + p.es.replace('[___]', '…'), { noAudio: true }),
          h('h2', null, 'Así lo dicen los nativos'),
          mat.ex.slice(0, 3).map(e => line(e.m, e.es)),
          p.n ? h('p', { class: 'note' }, '💡 ' + p.n) : null,
          p.bad && p.bad[0] ? h('p', { class: 'note' }, 'No digas: ', h('span', { class: 'err' }, p.bad[0][0]), ' → di: ', h('span', { class: 'ok' }, p.bad[0][1])) : null));
    };
  }

  function stepRepeat(s, k, total, score) {
    return (next) => {
      speak(s.m);
      foot('Siguiente →', next);
      return h('div', { class: 'card' }, h('div', { class: 'step-name' }, '2 · Escucha y repite como un nativo (' + k + ' de ' + total + ')'),
        h('p', { class: 'muted small' }, 'Escucha, lee la pronunciación y dila en voz alta 2 veces, copiando el ritmo.'),
        line(s.m, s.es, { big: true }),
        sayIt(s.m, s.alt, ok => { score.total++; if (ok) score.ok++; }));
    };
  }

  /* Conversación A/B. Con ayuda: ves tu frase completa. Sin ayuda: solo el español; la ayuda aparece si la pides. */
  function stepConversation(conv, helped, score) {
    return (next) => {
      const log = h('div', { class: 'conv' });
      let i = 0;
      const card = h('div', { class: 'card' }, h('div', { class: 'step-name' }, helped ? '3 · Conversación guiada (con ayuda)' : '4 · La misma conversación, ahora sin ayuda'),
        h('p', { class: 'muted small' }, helped ? 'Tú eres B. Lee tu frase con ayuda de la pronunciación y dila en voz alta.' : 'Tú eres B. Ahora solo ves el español: intenta decirlo en inglés. Si no te sale, pulsa «Ver ayuda».'), log);
      const advance = () => {
        while (i < conv.length && conv[i].who === 'A') {
          const L = conv[i];
          log.append(h('div', { class: 'bubble a' }, h('div', { class: 'who' }, 'A'), line(L.en, L.es, { colors: false })));
          speak(L.en);
          i++;
        }
        if (i >= conv.length) { foot('Siguiente →', next); return; }
        const L = conv[i];
        const bub = h('div', { class: 'bubble b' }, h('div', { class: 'who' }, 'Tú (B)'));
        if (helped) {
          bub.append(line(L.en, L.es, { big: true, colors: false }));
        } else {
          bub.append(h('div', { class: 'es big-es' }, '🇪🇸 Di en inglés: «' + L.es + '»'));
          const help = h('div');
          help.append(h('button', { class: 'btn', type: 'button', onclick: e => { e.target.remove(); help.append(line(L.en, null, { colors: false })); } }, '👀 Ver ayuda'));
          bub.append(help);
        }
        bub.append(sayIt(L.en, L.alt, ok => { score.total++; if (ok) score.ok++; }));
        log.append(bub);
        i++;
        foot(i >= conv.length ? 'Siguiente →' : 'Ya lo dije · seguir →', () => {
          if (!helped) { const hb = bub.querySelector('.btn'); if (hb && hb.textContent.includes('Ver ayuda')) hb.click(); }
          if (i >= conv.length) next(); else { advance(); setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 50); }
        });
      };
      advance();
      return card;
    };
  }

  function stepSolo(s, k, total, score) {
    return (next) => {
      const help = h('div');
      let shown = false;
      const show = () => {
        if (shown) return; shown = true; help.innerHTML = ''; help.append(line(s.m, null, { big: true })); speak(s.m);
        if (!DICT) help.append(h('div', { class: 'lb' }, h('span', { class: 'small muted' }, '¿Te salió?'),
          h('button', { class: 'btn speak', type: 'button', onclick: e => { score.total++; score.ok++; e.target.parentNode.replaceWith(h('p', { class: 'ok' }, '✓ ¡Bien!')); } }, '✓ Sí'),
          h('button', { class: 'btn speak', type: 'button', onclick: e => { score.total++; e.target.parentNode.replaceWith(h('p', { class: 'muted small' }, 'Volverá en el repaso.')); } }, '✗ No')));
      };
      foot('Ver cómo se dice', () => { show(); foot('Siguiente →', next); });
      return h('div', { class: 'card' }, h('div', { class: 'step-name' }, '5 · Dilo tú, sin mirar (' + k + ' de ' + total + ')'),
        h('p', { class: 'big-q' }, '¿Cómo dirías: «' + s.es + '»?'),
        h('p', { class: 'muted small' }, 'Usa el molde que aprendiste. Dilo en voz alta y después pulsa el botón para comprobar.'),
        sayIt(s.m, s.alt, () => { score.total++; score.ok++; show(); foot('Siguiente →', next); }),
        help);
    };
  }

  function stepOrder(s, score) {
    return (next) => {
      const target = SEM.chunks(s.m, false);
      let pool = shuffle(target.map((c, i) => Object.assign({ i }, c)));
      if (pool.length > 1 && pool.every((c, k) => c.i === k)) pool.reverse();
      const picked = [];
      const lineEl = h('div', { class: 'chips', 'aria-label': 'Tu frase' });
      const bank = h('div', { class: 'chips' });
      const res = h('div');
      let checked = false;
      const check = () => {
        if (checked) return; checked = true;
        const ok = SEM.norm(picked.map(c => c.t).join(' ')) === SEM.norm(plain(s.m));
        score.total++; if (ok) score.ok++;
        bank.remove();
        res.append(h('div', { class: 'res ' + (ok ? 'good' : 'bad') }, h('b', null, ok ? '✓ ¡Correcto!' : 'Así es el orden correcto:'), line(s.m, s.es)));
        speak(s.m);
        foot('Siguiente →', next);
      };
      const draw = () => {
        lineEl.innerHTML = ''; bank.innerHTML = '';
        picked.forEach((c, k) => lineEl.append(h('button', { type: 'button', onclick: () => { if (!checked) { picked.splice(k, 1); draw(); } } }, c.t)));
        pool.forEach(c => bank.append(h('button', { type: 'button', class: picked.includes(c) ? 'used' : '', onclick: () => { picked.push(c); draw(); if (picked.length === pool.length) check(); } }, c.t)));
      };
      draw();
      foot('Ver la respuesta', check);
      return h('div', { class: 'card' }, h('div', { class: 'step-name' }, '6 · Ordena la frase'),
        h('p', { class: 'big-q' }, '«' + s.es + '»'), h('p', { class: 'muted small' }, 'Toca los bloques en orden.'), lineEl, bank, res);
    };
  }

  function stepListen(p, s, score) {
    return (next) => {
      const opts = meaningOptions(p, s);
      const res = h('div');
      let answered = false;
      const btns = opts.map(o => h('button', { type: 'button', onclick: () => choose(o) }, o.t));
      function choose(o) {
        if (answered) return; answered = true;
        score.total++; if (o && o.ok) score.ok++;
        btns.forEach((b, k) => { b.disabled = true; if (opts[k].ok) b.classList.add('right'); else if (opts[k] === o) b.classList.add('wrong'); });
        res.append(h('div', { class: 'res ' + (o && o.ok ? 'good' : 'bad') }, h('b', null, o && o.ok ? '✓ ¡Lo entendiste!' : 'Esto es lo que dijo:'), line(s.m, s.es)));
        foot('Siguiente →', next);
      }
      setTimeout(() => speak(s.m), 300);
      foot('Ver la respuesta', () => choose(null));
      return h('div', { class: 'card' }, h('div', { class: 'step-name' }, '7 · Escucha y elige'),
        h('p', { class: 'big-q' }, '¿Qué significa lo que escuchas?'),
        canSpeak ? h('div', { class: 'lb' }, h('button', { class: 'btn', type: 'button', onclick: () => speak(s.m) }, '🔊 Escuchar otra vez'), h('button', { class: 'btn', type: 'button', onclick: () => speak(s.m, true) }, '🐢 Lento'))
          : h('p', { class: 'note' }, 'Tu navegador no tiene voz: lee la frase. ', plain(s.m)),
        h('div', { class: 'opts' }, btns), res);
    };
  }


  /* ================= CONVERSACIÓN POR VOZ =================
     Claude hace de A: contesta a lo que dices, te corrige con amabilidad y te sugiere respuestas.
     Si Claude no está disponible, sigue un guion con la misma mecánica. La ayuda se va retirando
     a medida que avanzas en el curso. */
  let SAMPLE = null, sampleOff = false;
  async function initAI() {
    try { if (window.claude && window.claude.use) { SAMPLE = await window.claude.use('sample'); TTS = await window.claude.use('tts'); } } catch (_) { SAMPLE = null; }
  }
  const helpLevel = n => (n < 12 ? 'siempre' : n < 50 ? 'al principio' : 'si la pides');
  function learnedTitles() { return COURSE.filter(q => S.done[q.id]).slice(-10).map(q => plain(q.f).replace('___', '…')); }
  async function partner(ctx, history, said) {
    const lvl = CEFR[(ctx.p ? ctx.p.st : Math.max(1, ...COURSE.filter(q => S.done[q.id]).map(q => q.st), 1)) - 1];
    const prompt = 'Eres A, un hablante nativo de inglés americano, amable y paciente, conversando por voz con un estudiante hispanohablante (B) de nivel ' + lvl + '. ' +
      'Objetivo: que el estudiante HABLE mucho. ' +
      (ctx.p ? 'Estructura de esta lección (haz preguntas que la provoquen): "' + plain(ctx.p.f).replace('___', '…') + '" (' + ctx.p.m + '). Tema: ' + SEM.catById[ctx.p.cat].name + '. ' : 'Conversación libre sobre su vida diaria. ') +
      'Estructuras que ya conoce: ' + (learnedTitles().join('; ') || 'muy pocas') + '. ' +
      'Reglas: frases cortas y naturales (máx. 15 palabras' + (lvl === 'A1' || lvl === 'A2' ? ', vocabulario muy simple' : '') + '), termina casi siempre con una pregunta, no expliques gramática. ' +
      'Turno del estudiante número ' + ctx.turn + ' de ' + ctx.maxTurns + (ctx.turn >= ctx.maxTurns ? '. Este es el último: cierra la conversación con una despedida amable y sin pregunta.' : '.') + '\n' +
      'Conversación hasta ahora:\n' + history.map(t => (t.who === 'A' ? 'A: ' : 'B: ') + t.en).join('\n') + '\nB acaba de decir (transcripción de voz, puede tener errores de reconocimiento): "' + said + '"\n' +
      'Responde SOLO con JSON: {"reply":"lo que dice A ahora en inglés","reply_es":"traducción natural al español","feedback_es":"una frase corta en español: ánimo y, si hace falta, una corrección (no menciones errores de reconocimiento obvios)","better":"cómo lo diría un nativo, si lo que dijo B no era natural o tenía error; si estaba bien, cadena vacía","used_target":true/false,"suggestions":[{"en":"una respuesta corta que B podría decir a lo que A dice ahora","es":"traducción"},{"en":"otra","es":"traducción"}]}';
    return SAMPLE.json(prompt, { modelTier: 'quick', cache: false });
  }

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function micHelp() {
    return h('details', { class: 'note' }, h('summary', null, '🎙️ ¿Cómo hablo si no aparece el micrófono?'),
      h('p', { class: 'small' }, 'claude.ai solo deja usar el micrófono dentro de la página si la abres en Google Chrome (celular Android o computadora). En la app de Claude o en iPhone usa el micrófono del teclado: toca el cuadro y pulsa 🎤; hablas y se escribe solo.'),
      isIOS ? h('p', { class: 'small' }, 'iPhone: para que te entienda en inglés, añade el teclado «Inglés (EE. UU.)» en Ajustes › General › Teclado › Teclados, y cámbialo con 🌐 antes de pulsar 🎤.') : h('p', { class: 'small' }, 'Android: en el teclado (Gboard) pulsa 🎤. Si te escribe en español, cambia el idioma del teclado a English (US) con la tecla 🌐 o en Ajustes de Gboard › Idiomas.'));
  }

  /* Una pantalla por turno: A habla → tú respondes (voz) → ves cómo te fue → «Siguiente» → próximo turno. */
  function stepTalk(ctx) {
    return (next) => {
      const score = ctx.score;
      score.turns = 0; score.target = 0; score.fixes = [];
      const lessonN = ctx.n == null ? S.next : ctx.n;
      const level = helpLevel(lessonN);
      ctx.maxTurns = ctx.mode === 'free' ? 8 : 5;
      const history = [];
      const script = ctx.conv || [];
      let scriptIdx = 0;
      let scripted = !SAMPLE || sampleOff;
      const card = h('div', { class: 'card talk' });
      const past = h('div', { class: 'conv' });
      let pendingA = null; // lo próximo que dice A

      function scriptedNextA() {
        while (scriptIdx < script.length && script[scriptIdx].who === 'B') scriptIdx++;
        const A = script[scriptIdx]; scriptIdx++;
        const B = script.slice(scriptIdx).find(l => l.who === 'B');
        return { A, B };
      }
      const archive = (who, en, extra) => past.append(h('div', { class: 'bubble ' + (who === 'A' ? 'a' : 'b') }, h('div', { class: 'who' }, who === 'A' ? 'A' : 'Tú'), h('div', { class: 'en sent' }, en), extra || null));

      /* Pantalla de un turno */
      function turn(A, suggestions) {
        if (!A) return end();
        history.push({ who: 'A', en: A.en });
        card.innerHTML = '';
        const answerBox = h('div', { class: 'answer' });
        const status = h('div', { class: 'status small muted' });
        const sugs = (suggestions || []).slice(0, 2);
        const sugEl = sugs.length ? h('div', { class: 'sugs' }, sugs.map(sg => h('div', { class: 'sug' }, line(sg.en, sg.es, { colors: false })))) : null;
        const open = level === 'siempre' || (level === 'al principio' && score.turns < 2);
        appendAll(card,
          h('div', { class: 'step-name' }, (ctx.mode === 'free' ? 'Conversación libre' : '2 · Conversación') + ' · turno ' + (score.turns + 1) + ' de ' + ctx.maxTurns),
          h('div', { class: 'bubble a now' }, h('div', { class: 'who' }, 'A te dice:'), line(A.en, A.es, { colors: false, big: true })),
          h('div', { class: 'small', style: 'font-weight:700;margin-top:12px' }, 'Tu respuesta (en inglés, en voz alta):'),
          answerBox, status,
          sugEl ? (open ? h('div', null, h('div', { class: 'small muted' }, '💡 Puedes responder algo así:'), sugEl) : h('details', null, h('summary', null, '💡 Ideas para responder'), sugEl)) : null,
          past.childNodes.length ? h('details', { class: 'history' }, h('summary', null, 'Ver la conversación hasta ahora'), past) : null);
        speak(A.en);
        window.scrollTo(0, 0);
        if (DICT) voiceAnswer(answerBox, status); else keyboardAnswer(answerBox, status);
      }

      /* Responder con el micrófono de la página */
      function voiceAnswer(box, status) {
        const live = h('div', { class: 'live-text' }, 'Pulsa el botón de abajo y habla.');
        box.append(live, h('button', { class: 'btn small-link', type: 'button', onclick: () => { box.innerHTML = ''; keyboardAnswer(box, status); } }, '⌨️ Mejor uso el micrófono del teclado'));
        const startMic = () => {
          const mic = { heard: '', partial: t => { live.textContent = t || '…'; live.classList.add('on'); }, end: () => {
            live.classList.remove('on');
            if (mic.heard.trim()) send(mic.heard, status);
            else { live.textContent = 'No te escuché. Pulsa otra vez y habla cerca del micrófono.'; foot('🎙️ Pulsa y responde', startMic); }
          } };
          activeMic = mic;
          live.textContent = '🎙️ Te escucho… habla ahora'; live.classList.add('on');
          foot('⏹️ Ya terminé de hablar', () => { try { DICT.stop(); } catch (_) { /* ya parado */ } });
          let pr; try { pr = DICT.start({ language: 'en-US' }); } catch (e) { pr = Promise.reject(e); }
          Promise.resolve(pr).catch(err => {
            activeMic = null; live.classList.remove('on');
            if (err && (err.code === 'unavailable' || err.code === 'not_granted')) { DICT = null; box.innerHTML = ''; status.textContent = err.code === 'not_granted' ? 'No se dio permiso al micrófono de la página.' : 'El micrófono de la página no está disponible aquí.'; keyboardAnswer(box, status); }
            else { live.textContent = 'No se pudo empezar a escuchar. Pulsa otra vez.'; foot('🎙️ Pulsa y responde', startMic); }
          });
        };
        foot('🎙️ Pulsa y responde', startMic);
      }
      /* Responder con el micrófono del teclado (iPhone, app de Claude) */
      function keyboardAnswer(box, status) {
        const ta = h('textarea', { id: 'resp', class: 'resp', rows: '3', placeholder: 'Toca aquí y pulsa 🎤 en tu teclado para hablar', autocomplete: 'off', autocapitalize: 'sentences', spellcheck: 'false', lang: 'en-US' });
        box.append(h('div', { class: 'kbmic' }, '🎙️ Toca el cuadro y pulsa el ', h('b', null, '🎤 de tu teclado'), ': habla en inglés y se escribe solo.'), ta, micHelp());
        const update = () => {
          if (ta.value.trim()) foot('Enviar respuesta ➜', () => send(ta.value, status));
          else foot('🎙️ Responder hablando', () => { ta.focus(); ta.scrollIntoView({ block: 'center' }); status.textContent = 'Ahora pulsa el 🎤 de tu teclado y habla en inglés.'; });
        };
        let had = false;
        ta.addEventListener('input', () => { const has = !!ta.value.trim(); if (has !== had) { had = has; update(); } });
        update();
      }

      async function send(said, status) {
        said = said.trim();
        score.turns++; ctx.turn = score.turns;
        history.push({ who: 'B', en: said });
        foot(null);
        const ans = card.querySelector('.answer');
        ans.innerHTML = '';
        const mine = h('div', { class: 'bubble b' }, h('div', { class: 'who' }, 'Tú dijiste:'), h('div', { class: 'en sent' }, said));
        ans.append(mine);
        let fb = '', better = '', nextA = null, nextSug = [];
        if (!scripted) {
          status.textContent = 'A está pensando…';
          try {
            const r = await partner(ctx, history.slice(0, -1), said);
            fb = r.feedback_es || '';
            if (r.better && SEM.norm(r.better) !== SEM.norm(said)) better = r.better;
            if (r.used_target) score.target++;
            nextA = r.reply ? { en: r.reply, es: r.reply_es || '' } : null;
            nextSug = r.suggestions || [];
          } catch (e) { scripted = true; sampleOff = true; }
        }
        if (scripted) {
          const expected = script.slice(0, scriptIdx).filter(l => l.who === 'B').pop();
          if (expected) {
            const r = SEM.check(said, [expected.en].concat(expected.alt || []));
            if (r.grade === 'ok') fb = '✓ ¡Perfecto!'; else { fb = 'Te entendí. Así lo diría un nativo:'; better = expected.en; }
            if (r.grade !== 'no') score.target++;
          } else fb = '¡Bien dicho!';
          const nx = scriptedNextA();
          nextA = nx.A ? { en: nx.A.en, es: nx.A.es } : null;
          nextSug = nx.B ? [{ en: nx.B.en, es: nx.B.es }] : [];
          if (!nx.B) score.lastScripted = true;
        }
        status.textContent = '';
        if (fb) mine.append(h('div', { class: 'fb' }, '💬 ' + fb));
        if (better) { mine.append(h('div', { class: 'better' }, h('div', { class: 'small muted' }, 'Más natural:'), line(better, null))); if (!score.fixes.some(f => SEM.norm(f.en) === SEM.norm(better))) score.fixes.push({ en: better }); }
        archive('A', history[history.length - 2].en);
        archive('B', said, better ? h('div', { class: 'small muted' }, 'Mejor: ' + better) : null);
        const last = score.turns >= ctx.maxTurns || !nextA || (scripted && score.lastScripted && !nextSug.length);
        if (last) {
          if (nextA) mine.after(h('div', { class: 'bubble a' }, h('div', { class: 'who' }, 'A'), line(nextA.en, nextA.es, { colors: false })));
          if (nextA) speak(nextA.en);
          foot('Terminar la conversación ✓', end);
        } else {
          foot('Siguiente →', () => turn(nextA, nextSug));
        }
      }

      function end() {
        card.innerHTML = '';
        appendAll(card, h('div', { class: 'res good' }, h('b', null, '✓ ¡Conversación terminada!'), h('div', null, 'Respondiste ' + score.turns + ' veces en inglés.')),
          h('details', { class: 'history', open: true }, h('summary', null, 'Tu conversación'), past));
        foot('Continuar →', next);
      }

      // Primer turno: la apertura del guion (inmediata)
      const first = scriptedNextA();
      setTimeout(() => turn(first.A ? { en: first.A.en, es: first.A.es } : null, first.B ? [{ en: first.B.en, es: first.B.es }].concat(ctx.mat ? ctx.mat.ex.slice(1, 2).map(e => ({ en: plain(e.m), es: e.es })) : []) : []), 0);
      return card;
    };
  }

  function freeTalk() {
    const learned = COURSE.filter(q => S.done[q.id]);
    const p = learned.length ? pick(learned.slice(-8)) : COURSE[0];
    const mat = material(p);
    const score = { ok: 0, total: 0 };
    const card = stepTalk({ p: null, n: S.next, mat, conv: longScript(p, mat, 6), score, mode: 'free' })(() => { markDay(); Save.save(); home(); });
    screen(h('div', { class: 'top' }, h('button', { class: 'btn', type: 'button', onclick: home, 'aria-label': 'Salir al inicio' }, '✕'), h('b', null, 'Conversación libre')), card);
  }

  /* ---------- repaso hablado ---------- */
  function review(ids) {
    let i = 0;
    const steps = ids.map(id => {
      const p = SEM.byId[id]; const mat = material(p);
      const s = pick(mat.ex.concat(mat.gen.slice(0, 3)));
      const sc = { ok: 0, total: 0 };
      return { id, sc, make: stepSolo(s, 1, 1, sc) };
    });
    const run = () => {
      if (i >= steps.length) return afterReview();
      const st = steps[i];
      const card = st.make(() => {
        const d = S.done[st.id]; const ok = st.sc.total === 0 || st.sc.ok === st.sc.total;
        d.box = ok ? Math.min(BOX_DAYS.length - 1, (d.box || 0) + 1) : 0;
        d.due = Date.now() + BOX_DAYS[d.box] * DAY - 3 * 3600000;
        markDay(); Save.save();
        i++; run();
      });
      screen(topbar(i, steps.length, 'Repaso ' + (i + 1) + ' de ' + steps.length), card);
    };
    function afterReview() {
      const p = COURSE[S.next];
      screen(h('div', { class: 'card' }, h('h1', null, '✓ Repaso hecho'), h('p', null, p ? 'Ahora sigue la lección ' + (S.next + 1) + ': ' + cap(p.m.replace(/\.$/, '')) : 'Todo al día.')));
      foot(p ? 'Empezar lección ' + (S.next + 1) + ' →' : 'Volver al inicio', () => { if (p) lesson(p); else home(); });
    }
    run();
  }

  /* ---------- arranque ---------- */
  screen(h('div', { class: 'card' }, h('h1', null, 'Inglés para hablar'), h('p', { class: 'muted' }, 'Cargando tu progreso…')));
  $foot.hidden = true;
  Promise.all([Save.init(), initDictation(), initAI()]).then(home, home);
  window.__curso = { COURSE, TRICKS, pron, get state() { return S; }, home };
})();
