# Formato de contenido de inglés

Cada archivo `public/data/english/pNN-*.js` registra estructuras con `SEM.P({...})`.

| Campo | Obligatorio | Descripción |
|---|---|---|
| `id` | sí | único, minúsculas y guiones |
| `cat` | sí | id de `categories.js` |
| `st` | sí | etapa 1-6 |
| `reg` | sí | `informal` · `neutro` · `formal` · `coloquial` · `contexto` |
| `f` | sí | molde con bloques y UN hueco: `I want to [V:___].` |
| `es` | sí | molde en español con `[___]` |
| `m` | sí | para qué sirve |
| `sl` | sí si hay hueco | banco de sustitución `[["eat", "comer"], …]` (≥3; idealmente 6-8) |
| `ex` | sí | ≥3 ejemplos naturales `["I want to [V:go home].", "Quiero ir a casa.", ["alternativa válida"]]` |
| `n` | recomendado | nota breve de uso |
| `bad` | recomendado | errores típicos de hispanohablantes `[incorrecto, correcto, por qué]` |
| `alt` | opcional | otras formas naturales `[molde, diferencia de uso]` |
| `odd` | opcional | cuándo suena raro |
| `dlg` | opcional | mini intercambio `[["A", inglés, español], ["B", …]]` (el usuario es B) |
| `req` / `rel` | opcional | prerrequisitos / relacionadas (ids existentes) |
| `img`, `tags`, `t` | opcional | emoji, etiquetas, título (se genera del molde) |

Bloques: `[S:sujeto]` `[V:acción]` `[N:cosa]` `[A:cualidad]` `[P:lugar]` `[T:tiempo]` `[Q:pregunta]` `[C:conector]` `[X:oración]`.
El texto sin corchetes es la estructura fija. Colores: azul sujeto, verde acción, amarillo bloque estructural,
morado complemento, rojo negación (se detecta sola), naranja preguntas y conectores.

## Criterios de calidad

1. Inglés que un nativo diría de verdad, en el registro indicado. Nada de frases de libro de texto.
2. Español natural en las traducciones (no calcos inversos).
3. El banco de sustitución debe producir oraciones correctas en inglés **y** en español con ambos moldes.
4. Sin ejemplos duplicados ni estructuras con el mismo molde.
5. Errores típicos reales de hispanohablantes, con explicación breve.

## Ampliar

- Editar los archivos y ejecutar `npm run validate`.
- Desde la app: **Inglés → Ampliar biblioteca**: generación con IA o importación de un JSON
  `{"patterns": [ … ]}` con los campos de arriba. Todo entra como pendiente, pasa la validación automática y
  solo se usa tras tu aprobación.

Diálogos (`dialogues.js`, `SEM.D`) y combinaciones (`combos.js`, `SEM.C`) siguen el mismo principio: `uses`
lista las estructuras que entrenan, y la app solo evalúa combinaciones cuyas estructuras ya estudiaste.
