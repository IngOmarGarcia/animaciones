# Revisión local de ViralCss — 30 de septiembre de 2026

Los cambios permanecen en el proyecto local. No se hizo push, despliegue ni solicitud de revisión a AdSense. Estas mejoras no garantizan aprobación. Las animaciones siguen siendo el producto; no se sustituyeron por artículos ni se eliminaron escenas del catálogo.

## Políticas oficiales consultadas

- [Contenido propio y navegación clara](https://support.google.com/adsense/answer/7299563?hl=es): la experiencia debe aportar utilidad a su público. Las nuevas fichas explican la secuencia, el gesto, los campos editables y el resultado compartido.
- [Pantallas sin contenido del editor o de poco valor](https://support.google.com/publisherpolicies/answer/11112688?hl=es): Google restringe anuncios en pantallas sin contenido suficiente, en creación o edición y en experiencias de navegación o avisos. Se retiraron los cargadores de anuncios y los espacios vacíos de esta versión local.
- [Contenido duplicado](https://support.google.com/publisherpolicies/answer/11190248?hl=es): se reemplazaron bloques genéricos de fichas y categorías por información de sus escenas.
- [Proporción de publicidad y promociones](https://support.google.com/publisherpolicies/answer/11169917?hl=es): las animaciones también son contenido; no hay una cuota obligatoria de párrafos. El editor y las dedicatorias no muestran productos afiliados ni encargos. Las aportaciones voluntarias quedan fuera del recorrido de creación.
- [Colocación y clics accidentales](https://support.google.com/adsense/answer/1346295?hl=es): no colocar publicidad junto a los controles de reproducción, descarga, navegación o interacción. No se añadieron ubicaciones publicitarias nuevas.
- [Divulgaciones de privacidad](https://support.google.com/publisherpolicies/answer/10437794?hl=es-419): el aviso explica los datos del enlace, el borrador, la foto, Google Fonts, correo, servicios de compartir y publicidad; enlaza la explicación de Google sobre datos de sus socios.
- [Consentimiento y CMP](https://support.google.com/adsense/answer/7670013?hl=es): la futura activación de Google Ads debe confirmar el consentimiento y la CMP certificada aplicables, incluidos EEE, Reino Unido y Suiza. No se simuló una CMP con un aviso casero.
- [Noindex rastreable](https://developers.google.com/search/docs/crawling-indexing/block-indexing?hl=es) y [canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=es): se mantuvo el acceso de rastreadores para que puedan leer las directivas.

## Contenido y código que lo respalda

`js/scene-guides.js` contiene la explicación específica de las 73 escenas públicas. Las interacciones y secuencias se revisaron en los módulos indicados por `js/catalog.js`, no se dedujeron del título. `js/category-guides.js` compara opciones concretas por uso, gesto y personalización. El generador falla si una escena pública no tiene guía.

Ejemplos de correspondencia:

| Descripción | Evidencia en el código |
| --- | --- |
| Piñata: tres golpes y alternativa automática | `js/anim/pinata.js`: `stage.taps`, `hits`, `userTapped` |
| Vela: un toque, sin micrófono | `js/anim/vela-deseo.js`: consume toques; no acceso a audio |
| Flor de luz: mantener pulsado | `js/anim/flor-luz-interactiva.js`: `stage.holding` controla la carga |
| Halloween y cinco escenas nuevas de Muertos: título, frase o Sin texto | `js/anim/seasonal-core.js`, `js/seasonal-catalog.js`, `js/share.js`, `js/overlay.js` |
| Jardín de lunas: siete recuerdos, foto opcional y carta | `js/anim/dana2-core.js`, `js/anim/jardin-de-lunas.js`, campos del editor |
| Galaxia de flores: recuerdos por flor y carta en el botón inferior | `js/anim/galaxia-flores.js`: selección por coordenadas y apertura en `tap.y > h * 0.90` |
| Escenas gamer y fútbol automáticas | Sus módulos de dibujo avanzan por tiempo; no ofrecen controles de juego ni conexión a cuentas |
| Cinco fuentes y colores opcionales en escenas compatibles | `js/anim/text-style.js`, `js/anim/color-style.js`, metadatos `colorDefaults` y formulario |

Las letras de partículas no cambian de tipografía. Se corrigió además `nameInScene` en Constelación con tu nombre y Fuegos artificiales con tu nombre para no duplicar encima el nombre que dibuja la escena.

## Recorrido y experiencia

- Portada, catálogo y categorías ofrecen «Ver escena y detalles» y un acceso directo separado a «Personalizar».
- Las fichas cargan la escena bajo demanda, con la interacción real y texto de ejemplo. Incluyen pausa, reinicio, instrucciones, estado de carga y reintento.
- Las categorías comparan escenas y permiten filtrar por reproducción automática, interacción, colores o carta.
- El editor conserva todos sus campos. Firma y estilo, y carta y recuerdos, se agrupan en desplegables; las recomendaciones se reducen a tres escenas según categoría y gesto.
- Los enlaces incompletos o con un ID inexistente presentan una salida útil en vez de abrir silenciosamente otra escena.
- Menú móvil, foco visible, enlace para saltar contenido, controles de pausa y gestos básicos por teclado. Los recorridos que exigen explorar coordenadas siguen ofreciendo arrastre y toque; no se afirma una equivalencia completa de navegación con lector de pantalla.
- Miniaturas fuera de pantalla y pestañas ocultas se pausan. Solo dos miniaturas en móvil o cuatro en escritorio se animan simultáneamente; las demás visibles dibujan un cuadro. Se liberan reproductores fuera de vista cuando crece la caché. Se respeta la preferencia de movimiento reducido en miniaturas; las fichas se reproducen a petición del usuario.

## Indexación: razones y alcance

| Ruta | Tratamiento | Motivo |
| --- | --- | --- |
| Portada, catálogo, 11 categorías, 73 fichas, Acerca, privacidad y sugerencias | Indexables, canonical y sitemap | Descubrimiento, explicación o información útil del proyecto |
| `crear.html`, `codigo.html`, variantes `?a=` o `?s=` | `noindex, follow`, fuera del sitemap, sin canonical genérico | Son pantallas operativas con muchas variantes, no fichas públicas de cada escena. Las fichas útiles permanecen indexables |
| `v.html` y variantes personales | Conservan `noindex`; cabecera `noindex, follow` | Páginas de destinatarios con textos codificados en el enlace. Noindex no las convierte en privadas |
| `encargos.html` | Conserva noindex, fuera del sitemap | Solo comunica que el servicio no está disponible. Se retiró de la portada la promoción que prometía encargos activos |
| Herramientas y 404 | Conservan noindex | Pruebas, páginas auxiliares o errores |
| Escenas ocultas de desarrollo | Sin ficha pública ni sitemap | Se conserva el acceso directo de desarrollo y no se borran sus módulos |

El sitemap contiene 89 URL, sin variantes ni fechas `lastmod` artificiales por regeneración. `robots.txt` no bloquea las utilidades: Google necesita acceder a ellas para leer noindex. Las URL públicas conservan la convención canonical existente de `https://viralcss.com/...html`; no se agrupó todo bajo la portada ni se desindexaron categorías con pocas escenas. Las consultas de la portada mantienen canonical a `/`.

La herramienta de consulta web no permitió verificar las respuestas del dominio publicado. Antes de un despliegue autorizado se debe comprobar si Cloudflare redirige las rutas `.html` a rutas sin extensión, y alinear canonical, enlaces y sitemap con el destino real. No se alteró ese contrato de rutas basándose en una suposición.

## Privacidad y anuncios

El enlace compartido es JSON codificado en base64url, no cifrado. El código no manda los campos a una base de datos de dedicatorias, pero la URL puede figurar en registros del alojamiento, historial o servicios donde se comparte; se eliminó la afirmación absoluta de que nunca llega a servidores. La foto se procesa localmente y viaja dentro del enlace; el borrador no guarda esa imagen. El usuario puede borrar el borrador de su escena.

No se encontró un script de analítica en el código. Eso no acredita la configuración de Cloudflare ni de servicios externos. El aviso limita sus afirmaciones a esta versión. Se conserva únicamente la meta de asociación con la cuenta AdSense en la portada; no carga anuncios. No se accedió a la cuenta ni se modificaron anuncios automáticos, consentimiento o proveedores externos.

## Comprobaciones y límites

- `node tools/generate-seo.mjs` y `node tools/check-seo.mjs`: 89 páginas públicas, títulos y descripciones únicos, JSON-LD, canonical, sitemap y enlaces/recursos locales existentes.
- `node tools/check-seasonal-text.mjs`: 30 combinaciones de modos, enlaces y HTML descargable.
- `node tools/check-personalization.mjs`: cinco tipografías, 15 escenas públicas con color, serialización y HTML descargable.
- `node tools/browser-check.mjs`: Chrome real en 1365×1000 y 390×844; portada → ficha, filtro de categoría, cargar/pausar/reiniciar, formulario → enlace → destinatario, estilos compartidos, cartas y siete recuerdos, enlaces inválidos, menú y Escape, desbordamiento horizontal y errores de ejecución. `tools/animation-qa.html` importa y dibuja las 73 escenas y verifica el gesto por teclado y la eliminación de escuchas.
- Capturas locales y resultado en `tools/review/` (no se incluyen en Git). La prueba de carga de escenas no equivale a observar cada recorrido completo ni prueba todos los dispositivos, permisos de giroscopio o servicios de correo/WhatsApp.

Datos aún pendientes del propietario: identidad pública de autor/mantenedor y origen verificable del proyecto; estado de anuncios automáticos/CMP en la cuenta y configuración del alojamiento. «Acerca» elimina la historia y cifras no comprobables; no inventa una persona ni una fecha de fundación. Estos datos se solicitaron durante la revisión.

## Correcciones de la revisión posterior

El editor recupera ahora los datos de `?s=` y les da prioridad frente a un borrador diferente, incluida la foto del enlace. Al borrar ese borrador se retira también el parámetro personal del editor. Las páginas conservadas por el navegador al navegar Atrás pausan sus reproductores en vez de destruirlos; al volver se reanudan respetando la pausa manual.

Se evita iniciar o duplicar una vista previa mientras carga, se respetan la visibilidad y la pausa elegida antes de completar la carga y los reintentos de descarga solicitan una URL nueva del módulo. Los reproductores destruidos no pueden volver a arrancar. El visor y las recomendaciones de código conservan las mismas restricciones de descarga que el editor.

Los recuerdos de Jardín de lunas admiten completos los 50 caracteres del título, el separador y los 110 del mensaje. La conversión de fotos descarta resultados de una selección anterior y espera a completar la imagen antes de permitir crear el enlace. `node tools/check-regressions.mjs` verifica los siete recuerdos en su longitud máxima y la importación de las 73 escenas; las pruebas de Chrome incluyen restauración de enlaces, navegación Atrás y recuperación de una descarga bloqueada.
