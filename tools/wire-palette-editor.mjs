import {readFile,writeFile} from 'node:fs/promises';
if((await readFile('js/crear.js','utf8')).includes("const colorKeys=")){console.log('Migration already applied');process.exit(0);}
const file='js/crear.js';let s=await readFile(file,'utf8');
s=s.replace("const fields = form.elements;",`const fields = form.elements;
const colorKeys=anim.colorControls?.map(c=>c.key)||['c1','c2'];
if(anim.colorControls){
 const inputs=$('colorInputs');inputs.replaceChildren(...anim.colorControls.map(control=>{
  const label=document.createElement('label');label.textContent=control.label;
  const input=document.createElement('input');input.type='color';input.name=control.key;input.value=control.value;label.append(input);return label;
 }));
 const reset=document.createElement('button');reset.type='button';reset.className='btn btn-ghost';reset.id='resetColors';reset.textContent='Restablecer colores originales';
 reset.addEventListener('click',()=>{for(const c of anim.colorControls)fields[c.key].value=c.value;$('colorsEnabled').checked=false;update();});$('animationColors').append(reset);
}`);
s=s.replace("'c1', 'c2', 'tm'","'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'tm'");
s=s.replace("if (anim.colorDefaults) [fields.c1.value, fields.c2.value] = [sharedCard.c1 || anim.colorDefaults[0], sharedCard.c2 || anim.colorDefaults[1]];",`if(anim.colorControls)for(const c of anim.colorControls)fields[c.key].value=sharedCard[c.key]||c.value;
  else if (anim.colorDefaults) [fields.c1.value, fields.c2.value] = [sharedCard.c1 || anim.colorDefaults[0], sharedCard.c2 || anim.colorDefaults[1]];`);
s=s.replace("  c1: anim.colorDefaults && $('colorsEnabled').checked ? fields.c1.value : '',\n  c2: anim.colorDefaults && $('colorsEnabled').checked ? fields.c2.value : '',",`  ...Object.fromEntries(colorKeys.map(key=>[key,anim.colorDefaults&&$('colorsEnabled').checked?fields[key].value:''])),`);
s=s.replace("age: fields.age?.value, c1: fields.c1?.value, c2: fields.c2?.value,", "age: fields.age?.value, ...Object.fromEntries(colorKeys.map(key=>[key,fields[key].value])),");
s=s.replace("for (const control of [$('colorsEnabled'), fields.c1, fields.c2]) control.addEventListener('change', () => { update(); player?.restart(); });", "for(const control of [$('colorsEnabled'),...colorKeys.map(key=>fields[key])])control.addEventListener('change',()=>{update();if(!anim.cinematic)player?.restart();});");
await writeFile(file,s);
// Preserve temperature hierarchy while exposing the disk and star palettes.
const renderer='js/anim/event-horizon-renderer.js';s=await readFile(renderer,'utf8');s="import {sceneColors} from './scene-colors.js';\n"+s;
s=s.replace("  const uniforms={","  const uniforms={uDiskTint:{value:new T.Color(1,1,1)},uHotTint:{value:new T.Color(1,1,1)},uStarTint:{value:new T.Color(1,1,1)},");
s=s.replace('  return {',"  const palette=sceneColors('event-horizon',scene);palette.bind('c1',uniforms.uDiskTint.value).bind('c2',uniforms.uHotTint.value).bind('c3',uniforms.uStarTint.value);\n  return {");
s=s.replace('update(t,dt,pointer,motion){','update(t,dt,pointer,motion,card){\n    palette.update(card);').replace('stats:()=>({','stats:()=>({...palette.stats(),');
await writeFile(renderer,s);
const shader='js/anim/event-horizon-shader.js';s=await readFile(shader,'utf8');s=s.replace(' uniform vec3 uOrigin,uRight,uUp,uBack;',' uniform vec3 uOrigin,uRight,uUp,uBack,uDiskTint,uHotTint,uStarTint;').replace('return stars+vec3','return stars*uStarTint+vec3').replace('return mix(c,c*vec3(.56,.77,1.25),smoothstep(.38,.85,doppler)*hot*.7);','return mix(c,c*vec3(.56,.77,1.25),smoothstep(.38,.85,doppler)*hot*.7)*mix(uDiskTint,uHotTint,hot);');await writeFile(shader,s);
console.log('Editor and shared colors connected');
