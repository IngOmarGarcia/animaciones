import {TURTLE_ANIMATIONS} from '../js/turtle-catalog.js';
import { spawn } from 'node:child_process';
import { mkdtemp,readFile,mkdir,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
if(process.argv.includes('--all')) {
  for(let scene=0;scene<TURTLE_ANIMATIONS.length;scene++)await new Promise((resolve,reject)=>{
    const check=spawn(process.execPath,[process.argv[1],'--scene',String(scene)],{windowsHide:true,stdio:'inherit'});
    check.on('error',reject);check.on('exit',code=>code===0?resolve():reject(Error(`Falló la escena ${scene}: ${code}`)));
  });
  process.exit(0);
}
const profile=await mkdtemp(path.join(tmpdir(),'viralcss-cinema-'));
const child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--disable-background-networking','--disable-extensions','--enable-unsafe-swiftshader','--no-startup-window','--remote-debugging-port=0',`--user-data-dir=${profile}`],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let ws;
try{let port;for(let i=0;i<100;i++){try{port=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await sleep(100);}}if(!port)throw Error('Chrome no iniciÃ³');
const version=await(await fetch(`http://127.0.0.1:${port}/json/version`)).json();ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let id=0;const pending=new Map(),errors=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const serial=++id;pending.set(serial,{resolve,reject});ws.send(JSON.stringify({id:serial,method,params,...(sessionId?{sessionId}:{})}));});
const target=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true}),call=(m,p)=>send(m,p,sessionId);
await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:1200,height:844,deviceScaleFactor:1,mobile:false});await call('Page.navigate',{url:'http://127.0.0.1:8080/tools/turtle-review.html'});
const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression: `(async()=>{${expression}})()`,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
for(let i=0;i<100;i++){if(await evaluate('return window.ready'))break;await sleep(100);}
const index=Number(process.argv[process.argv.indexOf('--scene')+1]||0),out='tools/review/cinema';await mkdir(out,{recursive:true});const report=[];
for(const time of [0,3,6,9,12,4.37,7.83]){report.push(await evaluate(`await draw({start:${index},count:1,time:${time},w:390,h:844});document.getElementById('grid').style.gridTemplateColumns='390px';return frames[0].stage.diagnostics`));const r=await call('Page.captureScreenshot',{format:'png'});await writeFile(`${out}/${index}-${time}.png`,Buffer.from(r.data,'base64'));}
await call('Emulation.setDeviceMetricsOverride',{width:1365,height:900,deviceScaleFactor:1,mobile:false});await evaluate(`await draw({start:${index},count:1,time:9,w:1365,h:900,long:true});document.getElementById('grid').style.gridTemplateColumns='1fr'`);let shot=await call('Page.captureScreenshot',{format:'png'});await writeFile(`${out}/${index}-desktop.png`,Buffer.from(shot.data,'base64'));
await evaluate(`await draw({start:${index},count:1,time:9,noText:true});frames[0].stage.onPointerDown({});frames[0].stage.holding=true;frames[0].stage.pointer={x:.8,y:.6};frames[0].frame(10,.016);frames[0].stage.holding=false;frames[0].frame(14,.016)`);
const performanceResult=await evaluate(`await draw({start:${index},count:1,time:5});const x=frames[0],begin=performance.now();for(let i=0;i<60;i++)x.frame(8+i/60,1/60);return {msPerFrame:(performance.now()-begin)/60,diagnostics:x.stage.diagnostics}`);
await call('Emulation.setDeviceMetricsOverride',{width:1400,height:500,deviceScaleFactor:1,mobile:false});
await evaluate(`const images=[];for(const time of [0,3,6,9,12,4.37,7.83]){await draw({start:${index},count:1,time});images.push({time,src:frames[0].canvas.toDataURL()});}const g=document.getElementById('grid');g.replaceChildren();g.style.gridTemplateColumns='repeat(7,200px)';for(const x of images){const f=document.createElement('figure'),im=new Image(),l=document.createElement('figcaption');im.src=x.src;im.style.width='200px';l.textContent=x.time+' s';f.append(im,l);g.append(f);}`);
await sleep(150);shot=await call('Page.captureScreenshot',{format:'png'});await writeFile(`${out}/${index}-timeline.png`,Buffer.from(shot.data,'base64'));
await evaluate(`await draw({start:${index},count:1,time:10,forceCanvas:true,noText:true});if(frames[0].stage.diagnostics.renderer!=='canvas'||frames[0].stage.diagnostics.textBounds.length)throw Error('Fallback o sin texto incorrecto');`);
await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await evaluate("document.getElementById('grid').style.gridTemplateColumns='1fr'");shot=await call('Page.captureScreenshot',{format:'png'});await writeFile(`${out}/${index}-fallback.png`,Buffer.from(shot.data,'base64'));
await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});const reduced=await evaluate(`await draw({start:${index},count:1,time:8});const x=frames[0],a=x.canvas.toDataURL(),before=x.canvas.getContext("2d").getImageData(0,0,390,844).data;x.frame(12,.016);const after=x.canvas.getContext("2d").getImageData(0,0,390,844).data;let count=0,max=0,minX=390,maxX=0,minY=844,maxY=0;for(let i=0;i<before.length;i++){const d=Math.abs(before[i]-after[i]);if(d){count++;max=Math.max(max,d);const p=Math.floor(i/4),xx=p%390,yy=Math.floor(p/390);minX=Math.min(minX,xx);maxX=Math.max(maxX,xx);minY=Math.min(minY,yy);maxY=Math.max(maxY,yy);}}return {stable:a===x.canvas.toDataURL()||(count<=30&&max<=4),difference:{count,max,minX,maxX,minY,maxY},diagnostics:x.stage.diagnostics}`);if(!reduced.stable)throw Error('Movimiento reducido no es estático: '+index+' '+JSON.stringify(reduced));await call('Emulation.setEmulatedMedia',{features:[]});
if(TURTLE_ANIMATIONS[index].id==='maquina-dulces'){for(const age of ['','1','999']){await evaluate(`await draw({start:${index},count:1,time:5,age:${JSON.stringify(age)}});`);shot=await call('Page.captureScreenshot',{format:'png'});await writeFile(`${out}/16-age-${age||'none'}.png`,Buffer.from(shot.data,'base64'));}}
if(report.some(x=>x.gpuError))throw Error('Error de GPU: '+JSON.stringify(report));if(errors.length)throw Error(errors.join('\n'));await writeFile(`${out}/${index}.json`,JSON.stringify({report,errors,performance:performanceResult,reduced},null,2));console.log(JSON.stringify({index,errors,faces:report.at(-1).faces,ms:performanceResult.msPerFrame,reduced:reduced.stable}));await send('Browser.close');
}finally{ws?.close();child.kill();}
