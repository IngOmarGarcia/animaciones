import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

export async function reviewAdPolicy({call,ws,evaluate,navigate,wait,delay,screenshot,overflow,errors}){
 for(const [width,height]of [[360,640],[390,844],[1280,800],[1365,900],[1600,900]]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
  await navigate('/');await wait("document.body.dataset.adDensity==='normal'");
  await overflow('política de anuncios '+width);
  const gap=await evaluate("document.getElementById('publicidad-final').getBoundingClientRect().top-document.getElementById('support').getBoundingClientRect().bottom");
  assert(gap>=60,'Anuncio demasiado próximo al apoyo');
  if(width>=1280){
   await evaluate("document.querySelector('.home-ad-rail').scrollIntoView({block:'start',behavior:'instant'})");await delay(150);
   const size=await evaluate("(()=>{const el=document.querySelector('.home-ad-rail .ad-preview'),r=el.getBoundingClientRect();return {width:r.width,height:r.height,bottom:r.bottom}})()");
   assert.equal(size.width,160);assert.equal(size.height,600);assert(size.bottom<=height,JSON.stringify(size));
   await screenshot(`ad-sidebar-160x600-${width}`);
  }
  await evaluate("document.querySelector('#chips [data-category=general]').click()");
  assert.equal(await evaluate("document.querySelectorAll('#grid .card').length"),1);
  assert.equal(await evaluate("[...document.querySelectorAll('[data-ad-placement]')].filter(el=>!el.hidden&&getComputedStyle(el).display!=='none').length"),0);
  assert(await evaluate("document.getElementById('home-products').hidden"));
  await evaluate("document.querySelector('#chips [data-category=gamer]').click()");
  assert.equal(await evaluate("document.body.dataset.adDensity"),'light');
  assert.equal(await evaluate("document.querySelectorAll('#home-products .gift').length"),3);
  assert.deepEqual(await evaluate("[...document.querySelectorAll('[data-ad-placement]')].filter(el=>!el.hidden).map(el=>el.dataset.adPlacement)"),['home-bottom']);
  if(width===390)await screenshot('ad-light-category-390');
 }
 await call('Emulation.setDeviceMetricsOverride',{width:1365,height:720,deviceScaleFactor:1,mobile:false});
 await navigate('/');assert.equal(await evaluate("getComputedStyle(document.querySelector('.home-ad-rail')).display"),'none');

 // Simulate the production origin in this isolated browser. Every request is
 // fulfilled with local files or a stub: no request reaches Google's ad server.
 let googleLoads=0;const interceptionErrors=[];
 const fixture=`<!doctype html><html><head><style>.ad-slot{width:728px;min-height:100px}</style></head><body class="home-page"><main><h1>Escenas de prueba</h1><div class="ad-slot" data-ad-placement="home-top"></div></main><script type="module">
 import * as ads from '/js/ads.js';window.ads=ads;window.cmpListeners=[];
 window.__tcfapi=(command,version,callback,id)=>{if(command==='addEventListener'){cmpListeners.push(callback);callback({cmpStatus:'loaded',eventStatus:'tcloaded',gdprApplies:true,tcString:'test',listenerId:1,purpose:{consents:{}},vendor:{consents:{}}},true);}else callback(true);};
 window.signalConsent=granted=>cmpListeners.forEach(callback=>callback({cmpStatus:'loaded',eventStatus:'useractioncomplete',gdprApplies:true,tcString:'test',listenerId:1,purpose:{consents:{1:granted,3:granted,4:granted}},vendor:{consents:{755:granted}}},true));
 ads.adConfig.consentVerified=true;ads.adConfig.slots['home-top']='1234567890';ads.setHomeAdDensity(40);window.fixtureReady=true;
 </script></body></html>`;
 const handler=async event=>{
  const msg=JSON.parse(event.data);if(msg.method!=='Fetch.requestPaused')return;
  const {requestId,request}=msg.params;
  try{
   const url=new URL(request.url);let body,type='text/html';
   if(url.hostname==='pagead2.googlesyndication.com'){googleLoads++;body='window.adsbygoogle={push(){window.mockAdRequests=(window.mockAdRequests||0)+1;}};';type='application/javascript';}
   else if(url.pathname.startsWith('/js/')&&/^\/js\/[a-zA-Z0-9/_-]+\.js$/.test(url.pathname)){body=await readFile('.'+url.pathname,'utf8');type='application/javascript';}
   else body=fixture;
   await call('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:type},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(body).toString('base64')});
  }catch(error){interceptionErrors.push(error.message);await call('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'});}
 };
 ws.addEventListener('message',handler);
 await call('Fetch.enable',{patterns:[{urlPattern:'https://viralcss.com/*'},{urlPattern:'https://pagead2.googlesyndication.com/*'}]});
 try{
  await call('Page.navigate',{url:'https://viralcss.com/'});await wait('window.fixtureReady===true');await delay(150);
  assert.equal(googleLoads,0);assert.equal(await evaluate("document.querySelectorAll('ins.adsbygoogle').length"),0);
  await evaluate('signalConsent(true)');await wait('window.mockAdRequests===1');assert.equal(googleLoads,1);
  const size=await evaluate("({width:document.querySelector('ins').style.width,height:document.querySelector('ins').style.height})");assert.equal(size.height,'100px');
  await evaluate('signalConsent(true);ads.initAdSlots()');await delay(100);assert.equal(await evaluate('window.mockAdRequests'),1);
  await evaluate('signalConsent(false)');assert.equal(await evaluate("document.querySelectorAll('ins.adsbygoogle').length"),0);
  await evaluate('signalConsent(true)');await wait('window.mockAdRequests===2');assert.equal(googleLoads,1);
  for(const path of ['/v.html?s=personal','/codigo.html?s=personal','/crear.html','/?s=personal','/?email=persona%40example.test']){
   await call('Page.navigate',{url:'https://viralcss.com'+path});await wait('window.fixtureReady===true');
   await evaluate('signalConsent(true)');await delay(100);
   assert.equal(await evaluate("document.querySelectorAll('ins.adsbygoogle').length"),0,path);assert.equal(googleLoads,1,path);
  }
 }finally{await call('Fetch.disable');ws.removeEventListener('message',handler);}
 assert.equal(interceptionErrors.length,0,interceptionErrors.join('\n'));assert.equal(errors.length,0,errors.join('\n'));
 console.log('OK: densidad, afiliados limitados, apoyo separado, lateral 160×600, bloqueo sin consentimiento, retirada y reactivación, sin duplicación ni tráfico real a Google, rutas personales excluidas.');
}
