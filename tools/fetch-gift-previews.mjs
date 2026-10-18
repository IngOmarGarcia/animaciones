import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { GIFTS } from '../js/config.js';

await mkdir('tools/review/gift-previews', { recursive: true });
const gifts = GIFTS.filter(g => g.categories);
const previews = {};
const decode = value => value.replace(/&quot;/g, '"').replace(/&#(?:39|x27);/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
for (const gift of gifts) {
  const code = new URL(gift.url).pathname.slice(1);
  try {
    let html;
    if (process.argv.includes('--cached')) html = await readFile(`tools/review/gift-previews/${code}.html`, 'utf8');
    else {
    const response = await fetch(gift.url, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1', 'Accept': 'text/html', 'Accept-Language': 'es-MX,es;q=0.9' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    html = await response.text();
    await writeFile(`tools/review/gift-previews/${code}.html`, html);
    }
    const meta = name => {
      const tag = [...html.matchAll(/<meta\s[^>]*>/gi)].map(m => m[0]).find(tag => tag.includes(`property="${name}"`));
      return decode(tag?.match(/content="([^"]*)"/)?.[1] || '');
    };
    const title = meta('og:title'), image = meta('og:image');
    if (!title || !image.startsWith('https://http2.mlstatic.com/')) throw Error('Vista previa incompleta');
    previews[code] = { title, image };
    console.log(JSON.stringify({ code, title, image }));
  } catch (error) { console.error(JSON.stringify({ code, error: error.message })); process.exitCode = 1; }
}
if (!process.exitCode) await writeFile('js/gift-previews.js', '// Títulos e imágenes Open Graph de los enlaces de Mercado Libre.\nexport const GIFT_PREVIEWS = '+JSON.stringify(previews, null, 2)+';\n');
