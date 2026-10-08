import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {buildProject} from '../js/project-export.js';
import {EXPERT_ANIMATIONS} from '../js/expert-catalog.js';
import {getAnimation} from '../js/catalog.js';
import {cleanCard,encodeCard,decodeCard} from '../js/share.js';
import assert from 'node:assert/strict';
await mkdir('tools/review/catalog-projects',{recursive:true});
for(const entry of EXPERT_ANIMATIONS){
 const anim=getAnimation(entry.id),card=cleanCard({a:anim.id,p:'Para Luna',m:'Una noche de luz ✨',d:'Familia',tm:'custom',f:'classic',...Object.fromEntries(anim.colorControls.map(c=>[c.key,c.value]))});
 assert.deepEqual(decodeCard(encodeCard(card)),card);assert(!anim.expert&&!anim.noCode);assert(anim.category!=='expert-zone');
 const project=await buildProject(anim,card,async path=>new Uint8Array(await readFile(path)));
 for(const required of ['index.html','app.js','config.json','serve.cjs','README.md',`js/anim/${anim.file}.js`,'js/vendor/three/LICENSE','js/vendor/three/three.module.min.js','js/vendor/three/three.core.min.js'])assert(project.files.has(required),required);
 if(anim.id==='haunted-night')assert(project.files.has('assets/haunted-night/web/dead-tree-trunk.glb'));
 if(anim.id==='haunted-night')assert(JSON.parse(new TextDecoder().decode(project.files.get('assets/haunted-night/provenance.json'))).every(r=>!r.metadata),'Export factual provenance only');
 for(const file of project.files.keys())assert(!file.includes('mansion-candidate')&&!file.includes('/source/'),'Unnecessary resource '+file);
 await writeFile('tools/review/catalog-projects/'+project.fileName,Buffer.from(await project.blob.arrayBuffer()));
 console.log(anim.id,project.files.size+' files',project.blob.size+' bytes');
}
