import {ease} from './expert-runtime.js';
import {typography,paintMessage} from './expert-typography.js';
import {poster} from './expert-adapter.js';

// Interactions are kept per player; the existing share card remains serializable.
export function autumnAnimation({id,factory,message,reveal=16,color,action,spell=false}) {
 function create(ctx,w,h,dpr,stage={}){
  let renderer,failed=false,key,layout,seq=0,cast=0,tap=null,button;
  try{renderer=factory(w,h,{low:stage.preview||navigator.connection?.saveData||(navigator.deviceMemory||8)<=4,preview:stage.preview});}catch{failed=true;}
  const activate=()=>{cast++;stage.requestRender?.();};
  stage.onPointerDown=p=>{tap={x:p.nx,y:p.ny,seq:++seq};stage.requestRender?.();return true;};
  if(action&&!stage.preview&&ctx.canvas.parentElement){
   button=document.createElement('button');button.type='button';button.className='btn btn-ghost autumn-action';button.textContent=action;button.style.cssText='position:absolute;top:12px;right:12px;z-index:4;font-size:12px;background:#111322dd;border:1px solid #b49a6b;color:#f5e8d5;max-width:75%';
   button.addEventListener('click',activate);ctx.canvas.parentElement.append(button);
  }
  stage.onDispose=()=>{renderer?.dispose();renderer=null;button?.remove();};
  return(time,dt)=>{
   const reduced=stage.forceMotion===false,t=stage.preview?time+22:time,card=stage.card||{},k=JSON.stringify([card.m,card.p,card.d,card.f,card.tm]);
   if(key!==k){key=k;layout=typography(w,h,card,message);}
   if(renderer)try{renderer.draw(t,dt,stage.pointer,!reduced,{...card,__tap:tap,__cast:cast,__demo:stage.preview,__still:reduced});ctx.drawImage(renderer.canvas,0,0,w,h);stage.diagnostics=renderer.stats;}catch{failed=true;stage.onDispose();}
   if(failed){poster(ctx,w,h,id,stage);stage.diagnostics={renderer:'static-fallback'};}
   const amount=failed||reduced?1:spell?(stage.diagnostics?.spellReveal||0):ease((t-reveal)/1.5);
   stage.revealed=amount>.01;
   if(button){button.hidden=failed;button.disabled=spell&&!reduced&&(t<8||(stage.diagnostics?.casting===true));button.textContent=spell&&stage.diagnostics?.casting?'Tejiendo el hechizo…':action;}
   if(!stage.preview&&card.tm!=='none'&&amount>0){
    ctx.save();const shade=ctx.createLinearGradient(0,h*.59,0,h);shade.addColorStop(0,'rgba(4,3,12,0)');shade.addColorStop(.3,`rgba(4,3,12,${amount*.7})`);shade.addColorStop(1,`rgba(4,3,12,${amount*.86})`);ctx.fillStyle=shade;ctx.fillRect(0,h*.59,w,h*.41);ctx.shadowColor='#04030c';ctx.shadowBlur=4;ctx.shadowOffsetY=1;paintMessage(ctx,w,h,card,layout,amount,/^#[0-9a-f]{6}$/i.test(card.c5||'')?card.c5:color);ctx.restore();
   }
  };
 }
 create.fadeReplay=.85;return create;
}
