# Mi Mente — editor de video con IA para iPhone

Subes un video y la app lo edita sola: corta los tiempos muertos, le pone colores, textos,
transiciones y subtítulos, y puede crear escenas nuevas (intro, outro, tarjetas). Si algo no te
gusta, lo escribes ("ponle colores más cálidos", "quita el principio", "el texto más grande") y la
IA rehace la edición.

## Cómo funciona

1. **Analiza**: la app saca de 6 a 16 cuadros del video y transcribe lo que se dice con el
   reconocimiento de voz del iPhone (en el dispositivo).
2. **Decide**: manda eso a Claude (`claude-opus-5-5`), que responde con un **plan de edición** en
   JSON: segmentos (cortes, orden, velocidad), escenas generadas, transiciones, color, textos,
   subtítulos y audio. El formato se fija con *structured outputs*, así que siempre llega válido.
3. **Renderiza**: el iPhone arma el video con AVFoundation y un compositor propio en Core Image
   (`Engine/`). La vista previa y la exportación usan el mismo motor.
4. **Cambios**: lo que escribes se manda junto con el plan actual; la IA devuelve el plan corregido.
   Los cuadros y la transcripción van en caché (*prompt caching*), así que cada cambio sale más
   rápido y más barato. El botón ↩︎ deshace.

| Qué edita | Opciones |
|---|---|
| Cortes | quitar partes, reordenar, repetir, velocidad 0.25×–4× y **rampas de velocidad** (cámara lenta en el mejor momento) |
| Formato | original, 9:16, 4:5, 1:1, 16:9, 21:9, con reencuadre en el punto de interés |
| **Color (nivel colorista)** | LUT 3D generado por plan · 25 looks (cinematic, teal & orange, Kodak, Fuji, bleach bypass, cyberpunk, noir…) · exposición, contraste, altas, sombras, blancos, negros · temperatura y tinte · **ruedas lift / gamma / gain** · **HSL por color** · split toning · protección de piel · claridad, nitidez, grano, bloom, halación, viñeta · **importar LUTs .cube** · color distinto por segmento |
| **Texto (motion graphics)** | 21 fuentes · contorno, degradado, sombra, **brillo neón**, caja/píldora/barra · espaciado, rotación, posición libre · entradas (pop, drop, blur, glitch, **palabra por palabra, letra por letra, máquina de escribir**), salidas y bucles (pulso, ola, flicker, arcoíris) · **texto detrás de la persona** |
| Subtítulos | automáticos desde el audio · plantillas karaoke (palabra activa resaltada), word pop, boxed, bold stroke, neón, minimal |
| **Efectos** | cámara: zoom, punch-in, Ken Burns, temblor, cámara en mano · estilo: glitch, RGB split, VHS, película vieja, light leak, flash, estrobo, zoom blur, motion blur, enfoque, espejo, caleidoscopio, pixelado, cómic, póster, boceto, bordes neón, duotono, térmico, invertir, ciclo de color, glow soñador, franjas de cine · **con detección de persona**: fondo desenfocado, color pop, contorno brillante, foco de luz |
| Transiciones | corte, crossfade, fundido a negro, flash, zoom in/out, deslizar, whip pan, giro, glitch, blur, iris, cortinilla, light leak |
| Escenas IA | gráficos animados (degradados) o zoom "Ken Burns" sobre un cuadro de tu video, con título |
| **Escenas con IA real** (tipo Higgsfield) | video generado por IA (Kling/Wan vía fal.ai): **otro ángulo de cámara** desde un cuadro de tu video, o escenas nuevas desde texto · 20 movimientos de cámara (dolly, órbita, grúa, dron FPV, bullet time, crash zoom…) |
| **Estudio de audio** | cancelador de ruido · EQ de 3 bandas · compresor · de-esser · reverb (sala, estudio, hall, catedral, plate) · tono · volumen parejo · 15 voces (podcast, locutor, grave, robot, alien, teléfono, megáfono, walkie, cueva, estadio, bajo el agua…) · música importada con **auto-ducking** (baja sola cuando hablas) |
| **Video de referencia** | elige un video que te guste y la IA copia su estilo: ritmo de cortes, color, tipografía, efectos y formato |
| **Editor de fotos** | la IA la retoca sola · todo el color pro y los efectos · textos de diseño (también detrás de la persona) · recorte, enderezar · suavizar piel · quitar / desenfocar / cambiar fondo · **relleno generativo** (quitar personas, cambiar el cielo, otro ángulo…) |
| **Editor pro manual** | botón de deslizadores: clips, color completo, cada texto, cada efecto, subtítulos, formato y audio |

> Las "escenas con IA" son gráficos animados que se generan en el iPhone. Generar video
> realista desde texto necesita un servicio aparte (de pago); el motor ya está listo para
> enchufarle uno: basta con producir un .mp4 por escena en `EditorModel.prepareScenes`.

## Ponerla en tu iPhone

**Sin laptop:** sigue [TESTFLIGHT.md](TESTFLIGHT.md) — una Mac en la nube de GitHub la compila y te llega por TestFlight.

**Con una Mac:** necesitas **Xcode 16 o más nuevo**. Apple solo deja instalar apps propias desde Xcode
(o desde TestFlight con cuenta de desarrollador de pago).

```bash
brew install xcodegen
cd editor-ia
xcodegen generate
open MiMenteEditor.xcodeproj
```

En Xcode:

1. Elige el target **MiMenteEditor** → *Signing & Capabilities* → en **Team** pon tu Apple ID
   (gratis sirve). Si te dice que el bundle ID ya existe, cámbialo, por ejemplo
   `com.tunombre.mimente`.
2. Conecta el iPhone por cable, elígelo arriba como destino y dale ▶︎.
3. En el iPhone: *Ajustes → General → VPN y gestión de dispositivos* → confía en tu certificado.
   También activa el *Modo desarrollador* si lo pide.
4. Abre la app → engranaje → pega tu **API key de Anthropic** (se crea en
   console.anthropic.com → API Keys).

Con un Apple ID gratis la app deja de abrir a los 7 días; vuelves a darle ▶︎ en Xcode y listo.

## Costos

- Cada edición es una llamada a la API de Anthropic que pagas con tu key (centavos por edición,
  según lo largo del video).
- Las escenas con IA real y el relleno generativo usan tu key de **fal.ai** (opcional): pagas por uso,
  desde centavos hasta ~1 USD por escena según el modelo. Los modelos se cambian en Ajustes.
- Lo demás (color, efectos, textos, audio, quitar fondo) se procesa gratis en el iPhone. La key se guarda en el llavero del iPhone. **No publiques la app en la
App Store así**, con la key dentro del teléfono: para eso hace falta un servidor propio que guarde la key.

## Estructura

```
editor-ia/
├── project.yml                 # proyecto de Xcode (XcodeGen)
└── MiMenteEditor/
    ├── App/        MiMenteApp, EditorModel (flujo: cargar → analizar → editar → renderizar)
    ├── AI/         ClaudeClient, EditDirector (prompts), PlanSchema, análisis de cuadros y voz
    ├── Models/     EditPlan (todo lo que decide la IA)
    ├── Engine/     CompositionBuilder, EditCompositor, ColorGrader, SceneRenderer, textos, exportar
    ├── Views/      Inicio, Editor (video + chat), Ajustes
    └── Support/    Keychain
```

GitHub Actions compila la app para el simulador en cada push (`.github/workflows/editor-ia-ios.yml`).
