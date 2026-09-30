// Pruebas en Chrome real mediante CDP, sin dependencias ni publicación.
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
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
 await call('Emulation.setDeviceMetricsOverride',{width:1365,height:1000,deviceScaleFactor:1,mobile:false});
 await navigate('/');await wait("document.querySelectorAll('#grid .card').length>0");
 assert(await evaluate("document.querySelector('#grid .card-preview-link').getAttribute('href').startsWith('/animaciones/')"),'Portada no dirige a ficha');
 await overflow('portada escritorio');await screenshot('home-desktop');
 await navigate('/categorias/cumple.html');await wait("!document.querySelector('.collection-controls').hidden");
 await evaluate("document.querySelector('[data-filter]').value='interactive';document.querySelector('[data-filter]').dispatchEvent(new Event('change',{bubbles:true}))");
 assert.equal(await evaluate("[...document.querySelectorAll('.card')].filter(c=>!c.hidden).length"),3);
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
 // Importación y cuadros de las 73 escenas con valores reales de personalización.
 await navigate('/tools/animation-qa.html');await wait("document.body.dataset.complete==='true'");
 const scenes=await evaluate('window.qaResult');assert.equal(scenes.length,73);assert(scenes.every(r=>r.ok),JSON.stringify(scenes.filter(r=>!r.ok)));
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
