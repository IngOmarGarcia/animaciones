// Pruebas en Chrome real mediante CDP, sin dependencias ni publicación.
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { TURTLE_ANIMATIONS } from '../js/turtle-catalog.js';
import { VISIBLE_ANIMATIONS } from '../js/catalog.js';
import { EXPERT_ANIMATIONS } from '../js/expert-catalog.js';
import { EMOTIONAL_SCENES, EMOTIONAL_ANIMATIONS } from '../js/emotional-catalog.js';
if(process.argv.includes('--cinematic-all')) {
 for(let scene=0;scene<TURTLE_ANIMATIONS.length;scene++) {
  const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,['tools/browser-check.mjs','--cinematic','--scene',String(scene)],{windowsHide:true,stdio:'inherit'});p.on('error',reject);p.on('exit',resolve);});
  if(code!==0)throw Error(`Revisión cinematográfica falló: escena ${scene}`);
 }
 process.exit(0);
}
if(process.argv.includes('--cinematic')) { await import('./cinematic-check.mjs'); process.exit(0); }
if(process.argv.includes('--turtle')) { await import('./turtle-browser-check.mjs'); process.exit(0); }
const profile=await mkdtemp(path.join(tmpdir(),'viralcss-review-'));
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check','--disable-gpu-sandbox','--remote-debugging-port=0',`--user-data-dir=${profile}`],{windowsHide:true,stdio:'ignore'});
let ws;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
try {
 let version;
 for(let i=0;i<100;i++){try{const port=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];version=await (await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(2000)})).json();break;}catch{await delay(100);}}
 if(!version)throw Error('Chrome no inició');
 ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise((res,rej)=>{ws.addEventListener('open',res,{once:true});ws.addEventListener('error',rej,{once:true});});
 let serial=0;const pending=new Map(), errors=[];
 ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++serial;const timeout=setTimeout(()=>{pending.delete(id);reject(Error('Chrome no respondió: '+method));},30000);pending.set(id,{resolve:r=>{clearTimeout(timeout);resolve(r);},reject:e=>{clearTimeout(timeout);reject(e);}});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
 const target=await send('Target.createTarget',{url:'about:blank'});
 const {sessionId}=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
 const call=(m,p)=>send(m,p,sessionId);
 await call('Runtime.enable');await call('Page.enable');
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const wait=async expression=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await delay(100);}throw Error('Espera agotada: '+expression+'\n'+errors.join('\n'));};
 const navigate=async url=>{console.log('Revisando '+url.split('?')[0]);await call('Page.navigate',{url:'http://localhost:8080'+url});await wait("document.readyState==='complete'");};
 await mkdir('tools/review',{recursive:true});
 const screenshot=async name=>{const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(`tools/review/${name}.png`,Buffer.from(r.data,'base64'));};
 const overflow=async label=>assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),`Desbordamiento horizontal: ${label}`);
 if(process.argv.includes('--ad-policy')){
  await (await import('./ad-policy-browser-check.mjs')).reviewAdPolicy({call,ws,evaluate,navigate,wait,delay,screenshot,overflow,errors});
  await send('Browser.close');process.exit(0);
 }
 if(process.argv.includes('--content-review')){
  await (await import('./content-browser-check.mjs')).reviewContent({call,evaluate,navigate,wait,overflow,screenshot,errors});
  await send('Browser.close');ws.close();browser.kill();await delay(500);
  if(!path.resolve(profile).startsWith(path.resolve(tmpdir())+path.sep))throw Error('Perfil fuera del directorio temporal');
  await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:300});process.exit(0);
 }
 if(process.argv.includes('--capture-posters')){
  try {
   await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
   await (await import('./capture-scene-posters.mjs')).capturePosters({navigate,evaluate,wait});
  } finally {
   await send('Browser.close');ws.close();browser.kill();await delay(500);
   if(!path.resolve(profile).startsWith(path.resolve(tmpdir())+path.sep))throw Error('Perfil fuera del directorio temporal');
   await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:300});
  }
  process.exit(0);
 }
 if(process.argv.includes('--gallery-controls')){
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  for(const [width,height] of [[390,844],[1365,900]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
   await navigate('/');await wait("!!document.querySelector('#chips [data-category]')");
   await evaluate("import('/js/gallery.js').then(m=>{window.galleryModule=m;return true})");
   await evaluate("document.querySelector('#grid .card').scrollIntoView({block:'start',behavior:'instant'})");
   await wait('galleryModule.galleryDiagnostics().filter(d=>d.visible&&d.playing).length>=2');
   for(let i=0;i<2;i++){
    await evaluate("document.getElementById('homeMotion').click()");await wait('galleryModule.galleryDiagnostics().every(d=>!d.playing)');
    const paused=await evaluate('galleryModule.galleryDiagnostics().map(d=>[d.id,d.time])');await delay(250);
    assert.deepEqual(await evaluate('galleryModule.galleryDiagnostics().map(d=>[d.id,d.time])'),paused);
    await evaluate("document.getElementById('homeMotion').click()");await wait('galleryModule.galleryDiagnostics().filter(d=>d.visible).every(d=>d.playing)');
   }
   await screenshot(`gallery-controls-playing-${width}`);
   await evaluate("document.getElementById('gallery-more').scrollIntoView({block:'center',behavior:'instant'});document.getElementById('gallery-more').click()");
   await wait("document.querySelectorAll('#grid .card').length===80 && document.getElementById('grid').getAttribute('aria-busy')==='false'");
   await evaluate("document.querySelectorAll('#grid .card')[40].scrollIntoView({block:'start',behavior:'instant'})");
   await wait('galleryModule.galleryDiagnostics().filter(d=>d.visible&&d.playing).length>=2');
   assert(await evaluate('galleryModule.galleryDiagnostics().filter(d=>!d.visible).every(d=>!d.playing)'));
  }
  assert.equal(errors.length,0,errors.join('\n'));console.log('OK: reproducción automática real en portada, dos ciclos de pausa/reproducción, tarjetas añadidas y pausa fuera de pantalla.');
  await send('Browser.close');process.exit(0);
 }
 if(process.argv.includes('--gallery-autoplay')){
  const report=[],unchanged=[];
  await call('Emulation.setDeviceMetricsOverride',{width:1365,height:900,deviceScaleFactor:1,mobile:false});
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await navigate('/tools/gallery-motion-qa.html');await wait("document.body.dataset.ready==='true'");
  async function checkBatch(ids){
   console.log('Miniaturas: '+ids.join(', '));
   await evaluate(`window.previewQA.show(${JSON.stringify(ids)})`);
   await wait(`window.previewQA.diagnostics().filter(d=>d.playing&&${JSON.stringify(ids)}.includes(d.id)).length===${ids.length}`);
   await delay(250);
   const before=await evaluate("({players:previewQA.diagnostics(),pixels:previewQA.pixels()})");
   await delay(950);
   let after=await evaluate("({players:previewQA.diagnostics(),pixels:previewQA.pixels()})");
   if(before.pixels.some(p=>after.pixels.find(q=>q.id===p.id).hash===p.hash)){await delay(2000);after=await evaluate("({players:previewQA.diagnostics(),pixels:previewQA.pixels()})");}
   for(const id of ids){
    const b=before.players.find(d=>d.id===id),a=after.players.find(d=>d.id===id);
    assert(a.playing&&a.time!==b.time,id+' no avanza');assert.notEqual(a.renderer,'static-fallback',id);
    const changed=before.pixels.find(p=>p.id===id).hash!==after.pixels.find(p=>p.id===id).hash;
    if(!changed)unchanged.push(id);report.push({...a,changed});
   }
  }
  for(let start=0;start<VISIBLE_ANIMATIONS.length;start+=4)await checkBatch(VISIBLE_ANIMATIONS.slice(start,start+4).map(a=>a.id));
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const mobileIds=[...EMOTIONAL_SCENES.map(s=>s.id),...EXPERT_ANIMATIONS.map(s=>s.id)];
  for(let start=0;start<mobileIds.length;start+=2)await checkBatch(mobileIds.slice(start,start+2));
  await evaluate('previewQA.pause(true)');const paused=await evaluate('previewQA.diagnostics()');await delay(300);
  assert.deepEqual(await evaluate('previewQA.diagnostics().map(d=>d.time)'),paused.map(d=>d.time));
  await evaluate('previewQA.pause(false)');await wait('previewQA.diagnostics().every(d=>d.playing)');
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await navigate('/tools/gallery-motion-qa.html');await wait("document.body.dataset.ready==='true'");
  assert(await evaluate('previewQA.paused()'));
  await evaluate("previewQA.show(['me-daba-miedo','sostenian-mis-mensajes'])");await wait('previewQA.diagnostics().length===2');
  assert(await evaluate('previewQA.diagnostics().every(d=>!d.playing&&d.reduced)'));
  await evaluate('previewQA.pause(false)');await wait('previewQA.diagnostics().every(d=>d.playing&&!d.reduced)');
  await wait("previewQA.diagnostics().some(d=>d.id==='me-daba-miedo'&&d.phase!=='text')");await screenshot('gallery-emotional-playing');
  await writeFile('tools/review/gallery-autoplay.json',JSON.stringify({report,unchanged,errors},null,2));
  assert.deepEqual(unchanged,[],'Miniaturas sin cambio visual');assert.equal(errors.length,0,errors.join('\n'));
  console.log(`OK: ${VISIBLE_ANIMATIONS.length} escenas animadas, frases y 3D en móvil, pausa/reproducción y explosión en miniatura.`);
  await send('Browser.close');process.exit(0);
 }
 if(process.argv.includes('--header-effects')){
  for(const [width,height] of [[390,844],[1365,900]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
   await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
   await navigate('/');await wait("document.querySelector('.site-header').headerParticles?.running && !!document.querySelector('#chips [data-category]')");
   assert.equal(await evaluate("document.querySelectorAll('.site-header .header-particles').length"),1);
   assert.equal(await evaluate("getComputedStyle(document.querySelector('.site-header')).backgroundColor"),'rgb(2, 2, 5)');
   const frames=await evaluate("document.querySelector('.site-header').headerParticles.frames");await delay(200);
   assert(await evaluate(`document.querySelector('.site-header').headerParticles.frames>${frames}`));
   if(width<500){
    await evaluate("document.querySelector('.header-menu-toggle').click()");assert(await evaluate("!document.querySelector('.mobile-nav').hidden"));
    await screenshot('header-particles-mobile-menu');await evaluate("document.querySelector('.header-menu-toggle').click()");
   }else{
    await evaluate("window.scrollTo({top:document.getElementById('galeria').offsetTop+800,behavior:'instant'})");await wait("document.getElementById('category-rail').classList.contains('is-visible')");
    await delay(100);await screenshot('category-rail-transition-enter');await delay(300);
    assert.equal(await evaluate("getComputedStyle(document.getElementById('category-rail')).opacity"),'1');
    assert(await evaluate("!document.getElementById('category-rail').inert"));
    assert.equal(await evaluate("getComputedStyle(document.getElementById('back-to-gallery')).backgroundColor"),'rgb(2, 2, 5)');
    await evaluate("window.scrollTo({top:0,behavior:'instant'})");await wait("!document.getElementById('category-rail').classList.contains('is-visible')");
    assert(await evaluate("document.getElementById('category-rail').inert"));await delay(400);
    assert.equal(await evaluate("getComputedStyle(document.getElementById('category-rail')).visibility"),'hidden');
   }
   await screenshot(`header-particles-${width}`);await overflow('barra '+width);
   await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await wait("!document.querySelector('.site-header').headerParticles.running");
   assert.equal(await evaluate("document.querySelector('.site-header').headerParticles.running"),false);
   const still=await evaluate("document.querySelector('.site-header').headerParticles.frames");await delay(200);
   assert.equal(await evaluate("document.querySelector('.site-header').headerParticles.frames"),still);
  }
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('OK: barra negra, partículas activas, menú móvil, transición lateral y movimiento reducido.');
  await send('Browser.close');process.exit(0);
 }
 if(process.argv.includes('--home-append')){
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  for(const [width,height] of [[390,844],[1365,900],[1920,1080]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
   await navigate('/');await wait("document.querySelectorAll('#grid .card').length===40 && !!document.querySelector('#chips [data-category]')");
   await evaluate("window.firstCard=document.querySelector('#grid .card');window.firstCanvas=window.firstCard.querySelector('canvas')");
   for(const target of [80,VISIBLE_ANIMATIONS.length]){
    await evaluate("document.getElementById('gallery-more').scrollIntoView({block:'center'})");await delay(200);
    const before=await evaluate("scrollY");
    const point=await evaluate("(()=>{const r=document.getElementById('gallery-more').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
    await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
    await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
    await wait(`document.querySelectorAll('#grid .card').length===${target} && document.getElementById('grid').getAttribute('aria-busy')==='false'`);
    await delay(250);
    const after=await evaluate("scrollY");assert(Math.abs(after-before)<3,`Scroll moved at ${width}: ${before} -> ${after}`);
    assert(await evaluate("document.querySelector('#grid .card')===window.firstCard && window.firstCard.querySelector('canvas')===window.firstCanvas"));
    assert.equal(await evaluate("new Set(Array.from(document.querySelectorAll('#grid .card')).map(c=>c.dataset.id)).size"),target);
   }
   assert.deepEqual(await evaluate("Array.from(document.querySelectorAll('.batch-ad')).map(a=>Number(a.dataset.afterAnimation))"),[40,80]);
   assert(await evaluate("document.getElementById('gallery-more').hidden"));
   assert(await evaluate("!document.getElementById('back-to-gallery').hidden && getComputedStyle(document.getElementById('back-to-gallery')).display!=='none'"));
   await evaluate("document.querySelector('.batch-ad').scrollIntoView({block:'center'})");await delay(200);await overflow('carga acumulada '+width);await screenshot(`home-append-separator-${width}`);
   await evaluate("document.getElementById('back-to-gallery').click()");await wait("document.getElementById('back-to-gallery').hidden");
   await evaluate("document.querySelector('#chips [data-category=navidad]').click()");await wait(`document.querySelectorAll('#grid .card').length===${VISIBLE_ANIMATIONS.filter(a=>a.category==='navidad').length}`);
   assert.equal(await evaluate("document.querySelectorAll('.batch-ad').length"),0);
  }
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('OK: carga 40→80→105 sin saltos ni duplicados, conserva tarjetas/canvas, separadores y botón de subir en móvil y PC.');
  await send('Browser.close');process.exit(0);
 }
 if(process.argv.includes('--home-discovery')){
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  for(const [width,height] of [[360,640],[390,844],[1365,900],[1600,900],[1920,1080]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
   await navigate('/');await wait("document.querySelectorAll('#grid .feed-ad').length===3 && document.querySelectorAll('#home-products .gift').length>0");
   assert.equal(await evaluate("document.querySelectorAll('main .seo-category-list').length"),0);
   assert.deepEqual(await evaluate("Array.from(document.querySelectorAll('#grid .feed-ad')).map(ad=>{let n=0;for(let el=ad.previousElementSibling;el;el=el.previousElementSibling)if(el.classList.contains('card'))n++;return n})"),[10,20,30]);
   const feedVisible=await evaluate("getComputedStyle(document.querySelector('.feed-ad')).display!=='none'");assert.equal(feedVisible,width<720);
   await evaluate("window.scrollTo(0,0)");await delay(150);assert(await evaluate("!document.getElementById('category-rail').classList.contains('is-visible')"));
   await evaluate("window.scrollTo(0,document.getElementById('galeria').offsetTop+800)");await delay(250);await overflow('laterales '+width);
   if(width>=1280){
    assert(await evaluate("document.getElementById('category-rail').classList.contains('is-visible')"));
    const rects=await evaluate("(()=>{const n=document.getElementById('category-rail').getBoundingClientRect(),g=document.getElementById('galeria').getBoundingClientRect(),a=document.querySelector('.home-ad-rail .ad-slot').getBoundingClientRect();return {navRight:n.right,gridLeft:g.left,gridRight:g.right,adLeft:a.left,adTop:a.top,adWidth:a.width}})()");
    assert(rects.navRight<rects.gridLeft&&rects.adLeft>rects.gridRight,JSON.stringify(rects));assert(rects.adWidth<=300);assert(rects.adTop>=99);
   }else assert(await evaluate("getComputedStyle(document.getElementById('category-rail')).display==='none'"));
   await screenshot(`home-discovery-rails-${width}`);
   if(width>=1280){
    await evaluate("document.querySelector('#side-categories [data-category=navidad]').click()");
    await wait("document.querySelector('#chips [data-category=navidad]').getAttribute('aria-pressed')==='true'");
    assert.equal(await evaluate("location.pathname"),'/');
    assert.equal(await evaluate("document.querySelectorAll('#grid .card').length"),VISIBLE_ANIMATIONS.filter(a=>a.category==='navidad').length);
    await evaluate("document.querySelector('#chips [data-category=todas]').click()");
   }
   if(width<500){await evaluate("document.querySelector('.feed-ad').scrollIntoView({block:'center'})");await delay(150);await screenshot(`home-discovery-feed-${width}`);assert(await evaluate("!!document.querySelector('#back-to-gallery canvas')"));}
   await evaluate("document.getElementById('gallery-more').click()");await wait("document.querySelectorAll('#grid .card').length===80 && document.getElementById('grid').getAttribute('aria-busy')==='false'");
   assert.deepEqual(await evaluate("Array.from(document.querySelectorAll('.feed-ad')).map(a=>Number(a.dataset.afterAnimation))"),[10,20,30,50,60,70]);
   await evaluate("document.querySelector('#chips [data-category=halloween]').click()");await wait("document.querySelectorAll('#home-products .gift').length>0");
   assert(await evaluate("Array.from(document.querySelectorAll('#home-products .gift')).every(a=>a.rel.includes('sponsored'))"));
   assert.equal(await evaluate("document.querySelector('#home-products .gifts').scrollLeft"),0);
   const related=await evaluate("import('/js/config.js').then(({GIFTS})=>{const urls=new Set(GIFTS.filter(g=>g.category==='halloween'||g.categories?.includes('halloween')).map(g=>g.url));return Array.from(document.querySelectorAll('#home-products .gift')).every(a=>urls.has(a.href))})");assert(related);
   await evaluate("document.getElementById('home-products').scrollIntoView({block:'center'})");await delay(200);await screenshot(`home-discovery-products-${width}`);await overflow('productos '+width);
   if(width>=1280)assert(await evaluate("document.getElementById('category-rail').classList.contains('is-visible')"));
   if(width===390){
    await evaluate("document.querySelector('#home-products .gifts-nav button').click();document.activeElement.blur()");
    await wait("document.querySelector('#home-products .gifts').scrollLeft>20");
    await evaluate("window.scrollTo(0,0)");await delay(1200);
    const stopped=await evaluate("document.querySelector('#home-products .gifts').scrollLeft");await delay(4800);
    assert.equal(await evaluate("document.querySelector('#home-products .gifts').scrollLeft"),stopped);
   }
  }
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('OK: laterales sin solapes, anuncios cada diez, paginación, afiliados relacionados, autoplay visible y pausa fuera de pantalla.');
  await send('Browser.close');process.exit(0);
 }
 if(process.argv.includes('--home-layout')){
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  for(const [width,height] of [[360,640],[390,844],[1365,900]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
   await navigate('/');await wait("!!document.querySelector('#chips [data-category]')");
   assert.equal(await evaluate("document.querySelectorAll('#categoryGuide,.seo-discovery').length"),0);
   const categories=await evaluate("Array.from(document.querySelectorAll('#chips button')).map(b=>({count:parseInt(b.title),top:Math.round(b.getBoundingClientRect().top)}))");
   assert.equal(new Set(categories.map(c=>c.top)).size,2);
   assert(categories.slice(2).every((c,i)=>categories[i+1].count>=c.count));
   assert(await evaluate("document.getElementById('chips').scrollWidth>document.getElementById('chips').clientWidth"));
   assert(await evaluate("document.getElementById('back-to-gallery').hidden"));
   await evaluate("document.getElementById('galeria').scrollIntoView()");await delay(200);await overflow('categorías '+width);await screenshot(`home-categories-${width}`);
   await evaluate("document.querySelector('#chips button:last-child').click()");await wait("!!document.querySelector('#chips button:last-child[aria-pressed=true]')");
   assert(await evaluate("document.getElementById('chips').scrollLeft>0"));
   await evaluate("document.querySelector('#chips button:first-child').click()");
   await evaluate("document.querySelector('.home-support-ad').scrollIntoView({block:'center'})");await delay(250);
   const layout=await evaluate("(()=>{const s=document.getElementById('support').getBoundingClientRect(),a=document.getElementById('publicidad-final').getBoundingClientRect();return {support:{left:s.left,right:s.right,top:s.top,bottom:s.bottom},ad:{left:a.left,top:a.top,bottom:a.bottom}}})()");
   assert(layout.ad.top>=layout.support.bottom+60,'La aportación y el anuncio deben estar separados');
   await wait("!document.getElementById('back-to-gallery').hidden");await overflow('apoyo '+width);await screenshot(`home-support-ad-${width}`);
   await evaluate("document.getElementById('back-to-gallery').click()");await wait("document.getElementById('back-to-gallery').hidden");
   assert(await evaluate("document.getElementById('galeria').getBoundingClientRect().top>=0"));
  }
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('OK: dos filas ordenadas, scroll lateral, filtros, anuncio adaptable y regreso a categorías en móvil y PC.');
  await send('Browser.close');process.exit(0);
 }
 if(process.argv.includes('--ad-placements')){
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const pages=[['/',['home-top','home-bottom']],['/crear.html?a=corazon-de-energia',[]],['/codigo.html?a=ramo-flores-amarillas',[]],['/v.html?a=corazon-de-energia',[]],['/v.html?s=roto',[]],['/codigo.html?a=me-daba-miedo',[]]];
  for(const [width,height] of [[390,844],[1365,900]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
   for(const [url,placements] of pages){
    await navigate(url);await wait(`${JSON.stringify(placements)}.every(name=>document.querySelector('[data-ad-placement="'+name+'"]').dataset.adState==='preview')`);
    assert.equal(await evaluate("document.querySelectorAll('script[src*=\"pagead2.googlesyndication\"]').length"),0);
    if(!placements.length)assert.equal(await evaluate("document.querySelectorAll('[data-ad-placement]').length"),0);
    for(const name of placements){
     await evaluate(`document.querySelector('[data-ad-placement="${name}"]').scrollIntoView({block:'center'})`);
     await delay(250);await overflow(url);
     const rect=await evaluate(`(()=>{const r=document.querySelector('[data-ad-placement="${name}"]').getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right}})()`);
     assert(rect.height>=120&&rect.left>=0&&rect.right<=width+1,JSON.stringify(rect));
     await screenshot(`ad-preview-${name}-${width}`);
    }
   }
  }
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('OK: espacios públicos y separación; utilidades, dedicatorias y errores sin anuncios; localhost sin solicitudes a Google.');
  await send('Browser.close');process.exit(0);
 }
 if(process.argv.includes('--home-christmas')||process.argv.includes('--final-trio')){
  const report=[];
  for(const [width,height] of [[390,844],[360,640],[430,932]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   await navigate('/tools/emotional-qa.html');await wait("document.body.dataset.ready==='true'");
   for(const id of process.argv.includes('--home-christmas')?['cuando-ya-vienes','mi-deseo-de-navidad']:['la-parte-que-no-se-rindio','tu-horario-tu-vida','cuando-ya-vienes']){
    const scene=EMOTIONAL_SCENES.find(s=>s.id===id),end=scene.duration-5;
    console.log(`${width}: ${id}`);
    const reading=await evaluate(`window.renderEmotional('${id}',8)`);
    for(const offset of [.35,1.2,2.5,6,10]){
     const stats=await evaluate(`window.renderEmotional('${id}',${end+offset})`);
     assert.equal(stats.glyphAttraction,0);
     if(offset===1.2){assert.equal(stats.transitionPhase,'flight');assert(stats.flightRadius>reading.flightRadius*2);}
     if(offset>=6)assert.equal(stats.transitionPhase,'figure');
     await screenshot(`final-trio-${id}-${width}-${offset}`);
     report.push({id,width,offset,...stats});
    }
    if(width===390){
     const fallback=await evaluate(`window.renderEmotional('${id}',${end+6},{fallback:true})`);
     assert.equal(fallback.renderer,'energy-canvas');await screenshot(`final-trio-${id}-fallback`);
    }
   }
  }
  assert.equal(errors.length,0,errors.join('\n'));
  await writeFile('tools/review/final-trio.json',JSON.stringify({passed:true,report},null,2));
  console.log('OK: tres escenas, explosiones, figuras y movimiento en tres móviles y Canvas.');
  await send('Browser.close');process.exit(0);
 }
 if(process.argv.includes('--memory-heart')){
  for(const [width,height] of [[390,844],[360,640],[430,932]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   await navigate('/tools/emotional-qa.html');await wait("document.body.dataset.ready==='true'");
   for(const time of [8,10.9,11.4,12.2,14,17,20]){
    const stats=await evaluate(`window.renderEmotional('dias-sin-fotografias',${time})`);
    if(time<11)assert.equal(stats.exploded,false);
    if(time>11)assert.equal(stats.glyphAttraction,0);
    if(time===11.4)assert.equal(stats.transitionPhase,'flight');
    if(time>=17)assert.equal(stats.transitionPhase,'figure');
    await screenshot(`memory-heart-${width}-${time}`);
   }
  }
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('OK: corazón de estrellas, explosión y formación en tres móviles.');
  await send('Browser.close');process.exit(0);
 }
 if(process.argv.includes('--emotional-bursts')){
  const report=[];
  for(const [width,height] of [[390,844],[360,640]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   await navigate('/tools/emotional-qa.html');await wait("document.body.dataset.ready==='true'");
   for(const scene of EMOTIONAL_SCENES){
    console.log(`Explosión ${width}: ${scene.id}`);
    const end=scene.narrative?.8+scene.blocks.length*7.4:scene.duration-5;
    const free=['sostenian-mis-mensajes','imagine-tu-regreso','empezar-de-mi-lado','aprender-a-recibir'].includes(scene.id);
    const reading=await evaluate(`window.renderEmotional('${scene.id}',${end-.3})`);
    for(const offset of [.35,1.2,1.6,2.5,6]){
     const stats=await evaluate(`window.renderEmotional('${scene.id}',${end+offset})`);
     assert.equal(stats.glyphAttraction,0,scene.id);
     if(offset<=1.2)assert.equal(stats.transitionPhase,'flight');
     if(offset===1.2)assert(stats.flightRadius>reading.flightRadius*2,`${scene.id}: insufficient flight ${stats.flightRadius}`);
     if(free)assert.equal(stats.figureAttraction,0);
     if(offset===6)assert.equal(stats.transitionPhase,free?'drift':'figure');
     report.push({id:scene.id,width,offset,...stats});
     await screenshot(`burst-audit-${scene.id}-${width}-${offset}`);
    }
   }
  }
  assert.equal(errors.length,0,errors.join('\n'));
  await writeFile('tools/review/emotional-bursts.json',JSON.stringify({passed:true,report},null,2));
  console.log('OK: diez explosiones en dos móviles, vuelo amplio y sin retorno a letras.');
  await send('Browser.close');process.exit(0);
 }
 if(process.argv.includes('--flowers-path')){
  for(const [width,height] of [[390,844],[360,640]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   await navigate('/tools/emotional-qa.html');await wait("document.body.dataset.ready==='true'");
   for(const time of [8,19.4,20.2,21,23,26,28,30]){
    const stats=await evaluate(`window.renderEmotional('por-si-acaso-flores',${time})`);
    assert.equal(stats.portalEnabled,false);
    assert.equal(stats.flowerCount,28);assert.equal(stats.destinationArch,true);
    if(time>19)assert.equal(stats.glyphAttraction,0);
    if(time===26)assert.equal(stats.transitionPhase,'figure');
    await screenshot(`flowers-path-${width}-${time}`);
   }
  }
  assert.equal(errors.length,0,errors.join('\n'));console.log('OK: vuelo libre, reconstrucción directa de flores ampliadas y sin portal inferior en 360 y 390 px.');
  await send('Browser.close');process.exit(0);
 }
 if(process.argv.includes('--regreso-drift')){
  for(const [width,height] of [[390,844],[360,640]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   await navigate('/tools/emotional-qa.html');await wait("document.body.dataset.ready==='true'");
   for(const time of [5,13,16,17,20,28]){
    const stats=await evaluate(`window.renderEmotional('imagine-tu-regreso',${time})`);
    assert(stats.block<=1);assert(!stats.lines.join(' ').includes('cansado'));
    if(time===13)assert.equal(stats.lines.join(' '),'hasta que imaginé tu regreso.');
    if(time>=16){assert.equal(stats.glyphAttraction,0);assert.equal(stats.figureAttraction,0);}
    if(time>=20)assert.equal(stats.transitionPhase,'drift');
    await screenshot(`regreso-drift-${width}-${time}`);
   }
   const still=await evaluate("window.renderEmotional('imagine-tu-regreso',8,{reduced:true})");
   assert.equal(still.lines.join(' '),'Pensé que estaba extrañándote, hasta que imaginé tu regreso.');
  }
  assert.equal(errors.length,0,errors.join('\n'));console.log('OK: dos bloques, frase recortada, explosión sin retorno al texto y flujo libre, también en movimiento reducido.');
  await send('Browser.close');process.exit(0);
 }
 if(process.argv.includes('--messages-drift')||process.argv.includes('--side-drift')||process.argv.includes('--care-drift')){
  const sceneId=process.argv.includes('--care-drift')?'aprender-a-recibir':process.argv.includes('--side-drift')?'empezar-de-mi-lado':'sostenian-mis-mensajes';
  const scene=EMOTIONAL_SCENES.find(s=>s.id===sceneId);
  const endRead=scene.narrative?.8+scene.blocks.length*7.4:scene.duration-5;
  for(const [width,height] of [[390,844],[360,640]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   await navigate('/tools/emotional-qa.html');await wait("document.body.dataset.ready==='true'");
   for(const time of [...new Set([.2,1,2,4,8,...(scene.narrative?[8.5,8.9,9.5,10.5,13,15.9,16.3,17,18,20]:[]),endRead+.4,endRead+1.2,endRead+4,24,32])].sort((a,b)=>a-b)){
    const stats=await evaluate(`window.renderEmotional('${sceneId}',${time})`);
    if(sceneId==='aprender-a-recibir'&&[8.5,8.9,15.9,16.3].includes(time)){assert(stats.pageTransition);assert(stats.outgoingParticles>0);assert(!stats.exploded);}
    if(sceneId==='aprender-a-recibir'&&[10.5,18].includes(time))assert.equal(stats.outgoingParticles,0);
    if(time>endRead){assert.equal(stats.glyphAttraction,0);assert.equal(stats.figureAttraction,0);}
    if(time>=endRead+4)assert.equal(stats.transitionPhase,'drift');
    await screenshot(`${sceneId}-drift-${width}-${time}`);
   }
  }
  assert.equal(errors.length,0,errors.join('\n'));console.log('OK: frase, explosión y flujo libre sin reconstrucción ni figura final en 360 y 390 px.');
  await send('Browser.close');process.exit(0);
 }
 if(process.argv.includes('--flower-burst')){
  for(const [width,height] of [[390,844],[360,640]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   await navigate('/tools/emotional-qa.html');await wait("document.body.dataset.ready==='true'");
   const reading=await evaluate("window.renderEmotional('me-daba-miedo',8)");
   for(const time of [13.3,13.8,14.4,14.9,15.8,17,19]){
    const stats=await evaluate(`window.renderEmotional('me-daba-miedo',${time})`);
    assert.equal(stats.glyphAttraction,0);
    if(time<14.65)assert.equal(stats.transitionPhase,'flight');
    if(time===14.4)assert(stats.flightRadius>reading.flightRadius*2,JSON.stringify(stats));
    if(time===19)assert.equal(stats.transitionPhase,'figure');
    await screenshot(`flower-burst-${width}-${time}`);
   }
  }
  assert.equal(errors.length,0,errors.join('\n'));console.log('OK: explosión amplia, vuelo libre sin atracción a letras y reconstrucción directa de la flor en 360 y 390 px.');
  await send('Browser.close');process.exit(0);
 }
 if(process.argv.includes('--flower-turn')){
  for(const [width,height] of [[390,844],[360,640]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   await navigate('/tools/emotional-qa.html');await wait("document.body.dataset.ready==='true'");
   let previous=-1;
   for(const time of [18,21,24,27,30]){
    const stats=await evaluate(`window.renderEmotional('me-daba-miedo',${time})`);
    assert(stats.flowerTurn>=previous);previous=stats.flowerTurn;
    await screenshot(`flower-turn-${width}-${time}`);
   }
   assert(Math.abs(previous-Math.PI*2)<.01);
   const other=await evaluate("window.renderEmotional('la-parte-que-no-se-rindio',24,{snapshot:true})");assert.equal(other.flowerTurn,0);
  }
  assert.equal(errors.length,0,errors.join('\n'));console.log('OK: giro completo de la flor con aceleración suave; 360 y 390 px; otras figuras conservan su movimiento.');
  await send('Browser.close');process.exit(0);
 }
 if(process.argv.includes('--energy-preview')){
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await navigate('/tools/emotional-qa.html');await wait("document.body.dataset.ready==='true'");
  await evaluate('window.renderEnergyReference(10)');await screenshot('energy-reference-heart');
  for(const id of ['me-daba-miedo','la-parte-que-no-se-rindio','por-si-acaso-flores']){
   const scene=EMOTIONAL_SCENES.find(s=>s.id===id);
   for(const time of [8,scene.duration-4.55,scene.duration+2]){
    const stats=await evaluate(`window.renderEmotional('${id}',${time},${process.argv.includes('--snapshots')?'{snapshot:true}':'{}'})`);console.log(JSON.stringify({id,time,...stats}));
    await screenshot(`energy-${id}-${time}`);
   }
  }
  assert.equal(errors.length,0,errors.join('\n'));await send('Browser.close');process.exit(0);
 }
 if(process.argv.includes('--emotional')) {
  const report=[];
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await navigate('/tools/emotional-qa.html');await wait("document.body.dataset.ready==='true'");
  for(const scene of EMOTIONAL_SCENES){
   console.log('Partículas: '+scene.id);
   const endRead=scene.narrative?.8+scene.blocks.length*7.4:scene.duration-5;
   const samples=scene.narrative?[...scene.blocks.map((_,i)=>5+i*7.4),endRead+.45,scene.duration+2]:[2.5,8,endRead+.45,scene.duration+2];
   for(const time of samples){
    const stats=await evaluate(`window.renderEmotional(${JSON.stringify(scene.id)},${time})`);
    assert(stats.active>=700&&stats.fontSize>=20,JSON.stringify(stats));assert.equal(stats.renderer,'energy-webgl');report.push({id:scene.id,time,...stats});
    await screenshot(`emotional-${scene.id}-${time}`);
   }
  }
  const fallbackStats=await evaluate("window.renderEmotional('me-daba-miedo',8,{fallback:true})");assert.equal(fallbackStats.renderer,'energy-canvas');await screenshot('emotional-energy-fallback');
  for(const [width,height] of [[360,640],[430,932],[1365,900]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
   await navigate('/tools/emotional-qa.html');await wait("document.body.dataset.ready==='true'");
   for(const id of ['me-daba-miedo','aprender-a-recibir']){
    const stats=await evaluate(`window.renderEmotional('${id}',8,{reduced:true})`);assert(stats.lines.length>1);
    await screenshot(`emotional-reduced-${id}-${width}`);await overflow(id);
   }
  }
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await navigate('/crear.html?a=me-daba-miedo');await wait("!!document.getElementById('emotionalScene')");
  assert.equal(await evaluate("document.querySelectorAll('#emotionalScene option').length"),EMOTIONAL_SCENES.length);
  assert(await evaluate("document.getElementById('messageLabel').hidden&&document.getElementById('senderLabel').hidden&&document.getElementById('fontLabel').hidden"));
  const shared=await evaluate(`(()=>{const f=document.getElementById('form');f.elements.p.value='Luna';f.elements.glow.value='.7';f.elements.speed.value='.85';f.elements.density.value='.8';document.getElementById('colorsEnabled').checked=true;f.elements.c1.value='#ca9080';f.elements.c2.value='#87b3a8';f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return document.getElementById('link').value;})()`);
  const card=await evaluate(`import('/js/share.js').then(m=>m.decodeCard(new URL(${JSON.stringify(shared)}).searchParams.get('s')))`);
  assert.equal(card.glow,'0.7');assert.equal(card.speed,'0.85');assert.equal(card.density,'0.8');assert.equal(card.p,'Luna');assert.equal(card.m,'');
  await navigate('/crear.html'+new URL(shared).search);await wait("!!document.getElementById('emotionalScene')");
  assert.equal(await evaluate("document.getElementById('form').elements.speed.value"),'0.85');await overflow('editor partículas');await screenshot('emotional-editor-mobile');
  await navigate('/v.html'+new URL(shared).search+'&autoplay');await wait("!document.getElementById('viewerPause').hidden");
  assert(await evaluate("document.querySelector('.ov-msg').hidden"));await overflow('destinatario partículas');
  await navigate('/crear.html?a=aprender-a-recibir');await wait("!!document.getElementById('emotionalScene')");assert(await evaluate("document.getElementById('recipientLabel').hidden"));
  assert.equal(errors.length,0,errors.join('\n'));
  await writeFile('tools/review/emotional-result.json',JSON.stringify({passed:true,scenes:EMOTIONAL_SCENES.length,report},null,2));console.log('OK: colección, lectura, desenlaces, tres móviles, escritorio, movimiento reducido y enlace compartido.');
  await send('Browser.close');process.exit(0);
 }
 if(process.argv.includes('--gifts')) {
  for(const width of [1365,390]) {
   await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<700});
   for(const [id,count] of [['haunted-night',15],['ofrenda-de-luz',7]]) {
    await navigate(`/animaciones/${id}.html`);
    await wait(`document.querySelectorAll('.gift').length===${count}`);
    await evaluate("document.querySelector('.gifts-section').scrollIntoView({block:'center'})");
    await wait("[...document.querySelectorAll('.gift')].slice(0,2).every(g=>g.querySelector('.gift-img img')?.naturalWidth>0)");
    await evaluate("scrollTo({top:document.querySelector('.gifts-section').getBoundingClientRect().top+scrollY-40,behavior:'instant'})");
    assert(await evaluate("[...document.querySelectorAll('.gift')].every(g=>g.href.startsWith('https://meli.la/')&&g.rel.includes('sponsored')&&!g.textContent.includes('opción'))"));
    await overflow(`${id} ${width}`);
    await screenshot(`gift-previews-${id}-${width}`);
   }
  }
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('OK: vistas previas reales de Mercado Libre, categorías, imágenes y tamaños móvil/escritorio.');
  await send('Browser.close');
  process.exit(0);
 }
 await call('Emulation.setDeviceMetricsOverride',{width:1365,height:1000,deviceScaleFactor:1,mobile:false});
 await navigate('/');await wait("document.querySelectorAll('#grid .card').length>0");
 const homeIds=()=>evaluate("[...document.querySelectorAll('#grid .card')].map(x=>x.dataset.id)");
 const firstPage=await homeIds();assert.equal(firstPage.length,40,'La portada debe mostrar 40 tarjetas');
 const latest=[...EMOTIONAL_ANIMATIONS,...EXPERT_ANIMATIONS,...TURTLE_ANIMATIONS].map(a=>a.id);
 assert.deepEqual(firstPage.slice(0,latest.length),latest,'Las experiencias nuevas deben aparecer primero');
 await evaluate('scrollTo(0,document.body.scrollHeight)');await delay(650);
 assert.deepEqual(await homeIds(),firstPage,'Llegar al pie no debe cargar más tarjetas');
 await screenshot('home-footer-desktop');
 await evaluate("document.getElementById('gallery-more').click()");await wait("document.querySelectorAll('#grid .card').length===80");const secondPage=await homeIds();assert.deepEqual(secondPage.slice(0,40),firstPage);
 assert.equal(new Set(secondPage).size,80,'La carga no debe repetir tarjetas');
 await wait("!document.getElementById('gallery-more').disabled");
 await evaluate("document.getElementById('gallery-more').click()");await wait(`document.querySelectorAll('#grid .card').length===${VISIBLE_ANIMATIONS.length}`);const lastPage=await homeIds();
 assert.equal(new Set(lastPage).size,VISIBLE_ANIMATIONS.length);
 await wait("document.getElementById('grid').getAttribute('aria-busy')==='false'");
 assert(await evaluate("document.getElementById('gallery-more').hidden"),'No debe ofrecer páginas vacías');
 await evaluate("document.querySelector('#chips button').click();scrollTo(0,0)");
 assert(await evaluate("document.querySelector('#grid .card-preview-link').getAttribute('href').startsWith('/animaciones/')"),'Portada no dirige a ficha');
 await overflow('portada escritorio');await screenshot('home-desktop');
 await navigate('/categorias/cumple.html');await wait("!document.querySelector('.collection-controls').hidden");
 await evaluate("document.querySelector('[data-filter]').value='interactive';document.querySelector('[data-filter]').dispatchEvent(new Event('change',{bubbles:true}))");
 assert.equal(await evaluate("[...document.querySelectorAll('.card')].filter(c=>!c.hidden).length"),VISIBLE_ANIMATIONS.filter(a=>a.category==='cumple'&&a.interactive).length);
 await overflow('categoría escritorio');await screenshot('category-desktop');
 await navigate('/animaciones/pinata-sorpresa.html');await evaluate("document.getElementById('detail-play').click()");await wait("!document.getElementById('detail-pause').hidden");
 await evaluate("document.getElementById('detail-pause').click()");
 assert.equal(await evaluate("document.getElementById('detail-pause').textContent"),'Continuar');
 await evaluate("document.getElementById('detail-replay').click()");await delay(1500);await screenshot('detail-desktop');
 await navigate('/crear.html?a=ofrenda-de-luz');await wait("document.querySelector('#textFont').options.length===5 && document.querySelectorAll('#more .card').length===3");
 assert(!await evaluate("!!document.querySelector('#gifts,#support,.header-support-button')"),'Distracciones en el editor');
 assert.equal(await evaluate("document.querySelectorAll('#form .editor-options').length"),2);
 const shared=await evaluate(`(()=>{const form=document.getElementById('form'),f=form.elements;f.tm.value='custom';f.tm.dispatchEvent(new Event('change',{bubbles:true}));f.p.value='Nuestra ofrenda';f.m.value='La memoria florece';f.d.value='Familia';f.f.value='classic';document.getElementById('colorsEnabled').checked=true;f.c1.value='#32cfff';f.c2.value='#ffaaff';form.dispatchEvent(new Event('input',{bubbles:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return document.getElementById('link').value;})()`);
 assert(shared.includes('/v.html?s='));
 const data=await evaluate(`import('/js/share.js').then(m=>m.decodeCard(new URL(${JSON.stringify(shared)}).searchParams.get('s')))`);
 assert.equal(data.f,'classic');assert.equal(data.c1,'#32cfff');assert.equal(data.c2,'#ffaaff');
 // El enlace personalizado tiene prioridad sobre un borrador existente.
 await evaluate("sessionStorage.setItem('detallito-borrador-ofrenda-de-luz',JSON.stringify({m:'Borrador distinto',f:'mono',tm:'none'}))");
 await navigate('/crear.html'+new URL(shared).search);await wait("document.getElementById('title').textContent==='Ofrenda de luz' && document.querySelectorAll('#more .card').length===3");
 assert.equal(await evaluate("document.getElementById('form').elements.m.value"),'La memoria florece');
 assert.equal(await evaluate("document.getElementById('form').elements.f.value"),'classic');
 assert.equal(await evaluate("document.getElementById('form').elements.tm.value"),'custom');
 // Simula la conservación del documento al navegar Atrás: la escena debe seguir viva.
 await evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));document.getElementById('previewRestart').click()");
 await wait("!document.getElementById('previewRestart').disabled");
 const beforeReturn=await evaluate("document.querySelector('#scene canvas').toDataURL()");await delay(350);
 assert.notEqual(await evaluate("document.querySelector('#scene canvas').toDataURL()"),beforeReturn,'La escena no continúa tras restaurar el documento');
 const history=await call('Page.getNavigationHistory');const editorEntry=history.entries[history.currentIndex].id;
 await navigate('/acerca.html');await call('Page.navigateToHistoryEntry',{entryId:editorEntry});
 await wait("document.getElementById('title')?.textContent==='Ofrenda de luz' && document.querySelectorAll('#more .card').length===3");
 const beforeBack=await evaluate("document.querySelector('#scene canvas').toDataURL()");await delay(350);
 assert.notEqual(await evaluate("document.querySelector('#scene canvas').toDataURL()"),beforeBack,'La escena no continúa al navegar Atrás');
 await overflow('editor escritorio');await screenshot('share-result-desktop');await evaluate('scrollTo(0,0)');await screenshot('editor-desktop');
 const sharedPath=new URL(shared).pathname+new URL(shared).search;
 await navigate(sharedPath);await wait("document.getElementById('gateTo').textContent==='Nuestra ofrenda'");
 await evaluate("document.getElementById('openBtn').click()");await wait("document.getElementById('gate').classList.contains('hide')");
 assert.equal(await evaluate("document.querySelector('.ov-msg').textContent"),'La memoria florece');
 assert((await evaluate("document.getElementById('overlay').style.getPropertyValue('--message-font')")).includes('Georgia'));
 await wait("!document.getElementById('viewerPause').hidden");await evaluate("document.getElementById('viewerPause').click()");
 assert.equal(await evaluate("document.getElementById('viewerPause').textContent"),'Continuar');await evaluate("document.getElementById('viewerPause').click()");
 await delay(5000);await screenshot('recipient-desktop');
 await navigate('/crear.html?a=no-existe');await wait("document.querySelector('h1').textContent==='Este enlace no está disponible'");
 await navigate('/v.html?s=roto');await wait("document.querySelector('h1').textContent==='Este enlace no está disponible'");
 // Un import fallido necesita una solicitud nueva al reintentar.
 await call('Network.enable');await call('Network.setBlockedURLs',{urls:['*fantasmita-rosa.js*']});
 await navigate('/animaciones/fantasmita-rosa.html');await evaluate("document.getElementById('detail-play').click()");
 await wait("document.getElementById('detail-play').textContent==='Reintentar vista previa'");
 await call('Network.setBlockedURLs',{urls:[]});await evaluate("document.getElementById('detail-play').click()");
 await wait("!document.getElementById('detail-pause').hidden");
 for(const id of ['jardin-de-lunas','galaxia-de-flores']) {
  await navigate(`/crear.html?a=${id}`);await wait("document.querySelectorAll('#more .card').length===3");
  assert.equal(await evaluate("document.getElementById('galaxyFields').hidden"),false);
  const letter=await evaluate(`(()=>{const f=document.getElementById('form');f.elements.lt.value='Nuestro recuerdo';f.elements.l.value='Esta carta acompaña el viaje.';f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return document.getElementById('link').value;})()`);
  const saved=await evaluate(`import('/js/share.js').then(m=>m.decodeCard(new URL(${JSON.stringify(letter)}).searchParams.get('s')))`);
  assert.equal(saved.lt,'Nuestro recuerdo');assert.equal(saved.l,'Esta carta acompaña el viaje.');
  if(id==='jardin-de-lunas')assert.equal(await evaluate("document.querySelectorAll('.dana2-memory').length"),7);
 }
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 for(const [url,name,ready] of [
  ['/','home-mobile',"document.querySelectorAll('#grid .card').length>0"],
  ['/categorias/halloween.html','category-mobile',"!document.querySelector('.collection-controls').hidden"],
  ['/animaciones/fantasmita-rosa.html','detail-mobile',"!!document.getElementById('detail-play')"],
  ['/crear.html?a=ofrenda-de-luz','editor-mobile',"document.querySelector('#textFont').options.length===5"],
  ['/acerca.html','about-mobile',"!!document.querySelector('.header-menu-toggle')"],
  ['/privacidad.html','privacy-mobile',"!!document.querySelector('.header-menu-toggle')"]
 ]){
  await navigate(url);await wait(ready);if(name==='detail-mobile'){await evaluate("document.getElementById('detail-play').click()");await wait("!document.getElementById('detail-pause').hidden");await delay(5000);}
  await overflow(name);await screenshot(name);
  await evaluate("document.querySelector('.header-menu-toggle').click()");assert.equal(await evaluate("document.querySelector('.mobile-nav').hidden"),false,'Menú móvil no abre');
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");assert.equal(await evaluate("document.querySelector('.mobile-nav').hidden"),true,'Escape no cierra menú');
 }
 // Mensajes de ejemplo específicos en formularios nuevos, sin sobrescribir borradores.
 for(const id of ['mansion-imposible','pan-memoria','eclipse-corona']) {
  await navigate('/crear.html?a='+id);await wait("document.querySelector('#phraseSuggestion').options.length>0");
  const expected=TURTLE_ANIMATIONS.find(a=>a.id===id);
  const actual=await evaluate("({message:document.querySelector('#form').elements.m.value,title:document.querySelector('#form').elements.p.placeholder,suggestion:document.querySelector('#phraseSuggestion').value})");
  assert.equal(actual.message,expected.defaultMessage);assert.equal(actual.suggestion,expected.defaultMessage);assert(actual.title.includes(expected.exampleTitle));
 }
 // Importación y cuadros de todas las escenas con valores reales de personalización.
 await navigate('/tools/animation-qa.html');await wait("document.body.dataset.complete==='true'");
 const scenes=await evaluate('window.qaResult');assert.equal(scenes.length,VISIBLE_ANIMATIONS.length);assert(scenes.every(r=>r.ok),JSON.stringify(scenes.filter(r=>!r.ok)));
 await screenshot('scenes-check');
 assert.equal(errors.length,0,errors.join('\n'));
 const report={passed:true,scenes:scenes.length,flows:['portada → ficha','categoría y filtro funcional','cargar, pausar y reiniciar','editor → enlace → destinatario','restaurar enlace en editor frente a borrador','volver a un documento conservado','reintentar descarga fallida','tipografía y colores compartidos','enlaces inválidos','menú móvil y Escape','sin desbordamiento a 390 y 1365 px'],runtimeErrors:errors};
 await writeFile('tools/review/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 await send('Browser.close');
} finally {
 ws?.close();browser.kill();await delay(600);
 const resolved=path.resolve(profile), tempRoot=path.resolve(tmpdir())+path.sep;
 assert(resolved.startsWith(tempRoot)&&path.basename(resolved).startsWith('viralcss-review-'),'El perfil temporal debe quedar dentro de TEMP');
 await rm(resolved,{recursive:true,force:true}).catch(()=>{});
}
