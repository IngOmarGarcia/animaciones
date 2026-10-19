import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';

const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const files=['js/brand-logo.js','js/logo-renderer.js','js/logo-world.js','js/support.js','js/recent-guides.js','css/styles.css','sitemap.xml','js/ads.js','js/ad-policy.js','js/home.js','js/gallery.js','js/category-guides.js','js/editorial-guides.js','img/previews/me-daba-miedo.webp'];
const hash=(value,file)=>createHash('sha256').update(file.endsWith('.webp')?value:value.toString('utf8').replace(/\r\n/g,'\n')).digest('hex');
const results=[];
for(const file of files){
 const expected=execFileSync('git',['show',`${commit}:${file}`],{maxBuffer:8*1024*1024});
 const response=await fetch(`https://viralcss.com/${file}?release=${commit.slice(0,12)}`,{signal:AbortSignal.timeout(25000),cache:'no-store'});
 const body=Buffer.from(await response.arrayBuffer());
 results.push({file,status:response.status,expected:hash(expected,file),actual:hash(body,file),matches:response.ok&&hash(expected,file)===hash(body,file)});
}
const pages=[];
for(const [url,checks]of [
 ['/',html=>html.includes('home-bottom-ad')&&!html.includes('Comparar por interacción')],
 ['/categorias/general',html=>html.includes('<h1>General y motivación:')],
 ['/animaciones/me-daba-miedo',html=>html.includes('<p>Si te mando esto, ya hice la parte que me daba miedo.</p>')&&html.includes('/img/previews/me-daba-miedo.webp')],
 ['/privacidad',html=>html.includes('http2.mlstatic.com')&&html.includes('plataforma de consentimiento certificada')],
 ...['/crear','/codigo','/v'].map(url=>[url,html=>!html.includes('data-ad-placement')&&!html.includes('src="js/ads.js"')]),
]){
 const response=await fetch(`https://viralcss.com${url}`,{signal:AbortSignal.timeout(25000),cache:'no-store'});
 const html=await response.text();pages.push({url,status:response.status,matches:response.ok&&checks(html)});
}
await mkdir('tools/review',{recursive:true});
await writeFile('tools/review/production-release.json',JSON.stringify({date:new Date().toISOString(),commit,results,pages},null,2));
console.log(JSON.stringify({commit,results:results.map(({file,status,matches})=>({file,status,matches})),pages},null,2));
assert(results.every(r=>r.matches)&&pages.every(p=>p.matches),'La versión pública todavía no coincide con el commit actual');
