import assert from 'node:assert/strict';
import { EMOTIONAL_SCENES, EMOTIONAL_ANIMATIONS } from '../js/emotional-catalog.js';
import { VISIBLE_ANIMATIONS, getAnimation } from '../js/catalog.js';
import { relatedAnimations, guideFor } from '../js/scene-guides.js';
import { cleanCard, encodeCard, decodeCard } from '../js/share.js';

assert.equal(EMOTIONAL_SCENES.length,11);
assert.equal(EMOTIONAL_ANIMATIONS.length,11);
assert.equal(new Set(EMOTIONAL_SCENES.map(s=>s.id)).size,11);
assert.equal(EMOTIONAL_SCENES.filter(s=>s.narrative).length,2);
for(const spec of EMOTIONAL_SCENES){
 const anim=getAnimation(spec.id);
 assert(anim.emotional&&anim.ownMessage&&anim.noCode);
 assert.equal(spec.blocks.join(' '),spec.phrase);
 assert.equal(anim.defaultMessage,spec.phrase);
 assert.equal(typeof (await anim.load()).default,'function');
 assert(guideFor(anim).scene);
 assert(relatedAnimations(anim,VISIBLE_ANIMATIONS).every(a=>a.emotional));
 const card={a:spec.id,p:'Luna',glow:'0.7',speed:'0.85',density:'0.8',c1:'#aabbcc',c2:'#ccaa88'};
 const restored=decodeCard(encodeCard(card));
 for(const key of Object.keys(card))assert.equal(restored[key],card[key]);
}
const hostile=cleanCard({a:EMOTIONAL_SCENES[0].id,glow:'999',speed:'0',density:'NaN',c1:'url(x)'});
assert.equal(hostile.glow,'1.4');assert.equal(hostile.speed,'0.75');assert.equal(hostile.density,'');assert.equal(hostile.c1,'');
console.log('OK: 11 frases exactas, dos narrativas, módulos, guías, afinidad emocional, ajustes compartidos y límites.');
