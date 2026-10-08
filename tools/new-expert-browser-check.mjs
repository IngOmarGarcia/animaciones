import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
export async function runNewExpert({call,ev,delay,getErrors}){
 const id=process.argv.find(s=>s.startsWith('--scene='))?.split('=')[1]||'soul-butterfly',folder=`tools/review/${id}`;
 await mkdir(folder,{recursive:true});
 const wait=async expression=>{for(let i=0;i<180;i++){if(await ev(expression))return;await delay(100);}throw Error('Timeout '+expression);};
 const go=async path=>{await call('Page.navigate',{url:'http://127.0.0.1:8080'+path});await delay(250);await wait("document.readyState==='complete'");};
 const shot=async name=>{const s=await call('Page.captureScreenshot',{format:'png'});await writeFile(`${folder}/${name}.png`,Buffer.from(s.data,'base64'));};
 await go('/tools/new-expert-review.html?scene='+id);await wait('window.ready');
 const report={id,frames:[]};
 const times=id==='soul-butterfly'?[0,3.5,6,8.6,11.7,14.5,20]:id==='event-horizon'?[0,2.8,5.5,8.2,11.4,16,20]:[0,2,4.5,7,10,14,20];
 for(const t of times){await call('Emulation.setDeviceMetricsOverride',{width:540,height:960,deviceScaleFactor:1,mobile:true});const stats=await ev(`drawScene({t:${t},w:540,h:960,card:{m:'Una luz para recordar'}})`);assert.equal(stats.renderer,'three-webgl2');await shot('frame-'+t);report.frames.push({t,stats});console.log(id,t,JSON.stringify(stats));}
 await ev('drawScene({t:20,w:720,h:1280,card:{m:"",tm:"none"}})');const poster=await ev('posterData()');await writeFile(`img/${id}.webp`,Buffer.from(poster.split(',')[1],'base64'));
 await ev("drawScene({t:20,w:390,h:693,full:true,card:{p:'Para Elena',m:'Tu presencia transforma cada día en una oportunidad para descubrir, sentir y compartir. Gracias por acompañar este viaje conmigo.',d:'Con cariño',f:'classic'}})");await call('Emulation.setDeviceMetricsOverride',{width:390,height:693,deviceScaleFactor:1,mobile:true});await shot('long-mobile');
 await call('Emulation.setDeviceMetricsOverride',{width:1365,height:900,deviceScaleFactor:1,mobile:false});await ev('drawScene({t:20,w:1365,h:900,full:true,card:{p:"Para ti",m:"Un instante que permanece",d:"Con cariño",f:"classic"}})');await shot('desktop');
 if(process.argv.includes('--performance')){
  report.high=await ev('benchmark()');report.low=await ev('benchmark({low:true})');report.desktop=await ev('benchmark({w:1365,h:900})');
  if(id==='crystal-heartbeat')report.assembly=await ev('benchmark({t:4.5})');
  report.controls=await ev('checkControls()');assert(report.controls.parallax);assert.equal(report.controls.adaptive.quality,'low');assert(report.controls.disposed.contextLost&&report.controls.disposed.geometries===0);console.log(JSON.stringify({high:report.high,low:report.low,desktop:report.desktop,assembly:report.assembly,controls:report.controls}));
 }
 report.lifecycle=await ev('checkLifecycle()');assert(report.lifecycle.paused&&report.lifecycle.replayPreserved&&report.lifecycle.resized&&report.lifecycle.disposed,JSON.stringify(report.lifecycle));
 await ev('disposeScene()');
 // Actual integration: editor submission, personalized viewer, reduced motion,
 // code-page redirect and unsupported-WebGL fallback.
 await go('/crear.html?a='+id);await ev("import('/js/crear.js')");await wait("document.body.classList.contains('cinematic-experience')&&document.querySelector('#previewPause').textContent==='Pausar vista previa'");
 const editorState=await ev("({url:location.href,title:document.querySelector('#title').textContent,codeHidden:document.querySelector('.code-link').hidden,source:[...document.querySelectorAll('button')].some(b=>b.disabled&&b.textContent.includes('Obtener código fuente'))})");console.log(JSON.stringify(editorState));assert(!editorState.codeHidden&&!editorState.source,JSON.stringify(editorState));
 const share=await ev("(()=>{const f=document.querySelector('#form');f.elements.tm.value='custom';f.elements.p.value='Para Elena';f.elements.m.value='Nuestro instante';f.elements.d.value='Familia';f.elements.f.value='classic';f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return document.querySelector('#link').value})()");
 report.shared=await ev(`import('/js/share.js').then(m=>m.decodeCard(new URL(${JSON.stringify(share)}).searchParams.get('s')))`);assert.equal(report.shared.a,id);assert.equal(report.shared.m,'Nuestro instante');assert.equal(report.shared.d,'Familia');
 report.cls=await ev('window.auditCLS');report.overflow=await ev('document.documentElement.scrollWidth>innerWidth+1');assert(!report.overflow);
 await go('/animaciones/'+id+'.html');await ev("import('/js/detail.js')");await ev("document.querySelector('#detail-play').click()");await wait("!document.querySelector('#detail-pause').hidden");await ev("document.querySelector('#detail-pause').click()");assert.equal(await ev("document.querySelector('#detail-pause').textContent"),'Continuar');await ev("document.querySelector('#detail-replay').click()");
 await go('/v.html?autoplay=1&s='+new URL(share).searchParams.get('s'));await wait("!document.querySelector('#viewerPause').hidden");assert(!await ev("document.querySelector('.after-code').hidden"));
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await go('/crear.html'+new URL(share).search);await wait("document.querySelector('#previewPause').textContent==='Reproducir con movimiento'");await delay(200);const before=await ev("document.querySelector('#scene canvas').toDataURL()");await delay(300);assert.equal(await ev("document.querySelector('#scene canvas').toDataURL()"),before);report.accessible=await ev("document.querySelector('[data-accessible-dedication]').textContent");assert(report.accessible.includes('Nuestro instante'));
 await ev("(()=>{const f=document.querySelector('#form');f.elements.tm.value='none';f.elements.tm.dispatchEvent(new Event('change',{bubbles:true}));})()");assert(await ev("document.querySelector('[data-accessible-dedication]').hidden"));
 await call('Emulation.setEmulatedMedia',{features:[]});await go('/codigo.html?a='+id);await wait("!document.querySelector('#download').disabled");
 const monitor=await call('Page.addScriptToEvaluateOnNewDocument',{source:"window.expertContexts=[];const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){const c=get.call(this,type,...args);if(type==='webgl2'&&c&&!window.expertContexts.includes(c))window.expertContexts.push(c);return c;}"});
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await go('/animaciones.html');
 await ev("import('/js/gallery.js').then(m=>m.enhanceGallery(document.querySelector('[data-gallery]')))");
 await ev(`(()=>{const c=document.querySelector('[data-id="${id}"]');c.scrollIntoView({block:'center'});c.dispatchEvent(new Event('pointerenter'));})()`);await delay(500);
 await wait('expertContexts.some(c=>!c.isContextLost())');const miniature=await ev(`document.querySelector('[data-id="${id}"] canvas').toDataURL()`);await delay(350);
 report.previewAnimated=miniature!==await ev(`document.querySelector('[data-id="${id}"] canvas').toDataURL()`);assert(report.previewAnimated);
 report.liveContexts=await ev('expertContexts.filter(c=>!c.isContextLost()).length');assert.equal(report.liveContexts,1);await shot('gallery-mobile');
 await ev("import('/js/gallery.js').then(m=>m.setGalleryPaused(true))");await delay(50);const frozen=await ev(`document.querySelector('[data-id="${id}"] canvas').toDataURL()`);await delay(200);assert.equal(await ev(`document.querySelector('[data-id="${id}"] canvas').toDataURL()`),frozen);
 await ev('scrollTo(0,0)');await delay(350);report.offscreenContexts=await ev('expertContexts.filter(c=>!c.isContextLost()).length');assert.equal(report.offscreenContexts,0);
 await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:monitor.identifier});
 await call('Emulation.setDeviceMetricsOverride',{width:1365,height:900,deviceScaleFactor:1,mobile:false});await go('/animaciones.html');await ev("document.querySelector('[data-gallery]').scrollIntoView({block:'start'})");await delay(500);await shot('gallery-desktop');
 const block=await call('Page.addScriptToEvaluateOnNewDocument',{source:"const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args)}"});await go('/crear.html'+new URL(share).search);await delay(1000);
 assert(await ev("(()=>{const c=document.querySelector('#scene canvas'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let lit=0;for(let i=0;i<p.length;i+=4)if(Math.max(p[i],p[i+1],p[i+2])>35)lit++;return lit>1000})()"));await shot('fallback');await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:block.identifier});
 report.errors=getErrors();await writeFile(`${folder}/report.json`,JSON.stringify(report,null,2));assert.equal(report.errors.length,0,JSON.stringify(report.errors));console.log(JSON.stringify({passed:true,id,errors:0,cls:report.cls}));
}
