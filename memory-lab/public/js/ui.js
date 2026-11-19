/* MEMORY LAB — utilidades de interfaz: construcción de DOM, avisos, gráficos SVG, temporizador, voz. */
(function () {
  'use strict';
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(Infinity).forEach(c => { if (c == null || c === false) return; el.appendChild(c.nodeType ? c : document.createTextNode(String(c))); });
    return el;
  }
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  function toast(msg, kind) {
    const t = h('div', { class: 'toast ' + (kind || '') , role: 'status' }, msg);
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3200);
  }
  const pct = x => (x == null ? '—' : Math.round(x * 100) + ' %');
  const mins = ms => { const m = Math.round(ms / 60000); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; };
  const dateStr = ts => new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = ts => new Date(ts).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  /* Gráfico de barras SVG con tooltip. series: [{key, value, label, tip}] */
  function barChart(series, opts) {
    opts = Object.assign({ height: 160, unit: '', color: 'var(--accent)' }, opts || {});
    const W = Math.max(280, series.length * 22), H = opts.height, pad = 22;
    const max = Math.max(1, ...series.map(s => s.value || 0));
    const bw = (W - pad) / series.length;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'chart'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', opts.label || 'Gráfico');
    const tip = h('div', { class: 'chart-tip' });
    for (let i = 0; i <= 2; i++) {
      const y = 8 + (H - pad - 8) * (i / 2);
      const l = document.createElementNS(svgNS, 'line');
      l.setAttribute('x1', pad); l.setAttribute('x2', W); l.setAttribute('y1', y); l.setAttribute('y2', y); l.setAttribute('class', 'grid');
      svg.appendChild(l);
      const t = document.createElementNS(svgNS, 'text');
      t.setAttribute('x', 0); t.setAttribute('y', y + 4); t.setAttribute('class', 'axis');
      t.textContent = Math.round(max * (1 - i / 2) * 10) / 10; svg.appendChild(t);
    }
    series.forEach((s, i) => {
      const v = s.value || 0, bh = (H - pad - 8) * v / max;
      const r = document.createElementNS(svgNS, 'rect');
      r.setAttribute('x', pad + i * bw + bw * 0.15); r.setAttribute('width', bw * 0.7);
      r.setAttribute('y', H - pad - bh); r.setAttribute('height', Math.max(v ? 2 : 0, bh)); r.setAttribute('rx', 2);
      r.setAttribute('fill', opts.color); r.setAttribute('tabindex', '0');
      const show = () => { tip.textContent = s.tip || (s.label + ': ' + v + opts.unit); tip.style.display = 'block'; };
      r.addEventListener('mouseenter', show); r.addEventListener('focus', show);
      r.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
      svg.appendChild(r);
      if (series.length <= 14 || i % Math.ceil(series.length / 10) === 0) {
        const t = document.createElementNS(svgNS, 'text');
        t.setAttribute('x', pad + i * bw + bw / 2); t.setAttribute('y', H - 6); t.setAttribute('class', 'axis'); t.setAttribute('text-anchor', 'middle');
        t.textContent = s.label; svg.appendChild(t);
      }
    });
    return h('div', { class: 'chart-wrap' }, svg, tip);
  }

  /* Calendario de actividad (últimas N semanas). byDay: {day: {n, ms}} */
  function heatmap(byDay, weeks, validSet) {
    weeks = weeks || 18;
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const start = new Date(today); start.setDate(start.getDate() - (weeks * 7 - 1) - ((today.getDay() + 6) % 7 === 6 ? 0 : 6 - (today.getDay() + 6) % 7));
    const grid = h('div', { class: 'heat', style: { gridTemplateColumns: `repeat(${weeks + 1}, 1fr)` } });
    const cells = [];
    const d = new Date(today); d.setDate(d.getDate() - weeks * 7 - ((today.getDay() + 6) % 7));
    for (let i = 0; i < (weeks + 1) * 7; i++) {
      const k = Stats.localDay(d.getTime());
      const r = byDay[k];
      const lvl = !r ? 0 : r.n >= 40 ? 4 : r.n >= 20 ? 3 : r.n >= 8 ? 2 : 1;
      const future = d > today;
      cells.push(h('div', { class: 'cell l' + lvl + (validSet && validSet.has(k) ? ' valid' : '') + (future ? ' future' : ''), title: k + (r ? ' · ' + r.n + ' ejercicios · ' + mins(r.ms) : ' · sin actividad') }));
      d.setDate(d.getDate() + 1);
    }
    // ordenar por columnas (semanas) con filas = días
    const cols = weeks + 1;
    for (let row = 0; row < 7; row++) for (let c = 0; c < cols; c++) grid.appendChild(cells[c * 7 + row]);
    void start;
    return grid;
  }

  function ring(value, label) {
    const r = 26, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value || 0));
    return h('div', { class: 'ring', html: `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" class="ring-bg"/><circle cx="32" cy="32" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v)}"/></svg><span>${label != null ? label : Math.round(v * 100) + '%'}</span>` });
  }

  /* Temporizador visible con callback al terminar. */
  function countdown(seconds, onEnd) {
    const bar = h('div', { class: 'timer' }, h('i'), h('span'));
    const fill = bar.querySelector('i'), txt = bar.querySelector('span');
    const t0 = performance.now(); let raf = 0, done = false;
    function tick() {
      const left = Math.max(0, seconds - (performance.now() - t0) / 1000);
      fill.style.width = (left / seconds * 100) + '%';
      txt.textContent = left.toFixed(left < 10 ? 1 : 0) + ' s';
      if (left <= 0) { if (!done) { done = true; onEnd && onEnd(); } return; }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    bar.stop = () => { done = true; cancelAnimationFrame(raf); };
    bar.elapsed = () => performance.now() - t0;
    return bar;
  }

  /* ---------- Voz ---------- */
  const Voice = {
    get canSpeak() { return 'speechSynthesis' in window; },
    get canListen() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); },
    voices() { return this.canSpeak ? speechSynthesis.getVoices() : []; },
    speak(text, lang, rate) {
      if (!this.canSpeak || !text) return Promise.resolve();
      return new Promise(res => {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(String(text).replace(/\[[A-Z]:([^\]]*)\]/g, '$1'));
        const set = (window.App && App.settings()) || {};
        u.lang = lang || set.accent || 'en-US';
        u.rate = rate || set.rate || 0.95;
        const want = set.voice && this.voices().find(v => v.name === set.voice);
        const v = want || this.voices().find(v => v.lang === u.lang) || this.voices().find(v => v.lang.startsWith(u.lang.slice(0, 2)));
        if (v) u.voice = v;
        u.onend = res; u.onerror = res;
        speechSynthesis.speak(u);
      });
    },
    /* Escucha y devuelve {text, alternatives, confidence}. */
    listen(lang) {
      return new Promise((resolve, reject) => {
        const R = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!R) return reject(new Error('Este navegador no tiene reconocimiento de voz. Usa Chrome o Edge, o responde por escrito.'));
        const r = new R();
        r.lang = lang || 'en-US'; r.interimResults = false; r.maxAlternatives = 5;
        let got = false;
        r.onresult = e => {
          got = true;
          const res = e.results[0];
          const alts = Array.from(res).map(a => a.transcript.trim());
          resolve({ text: alts[0] || '', alternatives: alts, confidence: res[0].confidence });
        };
        r.onerror = e => reject(new Error(e.error === 'not-allowed' ? 'Permiso de micrófono denegado.' : e.error === 'no-speech' ? 'No se detectó voz.' : 'Error de reconocimiento: ' + e.error));
        r.onend = () => { if (!got) reject(new Error('No se detectó voz.')); };
        r.start();
      });
    }
  };

  window.UI = { h, $, $$, toast, pct, mins, dateStr, timeStr, barChart, heatmap, ring, countdown };
  window.Voice = Voice;
})();
