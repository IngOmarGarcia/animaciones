import { spawn } from 'node:child_process';
import { mkdtemp,mkdir,readFile,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const profile=await mkdtemp(path.join(tmpdir(),'viralcss-adsense-'));
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--disable-gpu-sandbox','--remote-debugging-port=0',`--user-data-dir=${profile}`],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));let ws;
const local=process.argv.includes('--local'),final=process.argv.includes('--final'),base=local?'http://localhost:8080':'https://viralcss.com';
try {
let port;for(let i=0;i<100;i++){try{port=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await delay(100);}}
const version=await(await fetch(`http://127.0.0.1:${port}/json/version`)).json();ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
let serial=0;const pending=new Map();let errors=[],failed=[],requests=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push((m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text)+' @ '+m.params.exceptionDetails.url+':'+m.params.exceptionDetails.lineNumber);else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value||a.description).join(' '));else if(m.method==='Network.loadingFailed')failed.push({error:m.params.errorText,blocked:m.params.blockedReason});else if(m.method==='Network.responseReceived')requests.push({url:m.params.response.url,status:m.params.response.status,type:m.params.type});});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
const target=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true}),call=(m,p)=>send(m,p,sessionId);
await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.auditCLS=0;window.auditShifts=[];window.auditLCP=0;window.auditLong=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput){window.auditCLS+=e.value;window.auditShifts.push({value:e.value,time:e.startTime,sources:e.sources?.map(s=>({node:s.node?.id||s.node?.className||s.node?.tagName,previous:s.previousRect.toJSON(),current:s.currentRect.toJSON()}))});}})).observe({type:'layout-shift',buffered:true});new PerformanceObserver(l=>l.getEntries().forEach(e=>window.auditLCP=e.startTime)).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>window.auditLong.push(...l.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});`});
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
if(process.argv.includes('--expert-new')){
 await (await import('./new-expert-browser-check.mjs')).runNewExpert({call,ev,delay,getErrors:()=>errors});
} else if(process.argv.includes('--expert')){
 await (await import('./expert-browser-check.mjs')).runExpertChecks({call,ev,delay,getErrors:()=>errors});
} else if(process.argv.includes('--corrections')){
 await (await import('./adsense-corrections-check.mjs')).runCorrections({call,ev,delay,getErrors:()=>errors});
} else if(process.argv.includes('--assets')){
 await call('Page.navigate',{url:'http://localhost:8080/acerca.html'});await delay(1000);
 const assets=await ev(`(async()=>{const result=[];for(const [src,type,size] of [['/img/logo.png','image/webp',144],['/img/icon.png','image/png',48]]){const im=new Image();im.src=src;await im.decode();const c=document.createElement('canvas');c.width=size;c.height=type==='image/webp'?Math.round(size*im.height/im.width):size;c.getContext('2d').drawImage(im,0,0,c.width,c.height);result.push({src,width:c.width,height:c.height,data:c.toDataURL(type,1)});}return result;})()`);
 for(let i=0;i<assets.length;i++){const name=i?'img/favicon.png':'img/logo.webp';await writeFile(name,Buffer.from(assets[i].data.split(',')[1],'base64'));console.log(name,assets[i].width,assets[i].height);}
} else if(process.argv.includes('--logo')){
 await (await import('./logo-browser-check.mjs')).runLogoChecks({call,ev,delay,getErrors:()=>errors});
} else if(process.argv.includes('--logo-performance')){
 await (await import('./logo-performance-check.mjs')).runLogoPerformance({call,ev,delay,getErrors:()=>errors});
} else if(process.argv.includes('--scenes')){
 await call('Page.navigate',{url:'https://viralcss.com/tools/animation-qa.html'});
 for(let i=0;i<120;i++){await delay(1000);if(await ev("!!document.getElementById('result')?.textContent.trim()"))break;}
 const result=await ev("({status:document.getElementById('status')?.textContent,result:document.getElementById('result')?.textContent})");
 await mkdir('tools/review',{recursive:true});await writeFile('tools/review/adsense-public-scenes.json',JSON.stringify({result,errors,failed},null,2));console.log(JSON.stringify(result));
 const urls=await ev(`import('/js/share.js').then(m=>{const c=document.createElement('canvas');let img='';for(let size=192;size>=96;size-=4){c.width=c.height=size;const ctx=c.getContext('2d'),d=ctx.createImageData(size,size);for(let i=0;i<d.data.length;i+=4){d.data[i]=(i*17)%256;d.data[i+1]=(i*31)%251;d.data[i+2]=Math.random()*256;d.data[i+3]=255;}ctx.putImageData(d,0,0);img=c.toDataURL('image/jpeg',.55);if(img.length<=22000)break;}return [m.encodeCard({a:'retrato-historias',p:'Auditoría de enlace',m:'Prueba técnica de compartir'}),m.encodeCard({a:'jardin-de-lunas',p:'á'.repeat(40),m:'á'.repeat(140),d:'á'.repeat(40),lt:'á'.repeat(65),l:'á'.repeat(650),mem:'á'.repeat(1200),img})].map(s=>'https://viralcss.com/v?s='+s);})`);
 const links=[];for(const url of urls){const r=await fetch(url,{signal:AbortSignal.timeout(25000)});links.push({length:url.length,status:r.status});}console.log('Share limits',JSON.stringify(links));await writeFile('tools/review/adsense-share-limits.json',JSON.stringify(links));
 await call('Page.navigate',{url:urls[0]});await delay(2500);await ev("document.getElementById('openBtn')?.click()");await delay(8500);const shared=await ev("({title:document.title,gate:document.getElementById('gate')?.className,canvases:document.querySelectorAll('canvas').length,overflow:document.documentElement.scrollWidth>innerWidth+1})");console.log('Public shared scene',JSON.stringify(shared));
} else {
const focused=process.argv.includes('--focused');
const errorOnly=process.argv.includes('--errors');
const termsOnly=process.argv.includes('--terms');
const routes=termsOnly?['/terminos.html','/acerca.html','/codigo.html?a=ramo-flores-amarillas']:errorOnly?['/v.html?s=roto']:focused?['/','/crear.html?a=retrato-historias']:['/','/animaciones.html','/categorias/futbol.html','/categorias/muertos.html','/animaciones/mansion-imposible.html','/animaciones/retrato-historias.html','/acerca.html','/privacidad.html','/sugerencias.html','/crear.html?a=retrato-historias','/v.html?s=roto','/no-existe-auditoria'];
const folder=final?'tools/review/adsense-final':local?'tools/review/adsense-after':'tools/review/adsense';
const results=[];await mkdir(folder,{recursive:true});
for(const width of focused?[1365]:[390,1365]){
await call('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width===390});
for(let i=0;i<routes.length;i++){
errors=[];failed=[];requests=[];await call('Page.navigate',{url:base+routes[i]});await delay(3500);
if(routes[i].startsWith('/animaciones/')){await ev("document.getElementById('detail-play')?.click()");await delay(4500);}
const data=await ev(`(()=>{const nav=performance.getEntriesByType('navigation')[0];const visible=e=>!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length);return {url:location.href,title:document.title,h1:[...document.querySelectorAll('h1')].map(e=>e.textContent),overflow:document.documentElement.scrollWidth>innerWidth+1,cls:window.auditCLS,lcp:window.auditLCP,longTasks:window.auditLong,load:nav?.loadEventEnd,resources:performance.getEntriesByType('resource').map(e=>({name:e.name,bytes:e.transferSize,decoded:e.decodedBodySize,duration:e.duration})),canvases:document.querySelectorAll('canvas').length,unnamedControls:[...document.querySelectorAll('button,a[href],input,select,textarea')].filter(visible).filter(e=>!e.textContent.trim()&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')&&!(e.labels?.length)&&!e.value).map(e=>e.outerHTML.slice(0,160)),missingAlt:[...document.images].filter(e=>!e.hasAttribute('alt')).map(e=>e.src),links:[...document.querySelectorAll('footer a')].map(e=>({label:e.textContent,url:e.href})),scripts:[...document.scripts].map(e=>e.src).filter(Boolean)};})()`);
data.shifts=await ev('window.auditShifts');data.width=width;data.errors=[...errors];data.failed=[...failed];data.badResponses=requests.filter(r=>r.status>=400);results.push(data);
if(termsOnly||[0,1,4,5,6,7,8,9].includes(i)){const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(`${folder}/${width}-${termsOnly?'terms-'+i:errorOnly?'error':i}.png`,Buffer.from(shot.data,'base64'));}
if(i===0&&!errorOnly){await ev('scrollTo(0,document.body.scrollHeight)');await delay(500);const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(`${folder}/${width}-${termsOnly?'terms-footer':'footer'}.png`,Buffer.from(shot.data,'base64'));}
console.log(JSON.stringify({width,route:routes[i],overflow:data.overflow,cls:data.cls,lcp:Math.round(data.lcp),errors:data.errors.length,bad:data.badResponses.length,bytes:data.resources.reduce((s,r)=>s+r.bytes,0),long:data.longTasks.filter(x=>x>100).length}));
}}
await writeFile(`tools/review/adsense-browser${final?'-final':local?'-after':''}${termsOnly?'-terms':errorOnly?'-errors':focused?'-focused':''}.json`,JSON.stringify(results,null,2));
}
}finally{ws?.close();browser.kill();await delay(500);if(!path.resolve(profile).startsWith(path.resolve(tmpdir())+path.sep))throw Error('Perfil temporal fuera del directorio esperado');await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:300}).catch(()=>{});}
