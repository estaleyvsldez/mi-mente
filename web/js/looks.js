// Looks de color (presets de colorista) y efectos por tiempo.
(function () {
  const W0 = () => ({ hue: 0, amount: 0, luma: 0 });
  MM.neutralGrade = () => ({
    preset: 'none', presetIntensity: 1, exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
    temperature: 0, tint: 0, saturation: 0, vibrance: 0, lift: W0(), gamma: W0(), gain: W0(),
    splitShadows: '#000000', splitHighlights: '#FFFFFF', splitAmount: 0, fade: 0, grain: 0, vignette: 0,
    bloom: 0, sharpen: 0, skinProtect: 0.5,
  });

  const L = (o) => Object.assign(MM.neutralGrade(), o);
  MM.LOOKS = {
    none: L({}),
    cinematic: L({ contrast: 0.25, saturation: -0.1, blacks: -0.1, fade: 0.04, vignette: 0.3, splitShadows: '#1E5A6E', splitHighlights: '#FFB070', splitAmount: 0.35, skinProtect: 0.6 }),
    teal_orange: L({ contrast: 0.2, saturation: 0.1, splitShadows: '#00707A', splitHighlights: '#FF9A3C', splitAmount: 0.6, skinProtect: 0.6 }),
    warm: L({ temperature: 0.35, tint: 0.05, saturation: 0.05 }),
    cool: L({ temperature: -0.35, saturation: -0.05 }),
    golden_hour: L({ temperature: 0.5, tint: 0.1, highlights: -0.1, bloom: 0.25, saturation: 0.1, splitShadows: '#5A3A2A', splitHighlights: '#FFC56E', splitAmount: 0.4 }),
    kodak_film: L({ temperature: 0.15, contrast: 0.1, fade: 0.12, saturation: -0.05, grain: 0.25, splitShadows: '#3A4A5A', splitHighlights: '#FFD8A8', splitAmount: 0.3 }),
    fuji_film: L({ tint: 0.08, contrast: 0.15, grain: 0.2, splitShadows: '#2D5A4E', splitHighlights: '#FFF1D6', splitAmount: 0.3 }),
    bleach_bypass: L({ saturation: -0.55, contrast: 0.45, highlights: -0.1, vignette: 0.25, sharpen: 0.3 }),
    cross_process: L({ tint: -0.2, contrast: 0.3, saturation: 0.25, splitShadows: '#003C8F', splitHighlights: '#FFF06A', splitAmount: 0.5 }),
    matrix: L({ tint: -0.6, saturation: -0.3, contrast: 0.3, splitShadows: '#002A10', splitHighlights: '#B6FFB0', splitAmount: 0.5 }),
    cyberpunk: L({ saturation: 0.3, contrast: 0.3, temperature: -0.2, bloom: 0.35, splitShadows: '#2A00FF', splitHighlights: '#FF2BD6', splitAmount: 0.55 }),
    nordic: L({ temperature: -0.3, saturation: -0.35, fade: 0.15, contrast: -0.05, highlights: 0.1 }),
    vintage: L({ fade: 0.25, saturation: -0.25, temperature: 0.25, grain: 0.35, vignette: 0.35, splitShadows: '#3A2E4A', splitHighlights: '#FFDCA0', splitAmount: 0.3 }),
    faded_film: L({ fade: 0.4, contrast: -0.2, saturation: -0.2, grain: 0.3 }),
    noir: L({ saturation: -1, contrast: 0.6, blacks: -0.2, vignette: 0.5, grain: 0.3 }),
    black_white: L({ saturation: -1, contrast: 0.15 }),
    sepia: L({ saturation: -1, contrast: 0.05, fade: 0.1, splitShadows: '#704214', splitHighlights: '#E8C99A', splitAmount: 0.65 }),
    vibrant: L({ vibrance: 0.5, saturation: 0.15, contrast: 0.1 }),
    hdr_pop: L({ shadows: 0.5, highlights: -0.5, vibrance: 0.35, sharpen: 0.4 }),
    moody: L({ exposure: -0.25, saturation: -0.3, contrast: 0.3, temperature: -0.15, vignette: 0.45, blacks: -0.1, splitShadows: '#1C2A3A', splitHighlights: '#C9B8A0', splitAmount: 0.35 }),
    pastel: L({ contrast: -0.3, saturation: -0.25, fade: 0.2, exposure: 0.15, splitShadows: '#B9A7D6', splitHighlights: '#FFD6E8', splitAmount: 0.3 }),
    dreamy: L({ bloom: 0.5, contrast: -0.15, fade: 0.1, highlights: 0.1, temperature: 0.1 }),
    desert: L({ temperature: 0.45, saturation: -0.1, contrast: 0.15 }),
    arctic: L({ temperature: -0.5, saturation: -0.2, exposure: 0.15, highlights: 0.2 }),
    neon_night: L({ saturation: 0.35, bloom: 0.4, contrast: 0.25, splitShadows: '#14003C', splitHighlights: '#00E5FF', splitAmount: 0.5 }),
  };
  MM.LOOK_NAMES = Object.keys(MM.LOOKS);

  const ADD = ['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks', 'temperature', 'tint', 'saturation',
    'vibrance', 'fade', 'grain', 'vignette', 'bloom', 'sharpen'];

  /// Look + ajustes del usuario → valores finales para el shader.
  MM.effectiveGrade = (g) => {
    g = Object.assign(MM.neutralGrade(), g || {});
    const look = MM.LOOKS[g.preset] || MM.LOOKS.none;
    const k = MM.clamp(g.presetIntensity ?? 1, 0, 1);
    const out = Object.assign({}, g);
    ADD.forEach((key) => { out[key] = (g[key] || 0) + (look[key] || 0) * k; });
    if (!(g.splitAmount > 0) && look.splitAmount > 0) {
      out.splitShadows = look.splitShadows; out.splitHighlights = look.splitHighlights; out.splitAmount = look.splitAmount * k;
    }
    ['contrast', 'highlights', 'shadows', 'whites', 'blacks', 'temperature', 'tint', 'vibrance'].forEach((key) => { out[key] = MM.clamp(out[key], -1, 1); });
    out.saturation = MM.clamp(out.saturation, -1, 1.5);
    ['fade', 'grain', 'vignette', 'bloom', 'sharpen'].forEach((key) => { out[key] = MM.clamp(out[key], 0, 1); });
    return out;
  };

  /// Rueda de color → desplazamiento RGB (suma cero).
  MM.wheelOffset = (w) => {
    if (!w || !(w.amount > 0)) return [0, 0, 0];
    const h = ((w.hue % 360) + 360) % 360 / 60;
    const x = 1 - Math.abs((h % 2) - 1);
    const rgb = h < 1 ? [1, x, 0] : h < 2 ? [x, 1, 0] : h < 3 ? [0, 1, x] : h < 4 ? [0, x, 1] : h < 5 ? [x, 0, 1] : [1, 0, x];
    const mean = (rgb[0] + rgb[1] + rgb[2]) / 3;
    const k = w.amount * 0.25;
    return rgb.map((v) => (v - mean) * k);
  };

  MM.EFFECTS = ['zoom_in', 'zoom_out', 'punch_in', 'ken_burns', 'shake', 'handheld', 'glitch', 'rgb_split', 'vhs',
    'old_film', 'light_leak', 'flash', 'strobe', 'blur', 'focus_in', 'mirror', 'kaleidoscope', 'pixelate', 'posterize',
    'duotone', 'thermal', 'invert', 'hue_cycle', 'dreamy_glow', 'letterbox'];
  const CAMERA = new Set(['zoom_in', 'zoom_out', 'punch_in', 'ken_burns', 'shake', 'handheld']);

  /// Cámara de una capa en el instante t.
  MM.cameraAt = (effects, t) => {
    let scale = 1, dx = 0, dy = 0, rot = 0;
    for (const s of effects) {
      if (!CAMERA.has(s.e.type) || t < s.start || t > s.end) continue;
      const k = MM.clamp(s.e.intensity ?? 0.7, 0, 1);
      const p = MM.clamp((t - s.start) / Math.max(s.end - s.start, 0.001), 0, 1);
      const local = t - s.start;
      const f = Math.floor(t * 30);
      switch (s.e.type) {
        case 'zoom_in': scale *= 1 + 0.4 * k * MM.easeInOut(p); break;
        case 'zoom_out': scale *= 1 + 0.4 * k * (1 - MM.easeInOut(p)); break;
        case 'punch_in': scale *= 1 + 0.3 * k * MM.easeOut(Math.min(1, local / 0.12)); break;
        case 'ken_burns': scale *= 1.12 + 0.06 * p; dx += (p - 0.5) * 0.07 * k; break;
        case 'shake':
          dx += (MM.hash(f, 1) - 0.5) * 0.044 * k; dy += (MM.hash(f, 2) - 0.5) * 0.044 * k;
          rot += (MM.hash(f, 3) - 0.5) * 0.02 * k; scale *= 1 + 0.07 * k; break;
        case 'handheld':
          dx += 0.012 * k * (Math.sin(t * 1.3) + 0.5 * Math.sin(t * 2.9 + 1));
          dy += 0.012 * k * (Math.sin(t * 1.1 + 2) + 0.4 * Math.sin(t * 3.3));
          rot += 0.006 * k * Math.sin(t * 0.9); scale *= 1 + 0.05 * k; break;
      }
    }
    return { scale: scale * (1 + Math.abs(rot) * 1.2), dx, dy, rot };
  };

  /// Efectos de estilo activos → uniforms del shader de capa.
  MM.fxAt = (effects, t) => {
    const fx = { rgb: 0, glitch: 0, vhs: 0, old: 0, pixel: 0, mirror: 0, kaleido: 0, poster: 0, duo: 0, thermal: 0, invert: 0, hue: 0, blur: 0, glow: 0 };
    for (const s of effects) {
      if (t < s.start || t > s.end) continue;
      const k = MM.clamp(s.e.intensity ?? 0.7, 0, 1);
      const p = MM.clamp((t - s.start) / Math.max(s.end - s.start, 0.001), 0, 1);
      const local = t - s.start;
      switch (s.e.type) {
        case 'glitch': fx.glitch = Math.max(fx.glitch, local < 0.15 ? 1 : k); break;
        case 'rgb_split': fx.rgb = Math.max(fx.rgb, k * (1 + 0.3 * Math.sin(t * 6))); break;
        case 'vhs': fx.vhs = Math.max(fx.vhs, k); break;
        case 'old_film': fx.old = Math.max(fx.old, k); break;
        case 'pixelate': fx.pixel = Math.max(fx.pixel, k); break;
        case 'mirror': fx.mirror = 1; break;
        case 'kaleidoscope': fx.kaleido = Math.max(fx.kaleido, 0.4 + 0.6 * k); break;
        case 'posterize': fx.poster = Math.max(fx.poster, k); break;
        case 'duotone': fx.duo = Math.max(fx.duo, k); fx.duoA = s.e.color || '#1B0B5A'; fx.duoB = s.e.secondaryColor || '#FF5F9E'; break;
        case 'thermal': fx.thermal = Math.max(fx.thermal, k); break;
        case 'invert': fx.invert = Math.max(fx.invert, k); break;
        case 'hue_cycle': fx.hue = (local * 0.4 * k) % 1; break;
        case 'blur': fx.blur = Math.max(fx.blur, k); break;
        case 'focus_in': fx.blur = Math.max(fx.blur, k * (1 - MM.easeOut(p))); break;
        case 'dreamy_glow': fx.glow = Math.max(fx.glow, 0.4 + 0.6 * k); break;
      }
    }
    return fx;
  };

  /// Efectos globales de la mezcla final (luces, flash, franjas).
  MM.overlayAt = (effects, t) => {
    const o = { flash: 0, leak: 0, letterbox: 0, leakA: null, leakB: null };
    for (const s of effects) {
      if (t < s.start || t > s.end) continue;
      const k = MM.clamp(s.e.intensity ?? 0.7, 0, 1);
      const p = MM.clamp((t - s.start) / Math.max(s.end - s.start, 0.001), 0, 1);
      const local = t - s.start;
      switch (s.e.type) {
        case 'flash': o.flash = Math.max(o.flash, k * Math.pow(1 - p, 2)); break;
        case 'strobe': if (Math.floor(t * 30) % 4 < 2) o.flash = Math.max(o.flash, 0.75 * k); break;
        case 'light_leak': o.leak = Math.max(o.leak, k * (0.6 + 0.25 * Math.sin(t * 1.7))); o.leakA = s.e.color || null; o.leakB = s.e.secondaryColor || null; break;
        case 'letterbox': o.letterbox = Math.max(o.letterbox, 0.12 * MM.easeOut(Math.min(1, local / 0.5)) * (0.5 + 0.5 * k)); break;
      }
    }
    return o;
  };
})();
