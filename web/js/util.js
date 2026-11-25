// Utilidades compartidas de Mi Mente (web).
window.MM = window.MM || {};

MM.clamp = (v, a, b) => Math.min(b, Math.max(a, Number.isFinite(v) ? v : a));
MM.lerp = (a, b, k) => a + (b - a) * k;
MM.easeInOut = (x) => x * x * (3 - 2 * x);
MM.easeOut = (x) => 1 - Math.pow(1 - x, 3);
MM.backOut = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
MM.bounceOut = (x) => {
  const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) { x -= 1.5 / d1; return n1 * x * x + 0.75; }
  if (x < 2.5 / d1) { x -= 2.25 / d1; return n1 * x * x + 0.9375; }
  x -= 2.625 / d1; return n1 * x * x + 0.984375;
};
// Ruido determinista: mismo cuadro, mismo resultado (vista previa = exportación).
MM.hash = (a, b = 0) => {
  let x = (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663)) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d) >>> 0; x ^= x >>> 15; x = Math.imul(x, 0x846ca68b) >>> 0; x ^= x >>> 16;
  return (x % 10000) / 10000;
};
MM.hexToRgb = (hex, fallback = [1, 1, 1]) => {
  if (!hex || typeof hex !== 'string') return fallback;
  let s = hex.trim().replace('#', '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  if (s.length !== 6 && s.length !== 8) return fallback;
  const n = parseInt(s.slice(0, 6), 16);
  if (Number.isNaN(n)) return fallback;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
MM.hexToCss = (hex, fallback = '#ffffff') => {
  if (!hex || typeof hex !== 'string') return fallback;
  let s = hex.trim().replace('#', '');
  if (s.length === 8) {
    const a = parseInt(s.slice(6, 8), 16) / 255;
    const [r, g, b] = MM.hexToRgb('#' + s.slice(0, 6)).map((v) => Math.round(v * 255));
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }
  if (s.length === 6 || s.length === 3) return '#' + s;
  return fallback;
};
MM.fmtTime = (s) => {
  s = Math.max(0, s || 0);
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
};
MM.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
MM.uid = () => Math.random().toString(36).slice(2, 10);

// Ajustes guardados solo en este navegador.
MM.store = {
  get(k, d) { try { const v = localStorage.getItem('mm_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mm_' + k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};

MM.defaults = {
  anthropicKey: '',
  geminiKey: '',
  aiProvider: 'auto',
  falKey: '',
  quality: '720',
  t2vModel: 'fal-ai/kling-video/v2.1/master/text-to-video',
  i2vModel: 'fal-ai/kling-video/v2.1/standard/image-to-video',
  whisperModel: 'fal-ai/whisper',
  musicModel: 'fal-ai/lyria2',
  ttsModel: 'fal-ai/elevenlabs/tts/multilingual-v2',
};
MM.settings = Object.assign({}, MM.defaults, MM.store.get('settings', {}));
MM.saveSettings = () => MM.store.set('settings', MM.settings);
