import { customPalette } from './color-style.js';
import { canvasTextFont } from './text-style.js';
import { cineGPU } from './cine-gpu.js';

// Small software rasterizer. Solid surfaces, directional lighting and painter
// occlusion remain available offline and in the existing downloadable HTML.
export const CINE_TAU=Math.PI*2;
export const cineEase=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function cineRandom(seed=17){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function cinePart(){return {faces:[],lines:[],dots:[],pos:[0,0,0],rot:[0,0,0],scale:[1,1,1],opacity:1};}
export function cineFace(p,v,color,material='matte'){p.faces.push({v,color,material});}
export function cineLine(p,v,color=1,width=.003){p.lines.push({v,color,width});}
export function cineBox(p,x,y,z,a,b,c,color=0){const v=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(q=>[x+q[0]*a/2,y+q[1]*b/2,z+q[2]*c/2]);for(const ix of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[1,5,6,2],[0,3,7,4]])cineFace(p,ix.map(i=>v[i]),color);}
export function cineSphere(p,x,y,z,a,b,c,color=0,material='matte',n=18,m=12){const vertex=(u,v)=>[x+a*Math.sin(v)*Math.cos(u),y+b*Math.cos(v),z+c*Math.sin(v)*Math.sin(u)];for(let j=0;j<m;j++)for(let i=0;i<n;i++){cineFace(p,[vertex(i/n*CINE_TAU,j/m*Math.PI),vertex((i+1)/n*CINE_TAU,j/m*Math.PI),vertex((i+1)/n*CINE_TAU,(j+1)/m*Math.PI),vertex(i/n*CINE_TAU,(j+1)/m*Math.PI)],color,material);p.faces.at(-1).sphere=[x,y,z,a,b,c];}}
export function cineLathe(p,profile,color=0,material='metal',n=32){for(let j=1;j<profile.length;j++)for(let i=0;i<n;i++){const vertex=(k,a)=>[profile[k][1]*Math.cos(a),profile[k][0],profile[k][1]*Math.sin(a)],normal=(k,a)=>{const before=profile[Math.max(0,k-1)],after=profile[Math.min(profile.length-1,k+1)],dy=after[0]-before[0],dr=after[1]-before[1];return[Math.cos(a)*dy,-dr,Math.sin(a)*dy];};cineFace(p,[vertex(j-1,i/n*CINE_TAU),vertex(j-1,(i+1)/n*CINE_TAU),vertex(j,(i+1)/n*CINE_TAU),vertex(j,i/n*CINE_TAU)],color,material);p.faces.at(-1).normals=[normal(j-1,i/n*CINE_TAU),normal(j-1,(i+1)/n*CINE_TAU),normal(j,(i+1)/n*CINE_TAU),normal(j,i/n*CINE_TAU)];}}
export function cineExtrude(p,outline,depth,color=0,material='matte'){for(const z of [-depth/2,depth/2])cineFace(p,outline.map(q=>[q[0],q[1],z]),color,material);for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];cineFace(p,[[...a,-depth/2],[...b,-depth/2],[...b,depth/2],[...a,depth/2]],color,material);}}
export function cineTube(p,path,r,color=0,material='matte',n=7){for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;for(let j=0;j<n;j++){const v=(q,k)=>{const t=k/n*CINE_TAU;return[q[0]-dy/l*Math.cos(t)*r,q[1]+dx/l*Math.cos(t)*r,q[2]+Math.sin(t)*r];};cineFace(p,[v(a,j),v(a,j+1),v(b,j+1),v(b,j)],color,material);}}}
export function cinePetal(p,x,y,z,angle,length,width,color=0,detail=1){const n=detail<1?6:9,m=detail<1?2:4;for(let j=0;j<n;j++)for(let i=0;i<m;i++){const v=(u,k)=>{const spread=(k/m-.5)*width*Math.sin(u*Math.PI);return[x+Math.cos(angle)*u*length-Math.sin(angle)*spread,y+Math.sin(angle)*u*length+Math.cos(angle)*spread,z+Math.sin(u*Math.PI)*length*.2+spread*spread];};cineFace(p,[v(j/n,i),v((j+1)/n,i),v((j+1)/n,i+1),v(j/n,i+1)],color,'silk');}}
export function cineTransform(v,p){let [x,y,z]=v.map((q,i)=>q*p.scale[i]);for(let k=0;k<3;k++){const a=p.rot[k],c=Math.cos(a),s=Math.sin(a);if(k===0)[y,z]=[y*c-z*s,y*s+z*c];if(k===1)[x,z]=[x*c+z*s,z*c-x*s];if(k===2)[x,y]=[x*c-y*s,y*c+x*s];}return[x+p.pos[0],y+p.pos[1],z+p.pos[2]];}
export function cinematic(ctx,w,h,dpr,stage,design){
 stage.card ||= {};
 const reduced=!stage.forceMotion&&matchMedia('(prefers-reduced-motion: reduce)').matches,rand=cineRandom(design.seed||Array.from(stage.card.a||'cinema').reduce((n,c)=>n+c.charCodeAt(0),31)),model=design.build(stage),parts=model.parts;
 const dust=Array.from({length:stage.preview?26:75},()=>({x:rand()*2-1,y:rand()*2-1,z:rand()*2,phase:rand()*CINE_TAU,size:.2+rand()*1.3}));
 let gpu=null,gpuError='';try{if(parts.length&&!stage.forceCanvas)gpu=cineGPU(w,h);}catch(error){gpuError=error.message;gpu=null;}
 let clock=0,eventAt=-1,dead=false,mean=0,frames=0,tier=1,hold=0,px=.5,py=.5,photo=null,photoURL='';
 stage.onPointerDown=()=>{eventAt=clock;return true;};stage.onDispose=()=>{dead=true;photo=null;parts.length=0;gpu?.dispose();};
 const norm=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
 return(t,dt)=>{
  if(dead)return;if(gpu?.lost()){gpu.dispose();gpu=null;}const started=performance.now();clock=t;dt=Math.min(.05,dt||.016);hold+=(Number(stage.holding)-hold)*Math.min(1,dt*5);px+=(stage.pointer.x-px)*Math.min(1,dt*3);py+=(stage.pointer.y-py)*Math.min(1,dt*3);
  const autoAt=design.autoAt||4.8;if(eventAt<0&&t>autoAt)eventAt=autoAt;const e=eventAt<0?0:Math.max(0,t-eventAt),a=cineEase(e/(design.actionTime||2.4)),returning=cineEase((e-4.7)/2.5),form=reduced?1:cineEase(t/2.5);
  const state={t:reduced?10:t,e:reduced?4:e,a:reduced?.65:a,returning:reduced?.35:returning,form,hold:reduced?0:hold,px:reduced?.5:px,py:reduced?.5:py,dt,stage,reduced,tier};
  const cam=design.camera?.(state)||[-.28,.12,1];const yaw=cam[0],pitch=cam[1],S=Math.min(w*.42,h*.27)*(cam[2]||1),cx=w*.5,cy=h*(design.center||.40);
  const world=v=>{let [x,y,z]=v;[x,z]=[x*Math.cos(yaw)+z*Math.sin(yaw),z*Math.cos(yaw)-x*Math.sin(yaw)];return[x,y*Math.cos(pitch)-z*Math.sin(pitch),z*Math.cos(pitch)+y*Math.sin(pitch)];};
  const project=v=>{const q=world(v),s=4/(4+q[2]);return[cx+q[0]*S*s,cy+q[1]*S*s,q[2],s];};
  const colors=customPalette(stage,design.palette||[[154,119,191],[241,185,104],[37,47,63],[230,221,207]]);const color=c=>typeof c==='number'?colors[c%colors.length]:c;
  const rgb=(c,f=1)=>`rgb(${color(c).map(v=>Math.max(0,Math.min(255,Math.round(v*f)))).join(',')})`;
  const ink=(c,min=145)=>{const v=color(c),l=v[0]*.2126+v[1]*.7152+v[2]*.0722,k=Math.max(0,(min-l)/(255-l||1));return `rgb(${v.map(x=>Math.round(x+(255-x)*k)).join(',')})`;};
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle=design.background||'#080b13';ctx.fillRect(0,0,w,h);
  const atmosphere=ctx.createRadialGradient(cx-w*.14,cy-h*.12,0,cx,cy,h*.65);atmosphere.addColorStop(0,rgb(0,.18));atmosphere.addColorStop(1,'transparent');ctx.fillStyle=atmosphere;ctx.fillRect(0,0,w,h);
  // Ground contact and distant falloff, rather than a uniformly glowing object.
  const shadow=ctx.createRadialGradient(cx,cy+S*.9,0,cx,cy+S*.9,S*1.1);shadow.addColorStop(0,'rgba(0,0,0,.75)');shadow.addColorStop(1,'transparent');ctx.save();ctx.translate(0,(cy+S*.9)*.73);ctx.scale(1,.27);ctx.fillStyle=shadow;ctx.fillRect(0,0,w,h*4);ctx.restore();
  design.update?.(model,state);
  const queue=[];
  for(const p of gpu?[]:parts){if(p.opacity<.001)continue;const map=v=>p.deform?cineTransform(p.deform(v,state),p):cineTransform(v,p);
   for(const f of p.faces){const v=f.v.map(map),q=v.map(project),depth=q.reduce((n,x)=>n+x[2],0)/q.length;queue.push({type:0,p,f,v,q,depth});}
   for(const l of p.lines){const v=l.v.map(map),q=v.map(project);queue.push({type:1,p,l,v,q,depth:q.reduce((n,x)=>n+x[2],0)/q.length-.008});}
   for(const d of p.dots){const v=p.dotDeform?cineTransform(p.dotDeform(d,state),p):map(d.v),q=project(v);queue.push({type:2,p,d,v,q,depth:q[2]-.012});}
  }
  queue.sort((a,b)=>b.depth-a.depth);
  const key=norm([-.45,-.7,-.65]),rim=norm([.8,-.25,.5]);
  for(const p of parts)p.shadeKey=p.rot.map(a=>Math.round(a*45)).join(',')+(p.deform?','+Math.floor(frames/5):'')+(p.materialVersion||'');
  for(const item of queue){const {p,q}=item;ctx.globalAlpha=p.opacity;
   if(item.type===0){const {v,f}=item;let light=f.light;if(f.shadeKey!==p.shadeKey||light===undefined){const u=v[1].map((x,i)=>x-v[0][i]),vv=v[2].map((x,i)=>x-v[0][i]),n=norm([u[1]*vv[2]-u[2]*vv[1],u[2]*vv[0]-u[0]*vv[2],u[0]*vv[1]-u[1]*vv[0]]),dot=Math.abs(n.reduce((s,x,i)=>s+x*key[i],0)),edge=Math.pow(Math.abs(n.reduce((s,x,i)=>s+x*rim[i],0)),5);light=.25+dot*.68+edge*.13;if(f.material==='metal')light=.22+dot*.48+Math.pow(dot,18)*.8+edge*.35;if(f.material==='silk')light=.3+dot*.56+edge*.2;if(f.material==='light')light=1.15;f.light=light;f.shadeKey=p.shadeKey;}if(f.material==='glass')ctx.globalAlpha*=.24;
    ctx.beginPath();q.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));ctx.closePath();ctx.fillStyle=rgb(f.color,light);ctx.fill();ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.45;ctx.stroke();
   }else if(item.type===1){ctx.strokeStyle=rgb(item.l.color);ctx.lineWidth=Math.max(.45,item.l.width*S);ctx.beginPath();q.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));ctx.stroke();
   }else{ctx.fillStyle=rgb(item.d.color,item.d.brightness||1);ctx.beginPath();ctx.arc(q[0],q[1],Math.max(.4,item.d.size*S*q[3]),0,CINE_TAU);ctx.fill();}
  }
  ctx.globalAlpha=1;if(gpu)ctx.drawImage(gpu.draw(parts,S,cy,yaw,pitch,color,state),0,0,w,h);const api={ctx,w,h,S,cx,cy,project,rgb,state,photo};
  if(model.photo&&(stage.card.img||'')!==photoURL){photoURL=stage.card.img||'';photo=null;if(photoURL){const im=new Image();im.onload=()=>{if(!dead){photo=im;stage.requestRender?.();}};im.src=photoURL;}}api.photo=photo;
  design.overlay?.(model,api);
  for(let i=0;i<dust.length*tier;i++){const d=dust[i],q=project([d.x*1.8,d.y*1.8+(reduced?0:Math.sin(t*.16+d.phase)*.045),d.z+1]);ctx.globalAlpha=.08+.12*(1-d.z/2);ctx.fillStyle=rgb(1);ctx.beginPath();ctx.arc(q[0],q[1],d.size*q[3],0,CINE_TAU);ctx.fill();}ctx.globalAlpha=1;
  const revealed=reduced?t>1:e>(design.revealAt||2.7);stage.revealed=revealed;const bounds=[];
  if(revealed&&stage.card.tm!=='none'&&!stage.preview){
   ctx.globalAlpha=reduced?1:cineEase((e-2.6)/1);let y=h*.735;const values=[stage.card.p,stage.card.m,stage.card.d],sizes=[Math.min(26,w*.058),Math.min(17,w*.041),Math.min(14,w*.033)];const lines=[];
   const anchor=design.titleAnchor?.(model,state);if(anchor&&values[0]&&values[0].length<=18){const q=project(anchor),size=Math.min(20,w*.044);ctx.font=canvasTextFont(stage,`400 ${size}px`);ctx.textAlign='center';ctx.fillStyle=design.titleColor||ink(1);ctx.fillText(values[0],q[0],q[1],S*.85);const width=Math.min(S*.85,ctx.measureText(values[0]).width);bounds.push({left:q[0]-width/2,right:q[0]+width/2,y:q[1],width,size});}
   for(let k=0;k<3;k++){if(k===0&&anchor&&values[0]?.length<=18)continue;ctx.font=canvasTextFont(stage,`400 ${sizes[k]}px`);let line='';for(const word of (values[k]||'').split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>w*.8&&line){lines.push({s:line,k});line=word;}else line=next;}if(line)lines.push({s:line,k});}
   const total=lines.reduce((sum,l)=>sum+sizes[l.k]*1.38,0),fit=Math.min(1,h*.19/Math.max(1,total));
   ctx.strokeStyle=rgb(1,.5);ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(cx-w*.12,y-19);ctx.lineTo(cx+w*.12,y-19);ctx.stroke();
   for(const l of lines){const size=sizes[l.k]*fit;ctx.font=canvasTextFont(stage,`400 ${size}px`);ctx.textAlign='center';ctx.fillStyle=l.k===0?ink(1):l.k===2?ink(0,120):'#eee6d9';const width=Math.min(w*.8,ctx.measureText(l.s).width);ctx.fillText(l.s,cx,y,w*.8);bounds.push({left:cx-width/2,right:cx+width/2,y,width,size});y+=size*1.38;}ctx.globalAlpha=1;
  }
  if(!stage.preview){ctx.font=canvasTextFont(stage,'400 11px');ctx.fillStyle='#c5c3cb';ctx.textAlign='center';const caption=[];let line='';for(const word of (design.hint||'Toca para transformar').split(' ')){const next=line?line+' '+word:word;if(ctx.measureText(next).width>w*.84&&line){caption.push(line);line=word;}else line=next;}if(line)caption.push(line);caption.slice(0,2).forEach((text,i)=>ctx.fillText(text,cx,h*.935+i*14,w*.88));}
  const elapsed=performance.now()-started;mean+=(elapsed-mean)*.035;if(++frames%120===0)tier=mean>24?.45:mean>15?.7:1;
  stage.diagnostics={cinematic:true,renderer:gpu?'webgl':'canvas',gpuError,particles:dust.length,faces:parts.reduce((n,p)=>n+p.faces.length,0),event:e,formed:form,reduced,textBounds:bounds,quality:tier,ms:mean};
 };
}
