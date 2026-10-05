import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {TURTLE_ANIMATIONS} from '../js/turtle-catalog.js';
import {ANIMATIONS,getAnimation} from '../js/catalog.js';
import {LightTurtle} from '../js/anim/turtle.js';
import {cleanCard,encodeCard,decodeCard} from '../js/share.js';
import {buildStandaloneHtml} from '../js/standalone.js';
import {guideFor} from '../js/scene-guides.js';
assert.equal(TURTLE_ANIMATIONS.length,14);
assert.equal(TURTLE_ANIMATIONS.filter(a=>a.category==='halloween').length,4);
assert.equal(TURTLE_ANIMATIONS.filter(a=>a.category==='muertos').length,4);
assert.equal(new Set(ANIMATIONS.map(a=>a.id)).size,ANIMATIONS.length);
const readText=p=>readFile(new URL('../js/'+p,import.meta.url),'utf8');
for(const anim of TURTLE_ANIMATIONS){
 assert(getAnimation(anim.id) && guideFor(anim).scene && anim.colorDefaults);
 for(const tm of ['suggest','custom','none']){
  const card=cleanCard({a:anim.id,p:'Nombre largo para celebrar y recordar',m:'Una historia con símbolos: ñ, 💛, & < >',d:'Firma',tm,c1:'#22eecc',c2:'#cc88ff',age:'25'});
  assert.deepEqual(decodeCard(encodeCard(card)),card);
  const html=await buildStandaloneHtml(anim,card,readText),script=html.match(/\n<script>\n([\s\S]*?)<\/script>/)[1];new vm.Script(script);
  assert(script.includes('function cinematic('),'Falta el renderizado cinematográfico autónomo en el HTML');
  assert(script.includes('age: "25"'),'Falta la edad en el HTML');
  if(tm==='none'){assert(script.includes('const PARA = ""'));assert(script.includes('const MENSAJE = ""'));}
 }
}
const turtle=new LightTurtle();turtle.ink(1,2).forward(1).turn(90).forward(1).pen(true).forward(.4).pen().curve(1,2,0,2);
assert(Math.abs(turtle.points.find(p=>p.d>=1).x-1)<.02);
assert(turtle.points.some(p=>!p.draw));assert(turtle.points.every((p,i,a)=>i===0||p.d>=a[i-1].d));
assert(turtle.points.every((p,i,a)=>!i||p.d-a[i-1].d<.019),'Velocidad por distancia inconsistente');
for(const age of ['0','-1','2.5','1000','x'])assert.equal(cleanCard({age}).age,'');
console.log(`${TURTLE_ANIMATIONS.length} escenas únicas; ${TURTLE_ANIMATIONS.length*3} combinaciones de enlace/HTML; motor turtle y edad verificados.`);
