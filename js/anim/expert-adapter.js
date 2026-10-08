import {ease} from './expert-runtime.js';
import {typography,paintMessage} from './expert-typography.js';

const posters=new Map();
export function poster(ctx,w,h,id,stage){
 let image=posters.get(id);if(!image){image=new Image();image.src=new URL(`../../img/${id}.webp`,import.meta.url).href;posters.set(id,image);}
 ctx.fillStyle='#010106';ctx.fillRect(0,0,w,h);
 if(image.complete&&image.naturalWidth){const s=Math.min(w/image.width,h/image.height);ctx.drawImage(image,(w-image.width*s)/2,(h-image.height*s)/2,image.width*s,image.height*s);}
 else if(!stage.posterWaiting){stage.posterWaiting=true;image.addEventListener('load',()=>stage.requestRender?.(),{once:true});}
}
export function expertAnimation({id,createRenderer,message,reveal=12,color='#e4e5f8',particleMessage=false}){
 function create(ctx,w,h,dpr,stage={}){
  const low=stage.preview||navigator.connection?.saveData||(navigator.deviceMemory||8)<=4||(navigator.hardwareConcurrency||8)<=4;
  let renderer,failed=false,layout,key;
  try{renderer=createRenderer(w,h,{low,preview:stage.preview});}catch{failed=true;}
  stage.onDispose=()=>{renderer?.dispose();renderer=null;};stage.onPointerDown=()=>true;
  return (time,dt)=>{
   const t=stage.preview?time+20:time,card=stage.card||{},nextKey=JSON.stringify([card.m,card.p,card.d,card.f,card.tm]);
   if(nextKey!==key){key=nextKey;layout=typography(w,h,card,message);}
   if(renderer)try{renderer.draw(t,dt,stage.pointer,stage.forceMotion!==false,card);ctx.drawImage(renderer.canvas,0,0,w,h);stage.diagnostics=renderer.stats;}catch{failed=true;stage.onDispose();}
   if(failed){poster(ctx,w,h,id,stage);stage.diagnostics={renderer:'static-fallback'};}
   stage.revealed=t>=reveal||failed;
   if(!stage.preview){const amount=failed?1:ease((t-reveal-(particleMessage?1.6:0))/1.4);paintMessage(ctx,w,h,card,layout,amount,/^#[0-9a-f]{6}$/i.test(card.c5||'')?card.c5:color);}
  };
 }
 create.fadeReplay=.85;return create;
}
