# Expert Zone · tres experiencias nuevas

Revisión local: 8 de octubre de 2026. Sin commit, push ni despliegue. El catálogo contiene 91 escenas: las 87 anteriores, Eternal Bloom y estas tres. Los renderizadores, geometrías, iluminación, partículas y miniatura de Eternal Bloom se conservan.

## Abrir y ejecutar

Desde la raíz: `node tools/serve-local.mjs` y abrir `http://127.0.0.1:8080/categorias/expert-zone.html`.

| Experiencia | Identificador | Personalización local |
| --- | --- | --- |
| Soul Butterfly | `soul-butterfly` | `/crear.html?a=soul-butterfly` |
| Event Horizon | `event-horizon` | `/crear.html?a=event-horizon` |
| Crystal Heartbeat | `crystal-heartbeat` | `/crear.html?a=crystal-heartbeat` |

Las fichas están en `/animaciones/<id>.html` en el servidor local. Los canonical y sitemap conservan las URLs públicas sin `.html`. Cada experiencia utiliza los enlaces codificados existentes de ViralCSS, nombre, mensaje, firma, cinco tipografías y opción Sin texto. Su ficha ofrece reproducción, pausa y reinicio. El código público se redirige a la ficha y el botón de fuente indica Próximamente; no hay pagos ni desbloqueos.

## Obras e implementación

**Soul Butterfly.** Cuatro membranas curvas cerradas, con grosor, venas y capilares en shader, iridiscencia, ocelos y detalles de escamas. Las partículas muestrean esas superficies y las construyen; las alas se articulan con retrasos entre alas superiores e inferiores y deformación secundaria. Entre 6,8 y 11,2 segundos realiza un vuelo tridimensional con estela. Después dispersa su luz de forma contenida, forma el texto real mediante partículas proyectadas y recupera su figura. La tipografía nítida se integra después de esa formación. Conserva una silueta tenue durante la transición.

**Event Horizon.** Un shader integra rayos en un campo volumétrico de plasma, con densidad, espesor, turbulencia, filamentos y temperaturas diferentes. La dirección de los rayos se curva cerca del horizonte, afectando también al campo estelar. El disco forma imágenes aparentes por delante, por encima y por debajo de la zona oscura. La cámara llega con easing, orbita lentamente con límites y un pulso atraviesa el disco antes de revelar el mensaje. El quad de pantalla solo lanza los rayos: no representa el agujero negro con un círculo plano. Se evitan cálculos de plasma fuera del volumen que puede contenerlo.

**Crystal Heartbeat.** Volumen implícito tridimensional extraído mediante tetraedros, con frente, reverso, lóbulos, hendidura y punta continuos. Veinticuatro fragmentos curvos de espesor real se ensamblan; entre 6 y 6,9 segundos se funden ópticamente en la misma superficie continua, evitando refracciones internas y reduciendo las llamadas de dibujo. Normales suavizadas corrigen una singularidad del polinomio cerca del ecuador. Cristal físico con entorno HDR procedural, transmisión, atenuación, dispersión contenida y reflejos de estudio. Energía roja circula dentro, un latido doble deforma el volumen y activa ecos de partículas y microfracturas ópticas. La luz inicial desaparece dentro de la energía al completarse el corazón.

## Archivos de este lote

- Catálogo, guías e integración: `js/expert-catalog.js`, `js/scene-guides.js`, `js/category-guides.js`, `js/gallery.js`, `js/viewer.js`, `tools/generate-seo.mjs`; HTML generado de portada, catálogo, categoría Expert Zone y las nuevas fichas; `sitemap.xml`.
- Infraestructura nueva, sin cambiar el renderer de Eternal Bloom: `js/anim/expert-runtime.js`, `expert-adapter.js`, `expert-typography.js`.
- Soul Butterfly: `js/anim/soul-butterfly.js`, `soul-butterfly-renderer.js`, `soul-butterfly-geometry.js`, `img/soul-butterfly.webp`.
- Event Horizon: `js/anim/event-horizon.js`, `event-horizon-renderer.js`, `event-horizon-shader.js`, `img/event-horizon.webp`.
- Crystal Heartbeat: `js/anim/crystal-heartbeat.js`, `crystal-heartbeat-renderer.js`, `crystal-heartbeat-geometry.js`, `crystal-heartbeat-material.js`, `img/crystal-heartbeat.webp`.
- Inventarios preparatorios: `source-packages/{soul-butterfly,event-horizon,crystal-heartbeat}/{manifest.json,README.md}`. Incluyen dependencias y licencias; no conceden nuevos permisos comerciales.
- QA: `tools/new-expert-review.html`, `tools/new-expert-browser-check.mjs`, rama `--expert-new` de `tools/adsense-browser-audit.mjs`; comprobación de la dependencia compartida actualizada en `tools/expert-browser-check.mjs`.

## Rendimiento y ciclo de vida

Three.js 0.180.0 local, ya utilizado por Eternal Bloom, con licencia MIT conservada. No se añaden dependencias, servicios externos ni recursos de terceros. GLSL, geometrías, iluminación HDR y posters son originales o se generan desde los renderizadores reales. No se necesitó Blender ni un modelo descargado.

Un único bucle de `requestAnimationFrame`, gestionado por el motor existente; render WebGL fuera del DOM y composición en el Canvas existente para reutilizar controles y accesibilidad. Resolución limitada por escena, perfiles según memoria/núcleos/ahorro de datos y reducción automática si el tiempo de cuadro se mantiene alto. GPU Points para partículas, recursos reutilizados y bloom HDR de umbral alto, desactivado en calidad baja.

La galería mantiene como máximo una miniatura WebGL nueva activa; las demás muestran posters. El puntero o el foco eligen la miniatura activa. Al salir del viewport se destruye su renderer; la ficha, editor y reproductor pausan fuera de pantalla y al ocultarse la pestaña. Reiniciar y resize liberan el renderer anterior. Dispose retira listeners, libera recursos y pierde el contexto. Con movimiento reducido se presenta una composición final quieta. Sin WebGL 2/HDR o ante fallo de render, se muestra la imagen de la obra y la dedicatoria sigue funcionando.

## Inspección y mediciones locales

Revisados siete momentos por escena, incluyendo inicio, formación, desarrollo, transición y estado final, además de textos largos, Sin texto, móvil vertical y escritorio. Segunda pasada visual después de corregir encuadres, normales, reflejos y costes del shader. Evidencias y reportes se guardan en `tools/review/<id>/` (ignorados por Git).

Chrome con GPU AMD Radeon 610M, DPR 1; viewport de render 390 × 693 y 1365 × 900. Benchmark de 180 cuadros, midiendo los últimos 90 tras calentamiento. Son mediciones locales, no un resultado en teléfonos físicos ni una promesa universal de 60 FPS.

| Escena | Vertical alta | Vertical baja | Escritorio adaptativo |
| --- | ---: | ---: | ---: |
| Soul Butterfly | 60 FPS | 60 FPS | 59 FPS |
| Event Horizon | 53 FPS | 60 FPS | 58 FPS, perfil bajo activado |
| Crystal Heartbeat | 60 FPS | 60 FPS | 59 FPS |

El tramo de ensamblaje/fusión del corazón midió unos 55 FPS. Soul usa 3000/1100 partículas principales; Crystal 1800/650. Event usa 112/72 pasos de integración. Los perfiles bajos conservan las geometrías protagonistas. La adaptación por lentitud también se prueba con delta de tiempo simulado; esa comprobación funcional no se presenta como un benchmark físico.

Pruebas individuales completadas sin errores de consola: controles, movimiento de cámara, pausa estable, continuidad visual al reiniciar, resize, dispose, mensaje accesible, Sin texto, compartir personalizado, redirección del editor de código y fallback sin WebGL. Las miniaturas cambian entre cuadros, se congelan al pausar y liberan todos sus contextos fuera de pantalla. CLS observado en el editor: aproximadamente 0,0163; sin overflow horizontal en las comprobaciones.

La pasada global terminó correctamente: 91/91 escenas renderizadas, navegación y filtros, paginación 40/40/11, editor → enlace → destinatario, conservación de personalización frente a borradores, restauración del documento y navegación Atrás, reintentos de carga, teclado, menú móvil y limpieza de escuchas. Sin errores de ejecución en esa prueba. La comprobación de movimiento reducido pasó para las 91 escenas y conservó accesibilidad, Sin texto, gestos táctiles y exportación de las escenas que ya admitían código. La prueba específica de Eternal Bloom pasó personalización, compartir, resize, repetición, disposición, movimiento reducido y fallback, sin errores de consola. Su miniatura sigue sin crear un renderer 3D.

Comprobaciones estáticas aprobadas: 110 páginas públicas/URLs del sitemap, 91 módulos de animación importables, cero enlaces rotos, cinco tipografías, 29 escenas con colores editables, 42 combinaciones de enlace/exportación de las 14 escenas procedurales y 30 combinaciones de texto de temporada. `node --check` y `git diff --check` no detectaron errores en los archivos revisados. Los recursos de respaldo nuevos pesan aproximadamente 90, 63 y 29 KiB respectivamente.

## Comandos de validación

```powershell
node tools/generate-seo.mjs
node tools/check-seo.mjs
node tools/check-personalization.mjs
node tools/check-regressions.mjs
node tools/check-turtle.mjs
node tools/check-seasonal-text.mjs
node tools/adsense-browser-audit.mjs --expert-new --scene=soul-butterfly --performance
node tools/adsense-browser-audit.mjs --expert-new --scene=event-horizon --performance
node tools/adsense-browser-audit.mjs --expert-new --scene=crystal-heartbeat --performance
node tools/browser-check.mjs
node tools/adsense-browser-audit.mjs --corrections
node tools/adsense-browser-audit.mjs --expert --flows
```

El proyecto no tiene un proceso npm de build/lint: la generación HTML, `node --check`, comprobaciones estáticas y Chrome real constituyen las verificaciones disponibles. La advertencia de Node sobre el `package.json` del directorio padre es preexistente; no se modifica un archivo externo al proyecto.

## Límites reales

La curvatura gravitacional y refracción son aproximaciones visuales en tiempo real. No hay refracción por trazado de caminos, simulación científica relativista ni caústicas físicas. Las partículas/letras se rasterizan y muestrean en el cliente. Los perfiles modestos reducen resolución y efectos secundarios. Queda por contrastar el aspecto y rendimiento en teléfonos Android/iOS físicos y Safari; las pruebas móviles actuales son viewports emulados en Chrome de escritorio. No hay validación pública ni despliegue en este lote. La fuente descargable continúa en preparación.
