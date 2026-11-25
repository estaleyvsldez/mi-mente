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
| Cortes | quitar partes, reordenar, repetir, cámara lenta o rápida (0.25×–4×) |
| Color | cinematic, warm, cool, vintage, black & white, vibrant, teal & orange, moody, pastel + exposición, contraste, saturación, temperatura y viñeta |
| Transiciones | corte, crossfade, fundido a negro, flash blanco, zoom, deslizar |
| Textos | 6 estilos, 3 tamaños, 4 posiciones, animaciones (fade, pop, subir, máquina de escribir) |
| Subtítulos | automáticos a partir del audio |
| Escenas IA | gráficos animados (degradados) o zoom "Ken Burns" sobre un cuadro de tu video, con título |

> Las "escenas con IA" son gráficos animados que se generan en el iPhone. Generar video
> realista desde texto necesita un servicio aparte (de pago); el motor ya está listo para
> enchufarle uno: basta con producir un .mp4 por escena en `EditorModel.prepareScenes`.

## Ponerla en tu iPhone

Necesitas una **Mac con Xcode 16 o más nuevo**. Apple solo deja instalar apps propias desde Xcode
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

Cada edición es una llamada a la API de Anthropic que pagas con tu key (centavos por edición,
según lo largo del video). La key se guarda en el llavero del iPhone. **No publiques la app en la
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
