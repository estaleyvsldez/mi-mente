// Tipografía animada: diseño, contorno, degradado, brillo, fondos y animación por palabra / letra.
(function () {
  MM.FONTS = {
    inter: '"Inter", system-ui, sans-serif',
    montserrat: '"Montserrat", system-ui, sans-serif',
    bebas: '"Bebas Neue", "Oswald", Impact, sans-serif',
    anton: '"Anton", Impact, sans-serif',
    oswald: '"Oswald", "Arial Narrow", sans-serif',
    archivo_black: '"Archivo Black", "Arial Black", sans-serif',
    space_grotesk: '"Space Grotesk", system-ui, sans-serif',
    playfair: '"Playfair Display", Georgia, serif',
    dm_serif: '"DM Serif Display", Georgia, serif',
    bodoni: '"Bodoni Moda", Didot, serif',
    mono: '"Space Mono", ui-monospace, monospace',
    marker: '"Permanent Marker", "Marker Felt", cursive',
    script: '"Pacifico", "Snell Roundhand", cursive',
    handwriting: '"Caveat", "Noteworthy", cursive',
    rubik: '"Rubik", system-ui, sans-serif',
  };
  MM.FONT_NAMES = Object.keys(MM.FONTS);
  const WEIGHTS = { light: 300, regular: 400, medium: 500, bold: 700, heavy: 800, black: 900 };
  MM.WEIGHT_NAMES = Object.keys(WEIGHTS);
  MM.ANIM_IN = ['none', 'fade', 'pop', 'slide_up', 'slide_down', 'slide_left', 'slide_right', 'zoom_in', 'blur_in', 'drop',
    'typewriter', 'word_by_word', 'word_pop', 'letter_bounce', 'letter_fade', 'glitch'];
  MM.ANIM_OUT = ['none', 'fade', 'pop_out', 'slide_up', 'slide_down', 'zoom_out', 'blur_out', 'glitch'];
  MM.LOOPS = ['none', 'pulse', 'float', 'shake', 'wave', 'glow_pulse', 'flicker', 'rainbow'];
  MM.TEXT_BG = ['none', 'box', 'pill', 'bar', 'outline'];
  const PER_UNIT = new Set(['typewriter', 'word_by_word', 'word_pop', 'letter_bounce', 'letter_fade']);
  const LETTERS = new Set(['typewriter', 'letter_bounce', 'letter_fade']);

  MM.basicText = (text) => ({
    text, segmentIndex: 0, startOffset: 0.3, duration: 2.5, x: 0.5, y: 0.5, font: 'montserrat', weight: 'black',
    size: 0.09, color: '#FFFFFF', gradientColor: '', strokeColor: '#000000', strokeWidth: 0, shadow: 0.5,
    glowColor: '', glowAmount: 0, background: 'none', backgroundColor: '#000000', uppercase: false, letterSpacing: 0,
    align: 'center', rotation: 0, maxWidth: 0.86, animationIn: 'pop', animationOut: 'fade', loop: 'none',
  });

  function fontString(spec, px) {
    return `${WEIGHTS[spec.weight] || 800} ${px}px ${MM.FONTS[spec.font] || MM.FONTS.montserrat}`;
  }

  /// Maqueta el texto: líneas, palabras y letras con posiciones (relativas al centro del bloque).
  MM.layoutText = (ctx, spec, W) => {
    const text = (spec.uppercase ? String(spec.text).toUpperCase() : String(spec.text)).trim();
    const px = Math.max(10, W * MM.clamp(spec.size, 0.02, 0.3));
    ctx.font = fontString(spec, px);
    const spacing = (spec.letterSpacing || 0) * px;
    const measure = (s) => ctx.measureText(s).width + spacing * Math.max(0, [...s].length - 1);
    const maxW = W * MM.clamp(spec.maxWidth || 0.86, 0.2, 1);
    const space = measure(' ') + spacing + px * 0.06 + px * 0.16 * (spec.strokeWidth || 0);
    const lines = [];
    for (const para of text.split('\n')) {
      let line = [];
      let lw = 0;
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const w = measure(word);
        if (line.length && lw + space + w > maxW) { lines.push({ words: line, width: lw }); line = []; lw = 0; }
        lw += (line.length ? space : 0) + w;
        line.push({ text: word, width: w });
      }
      if (line.length) lines.push({ words: line, width: lw });
    }
    const lineH = px * 1.12;
    const blockW = Math.max(1, ...lines.map((l) => l.width));
    const blockH = lines.length * lineH;
    const words = [], letters = [];
    lines.forEach((l, li) => {
      let x = spec.align === 'left' ? -blockW / 2 : spec.align === 'right' ? blockW / 2 - l.width : -l.width / 2;
      const y = -blockH / 2 + li * lineH + lineH / 2;
      l.words.forEach((w) => {
        words.push({ text: w.text, x: x + w.width / 2, y, width: w.width, index: words.length });
        let lx = x;
        for (const ch of [...w.text]) {
          const cw = ctx.measureText(ch).width;
          letters.push({ text: ch, x: lx + cw / 2, y, width: cw });
          lx += cw + spacing;
        }
        x += w.width + space;
      });
    });
    return { px, blockW, blockH, words, letters, spacing };
  };

  function setStyle(ctx, spec, px, colorOverride) {
    ctx.font = fontString(spec, px);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    const color = MM.hexToCss(colorOverride || spec.color, '#ffffff');
    if (spec.gradientColor && !colorOverride) {
      const g = ctx.createLinearGradient(0, -px * 0.6, 0, px * 0.6);
      g.addColorStop(0, color); g.addColorStop(1, MM.hexToCss(spec.gradientColor));
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = color;
    }
  }

  function drawUnit(ctx, spec, lay, unit, colorOverride) {
    const px = lay.px;
    setStyle(ctx, spec, px, colorOverride);
    const draw = (fn) => fn.call(ctx, unit.text, 0, 0);
    // Brillo neón (varias pasadas).
    if (spec.glowColor && spec.glowAmount > 0.01) {
      ctx.save();
      ctx.shadowColor = MM.hexToCss(spec.glowColor);
      [0.12, 0.3, 0.6].forEach((r) => { ctx.shadowBlur = px * r * (0.4 + spec.glowAmount); draw(ctx.fillText); });
      ctx.restore();
    }
    if (spec.shadow > 0.01) {
      ctx.save();
      ctx.shadowColor = `rgba(0,0,0,${0.75 * spec.shadow})`;
      ctx.shadowBlur = px * 0.12;
      ctx.shadowOffsetX = px * 0.03; ctx.shadowOffsetY = px * 0.05;
      draw(ctx.fillText);
      ctx.restore();
    }
    if (spec.strokeWidth > 0.01) {
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = MM.hexToCss(spec.strokeColor, '#000000');
      ctx.lineWidth = px * 0.16 * spec.strokeWidth;
      draw(ctx.strokeText);
      ctx.restore();
    }
    draw(ctx.fillText);
  }

  function drawBackground(ctx, spec, lay, W, alpha) {
    if (!spec.background || spec.background === 'none') return;
    const pad = lay.px * 0.32;
    let x = -lay.blockW / 2 - pad, y = -lay.blockH / 2 - pad * 0.7, w = lay.blockW + pad * 2, h = lay.blockH + pad * 1.4;
    ctx.save();
    ctx.globalAlpha *= alpha;
    const color = MM.hexToCss(spec.backgroundColor, '#000000');
    ctx.beginPath();
    if (spec.background === 'bar') { x = -W * 2; w = W * 4; ctx.rect(x, y, w, h); }
    else {
      const r = spec.background === 'pill' ? h / 2 : lay.px * 0.18;
      if (spec.background === 'pill') { x -= pad * 0.4; w += pad * 0.8; }
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
    }
    if (spec.background === 'outline') { ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, lay.px * 0.06); ctx.stroke(); }
    else { ctx.fillStyle = color; ctx.fill(); }
    ctx.restore();
  }

  /// Dibuja un texto animado en el instante t.
  MM.drawText = (ctx, item, t, W, H) => {
    const spec = item.spec;
    const lay = item.layout || (item.layout = MM.layoutText(ctx, spec, W));
    const local = t - item.start, remain = item.end - t;
    const px = lay.px, frame = Math.floor(t * 30);
    const letters = LETTERS.has(spec.animationIn);
    const units = letters ? lay.letters : lay.words;
    const stagger = letters ? 0.035 : 0.12;
    const unitDur = spec.animationIn === 'typewriter' ? 0.001 : letters ? 0.35 : 0.28;
    const perUnit = PER_UNIT.has(spec.animationIn);
    const inDur = perUnit ? Math.min(2.5, Math.max(units.length - 1, 0) * stagger + unitDur + 0.05) : spec.animationIn === 'none' ? 0 : 0.45;
    const outDur = spec.animationOut === 'none' ? 0 : 0.35;
    const pIn = inDur > 0 ? MM.clamp(local / inDur, 0, 1) : 1;
    const q = outDur > 0 ? MM.clamp(1 - remain / outDur, 0, 1) : 0;

    let alpha = 1, scale = 1, dx = 0, dy = 0, blur = 0, glitch = false, hue = 0;
    const rot = (spec.rotation || 0) * Math.PI / 180;
    if (!perUnit) {
      const e = MM.easeOut(pIn);
      switch (spec.animationIn) {
        case 'fade': alpha *= e; break;
        case 'pop': scale *= 0.4 + 0.6 * MM.backOut(pIn); alpha *= Math.min(1, pIn * 3); break;
        case 'slide_up': dy += (1 - e) * H * 0.06; alpha *= e; break;
        case 'slide_down': dy -= (1 - e) * H * 0.06; alpha *= e; break;
        case 'slide_left': dx += (1 - e) * W * 0.2; alpha *= e; break;
        case 'slide_right': dx -= (1 - e) * W * 0.2; alpha *= e; break;
        case 'zoom_in': scale *= 1.8 - 0.8 * e; alpha *= e; break;
        case 'blur_in': blur += (1 - e) * px * 0.45; alpha *= Math.min(1, pIn * 2); break;
        case 'drop': dy -= (1 - MM.bounceOut(pIn)) * H * 0.25; alpha *= Math.min(1, pIn * 4); break;
        case 'glitch': if (pIn < 1) { glitch = true; if (MM.hash(frame, 9) < 0.25) alpha *= 0.2; } break;
      }
    }
    if (q > 0) {
      const e = MM.easeInOut(q);
      switch (spec.animationOut) {
        case 'fade': alpha *= 1 - e; break;
        case 'pop_out': scale *= 1 + 0.25 * e; alpha *= 1 - e; break;
        case 'slide_up': dy -= e * H * 0.06; alpha *= 1 - e; break;
        case 'slide_down': dy += e * H * 0.06; alpha *= 1 - e; break;
        case 'zoom_out': scale *= 1 - 0.6 * e; alpha *= 1 - e; break;
        case 'blur_out': blur += e * px * 0.45; alpha *= 1 - e; break;
        case 'glitch': glitch = true; alpha *= MM.hash(frame, 11) < 0.4 ? 0 : 1 - e * 0.5; break;
      }
    }
    switch (spec.loop) {
      case 'pulse': scale *= 1 + 0.045 * Math.sin(local * 2 * Math.PI * 1.1); break;
      case 'float': dy += Math.sin(local * 2 * Math.PI * 0.45) * H * 0.008; break;
      case 'shake': dx += (MM.hash(frame, 21) - 0.5) * px * 0.08; dy += (MM.hash(frame, 22) - 0.5) * px * 0.08; break;
      case 'glow_pulse': alpha *= 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(local * 5)); break;
      case 'flicker': if (MM.hash(Math.floor(frame / 2), 23) < 0.08) alpha *= 0.25; break;
      case 'rainbow': hue = (local * 120) % 360; break;
    }
    if (alpha <= 0.005 || scale <= 0.01) return;
    if (glitch) dx += (MM.hash(frame, 13) - 0.5) * px * 0.3;

    // Posición (y desde arriba), sin salirse del cuadro.
    let cx = W * MM.clamp(spec.x, 0, 1), cy = H * MM.clamp(spec.y, 0, 1);
    const hw = lay.blockW / 2 + px * 0.4, hh = lay.blockH / 2 + px * 0.4;
    if (W > hw * 2) cx = MM.clamp(cx, hw, W - hw);
    if (H > hh * 2) cy = MM.clamp(cy, hh, H - hh);

    ctx.save();
    ctx.translate(cx + dx, cy + dy);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
    if (hue) ctx.filter = (ctx.filter && ctx.filter !== 'none' ? ctx.filter + ' ' : '') + `hue-rotate(${hue.toFixed(0)}deg)`;
    drawBackground(ctx, spec, lay, W, perUnit ? Math.min(1, local / 0.25) : 1);

    const karaoke = !!item.wordTimes;
    const list = karaoke ? lay.words : (letters ? lay.letters : lay.words);
    list.forEach((u, i) => {
      let us = 1, ua = 1, udy = 0, color = null;
      if (karaoke && item.wordTimes[i]) {
        const [ws, we] = item.wordTimes[i];
        if (t >= ws && t <= we) { color = item.highlightColor; us = 1 + 0.12 * MM.backOut(MM.clamp((t - ws) / 0.12, 0, 1)); }
        else if (t < ws && spec.animationIn === 'word_by_word') ua = 0;
      } else if (perUnit) {
        const uu = MM.clamp((local - i * stagger) / unitDur, 0, 1);
        switch (spec.animationIn) {
          case 'typewriter': ua = uu > 0 ? 1 : 0; break;
          case 'word_by_word': ua = MM.easeOut(uu); udy = (1 - MM.easeOut(uu)) * px * 0.35; break;
          case 'word_pop': us = 0.2 + 0.8 * MM.backOut(uu); ua = Math.min(1, uu * 3); break;
          case 'letter_bounce': udy = -(1 - MM.bounceOut(uu)) * px * 0.7; ua = Math.min(1, uu * 3); break;
          case 'letter_fade': ua = MM.easeInOut(uu); break;
        }
      }
      if (spec.loop === 'wave') udy += Math.sin(local * 5 + i * 0.55) * px * 0.12;
      if (ua <= 0.005) return;
      ctx.save();
      ctx.translate(u.x, u.y + udy);
      ctx.scale(us, us);
      ctx.globalAlpha = alpha * ua;
      if (glitch) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.6;
        ctx.translate(px * 0.06, 0); drawUnit(ctx, Object.assign({}, spec, { glowColor: '', shadow: 0 }), lay, u, '#FF0040');
        ctx.translate(-px * 0.12, 0); drawUnit(ctx, Object.assign({}, spec, { glowColor: '', shadow: 0 }), lay, u, '#00E5FF');
        ctx.restore();
      }
      drawUnit(ctx, spec, lay, u, color);
      ctx.restore();
    });
    ctx.restore();
  };

  /// Diseño de subtítulos según la plantilla.
  MM.CAPTION_TEMPLATES = ['classic', 'karaoke', 'word_pop', 'boxed', 'bold_stroke', 'neon', 'minimal'];
  MM.captionSpec = (c, text) => {
    const s = MM.basicText(text);
    Object.assign(s, { font: c.font || 'montserrat', size: c.size || 0.055, color: c.color || '#FFFFFF', y: c.y ?? 0.8,
      uppercase: !!c.uppercase, maxWidth: 0.86, animationOut: 'none', shadow: 0.6, weight: 'bold' });
    switch (c.template) {
      case 'karaoke': Object.assign(s, { weight: 'black', strokeWidth: 0.35, animationIn: 'pop' }); break;
      case 'word_pop': Object.assign(s, { weight: 'black', strokeWidth: 0.45, animationIn: 'pop' }); break;
      case 'boxed': Object.assign(s, { background: 'box', backgroundColor: '#000000B3', shadow: 0, animationIn: 'fade' }); break;
      case 'bold_stroke': Object.assign(s, { weight: 'heavy', strokeWidth: 0.5, shadow: 0.4, animationIn: 'word_by_word' }); break;
      case 'neon': Object.assign(s, { glowColor: c.highlightColor || '#00E5FF', glowAmount: 0.8, shadow: 0, animationIn: 'fade', loop: 'glow_pulse' }); break;
      case 'minimal': Object.assign(s, { weight: 'medium', size: (c.size || 0.055) * 0.85, shadow: 0.35, animationIn: 'fade' }); break;
      default: s.animationIn = 'fade';
    }
    return s;
  };
})();
