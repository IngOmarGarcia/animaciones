import { cinematic,cinePart,cineSphere,cineTube,cineLine,cineRandom,CINE_TAU } from './cinema.js';
export function webCinema(ctx,w,h,dpr,stage){return cinematic(ctx,w,h,dpr,stage,{
 seed:212,palette:[[163,183,192],[215,233,233],[28,37,43],[131,159,163]],background:'#070f15',hint:'Toca los hilos · la vibración viaja por la seda',
 camera:s=>[-.1+(s.px-.5)*.12,.03,.88],
 build(){const parts=[],web=cinePart(),spider=cinePart(),drops=cinePart(),rand=cineRandom(81),anchors=cinePart();parts.push(anchors,web,drops,spider);
 for(let j=0;j<18;j++){const a=j/18*CINE_TAU;cineLine(web,[[0,0,0],[Math.cos(a),Math.sin(a),0]],0,.006);}
 const path=[];for(let i=0;i<1200;i++){const a=i*.048,r=.045+i/1200*.88;path.push([Math.cos(a)*r,Math.sin(a)*r,Math.sin(a*3)*.002]);}cineLine(web,path,0,.0045);web.path=path;
 for(let i=0;i<70;i++){const a=rand()*CINE_TAU,r=.18+rand()*.70,x=Math.cos(a)*r,y=Math.sin(a)*r;cineSphere(drops,x,y,.014,.012,.021,.014,1,'glass',8,6);cineLine(drops,[[x-.003,y-.013,-.003],[x-.006,y+.004,-.004]],1,.002);}
 cineSphere(spider,0,.02,-.06,.055,.080,.04,[43,56,64],'metal');cineSphere(spider,0,-.060,-.065,.036,.034,.025,[70,86,92],'metal');for(const x of [-.013,.013])cineSphere(spider,x,-.069,-.094,.005,.006,.005,1,'light',6,4);
 const legs=[];for(let j=0;j<8;j++){const p=cinePart(),s=j<4?-1:1,k=j%4,y=-.058+k*.024;cineTube(p,[[s*.019,y,-.07],[s*(.10+k*.01),y-.055,-.095],[s*(.16-k*.008),y+.065,-.018]],.006,[65,80,86],'metal',6);legs.push(p);parts.push(p);}
 for(const s of [-1,1])cineTube(anchors,[[s*1.3,-1.2,.4],[s*1.05,-.5,.25],[s*1.08,.1,.3],[s*1.25,.85,.4]],.022,[25,36,42]);
 const nodes=Array.from({length:144},(_,i)=>{const ring=Math.floor(i/18),a=i%18/18*CINE_TAU,r=(ring+1)/8*.92;return{x:Math.cos(a)*r,y:Math.sin(a)*r,z:0,v:0,neighbors:[ring*18+(i+1)%18,ring*18+(i+17)%18,...(ring?[i-18]:[]),...(ring<7?[i+18]:[])]};});const assign=v=>{const ring=Math.max(0,Math.min(7,Math.round(Math.hypot(v[0],v[1])/.92*8)-1)),a=(Math.round(Math.atan2(v[1],v[0])/CINE_TAU*18)+18)%18;v.webNode=ring*18+a;};for(const p of [web,drops]){for(const f of p.faces)for(const v of f.v)assign(v);for(const l of p.lines)for(const v of l.v)assign(v);}
 return {parts,web,drops,spider,legs,nodes,lastEvent:0};},
 update(m,s){const tx=(s.px-.5)*1.5,ty=(s.py-.4)*1.8;if(!s.reduced){if((s.e>0&&m.lastEvent===0)||s.e<m.lastEvent){let nearest=m.nodes[0];for(const n of m.nodes)if(Math.hypot(n.x-tx,n.y-ty)<Math.hypot(nearest.x-tx,nearest.y-ty))nearest=n;nearest.v=1.8;}m.lastEvent=s.e;for(let step=0;step<2;step++){const force=m.nodes.map(n=>-16*n.z-2.8*n.v+n.neighbors.reduce((sum,i)=>sum+(m.nodes[i].z-n.z)*30,0));m.nodes.forEach((n,i)=>{n.v+=force[i]*s.dt/2;n.z+=n.v*s.dt/2;});}}const deform=v=>{const tension=m.nodes[v.webNode]?.z||0;return[v[0]+(tx-v[0])*Math.abs(tension)*.1,v[1]+(ty-v[1])*Math.abs(tension)*.1,v[2]+tension];};m.web.deform=deform;m.drops.deform=deform;
 const x=tx*s.a,y=ty*s.a;m.spider.pos=[x,y,-.04];m.spider.rot[2]=Math.atan2(ty,tx)+Math.PI/2;for(let i=0;i<8;i++){m.legs[i].pos=[x,y,-.04];m.legs[i].rot[2]=m.spider.rot[2];m.legs[i].rot[0]=Math.sin(s.e*7+i*.8)*.15*(1-s.a);}
 },
 overlay(m,{ctx,project,rgb,state:s,S}){if(!s.reduced&&s.e>0&&s.e<3){const q=project([(s.px-.5)*1.5,(s.py-.4)*1.8,0]);ctx.strokeStyle=rgb(1);ctx.globalAlpha=(1-s.a)*.35;ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(q[0],q[1],s.e*S*.25,s.e*S*.24,0,0,CINE_TAU);ctx.stroke();ctx.globalAlpha=1;}}
});}
