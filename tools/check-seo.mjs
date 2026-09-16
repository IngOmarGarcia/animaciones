// Revisión SEO del sitio publicado. Ejecutar tras `node tools/generate-seo.mjs`.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { VISIBLE_ANIMATIONS, ANIMATIONS, CATEGORIES } from '../js/catalog.js';

const origin = 'https://viralcss.com';
const read = (path) => readFile(path, 'utf8');
const sitemap = await read('sitemap.xml');
const index = await read('animaciones.html');
const home = await read('index.html');

const categories = CATEGORIES.filter((c) => c.id !== 'todas' && VISIBLE_ANIMATIONS.some((a) => a.category === c.id));
const pages = ['index.html', 'animaciones.html', 'crear.html', 'codigo.html', 'encargos.html', 'acerca.html', 'privacidad.html'];
for (const c of categories) pages.push(`categorias/${c.id}.html`);
for (const a of VISIBLE_ANIMATIONS) {
  const path = `animaciones/${a.id}.html`;
  pages.push(path);
  assert(index.includes(`/${path}`), `Falta enlace interno: ${path}`);
}

const titles = new Set();
const descriptions = new Set();
for (const page of pages) {
  const html = await read(page);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  assert(title && !titles.has(title), `Título ausente o duplicado: ${page}`);
  titles.add(title);

  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  assert(description, `Falta description: ${page}`);
  assert(!descriptions.has(description), `Description duplicada: ${page}`);
  assert(description.length <= 160, `Description demasiado larga (${description.length}): ${page}`);
  descriptions.add(description);

  const canonical = page === 'index.html' ? `${origin}/` : `${origin}/${page}`;
  assert(html.includes(`<link rel="canonical" href="${canonical}">`), `Canonical incorrecto: ${page}`);
  assert(sitemap.includes(`<loc>${canonical}</loc>`), `Falta en sitemap: ${page}`);

  assert((html.match(/<h1[\s>]/g) || []).length === 1, `Debe haber exactamente un H1: ${page}`);
  assert(/<html lang="es/.test(html), `Falta lang español: ${page}`);
  assert(html.includes('name="viewport"'), `Falta viewport (SEO móvil): ${page}`);
  assert(!/name="robots"[^>]*noindex/.test(html), `noindex accidental en página pública: ${page}`);

  for (const tag of ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:card']) {
    assert(html.includes(`"${tag}"`), `Falta ${tag}: ${page}`);
  }

  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(block[1]);
    } catch (error) {
      assert.fail(`JSON-LD inválido en ${page}: ${error.message}`);
    }
  }
}

// Enlaces internos: todos deben resolver a un archivo existente
const linkErrors = [];
for (const page of [...pages, '404.html']) {
  const html = await read(page);
  const dir = page.includes('/') ? `${page.slice(0, page.lastIndexOf('/'))}/` : '';
  for (const match of html.matchAll(/href="([^"#]+)"/g)) {
    const href = match[1];
    if (/^(https?:|mailto:|tel:|data:)/.test(href)) continue;
    const clean = href.split('?')[0];
    if (!clean || clean.endsWith('.css') || clean.endsWith('.png') || clean.endsWith('.jpg') || clean.endsWith('.svg')) continue;
    const target = clean.startsWith('/') ? clean.slice(1) : `${dir}${clean}`;
    const file = target === '' || target.endsWith('/') ? `${target}index.html` : target;
    if (!existsSync(file)) linkErrors.push(`${page} → ${href}`);
  }
}
assert.equal(linkErrors.length, 0, `Enlaces internos rotos:\n${linkErrors.join('\n')}`);

// Páginas que deliberadamente no deben indexarse
for (const a of ANIMATIONS.filter((a) => a.hidden)) {
  assert(!sitemap.includes(`/animaciones/${a.id}.html`), `Escena oculta en el sitemap: ${a.id}`);
  assert(!existsSync(`animaciones/${a.id}.html`), `Escena oculta con página generada: ${a.id}`);
}
assert(/name="robots" content="noindex/.test(await read('v.html')), 'v.html debe llevar noindex');
assert(/name="robots" content="noindex/.test(await read('404.html')), '404.html debe llevar noindex');
for (const file of await readdir('tools')) {
  if (!file.endsWith('.html')) continue;
  assert(/name="robots"[^>]*noindex/.test(await read(`tools/${file}`)), `Falta noindex en tools/${file}`);
}
const headers = await read('_headers');
assert(headers.includes('/tools/*') && headers.includes('X-Robots-Tag: noindex'), 'Faltan cabeceras noindex');
assert(!sitemap.includes('/tools/') && !sitemap.includes('/v.html'), 'El sitemap no debe incluir rutas privadas');

// robots.txt y manifiesto
const robots = await read('robots.txt');
assert(robots.includes(`Sitemap: ${origin}/sitemap.xml`), 'robots.txt sin sitemap');
assert(!/^Disallow: \/$/m.test(robots), 'robots.txt bloquea todo el sitio');
JSON.parse(await read('site.webmanifest'));
assert(home.includes('rel="manifest"'), 'La portada no enlaza el manifiesto');

// La portada debe enlazar todas las categorías (descubrimiento)
for (const c of categories) assert(home.includes(`categorias/${c.id}.html`), `La portada no enlaza la categoría ${c.id}`);

const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, 'URLs duplicadas en el sitemap');
console.log(`${pages.length} páginas públicas, ${VISIBLE_ANIMATIONS.length} animaciones, ${sitemapUrls.length} URLs en sitemap y ${linkErrors.length} enlaces rotos`);
