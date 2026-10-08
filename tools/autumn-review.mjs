import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const id=process.argv[2]||'eternal-souls',profile=await mkdtemp(path.join(tmpdir(),'autumn-review-')),folder=`tools/review/${id}`;
await mkdir(folder,{recursive:true});
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--disable-gpu-sandbox','--remote-debugging-port=0',`--user-data-dir=${profile}`],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));let ws;
try {
 let version;for(let i=0;i<100;i++){try{const port=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];version=await(await fetch(`http://127.0.0.1:${port}/json/version`)).json();break;}catch{await delay(100);}}
 assert(version,'Chrome failed to start');ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let serial=0;const pending=new Map(),errors=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
 const target=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true}),call=(m,p)=>send(m,p,sessionId);
 await call('Page.enable');await call('Runtime.enable');
 if(process.argv.includes('--asset-failure')){await call('Network.enable');await call('Network.setBlockedURLs',{urls:['*assets/haunted-night/web/*']});}
 const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const wait=async e=>{for(let i=0;i<200;i++){if(await ev(e))return;await delay(100);}throw Error('Timeout: '+e+' '+errors.join('\n'));};
 const go=async url=>{await call('Page.navigate',{url:'http://127.0.0.1:8080'+url});await delay(200);await wait("document.readyState==='complete'");};
 const shot=async file=>{const s=await call('Page.captureScreenshot',{format:'png'});await writeFile(`${folder}/${file}.png`,Buffer.from(s.data,'base64'));};
 await call('Emulation.setDeviceMetricsOverride',{width:540,height:960,deviceScaleFactor:1,mobile:true});
 await go('/tools/new-expert-review.html?scene='+id);await wait('window.ready');const report={id,frames:[]};
 if(process.argv.includes('--asset-failure')){
  const stats=await ev('drawScene({t:22})');assert.equal(stats.environmentAssets.ready,false);assert(stats.environmentAssets.error);assert.equal(stats.windows,7);
  await shot('asset-load-fallback');await ev('disposeScene()');assert.equal(errors.length,0,errors.join('\n'));console.log('PASS missing assets fallback');
 }else if(process.argv.includes('--assets-comparison')){
  // Exercise the desktop maps even when the test host advertises <=4 GB.
  await call('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(navigator,'deviceMemory',{get:()=>8,configurable:true})"});
  for(const [label,width,height] of [['mobile',540,960],['desktop',1365,900]]){
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:label==='mobile'});
   await go('/tools/new-expert-review.html?scene='+id);await wait('window.ready');
   for(const t of [0,8,13.45,22])for(const assets of [false,true]){
    const stats=await ev(`drawScene({t:${t},w:${width},h:${height},assets:${assets}})`);
    if(assets){assert.equal(stats.environmentAssets.ready,true,JSON.stringify(stats));assert.equal(stats.environmentAssets.groundPixels,label==='mobile'?512:1024);}
    await shot(`assets-${label}-${t}-${assets?'after':'before'}`);report.frames.push({label,t,assets,stats});
   }
  }
  assert.equal(errors.length,0,errors.join('\n'));await writeFile(`${folder}/asset-comparison.json`,JSON.stringify(report,null,2));console.log('PASS asset comparison');
 }else{
 for(const t of [0,4,8,12,16,22]){const stats=await ev(`drawScene({t:${t}})`);assert.equal(stats.renderer,'three-webgl2');await shot('frame-'+t);report.frames.push({t,stats});console.log(t,JSON.stringify(stats));}
 if(id==='dark-spell'){
  await ev("drawScene({t:12,card:{p:'Elena',m:'Nuestro recuerdo',__cast:0}})");
  await ev("stepScene(13,{p:'Elena',m:'Nuestro recuerdo',__cast:1})");
  for(const age of [1,2.7,3.7,5.5,7]){const s=await ev(`stepScene(${13+age},{p:'Elena',m:'Nuestro recuerdo',__cast:1})`);assert.equal(s.activationCount,1);assert.equal(s.letters,5);await shot('spell-'+age);}
  report.spell=await ev("stepScene(21,{p:'Elena',m:'Nuestro recuerdo',__cast:1})");assert.equal(report.spell.spellReveal,1);
  assert.equal((await ev("stepScene(22,{p:'Elena',m:'Nuestro recuerdo',__cast:2})")).spellReveal,0);
  assert.equal((await ev("stepScene(23,{p:'Elena',tm:'none',__cast:2})")).letters,0);
 }
 if(id==='haunted-night'){await ev('drawScene({t:18,card:{__cast:0}})');report.window=await ev('stepScene(18,{__cast:1})');assert.equal(report.window.toggled,1);const tap={...report.window.firstWindow,seq:1};report.raycast=await ev(`stepScene(18,{__cast:1,__tap:${JSON.stringify(tap)}})`);assert.equal(report.raycast.toggled,2);await ev('drawScene({t:13.45})');await shot('lightning');}
 await ev('drawScene({t:22,w:720,h:1280})');await writeFile(`img/${id}.webp`,Buffer.from((await ev('posterData()')).split(',')[1],'base64'));
 await call('Emulation.setDeviceMetricsOverride',{width:1365,height:900,deviceScaleFactor:1,mobile:false});await ev("drawScene({t:22,w:1365,h:900,full:true,card:{p:'Para Elena',m:'Un recuerdo que permanece',d:'Con cariño'}})");await shot('desktop');
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:693,deviceScaleFactor:1,mobile:true});await ev("drawScene({t:22,w:390,h:693,full:true,card:{p:'Para Elena',m:'Tu presencia transforma cada día en una oportunidad para descubrir, sentir y compartir. Gracias por acompañar este viaje conmigo.',d:'Con cariño',__still:true}})");await shot('long-mobile');
 report.controls=await ev('checkControls()');assert(report.controls.parallax);assert.equal(report.controls.adaptive.quality,'low');assert(report.controls.disposed.contextLost);
 report.lifecycle=await ev('checkLifecycle()');assert(Object.values(report.lifecycle).every(Boolean));
 if(process.argv.includes('--integration')){
  await go('/crear.html?a='+id);await wait("document.body.classList.contains('cinematic-experience')");await ev("document.querySelector('#scene').scrollIntoView({block:'center'})");await wait("document.querySelector('#previewPause').textContent==='Pausar vista previa'");await delay(400);
  assert(!await ev("document.querySelector('.code-link').hidden"));
  if(id==='dark-spell'){await wait("document.querySelector('.autumn-action')&&!document.querySelector('.autumn-action').disabled");await ev("document.querySelector('.autumn-action').click()");await delay(200);assert(await ev("document.querySelector('.autumn-action').disabled"));await delay(6600);assert(await ev("!document.querySelector('.autumn-action').disabled"));await shot('live-spell');}
  if(id==='haunted-night'){assert(await ev("document.querySelector('.autumn-action').textContent==='Encender una ventana'"));await ev("document.querySelector('.autumn-action').click()");}
  const share=await ev("(()=>{let f=document.querySelector('#form');f.elements.tm.value='custom';f.elements.p.value='Para Elena';f.elements.m.value='Nuestro recuerdo';f.elements.d.value='Familia';f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return document.querySelector('#link').value})()");
  report.share=await ev(`import('/js/share.js').then(m=>m.decodeCard(new URL(${JSON.stringify(share)}).searchParams.get('s')))`);assert.equal(report.share.a,id);assert.equal(report.share.m,'Nuestro recuerdo');
  await go('/v.html?autoplay=1&s='+new URL(share).searchParams.get('s'));await wait("!document.querySelector('#viewerPause').hidden");assert(!await ev("document.querySelector('.after-code').hidden"));
  await go('/animaciones/'+id+'.html');await ev("document.querySelector('#detail-play').click()");await wait("!document.querySelector('#detail-pause').hidden");
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await go('/crear.html?a='+id);await wait("document.querySelector('#previewPause').textContent==='Reproducir con movimiento'");await delay(300);const a=await ev("document.querySelector('#scene canvas').toDataURL()");await delay(250);assert.equal(a,await ev("document.querySelector('#scene canvas').toDataURL()"));
  await call('Emulation.setEmulatedMedia',{features:[]});
  const block=await call('Page.addScriptToEvaluateOnNewDocument',{source:"const g=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return t==='webgl2'?null:g.call(this,t,...a)}"});await go('/crear.html?a='+id);await delay(800);await shot('fallback');await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:block.identifier});
  await go('/codigo.html?a='+id);await wait("!document.querySelector('#download').disabled");
  const monitor=await call('Page.addScriptToEvaluateOnNewDocument',{source:"window.expertContexts=[];const g=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){const c=g.call(this,t,...a);if(t==='webgl2'&&c&&!expertContexts.includes(c))expertContexts.push(c);return c;}"});
  await go('/animaciones.html');await delay(500);
  await ev(`(()=>{const c=document.querySelector('[data-id="${id}"]');c.scrollIntoView({block:'center'});c.dispatchEvent(new Event('pointerenter'));})()`);
  await wait('expertContexts.some(c=>!c.isContextLost())');await delay(300);const mini=await ev(`document.querySelector('[data-id="${id}"] canvas').toDataURL()`);await delay(300);report.previewAnimated=mini!==await ev(`document.querySelector('[data-id="${id}"] canvas').toDataURL()`);assert(report.previewAnimated);await shot('gallery-mobile');
  report.liveContexts=await ev('expertContexts.filter(c=>!c.isContextLost()).length');assert.equal(report.liveContexts,1);
  await ev("import('/js/gallery.js').then(m=>m.setGalleryPaused(true))");await delay(50);const frozen=await ev(`document.querySelector('[data-id="${id}"] canvas').toDataURL()`);await delay(200);assert.equal(frozen,await ev(`document.querySelector('[data-id="${id}"] canvas').toDataURL()`));
  await ev('scrollTo(0,0)');await wait('expertContexts.every(c=>c.isContextLost())');report.offscreenDisposed=true;await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:monitor.identifier});
 }
 if(process.argv.includes('--performance')){await go('/tools/new-expert-review.html?scene='+id);await wait('window.ready');report.performance=await ev('benchmark()');console.log('PERFORMANCE '+JSON.stringify(report.performance));}
 assert.equal(errors.length,0,errors.join('\n'));report.errors=errors;await writeFile(`${folder}/report.json`,JSON.stringify(report,null,2));console.log('PASS '+id);
 }
}finally{ws?.close();browser.kill();}
