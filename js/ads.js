import { publicAdPage, homeAdPlan, canRequestAd, watchAdConsent } from './ad-policy.js';
export const adConfig={
 enabled:true,client:'ca-pub-3061014711786485',
 // Enable only after publishing a certified CMP and verifying its signals.
 consentVerified:false,
 slots:{'home-top':'','home-bottom':'','home-feed':'','home-batch':'','home-sidebar':''},
};
const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname),records=new Map();
let sceneCount=0,consentGranted=false,scriptPromise,stopConsent,consentWatching=false;
function pageAllowed(){return publicAdPage(location.href)&&document.body.classList.contains('home-page')&&document.documentElement.dataset.adEligibility!=='blocked';}
function eligible(slot){return pageAllowed()&&homeAdPlan(sceneCount).has(slot.dataset.adPlacement)&&!slot.hidden;}
function requestAllowed(slot){return canRequestAd({url:location.href,local,enabled:adConfig.enabled,consentVerified:adConfig.consentVerified,consentGranted,blocked:!eligible(slot),sceneCount,placement:slot.dataset.adPlacement,slotId:adConfig.slots[slot.dataset.adPlacement]});}
function visible(slot){return slot.isConnected&&slot.getClientRects().length>0&&slot.clientWidth>=160;}
function loadScript(){
 if(!scriptPromise)scriptPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.async=true;script.crossOrigin='anonymous';
  script.src=`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adConfig.client}`;
  script.onload=resolve;script.onerror=reject;document.head.append(script);
 });
 return scriptPromise;
}
function clearSlot(slot){records.get(slot)?.observer?.disconnect();records.delete(slot);slot.replaceChildren();delete slot.dataset.adState;}
export function disposeAdSlots(root){for(const slot of root.querySelectorAll('[data-ad-placement]'))clearSlot(slot);}
function ensureConsent(){
 if(local||consentWatching||!adConfig.consentVerified||!pageAllowed())return;
 consentWatching=true;
 stopConsent=watchAdConsent(granted=>{consentGranted=granted;if(!granted)disposeAdSlots(document);else initAdSlots();});
}
export function initAdSlots(root=document){
 if(!adConfig.enabled||!pageAllowed())return;
 ensureConsent();
 for(const slot of root.querySelectorAll('[data-ad-placement]')){
  if(records.has(slot)||!eligible(slot)||!local&&!requestAllowed(slot))continue;
  const label=document.createElement('span');label.className='ad-label';label.textContent=local?'Anuncios · Vista previa local':'Anuncios';
  slot.setAttribute('aria-label','Anuncios');slot.append(label);
  if(local){
   const preview=document.createElement('div');preview.className='ad-preview';
   const title=document.createElement('span');title.textContent='Espacio para anuncio';
   const note=document.createElement('small');note.textContent=slot.dataset.adPlacement==='home-sidebar'?'Bloque de 160 × 600.':'Aquí se mostrará el bloque de Google AdSense.';
   preview.append(title,note);slot.append(preview);slot.dataset.adState='preview';records.set(slot,{});continue;
  }
  const ad=document.createElement('ins');ad.className='adsbygoogle ad-unit';
  ad.dataset.adClient=adConfig.client;ad.dataset.adSlot=adConfig.slots[slot.dataset.adPlacement];
  // Explicit CSS sizing per Google's responsive-code guidance. Do not combine
  // with auto/full-width parameters that could override the reserved geometry.
  ad.style.cssText=slot.dataset.adPlacement==='home-sidebar'?'display:block;width:160px;height:600px;margin:auto':'display:block;width:100%;min-width:300px;max-width:970px;height:100px;margin:auto';
  slot.append(ad);slot.dataset.adState='ready';
  const record={observer:null};records.set(slot,record);
  record.observer=new IntersectionObserver(entries=>{
   if(!entries.some(entry=>entry.isIntersecting)||!visible(slot)||!requestAllowed(slot))return;
   record.observer.disconnect();
   loadScript().then(()=>{
    if(!visible(slot)||!requestAllowed(slot)||records.get(slot)!==record)return;
    (window.adsbygoogle=window.adsbygoogle||[]).push({});slot.dataset.adState='requested';
   }).catch(()=>{if(records.get(slot)===record){clearSlot(slot);slot.dataset.adState='unavailable';}});
  },{rootMargin:'200px'});
  record.observer.observe(slot);
 }
}
export function setHomeAdDensity(count){
 sceneCount=count;document.body.dataset.adDensity=count<4?'none':count<10?'light':'normal';
 const plan=homeAdPlan(count);
 for(const slot of document.querySelectorAll('[data-ad-placement]')){
  slot.hidden=!pageAllowed()||!plan.has(slot.dataset.adPlacement);
  // Keep served fixed slots across user filters; never auto-refresh them.
  if(slot.hidden&&slot.dataset.adState!=='requested')clearSlot(slot);
 }
 initAdSlots();
}
window.addEventListener('pagehide',event=>{if(!event.persisted){disposeAdSlots(document);stopConsent?.();}});
