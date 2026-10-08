# Integración de escenas cinematográficas en el catálogo

## Resultado

Se conservan los siete renderizadores originales, geometrías, shaders, modelos, materiales, narrativas e interacciones. No se muestra Expert Zone, sus insignias ni los botones de código «Próximamente». `cinematic` describe capacidades de renderizado; `premiumEligible` reserva una posible clasificación futura sin mostrarla ni restringir funciones.

| Animación | Categoría | Controles |
| --- | --- | --- |
| Eternal Bloom | Flores | Cristal, hojas/tallo, partículas, iluminación, texto y fondo |
| Soul Butterfly | Paisajes | Alas, luz secundaria, partículas/estela, iluminación, texto y fondo |
| Event Horizon | Espacio y cielo | Plasma, zona caliente, estrellas y texto |
| Crystal Heartbeat | Amor | Cristal, luz secundaria, partículas, energía interior, texto y fondo |
| Eternal Souls | Día de Muertos | Cempasúchil, ornamentos, partículas, iluminación, texto y fondo/niebla |
| Haunted Night | Halloween | Piedra, molduras, partículas, luz lunar, texto y fondo/niebla |
| Dark Spell | Halloween | Cuero, metal, partículas, energía/círculos, texto y fondo/niebla |

Event Horizon no ofrece iluminación independiente ni fondo plano: el fenómeno se dibuja por integración de rayos y tiene controles específicos. El resto ofrece seis parámetros. Texto se refiere a la dedicatoria final; las texturas de glifos y algunos acentos de transición mantienen su diseño artístico.

La paleta se define en `js/scene-palettes.js`. `js/anim/scene-colors.js` conecta colores de materiales, luces y uniformes por escena. Se instalan dos uniformes de tinte una vez en los materiales que necesitan preservar sus shaders existentes; al editar solo cambian valores, sin `needsUpdate`, geometrías nuevas ni recrear el reproductor. Se preservan niveles de detalle, animación, alpha y materiales ópticos. La selección del fondo también afecta a la niebla, manteniendo luminosidad nocturna. Los colores originales no activan tintes y restablecen exactamente los valores capturados.

`c1`–`c6` se validan como hexadecimales de seis dígitos en `cleanCard`. Los enlaces anteriores siguen siendo compatibles. Las escenas normales mantienen su comportamiento de dos colores; los parámetros adicionales solo se utilizan en estas siete. El editor conserva borradores, restaura enlaces compartidos y tiene un botón de restablecimiento sin reiniciar la secuencia.

## Exportación real

Las siete escenas necesitan módulos ES, Three.js y recursos; se exportan como **ZIP completo**, nunca como fragmentos HTML presentados como una experiencia completa. `codigo.html` distingue las dos modalidades:

- Escenas normales de un archivo: copia/descarga de HTML existente.
- Escenas cinematográficas: descarga del proyecto completo, lista de archivos y copia de instrucciones. «Ver vista previa» abre la experiencia personalizada del sitio; no se presenta como ejecución del ZIP.

El ZIP contiene `index.html`, `app.js`, `config.json` con texto y colores, `serve.cjs`, `README.md`, `manifest.json`, los módulos transitivamente importados, Three.js local, su licencia MIT y la imagen de respaldo. Haunted Night incluye GLTFLoader, BufferGeometryUtils, su GLB y las cinco variantes de texturas usadas. Incluye procedencia factual y modificaciones; no incluye la mansión candidata de Sketchfab, fuentes pesadas sin uso, renders de ejemplo ni textos promocionales de la API.

Se descarga como `.zip` sin bibliotecas de compresión externas. Para ejecutarlo: extraer todo, ejecutar `node serve.cjs` y abrir `http://127.0.0.1:8080`. Alternativa: `python -m http.server 8080 --bind 127.0.0.1`. No se necesita `npm install`, CDN ni conexión externa después de extraerlo. Abrir mediante `file://` no sirve para estos módulos: las instrucciones lo explican.

Tamaños aproximados: Eternal Bloom 810 KB; Soul Butterfly 854 KB; Event Horizon 821 KB; Crystal Heartbeat 796 KB; Eternal Souls 918 KB; Haunted Night 3,14 MB; Dark Spell 909 KB. Se mantiene intacto el permiso existente del código original de ViralCSS. Three.js conserva MIT y los recursos Poly Haven conservan CC0, con excepciones explícitas a las restricciones del código original.

## Rutas y catálogo

Las siete fichas, `crear.html?a=…`, `v.html?s=…` y `codigo.html?a=…` siguen usando sus identificadores originales. `/categorias/expert-zone.html` redirige al catálogo general y tiene enlace de respaldo y canonical. `?cat=expert-zone` en la portada vuelve a Todas mediante la validación existente. La antigua categoría sale del sitemap y de la navegación.

## Archivos de esta integración

- Catálogo y descubrimiento: `js/catalog.js`, `js/expert-catalog.js`, `js/autumn-expert-catalog.js`, `js/gallery.js`, `js/home.js`, `js/detail.js`, `js/overlay.js`, `tools/generate-seo.mjs`.
- Editor, compartir y exportar: `js/crear.js`, `js/viewer.js`, `js/share.js`, `js/codigo.js`, `js/standalone.js`, `js/project-export.js`, `js/scene-palettes.js`, `codigo.html`.
- Renderizado: `js/anim/scene-colors.js`, `js/anim/expert-runtime.js`, `js/anim/expert-adapter.js`, `js/anim/autumn-adapter.js`, `js/anim/eternal-bloom.js`, los siete archivos `*-renderer.js`, `js/anim/event-horizon-shader.js`, `js/anim/dark-spell-book.js`.
- Presentación generada: `index.html`, `animaciones.html`, las siete fichas, categorías `flores`, `paisajes`, `espacio`, `amor`, `muertos`, `halloween`, compatibilidad en `categorias/expert-zone.html`, `sitemap.xml`, `css/styles.css`.
- Herramientas: `tools/build-cinematic-projects.mjs`, `tools/cinematic-catalog-check.mjs`, `tools/check-cinematic-syntax.mjs`, `tools/new-expert-review.html`, actualización de expectativas en `tools/autumn-review.mjs`, `tools/new-expert-browser-check.mjs`, `tools/expert-browser-check.mjs`.
- Migraciones ejecutadas y protegidas frente a repetición: `tools/integrate-cinematic.mjs`, `tools/wire-cinematic-colors.mjs`, `tools/wire-palette-editor.mjs`, `tools/update-cinematic-checks.mjs`.

Los demás cambios que ya había en el workspace se conservaron. No se borraron dependencias ni recursos usados por las escenas.

## Verificación

Pruebas realizadas con Chrome real mediante CDP, capturas inspeccionadas con la herramienta de imágenes:

- `node tools/cinematic-catalog-check.mjs`: las siete escenas aparecen en el catálogo; colores con cambio real de píxeles; restablecimiento exacto; geometrías y programas estables; texto final editable; editor, compartir y restauración; descarga real de los ZIP desde la interfaz; extracción y ejecución con el `serve.cjs` de cada ZIP descargado, en origen independiente; ningún recurso externo solicitado; configuración aplicada al renderizador exportado; pausa, reinicio, resize y destrucción; ventanas por botón/raycast y activación/revelación del hechizo; capturas a 390 px y 1365 px sin desbordamiento.
- `node tools/cinematic-catalog-check.mjs --discovery-only`: miniaturas y carga/pausa/reinicio de las siete fichas. Eternal Bloom conserva su miniatura estática original; las otras seis tienen miniatura animada.
- `node tools/browser-check.mjs`: regresiones generales, 94 escenas, flujos de edición/compartir, menú móvil, navegación y desbordamiento, sin errores de runtime.
- `node tools/build-cinematic-projects.mjs`: dependencias y recursos obligatorios, configuración serializable y licencias; ZIP extraídos también con `Expand-Archive` de PowerShell.
- `node tools/generate-seo.mjs --only=eternal-bloom,soul-butterfly,event-horizon,crystal-heartbeat,eternal-souls,haunted-night,dark-spell`: build estático.
- `node tools/check-regressions.mjs`: 94 escenas importables y recuerdos de longitud máxima.
- `node tools/check-seo.mjs`: 112 páginas/URLs públicas y cero enlaces rotos.
- `node tools/check-cinematic-syntax.mjs`: sintaxis de 55 módulos/herramientas. El repositorio no tiene linter semántico configurado; esta comprobación no se presenta como ESLint.
- `git diff --check`: sin errores de espacios en blanco.

Evidencia: `tools/review/catalog-integration/report.json`, `discovery-report.json` y capturas por escena. ZIP de build en `tools/review/catalog-projects/`; descargas reales y proyectos extraídos en subcarpetas `downloads-*` de `catalog-integration/`. La evidencia está ignorada por Git y no forma parte de las páginas públicas.

## Límites antes de publicar

Móvil se comprobó mediante emulación de Chrome, no en teléfonos físicos. No se verificaron Safari/Firefox, permisos nativos del portapapeles ni rutas ya desplegadas; las rutas locales y los archivos de compatibilidad sí se probaron. La copia de instrucciones usa el portapapeles del navegador y muestra una indicación si este lo deniega. No se garantiza una tasa de FPS en todo dispositivo: se conservan las optimizaciones existentes y se verificó estabilidad de recursos durante cambios de color, sin una nueva campaña de benchmarks.

No se hizo push ni despliegue. Antes de publicar conviene una prueba en teléfonos físicos y en Safari, además de revisar que el servidor de producción sirva módulos JavaScript y GLB con tipos MIME adecuados.
