// Genera páginas HTML rastreables a partir del catálogo público. Ejecutar al editar js/catalog.js.
import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { VISIBLE_ANIMATIONS, CATEGORIES } from '../js/catalog.js';

const origin = 'https://viralcss.com';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const categories = CATEGORIES.filter((c) => c.id !== 'todas' && VISIBLE_ANIMATIONS.some((a) => a.category === c.id));
const names = {
  flores: 'Flores amarillas', mexico: 'Independencia de México', futbol: 'Fútbol', gamer: 'Gamer',
  amor: 'Amor', espacio: 'Espacio y cielo', paisajes: 'Paisajes', cumple: 'Cumpleaños',
  navidad: 'Navidad', muertos: 'Día de Muertos',
};
const intros = {
  flores: 'Flores amarillas virtuales para dedicar el 21 de septiembre o cualquier día. Elige una animación de girasoles, pétalos o flores de luz, escribe un nombre y un mensaje, y comparte el enlace por WhatsApp.',
  mexico: 'Festeja el 15 y 16 de septiembre con animaciones inspiradas en México. Personalízalas y comparte el enlace con familia y amigos.',
  futbol: 'Animaciones de fútbol para dedicar a quien vive cada partido. Añade su nombre y comparte una sorpresa interactiva.',
  gamer: 'Sorpresas animadas inspiradas en videojuegos para dedicar a alguien que juega contigo. Personaliza el texto y envía el enlace.',
  amor: 'Animaciones de amor para decir lo que sientes con corazones, luz y escenas interactivas. Personaliza el nombre y el mensaje.',
  espacio: 'Lunas, galaxias y estrellas que se convierten en una dedicatoria. Elige una animación, escribe tu mensaje y compártelo.',
  paisajes: 'Paisajes animados para acompañar una dedicatoria: cielos, flores y escenas tranquilas que puedes compartir por enlace.',
  cumple: 'Animaciones de cumpleaños con nombre y mensaje personalizable para felicitar a alguien desde cualquier lugar.',
  navidad: 'Animaciones navideñas para enviar una felicitación personalizada mediante un enlace que se abre en el celular.',
  muertos: 'Una animación para recordar con cariño a quienes ya no están. Personaliza el mensaje y comparte el recuerdo.',
};
// Contexto extra para categorías con búsquedas estacionales. Texto natural, no relleno de palabras clave.
const extras = {
  flores: `<h2>Flores amarillas virtuales para el 21 de septiembre</h2>
<p>Cada 21 de septiembre, con la llegada de la primavera en el hemisferio sur, se volvió costumbre regalar flores amarillas a quien quieres. Si esa persona está lejos, puedes mandarle un ramo que se abre en su pantalla: eliges la animación, escribes su nombre y le llega un enlace por WhatsApp.</p>
<h2>Preguntas frecuentes</h2>
<h3>¿Cuánto cuesta enviar flores amarillas virtuales?</h3>
<p>Nada. Puedes crear y compartir la animación gratis, tantas veces como quieras.</p>
<h3>¿Necesita instalar una aplicación?</h3>
<p>No. El enlace se abre en el navegador de cualquier celular o computadora.</p>
<h3>¿Puedo escribir un mensaje propio?</h3>
<p>Sí. Añades su nombre y tu dedicatoria antes de compartir, y algunas animaciones incluyen una carta más larga.</p>`,
  mexico: `<h2>Para el Grito del 15 de septiembre</h2>
<p>La noche del 15 de septiembre y el desfile del 16 son buen momento para mandar algo a la familia que está lejos. Estas animaciones se comparten por enlace y se abren al instante, sin descargar nada.</p>`,
};
// La meta description se corta en ~160 caracteres: cuando el texto de la página es más largo, se usa una versión breve.
const metaDescriptions = {
  flores: 'Flores amarillas virtuales para dedicar el 21 de septiembre: girasoles, pétalos y flores de luz. Personalízalas y compártelas por WhatsApp.',
};
const categoryUrl = (id) => `/categorias/${id}.html`;
const animationUrl = (id) => `/animaciones/${id}.html`;
const json = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
const crumb = (parts) => `<nav class="crumbs" aria-label="Ruta de navegación">${parts.map((p, i) => i === parts.length - 1 ? `<span aria-current="page">${esc(p.name)}</span>` : `<a href="${p.url}">${esc(p.name)}</a>`).join(' <span aria-hidden="true">›</span> ')}</nav>`;
const layout = ({ title, description, url, body, crumbs, type = 'website', animationId = '', schema = [] }) => `<!doctype html>
<!-- ViralCss SEO generado; edita tools/generate-seo.mjs -->
<html lang="es-MX">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(title)} | ViralCss</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#0d0a1f">
  <link rel="canonical" href="${origin}${url}">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="ViralCss">
  <meta property="og:title" content="${esc(title)} | ViralCss">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${origin}${url}">
  <meta property="og:image" content="${origin}/img/og.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Animaciones de ViralCss para dedicar y compartir">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)} | ViralCss">
  <meta name="twitter:description" content="${esc(description)}">
  <link rel="icon" href="/img/icon.png" type="image/png">
  <link rel="apple-touch-icon" href="/img/icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="stylesheet" href="/css/styles.css">
  <script type="application/ld+json">${json({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, item: `${origin}${p.url}` })) })}</script>
${schema.map((s) => `  <script type="application/ld+json">${json({ '@context': 'https://schema.org', ...s })}</script>`).join('\n')}
</head>
<body${animationId ? ` data-animation="${esc(animationId)}"` : ''}>
  <header class="site-header seo-header"><a class="brand" href="/"><img src="/img/logo.png" alt="" width="72" height="48"><span class="brand-name">Viral<span class="accent">Css</span></span></a><nav><a href="/animaciones.html">Animaciones</a><a href="/encargos.html">Encargos</a><a href="/acerca.html">Acerca</a></nav></header>
  <main class="container prose seo-page">
    ${crumb(crumbs)}
    ${body}
  </main>
  <footer class="site-footer"><nav><a href="/">Inicio</a><a href="/animaciones.html">Animaciones</a><a href="/privacidad.html">Aviso de privacidad</a></nav><p>© 2026 ViralCss</p></footer>
  ${animationId ? '<script type="module" src="/js/detail.js"></script>' : ''}
</body>
</html>
`;
const list = (items) => `<ul class="seo-list">${items.map((a) => `<li><a href="${animationUrl(a.id)}">${esc(a.title)}</a><p>${esc(a.description)}</p></li>`).join('')}</ul>`;

await mkdir('animaciones', { recursive: true });
await mkdir('categorias', { recursive: true });
for (const [dir, ids] of [['animaciones', new Set(VISIBLE_ANIMATIONS.map((a) => a.id))], ['categorias', new Set(categories.map((c) => c.id))]]) {
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.html') || ids.has(file.slice(0, -5))) continue;
    const path = `${dir}/${file}`;
    if ((await readFile(path, 'utf8')).includes('<!-- ViralCss SEO generado;')) await unlink(path);
  }
}

const indexBody = `<h1>Animaciones para dedicar y compartir</h1><p>Explora las animaciones interactivas de ViralCss. Puedes escribir el nombre de quien la recibe y un mensaje, ver el resultado y compartirlo por WhatsApp o con un enlace. Las animaciones gratuitas se abren en el navegador.</p><h2>Categorías</h2><ul class="seo-category-list">${categories.map((c) => `<li><a href="${categoryUrl(c.id)}">${esc(names[c.id])}</a></li>`).join('')}</ul><h2>Todas las animaciones</h2>${list(VISIBLE_ANIMATIONS)}`;
await writeFile('animaciones.html', layout({ title: 'Animaciones con código para dedicar y compartir', description: 'Explora animaciones interactivas gratuitas de flores amarillas, amor, cumpleaños y más. Personaliza nombre y mensaje y comparte por WhatsApp.', url: '/animaciones.html', body: indexBody, crumbs: [{ name: 'Inicio', url: '/' }, { name: 'Animaciones', url: '/animaciones.html' }] }));

for (const category of categories) {
  const name = names[category.id];
  const items = VISIBLE_ANIMATIONS.filter((a) => a.category === category.id);
  const extra = extras[category.id] ?? '';
  const body = `<h1>Animaciones de ${esc(name.toLowerCase())}</h1><p>${esc(intros[category.id])}</p><h2>Elige una animación</h2>${list(items)}${extra}<p><a href="/animaciones.html">Ver todas las categorías</a></p>`;
  const itemList = {
    '@type': 'ItemList',
    name: `Animaciones de ${name.toLowerCase()}`,
    itemListElement: items.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.title, url: `${origin}${animationUrl(a.id)}` })),
  };
  await writeFile(`categorias/${category.id}.html`, layout({ title: `Animaciones de ${name.toLowerCase()} para dedicar`, description: metaDescriptions[category.id] ?? intros[category.id], url: categoryUrl(category.id), body, schema: [itemList], crumbs: [{ name: 'Inicio', url: '/' }, { name: 'Animaciones', url: '/animaciones.html' }, { name, url: categoryUrl(category.id) }] }));
}

for (const animation of VISIBLE_ANIMATIONS) {
  const category = names[animation.category];
  const related = VISIBLE_ANIMATIONS.filter((a) => a.category === animation.category && a.id !== animation.id).slice(0, 4);
  const body = `<h1>${esc(animation.title)}</h1><p>${esc(animation.description)}</p><p>Personaliza esta animación con un nombre y un mensaje. Puedes verla antes de compartirla; la persona que reciba el enlace podrá abrirla en su celular o computadora.</p><div class="seo-preview"><canvas id="detail-canvas" aria-label="Vista previa de ${esc(animation.title)}"></canvas><button id="detail-play" class="btn btn-primary" type="button">Ver animación</button></div><p><a class="btn btn-primary" href="/crear.html?a=${encodeURIComponent(animation.id)}">Personalizar ${esc(animation.title)}</a></p><h2>Cómo compartirla</h2><ol><li>Abre la animación y escribe tu dedicatoria.</li><li>Revisa la vista previa.</li><li>Copia el enlace o envíalo por WhatsApp.</li></ol><h2>Más animaciones de ${esc(category.toLowerCase())}</h2>${list(related)}<p><a href="${categoryUrl(animation.category)}">Ver la categoría ${esc(category)}</a></p>`;
  const pitch = `${animation.description} Personalízala con nombre y mensaje y compártela gratis por WhatsApp.`;
  const metaDescription = pitch.length <= 160 ? pitch : `${animation.description} Personalízala y compártela gratis por WhatsApp.`;
  // Cada animación aporta sus propias señales: nombre, descripción, categoría, URL y que es gratuita
  const creative = {
    '@type': 'CreativeWork',
    name: animation.title,
    description: animation.description,
    url: `${origin}${animationUrl(animation.id)}`,
    genre: category,
    inLanguage: 'es-MX',
    isAccessibleForFree: true,
    isFamilyFriendly: true,
    learningResourceType: 'Animación interactiva',
    publisher: { '@type': 'Organization', name: 'ViralCss', url: `${origin}/` },
    isPartOf: { '@type': 'CollectionPage', name: `Animaciones de ${category.toLowerCase()}`, url: `${origin}${categoryUrl(animation.category)}` },
  };
  await writeFile(`animaciones/${animation.id}.html`, layout({ title: `${animation.title} para dedicar`, description: metaDescription, url: animationUrl(animation.id), body, animationId: animation.id, schema: [creative], crumbs: [{ name: 'Inicio', url: '/' }, { name: 'Animaciones', url: '/animaciones.html' }, { name: category, url: categoryUrl(animation.category) }, { name: animation.title, url: animationUrl(animation.id) }] }));
}

const urls = ['/', '/animaciones.html', ...categories.map((c) => categoryUrl(c.id)), ...VISIBLE_ANIMATIONS.map((a) => animationUrl(a.id)), '/crear.html', '/codigo.html', '/encargos.html', '/acerca.html', '/privacidad.html'];
// lastmod real de cada archivo: ayuda a Google a volver solo donde algo cambió
const fileOf = (url) => (url === '/' ? 'index.html' : url.slice(1));
const entries = await Promise.all(urls.map(async (url) => {
  const lastmod = await stat(fileOf(url)).then((s) => s.mtime.toISOString().slice(0, 10)).catch(() => '');
  return `  <url><loc>${origin}${url}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
}));
await writeFile('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`);
console.log(`Generadas ${VISIBLE_ANIMATIONS.length} animaciones, ${categories.length} categorías y sitemap.xml`);
