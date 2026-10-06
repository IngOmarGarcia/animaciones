import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
export async function runLogoPerformance({call,ev,delay,getErrors}){
 const results=[],base=process.env.VIRALCSS_TEST_ORIGIN||'http://localhost:8080';
 await call('Network.setCacheDisabled',{cacheDisabled:true});
 const metrics=await call('Page.addScriptToEvaluateOnNewDocument',{source:`sessionStorage.removeItem('viralcss:logo-intro:v1');window.logoEvents=[];new PerformanceObserver(l=>window.logoEvents.push(...l.getEntries().filter(e=>e.interactionId).map(e=>({name:e.name,duration:e.duration,processing:e.processingEnd-e.processingStart})))).observe({type:'event',buffered:true,durationThreshold:16});`});
 for(const width of process.argv.includes('--desktop')?[1365]:[390,1365])for(const animated of [false,true])for(let run=0;run<3;run++){
  await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<700});
  let disabled;if(!animated)disabled=await call('Page.addScriptToEvaluateOnNewDocument',{source:"const nativeContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return this.classList.contains('brand-canvas')&&type==='webgl'?null:nativeContext.call(this,type,...args)};"});
  await call('Page.navigate',{url:base+'/'});await delay(4000);
  await ev("document.querySelector(innerWidth<700?'.header-menu-toggle':'#homeMotion')?.scrollIntoView({block:'center',behavior:'instant'})");await delay(200);
  const position=await ev("(()=>{const button=document.querySelector(innerWidth<700?'.header-menu-toggle':'#homeMotion');if(!button||!button.getBoundingClientRect().width)return null;const r=button.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
  assert(position,'Control de interacción ausente');
  const before=await ev("document.querySelector(innerWidth<700?'.header-menu-toggle':'#homeMotion').getAttribute(innerWidth<700?'aria-expanded':'aria-pressed')");
  for(let tap=0;tap<2;tap++){await call('Input.dispatchMouseEvent',{type:'mousePressed',...position,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...position,button:'left',clickCount:1});await delay(200);const after=await ev("document.querySelector(innerWidth<700?'.header-menu-toggle':'#homeMotion').getAttribute(innerWidth<700?'aria-expanded':'aria-pressed')");assert(tap===0?after!==before:after===before,'El clic nativo no activó el control');}
  const result=await ev("({cls:window.auditCLS,lcp:window.auditLCP,long:window.auditLong,events:window.logoEvents,logo:{...document.querySelector('.brand').logoState},bytes:performance.getEntriesByType('resource').reduce((n,e)=>n+e.transferSize,0)})");
  result.width=width;result.animated=animated;result.run=run;assert.equal(result.cls,0,'El logo introdujo CLS');results.push(result);
  console.log(JSON.stringify({width,animated,run,cls:result.cls,lcp:Math.round(result.lcp),events:result.events}));
  if(disabled)await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:disabled.identifier});
 }
 await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:metrics.identifier});
 assert.equal(getErrors().length,0,JSON.stringify(getErrors()));await mkdir('tools/review/logo',{recursive:true});await writeFile(`tools/review/logo/performance${process.argv.includes('--desktop')?'-desktop':''}.json`,JSON.stringify(results,null,2));
}
