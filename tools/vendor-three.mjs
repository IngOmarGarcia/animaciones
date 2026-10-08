// Pinned, local runtime; no CDN is contacted by visitors.
import {mkdir,writeFile} from 'node:fs/promises';
const base='https://unpkg.com/three@0.180.0/';
await mkdir('js/vendor/three',{recursive:true});
for(const file of ['build/three.module.min.js','build/three.core.min.js','LICENSE']){
 const response=await fetch(base+file,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`${file}: HTTP ${response.status}`);
 const text=await response.text();
 await writeFile('js/vendor/three/'+file.split('/').at(-1),text);
 console.log(file,text.length);
}
