import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
export async function runExpertChecks({call,ev,delay,getErrors}){
 await mkdir('tools/review/expert',{recursive:true});
 const wait=async expr=>{for(let i=0;i<100;i++){if(await ev(expr))return;await delay(150);}throw Error('Timeout: '+expr);};
 if(process.argv.includes('--flows'))return runFlows({call,ev,delay,getErrors,wait});
 if(process.argv.includes('--performance')){
  await call('Page.navigate',{url:'http://localhost:8080/tools/expert-review.html'});await wait('window.ready===true');
  const high=await ev('benchmarkBloom()'),low=await ev('benchmarkBloom({low:true})'),controls=await ev('checkBloomControls()');assert(controls.parallax);assert.equal(controls.adaptive.quality,'low');
  await ev('loseBloom()');await delay(100);assert(await ev('lostBloomFails()'));
  await ev('disposeBloom()');await delay(100);const disposed=await ev('bloomStats()');assert(disposed.disposed&&disposed.contextLost);
  const report={high,low,controls,disposed,errors:getErrors()};await writeFile('tools/review/expert/performance-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));assert.equal(disposed.geometries,0);assert.equal(report.errors.length,0,JSON.stringify(report.errors));return;
 }
 await call('Page.navigate',{url:'http://localhost:8080/tools/expert-review.html'});await wait('window.ready===true');
 const report=[];
 for(const t of [0,2.8,5.5,8.25,12,6.37,14.2]){
  const stats=await ev(`drawBloom({time:${t},w:540,h:960})`);report.push({t,stats});await call('Emulation.setDeviceMetricsOverride',{width:540,height:960,deviceScaleFactor:1,mobile:true});
  await delay(150);const shot=await call('Page.captureScreenshot',{format:'png'});await writeFile(`tools/review/expert/frame-${t}.png`,Buffer.from(shot.data,'base64'));console.log(JSON.stringify({t,stats}));
 }
 await ev('drawBloom({time:12,w:720,h:1280})');const data=await ev('posterData()');await writeFile('img/eternal-bloom.webp',Buffer.from(data.split(',')[1],'base64'));
 await call('Emulation.setDeviceMetricsOverride',{width:1365,height:900,deviceScaleFactor:1,mobile:false});await ev('drawBloom({time:12,w:1365,h:900})');const shot=await call('Page.captureScreenshot',{format:'png'});await writeFile('tools/review/expert/desktop.png',Buffer.from(shot.data,'base64'));
 await ev('disposeBloom()');await writeFile('tools/review/expert/render-report.json',JSON.stringify({report,errors:getErrors()},null,2));assert.equal(getErrors().length,0,JSON.stringify(getErrors()));
}

async function runFlows({call,ev,delay,getErrors,wait}){
 const go=async path=>{await call('Page.navigate',{url:'http://localhost:8080'+path});await delay(900);};
 const shot=async name=>{const s=await call('Page.captureScreenshot',{format:'png'});await writeFile(`tools/review/expert/${name}.png`,Buffer.from(s.data,'base64'));};
 const report={};
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
 await go('/');await delay(800);
 report.home=await ev("({expert:!!document.querySelector('[data-id=eternal-bloom]'),heavy:performance.getEntriesByType('resource').filter(r=>/three\.(?:module|core)/.test(r.name)).length,overflow:document.documentElement.scrollWidth>innerWidth+1})");assert(report.home.expert&&report.home.heavy<=2&&!report.home.overflow);
 await go('/crear.html?a=eternal-bloom');await wait("document.querySelector('#previewPause').textContent==='Pausar vista previa'");
 assert(await ev("!document.querySelector('.code-link').hidden && ![...document.querySelectorAll('button')].some(b=>b.disabled&&b.textContent.includes('Obtener código fuente'))"));
 const token=await ev(`(async()=>{const {encodeCard}=await import('/js/share.js');return encodeCard({a:'eternal-bloom',p:'Para Elena',m:'Para ti, que haces florecer mi mundo',d:'Con amor',f:'classic',tm:'custom'});})()`);
 await go('/crear.html?s='+token);await delay(1500);report.editor=await ev("({name:document.querySelector('[name=p]').value,message:document.querySelector('[name=m]').value,signature:document.querySelector('[name=d]').value,overflow:document.documentElement.scrollWidth>innerWidth+1,cls:window.auditCLS})");assert.equal(report.editor.name,'Para Elena');assert(!report.editor.overflow);await shot('editor-mobile');
 const shared=await ev("(()=>{document.querySelector('#form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return document.querySelector('#link').value})()");
 report.shared=await ev(`import('/js/share.js').then(m=>m.decodeCard(new URL(${JSON.stringify(shared)}).searchParams.get('s')))`);
 assert.equal(report.shared.a,'eternal-bloom');assert.equal(report.shared.m,'Para ti, que haces florecer mi mundo');assert.equal(report.shared.d,'Con amor');assert.equal(report.shared.f,'classic');
 assert(await ev("document.querySelector('#wa').href.includes('Eternal%20Bloom')"));
 await call('Emulation.setDeviceMetricsOverride',{width:320,height:740,deviceScaleFactor:2,mobile:true});await delay(400);
 report.resize=await ev("({overflow:document.documentElement.scrollWidth>innerWidth+1,pixels:document.querySelector('#scene canvas').width,cssWidth:document.querySelector('#scene canvas').getBoundingClientRect().width})");assert(!report.resize.overflow);assert.equal(report.resize.pixels,Math.round(report.resize.cssWidth*2));
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
 // Immediate restart must retain the previous pixels at t=0, then fade gently.
 await go('/tools/expert-review.html');await wait('window.ready');
 await ev("drawFull({card:{a:'eternal-bloom',p:'Elena',m:'Tu presencia transforma cada día en una oportunidad para crecer, descubrir y volver a florecer. Gracias por compartir este viaje conmigo.',d:'Con todo mi cariño',f:'classic'}})");await shot('long-mobile');
 await ev("drawFull({card:{a:'eternal-bloom',tm:'none'}})");await shot('no-text-mobile');
 await call('Emulation.setDeviceMetricsOverride',{width:1365,height:900,deviceScaleFactor:1,mobile:false});await ev("drawFull({w:1365,h:900,card:{a:'eternal-bloom',p:'Elena',m:'Para ti, que haces florecer mi mundo',d:'Con amor',f:'classic'}})");await shot('message-desktop');
 report.lifecycle=await ev(`(async()=>{const {createPlayer}=await import('/js/anim/engine.js'),{default:create}=await import('/js/anim/eternal-bloom.js');const canvas=document.createElement('canvas');canvas.style.cssText='width:260px;height:462px';document.body.append(canvas);const player=createPlayer(canvas,create,{card:{a:'eternal-bloom',m:'Prueba de repetición'}});player.play();await new Promise(r=>setTimeout(r,900));player.pause();const before=canvas.toDataURL();player.restart();const retained=before===canvas.toDataURL();const stats=player.stage.diagnostics;player.destroy();canvas.remove();return {retained,stats,disposed:player.stage.onDispose===null};})()`);assert(report.lifecycle.retained&&report.lifecycle.disposed);
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await go('/crear.html?s='+token);await wait("document.querySelector('#previewPause').textContent==='Reproducir con movimiento'");await delay(500);
 const before=await ev("document.querySelector('#scene canvas').toDataURL()");await delay(400);assert.equal(await ev("document.querySelector('#scene canvas').toDataURL()"),before);report.reduced=await ev("document.querySelector('[data-accessible-dedication]').textContent");assert(report.reduced.includes('Para Elena')&&report.reduced.includes('Con amor'));await shot('reduced');
 await ev("(()=>{const f=document.querySelector('#form').elements;f.tm.value='none';f.tm.dispatchEvent(new Event('change',{bubbles:true}));})()");assert(await ev("document.querySelector('[data-accessible-dedication]').hidden"));report.noTextAccessible=true;
 await call('Emulation.setEmulatedMedia',{features:[]});
 await go('/v.html?s='+token);await ev("document.querySelector('#openBtn').click()");await delay(1400);assert(await ev("document.querySelector('#gate').classList.contains('hide')"));report.viewer=true;
 await go('/codigo.html?a=eternal-bloom');await wait("!document.querySelector('#download').disabled");report.codeDownload=true;
 const blocked=await call('Page.addScriptToEvaluateOnNewDocument',{source:"const native=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...args){return t==='webgl2'?null:native.call(this,t,...args)}"});
 await go('/crear.html?s='+token);await delay(1500);report.fallback=await ev("(()=>{const c=document.querySelector('#scene canvas'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let lit=0;for(let i=0;i<data.length;i+=4)if(Math.max(data[i],data[i+1],data[i+2])>35)lit++;return lit>1000;})()");assert(report.fallback);await shot('fallback');await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:blocked.identifier});
 report.errors=getErrors();assert.equal(report.errors.length,0,JSON.stringify(report.errors));await writeFile('tools/review/expert/flows-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
