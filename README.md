# ViralCss — animaciones para dedicar

Sitio estático (HTML + CSS + JavaScript con módulos ES, sin compilación). Las animaciones se dibujan en `<canvas>` y los datos personalizados viajan dentro del enlace. Las sugerencias se reciben por correo.

## Probar en local

Los módulos ES necesitan un servidor (abrir con doble clic no funciona):

```bash
node tools/serve-local.mjs
```

Este servidor sirve los módulos con el tipo de contenido correcto y desactiva la caché durante las pruebas. También está disponible `python tools/serve.py` si tienes Python instalado.

Luego abre http://localhost:8080

- Galería: `index.html`
- Personalizar: `crear.html?a=girasol`
- Ver sorpresa: `v.html?s=...` (se genera desde crear). Para pruebas: `v.html?a=papel-picado&autoplay`
- Revisar todas las escenas en varios tiempos: `tools/preview.html?t=1,3,6`

## SEO y catálogo rastreable

Las páginas públicas de `/animaciones/` y `/categorias/`, `animaciones.html` y `sitemap.xml` se generan desde `js/catalog.js`. Después de agregar, ocultar o cambiar una animación, ejecuta `node tools/generate-seo.mjs` y publica también los archivos generados. El script incluye solo `VISIBLE_ANIMATIONS`; no genera páginas para sorpresas con nombres y mensajes personales. `v.html` y las herramientas de `/tools/` llevan `noindex`. Después de generar, ejecuta `node tools/check-seo.mjs`: revisa títulos y descripciones únicos, canonical, un solo H1, Open Graph, JSON-LD válido, enlaces internos rotos, sitemap y las rutas que no deben indexarse.

En Google Search Console, verifica `https://viralcss.com`, envía `https://viralcss.com/sitemap.xml` e inspecciona la portada, `/categorias/flores.html` y algunas fichas de `/animaciones/`. Comprueba que el dominio alternativo de Cloudflare Pages redirija al dominio principal.

## Estructura

```
index.html        Portada con galería y guía de elección
crear.html        Vista previa + formulario + enlace para compartir
v.html            Página que abre quien recibe la sorpresa
codigo.html       Código HTML de una animación para copiar o descargar (?a=id o ?s=... con mensaje)
acerca.html, privacidad.html   Información del proyecto y tratamiento de datos
css/styles.css
js/catalog.js     Lista de animaciones (agrega aquí las nuevas)
js/share.js       Codifica/decodifica la tarjeta en el enlace (base64url)
js/standalone.js  Genera el HTML autónomo a partir de js/anim/<file>.js y lo que usa de util.js
js/gallery.js     Tarjetas con vista previa animada (se pausan fuera de pantalla)
js/anim/engine.js Reproductor: tamaño, devicePixelRatio, bucle
js/anim/*.js      Una escena por archivo
tools/            og.html (imagen para WhatsApp) y preview.html (revisión)
```

## Monetización

Todo se configura en `js/config.js`:

- `GIFTS`: regalos de Mercado Libre por categoría. Reemplaza cada `url` por tu enlace de afiliado.
- `whatsapp`: número para recibir encargos (vacío = se piden por correo).
- `supportConfig`: CLABE de Mercado Pago y `paymentUrl` opcional para aportaciones voluntarias (ambos vacíos = no se muestra). Nunca pongas el número de tu tarjeta.
- `customOrderPrice` / `customOrderDelivery`: precio y tiempo de entrega de `encargos.html`.

## Videos para TikTok / Reels

Abre `tools/grabar.html` (en local o en https://viralcss.com/tools/grabar.html) con Chrome o Edge en PC,
elige animación y texto, y descarga un video vertical de 1080×1920 con la marca «Crea la tuya gratis».

## Agregar una animación

1. Crea `js/anim/mi-escena.js` exportando por defecto `create(ctx, w, h, dpr)` que devuelva `frame(t, dt)`.
   Dibuja en función de `t` (segundos) y usa medidas relativas a `w`/`h` para que se vea bien en celular y en PC.
2. Agrégala a `ANIMATIONS` en `js/catalog.js` con `file: 'mi-escena'`, su mensaje por defecto, posición del texto y retraso.
3. Para que su código se pueda descargar, la escena debe importar solo de otros módulos de `js/anim/` (una sentencia `import { ... }` por módulo): de `./util.js` se copian nada más las funciones que usa, y los demás módulos se incrustan completos. Si la escena carga archivos externos (por ejemplo una nube de puntos `.bin`), márcala con `noCode: true` en el catálogo: la página de código lo explicará en vez de fallar.
4. Utilidades para escenas en `util.js`: `softBackdrop` (fondo desenfocado), `makeLayer`, `glow`, `sparkle`, `heartPath`/`heartPoint`,
   `project3D`, `textPoints` y `cardName` (nombre del destinatario desde `stage.card`, para escenas que lo escriben).
   Revisa varias escenas rápido con `tools/preview.html?ids=a,b&t=2,5&fps=10`.
5. Escenas interactivas (ej. `regalo.js`): `create` recibe un quinto parámetro `stage` con `stage.taps` (toques sobre el canvas).
   Pon `interactive: true` en el catálogo y marca `stage.revealed = true` cuando deba aparecer el mensaje.
   Si `stage` no existe (grabador de video) la escena debe avanzar sola, y `textDelay` debe coincidir con ese momento.
6. Escenas que forman el nombre ellas mismas (ej. `corazon-energia.js`): pon `nameInScene: true` para no repetir «Para …»
   y `textPosition: 'below'` para que el mensaje quede debajo de la figura central.
   `corazon-energia.js` usa WebGL en un canvas propio que se copia al canvas 2D del reproductor (sin dependencias, sirve para el código descargable).

## Antes de publicar

La colección de once frases emocionales se define en `js/emotional-catalog.js`; sus módulos usan `js/anim/emotional-particles.js`. Comparte con Corazón de energía el renderizador WebGL de puntos aditivos, estelas y bloom de `util.js`, mediante `emotional-energy-renderer.js`. `emotional-energy-shapes.js` aporta superficies, interior y contornos volumétricos. Las letras visibles son partículas atraídas a objetivos tipográficos; la explosión aplica velocidades en tres dimensiones antes de reconstruir cada figura. Las narrativas avanzan por bloques y conservan sus finales de dispersión. Las miniaturas reproducen la secuencia con un presupuesto reducido de partículas y reinicio en bucle; comienzan con el texto formado para evitar una espera vacía.

El texto usa la misma familia Arial Black de Corazón de energía, con peso 900 y encuadre amplio. Una parte de las partículas forma el volumen de las letras y otra orbita en profundidad con alturas distintas, además de una capa que se desprende de los trazos. El salto de línea se adapta al ancho y conserva todas las palabras.

El editor permite elegir experiencia, dos colores, brillo, velocidad de movimiento y densidad. Solo las escenas compatibles ofrecen un nombre de hasta 24 caracteres. La velocidad no acorta las ventanas de lectura. Los ajustes viajan en el enlace y el texto original se conserva. Movimiento reducido muestra la frase completa sin animación; el presupuesto de partículas baja automáticamente si aumenta el costo de renderizado.

Comprobaciones de la colección: `node tools/check-emotional.mjs` y, con localhost activo, `node tools/browser-check.mjs --emotional`. `--gallery-autoplay` comprueba avance de tiempo y cambio real de píxeles en las 105 miniaturas, escenas de frases/3D en móvil y activación voluntaria con movimiento reducido. `--gallery-controls` verifica el control real de pausa/reproducción en portada. Todas las miniaturas visibles pueden reproducirse simultáneamente, con un límite de 18 FPS en móvil y 24 FPS en escritorio. Los reproductores fuera de pantalla se pausan y los contextos 3D se liberan; Eternal Bloom usa una vista previa 3D real con imagen de respaldo si WebGL falla. Las capturas y mediciones quedan en `tools/review/`, excluido de Git. Las herramientas locales `tools/emotional-qa.html` y `tools/gallery-motion-qa.html` permiten revisar las secuencias.

1. El sitio está en `https://viralcss.com` (también responde en `animaciones.pages.dev`). Si cambias de dominio, reemplaza la dirección en `js/config.js` y en los HTML (las imágenes `og:image` deben ser URL absolutas para que WhatsApp muestre la vista previa).
2. Si cambias el nombre "ViralCss", búscalo y reemplázalo en los HTML.
3. Regenera `img/og.png` si cambias el diseño: abre `tools/og.html` y toma una captura de 1200x630.

## Publicar gratis (Cloudflare Pages)

1. Sube la carpeta a un repositorio de GitHub.
2. Cloudflare → Workers & Pages → Create → Pages → conecta el repo.
3. Build command: *(vacío)* · Output directory: `/`.
4. Conecta tu dominio.

## Sugerencias

El botón superior lleva a `/sugerencias.html`, donde se muestra el correo de contacto y un enlace `mailto:`. No necesita servicios adicionales en Cloudflare.

## AdSense y revisión local

Los espacios manuales se limitan a la portada pública: `home-top`, `home-bottom`, `home-feed`, `home-batch` y `home-sidebar`. Editor, código, dedicatorias personales, errores y herramientas no cargan anuncios. Se rechazan parámetros de URL distintos de una categoría válida para no transmitir dedicatorias o datos personales. En localhost se muestran marcadores sin solicitudes a Google. Los bloques reales requieren IDs numéricos, `consentVerified: true` y una señal válida de una CMP certificada. La ausencia, el fallo o la retirada de consentimiento bloquean las solicitudes; no se utiliza un banner casero. La configuración actual deja `consentVerified: false` y los IDs vacíos. La meta de asociación y `ads.txt` permanecen publicados.

Con diez escenas o más se conservan las franjas móviles cada diez tarjetas y los separadores al cargar otras 40. El lateral es de 160×600, solo desde 1280 px de ancho y 800 px de alto, sin solapes. Con cuatro a nueve escenas queda únicamente el anuncio inferior y hasta tres productos; con menos de cuatro no se muestran anuncios ni el carrusel de afiliados. Son decisiones de producto para mantener protagonismo del contenido, no mínimos impuestos por Google. El anuncio inferior está separado de la aportación voluntaria por contenido del sitio. No se actualizan anuncios mediante temporizadores.

Configuración y pendientes externos: [tools/ADSENSE-ACTIVATION.md](tools/ADSENSE-ACTIVATION.md). Verificaciones: `node tools/check-ad-policy.mjs`, `node tools/browser-check.mjs --ad-policy` y `--ad-placements`. La prueba de consentimiento intercepta y simula las respuestas publicitarias: no genera impresiones reales.

La portada muestra categorías laterales persistentes desde 1280 px cuando las superiores salen de pantalla. El botón de subir con partículas y movimiento reducido funciona en PC y móvil. «Cargar 40 animaciones más» añade tarjetas en pequeños bloques sin reemplazar las anteriores ni desplazar la vista; solo las miniaturas visibles se activan. Los productos afiliados al final usan `renderGifts` con autoplay, pausa por interacción/visibilidad y limpieza al cambiar de categoría. Verificación local: `node tools/browser-check.mjs --home-discovery` y `node tools/browser-check.mjs --home-append`.

Las políticas consultadas, las decisiones de indexación y los datos pendientes están en [tools/ADSENSE-REVIEW.md](tools/ADSENSE-REVIEW.md). No se promete aprobación. Las fichas se generan desde el catálogo y las explicaciones comprobadas de `js/scene-guides.js` y `js/category-guides.js`.

Para verificar los cambios, ejecuta `node tools/generate-seo.mjs`, `node tools/check-seo.mjs`, `node tools/check-seasonal-text.mjs` y `node tools/check-personalization.mjs`. Con el servidor local activo y Chrome instalado, `node tools/browser-check.mjs` comprueba los flujos reales y genera capturas en `tools/review/` (excluidas de Git).

## Fichas, guías e imágenes de las escenas

Las fichas públicas incluyen el mensaje de muestra y, en las experiencias emocionales, la frase original completa con su intención y una explicación del desenlace. Las guías de categorías añaden consejos de uso propios, alternativas enlazadas y una pregunta práctica por ocasión. El catálogo mantiene las categorías en dos filas con desplazamiento lateral y presenta las escenas antes de las guías largas. Los controles de filtrado se omiten en categorías de hasta tres escenas.

Cada escena tiene una imagen real en `img/previews/`, disponible antes de cargar JavaScript y utilizada también en su ficha y metadatos sociales. Las imágenes no sustituyen la reproducción automática. Para regenerarlas con el servidor local activo: `node tools/browser-check.mjs --capture-posters`. Para una selección, añade `--poster-only=id1,id2`. Las imágenes existentes de autor se reutilizan; las demás se capturan desde el renderer de la propia escena. Revisión: `node tools/browser-check.mjs --content-review` y `node tools/check-seo.mjs`.

## Pendientes sugeridos

- Descarga en MP4 para estados de WhatsApp.
- Vista previa personalizada en WhatsApp ("Para María…") con una función en el servidor (Cloudflare Pages Functions).
- Música opcional (libre de derechos).
- Nuevas escenas: Día de Muertos, Navidad, San Valentín.
