# Mi Mente — editor de video con IA (iPhone y laptop)

**Link:** https://raw.githack.com/estaleyvsldez/mi-mente/claude/video-editing-app-ai-2xnavh/web/index.html

iPhone: Safari → Compartir → **Agregar a pantalla de inicio**. Laptop Dell: Chrome o Edge.

## Primer uso (2 minutos)
1. Toca ⚙︎ **Ajustes**.
2. **API key de Anthropic** (es el equipo de IA que edita; cuesta centavos por edición):
   console.anthropic.com → API Keys → Create Key.
3. Listo. **El video con IA, los subtítulos, la música y la voz son GRATIS** con modelos open source:
   - **Hugging Face** (automático, sin instalar nada): usa los demos públicos de LTX-Video y Wan. Hay fila y una
     cuota diaria; con un **token gratis** de Hugging Face (huggingface.co → Settings → Access Tokens) tienes más.
   - **Tu Google Colab gratis** (más potente y sin fila): abre
     [el cuaderno](https://colab.research.google.com/github/estaleyvsldez/mi-mente/blob/claude/video-editing-app-ai-2xnavh/web/colab/MiMente_Motor_Gratis.ipynb),
     Entorno de ejecución → **GPU T4** → **Ejecutar todo**, copia el link `…trycloudflare.com` y pégalo en Ajustes.
     Corre LTX-Video (video), Whisper (subtítulos), MusicGen (música) y MMS (voz). Deja la pestaña abierta.
   - **Subtítulos en tu equipo**: sin Colab, Whisper corre dentro del navegador (la primera vez baja ~80 MB).
4. fal.ai queda como opción de pago (más rápida) en Ajustes → avanzado. No hace falta.

## Qué hace
- **Le hablas normal y lo hace todo** ("quita esa parte", "ponle colores fuertes", "más risa en el chiste").
  Entiende jergas de cualquier país (dominicana, mexicana, boricua…) e idiomas, y mete zooms, efectos y
  sonidos para dar risa, suspenso o susto.
- **Equipo de agentes expertos en paralelo**: 🧭 Productor, 🎬 Editor, 🎨 Colorista, ✍️ Diseñador,
  ✨ VFX, 🎧 Sonido, 🎥 Director IA, 🤖 Generador, 📝 Guionista y 🛡️ Control de Calidad.
- **🛡️ Control de Calidad**: nada se exporta sin que lo apruebe. Revisa cuadros reales del video final y
  manda a arreglar lo que falle.
- **Arsenal de sonido**: 31 efectos creados en el momento (whoosh, impactos, boom, risers, boing,
  record scratch, risas, latidos, suspenso, terror, trueno…) y bases musicales por estado de ánimo, o
  música original con IA.
- **Crear video con IA desde una idea** (tipo Higgsfield): el Director lo planea en tomas y se generan
  todas a la vez con modelos open source gratis (LTX-Video, Wan).
- **🎬 Estudio de Películas, Series y Novelas**: el Guionista escribe la historia y cada guion, tú los
  apruebas o pides cambios, y se produce capítulo a capítulo con narración, subtítulos, música y efectos.
  Todo queda guardado en el navegador para seguir otro día.
- Color de colorista, 16 transiciones, 25 efectos, textos animados, subtítulos karaoke, audio de estudio,
  video de referencia para copiar y mejorar un estilo.
- **Exportación hasta 4K** cuadro por cuadro (sin saltos). Videos largos: en la laptop (Chrome) se guarda
  directo al disco.

## Límites reales (para que no te agarren de sorpresa)
- **Links de TikTok / Instagram / YouTube**: esas plataformas no dejan que otra app baje sus videos.
  Guárdalo en tu galería y súbelo como **video de referencia** (botón ＋): el equipo copia el estilo y lo mejora.
- **Videos muy largos en el iPhone**: Safari tiene poca memoria. Hasta ~20–30 min va bien en el teléfono.
  Para películas largas o 4K largo usa la laptop.
- **Video con IA gratis**: los modelos gratis (LTX-Video, Wan) hacen tomas de buena calidad pero menos
  realistas que los de pago (Kling/Veo), y tardan: en Colab ~2–5 min por toma; en Hugging Face depende de la
  fila y de la cuota diaria. Google Colab gratis da unas horas de GPU al día.
- **El equipo de IA que edita** (Claude) sí cuesta centavos por edición con tu key de Anthropic.
