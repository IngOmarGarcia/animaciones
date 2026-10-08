// Selective downloads from the official public API. Never download viewer internals.
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='assets/haunted-night/source';
await mkdir(root,{recursive:true});
const records=[];
async function json(url){const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`${r.status} ${url}`);return r.json();}
async function download(file,target){
 const r=await fetch(file.url,{signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error(`${r.status} ${file.url}`);
 const data=Buffer.from(await r.arrayBuffer());if(data.length!==file.size||createHash('md5').update(data).digest('hex')!==file.md5)throw Error('Integrity mismatch: '+target);
 await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});await writeFile(target,data);
 return {path:target,url:file.url,bytes:data.length,md5:file.md5,sha256:createHash('sha256').update(data).digest('hex')};
}
for(const id of ['dead_tree_trunk','forest_ground_04']){
 const [info,files]=await Promise.all([json('https://api.polyhaven.com/info/'+id),json('https://api.polyhaven.com/files/'+id)]);
 const used=[];
 if(id==='dead_tree_trunk'){
  const f=files.gltf['1k'].gltf;used.push(await download(f,`${root}/${id}/${id}_1k.gltf`));
  for(const [name,file] of Object.entries(f.include))used.push(await download(file,`${root}/${id}/${name}`));
 }else for(const [key,suffix] of [['Diffuse','diff'],['nor_gl','nor_gl'],['Rough','rough']])used.push(await download(files[key]['1k'].jpg,`${root}/${id}/${suffix}.jpg`));
 records.push({id,name:info.name,authors:info.authors,original:`https://polyhaven.com/a/${id}`,license:'CC0-1.0',licenseURL:'https://creativecommons.org/publicdomain/zero/1.0/',providerLicense:'https://polyhaven.com/license',attribution:'Not required; retained voluntarily.',redistribution:'Raw and modified files may be redistributed commercially, including in paid source packages.',verifiedAt:new Date().toISOString(),metadata:info,files:used});
}
await writeFile('assets/haunted-night/provenance.json',JSON.stringify(records,null,2)+'\n');
const candidate=await json('https://api.sketchfab.com/v3/models/94e1f8e882014d95a0ab14f195372443');
await writeFile('assets/haunted-night/mansion-candidate.json',JSON.stringify({verifiedAt:new Date().toISOString(),status:'Not downloaded or integrated; official download API requires authentication.',source:candidate.viewerUrl,name:candidate.name,author:{name:candidate.user.displayName,url:candidate.user.profileUrl},license:candidate.license,faceCount:candidate.faceCount,vertexCount:candidate.vertexCount,materialCount:candidate.materialCount,textureCount:candidate.textureCount,pbrType:candidate.pbrType,isDownloadable:candidate.isDownloadable},null,2)+'\n');
// Loader matches the pinned runtime; preserve its MIT header and local imports.
for(const [file,target] of [['loaders/GLTFLoader.js','GLTFLoader.js'],['utils/BufferGeometryUtils.js','BufferGeometryUtils.js']]){
 const r=await fetch('https://unpkg.com/three@0.180.0/examples/jsm/'+file);if(!r.ok)throw Error('Loader download failed');
 const source=(await r.text()).replaceAll("from 'three'","from './three.module.min.js'").replaceAll("from '../utils/BufferGeometryUtils.js'","from './BufferGeometryUtils.js'");
 await writeFile('js/vendor/three/'+target,source);
}
console.log('Verified '+records.reduce((n,r)=>n+r.files.length,0)+' CC0 files; matching MIT glTF loader downloaded.');
