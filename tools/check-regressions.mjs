import assert from 'node:assert/strict';
import { cleanCard, encodeCard, decodeCard } from '../js/share.js';
import { readConfig } from '../js/anim/dana2-core.js';
import { VISIBLE_ANIMATIONS } from '../js/catalog.js';

const memories=Array.from({length:7},(_,i)=>`${String(i).repeat(50)}~${'M'.repeat(109)}Z`).join('|');
const card=decodeCard(encodeCard(cleanCard({a:'jardin-de-lunas',mem:memories,f:'classic'})));
assert.equal(card.mem,memories,'El enlace debe conservar los siete recuerdos completos');
assert.equal(readConfig(card).memories.length,7);
assert(readConfig(card).memories.every(m=>m.endsWith('Z')),'No recortar el último carácter de los mensajes');
for(const anim of VISIBLE_ANIMATIONS){const mod=await anim.load();assert.equal(typeof mod.default,'function',`Módulo inválido: ${anim.id}`);}
console.log(`Siete recuerdos en su longitud máxima y ${VISIBLE_ANIMATIONS.length} escenas públicas importables verificadas.`);
