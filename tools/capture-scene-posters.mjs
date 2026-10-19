import {mkdir,writeFile,copyFile,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {VISIBLE_ANIMATIONS} from '../js/catalog.js';
export async function capturePosters({navigate,evaluate,wait}) {
 await mkdir('img/previews',{recursive:true});
 await navigate('/tools/scene-poster-qa.html');await wait("document.body.dataset.ready==='true'");
 const results=[];
 const only=new Set(process.argv.find(arg=>arg.startsWith('--poster-only='))?.slice(14).split(',')||[]);
 for(const a of VISIBLE_ANIMATIONS.filter(a=>!only.size||only.has(a.id))){
  const file=`img/previews/${a.id}.webp`;
  // These author-made posters already belong to the full-quality scene.
  try {await access(`img/${a.id}.webp`);await copyFile(`img/${a.id}.webp`,file);results.push({id:a.id,source:'existing'});continue;} catch{}
  const result=await evaluate(`captureScene(${JSON.stringify(a.id)})`);
  assert(result.max-result.min>18&&result.lit>3,`Vista vacía: ${a.id}`);
  await writeFile(file,Buffer.from(result.data.split(',')[1],'base64'));
  results.push({id:a.id,min:result.min,max:result.max,lit:result.lit});
  console.log(`Imagen ${results.length}/${VISIBLE_ANIMATIONS.length}: ${a.id}`);
 }
 await writeFile('tools/review/scene-posters.json',JSON.stringify(results,null,2));
 console.log(`OK: ${results.length} imágenes reales de las escenas.`);
}
