const cardText=(card,fallback)=>/^#[0-9a-f]{6}$/i.test(card?.c5||'')&&card.c5.toLowerCase()!=='#f1e4cd'?card.c5:fallback;
import {createBloomRenderer} from './eternal-bloom-renderer.js';
import {smooth} from './eternal-bloom-geometry.js';
import {drawBloomPoster} from './eternal-bloom-preview.js';
import {canvasTextFont} from './text-style.js';

function lines(ctx,text,width){
 const words=text.split(/\s+/).flatMap(word=>{
  if(ctx.measureText(word).width<=width)return [word];
  const parts=[];let part='';for(const char of word){if(part&&ctx.measureText(part+char).width>width){parts.push(part);part='';}part+=char;}if(part)parts.push(part);return parts;
 });
 const result=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>width&&line){result.push(line);line=word;}else line=next;}if(line)result.push(line);return result;
}
export default function create(ctx,w,h,dpr,stage={}){
 let renderer,failed=false;
 const low=!!navigator.connection?.saveData||(navigator.deviceMemory||8)<=4||(navigator.hardwareConcurrency||8)<=4;
 try{renderer=createBloomRenderer(w,h,{low});}catch{failed=true;}
 const dispose=()=>{renderer?.dispose();renderer=null;};stage.onDispose=dispose;
 stage.onPointerDown=()=>true;
 return (t,dt)=>{
  if(renderer)try{renderer.draw(t,dt,stage.pointer,stage.forceMotion!==false,stage.card||{});ctx.drawImage(renderer.canvas,0,0,w,h);stage.diagnostics=renderer.stats;}catch{failed=true;dispose();}
  if(failed){drawBloomPoster(ctx,w,h,stage);stage.diagnostics={renderer:'static-fallback',fallback:true};}
  stage.revealed=t>=10.8||failed;
  if(stage.preview||stage.card?.tm==='none')return;
  const amount=failed?1:smooth((t-10.8)/1.8);if(!amount)return;
  const card=stage.card||{},font=card.f||'classic',familyStage={card:{f:font}};
  ctx.save();ctx.globalAlpha=amount;ctx.textAlign='center';ctx.fillStyle=cardText(stage.card,'#f1e4cd');
  let size=Math.max(14,Math.min(w*.052,h*.029,26));ctx.font=canvasTextFont(familyStage,`${size}px`);
  const message=card.m??'Para ti, que haces florecer mi mundo';let wrapped=lines(ctx,message,w*.79);
  while(size>12&&wrapped.length*size*1.32>h*.24){size=Math.max(12,size-1);ctx.font=canvasTextFont(familyStage,`${size}px`);wrapped=lines(ctx,message,w*.79);}
  const lineHeight=size*1.32;
  const y=h*.79-(wrapped.length-1)*lineHeight*.5+(1-amount)*8;
  if(card.p){ctx.font=canvasTextFont(familyStage,`${Math.max(12,size*.8)}px`);ctx.fillText(card.p,w/2,y-size*1.8,w*.8);}
  ctx.font=canvasTextFont(familyStage,`${size}px`);wrapped.forEach((line,i)=>ctx.fillText(line,w/2,y+i*lineHeight,w*.84));
  if(card.d){ctx.font=canvasTextFont(familyStage,`${Math.max(11,size*.65)}px`);ctx.fillStyle=cardText(card,'#baaa90');ctx.fillText(card.d,w/2,y+wrapped.length*lineHeight+size*.5,w*.75);}
  ctx.restore();
 };
}
create.fadeReplay=.85;
