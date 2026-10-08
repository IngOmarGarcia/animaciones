import {cleanCard,encodeCard} from './share.js';
const encoder=new TextEncoder();
const safe=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const assetFiles=['dead-tree-trunk.glb','forest-diff-512.jpg','forest-diff-1024.jpg','forest-nor_gl-1024.jpg','forest-rough-1024.jpg'];
const importRE=/\b(?:from\s*|import\s*)['"](\.{1,2}\/[^'"]+\.js)['"]/g;
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
export function zipFiles(files){
 const chunks=[],directory=[];let offset=0,centralSize=0;
 for(const [name,bytes]of files){
  if(!/^[\w./-]+$/.test(name)||name.includes('..'))throw Error('Unsafe export path');
  const n=encoder.encode(name),sum=crc(bytes),head=new Uint8Array(30+n.length),v=new DataView(head.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,0x21,true);v.setUint32(14,sum,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,n.length,true);head.set(n,30);
  const central=new Uint8Array(46+n.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,0x21,true);c.setUint32(16,sum,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,n.length,true);c.setUint32(42,offset,true);central.set(n,46);
  chunks.push(head,bytes);directory.push(central);offset+=head.length+bytes.length;centralSize+=central.length;
 }
 const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.size,true);v.setUint16(10,files.size,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
 return new Blob([...chunks,...directory,end],{type:'application/zip'});
}
export async function buildProject(anim,rawCard={},read=async path=>{
 const r=await fetch(new URL('../'+path,import.meta.url));if(!r.ok)throw Error(`${path}: HTTP ${r.status}`);return new Uint8Array(await r.arrayBuffer());
}){
 if(anim.exportMode!=='project')throw Error('Esta escena no utiliza exportación de proyecto.');
 const files=new Map(),pending=new Map();
 const add=path=>{if(pending.has(path))return pending.get(path);const promise=(async()=>{
  const data=await read(path);files.set(path,data);
  if(path.endsWith('.js')){
   const source=new TextDecoder().decode(data),dependencies=[...source.matchAll(importRE)].map(m=>new URL(m[1],'https://export.local/'+path).pathname.slice(1));
   await Promise.all(dependencies.map(add));
  }
 })();pending.set(path,promise);return promise;};
 await Promise.all([add(`js/anim/${anim.file}.js`),add('js/anim/engine.js'),add(`img/${anim.id}.webp`),add('js/vendor/three/LICENSE')]);
 if(anim.id==='haunted-night')await Promise.all([...assetFiles.map(f=>add('assets/haunted-night/web/'+f)),...['README.md','provenance.json','optimization.json'].map(f=>add('assets/haunted-night/'+f))]);
 const text=(path,value)=>files.set(path,encoder.encode(value));
 if(anim.id==='haunted-night'){
  // Export factual provenance only; website/API promotional copy is not a CC0 asset.
  const name='assets/haunted-night/provenance.json',records=JSON.parse(new TextDecoder().decode(files.get(name)));
  text(name,JSON.stringify(records.map(({metadata,...record})=>record),null,2)+'\n');
 }
 const card=cleanCard({a:anim.id,p:'',m:anim.defaultMessage,d:'',f:'classic',...rawCard});
 text('config.json',JSON.stringify(card,null,2)+'\n');
 text('index.html',`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(anim.title)}</title><style>html,body{margin:0;background:#010106;color:#eee;font:16px system-ui}main{position:relative;width:min(100vw,800px);height:100svh;margin:auto}canvas{display:block;width:100%;height:100%}nav{position:fixed;bottom:10px;left:50%;transform:translateX(-50%);z-index:5;display:flex;gap:8px}button{background:#161726;color:#fff;border:1px solid #777;border-radius:8px;padding:10px}#status{position:fixed;top:10px;left:10px;max-width:60%;font-size:12px}</style><main><canvas aria-label="${safe(anim.title)}"></canvas></main><nav><button id="pause">Pausar</button><button id="replay">Reiniciar</button></nav><p id="status" role="status">Cargando…</p><script type="module" src="app.js"></script></html>`);
 text('app.js',`import create from './js/anim/${anim.file}.js';
import {createPlayer} from './js/anim/engine.js';
const card=await fetch('./config.json').then(r=>{if(!r.ok)throw Error('config.json');return r.json()});
const canvas=document.querySelector('canvas'),status=document.querySelector('#status'),pause=document.querySelector('#pause');
const player=createPlayer(canvas,create,{card});window.animationPlayer=player;let paused=false;
pause.textContent=player.motionReduced?'Reproducir con movimiento':'Pausar';
pause.onclick=()=>{if(player.motionReduced){player.enableMotion();paused=false;}else paused=!paused;paused?player.pause():player.play();pause.textContent=paused?'Continuar':'Pausar';};
document.querySelector('#replay').onclick=()=>{player.restart();paused=false;player.play();pause.textContent=player.motionReduced?'Reproducir con movimiento':'Pausar';};
document.addEventListener('visibilitychange',()=>{document.hidden?player.pause():!paused&&player.play()});
window.addEventListener('pagehide',()=>player.destroy(),{once:true});player.play();status.textContent='';
window.addEventListener('error',()=>status.textContent='No se pudo cargar la escena. Consulta README.md y utiliza el servidor local.');
`);
 text('serve.cjs',`const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');const root=__dirname,mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary'};http.createServer(async(req,res)=>{try{const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(p!==root&&!p.startsWith(root+path.sep))throw Error();const file=p===root?path.join(root,'index.html'):p;res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end('Not found');}}).listen(Number(process.argv[2])||8080,'127.0.0.1',()=>console.log('Abre http://127.0.0.1:'+(Number(process.argv[2])||8080)));
`);
 const instructions=`# ${anim.title}\n\nProyecto completo de ViralCSS, con el renderizador original y su configuración personalizada.\n\n1. Extrae TODO el ZIP conservando las carpetas.\n2. Instala Node.js si no está disponible. No hay dependencias npm que instalar.\n3. En esta carpeta ejecuta: node serve.cjs\n4. Abre http://127.0.0.1:8080 . Para otro puerto: node serve.cjs 8081\n\nAlternativa con Python: python -m http.server 8080 --bind 127.0.0.1\n\nNo abras index.html mediante file://: los módulos ES y recursos requieren HTTP. Después de extraer, la experiencia funciona sin conexión externa al usar el servidor local. Three.js, shaders, modelos y texturas necesarios están incluidos.\n\nEdita config.json para cambiar el texto, tipografía y colores c1…c6 disponibles en js/scene-palettes.js. Los valores vacíos conservan la dirección artística original. Reinicia o recarga para aplicar ediciones del archivo. En la web de ViralCSS los controles de color se actualizan en tiempo real.\n\nConserva los botones de interacción de la escena, reinicio, pausa, movimiento reducido y calidad adaptativa. Requiere navegador moderno y WebGL2/HDR para 3D; hay una imagen local de respaldo cuando no está disponible.\n\nLICENCIAS\nCódigo original OGR/ViralCSS: uso personal, educativo y experimental; uso comercial y redistribución requieren autorización. Términos: https://viralcss.com/terminos . Estas condiciones NO se aplican a los componentes de terceros con sus propias licencias.\nThree.js y sus cargadores: MIT, texto incluido en js/vendor/three/LICENSE.\n${anim.id==='haunted-night'?'Dead Tree Trunk (Rob Tuytel) y Forest Ground 04 (Rob Tuytel, Rico Cilliers), Poly Haven: CC0-1.0, redistribución comercial de originales y derivados permitida, atribución no obligatoria. Créditos, URLs, hashes y modificaciones en assets/haunted-night/provenance.json y optimization.json. Licencia: https://creativecommons.org/publicdomain/zero/1.0/ . No se incluye la mansión candidata de Sketchfab.':'Geometrías, materiales y shaders de la escena incluidos; no hay modelos externos que descargar.'}\n`;
 text('README.md',instructions);
 text('manifest.json',JSON.stringify({animation:anim.id,format:'ViralCSS complete project',files:[...files.keys(),'manifest.json'].sort()},null,2));
 return {files,instructions,blob:zipFiles(files),fileName:anim.id+'.zip'};
}

export async function projectCodePage(anim,card){
 const $=id=>document.getElementById(id);document.title=`Proyecto de ${anim.title} | ViralCss`;
 $('title').textContent=`Proyecto completo de «${anim.title}»`;$('back').href=$('cta').href=`crear.html?a=${anim.id}`;
 $('exportDescription').textContent='Esta escena utiliza varios archivos. Descarga el ZIP completo: incluye el renderizador original, Three.js, los recursos necesarios y tu texto y colores. Se ejecuta con un servidor local.';
 $('copy').textContent='Copiar instrucciones';$('download').textContent='Descargar proyecto .zip';$('try').textContent='Ver vista previa';$('fileName').textContent=anim.id+'.zip';
 $('openInstructions').innerHTML='<summary>Cómo ejecutar el proyecto</summary><p>Extrae el ZIP completo, ejecuta <code>node serve.cjs</code> en esa carpeta y abre <code>http://127.0.0.1:8080</code>. No requiere instalar paquetes npm. También puedes usar Python. Lee README.md para editar texto y colores.</p>';
 try{
  const project=await buildProject(anim,card);$('code').textContent=project.instructions+'\nARCHIVOS INCLUIDOS\n'+[...project.files.keys()].sort().join('\n');for(const id of ['copy','download','try'])$(id).disabled=false;
  $('copy').onclick=async()=>{try{await navigator.clipboard.writeText(project.instructions);$('copy').textContent='Instrucciones copiadas';}catch{$('code').focus();$('copy').textContent='Selecciona las instrucciones para copiar';}};
  $('download').onclick=()=>{const url=URL.createObjectURL(project.blob),a=document.createElement('a');a.href=url;a.download=project.fileName;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
  $('try').onclick=()=>window.open(new URL('v.html?autoplay=1&s='+encodeCard({...card,a:anim.id}),location.href),'_blank','noopener');
 }catch(error){$('code').textContent='No se pudo preparar el proyecto completo. Recarga para reintentar. '+error.message;}
}
