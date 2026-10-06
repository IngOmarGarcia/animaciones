import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { VISIBLE_ANIMATIONS } from '../js/catalog.js';
const base='https://viralcss.com';
const sitemap=await readFile('sitemap.xml','utf8');
const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
const extra=['/crear.html','/v.html','/codigo.html','/encargos.html','/404.html','/robots.txt','/ads.txt','/no-existe-auditoria','/animaciones/espejo-tardio.html','/tools/animation-qa.html','/img/og.jpg','/js/home.js','/js/gallery.js','/js/catalog.js','/js/turtle-catalog.js','/js/anim/cinema.js','/css/styles.css'];
const after=process.argv.includes('--after'),final=process.argv.includes('--final'),suffix=final?'-final':after?'-after':'';
const queue=[...new Set([...urls,...extra.map(p=>base+p)])], results=[],publicBodies=new Map();
function textContent(html){return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}
await Promise.all(Array.from({length:6},async()=>{while(queue.length){const url=queue.shift();try{const started=Date.now(),r=await fetch(url,{signal:AbortSignal.timeout(25000)}),raw=Buffer.from(await r.arrayBuffer()),body=raw.toString('utf8'),u=new URL(url),local=u.pathname==='/'?'index.html':u.pathname.slice(1)+(u.pathname.split('/').at(-1).includes('.')?'':'.html');let same=null;try{same=(await readFile(local,'utf8')).replace(/\r\n/g,'\n')===body.replace(/\r\n/g,'\n');}catch{}
publicBodies.set(url,body);
if(['acerca.html','privacidad.html','sugerencias.html'].includes(local)){const dir='tools/review/adsense-public'+suffix;await mkdir(dir,{recursive:true});await writeFile(dir+'/'+local,body);}
results.push({url,status:r.status,final:r.url,ms:Date.now()-started,bytes:raw.length,same,robots:r.headers.get('x-robots-tag'),canonical:body.match(/rel="canonical" href="([^"]+)"/)?.[1],metaRobots:body.match(/name="robots" content="([^"]+)"/)?.[1],title:body.match(/<title>(.*?)<\/title>/)?.[1],words:textContent(body).split(/\s+/).length,ads:/adsbygoogle|pagead2\.googlesyndication/.test(body)});
}catch(e){results.push({url,error:e.message,cause:e.cause?.code});}}}));
const assets=new Set();
for(const url of urls){const html=publicBodies.get(url)||'';for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g)){if(/^(?:mailto:|#|data:|https?:)/.test(m[1]))continue;const u=new URL(m[1],url);if(/\.(?:png|jpg|webp|svg|css|js|woff2|webmanifest)$/.test(u.pathname))assets.add(u.href);}}
const aq=[...assets],assetResults=[];await Promise.all(Array.from({length:6},async()=>{while(aq.length){const url=aq.shift();try{const r=await fetch(url,{signal:AbortSignal.timeout(25000)});const b=await r.arrayBuffer();assetResults.push({url,status:r.status,bytes:b.byteLength,type:r.headers.get('content-type')});}catch(e){assetResults.push({url,error:e.message});}}}));
const sceneContent=[];
for(const a of VISIBLE_ANIMATIONS){const h=await readFile(`animaciones/${a.id}.html`,'utf8'),match=h.match(/<section[^>]*class="[^"]*prose[^\"]*"[^>]*>([\s\S]*?)<\/section>/);sceneContent.push({id:a.id,words:textContent(h).split(/\s+/).length,description:a.description});}
const summary={pages:results.length,errors:results.filter(x=>x.error||x.status!==200),canonicalRedirects:results.filter(x=>x.canonical&&x.canonical!==x.final).length,different:results.filter(x=>x.same===false).map(x=>x.url),assets:assetResults.length,assetErrors:assetResults.filter(x=>x.error||x.status!==200),largest:assetResults.sort((a,b)=>b.bytes-a.bytes).slice(0,8)};
await mkdir('tools/review',{recursive:true});await writeFile(`tools/review/adsense-public${suffix}.json`,JSON.stringify({date:new Date().toISOString(),summary,results,assetResults,sceneContent},null,2));console.log(JSON.stringify(summary,null,2));
