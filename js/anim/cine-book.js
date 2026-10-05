import { cinematic,cinePart,cineBox,cineFace,cineLine,cineTube,cinePetal,cineEase,CINE_TAU } from './cinema.js';
export function bookCinema(ctx,w,h,dpr,stage){return cinematic(ctx,w,h,dpr,stage,{
 autoAt:5.8,titleColor:'#32272e',titleAnchor:()=>[.35,.09,.04],palette:[[109,75,113],[208,171,99],[43,28,43],[208,194,160]],hint:'Desliza para pasar página · la tinta recuerda',camera:s=>[-.19+s.a*.06,.48,1.12],center:.43,
 build(){const parts=[],covers=[],pages=[],ink=cinePart();for(const sign of [-1,1]){const cover=cinePart();cover.sign=sign;cineBox(cover,sign*.37,.22,0,.73,.075,.99,2);cineBox(cover,sign*.37,.17,0,.67,.035,.92,0);for(const z of [-.43,.43])cineLine(cover,[[sign*.06,.14,z],[sign*.67,.14,z]],1,.008);for(const x of [sign*.06,sign*.67])cineLine(cover,[[x,.14,-.43],[x,.14,.43]],1,.008);for(const z of [-.43,.43])for(let j=0;j<3;j++)cinePetal(cover,sign*.61,.13,z,j*CINE_TAU/3,.07,.022,1);covers.push(cover);parts.push(cover);
 for(let j=0;j<4;j++){const p=cinePart();p.sign=sign;p.page=j;const v=[[sign*.02,.115-j*.009,-.43],[sign*.66,.10-j*.009,-.43],[sign*.66,.10-j*.009,.43],[sign*.02,.115-j*.009,.43]];cineFace(p,v,3,'silk');for(let k=0;k<15;k++){const z=-.35+k*.045,path=[];for(let n=0;n<12;n++)path.push([sign*(.08+n*.046),.095-j*.009,z+Math.sin(n*7+k)*.006]);cineLine(p,path,[99,78,67],.002);}pages.push(p);parts.push(p);}}
 const spine=cinePart();cineBox(spine,0,.21,0,.08,.1,1.0,2);for(let j=0;j<5;j++)cineBox(spine,0,.20,-.4+j*.2,.1,.13,.025,1);parts.push(spine,ink);
 const source=[];for(let j=0;j<42;j++){const p=[];for(let i=0;i<35;i++){const u=i/34,theta=j/42*CINE_TAU+u*.7;
 const shoulder=Math.exp(-Math.pow((u-.65)/.21,2)),r=.05+.13*Math.sin(u*Math.PI)+shoulder*Math.pow(Math.abs(Math.cos(theta)),5)*.40;
 const x=Math.cos(theta)*r+.09*Math.sin(u*5),y=-.03-u*.88+shoulder*.07*Math.sin(theta*3),z=Math.sin(theta)*r*.75+.07*Math.sin(u*6+theta);
 p.push([x,y,z]);}cineLine(ink,p,j%8?0:1,.002);source.push(p);}
 return {parts,covers,pages,ink,source};},
 update(m,s){const open=cineEase(s.t/3);for(const p of m.covers)p.rot[2]=p.sign*(1-open)*1.4;for(const p of m.pages){const turn=cineEase((s.e-p.page*.20)/2)*(1-s.returning);p.rot[2]=p.sign*((1-open)*1.35+turn*.37);p.deform=v=>[v[0],v[1]-Math.sin(Math.abs(v[0])*Math.PI)*turn*.09,v[2]];}
 const rise=cineEase((s.t-2)/2.5)*(1-s.returning);m.ink.opacity=rise;m.ink.faces=[];m.ink.lines.forEach((l,j)=>{l.v=m.source[j].map((v,i)=>{const u=i/34;return[v[0]*(.7+.3*rise)+Math.sin(s.e*.9+u*5+j*.3)*rise*.04,.09+(v[1]-.09)*rise,v[2]+Math.sin(u*7+s.e+j)*rise*.025];});});for(let j=0;j<41;j+=2)for(let i=1;i<35;i++)cineFace(m.ink,[m.ink.lines[j].v[i-1],m.ink.lines[j+1].v[i-1],m.ink.lines[j+1].v[i],m.ink.lines[j].v[i]],[59+j,37+j*.5,73+j],'silk');
 },
 overlay(m,{ctx,project,S,state:s}){const q=project([0,-.2,0]);const g=ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],S*.6);g.addColorStop(0,`rgba(116,74,139,${.10*(1-s.returning)})`);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(q[0]-S,q[1]-S,S*2,S*2);}
});}
