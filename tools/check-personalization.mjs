import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { VISIBLE_ANIMATIONS } from '../js/catalog.js';
import { cleanCard, encodeCard, decodeCard } from '../js/share.js';
import { FONT_OPTIONS, textFamily, canvasTextFont } from '../js/anim/text-style.js';
import { customPalette } from '../js/anim/color-style.js';
import { buildStandaloneHtml } from '../js/standalone.js';
const readText = p => readFile(new URL(`../js/${p}`, import.meta.url), 'utf8');
for (const font of FONT_OPTIONS) {
  const card = cleanCard({a:'fantasmita-rosa',f:font.id,c1:'#32cfff',c2:'#ffaaff'});
  assert.deepEqual(decodeCard(encodeCard(card)), card);
  assert(canvasTextFont({card},'700 20px').endsWith(font.family));
  const html=await buildStandaloneHtml(VISIBLE_ANIMATIONS[0],card,readText);
  assert(html.includes(`font-family: ${font.family}`));
  new vm.Script(html.match(/\n<script>\n([\s\S]*?)<\/script>/)[1]);
}
for (const anim of VISIBLE_ANIMATIONS.filter(a=>a.colorDefaults || ['origami-amarillo','vitral-de-flores','adn-de-flores','flor-infinita-de-espejo','reloj-de-petalos','flor-liquida','flor-de-luz-interactiva'].includes(a.id))) {
  const html=await buildStandaloneHtml(anim,{a:anim.id,f:'classic',c1:'#32cfff',c2:'#ffaaff'},readText);
  new vm.Script(html.match(/\n<script>\n([\s\S]*?)<\/script>/)[1]);
}
assert.equal(cleanCard({f:'arbitrary',c1:'bad',c2:'red'}).f,'');
assert.equal(cleanCard({c1:'bad'}).c1,'');
assert(textFamily('').includes('Dancing Script'), 'Los enlaces existentes mantienen su tipografía');
const original=[[1,2,3]];assert.equal(customPalette({card:{}},original),original);
assert.deepEqual(customPalette({card:{c1:'#32cfff',c2:'#ffaaff'}},[])[0],[50,207,255]);
console.log(`5 tipografías, ${VISIBLE_ANIMATIONS.filter(a=>a.colorDefaults).length} escenas con color, enlaces y HTML descargable verificados.`);
