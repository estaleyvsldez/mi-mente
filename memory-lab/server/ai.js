/* MEMORY LAB — proveedor de IA (opcional y aislado del motor de aprendizaje).
   Requiere: `npm install` (instala @anthropic-ai/sdk) y la variable ANTHROPIC_API_KEY.
   Si falta algo, la app funciona igual y la IA responde 503 explicando qué falta.
   Todas las salidas se validan aquí y, en el cliente, el contenido generado entra como
   «pendiente de revisión» antes de usarse en el entrenamiento. */
'use strict';

const MODEL = process.env.ML_AI_MODEL || 'claude-opus-5-5';
let client = null, loadError = null;

function getClient() {
  if (client || loadError) return client;
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const Ctor = Anthropic.default || Anthropic;
    client = new Ctor();
  } catch (e) {
    loadError = 'No está instalado el SDK de Anthropic. Ejecuta «npm install» en la carpeta memory-lab.';
  }
  return client;
}

function status() {
  const hasKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  getClient();
  if (loadError) return { enabled: false, reason: loadError };
  if (!hasKey) return { enabled: false, reason: 'Falta la variable de entorno ANTHROPIC_API_KEY en el servidor.' };
  return { enabled: true, model: MODEL };
}

const S = (props, req) => ({ type: 'object', properties: props, required: req || Object.keys(props), additionalProperties: false });
const str = { type: 'string' };
const arrOf = (items) => ({ type: 'array', items });
const pair = arrOf(str);

const TASKS = {
  /* Genera estructuras de inglés en el formato de la biblioteca. */
  'english-patterns': {
    system: 'Eres lingüista nativo de inglés americano y profesor experto de hispanohablantes. Generas estructuras reutilizables de inglés cotidiano REAL, como las usan los nativos. Nada de frases artificiales ni relleno. Marca con corchetes los bloques: [S:sujeto] [V:acción] [N:cosa] [A:cualidad] [P:lugar] [T:tiempo] [Q:pregunta] [C:conector] [X:oración]. El molde "f" contiene exactamente un hueco [R:___]. Explicaciones en español, breves.',
    schema: S({ patterns: arrOf(S({
      id: str, t: str, f: str, es: str, m: str, img: str, reg: { type: 'string', enum: ['informal', 'neutro', 'formal', 'coloquial', 'contexto'] },
      st: { type: 'integer' }, n: str, odd: str,
      sl: arrOf(pair), ex: arrOf(pair), bad: arrOf(pair), alt: arrOf(pair)
    })) }),
    prompt: i => `Genera ${Math.min(Number(i.count) || 3, 8)} estructuras nuevas para la categoría «${String(i.category).slice(0, 80)}», etapa ${Number(i.stage) || 2} (1 inicial … 6 espontánea avanzada). No repitas estas ya existentes: ${(i.existing || []).slice(0, 300).join(', ')}. ${i.focus ? 'Enfoque: ' + String(i.focus).slice(0, 200) : ''}
Cada estructura: sl = 6-8 pares [inglés, español] sustituibles en el hueco; ex = 4-5 pares [ejemplo con bloques, traducción natural]; bad = 0-2 ternas [incorrecto, correcto, por qué] típicas de hispanohablantes (como pares de 3 elementos); alt = 0-2 pares [otra forma, diferencia de uso]; odd = cuándo suena raro (o cadena vacía).`
  },
  /* Asociaciones vívidas para memorizar elementos. */
  'associations': {
    system: 'Eres entrenador de memoria. Creas imágenes mentales vívidas, exageradas, concretas y multisensoriales para enlazar elementos. Escribe en español, una o dos frases por asociación.',
    schema: S({ items: arrOf(S({ item: str, image: str })) }),
    prompt: i => `Técnica: ${String(i.technique || 'asociación visual').slice(0, 60)}. Contexto: ${String(i.context || '').slice(0, 300)}. Crea una asociación para cada elemento: ${(i.items || []).slice(0, 40).map(String).join(' | ')}`
  },
  /* Evalúa una oración libre en inglés. */
  'evaluate-english': {
    system: 'Eres profesor nativo de inglés. Evalúas si una oración es correcta y natural para un hablante nativo. Sé honesto y breve; explica en español. No inventes errores.',
    schema: S({ correct: { type: 'boolean' }, natural: { type: 'boolean' }, score: { type: 'number' }, fixed: str, explanation: str, register: str }),
    prompt: i => `Estructura practicada: ${String(i.pattern || '').slice(0, 120)}. Oración del estudiante: «${String(i.sentence || '').slice(0, 400)}». score de 0 a 1. fixed = versión natural (igual si ya es natural).`
  },
  /* Turno de conversación simulada con corrección. */
  'conversation': {
    system: 'Eres un interlocutor nativo de inglés en una simulación de situación real. Respondes como una persona normal (1-2 frases naturales) y después das feedback breve en español sobre la última respuesta del estudiante.',
    schema: S({ reply: str, reply_es: str, feedback: str, better: str, score: { type: 'number' } }),
    prompt: i => `Situación: ${String(i.situation || '').slice(0, 300)}. Estructuras que el estudiante está practicando: ${(i.patterns || []).slice(0, 12).join(', ')}.
Historial: ${(i.history || []).slice(-10).map(h => (h.who === 'me' ? 'Estudiante: ' : 'Tú: ') + String(h.text).slice(0, 300)).join('\n')}
score de 0 a 1 para la última respuesta del estudiante; better = forma más natural de decirlo.`
  },
  /* Explicación de una técnica adaptada a la dificultad del usuario. */
  'explain-technique': {
    system: 'Eres investigador en ciencias cognitivas y entrenador de memoria. Explicas con claridad, sin exagerar la eficacia, indicando limitaciones. Español.',
    schema: S({ explanation: str, example: str, tips: arrOf(str) }),
    prompt: i => `Técnica: ${String(i.technique || '').slice(0, 80)}. Problema detectado: ${String(i.problem || 'ninguno').slice(0, 200)}. Tipo de información: ${String(i.info || '').slice(0, 120)}.`
  }
};

async function run(task, input) {
  const st = status();
  if (!st.enabled) { const e = new Error(st.reason); e.status = 503; throw e; }
  const t = TASKS[task];
  if (!t) { const e = new Error('Tarea de IA desconocida'); e.status = 400; throw e; }
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: t.schema } },
    system: t.system,
    messages: [{ role: 'user', content: t.prompt(input || {}) }]
  });
  if (response.stop_reason === 'refusal') { const e = new Error('La IA rechazó la petición.'); e.status = 422; throw e; }
  if (response.stop_reason === 'max_tokens') { const e = new Error('La respuesta de la IA quedó incompleta.'); e.status = 502; throw e; }
  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
  let data;
  try { data = JSON.parse(text); } catch (_) { const e = new Error('La IA devolvió un formato no válido.'); e.status = 502; throw e; }
  return { task, model: MODEL, data };
}

module.exports = { status, run, TASKS };
