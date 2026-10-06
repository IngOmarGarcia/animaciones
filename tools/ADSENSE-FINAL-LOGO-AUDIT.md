# ViralCSS: auditoría final y logo animado

5 de octubre de 2026. Comparación con `ADSENSE-SECOND-REVIEW-AUDIT.md`, `ADSENSE-SCENE-INVENTORY.md` y `ADSENSE-SECOND-REVIEW-RESULTS.md`. Estos informes anteriores se conservan como evidencia histórica: sus referencias a publicación pendiente corresponden a esas pasadas, no al estado de una publicación posterior.

## Dictamen previo a publicación

El proyecto conserva las 87 escenas públicas y sus identificadores. Las correcciones importantes de la auditoría anterior están implementadas y verificadas localmente. No se detectó un problema crítico pendiente en las pruebas descritas. Está preparado técnicamente para el commit y push autorizados, seguido de la verificación obligatoria de producción. La solicitud a AdSense corresponde al propietario; no se ha realizado ni se garantiza su aprobación.

La comprobación de publicación no se sustituye por este informe: `node tools/verify-production.mjs` exige que siete archivos públicos coincidan con el commit actual, y `node tools/adsense-public-audit.mjs --final` vuelve a consultar las rutas y recursos. Sus resultados se guardan en `tools/review/`, fuera de Git, después del push. Si esos controles fallan, no debe considerarse terminada la publicación.

## CRÍTICO

Ninguno confirmado en las comprobaciones locales. No se encontraron escenas rotas, páginas indexables vacías, enlaces internos rotos, errores JavaScript en las regresiones ni CLS introducido por el logo. No se insertaron anuncios ni se solicitó una revisión de AdSense.

## IMPORTANTE: comparación con la primera auditoría

| Hallazgo | Resultado local final |
| --- | --- |
| I1: catorce fichas genéricas | Guías individuales sobre composición, secuencia, gesto, personalización y uso real en `js/recent-guides.js`; HTML regenerado. Sin texto de relleno. |
| I2: «abrir recuerdos» donde no existen | Etiquetas distinguen explorar de abrir carta/recuerdos según las funciones de cada escena. |
| I3: instrucciones inconsistentes | Grimorio y Herbario indican tocar, de acuerdo con sus motores; Pan describe separar una porción. Las catorce guías recientes se contrastaron con su implementación. |
| I4: URLs canónicas con redirección | Canonical, OG, JSON-LD y sitemap usan las 105 URLs de producción sin `.html`; los archivos físicos y enlaces locales se conservan. La comprobación pública posterior debe confirmar las redirecciones antiguas. |
| I5: CLS de portada/editor | Tarjetas iniciales y espacio de controles reservados; editor inicializado antes de mostrarse. Logo y navegación tienen dimensiones desde HTML/CSS. Las 24 visitas finales dieron CLS 0. |
| I6: identidad/privacidad incompletas | Acerca identifica a OGR, creador y administrador, y conserva el correo publicado. Privacidad cubre fotografías de Jardín y Retrato, tratamiento local y alcance del enlace compartido. |
| I7: términos/licencia pendientes | Términos de Uso enlazados desde el sitio, con las condiciones expresas del propietario: uso personal, educativo y experimental, autorización para comercial/redistribución, atribución pública y derechos originales de OGR/ViralCSS. Aviso también en el código descargado. |
| I8: scroll móvil bloqueado | `pan-y` para escenas que no requieren arrastrar; captura completa conservada donde el gesto sí dirige la escena. Pruebas de estilos/gestos pasan; falta validación en un teléfono físico. |
| I9: movimiento reducido | Las 87 escenas tienen composición estática con texto revelado y posibilidad de activar el movimiento voluntariamente. Logo estático y sin contexto WebGL en esa preferencia. |
| I10: mensajes solo en Canvas | Equivalentes accesibles de nombre, dedicatoria, firma y recuerdos, coordinados con la revelación. Sin texto también omite ese contenido. La exploración espacial no tiene una certificación de accesibilidad completa. |

## Logo: implementación y límites

- `js/logo-world.js`: continentes originales simplificados sobre una esfera, distribución por área, conexiones locales y tres planos orbitales. La costa no utiliza un servicio externo ni se presenta como cartografía precisa.
- `js/logo-renderer.js`: WebGL 1 y shaders ligeros, perspectiva, oclusión, iluminación lateral y relieve visual. Tres draw calls, buffers estáticos y localizaciones de shader reutilizadas; sin Three.js, vídeo ni secuencia de imágenes.
- `js/brand-logo.js`: cámara y ciclo de vida. Intro de unos 3,5 segundos desde México/Latinoamérica hacia las Américas y el globo completo, con easing y movimiento de cámara en profundidad. Órbitas y planeta avanzan en sentidos contrarios. Texto HTML con máscara/desenfoque breve y subtítulo discreto.
- La intro y el idle comparten cámara y renderizador, sin salto al terminar. Intro limitada a sesión mediante `sessionStorage`; navegación interna abre el idle. No se usa almacenamiento permanente.
- Idle deliberadamente discreto: planeta extremadamente lento, órbitas suaves, renderizado a 12/15 cuadros por segundo. Intro y feedback pueden usar la frecuencia del navegador. No se promete 60 FPS en todos los dispositivos.
- Click/tap conserva el enlace nativo al inicio, sin espera ni cancelación de navegación. Impulso corto de órbitas y reacción del texto durante la pulsación.
- 4.011 partículas en el perfil completo y 2.181 en el modesto; DPR máximo 1,5/1. La calidad reduce detalle secundario y resolución cuando el coste medido sube. Los tres módulos suman 16.322 bytes sin comprimir.
- Pausa por IntersectionObserver y visibilidad de documento; restauración de página conservada; limpieza de buffers, shaders, programas, canvas y listeners. Inicialización repetida y cambios de preferencia no duplican contextos ni bucles.
- Imagen original optimizada disponible antes de JavaScript y como fallback de WebGL ausente, fallo o pérdida de contexto. Movimiento reducido no crea contexto. Sin JavaScript siguen visibles la marca y los enlaces móviles.
- Espacio fijo inicial de 224 × 48 px y planeta de 72 × 48 px. Nombre accesible «ViralCSS — Ir al inicio», imagen/canvas decorativos. Favicon, imagen OG, enlaces, metadatos y texto semántico conservados.

Se revisaron capturas del logo a 0, 0,875, 1,75, 2,625, 3,5, 4,37 y 8 segundos, además de móvil, escritorio, tablet y 320 px. Primera pasada corrigió encuadre orbital y orden de superposición del nombre; segunda pasada comprobó el resultado. Estas capturas ampliadas son inspección del logo, no un rediseño del header.

## Pruebas finales

| Prueba | Resultado |
| --- | --- |
| `check-seo.mjs` | 105 páginas/URLs, 87 fichas, cero enlaces internos rotos; nombres de marca y dimensiones iniciales verificadas. |
| `check-regressions.mjs` | 93 módulos importables y siete recuerdos a longitud máxima. |
| `check-personalization.mjs` | Cinco fuentes, 29 escenas con colores, enlaces y HTML descargable. |
| `check-turtle.mjs` y `check-seasonal-text.mjs` | 42 y 30 combinaciones de personalización, enlaces, edad, frases y Sin texto. El nombre histórico de la prueba no obliga a mostrar Turtle. |
| `browser-check.mjs` | 87/87 escenas renderizan; portada 40/40/7, categorías, filtros, editor, compartir, pausa, reinicio, restauración, Atrás, reintento y menú móvil; sin excepciones. |
| `adsense-browser-audit.mjs --corrections` | 87/87 escenas estáticas en movimiento reducido; equivalentes accesibles, Sin texto, gestos y HTML descargado verificados. |
| `browser-check.mjs --turtle` | 14 escenas recientes, 36 capturas, textos largos, foto sintética, interacción y exportación; cero errores. |
| `cinematic-check.mjs --all` | 14 escenas, varios momentos de timeline, Canvas de respaldo y estabilidad de movimiento reducido; sin errores de ejecución/GPU. |
| `adsense-browser-audit.mjs --local` | 24 visitas móvil/escritorio: portada, catálogo, categorías, fichas, Acerca, privacidad, contacto/sugerencias, editor y errores. Sin overflow ni excepciones; CLS 0 en toda la muestra. 404 deliberados esperados. |
| `adsense-browser-audit.mjs --local --terms` | Seis visitas de Términos, Acerca y código: sin excepciones ni overflow. Términos/Acerca y código móvil con CLS 0; código escritorio vuelve a registrar 0,1507, la mejora pendiente indicada abajo. |
| `adsense-browser-audit.mjs --logo` | Primera entrada, nueva sesión, navegación interna, regreso, click/tap, resize, 320/390/768/1365 px, pestaña realmente oculta, fuera del viewport, restauración, preferencias repetidas, fallback, pérdida de contexto y dispositivo modesto: aprobado; un solo canvas/contexto. |

Las capturas anteriores y posteriores y sus informes están en `tools/review/`. Las 87 escenas se comprobaron funcionalmente; no se afirma haber inspeccionado manualmente cada frame artístico de sus recorridos completos. No se modificaron su geometría, materiales, iluminación o coreografía por el logo.

## Rendimiento y estabilidad

| CLS de escritorio | Primera auditoría | Muestra final |
| --- | ---: | ---: |
| Portada | 0,2490 | 0 |
| Editor del Retrato | 0,2241 | 0 |
| Catálogo | 0,0398 | 0 |
| Fútbol | 0,0196 | 0 |
| Visor con enlace inválido | 0,7285 | 0 |

En la pasada completa final, LCP local de portada/editor fue 496/828 ms en móvil y 184/180 ms en escritorio. Son medidas de laboratorio con una máquina, servidor y ventana de observación concretos; no sustituyen datos CrUX ni mediciones de usuarios reales.

La herramienta `--logo-performance` compara el mismo sitio con el renderizador del logo activo o bloqueado para usar su imagen estática: no es una reconstrucción de una versión antigua del proyecto. Usa clics nativos y comprueba que el control cambie realmente de estado. `PerformanceEventTiming` sirve para detectar regresiones en las interacciones probadas, pero **no acredita INP de campo ni un percentil real de todo el sitio**. Sus mediciones completas se conservan en `tools/review/logo/performance.json`.

En tres repeticiones por perfil, LCP mediano estático/animado fue 172/132 ms en móvil y 132/112 ms en escritorio; CLS 0 en las doce visitas. Máximo EventTiming estático/animado: 136/80 ms móvil y 176/72 ms escritorio. Se prueba el menú móvil y el botón de miniaturas de escritorio; este último se lleva al viewport con desplazamiento instantáneo para evitar clics sobre coordenadas todavía en movimiento. No se deduce que el logo mejore esas métricas: hay variación de cachés, calentamiento y carga de previews. No se observó una regresión importante en la muestra.

No se realizó un perfil prolongado de memoria, temperatura o GPU en teléfonos físicos. Las pruebas de ciclo de vida y repetición no detectaron listeners, canvases o contextos duplicados. El logo usa un contexto pequeño adicional solo mientras corresponde y no altera la gestión de los reproductores.

## MEJORA pendiente

1. La utilidad de código descargable presentó CLS de escritorio 0,1507 en la revisión anterior. No se rediseñó durante el cambio de logo; requiere una mejora localizada de su inicialización. No afecta a la portada/editor ya corregidos ni se atribuye al logo sin una comparación equivalente.
2. Validación en teléfono físico, Safari y lector de pantalla real; revisión completa de exploración espacial por teclado. La emulación no certifica esos entornos.
3. Documentar procedencia/licencias de recursos externos. No se detectó una infracción concreta ni se inventaron permisos. Las herramientas continúan fuera del sitemap y con noindex; separarlas del paquete público sería una decisión de despliegue adicional.
4. Search Console y estado de la cuenta AdSense requieren acceso del propietario. No se conoce el motivo exacto del primer rechazo ni se inventaron datos de esas cuentas.
5. Antes de activar anuncios, revisar proveedores y consentimiento aplicable y reservar dimensiones de los bloques publicitarios, separados de controles y escenas. Actualmente no se insertan cargadores ni espacios ficticios.

## CORRECTO

Producto interactivo útil, 87 fichas con contexto y navegación relacionada, títulos/H1/descripciones coherentes, doce categorías, contacto conservado, identidad pública y condiciones propias. Portada paginada, carga diferida de previews, control de movimiento, materiales artísticos conservados y rutas compatibles. Logo accesible, semántico y estable desde el HTML inicial.

## Después de publicar

Verificar home, logo y navegación; fichas antiguas y recientes; Acerca/contacto, privacidad y términos; robots, sitemap de 105 URLs, canonical/OG/schema y redirecciones `.html`; abrir un enlace compartido y comprobar recursos/errores. Confirmar el commit público mediante hashes con `verify-production.mjs`, sin inventar un despliegue alternativo si Cloudflare no publica automáticamente.

El propietario debe revisar en Search Console `https://viralcss.com/sitemap.xml`, inspeccionar portada, categoría y fichas recientes, comprobar canonical elegida, cobertura/indexación y métricas cuando existan datos suficientes. Las utilidades crear/código/visor permanecen intencionadamente noindex. Después puede solicitar personalmente la segunda revisión de AdSense.

Referencias: [calidad de AdSense](https://support.google.com/adsense/answer/7299563?hl=es), [canonicalización](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=es), [medición de INP](https://web.dev/articles/inp?hl=es). El dictamen elimina problemas observables; no anticipa la decisión de Google ni certifica cumplimiento legal integral.
