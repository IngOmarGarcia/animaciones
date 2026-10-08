# Expert Zone — Halloween y Día de Muertos

## Entrega local

Tres experiencias registradas en Expert Zone: Eternal Souls, Haunted Night y Dark Spell. Sin push, despliegue, pagos ni descargas. Los cambios previos del workspace se conservaron. No se modificó el código de las cuatro animaciones Expert anteriores.

### Abrir

Con `node tools/serve-local.mjs` activo:

- http://127.0.0.1:8080/animaciones/eternal-souls.html
- http://127.0.0.1:8080/animaciones/haunted-night.html
- http://127.0.0.1:8080/animaciones/dark-spell.html
- http://127.0.0.1:8080/categorias/expert-zone.html

## Tecnología y narrativa

Three.js local, WebGL 2 y GLSL; geometría procedural tridimensional, materiales físicos, entorno de reflexión generado localmente, luces cálidas y lunares, partículas GPU, flores y biblioteca instanciadas. Canvas 2D prepara texturas de tinta, letras y dedicatorias. No se añadieron dependencias ni servicios externos.

- **Eternal Souls:** vela → camino de pétalos → calavera de volumen continuo con cavidades orbitales y nasales → ornamentos florales dorados → flores de luz → convergencia del mensaje → altar vivo. La calavera se extrae de un campo implícito mediante tetraedros; sus normales se calculan a partir del campo. Papel picado perforado, cera con escurrimientos, flores de pétalos curvos y respuesta suave de las luces al puntero.
- **Haunted Night:** luna entre nubes → aproximación entre árboles → ventanas irregulares y silueta → puertas articuladas → relámpago con presencia en ventana → retroceso y mensaje. Arquitectura con volumen, laterales, torres, tejados, tejas, rosetón, porticado y escalinata. Selección de ventanas mediante raycasting; botón equivalente para teclado. Arquitectura estática agrupada por material.
- **Dark Spell:** biblioteca a la luz de las velas → aproximación → energía en cubierta → elevación y apertura → páginas deformables y círculos independientes → espera del botón → letras, símbolos orbitales y convergencia → pulso contenido → dedicatoria. El botón vuelve a habilitarse para repetir el ritual. Hasta 40 caracteres se transforman visualmente; el mensaje completo conserva el límite habitual de 140.

Se utilizaron las skills locales `viralcss-cinematic-animation` y `viralcss-particles` para dirección, secuencias, movimiento y rendimiento. Se inspeccionaron Crystal Heartbeat y sus módulos de geometría y material; no existe una skill de cristal independiente en el catálogo disponible. Las tres escenas tienen narrativas propias, sin aplicar la misma formación de objetos con partículas.

## Integración y archivos de esta tarea

### Nuevos

- `js/autumn-expert-catalog.js`, `js/autumn-expert-guides.js`.
- `js/anim/autumn-atmosphere.js`: materiales, entorno, velas, niebla, partículas, pétalos y agrupación estática.
- `js/anim/autumn-adapter.js`: controles por reproductor, dedicatoria, contraste, fallback y limpieza.
- `js/anim/eternal-souls.js`, `eternal-souls-renderer.js`, `eternal-souls-geometry.js`.
- `js/anim/haunted-night.js`, `haunted-night-renderer.js`.
- `js/anim/dark-spell.js`, `dark-spell-renderer.js`, `dark-spell-book.js`.
- Tres fichas en `animaciones/` y tres miniaturas WebP en `img/`, con los mismos identificadores.
- `tools/autumn-review.mjs` y este informe.

### Extendidos o regenerados

- `js/expert-catalog.js`, `js/scene-guides.js`: registro de las tres escenas.
- `tools/generate-seo.mjs`: opción `--only=` para evitar regenerar fichas ajenas; descripción de personalización para esta colección.
- `tools/new-expert-review.html`: factories y muestreo de las nuevas escenas.
- `animaciones.html`, `categorias/expert-zone.html`, `index.html`, `sitemap.xml`: descubrimiento y rutas.

El personalizador y el visor siguen usando el sistema existente de enlaces compartidos, pausa, reinicio y texto accesible. El código público se mantiene oculto y la opción Obtener código fuente permanece deshabilitada como Próximamente.

## Validación reproducible

```powershell
node tools/generate-seo.mjs --only=eternal-souls,haunted-night,dark-spell
node tools/check-regressions.mjs
node tools/check-seo.mjs
node tools/browser-check.mjs
node tools/autumn-review.mjs eternal-souls --integration --performance
node tools/autumn-review.mjs haunted-night --integration --performance
node tools/autumn-review.mjs dark-spell --integration --performance
git diff --check
```

La revisión por escena guarda capturas de introducción, desarrollo, clímax y estado final, escritorio, texto largo móvil, fallback y galería en `tools/review/<id>/`. También verifica pausa, reinicio, redimensionamiento, adaptación de calidad y pérdida del contexto tras liberar el renderer. Las pruebas de integración comprueban personalización y decodificación del enlace, visor, ficha, movimiento reducido, interacción real, ocultación del código y miniaturas que se pausan y liberan fuera de pantalla.

Resultados generales: 94 módulos públicos importables; 113 URLs y cero enlaces rotos; revisión general de Chrome sin errores de ejecución y sin desbordamiento a 390 y 1365 px. Se inspeccionaron visualmente las capturas y se corrigieron normales facetadas, exposición del altar, cierre del libro, posición de círculos, recorte de símbolos, encuadre de la presencia y contraste de dedicatorias largas.

No hay `package.json` ni configuración de ESLint en este proyecto estático: el build utilizado es su generador SEO y se ejecutan comprobaciones de sintaxis con `node --check`. No se presenta esa comprobación como una pasada de ESLint. Node emite una advertencia heredada sobre el tipo de módulo del `package.json` situado fuera del proyecto; no se modifica ese archivo externo.

## Rendimiento observado

Chrome / Windows, ANGLE Direct3D11, AMD Radeon 610M, lienzo 390 × 693 y pixel ratio 1. Pruebas de 180 cuadros, descartando los primeros 90: aproximadamente 60 FPS en las tres escenas, con calidad alta. Estos datos corresponden a la GPU del equipo de revisión, no a un teléfono emulado. No son una garantía universal; falta medir móviles físicos y el clímax del hechizo de forma sostenida.

El renderer existente controla pixel ratio, resolución de transmisión, postprocesado y reducción automática de calidad. Las escenas reducen efectos secundarios, utilizan instancing o geometría agrupada y liberan geometrías, materiales, texturas, mapas de sombras y controles propios. Las miniaturas se cargan bajo demanda; no se añaden modelos remotos ni cargas de las otras escenas.

## Límites y recomendaciones antes de publicar

- Geometría y materiales procedurales con una dirección estilizada; sin GLB ni texturas fotográficas. La niebla, transmisión, bloom y luz volumétrica son aproximaciones en tiempo real.
- Las páginas se deforman proceduralmente, con capas de papel y bordes; no se utiliza simulación física completa de papel. No hay audio.
- Requiere WebGL 2 con render targets HDR para la versión animada; la alternativa es la miniatura de la propia escena con la dedicatoria.
- Validación realizada en Chrome de escritorio con tamaños móviles. Pendiente Safari/iOS, Android físico, pantallas con pixel ratio elevado, equipos sin HDR y pruebas prolongadas de memoria/temperatura.
- Antes de publicar, revisar personalmente ritmo, composición y legibilidad en esos dispositivos. La valoración de acabado artístico debe hacerse también en reproducción real, no solo en capturas. Mantener desactivadas las descargas y los pagos hasta una tarea posterior.
