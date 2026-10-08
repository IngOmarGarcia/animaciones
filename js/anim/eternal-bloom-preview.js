// Gallery and unsupported WebGL: actual rendered artwork, no Three.js download.
let poster;
export function drawBloomPoster(ctx,w,h,stage={}){
 if(!poster){poster=new Image();poster.src=new URL('../../img/eternal-bloom.webp',import.meta.url).href;}
 ctx.fillStyle='#010103';ctx.fillRect(0,0,w,h);
 if(poster.complete&&poster.naturalWidth){const scale=Math.min(w/poster.width,h/poster.height);ctx.drawImage(poster,(w-poster.width*scale)/2,(h-poster.height*scale)/2,poster.width*scale,poster.height*scale);}
 else if(!stage.posterWaiting){stage.posterWaiting=true;poster.addEventListener('load',()=>stage.requestRender?.(),{once:true});}
}
export default function create(ctx,w,h,dpr,stage={}){stage.diagnostics={renderer:'poster'};return ()=>{drawBloomPoster(ctx,w,h,stage);stage.revealed=true;};}
create.staticPreview=true;
