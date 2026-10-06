const SESSION_KEY='viralcss:logo-intro:v1';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(x*(x*6-15)+10);};
export function logoCamera(time,intro=true,impulse=0){
 const progress=intro?ease((time-.35)/2.8):1;
 // Dolly in world space; perspective and occlusion change, no CSS scale.
 const distance=Math.exp(Math.log(1.42)+(Math.log(4.85)-Math.log(1.42))*progress);
 const idle=Math.max(0,time-3.5);
 return {camera:distance,pitch:.36+(.12-.36)*progress,yaw:-.25*progress-idle*.0035-impulse*.05,orbit:idle*.024+progress*.35+impulse*.15,clock:time,reveal:ease((progress-.43)/.5),text:intro?ease((time-2.65)/.7):1,tag:intro?ease((time-3.05)/.45):1};
}
function initialVisit(){
 try{const internal=document.referrer&&new URL(document.referrer).origin===location.origin;if(sessionStorage.getItem(SESSION_KEY)||internal){sessionStorage.setItem(SESSION_KEY,'seen');return false;}sessionStorage.setItem(SESSION_KEY,'seen');return true;}catch{return !document.referrer;}
}
export function initBrandLogo(){
 const link=document.querySelector('.site-header .brand'),slot=link?.querySelector('.brand-orb');if(!slot||slot.dataset.logoReady)return;
 slot.dataset.logoReady='1';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),abort=new AbortController(),signal=abort.signal;
 const intro=initialVisit();let active=null,canvas=null,onLost=null,destroyed=false,visible=true,loading=false,failed=false;
 let raf=0,time=intro?0:3.5,last=0,lastDraw=0,impulse=0,frames=0,mean=0,lastText=-1,lastTag=-1;
 const low=!!navigator.connection?.saveData||(navigator.deviceMemory||8)<=4||(navigator.hardwareConcurrency||8)<=4;
 const state={phase:reduced.matches?'static':intro?'intro':'idle',frames:0,running:false,low,contexts:0};
 Object.defineProperty(link,'logoState',{value:state,configurable:true});
 const cancel=()=>{cancelAnimationFrame(raf);raf=0;state.running=false;last=0;};
 const releaseRenderer=()=>{
  const renderer=active,element=canvas,listener=onLost;active=null;canvas=null;onLost=null;state.contexts=0;
  if(element){if(listener)element.removeEventListener('webglcontextlost',listener);element.remove();}
  renderer?.destroy();
 };
 const calm=()=>{
  cancel();time=3.5;slot.classList.remove('logo-active');link.classList.remove('brand-live');state.phase='static';
  releaseRenderer();
 };
 const fallback=(reason='Contexto del logo perdido')=>{cancel();failed=true;releaseRenderer();slot.classList.remove('logo-active');link.classList.remove('brand-live');slot.style.removeProperty('--logo-text');state.phase='static';state.fallbackReason=reason;};
 function render(now){
  raf=0;if(reduced.matches)return calm();if(destroyed||!active||!visible||document.hidden)return cancel();
  const elapsed=last?Math.min(.25,(now-last)/1000):0;last=now;time+=elapsed;impulse*=Math.exp(-elapsed*6);
  const introducing=intro&&time<3.5,interval=introducing||impulse>.02?0:low?1000/12:1000/15;
  if(now-lastDraw>=interval){
   const start=performance.now();try{
    const pose=logoCamera(time,intro,impulse);active.draw(pose);
    if(pose.text!==lastText){slot.style.setProperty('--logo-text',pose.text.toFixed(3));lastText=pose.text;}
    if(pose.tag!==lastTag){link.style.setProperty('--logo-tag',pose.tag.toFixed(3));lastTag=pose.tag;}
    if(!slot.classList.contains('logo-active')){slot.classList.add('logo-active');link.classList.add('brand-live');}
    state.phase=introducing?'intro':'idle';state.frames=++frames;state.camera=pose.camera;state.time=time;state.particles=active.stats.particles;state.low=active.stats.low;
   }catch(error){return fallback(error.message);}
   lastDraw=now;mean=mean*.92+(performance.now()-start)*.08;if(mean>6&&!active.stats.low)active.lowerQuality();
  }
  state.running=true;raf=requestAnimationFrame(render);
 }
 function resume(){if(reduced.matches)return calm();if(!destroyed&&active&&visible&&!document.hidden&&!raf){last=0;raf=requestAnimationFrame(render);state.running=true;}}
 async function load(){
  if(destroyed||active||loading||failed||reduced.matches||!visible||document.hidden)return;
  loading=true;
  try{const {createLogoRenderer}=await import('./logo-renderer.js');if(destroyed||reduced.matches||!visible||document.hidden)return;
   canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');canvas.className='brand-canvas';slot.append(canvas);
   onLost=event=>{if(event.currentTarget===canvas)fallback();};canvas.addEventListener('webglcontextlost',onLost);
   active=createLogoRenderer(canvas,{low});active.resize(slot.clientWidth,slot.clientHeight);state.contexts=1;resume();
  }catch(error){fallback(error.message);}finally{loading=false;}
 }
 const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting;visible?(active?resume():load()):cancel();},{threshold:.01});observer.observe(slot);
 const resize=new ResizeObserver(()=>{
  if(active){
   active.resize(slot.clientWidth,slot.clientHeight);
   if(!state.running)try{active.draw(logoCamera(time,intro,impulse));}catch{fallback();}
  }
 });resize.observe(slot);
 document.addEventListener('visibilitychange',()=>document.hidden?cancel():(active?resume():load()),{signal});
 reduced.addEventListener('change',()=>{if(reduced.matches)calm();else load();},{signal});
 // No preventDefault, timeout or delayed navigation. Feedback starts on press.
 link.addEventListener('pointerdown',()=>{if(!reduced.matches){impulse=1;link.classList.add('brand-pressed');resume();}},{signal});
 const release=()=>link.classList.remove('brand-pressed');link.addEventListener('pointerup',release,{signal});link.addEventListener('pointerleave',release,{signal});link.addEventListener('pointercancel',release,{signal});
 link.addEventListener('keydown',event=>{if(event.key==='Enter'&&!reduced.matches){impulse=1;resume();}},{signal});
 window.addEventListener('pagehide',event=>{cancel();if(!event.persisted){destroyed=true;observer.disconnect();resize.disconnect();releaseRenderer();abort.abort();}},{signal});
 window.addEventListener('pageshow',event=>{if(event.persisted)resume();},{signal});
 if('requestIdleCallback' in window)requestIdleCallback(()=>load(),{timeout:700});else setTimeout(load,200);
}
