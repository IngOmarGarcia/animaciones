# Eternal Bloom · revisión local

Primera experiencia de **Expert Zone**, identificador `eternal-bloom`. No se ha publicado ni se ha realizado push. Se integra en el catálogo existente sin sustituir sus 87 escenas anteriores.

## Abrir

Con el servidor del proyecto en `http://localhost:8080`:

- Categoría: `/categorias/expert-zone.html`.
- Ficha y reproducción a petición: `/animaciones/eternal-bloom.html`.
- Personalización y compartir: `/crear.html?a=eternal-bloom`.
- Revisión de cuadros congelados: `/tools/expert-review.html` (no indexable).

La URL compartida sigue usando el formato y la codificación de `js/share.js`. Conserva nombre, mensaje, firma, tipografía y la opción Sin texto. No requiere un servicio externo.

## Escena y materiales

Three.js **0.180.0**, distribuido localmente con su licencia MIT. No hay CDN en ejecución, modelos comprados, texturas descargadas, IA externa ni recursos de pago. Geometría, entorno HDR y trayectorias son originales y procedurales. El respaldo WebP se obtiene del renderizador real.

La rosa tiene **29 pétalos cerrados con espesor**, superficies curvas asimétricas y morph targets de posición y normal. El tallo sigue una curva espacial; las hojas tienen curvatura y nervadura elevada. Material físico transmisivo, entorno HDR de estudio generado en memoria, Fresnel, estrías GLSL, barrido cálido y bloom discreto. No usa un cursor Turtle.

Secuencia: polvo dorado en profundidad → atracción espiral → crecimiento del tallo y ensamblaje de pétalos → apertura escalonada → dedicatoria → flor abierta con luz, cámara y partículas suaves. Parte de las partículas se incorpora a superficies muestreadas de los pétalos; otras se desprenden en órbitas. El puntero modifica la cámara con amortiguación. El reinicio conserva el último cuadro y lo funde con el comienzo durante 0,85 s.

## Integración y archivos

- `js/expert-catalog.js`, `js/catalog.js`, `js/home.js`, `js/gallery.js`: categoría, descubrimiento, miniaturas y carga diferida.
- `js/anim/eternal-bloom.js`: adaptación al reproductor existente y tipografía.
- `js/anim/eternal-bloom-{geometry,light,particles,renderer,preview}.js`: geometría, materiales, GPU, coreografía y respaldo.
- `js/vendor/three/{three.module.min.js,three.core.min.js,LICENSE}`: dependencia fijada, original sin modificar.
- `js/anim/engine.js`: hooks optativos para miniatura estática y fundido al reiniciar; las otras escenas no los activan.
- `js/{crear,detail,viewer,overlay,codigo}.js`: editor de dedicatorias, visor, accesibilidad y exclusión del editor público de código en Expert.
- `js/{scene-guides,category-guides}.js`, `css/styles.css`: instrucciones específicas y presentación Expert.
- `tools/generate-seo.mjs`, `index.html`, `animaciones.html`, `animaciones/eternal-bloom.html`, `categorias/expert-zone.html`, `sitemap.xml`: rutas y descubrimiento estático, canonical limpio de producción.
- `img/eternal-bloom.webp`: miniatura y fallback real.
- `source-packages/eternal-bloom/{manifest.json,README.md}`: inventario previsto del paquete completo; no hay ventas ni descarga habilitada. Ocultar el editor no protege los módulos que recibe el navegador.
- `tools/expert-{review.html,browser-check.mjs}`, `tools/adsense-browser-audit.mjs`, `tools/{browser-check,adsense-corrections-check,check-regressions}.mjs`: pruebas nuevas y actualización de conteos del catálogo.

## Rendimiento y accesibilidad

DPR limitado a 1,6; nivel reducido a 1. Densidad 360/150 motas, resolución de transmisión reducida y bloom desactivado en calidad baja. Se adapta por capacidad declarada, ahorro de datos y tiempo sostenido de cuadros. Mantiene la geometría principal. Las miniaturas no importan Three.js, no crean WebGL y no mantienen RAF continuo.

El reproductor existente pausa por visibilidad de página/escena y libera la escena al destruirla o cambiar de tamaño. Se eliminan materiales, geometrías, objetivos de render y entorno; se destruye el renderer y se pierde explícitamente el contexto. Three.js puede conservar un contador interno de una textura de transmisión tras dispose; la prueba verifica además la pérdida real del contexto y cero geometrías, sin afirmar que ese contador sea cero.

Movimiento reducido muestra el estado final quieto, con opción explícita para reproducir. Dedicatoria equivalente accesible fuera de Canvas; Sin texto la oculta también. Los controles de reproducción siguen siendo botones. El lienzo de perspectiva no se presenta falsamente como botón. El desplazamiento táctil vertical permanece disponible. Si faltan WebGL 2/HDR o falla el renderizador, aparece el respaldo con la misma personalización.

## Verificaciones reproducibles

```powershell
node tools/generate-seo.mjs
node tools/check-seo.mjs
node tools/check-personalization.mjs
node tools/check-regressions.mjs
node tools/check-turtle.mjs
node tools/check-seasonal-text.mjs
node tools/browser-check.mjs
node tools/adsense-browser-audit.mjs --corrections
node tools/adsense-browser-audit.mjs --expert
node tools/adsense-browser-audit.mjs --expert --flows
node tools/adsense-browser-audit.mjs --expert --performance
```

El proyecto es estático y no define scripts npm de build/lint; la generación de HTML, `node --check` y las verificaciones anteriores cubren los checks disponibles. Node avisa del tipo de módulos en un package.json ajeno a esta carpeta; no se modifica ese archivo externo.

Resultados de la revisión: 88 escenas públicas importables y renderizadas; 107 URLs de sitemap y cero enlaces rotos en la comprobación local. Pruebas de navegación, compartir/restauración, pausa/reinicio, personalización, teclado del reproductor y accesibilidad/movimiento reducido. Editor de Eternal Bloom a 390 px: sin overflow y CLS observado 0. Se inspeccionaron cuadros en 0, 2,8, 5,5, 8,25, 12 s y momentos intermedios, móvil y escritorio, mensajes largos y Sin texto; segunda pasada después de corregir material y encuadre. Evidencia local ignorada por Git en `tools/review/expert/`.

Medición breve con Chrome y AMD Radeon 610M, 390 × 693, DPR 1, rosa abierta, render y copia al Canvas: aproximadamente **59 FPS**, tanto alta como baja; no constituye una garantía para otros dispositivos. Se comprueban por separado parallax, reducción adaptativa con deltas lentos simulados, pérdida de contexto y destrucción. No se presenta la simulación como benchmark real.

## Límites reales

Es una rosa de cristal estilizada y procedural, no un escaneo botánico. La transmisión/refracción es una aproximación en tiempo real; no hay trazado de rayos, cáusticas físicas ni refracciones exactas entre todos los pétalos. El efecto no utiliza GLB ni Blender. Se ha inspeccionado en Chrome de escritorio con tamaños móviles emulados; no se han probado teléfonos físicos ni Safari/iOS. Es necesaria esa comprobación adicional para confirmar rendimiento y aspecto específicos en esos equipos. El modo de respaldo es una imagen, sin interacción 3D. El futuro paquete comercial sigue pendiente y no se entrega ni vende todavía.
