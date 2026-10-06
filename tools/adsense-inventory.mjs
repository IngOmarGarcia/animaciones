import { readFile,readdir,stat,writeFile } from 'node:fs/promises';
import { VISIBLE_ANIMATIONS } from '../js/catalog.js';
import { guideFor } from '../js/scene-guides.js';
import { TURTLE_ANIMATIONS } from '../js/turtle-catalog.js';
const text=h=>h.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
if(process.argv.includes('--write')){
 const recent=new Set(TURTLE_ANIMATIONS.map(a=>a.id));
 const rows=VISIBLE_ANIMATIONS.map(a=>{const g=guideFor(a),words=[g.scene,g.interaction,g.use].join(' ').split(/\s+/).length;return `| ${a.title} | \`${a.id}\` | ${a.category} | ${g.mode} | ${words} | ${recent.has(a.id)?'Revisar contexto individual (I1)':'Guía individual existente'} |`;});
 await writeFile('tools/ADSENSE-SCENE-INVENTORY.md',`# Inventario de fichas auditadas — ViralCSS\n\n4 de octubre de 2026. ${VISIBLE_ANIMATIONS.length} fichas públicas. Todas: HTTP 200 tras las redirecciones, comprobación SEO local aprobada e importación/renderizado público aprobados. Estos estados no certifican inspección artística manual de cada frame, accesibilidad completa ni rendimiento en un teléfono físico.\n\nLas palabras cuentan solo escena, interacción y uso en la guía fuente, sin navegación ni boilerplate. Son una medida descriptiva: no una cuota requerida por Google ni una prueba de contenido insuficiente.\n\n| Animación | Identificador | Categoría | Gesto documentado | Palabras de guía | Revisión editorial |\n| --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n`);
 console.log('Inventario de 87 fichas guardado.');process.exit(0);
}
for(const p of ['acerca.html','privacidad.html','sugerencias.html']){const local=await readFile(p,'utf8'),remote=await readFile('tools/review/adsense-public/'+p,'utf8');console.log('Public comparison',p,{sameText:text(local)===text(remote),localWords:text(local).split(' ').length,publicWords:text(remote).split(' ').length});}
console.log('New guides',TURTLE_ANIMATIONS.map(a=>({id:a.id,...guideFor(a)})));
const publicData=JSON.parse(await readFile('tools/review/adsense-public.json','utf8'));console.log('Headers',publicData.results.filter(x=>/\/tools|\/crear|\/v\.|\/encargos|\/codigo/.test(x.url)));
const browser=JSON.parse(await readFile('tools/review/adsense-browser.json','utf8'));console.log('Accessibility',browser.filter(x=>x.unnamedControls.length||x.missingAlt.length).map(x=>({url:x.url,width:x.width,controls:x.unnamedControls,images:x.missingAlt})));console.log('Resources',browser[0].resources.sort((a,b)=>b.decoded-a.decoded).slice(0,12));
console.log('Scene word range',publicData.sceneContent.map(x=>[x.id,x.words]).sort((a,b)=>a[1]-b[1]).slice(0,16));
for(const a of TURTLE_ANIMATIONS){const h=await readFile(`js/anim/${a.id}.js`,'utf8');console.log(a.id,h.trim());}
const files=[];async function walk(dir){for(const d of await readdir(dir,{withFileTypes:true})){if(['.git','review','node_modules'].includes(d.name))continue;const p=dir+'/'+d.name;if(d.isDirectory())await walk(p);else files.push({p,size:(await stat(p)).size});}}await walk('.');console.log('Largest tracked app source',files.filter(f=>!f.p.startsWith('./tools/')&&!f.p.endsWith('.fbx')).sort((a,b)=>b.size-a.size).slice(0,12));
for(const f of files.filter(f=>f.p.endsWith('.html'))){const h=await readFile(f.p,'utf8');if(!/noindex/.test(h)&&f.p.startsWith('./tools/'))console.log('Tool missing meta noindex',f.p);}
