import {readFile,writeFile} from 'node:fs/promises';
if((await readFile('js/anim/eternal-bloom-renderer.js','utf8')).includes("sceneColors")){console.log('Migration already applied');process.exit(0);}
const settings={
 'soul-butterfly':"palette.tint('c1',membrane).bind('c2',rim.color).tint('c3',mat).tint('c3',trailMat).bind('c4',key.color);",
 'crystal-heartbeat':"palette.tint('c1',glass).tint('c1',solidGlass).bind('c2',rim.color).tint('c3',energyMat).tint('c4',coreMaterial).bind('c4',innerLight.color);",
 'eternal-souls':"palette.tint('c1',orange).tint('c2',gold).bind('c3',dust.uniforms.color.value).tint('c3',traceMat).tint('c3',wordMat).bind('c4',light.color);",
 'haunted-night':"palette.tint('c1',stone).tint('c2',trim).bind('c3',dust.uniforms.color.value).bind('c4',lunar.color);",
 'dark-spell':"palette.tint('c1',book.materials.leather).tint('c2',book.materials.gold).bind('c3',dust.uniforms.color.value).bind('c4',arcane.color);for(const c of circles)palette.tint('c4',c.m);palette.tint('c4',pulseMaterial);",
};
for(const [id,bindings] of Object.entries(settings)){
 const file=`js/anim/${id}-renderer.js`;let s=await readFile(file,'utf8');s="import {sceneColors} from './scene-colors.js';\n"+s;
 const marker=id==='soul-butterfly'||id==='crystal-heartbeat'?' return {\n  update(':'  return {update(';
 if(!s.includes(marker))throw Error('Missing insertion '+id);
 s=s.replace(marker,`${id==='soul-butterfly'||id==='crystal-heartbeat'?' ':'  '}const palette=sceneColors('${id}',scene);${bindings}\n${marker}`);
 s=s.replace(/(update\(t,dt,[^)]*\)\{)/,'$1\n   palette.update(card);');
 // Include palette diagnostics without changing existing statistics.
 s=s.replace(/stats:\(\)=>\(\{/,'stats:()=>({...palette.stats(),');
 if(id==='haunted-night')s=s.replace("return {artwork:'haunted-night'","return {...palette.stats(),artwork:'haunted-night'");
 if(id==='dark-spell')s=s.replace("return {artwork:'dark-spell'","return {...palette.stats(),artwork:'dark-spell'");
 await writeFile(file,s);
}
let file='js/anim/dark-spell-book.js',s=await readFile(file,'utf8');await writeFile(file,s.replace('},leaves};','},leaves,materials:{leather,gold}};'));
file='js/anim/eternal-bloom-renderer.js';s=await readFile(file,'utf8');s="import {sceneColors} from './scene-colors.js';\n"+s;
s=s.replace(' let px=0,py=0;'," const palette=sceneColors('eternal-bloom',scene);palette.tint('c1',glass).tint('c2',stemMat).tint('c3',dust.material).bind('c4',key.color).bind('c4',sweep.color);\n let px=0,py=0;");
s=s.replace('motion=true){','motion=true,card={}){\n   palette.update(card);').replace("return {renderer:'three-webgl2'","return {...palette.stats(),renderer:'three-webgl2'");await writeFile(file,s);
file='js/anim/eternal-bloom.js';s=await readFile(file,'utf8');s=s.replace('stage.forceMotion!==false);','stage.forceMotion!==false,stage.card||{});').replace("ctx.fillStyle='#f1e4cd'","ctx.fillStyle=cardText(stage.card,'#f1e4cd')").replace("ctx.fillStyle='#baaa90'","ctx.fillStyle=cardText(card,'#baaa90')");s="const cardText=(card,fallback)=>/^#[0-9a-f]{6}$/i.test(card?.c5||'')?card.c5:fallback;\n"+s;await writeFile(file,s);
for(file of ['js/anim/expert-adapter.js','js/anim/autumn-adapter.js']){s=await readFile(file,'utf8');s=s.replaceAll('amount,color);',"amount,/^#[0-9a-f]{6}$/i.test(card.c5||'')?card.c5:color);");await writeFile(file,s);}
console.log('Live material, light, particle and text controls wired');
