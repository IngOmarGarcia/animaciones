import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
export async function runLogoChecks({call,ev,delay,getErrors}){
 const base=process.env.VIRALCSS_TEST_ORIGIN||'http://localhost:8080',report={};await mkdir('tools/review/logo',{recursive:true});
 const wait=async expression=>{for(let i=0;i<100;i++){if(await ev(expression))return;await delay(100);}throw Error('Espera del logo agotada: '+expression+' '+JSON.stringify(await ev("({state:document.querySelector('.brand')?.logoState,ready:document.readyState})"))+' '+JSON.stringify(getErrors()));};
 const go=async path=>{await call('Page.navigate',{url:base+path});await wait("document.readyState==='complete'");};
 const shot=async name=>{const s=await call('Page.captureScreenshot',{format:'png'});await writeFile(`tools/review/logo/${name}.png`,Buffer.from(s.data,'base64'));};
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 const reference=await call('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});Object.defineProperty(navigator,'deviceMemory',{get:()=>8});"});
 await go('/');await wait("document.querySelector('.brand')?.logoState?.contexts===1");
 report.first=await ev("({...document.querySelector('.brand').logoState,label:document.querySelector('.brand').getAttribute('aria-label'),width:document.querySelector('.brand').getBoundingClientRect().width})");assert.equal(report.first.phase,'intro');assert.equal(report.first.label,'ViralCSS — Ir al inicio');assert.equal(report.first.width,224);
 await wait("document.querySelector('.brand').logoState.phase==='idle'");report.idle=await ev("({...document.querySelector('.brand').logoState,canvas:document.querySelectorAll('.brand-canvas').length,cls:window.auditCLS,overflow:document.documentElement.scrollWidth>innerWidth})");assert.equal(report.idle.phase,'idle');assert.equal(report.idle.canvas,1);assert.equal(report.idle.cls,0);assert(!report.idle.overflow);await shot('mobile-idle');
 await ev("import('/js/brand-logo.js').then(m=>{m.initBrandLogo();m.initBrandLogo()})");assert.equal(await ev("document.querySelectorAll('.brand-canvas').length"),1);
 await ev("document.querySelector('header nav a[href*=animaciones]').click()");await wait("location.pathname.includes('animaciones')&&document.querySelector('.brand')?.logoState?.contexts===1");assert.equal(await ev("document.querySelector('.brand').logoState.phase"),'idle');
 await ev("document.querySelector('.brand').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))");assert(await ev("document.querySelector('.brand').classList.contains('brand-pressed')"));
 await ev("document.querySelector('.brand').click()");await wait("location.pathname==='/'&&document.querySelector('.brand')?.logoState?.contexts===1");assert.equal(await ev("document.querySelector('.brand').logoState.phase"),'idle');report.navigation=true;
 // Simulate the viewport threshold independently of the sticky header.
 await ev("document.querySelector('.site-header').style.transform='translateY(-150px)'");await delay(300);const frames=await ev("document.querySelector('.brand').logoState.frames");await delay(250);assert.equal(await ev("document.querySelector('.brand').logoState.frames"),frames);assert(!await ev("document.querySelector('.brand').logoState.running"));
 await ev("document.querySelector('.site-header').style.transform=''");await delay(300);assert(await ev("document.querySelector('.brand').logoState.running"));report.offscreen=true;
 const background=await call('Target.createTarget',{url:'about:blank'});await call('Target.activateTarget',{targetId:background.targetId});await delay(200);
 report.nativeBackground=await ev('document.hidden');
 if(!report.nativeBackground)await ev("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))");
 assert(!await ev("document.querySelector('.brand').logoState.running"));
 await call('Target.closeTarget',{targetId:background.targetId});await call('Page.bringToFront');
 if(!report.nativeBackground)await ev("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))");await delay(150);assert(await ev("document.querySelector('.brand').logoState.running"));report.background=true;
 await ev("window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}))");assert(!await ev("document.querySelector('.brand').logoState.running"));await ev("window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))");await delay(100);assert.equal(await ev("document.querySelectorAll('.brand-canvas').length"),1);report.restore=true;
 await call('Emulation.setDeviceMetricsOverride',{width:320,height:640,deviceScaleFactor:1,mobile:true});await delay(150);assert(!await ev("document.documentElement.scrollWidth>innerWidth"));await shot('small-mobile');
 await call('Emulation.setDeviceMetricsOverride',{width:768,height:1024,deviceScaleFactor:2,mobile:true});await delay(150);assert(!await ev("document.documentElement.scrollWidth>innerWidth"));await shot('tablet-idle');
 await call('Emulation.setDeviceMetricsOverride',{width:1365,height:900,deviceScaleFactor:1,mobile:false});await delay(200);assert(!await ev("document.documentElement.scrollWidth>innerWidth"));await shot('desktop-idle');
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await wait("document.querySelectorAll('.brand-canvas').length===0 && getComputedStyle(document.querySelector('.brand-static')).opacity==='1'");report.reduced=true;
 await call('Emulation.setEmulatedMedia',{features:[]});await wait("document.querySelector('.brand').logoState.contexts===1");assert.equal(await ev("document.querySelector('.brand').logoState.phase"),'idle');
 for(let cycle=0;cycle<3;cycle++){
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await wait("document.querySelector('.brand').logoState.contexts===0");
  await call('Emulation.setEmulatedMedia',{features:[]});await wait("document.querySelector('.brand').logoState.contexts===1");assert.equal(await ev("document.querySelectorAll('.brand-canvas').length"),1);
 }report.repeatedLifecycle=true;
 await ev("document.querySelector('.brand-canvas').getContext('webgl').getExtension('WEBGL_lose_context').loseContext()");await delay(200);assert.equal(await ev("document.querySelectorAll('.brand-canvas').length"),0);assert.equal(await ev("getComputedStyle(document.querySelector('.brand-static')).opacity"),'1');report.contextLoss=true;
 // A new session begins with an empty per-tab session store.
 await ev("sessionStorage.removeItem('viralcss:logo-intro:v1')");await go('/');await wait("document.querySelector('.brand').logoState.contexts===1");assert.equal(await ev("document.querySelector('.brand').logoState.phase"),'intro');report.newSession=true;
 // WebGL completely unavailable: retain the original image and semantic link.
 const blocked=await call('Page.addScriptToEvaluateOnNewDocument',{source:"const native=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:native.call(this,type,...args)};"});
 await go('/');await delay(800);assert.equal(await ev("document.querySelectorAll('.brand-canvas').length"),0);assert.equal(await ev("getComputedStyle(document.querySelector('.brand-static')).opacity"),'1');report.noWebGL=true;await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:blocked.identifier});
 await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:reference.identifier});
 const modest=await call('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>2});Object.defineProperty(navigator,'deviceMemory',{get:()=>2});"});
 await go('/');await wait("document.querySelector('.brand').logoState.contexts===1");report.low=await ev("({...document.querySelector('.brand').logoState})");assert(report.low.low&&report.low.particles<report.idle.particles);await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:modest.identifier});
 await go('/tools/logo-review.html');await wait('window.ready');
 for(const time of [0,.875,1.75,2.625,3.5,4.37,8]){report['frame'+time]=await ev(`drawLogo(${time})`);await shot('frame-'+time);}
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await call('Emulation.setScriptExecutionDisabled',{value:true});await go('/');
 assert.equal(await ev("getComputedStyle(document.querySelector('.brand-static')).opacity"),'1');assert(await ev("document.querySelector('.brand').textContent.includes('ViralCss') && getComputedStyle(document.querySelector('header nav')).display!=='none'"));report.noJavaScript=true;await shot('no-javascript');await call('Emulation.setScriptExecutionDisabled',{value:false});
 report.errors=getErrors();assert.equal(report.errors.length,0,JSON.stringify(report.errors));await writeFile('tools/review/logo/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,...Object.fromEntries(Object.entries(report).filter(([k])=>!k.startsWith('frame')))}));
}
