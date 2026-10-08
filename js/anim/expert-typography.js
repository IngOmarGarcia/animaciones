import {canvasTextFont} from './text-style.js';
export function typography(w,h,card={},fallback=''){
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');
 let size=Math.max(13,Math.min(w*.052,h*.029,26));
 const family={card:{f:card.f||'classic'}},text=card.m??fallback;
 const wrap=()=>{const out=[];let line='';for(const word of text.split(/\s+/)){let chunks=[word];if(ctx.measureText(word).width>w*.80){chunks=[];let chunk='';for(const char of word){if(chunk&&ctx.measureText(chunk+char).width>w*.80){chunks.push(chunk);chunk='';}chunk+=char;}if(chunk)chunks.push(chunk);}for(const chunk of chunks){const next=line?line+' '+chunk:chunk;if(line&&ctx.measureText(next).width>w*.80){out.push(line);line=chunk;}else line=next;}}if(line)out.push(line);return out;};
 ctx.font=canvasTextFont(family,`${size}px`);let lines=wrap();while(size>12&&lines.length*size*1.32>h*.24){size=Math.max(12,size-1);ctx.font=canvasTextFont(family,`${size}px`);lines=wrap();}
 const lineHeight=size*1.32,y=h*.79-(lines.length-1)*lineHeight*.5;
 return {canvas,ctx,family,size,lines,lineHeight,y};
}
export function paintMessage(ctx,w,h,card,layout,amount,color){
 if(card.tm==='none'||amount<=0)return;
 const {family,size,lines,lineHeight,y}=layout;ctx.save();ctx.textAlign='center';ctx.globalAlpha=amount;ctx.fillStyle=color;
 if(card.p){ctx.font=canvasTextFont(family,`${Math.max(12,size*.8)}px`);ctx.fillText(card.p,w/2,y-size*1.8+(1-amount)*5,w*.80);}
 ctx.font=canvasTextFont(family,`${size}px`);lines.forEach((line,i)=>ctx.fillText(line,w/2,y+i*lineHeight+(1-amount)*5,w*.84));
 if(card.d){ctx.globalAlpha=amount*.72;ctx.font=canvasTextFont(family,`${Math.max(11,size*.65)}px`);ctx.fillText(card.d,w/2,y+lines.length*lineHeight+size*.5,w*.76);}ctx.restore();
}
export function messageTargets(w,h,card,fallback,count){
 const layout=typography(w,h,card,fallback);paintMessage(layout.ctx,w,h,{m:card.m,f:card.f},layout,1,'#ffffff');
 const data=layout.ctx.getImageData(0,0,w,h).data,points=[];
 for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2)if(data[(y*w+x)*4+3]>120)points.push([x/w*2-1,1-y/h*2]);
 const result=new Float32Array(count*3);for(let i=0;i<count;i++){const p=points.length?points[Math.floor(i/count*points.length)]:[0,-.58];result.set([p[0],p[1],0],i*3);}return result;
}
