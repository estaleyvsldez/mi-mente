// Cerebro GRATIS del equipo: Gemini de Google (key gratis en aistudio.google.com, sin tarjeta).
(function () {
  const BASE = 'https://generativelanguage.googleapis.com/v1beta';

  /// Quién piensa: Gemini (gratis) o Anthropic (de pago, opcional).
  MM.aiProvider = () => {
    const s = MM.settings;
    if (s.aiProvider === 'anthropic' && s.anthropicKey) return 'anthropic';
    if (s.geminiKey) return 'gemini';
    if (s.anthropicKey) return 'anthropic';
    return 'none';
  };
  MM.hasAI = () => MM.aiProvider() !== 'none';

  const key = () => (MM.settings.geminiKey || '').replace(/\s+/g, '');

  /// Modelos gratis disponibles con tu key (el más nuevo "flash" primero, luego los "lite").
  async function models() {
    if (MM.settings.geminiModel) return [MM.settings.geminiModel];
    const cache = MM.store.get('gemini_models', null);
    if (cache && cache.key === key().slice(-6) && Date.now() - cache.at < 24 * 3600e3) return cache.list;
    let list = [];
    try {
      const r = await fetch(`${BASE}/models?pageSize=200&key=${encodeURIComponent(key())}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.message || r.status);
      const ver = (n) => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
      list = (j.models || [])
        .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map((m) => m.name.replace('models/', ''))
        .filter((n) => /^gemini-\d/.test(n) && /flash/.test(n) && !/(image|tts|audio|live|embedding|thinking-exp|exp-\d)/.test(n))
        .sort((a, b) => {
          const lite = (n) => (/lite/.test(n) ? 1 : 0), prev = (n) => (/preview/.test(n) ? 1 : 0);
          return lite(a) - lite(b) || ver(b) - ver(a) || prev(a) - prev(b) || a.length - b.length;
        });
    } catch (e) {
      if (/API key|API_KEY|permission|403|400/i.test(String(e.message))) throw new Error(MM.geminiHelp(String(e.message)));
    }
    if (!list.length) list = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    MM.store.set('gemini_models', { key: key().slice(-6), at: Date.now(), list: list.slice(0, 5) });
    return list.slice(0, 5);
  }

  MM.geminiHelp = (msg) => {
    if (/API key not valid|API_KEY_INVALID|invalid api key/i.test(msg || '')) return 'Tu key gratis de Gemini no es válida. Copia una nueva en aistudio.google.com → Get API key y pégala completa en Ajustes (empieza con "AIza").';
    if (/quota|RESOURCE_EXHAUSTED|rate/i.test(msg || '')) return 'Llegaste al límite gratis de Gemini por ahora. Espera un minuto (o hasta mañana si es el límite diario) y vuelve a intentar.';
    if (/location|region|not supported/i.test(msg || '')) return 'Gemini gratis no está disponible en tu región con esta cuenta.';
    return 'Gemini respondió con un error: ' + String(msg || '').slice(0, 200);
  };

  // Pocas llamadas a la vez para no chocar con el límite gratis por minuto.
  let active = 0;
  const waiters = [];
  const acquire = () => new Promise((res) => { if (active < 3) { active++; res(); } else waiters.push(res); });
  const release = () => { active--; const n = waiters.shift(); if (n) { active++; n(); } };

  /// Convierte los mensajes del equipo (formato Anthropic) al de Gemini.
  function toParts(content) {
    return content.map((b) => (b.type === 'image'
      ? { inlineData: { mimeType: b.source.media_type, data: b.source.data } }
      : { text: b.text })).filter((p) => p.text !== undefined || p.inlineData);
  }

  MM.geminiCall = async ({ system, content, schema, maxTokens = 16000, timeoutMs = 180000 }) => {
    if (!key()) throw new Error('Pon tu key gratis de Gemini en Ajustes ⚙︎ (aistudio.google.com → Get API key).');
    const list = await models();
    const body = (withSchema) => ({
      systemInstruction: { parts: [{ text: system + (withSchema ? '' : '\n\nReturn ONLY JSON that matches this JSON Schema exactly:\n' + JSON.stringify(schema)) }] },
      contents: [{ role: 'user', parts: toParts(content) }],
      generationConfig: Object.assign({ responseMimeType: 'application/json', maxOutputTokens: Math.min(maxTokens, 65536), temperature: 0.7 },
        withSchema ? { responseJsonSchema: schema } : {}),
    });
    await acquire();
    try {
      let lastErr = null;
      for (const model of list) {
        let withSchema = true;
        for (let attempt = 1; attempt <= 4; attempt++) {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), timeoutMs);
          let r, j;
          try {
            r = await fetch(`${BASE}/models/${model}:generateContent?key=${encodeURIComponent(key())}`, {
              method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body(withSchema)), signal: ctrl.signal,
            });
            j = await r.json().catch(() => ({}));
          } catch (e) {
            clearTimeout(timer);
            lastErr = new Error(e.name === 'AbortError' ? 'Gemini tardó demasiado en responder.' : 'Sin conexión con Gemini.');
            if (attempt < 3) { await MM.sleep(1500 * attempt); continue; }
            break;
          }
          clearTimeout(timer);
          const msg = j.error?.message || '';
          if (r.status === 429 || r.status === 503 || r.status >= 500) {
            lastErr = new Error(MM.geminiHelp(msg || 'quota'));
            const delay = parseFloat(((j.error?.details || []).find((d) => d.retryDelay) || {}).retryDelay) || 0;
            if (attempt < 3 && delay <= 40) { await MM.sleep(Math.max(2, delay) * 1000); continue; }
            break;   // probar el siguiente modelo gratis
          }
          if (r.status === 404) { lastErr = new Error('modelo no disponible: ' + model); break; }
          if (r.status === 400 && withSchema && /schema|responseJsonSchema|Unknown name/i.test(msg)) { withSchema = false; continue; }
          if (!r.ok) throw new Error(MM.geminiHelp(msg || r.status));
          const cand = (j.candidates || [])[0];
          if (!cand) throw new Error('Gemini no quiso responder eso. Pídelo de otra forma.');
          if (cand.finishReason === 'SAFETY' || cand.finishReason === 'PROHIBITED_CONTENT') throw new Error('Gemini no quiso hacer eso. Pídelo de otra forma.');
          const text = (cand.content?.parts || []).filter((p) => p.text && !p.thought).map((p) => p.text).join('');
          try {
            return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
          } catch {
            lastErr = new Error(cand.finishReason === 'MAX_TOKENS' ? 'La respuesta de Gemini quedó cortada.' : 'Gemini respondió algo que no entendí.');
            if (attempt < 2) continue;
            break;
          }
        }
      }
      throw lastErr || new Error('Gemini no respondió.');
    } finally { release(); }
  };

  /// Prueba la key gratis de Gemini.
  MM.testGeminiKey = async (k) => {
    k = (k || '').replace(/\s+/g, '');
    if (!k) return { ok: false, msg: 'Pega tu key gratis primero.' };
    try {
      const r = await fetch(`${BASE}/models?pageSize=50&key=${encodeURIComponent(k)}`);
      const j = await r.json().catch(() => ({}));
      if (r.ok) return { ok: true, msg: '✅ Tu key gratis de Gemini funciona. El equipo está listo.' };
      return { ok: false, msg: MM.geminiHelp(j.error?.message || String(r.status)) };
    } catch { return { ok: false, msg: 'No hay conexión con Google. Revisa tu internet.' }; }
  };
})();
