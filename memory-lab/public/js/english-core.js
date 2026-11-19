/* STRUCTURAL ENGLISH MEMORY — núcleo
   Registro de contenido, formato de bloques de colores, normalización y verificación de respuestas.
   Funciona en el navegador (window.SEM) y en Node (tools/validate.js) sin dependencias. */
(function (root) {
  'use strict';
  const SEM = root.SEM = root.SEM || {};
  SEM.version = 1;
  SEM.patterns = SEM.patterns || [];
  SEM.dialogues = SEM.dialogues || [];
  SEM.combos = SEM.combos || [];
  SEM.byId = SEM.byId || {};
  SEM.dlgById = SEM.dlgById || {};
  SEM.issues = SEM.issues || [];

  /* ---------- Roles de bloque (asociación por colores) ---------- */
  SEM.ROLES = {
    F: { name: 'Estructura fija', hint: 'La parte que nunca cambia: el molde.' },
    S: { name: 'Persona / sujeto', hint: 'Quién hace o quién es.' },
    V: { name: 'Acción (verbo)', hint: 'Lo que se hace.' },
    N: { name: 'Cosa / sustantivo', hint: 'Objetos, ideas, personas como cosa.' },
    A: { name: 'Cualidad / estado', hint: 'Cómo es o cómo está algo.' },
    P: { name: 'Lugar', hint: 'Dónde.' },
    T: { name: 'Tiempo', hint: 'Cuándo, cuánto tiempo, con qué frecuencia.' },
    Q: { name: 'Palabra de pregunta', hint: 'What, where, how…' },
    C: { name: 'Conector', hint: 'Une ideas: but, so, because…' },
    X: { name: 'Idea completa', hint: 'Una oración entera dentro de otra.' }
  };

  SEM.STAGES = [
    { n: 1, name: 'Etapa 1 · Inicial', desc: 'Palabras, bloques y oraciones sencillas.' },
    { n: 2, name: 'Etapa 2 · Elemental', desc: 'Necesidades, deseos, acciones, preguntas y respuestas.' },
    { n: 3, name: 'Etapa 3 · Intermedia', desc: 'Combinación de estructuras y conversaciones básicas.' },
    { n: 4, name: 'Etapa 4 · Intermedia avanzada', desc: 'Descripciones, experiencias, explicaciones y conversaciones completas.' },
    { n: 5, name: 'Etapa 5 · Avanzada', desc: 'Opiniones, argumentos, matices y expresiones naturales.' },
    { n: 6, name: 'Etapa 6 · Espontánea', desc: 'Conversaciones espontáneas y comunicación avanzada.' }
  ];
  /* Colores estructurales: azul sujeto · verde acción · amarillo bloque estructural ·
     morado complemento · rojo negación · naranja preguntas y conectores. */
  SEM.COLOR_OF = { S: 'S', V: 'V', F: 'F', N: 'O', A: 'O', P: 'O', T: 'O', X: 'O', Q: 'Q', C: 'Q' };
  SEM.COLOR_NAMES = { S: 'Sujeto', V: 'Acción', F: 'Bloque estructural', O: 'Complemento', NEG: 'Negación', Q: 'Pregunta / conector' };
  const NEG_RE = /\b(not|never|no|don't|doesn't|didn't|can't|won't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|shouldn't|wouldn't|couldn't|mustn't|nobody|nothing|nowhere)\b/i;
  const Q_RE = /^(what|where|when|why|who|whose|which|how(?: much| many| long| often| old| far)?)\b/i;
  /* Segmentos con su color final: separa negaciones y palabras interrogativas dentro de la estructura fija. */
  SEM.colorSegments = function (m) {
    const out = [];
    SEM.parse(m).forEach(s => {
      if (s.r !== 'F') { out.push({ c: SEM.COLOR_OF[s.r] || 'O', t: s.t, r: s.r }); return; }
      // dividir la estructura fija en partes: interrogativa inicial, negaciones, resto
      const parts = s.t.split(/(\s+)/);
      let buf = '';
      const flush = () => { if (buf) { out.push({ c: 'F', t: buf, r: 'F' }); buf = ''; } };
      parts.forEach((w, i) => {
        const bare = w.replace(/[^A-Za-z']/g, '');
        if (bare && NEG_RE.test(bare) && bare.replace(NEG_RE, '') === '') { flush(); out.push({ c: 'NEG', t: w, r: 'F' }); }
        else if (bare && Q_RE.test(bare) && bare.replace(Q_RE, '') === '' && !out.length && !buf.trim()) { flush(); out.push({ c: 'Q', t: w, r: 'F' }); }
        else buf += w;
      });
      flush();
    });
    return out;
  };

  SEM.REGISTERS = {
    informal: { name: 'Informal', desc: 'Con amigos, familia, mensajes. Natural y relajado.' },
    neutro: { name: 'Neutro', desc: 'Funciona casi en cualquier situación.' },
    formal: { name: 'Formal', desc: 'Trabajo, desconocidos, correos, atención al cliente.' },
    coloquial: { name: 'Coloquial', desc: 'Muy de calle. Úsalo solo con confianza.' },
    contexto: { name: 'Depende del contexto', desc: 'Puede sonar bien o raro según con quién y cómo.' }
  };

  /* ---------- Formato de bloques ----------
     "I want to [V:go home] [T:tonight]."  → segmentos con rol.
     "[V:___]" es un hueco para sustituir. Texto sin corchetes = estructura fija (F). */
  const SEG_RE = /\[([A-Z]):([^\]]*)\]/g;

  SEM.parse = function (m) {
    const out = [];
    let last = 0, r;
    SEG_RE.lastIndex = 0;
    while ((r = SEG_RE.exec(m))) {
      if (r.index > last) out.push({ r: 'F', t: m.slice(last, r.index) });
      out.push({ r: r[1], t: r[2] });
      last = r.index + r[0].length;
    }
    if (last < m.length) out.push({ r: 'F', t: m.slice(last) });
    return out;
  };

  SEM.plain = function (m) {
    return String(m).replace(SEG_RE, '$2').replace(/\s+/g, ' ').trim();
  };

  SEM.slotRole = function (tpl) {
    const r = /\[([A-Z]):___\]/.exec(tpl);
    return r ? r[1] : null;
  };

  /* Sustituye el hueco ___ del molde por un valor. */
  SEM.fill = function (tpl, value) {
    return tpl.replace(/\[([A-Z]):___\]/, (all, role) => '[' + role + ':' + value + ']');
  };
  SEM.fillEs = function (tpl, value) {
    return tpl.replace('[___]', value);
  };

  /* Bloques para reconstrucción. fine=true divide la estructura fija en palabras. */
  SEM.chunks = function (m, fine) {
    const segs = SEM.parse(m);
    const out = [];
    segs.forEach(s => {
      let t = s.t.trim();
      if (!t) return;
      if (s.r === 'F') {
        // puntuación final pegada al bloque anterior
        if (/^[.,!?;:]+$/.test(t)) {
          if (out.length) out[out.length - 1].t += t; else out.push({ r: 'F', t });
          return;
        }
        const words = t.split(/\s+/);
        if (fine || words.length > 4) {
          const size = fine ? 1 : 2;
          for (let i = 0; i < words.length; i += size) out.push({ r: 'F', t: words.slice(i, i + size).join(' ') });
        } else out.push({ r: 'F', t });
      } else {
        out.push({ r: s.r, t });
      }
    });
    return out;
  };

  /* ---------- Normalización para comparar respuestas ---------- */
  const CONTRACTIONS = [
    [/\bi'm\b/g, 'i am'], [/\bcan't\b/g, 'cannot'], [/\bcan not\b/g, 'cannot'], [/\bwon't\b/g, 'will not'],
    [/\bshan't\b/g, 'shall not'], [/\bain't\b/g, 'is not'], [/\blet's\b/g, 'let us'],
    [/\bwanna\b/g, 'want to'], [/\bgonna\b/g, 'going to'], [/\bgotta\b/g, 'got to'], [/\bkinda\b/g, 'kind of'],
    [/\bdunno\b/g, 'do not know'], [/\bgimme\b/g, 'give me'], [/\blemme\b/g, 'let me'], [/\by'all\b/g, 'you all'],
    [/\b(\w+)n't\b/g, '$1 not'], [/\b(\w+)'re\b/g, '$1 are'], [/\b(\w+)'ve\b/g, '$1 have'],
    [/\b(\w+)'ll\b/g, '$1 will'], [/\b(\w+)'d\b/g, '$1 would'],
    [/\b(he|she|it|that|what|where|who|there|here|how|when|this)'s\b/g, '$1 is'],
    [/\bok\b/g, 'okay'], [/\bo\.k\.?\b/g, 'okay']
  ];
  SEM.norm = function (s) {
    let t = String(s || '').toLowerCase()
      .replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"')
      .replace(/\[([A-Z]):([^\]]*)\]/gi, '$2');
    CONTRACTIONS.forEach(([re, rep]) => { t = t.replace(re, rep); });
    t = t.replace(/[^a-z0-9'\s-]/g, ' ').replace(/-/g, ' ').replace(/'/g, '').replace(/\s+/g, ' ').trim();
    return t;
  };

  function lev(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = new Array(n + 1), cur = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      cur[0] = i;
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      [prev, cur] = [cur, prev];
    }
    return prev[n];
  }
  SEM.lev = lev;

  /* Diff por palabras (LCS) para mostrar qué falta o sobra. */
  SEM.wordDiff = function (given, target) {
    const a = SEM.norm(given).split(' ').filter(Boolean);
    const b = SEM.norm(target).split(' ').filter(Boolean);
    const m = a.length, n = b.length;
    const L = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < m && j < n) {
      if (a[i] === b[j]) { out.push({ k: 'ok', w: a[i] }); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) { out.push({ k: 'extra', w: a[i] }); i++; }
      else { out.push({ k: 'miss', w: b[j] }); j++; }
    }
    while (i < m) out.push({ k: 'extra', w: a[i++] });
    while (j < n) out.push({ k: 'miss', w: b[j++] });
    return out;
  };

  const MINOR = new Set(['a', 'an', 'the', 'some', 'any', 'to', 'on', 'in', 'at', 'of', 'for', 'really', 'just', 'so', 'very', 'please', 'actually', 'oh', 'well', 'yeah', 'yes', 'okay', 'hey', 'hi']);

  /* Verifica una respuesta contra una o varias respuestas válidas.
     Devuelve {grade:'ok'|'almost'|'no', score:0..1, best, diff} */
  SEM.check = function (given, answers) {
    const list = (Array.isArray(answers) ? answers : [answers]).filter(Boolean);
    const g = SEM.norm(given);
    if (!g) return { grade: 'no', score: 0, best: list[0], diff: [] };
    let best = null, bestD = Infinity, bestScore = 0, bestDiff = null;
    for (const ans of list) {
      const t = SEM.norm(ans);
      if (g === t) return { grade: 'ok', score: 1, best: ans, diff: [] };
      const d = lev(g, t);
      const ratio = 1 - d / Math.max(g.length, t.length);
      if (d < bestD) { bestD = d; best = ans; bestScore = ratio; }
    }
    bestDiff = SEM.wordDiff(given, best);
    const wrong = bestDiff.filter(x => x.k !== 'ok');
    const onlyMinor = wrong.length > 0 && wrong.every(x => MINOR.has(x.w));
    // errores de tipeo pequeños: diferencias de 1-2 letras en total
    if (bestD <= 2 && SEM.norm(best).length > 8) return { grade: 'almost', score: 0.8, best, diff: bestDiff, typo: true };
    if (onlyMinor && wrong.length <= 2) return { grade: 'almost', score: 0.7, best, diff: bestDiff };
    return { grade: 'no', score: Math.max(0, bestScore * 0.5), best, diff: bestDiff };
  };

  /* La estructura fija de un patrón, para detectar si una oración libre lo usa. */
  SEM.frameKeys = function (tpl) {
    return SEM.parse(tpl).filter(s => s.r === 'F').map(s => SEM.norm(s.t)).filter(Boolean);
  };
  SEM.usesPattern = function (sentence, p) {
    const s = ' ' + SEM.norm(sentence) + ' ';
    const keys = (p.keys && p.keys.length ? p.keys.map(SEM.norm) : SEM.frameKeys(p.f));
    // Se ignoran palabras sujeto al inicio para permitir cambiar persona (I → she).
    return keys.every(k => {
      const words = k.split(' ').filter(w => !['i', 'you', 'we', 'they', 'he', 'she', 'it'].includes(w) || k.split(' ').length === 1);
      const core = words.join(' ');
      return !core || s.includes(' ' + core + ' ') || s.includes(' ' + k + ' ');
    });
  };

  /* ---------- Registro de contenido ----------
     P(def) registra un patrón. Campos cortos para que la biblioteca sea fácil de ampliar:
       id   identificador único (kebab-case)
       cat  categoría (ver data/categories.js)
       st   etapa 1-5
       reg  registro: informal | neutro | formal | coloquial | contexto
       f    molde con hueco:   'I want to [V:___].'
       es   molde en español:  'Quiero [___].'
       t    título visible:    'I WANT TO + VERB' (opcional; se genera)
       m    para qué sirve
       img  emoji de asociación visual
       sl   banco de sustitución [[en, es], ...]
       ex   ejemplos naturales  [[markup, español, [alternativas válidas]?], ...]
       n    nota de uso
       bad  errores típicos de hispanohablantes [[incorrecto, correcto, por qué], ...]
       alt  otras formas naturales [[molde/ejemplo, diferencia de uso], ...]
       odd  cuándo suena raro (texto)
       dlg  mini intercambio [[hablante, inglés, español], ...] (el usuario hace el turno 'B')
       req  ids que conviene saber antes
       rel  ids relacionados
       tags etiquetas libres
       keys palabras clave obligatorias para reconocer uso libre (opcional)            */
  SEM.P = function (d) {
    const p = Object.assign({ reg: 'neutro', sl: [], ex: [], bad: [], alt: [], tags: [], rel: [], req: [], dlg: null, img: '🧩' }, d);
    if (!p.t) p.t = SEM.title(p.f);
    p.src = p.src || 'core';
    if (SEM.byId[p.id]) { SEM.issues.push('ID duplicado: ' + p.id); return SEM.byId[p.id]; }
    SEM.byId[p.id] = p;
    SEM.patterns.push(p);
    return p;
  };
  SEM.D = function (d) {
    const x = Object.assign({ you: 'B', uses: [], st: 2, src: 'core' }, d);
    if (SEM.dlgById[x.id]) { SEM.issues.push('Diálogo duplicado: ' + x.id); return; }
    SEM.dlgById[x.id] = x;
    SEM.dialogues.push(x);
    return x;
  };
  /* C(def): combinaciones de estructuras. kind: pair | answer | follow | exchange */
  SEM.C = function (d) {
    const x = Object.assign({ kind: 'pair', uses: [], st: 2, src: 'core' }, d);
    SEM.combos.push(x);
    return x;
  };

  SEM.title = function (tpl) {
    const names = { V: 'VERB', N: 'NOUN', A: 'ADJ', P: 'PLACE', T: 'TIME', S: 'PERSON', Q: 'QUESTION', C: 'LINK', X: 'SENTENCE' };
    return SEM.parse(tpl).map(s => {
      if (s.r === 'F') return s.t.replace(/[.?!]+\s*$/, '').toUpperCase();
      if (s.t === '___') return ' + ' + names[s.r] + ' ';
      return s.t.toUpperCase();
    }).join('').replace(/\s+/g, ' ').replace(/^\s*\+\s*/, '').trim() + (/\?\s*$/.test(tpl) ? '?' : '');
  };

  /* Todos los ejemplos de un patrón: los escritos a mano + los generados desde el banco. */
  SEM.examples = function (p) {
    return p.ex.map(e => ({ m: e[0], es: e[1], alt: e[2] || [], hand: true }));
  };
  SEM.generated = function (p) {
    if (!p.sl || !p.sl.length || !/___/.test(p.f)) return [];
    return p.sl.map(([en, es]) => ({ m: SEM.fill(p.f, en), es: p.es ? SEM.fillEs(p.es, es) : '', alt: [], slot: en, slotEs: es }));
  };
  SEM.allSentences = function (p) {
    return SEM.examples(p).concat(SEM.generated(p));
  };

  /* Utilidades */
  SEM.shuffle = function (a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  SEM.pick = a => a[Math.floor(Math.random() * a.length)];
  SEM.escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  if (typeof module !== 'undefined') module.exports = SEM;
})(typeof window !== 'undefined' ? window : globalThis);
