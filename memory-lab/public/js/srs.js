/* MEMORY LAB — repetición espaciada con FSRS (Free Spaced Repetition Scheduler, v4.5/5).
   Modelo de memoria con dos variables por tarjeta:
     S (estabilidad): días hasta que la probabilidad de recordar cae al 90 %.
     D (dificultad): 1-10.
   Calificaciones: 1 Otra vez · 2 Difícil · 3 Bien · 4 Fácil. */
(function (root, factory) {
  const m = factory();
  if (typeof module !== 'undefined') module.exports = m; else root.SRS = m;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
  const DECAY = -0.5, FACTOR = 19 / 81, DAY = 86400000;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  const retrievability = (elapsedDays, S) => Math.pow(1 + FACTOR * elapsedDays / S, DECAY);
  const intervalFor = (S, r) => Math.max(1, Math.round(S / FACTOR * (Math.pow(r, 1 / DECAY) - 1)));
  const initS = g => Math.max(0.1, W[g - 1]);
  const initD = g => clamp(W[4] - Math.exp(W[5] * (g - 1)) + 1, 1, 10);

  function nextD(D, g) {
    const delta = -W[6] * (g - 3);
    const dp = D + delta * (10 - D) / 9; // amortiguación lineal
    return clamp(W[7] * initD(4) + (1 - W[7]) * dp, 1, 10);
  }
  function recallS(D, S, R, g) {
    const hard = g === 2 ? W[15] : 1, easy = g === 4 ? W[16] : 1;
    return S * (Math.exp(W[8]) * (11 - D) * Math.pow(S, -W[9]) * (Math.exp(W[10] * (1 - R)) - 1) * hard * easy + 1);
  }
  function forgetS(D, S, R) {
    return Math.min(S, W[11] * Math.pow(D, -W[12]) * (Math.pow(S + 1, W[13]) - 1) * Math.exp(W[14] * (1 - R)));
  }
  const shortTermS = (S, g) => S * Math.exp(W[17] * (g - 3 + W[18]));

  /* Convierte una puntuación 0-1 (y opcionalmente el tiempo de respuesta) en calificación FSRS. */
  function gradeFrom(score, ms, fastMs) {
    if (score < 0.6) return 1;
    if (score < 0.8) return 2;
    if (score >= 0.95 && ms && fastMs && ms < fastMs) return 4;
    return 3;
  }

  /* Aplica un repaso. card = {S, D, last, due, reps, lapses, first}. Devuelve una tarjeta nueva. */
  function review(card, grade, now, retention) {
    now = now || Date.now();
    retention = retention || 0.9;
    const c = Object.assign({ reps: 0, lapses: 0 }, card || {});
    if (!c.S) {
      c.S = initS(grade); c.D = initD(grade); c.first = c.first || now;
    } else {
      const elapsed = Math.max(0, (now - (c.last || now)) / DAY);
      if (elapsed < 1) {
        c.S = shortTermS(c.S, grade);
        c.D = nextD(c.D, grade);
      } else {
        const R = retrievability(elapsed, c.S);
        c.D = nextD(c.D, grade);
        c.S = grade === 1 ? forgetS(c.D, c.S, R) : recallS(c.D, c.S, R, grade);
      }
    }
    c.S = clamp(c.S, 0.1, 36500);
    if (grade === 1) { c.lapses++; c.due = now + 10 * 60000; }
    else c.due = now + intervalFor(c.S, retention) * DAY;
    c.reps++;
    c.last = now;
    return c;
  }

  /* Probabilidad estimada de recordar hoy. */
  function recallProb(card, now) {
    if (!card || !card.S || !card.last) return 0;
    return retrievability(Math.max(0, ((now || Date.now()) - card.last) / DAY), card.S);
  }

  return { review, recallProb, gradeFrom, retrievability, intervalFor, W, DAY };
});
