import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {EXPERT_ANIMATIONS} from '../js/expert-catalog.js';
import {getAnimation} from '../js/catalog.js';
const folder=path.resolve('tools/review/catalog-integration');await mkdir(folder,{recursive:true});
const downloadFolder=path.join(folder,'downloads-'+Date.now());await mkdir(downloadFolder,{recursive:true});
const profile=await mkdtemp(path.join(tmpdir(),'catalog-qa-')),delay=ms=>new Promise(r=>setTimeout(r,ms));
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--disable-gpu-sandbox','--remote-debugging-port=0',`--user-data-dir=${profile}`],{windowsHide:true,stdio:'ignore'});
let ws,server;
try{
 let version;for(let i=0;i<100;i++){try{const port=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];version=await(await fetch(`http://127.0.0.1:${port}/json/version`)).json();break;}catch{await delay(100);}}
 assert(version);ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let serial=0;const pending=new Map(),errors=[],requests=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);});
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
 const target=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true}),call=(m,p)=>send(m,p,sessionId);
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
 await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloadFolder});
 const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const wait=async expression=>{for(let i=0;i<250;i++){if(await ev(expression))return;await delay(100);}throw Error('Timeout '+expression+' '+errors.join('\n'));};
 const go=async url=>{await call('Page.navigate',{url:url.startsWith('http')?url:'http://127.0.0.1:8080'+url});await delay(200);await wait("document.readyState==='complete'");};
 const shot=async name=>{const s=await call('Page.captureScreenshot',{format:'png'});await writeFile(path.join(folder,name+'.png'),Buffer.from(s.data,'base64'));};
 const report={scenes:[],errors};
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await go('/animaciones.html');assert(!await ev("document.body.innerText.includes('Expert Zone')"));
 for(const entry of EXPERT_ANIMATIONS){
  const anim=getAnimation(entry.id),id=anim.id,item={id,category:anim.category,colors:[]};
  assert(await ev(`!!document.querySelector('[data-id="${id}"]')`));
  report.scenes.push(item);
 }
 await go('/categorias/expert-zone.html');await wait("location.pathname==='/animaciones.html'");report.legacyCategory=true;
 const discovery=process.argv.includes('--discovery-only');
 if(discovery){
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  for(const item of report.scenes){
   await go('/animaciones.html');
   await ev(`(()=>{const c=document.querySelector('[data-id="${item.id}"]');c.scrollIntoView({block:'center'});c.dispatchEvent(new Event('pointerenter'));})()`);
   await ev("import('/js/gallery.js').then(m=>m.setGalleryPaused(false,{userInitiated:true}))");
   await wait(`document.querySelector('[data-id="${item.id}"] canvas').width!==300&&!document.querySelector('[data-id="${item.id}"]').dataset.loading`);await delay(300);
   assert(!await ev(`!!document.querySelector('[data-id="${item.id}"]').dataset.failed`));
   const first=await ev(`document.querySelector('[data-id="${item.id}"] canvas').toDataURL()`);
   item.animatedMiniature=false;for(let frame=0;frame<30;frame++){await delay(200);if(first!==await ev(`document.querySelector('[data-id="${item.id}"] canvas').toDataURL()`)){item.animatedMiniature=true;break;}}
   if(item.id!=='eternal-bloom')assert(item.animatedMiniature,item.id+' miniature frozen');
   await shot(item.id+'-gallery');
   await go('/animaciones/'+item.id+'.html');await ev("document.querySelector('#detail-play').click()");await wait("!document.querySelector('#detail-pause').hidden");await ev("document.querySelector('#detail-pause').click()");assert.equal(await ev("document.querySelector('#detail-pause').textContent"),'Continuar');await ev("document.querySelector('#detail-replay').click()");item.detailPreview=true;
   console.log('PASS discovery '+item.id);
  }
 }
 const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7);
 for(const item of report.scenes.filter(s=>!discovery&&(!only||s.id===only))){
  const {id}=item,anim=getAnimation(id),t=id==='soul-butterfly'?12:22,base={p:'Para Luna',m:'Una noche de luz',d:'Familia',__demo:true};
  await go('/tools/new-expert-review.html?scene='+id);await wait('window.ready');
  await ev(`drawScene({t:${t},w:390,h:693,card:${JSON.stringify(base)}})`);
  // Existing optical sweep uniforms become available after first compilation.
  for(let warm=0;warm<3;warm++)await ev(`stepScene(${t},${JSON.stringify(base)})`);
  const original=await ev('sceneSignature()');assert.equal(original.stats.renderer,'three-webgl2',JSON.stringify(original));await shot(id+'-original');
  // Same renderer, same time: changed pixels and stable resource/program counts.
  for(const c of anim.colorControls.filter(c=>c.key!=='c5')){
   const card={...base,[c.key]:'#36e867'};
   await ev(`stepScene(${t},${JSON.stringify(card)})`);const changed=await ev('sceneSignature()');
   assert.notEqual(changed.hash,original.hash,id+' '+c.key+' has no pixel effect');
   assert.equal(changed.stats.geometries,original.stats.geometries,id+' geometry recreation');assert.equal(changed.stats.programs,original.stats.programs,id+' shader recompilation');
   await ev(`stepScene(${t},${JSON.stringify(base)})`);const restored=await ev('sceneSignature()');assert.equal(restored.hash,original.hash,id+' '+c.key+' reset mismatch');item.colors.push({key:c.key,pixelsChanged:true,resourcesStable:true,restored:true});
  }
  await ev(`drawScene({t:22,w:390,h:693,full:true,card:${JSON.stringify({...base,__still:true})}})`);const textBefore=await ev('sceneSignature()');
  await ev(`drawScene({t:22,w:390,h:693,full:true,card:${JSON.stringify({...base,__still:true,c5:'#36e867'})}})`);assert.notEqual((await ev('sceneSignature()')).hash,textBefore.hash,id+' text has no effect');item.colors.push({key:'c5',pixelsChanged:true});
  const palette=Object.fromEntries(anim.colorControls.map((c,i)=>[c.key,['#649cff','#ffbd69','#65e1ba','#ac83ff','#fff3dd','#070c19'][i]]));
  await ev(`drawScene({t:22,w:390,h:693,full:true,card:${JSON.stringify({...base,...palette,__still:true})}})`);await shot(id+'-custom');await ev('disposeScene()');
  await call('Emulation.setDeviceMetricsOverride',{width:1365,height:900,deviceScaleFactor:1,mobile:false});
  await ev(`drawScene({t:22,w:1365,h:900,full:true,card:${JSON.stringify({...base,...palette,__still:true})}})`);await shot(id+'-desktop');assert(!await ev('document.documentElement.scrollWidth>innerWidth+1'));await ev('disposeScene()');
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  if(id==='haunted-night'){
   await ev('drawScene({t:18,card:{__cast:0}})');const button=await ev('stepScene(18,{__cast:1})');assert.equal(button.toggled,1);const tap={...button.firstWindow,seq:1};assert.equal((await ev(`stepScene(18,{__cast:1,__tap:${JSON.stringify(tap)}})`)).toggled,2);item.specialInteraction='window button and raycast';
  }
  if(id==='dark-spell'){
   await ev("drawScene({t:12,card:{p:'Luna',__cast:0}})");await ev("stepScene(13,{p:'Luna',__cast:1})");const spell=await ev("stepScene(20,{p:'Luna',__cast:1})");assert.equal(spell.activationCount,1);assert.equal(spell.spellReveal,1);item.specialInteraction='spell activation and reveal';
  }
  item.lifecycle=await ev('checkLifecycle()');assert(Object.values(item.lifecycle).every(Boolean),id+' lifecycle');
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await go('/crear.html?a='+id);await wait("document.body.classList.contains('cinematic-experience')&&document.querySelector('#previewPause').textContent==='Reproducir con movimiento'");
  assert(!await ev("document.querySelector('.code-link').hidden"));assert(!await ev("document.body.innerText.includes('Próximamente')"));assert.equal(await ev("document.querySelectorAll('#colorInputs input').length"),anim.colorControls.length);
  const share=await ev(`(()=>{const f=document.querySelector('#form');document.querySelector('#colorsEnabled').checked=true;for(const [k,v]of Object.entries(${JSON.stringify(palette)}))f.elements[k].value=v;f.elements.tm.value='custom';f.elements.p.value='Para Luna';f.elements.m.value='Una noche de luz';f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return document.querySelector('#link').value})()`);
  const shared=await ev(`import('/js/share.js').then(m=>m.decodeCard(new URL(${JSON.stringify(share)}).searchParams.get('s')))`);for(const [key,value]of Object.entries(palette))assert.equal(shared[key],value);item.share=true;
  await ev("document.querySelector('#colorInputs').scrollIntoView({block:'center'})");await shot(id+'-editor');assert(!await ev('document.documentElement.scrollWidth>innerWidth+1'));
  await ev("document.querySelector('#resetColors').click()");assert(!await ev("document.querySelector('#colorsEnabled').checked"));for(const c of anim.colorControls)assert.equal(await ev(`document.querySelector('[name="${c.key}"]').value`),c.value);
  await go('/crear.html?s='+new URL(share).searchParams.get('s'));await wait("!document.querySelector('#animationColors').hidden");for(const [key,value]of Object.entries(palette))assert.equal(await ev(`document.querySelector('[name="${key}"]').value`),value);item.editorRoundtrip=true;
  await go(share+'&autoplay=1');await wait("!document.querySelector('#viewerPause').hidden");assert(!await ev("document.querySelector('.after-code').hidden"));await shot(id+'-viewer');
  await go('/codigo.html?s='+new URL(share).searchParams.get('s'));await wait("!document.querySelector('#download').disabled");assert.equal(await ev("document.querySelector('#download').textContent"),'Descargar proyecto .zip');await ev("document.querySelector('#download').click()");
  for(let i=0;i<100;i++){try{if((await stat(path.join(downloadFolder,id+'.zip'))).size>100000)break;}catch{}await delay(100);}
  assert((await stat(path.join(downloadFolder,id+'.zip'))).size>100000);item.browserDownload=true;
  // Read the actual browser download, not an independently assembled fixture.
  const projectRoot=path.join(downloadFolder,id),downloaded=await readFile(path.join(downloadFolder,id+'.zip'));let cursor=0,downloadCard;
  while(downloaded.readUInt32LE(cursor)===0x04034b50){const size=downloaded.readUInt32LE(cursor+18),nameSize=downloaded.readUInt16LE(cursor+26),extra=downloaded.readUInt16LE(cursor+28),name=downloaded.toString('utf8',cursor+30,cursor+30+nameSize),start=cursor+30+nameSize+extra;
   assert.equal(downloaded.readUInt16LE(cursor+8),0,'Expected stored ZIP');assert(/^[\w./-]+$/.test(name)&&!name.includes('..'),'Safe ZIP path');
   const target=path.join(projectRoot,name);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,downloaded.subarray(start,start+size));
   if(name==='config.json')downloadCard=JSON.parse(downloaded.toString('utf8',start,start+size));cursor=start+size;
  }
  for(const [key,value]of Object.entries(palette))assert.equal(downloadCard[key],value,id+' downloaded color '+key);assert.equal(downloadCard.m,'Una noche de luz');item.downloadedConfiguration=true;
  await call('Emulation.setEmulatedMedia',{features:[]});
  // Independently extracted ZIP, own bundled server, no ViralCSS document root.
  server=spawn(process.execPath,[path.join(projectRoot,'serve.cjs'),'8081'],{cwd:projectRoot,windowsHide:true,stdio:'ignore'});
  let ready=false;for(let i=0;i<100;i++){try{const r=await fetch('http://127.0.0.1:8081');if(r.ok){ready=true;break;}}catch{}await delay(100);}assert(ready,'Export server');
  const marker=requests.length;await go('http://127.0.0.1:8081/');await wait("window.animationPlayer?.stage.diagnostics?.renderer==='three-webgl2'");await delay(400);await ev('animationPlayer.pause()');const exported=await ev('animationPlayer.stage.diagnostics');assert.equal(exported.renderer,'three-webgl2');if(id==='haunted-night')assert(exported.environmentAssets.ready);
  for(const [key,value]of Object.entries(palette))assert.equal(exported.palette[key],value,id+' exported renderer palette');
  const outside=requests.slice(marker).filter(u=>/^https?:/.test(u)&&new URL(u).port!=='8081');assert.deepEqual(outside,[],id+' external requests');item.exportOffline=true;
  const config=await ev("fetch('/config.json').then(r=>r.json())");assert.equal(config.p,'Para Luna');assert.equal(config.m,'Una noche de luz');for(const [key,value]of Object.entries(palette))assert.equal(config[key],value);
  await ev('animationPlayer.restart();animationPlayer.play()');await delay(100);await shot(id+'-export');
  await ev('window.animationPlayer?.destroy()');await call('Page.navigate',{url:'about:blank'});server.kill();server=null;await delay(100);
  console.log('PASS '+id);
 }
 assert.equal(errors.length,0,errors.join('\n'));await writeFile(path.join(folder,discovery?'discovery-report.json':'report.json'),JSON.stringify(report,null,2));console.log(discovery?'PASS miniatures and detail previews':'PASS catalog, palette, sharing, ZIP and isolated exports');
}finally{ws?.close();server?.kill();browser.kill();}
