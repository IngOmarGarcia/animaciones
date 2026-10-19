import {createBloomRenderer} from './eternal-bloom-renderer.js';
// The still remains a fallback when the real gallery renderer is unavailable.
let poster;
export function drawBloomPoster(ctx,w,h,stage={}){
 if(!poster){poster=new Image();poster.src=new URL('../../img/eternal-bloom.webp',import.meta.url).href;}
 ctx.fillStyle='#010103';ctx.fillRect(0,0,w,h);
 if(poster.complete&&poster.naturalWidth){const scale=Math.min(w/poster.width,h/poster.height);ctx.drawImage(poster,(w-poster.width*scale)/2,(h-poster.height*scale)/2,poster.width*scale,poster.height*scale);}
 else if(!stage.posterWaiting){stage.posterWaiting=true;poster.addEventListener('load',()=>stage.requestRender?.(),{once:true});}
}
export default function create(ctx,w,h,dpr,stage={}){
 let renderer;
 try{renderer=createBloomRenderer(w,h,{preview:true,low:true});}catch{}
 stage.onDispose=()=>{renderer?.dispose();renderer=null;};
 return (time,dt)=>{
  if(renderer)try{
   renderer.draw(time+14,dt,stage.pointer,stage.forceMotion!==false,stage.card||{});
   ctx.drawImage(renderer.canvas,0,0,w,h);stage.diagnostics=renderer.stats;
  }catch{stage.onDispose();}
  if(!renderer){drawBloomPoster(ctx,w,h,stage);stage.diagnostics={renderer:'static-fallback'};}
  stage.revealed=true;
 };
}
