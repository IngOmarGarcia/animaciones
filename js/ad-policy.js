import { CATEGORIES } from './catalog.js';
const categories=new Set(CATEGORIES.map(category=>category.id));
const homePlacements=new Set(['home-top','home-bottom','home-feed','home-batch','home-sidebar']);
// Product thresholds, not a numerical requirement imposed by Google.
export function homeAdPlan(count){return count<4?new Set():count<10?new Set(['home-bottom']):new Set(homePlacements);}
export function publicAdPage(url){
 const page=new URL(url);
 if(!['/','/index','/index.html'].includes(page.pathname))return false;
 for(const [key,value]of page.searchParams)if(key!=='cat'||!categories.has(value))return false;
 return !page.hash||['#galeria','#inicio','#gallery-title'].includes(page.hash);
}
export function canRequestAd({url,local,enabled,consentVerified,consentGranted,blocked,sceneCount,placement,slotId}){
 return !local&&enabled&&consentVerified&&consentGranted&&!blocked&&publicAdPage(url)&&homeAdPlan(sceneCount).has(placement)&&/^\d+$/.test(slotId||'');
}
// The certified CMP collects and transmits consent. This is only a request gate;
// it does not generate consent strings or replace a CMP with a homemade banner.
export function consentAllowsAds(data,success){
 if(!success||data?.cmpStatus!=='loaded'||!['tcloaded','useractioncomplete'].includes(data.eventStatus))return false;
 if(data.gdprApplies===false)return true;
 return data.gdprApplies===true&&typeof data.tcString==='string'&&data.tcString.length>0&&[1,3,4].every(p=>data.purpose?.consents?.[p]===true)&&data.vendor?.consents?.[755]===true;
}
export function watchAdConsent(callback,host=window){
 let timer,listenerId,stopped=false;const started=Date.now();
 const connect=()=>{
  if(stopped)return;
  if(typeof host.__tcfapi!=='function'){if(Date.now()-started<15000)timer=host.setTimeout(connect,250);return;}
  try{host.__tcfapi('addEventListener',2,(data,success)=>{if(!stopped){listenerId=data?.listenerId;callback(consentAllowsAds(data,success));}});}catch{callback(false);}
 };
 connect();
 return ()=>{stopped=true;host.clearTimeout(timer);if(listenerId!==undefined)try{host.__tcfapi('removeEventListener',2,()=>{},listenerId);}catch{}};
}
