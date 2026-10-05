import {TURTLE_ANIMATIONS} from '../js/turtle-catalog.js';
const sceneCount=TURTLE_ANIMATIONS.length,sceneStarts=Array.from({length:Math.ceil(sceneCount/5)},(_,i)=>i*5),sceneIndex=id=>TURTLE_ANIMATIONS.findIndex(a=>a.id===id);
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const profile=await mkdtemp(path.join(tmpdir(),'viralcss-turtle-'));
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-extensions','--enable-unsafe-swiftshader','--no-startup-window','--disable-gpu-sandbox','--remote-debugging-port=0',`--user-data-dir=${profile}`],{windowsHide:true,stdio:'ignore'});
console.log('Chrome de revision: '+browser.pid);
const delay=ms=>new Promise(r=>setTimeout(r,ms));let ws;
try{
 let port;for(let i=0;i<100;i++){try{port=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await delay(100);}}
 assert(port,'Chrome no inició');const version=await(await fetch(`http://127.0.0.1:${port}/json/version`)).json();ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 let id=0;const pending=new Map(),errors=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(x=>x.description||x.value||'').join(' '));else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const serial=++id;const timeout=setTimeout(()=>{pending.delete(serial);reject(Error('Tiempo agotado: '+method));},40000);pending.set(serial,{resolve:r=>{clearTimeout(timeout);resolve(r);},reject:e=>{clearTimeout(timeout);reject(e);}});ws.send(JSON.stringify({id:serial,method,params,...(sessionId?{sessionId}:{})}));});
 const target=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true}),call=(m,p)=>send(m,p,sessionId);
 await call('Runtime.enable');await call('Page.enable');
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const wait=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(100);}throw Error('Espera agotada: '+expression+' '+errors.join('\n'));};
 const navigate=async p=>{await call('Page.navigate',{url:'http://127.0.0.1:8080'+p});await wait("document.readyState==='complete'");};
 await mkdir('tools/review/turtle',{recursive:true});
 let screenshotCount=0;
 const screenshot=async name=>{const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(`tools/review/turtle/${name}.png`,Buffer.from(r.data,'base64'));screenshotCount++;};
 await call('Emulation.setDeviceMetricsOverride',{width:1600,height:760,deviceScaleFactor:1,mobile:false});
 await navigate('/tools/turtle-review.html');await wait('window.ready');
 const report=[];
 for(const time of [1.5,5,10,15])for(const start of sceneStarts){
  const data=await evaluate(`draw(${JSON.stringify({start,time,w:390,h:844})})`);report.push(...data.map(x=>({...x,time,viewport:'mobile'})));await screenshot(`mobile-${start}-${time}`);
 }
 for(const start of sceneStarts){
  await evaluate(`draw(${JSON.stringify({start,time:10,w:1365,h:900,long:true})})`);await screenshot(`desktop-long-${start}`);
  await evaluate(`draw(${JSON.stringify({start,time:15,w:360,h:640,long:true})})`);const bounds=await evaluate('frames.map(x=>({id:x.a.id,bounds:x.stage.diagnostics.textBounds}))');assert(bounds.every(x=>x.bounds.every(b=>b.left>=0&&b.right<=360&&b.y<620)),JSON.stringify(bounds));await screenshot(`mobile-long-${start}`);
  await evaluate(`draw(${JSON.stringify({start,time:15,w:390,h:844,noText:true})})`);await screenshot(`no-text-${start}`);
 }
 const interaction=await evaluate(`(async()=>{const result=[];for(let start=0;start<${sceneCount};start+=5){await draw({start,time:4});for(const x of frames){x.stage.onPointerDown({});x.stage.holding=true;x.stage.pointer={x:.8,y:.5};x.frame(5,.1);x.stage.holding=false;x.frame(8,.1);result.push({id:x.a.id,revealed:x.stage.revealed,event:x.stage.diagnostics.event});}}return result;})()`);
 assert(interaction.every(x=>x.revealed),'Interacción no revela');
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await evaluate('draw({time:5})');assert(await evaluate('frames.every(x=>x.stage.diagnostics.reduced && x.stage.revealed)'));await screenshot('reduced');await call('Emulation.setEmulatedMedia',{features:[]});
 // Real creation form, shared data, optional fields, and viewer replay.
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 for(const id of ['mansion-imposible','retrato-historias','maquina-dulces','escalera-imposible']){
  await navigate('/crear.html?a='+id);await wait("document.getElementById('previewRestart') && !document.getElementById('previewRestart').disabled");await delay(300);
  const url=await evaluate(`(()=>{const f=document.getElementById('form');f.elements.tm.value='custom';f.elements.p.value='Historias compartidas';f.elements.m.value='Una experiencia para celebrar';f.elements.d.value='Familia';if(f.elements.age)f.elements.age.value='25';f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return document.getElementById('link').value;})()`);
  assert(url.includes('?s='));if(id==='maquina-dulces'){const card=await evaluate(`import('/js/share.js').then(m=>m.decodeCard(new URL(${JSON.stringify(url)}).searchParams.get('s')))`);assert.equal(card.age,'25');}
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Editor desborda');await screenshot('editor-'+id);
  await navigate(new URL(url).pathname+new URL(url).search);await evaluate("document.getElementById('openBtn').click()");await wait("!document.getElementById('viewerPause').hidden");await evaluate("document.getElementById('replay').click()");await screenshot('viewer-'+id);
 }
 await navigate('/crear.html?a=retrato-historias');await wait("!document.getElementById('memoryPhotoFields').hidden");
 await evaluate(`(async()=>{const c=document.createElement('canvas');c.width=c.height=200;const ctx=c.getContext('2d');ctx.fillStyle='#77c9d5';ctx.fillRect(0,0,200,200);ctx.fillStyle='#e9b989';ctx.fillRect(60,20,90,150);const blob=await new Promise(r=>c.toBlob(r,'image/jpeg'));const transfer=new DataTransfer();transfer.items.add(new File([blob],'memoria-local.jpg',{type:'image/jpeg'}));const input=document.getElementById('dana2Photo');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await wait("document.getElementById('dana2PhotoStatus').textContent.includes('Imagen lista:')");
 const photoLink=await evaluate("(()=>{document.getElementById('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return document.getElementById('link').value;})()");
 const photoCard=await evaluate(`import('/js/share.js').then(m=>m.decodeCard(new URL(${JSON.stringify(photoLink)}).searchParams.get('s')))`);assert(photoCard.img.startsWith('data:image/jpeg;base64,')&&photoCard.img.length<=22000);
 await navigate('/crear.html'+new URL(photoLink).search);await wait("document.getElementById('title').textContent==='El retrato que guarda historias'");
 const restoredLink=await evaluate("(()=>{document.getElementById('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return document.getElementById('link').value;})()");
 const restoredCard=await evaluate(`import('/js/share.js').then(m=>m.decodeCard(new URL(${JSON.stringify(restoredLink)}).searchParams.get('s')))`);assert.equal(restoredCard.img,photoCard.img);
 await navigate('/tools/turtle-review.html');await wait('window.ready');
 const downloads=await evaluate(`(async()=>{
  const {buildStandaloneHtml}=await import('/js/standalone.js');const {TURTLE_ANIMATIONS}=await import('/js/turtle-catalog.js');const result=[];
  for(const a of TURTLE_ANIMATIONS){
   const html=await buildStandaloneHtml(a,{a:a.id,p:'Luna',m:'Una historia para compartir',d:'Familia',tm:'custom',f:'clear',age:'25'});
   const iframe=document.createElement('iframe');iframe.style.cssText='position:absolute;left:-9999px;width:390px;height:844px';
   const ready=new Promise(resolve=>iframe.onload=resolve),marker=String.fromCharCode(10)+'<script>'+String.fromCharCode(10);iframe.srcdoc=html.replace(/<link[^>]+>/g,'').replace(marker,'<script>window.requestAnimationFrame=()=>0;</script>'+marker);document.body.append(iframe);await ready;
   const first=iframe.contentWindow.eval('dibujar(10,.016);escena.revealed');iframe.contentDocument.getElementById('repetir').click();
   const reset=iframe.contentWindow.eval('dibujar(0,.016);!escena.revealed');iframe.contentWindow.eval('escena.onDispose?.()');iframe.remove();result.push({id:a.id,autoplay:first,replay:reset});
  }return result;
 })()`);assert(downloads.length===sceneCount&&downloads.every(x=>x.autoplay&&x.replay),'El HTML descargable debe reproducir y repetir las escenas del catálogo');
 // Full-size screenshots complement the contact sheets; inspect actual typography.
 for(const [start,width,height,label] of [[sceneIndex('mansion-imposible'),390,844,'mansion-mobile'],[sceneIndex('bordado-memoria'),360,640,'embroidery-small-mobile'],[sceneIndex('guitarra-resonancia'),1365,900,'guitar-desktop'],[sceneIndex('escalera-imposible'),1365,900,'stairs-desktop'],[sceneIndex('maquina-dulces'),390,844,'candy-mobile']]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});await evaluate(`document.getElementById('grid').style.gridTemplateColumns='1fr';draw(${JSON.stringify({start,count:1,time:10,w:width,h:height,long:true})})`);await screenshot(label);
 }
 await evaluate(`(async()=>{await draw({start:${sceneIndex('retrato-historias')},count:1,time:10});const x=frames[0];x.stage.card.img=${JSON.stringify(photoCard.img)};x.frame(10,.1);await new Promise(r=>setTimeout(r,100));x.frame(11,.1);})()`);await screenshot('photo-local');
 await evaluate("document.getElementById('grid').style.gridTemplateColumns='repeat(5,1fr)'");
 const performanceResult=await evaluate(`(async()=>{const result=[];for(let start=0;start<${sceneCount};start+=5){await draw({start,time:5});for(const x of frames){const before=performance.now();for(let i=0;i<60;i++)x.frame(8+i/60,1/60);result.push({id:x.a.id,msPerFrame:(performance.now()-before)/60,particles:x.stage.diagnostics.particles});}}return result;})()`);
 assert.equal(errors.length,0,errors.join('\n'));await writeFile('tools/review/turtle/report.json',JSON.stringify({report,interaction,downloads,photo:{local:true,roundTrip:true,bytes:photoCard.img.length},screenshots:screenshotCount,performance:performanceResult,errors},null,2));console.log(JSON.stringify({scenes:sceneCount,screenshots:screenshotCount,errors:errors.length,slowestMs:Math.max(...performanceResult.map(x=>x.msPerFrame))}));
 await send('Browser.close');
}finally{ws?.close();browser.kill();}
