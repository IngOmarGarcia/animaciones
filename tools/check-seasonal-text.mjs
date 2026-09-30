import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { SEASONAL_ANIMATIONS } from '../js/seasonal-catalog.js';
import { cleanCard, encodeCard, decodeCard } from '../js/share.js';
import { buildStandaloneHtml } from '../js/standalone.js';
const readText = p => readFile(new URL(`../js/${p}`, import.meta.url), 'utf8');
for (const anim of SEASONAL_ANIMATIONS) {
  assert.equal(anim.phrases.length, 3);
  for (const tm of ['suggest', 'custom', 'none']) {
    const card = cleanCard({ a: anim.id, tm, p: tm === 'none' ? '' : 'En memoria de Luna', m: tm === 'suggest' ? anim.phrases[1] : '', d: '' });
    assert.deepEqual(decodeCard(encodeCard(card)), card, 'El enlace debe conservar el modo y la frase vacía');
    const html = await buildStandaloneHtml(anim, card, readText);
    const script = html.match(/\n<script>\n([\s\S]*?)<\/script>/)[1];
    new vm.Script(script); // Verifies the bundled dependency graph and expression default export.
    assert(script.includes(`const MODO_TEXTO = "${tm}"`));
    if(tm !== 'suggest')assert(script.includes('const MENSAJE = "";'), 'No debe reaparecer una frase predeterminada');
  }
}
assert.equal(cleanCard({tm:'invalid'}).tm, '');
console.log('30 combinaciones verificadas: modos, enlaces compartidos y HTML descargable.');
