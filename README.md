# Detallito — animaciones para dedicar

Sitio estático (HTML + CSS + JavaScript con módulos ES, sin compilación). Las animaciones se dibujan en `<canvas>` y los datos personalizados viajan dentro del enlace, así que **no hay backend ni base de datos**.

## Probar en local

Los módulos ES necesitan un servidor (abrir con doble clic no funciona):

```bash
python -m http.server 8080
# o: npx serve .
```

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
acerca.html, privacidad.html   Requeridas para solicitar AdSense
css/styles.css
js/catalog.js     Lista de animaciones (agrega aquí las nuevas)
js/share.js       Codifica/decodifica la tarjeta en el enlace (base64url)
js/gallery.js     Tarjetas con vista previa animada (se pausan fuera de pantalla)
js/anim/engine.js Reproductor: tamaño, devicePixelRatio, bucle
js/anim/*.js      Una escena por archivo
tools/            og.html (imagen para WhatsApp) y preview.html (revisión)
```

## Agregar una animación

1. Crea `js/anim/mi-escena.js` exportando por defecto `create(ctx, w, h, dpr)` que devuelva `frame(t, dt)`.
   Dibuja en función de `t` (segundos) y usa medidas relativas a `w`/`h` para que se vea bien en celular y en PC.
2. Agrégala a `ANIMATIONS` en `js/catalog.js` con su mensaje por defecto, posición del texto y retraso.

## Antes de publicar

1. Reemplaza `tu-dominio.com` en todos los HTML por tu dominio real (las imágenes `og:image` deben ser URL absolutas para que WhatsApp muestre la vista previa).
2. Si cambias el nombre "Detallito", búscalo y reemplázalo en los HTML.
3. Regenera `img/og.png` si cambias el diseño: abre `tools/og.html` y toma una captura de 1200x630.

## Publicar gratis (Cloudflare Pages)

1. Sube la carpeta a un repositorio de GitHub.
2. Cloudflare → Workers & Pages → Create → Pages → conecta el repo.
3. Build command: *(vacío)* · Output directory: `/`.
4. Conecta tu dominio.

## AdSense

- Solicítalo con el dominio propio ya publicado y con las páginas de privacidad y contacto.
- Pega el script de tu cuenta en el `<head>` y los bloques de anuncio dentro de los `div.ad-slot` (ya reservan altura para no mover el diseño).
- No pongas anuncios encima de la animación ni botones de descarga falsos: Google lo penaliza.

## Pendientes sugeridos

- Descarga en MP4 para estados de WhatsApp.
- Vista previa personalizada en WhatsApp ("Para María…") con una función en el servidor (Cloudflare Pages Functions).
- Música opcional (libre de derechos).
- Nuevas escenas: Día de Muertos, Navidad, San Valentín.
