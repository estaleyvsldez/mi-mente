/* MEMORY LAB — ADAPTIVE MEMORY STRATEGY ENGINE
   Recomienda técnicas según el tipo de información y el rendimiento real del usuario,
   y diagnostica por qué falla la memoria cuando hay un patrón de errores (no un error aislado). */
(function (root, factory) {
  const m = factory();
  if (typeof module !== 'undefined') module.exports = m; else root.Strategy = m;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  /* Combinaciones base por tipo de información (punto de partida, no reglas rígidas). */
  const BASE = {
    words: { label: 'Palabras', combo: ['vocab-cat', 'visual-assoc', 'keyword', 'active-recall', 'spaced'] },
    numbers: { label: 'Números', combo: ['chunking', 'major', 'pao', 'palace'] },
    list: { label: 'Listas', combo: ['chunking', 'peg', 'story', 'free-recall'] },
    concepts: { label: 'Conceptos', combo: ['elaboration', 'analogy', 'conceptmap', 'feynman', 'active-recall'] },
    sequence: { label: 'Secuencias', combo: ['chunking', 'visual-assoc', 'loci', 'reconstruct'] },
    english: { label: 'Inglés', combo: ['chunking', 'visual-assoc', 'sentence-build', 'generation', 'active-recall', 'spaced'] },
    pairs: { label: 'Pares (nombre-cara, palabra-traducción)', combo: ['visual-assoc', 'exaggerate', 'keyword', 'active-recall'] },
    images: { label: 'Imágenes y escenas', combo: ['scenes', 'visualize', 'reconstruct', 'cued-recall'] },
    dates: { label: 'Fechas', combo: ['num-images', 'major', 'visual-assoc', 'spaced'] },
    cards: { label: 'Cartas', combo: ['chunking', 'pao', 'palace'] }
  };
  /* Alternativas para cada técnica cuando no está disponible o no funciona. */
  const FALLBACK = {
    major: ['shapes', 'num-images', 'chunking'], pao: ['major', 'num-images'], palace: ['loci', 'story', 'peg'],
    loci: ['story', 'image-chain'], peg: ['rhyme-num', 'image-chain'], story: ['image-chain', 'scenes'],
    keyword: ['phonetic', 'visual-assoc'], conceptmap: ['mindmap', 'hierarchy'], feynman: ['self-explain', 'elaboration'],
    'sentence-build': ['generation', 'reconstruct'], 'vocab-cat': ['chunking', 'families']
  };
  /* Orden de aprendizaje recomendado (coincide con el entrenamiento progresivo). */
  const LEARN_ORDER = ['visual-assoc', 'visualize', 'chunking', 'vocab-cat', 'active-recall', 'cued-recall', 'spaced', 'loci', 'palace', 'story', 'image-chain', 'peg', 'shapes', 'exaggerate', 'scenes', 'reconstruct', 'free-recall', 'interleave', 'keyword', 'acronym', 'elaboration', 'analogy', 'major', 'num-images', 'pao'];

  /* profile: {type, count, ordered, abstract 0-1, similarity 0-1, minutes, retention: 'hoy'|'semanas'|'meses'}
     known: técnicas que el usuario ya domina (Set o array). perf: {techId: {n, accuracy}} por tipo. */
  function recommend(profile, known, perf) {
    profile = Object.assign({ type: 'words', count: 10, ordered: false, abstract: 0.3, similarity: 0.3, minutes: 10, retention: 'semanas' }, profile || {});
    known = new Set(known || []);
    perf = perf || {};
    const base = (BASE[profile.type] || BASE.words).combo.slice();
    const reasons = [];
    const add = (id, why) => { if (!base.includes(id)) base.push(id); reasons.push({ id, why }); };

    if (profile.ordered && !base.some(t => ['loci', 'palace', 'peg', 'story', 'image-chain', 'reconstruct'].includes(t))) add(profile.count > 15 ? 'loci' : 'story', 'Necesitas conservar el orden: un recorrido o una historia guarda la secuencia.');
    if (profile.count > 7 && !base.includes('chunking')) add('chunking', 'Más de 7 elementos superan la memoria de trabajo: agrúpalos en bloques.');
    if (profile.count > 40 && !base.includes('palace')) add('palace', 'Para cantidades grandes, un palacio con varios lugares es lo más escalable.');
    if (profile.abstract > 0.6) add('keyword', 'Lo abstracto se recuerda mejor si lo conviertes en algo concreto (palabra clave / imagen).');
    if (profile.similarity > 0.6) { add('exaggerate', 'Los elementos se parecen: imágenes muy distintivas evitan confundirlos.'); add('compare', 'Estudia juntas las diferencias de lo que se confunde.'); }
    if (profile.retention !== 'hoy' && !base.includes('spaced')) add('spaced', 'Quieres recordarlo durante semanas: programa repasos espaciados.');
    if (profile.retention === 'hoy') reasons.push({ id: 'active-recall', why: 'Para hoy basta con codificación fuerte + 2-3 recuperaciones; el repaso espaciado no es imprescindible.' });
    if (profile.minutes < 5) reasons.push({ id: 'chunking', why: 'Con poco tiempo, prioriza agrupar y una sola pasada de recuperación.' });

    // Sustituir técnicas no dominadas por alternativas que el usuario ya domina (si existen).
    const plan = base.map(id => {
      if (!known.size || known.has(id)) return { id, status: known.has(id) ? 'dominada' : 'sugerida' };
      const alt = (FALLBACK[id] || []).find(a => known.has(a));
      return alt ? { id: alt, status: 'dominada', instead: id } : { id, status: 'por aprender' };
    });
    // Ajuste por rendimiento histórico: penaliza técnicas con baja precisión en este tipo de información.
    plan.forEach(p => {
      const r = perf[p.id];
      p.perf = r && r.n >= 3 ? r.accuracy : null;
      if (p.perf != null && p.perf < 0.6) {
        const alt = (FALLBACK[p.id] || []).find(a => !perf[a] || perf[a].accuracy >= 0.6);
        if (alt) { p.note = 'Tu precisión con esta técnica en este tipo de información es baja (' + Math.round(p.perf * 100) + ' %). Prueba ' + alt + '.'; p.try = alt; }
      }
    });
    const seen = new Set();
    const uniq = plan.filter(p => (seen.has(p.id) ? false : seen.add(p.id)));
    const next = LEARN_ORDER.find(t => !known.has(t) && uniq.some(p => p.id === t && p.status === 'por aprender'));
    return { type: profile.type, label: (BASE[profile.type] || BASE.words).label, plan: uniq, reasons, nextToLearn: next || null };
  }

  /* Diagnóstico a partir de los intentos recientes de un módulo/técnica.
     Los intentos pueden traer meta: {itemsOk, orderOk, intrusions, delayed, encodeMs, count}. */
  function diagnose(attempts) {
    const xs = (attempts || []).slice(-12);
    if (xs.length < 3) return { problem: null, reason: 'Aún no hay suficientes intentos para diagnosticar (mínimo 3). Un error aislado no justifica cambiar de técnica.' };
    const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
    const acc = mean(xs.map(a => a.score));
    const findings = [];
    const metas = xs.map(a => a.meta || {});

    const withOrder = metas.filter(m => m.itemsOk != null && m.orderOk != null);
    if (withOrder.length >= 3) {
      const items = mean(withOrder.map(m => m.itemsOk)), order = mean(withOrder.map(m => m.orderOk));
      if (items >= 0.75 && order < items - 0.2) findings.push({ id: 'order', weight: items - order, title: 'Recuerdas los elementos, pero pierdes el orden',
        explain: 'La información está codificada, pero no hay una estructura que guarde la secuencia.', recommend: ['loci', 'image-chain', 'peg'], adjust: { ordered: true } });
    }
    const imm = xs.filter(a => !(a.meta && a.meta.delayed)).map(a => a.score);
    const del = xs.filter(a => a.meta && a.meta.delayed).map(a => a.score);
    if (imm.length >= 2 && del.length >= 1 && mean(imm) - mean(del) > 0.25) findings.push({ id: 'forget', weight: mean(imm) - mean(del), title: 'Recuerdas al momento, pero olvidas después',
      explain: 'La codificación funciona a corto plazo; falta consolidar con recuperación espaciada.', recommend: ['spaced', 'active-recall', 'elaboration'], adjust: { reviews: true } });
    const intr = metas.filter(m => m.intrusions != null);
    if (intr.length >= 3 && mean(intr.map(m => m.intrusions)) >= 1) findings.push({ id: 'confusion', weight: 0.5, title: 'Confundes elementos',
      explain: 'Aparecen respuestas de otras listas o parecidas: las imágenes no son lo bastante distintivas o reutilizaste el mismo palacio demasiado pronto.', recommend: ['exaggerate', 'compare', 'palace'], adjust: { distinct: true } });
    const byCount = {};
    xs.forEach(a => { if (a.total) (byCount[a.total] = byCount[a.total] || []).push(a.score); });
    const counts = Object.keys(byCount).map(Number).sort((a, b) => a - b);
    if (counts.length >= 2) {
      const lo = mean(byCount[counts[0]]), hi = mean(byCount[counts[counts.length - 1]]);
      if (lo >= 0.8 && hi < 0.55) findings.push({ id: 'overload', weight: lo - hi, title: 'La cantidad es excesiva por ahora',
        explain: 'Con ' + counts[0] + ' elementos rindes bien, con ' + counts[counts.length - 1] + ' no. Sube de forma más gradual.', recommend: ['chunking', 'palace'], adjust: { count: counts[0] + Math.max(1, Math.round((counts[counts.length - 1] - counts[0]) / 3)) } });
    }
    const fastEnc = metas.filter(m => m.encodeMs != null && m.count);
    if (fastEnc.length >= 3 && acc < 0.6 && mean(fastEnc.map(m => m.encodeMs / m.count)) < 2500) findings.push({ id: 'encoding', weight: 0.6 - acc, title: 'La codificación es débil',
      explain: 'Dedicas menos de 2,5 s por elemento. Las asociaciones no llegan a formarse.', recommend: ['visualize', 'exaggerate', 'multisensory'], adjust: { mode: 'slow' } });
    const recog = metas.filter(m => m.recognition != null);
    if (recog.length >= 2 && mean(recog.map(m => m.recognition)) - acc > 0.3) findings.push({ id: 'retrieval', weight: 0.4, title: 'Reconoces, pero no recuperas',
      explain: 'Cuando ves opciones aciertas; sin opciones, no. Necesitas más práctica de recuperación libre.', recommend: ['active-recall', 'cued-recall', 'free-recall'], adjust: {} });
    if (metas.some(m => m.concept) && acc < 0.6) findings.push({ id: 'understanding', weight: 0.6 - acc, title: 'Falta comprensión del contenido',
      explain: 'En contenidos conceptuales, memorizar sin entender produce recuerdos frágiles.', recommend: ['elaboration', 'feynman', 'analogy'], adjust: {} });
    if (!findings.length && acc < 0.6) findings.push({ id: 'technique', weight: 0.3, title: 'La técnica actual no está funcionando',
      explain: 'Precisión media de ' + Math.round(acc * 100) + ' % en ' + xs.length + ' intentos sin un patrón claro. Prueba otra técnica con menos elementos.', recommend: ['visual-assoc', 'chunking'], adjust: { mode: 'slow' } });
    findings.sort((a, b) => b.weight - a.weight);
    return { problem: findings[0] || null, all: findings, accuracy: acc, n: xs.length };
  }

  return { recommend, diagnose, BASE, FALLBACK, LEARN_ORDER };
});
