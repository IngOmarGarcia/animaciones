# ViralCss — animaciones para dedicar

Sitio estático (HTML + CSS + JavaScript con módulos ES, sin compilación). Las animaciones se dibujan en `<canvas>` y los datos personalizados viajan dentro del enlace, así que **no hay backend ni base de datos**.

## Probar en local

Los módulos ES necesitan un servidor (abrir con doble clic no funciona):

```bash
python tools/serve.py
```

Usa este servidor y no `python -m http.server`: el de Python no manda cabeceras de caché y el navegador puede quedarse con módulos viejos (animaciones en negro después de cambiar `util.js`).

Luego abre http://localhost:8080

- Galería: `index.html`
- Personalizar: `crear.html?a=girasol`
- Ver sorpresa: `v.html?s=...` (se genera desde crear). Para pruebas: `v.html?a=papel-picado&autoplay`
- Revisar todas las escenas en varios tiempos: `tools/preview.html?t=1,3,6`

## Estructura

```
index.html        Portada con galería y texto SEO
crear.html        Vista previa + formulario + enlace para compartir
v.html            Página que abre quien recibe la sorpresa
codigo.html       Código HTML de una animación para copiar o descargar (?a=id o ?s=... con mensaje)
acerca.html, privacidad.html   Requeridas para solicitar AdSense
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
- `donation`: CLABE de Mercado Pago, titular y link de pago opcional para donaciones voluntarias (vacío = no se muestra). Nunca pongas el número de tu tarjeta.
- `customOrderPrice` / `customOrderDelivery`: precio y tiempo de entrega de `encargos.html`.

## Videos para TikTok / Reels

Abre `tools/grabar.html` (en local o en https://viralcss.com/tools/grabar.html) con Chrome o Edge en PC,
elige animación y texto, y descarga un video vertical de 1080×1920 con la marca «Crea la tuya gratis».

## Agregar una animación

1. Crea `js/anim/mi-escena.js` exportando por defecto `create(ctx, w, h, dpr)` que devuelva `frame(t, dt)`.
   Dibuja en función de `t` (segundos) y usa medidas relativas a `w`/`h` para que se vea bien en celular y en PC.
2. Agrégala a `ANIMATIONS` en `js/catalog.js` con `file: 'mi-escena'`, su mensaje por defecto, posición del texto y retraso.
3. Para que su código se pueda descargar, la escena solo debe importar de `./util.js` (en una sola sentencia `import { ... }`).
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

1. El sitio está en `https://viralcss.com` (también responde en `animaciones.pages.dev`). Si cambias de dominio, reemplaza la dirección en `js/config.js` y en los HTML (las imágenes `og:image` deben ser URL absolutas para que WhatsApp muestre la vista previa).
2. Si cambias el nombre "ViralCss", búscalo y reemplázalo en los HTML.
3. Regenera `img/og.png` si cambias el diseño: abre `tools/og.html` y toma una captura de 1200x630.

## Publicar gratis (Cloudflare Pages)

1. Sube la carpeta a un repositorio de GitHub.
2. Cloudflare → Workers & Pages → Create → Pages → conecta el repo.
3. Build command: *(vacío)* · Output directory: `/`.
4. Conecta tu dominio.

## AdSense

- Solicítalo con el dominio propio ya publicado y con las páginas de privacidad y contacto.
- El script de la cuenta (`ca-pub-3061014711786485`) ya está en el `<head>` de cada página y `ads.txt` está en la raíz.
- Cuando aprueben la cuenta, pega los bloques de anuncio dentro de los `div.ad-slot` (ya reservan altura para no mover el diseño). Vacíos se ocultan solos.
- No pongas anuncios encima de la animación ni botones de descarga falsos: Google lo penaliza.

## Pendientes sugeridos

- Descarga en MP4 para estados de WhatsApp.
- Vista previa personalizada en WhatsApp ("Para María…") con una función en el servidor (Cloudflare Pages Functions).
- Música opcional (libre de derechos).
- Nuevas escenas: Día de Muertos, Navidad, San Valentín.
