import { cinematic,cinePart,cineBox,cineFace,cineLine,cinePetal,cineTube,cineSphere,cineEase,CINE_TAU } from './cinema.js';
export function herbariumCinema(ctx,w,h,dpr,stage){return cinematic(ctx,w,h,dpr,stage,{
 palette:[[106,146,102],[210,181,131],[41,65,53],[181,175,143]],background:'#0d1514',hint:'Toca para elevar los ejemplares · observa los ejemplares',camera:s=>[-.20+s.a*.06,.45,.97],center:.43,
 build(){const book=cinePart(),page=cinePart(),plants=[],parts=[book,page];cineBox(book,0,.42,0,1.58,.1,1.18,2);for(let j=0;j<8;j++)cineBox(book,0,.35-j*.009,0,1.48,.008,1.1,j%2?3:1);cineLine(book,[[0,.26,-.53],[0,.26,.53]],2,.008);for(let j=0;j<4;j++)cineBox(book,0,.41,-.42+j*.28,.09,.14,.018,1);
 cineFace(page,[[.02,.24,-.53],[.73,.24,-.53],[.73,.24,.53],[.02,.24,.53]],3,'silk');
 for(let j=0;j<4;j++){const p=cinePart(),x=-.56+j*.35,z=-.31+j*.18;p.home=[x,.23,z];p.i=j;p.pos=[...p.home];cineTube(p,[[0,0,0],[.018,-.22,.015],[0,-.51,0]],.006,0);for(let k=0;k<5;k++){const y=-.05-k*.085;for(const s of [-1,1]){const angle=s===1?-.5:-2.6,len=(j===1?.14:.10)+(4-k)*.008;cinePetal(p,0,y,0,angle,len,.05,0);cineLine(p,[[0,y,-.006],[Math.cos(angle)*len,y+Math.sin(angle)*len,-.006]],1,.0015);for(let n=1;n<5;n++)cineLine(p,[[Math.cos(angle)*len*n/5,y+Math.sin(angle)*len*n/5,-.008],[Math.cos(angle)*len*n/5+s*.012,y+Math.sin(angle)*len*n/5-.019,-.006]],1,.001);}}
 if(j===0||j===3){for(let k=0;k<7;k++)cinePetal(p,0,-.52,0,k/7*CINE_TAU,.066,.044,j===0?1:[170,125,128]);cineSphere(p,0,-.52,-.015,.016,.016,.011,1,'matte',8,5);}if(j===2){for(let k=0;k<8;k++)cineSphere(p,Math.sin(k*3)*.035,-.46-k*.016,0,.019,.013,.015,1,'silk',8,5);}
 plants.push(p);parts.push(p);}
 return {parts,book,page,plants};},
 update(m,s){m.page.rot[2]=-s.a*.42;m.page.deform=v=>[v[0],v[1]-Math.sin(v[0]*3)*s.a*.07,v[2]];for(const p of m.plants){const rise=cineEase((s.e-p.i*.22)/2)*(1-s.returning*.3);p.pos=[p.home[0],p.home[1]-rise*(.25+p.i*.06),p.home[2]+rise*(p.i%2?.20:-.15)];p.rot[0]=Math.PI/2*(1-rise)-.15*rise;p.rot[2]=Math.sin(s.e*.7+p.i)*rise*.05;p.deform=v=>[v[0]+Math.sin(v[1]*5+s.e*1.1+p.i)*rise*.008,v[1],v[2]];}}
});}
