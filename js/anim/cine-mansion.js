import { cinematic,cinePart,cineBox,cineFace,cineLine,cineEase } from './cinema.js';
export function mansionCinema(ctx,w,h,dpr,stage){return cinematic(ctx,w,h,dpr,stage,{
 seed:101,palette:[[118,104,151],[241,183,91],[35,40,58],[174,160,183]],hint:'Toca la mansión · descubre sus habitaciones',
 camera:s=>[-.38+s.a*.20,.10+s.a*.09, .84],
 build(){const parts=[],rooms=[];for(let row=0;row<3;row++)for(let col=0;col<3;col++){
  const p=cinePart(),x=(col-1)*.45,y=(row-1)*.43;p.home=[x,y,0];p.pos=[...p.home];p.row=row;p.col=col;rooms.push(p);parts.push(p);
  cineBox(p,0,0,.08,.43,.40,.38,0);cineBox(p,0,.18,-.13,.47,.045,.44,3);
  // Recess, warm interior, carved mullions and lintels.
  cineBox(p,0,-.015,-.126,.21,.25,.018,2);cineBox(p,0,-.015,-.142,.15,.20,.012,1);
  for(const xx of [-.104,.104])cineBox(p,xx,-.015,-.15,.025,.26,.032,3);
  for(const yy of [-.145,.115])cineBox(p,0,yy,-.15,.23,.026,.04,3);
  cineBox(p,0,-.015,-.16,.012,.23,.024,2);cineBox(p,0,-.015,-.16,.19,.012,.024,2);
  for(let j=0;j<6;j++)cineLine(p,[[-.21,-.16+j*.061,-.125],[.21,-.16+j*.061,-.125]],[66,61,79],.002);
  if(row===0){cineFace(p,[[-.235,-.20,-.16],[.235,-.20,-.16],[0,-.53,.03]],2);cineFace(p,[[.235,-.20,-.16],[.235,-.20,.30],[0,-.53,.03]],0);for(let j=0;j<6;j++){const f=j/6;cineLine(p,[[-.235*(1-f),-.2-f*.33,-.16*(1-f)+.03*f],[.235*(1-f),-.2-f*.33,-.16*(1-f)+.03*f]],3,.003);}}
  // Cornices, balcony balusters, individual masonry and curtains make the
  // exploded model an inhabited miniature, not nine identical cubes.
  for(const xx of [-.195,.195]){cineBox(p,xx,0,-.155,.026,.39,.032,3);for(let j=0;j<4;j++)cineBox(p,xx,-.16+j*.10,-.18,.045,.038,.03,0);}
  for(let j=0;j<8;j++)for(let k=0;k<3;k++){const xx=-.19+k*.14+(j%2)*.02;if(Math.abs(xx)>.11)cineLine(p,[[xx,-.18+j*.048,-.14],[xx+.07,-.18+j*.048,-.14]],[91,80,103],.0015);}
  for(const xx of [-.055,.055]){cineFace(p,[[xx-.02,-.11,-.17],[xx+.02,-.11,-.17],[xx+.011,.08,-.17],[xx-.014,.045,-.17]],[98,39,65],'silk');}
  if(row===1){cineBox(p,0,.145,-.26,.28,.018,.17,2);for(let j=0;j<7;j++)cineBox(p,-.12+j*.04,.075,-.34,.008,.14,.008,3);cineBox(p,0,.005,-.34,.27,.012,.012,3);}
  if(col===0&&row===0)cineBox(p,-.07,-.51,.15,.09,.24,.1,2);
  if(row===0&&col===1){cineBox(p,0,-.6,.07,.14,.16,.18,0);cineFace(p,[[-.11,-.66,-.03],[.11,-.66,-.03],[0,-.83,.05]],2);cineBox(p,0,-.61,-.04,.047,.075,.012,1);}p.windowFaces=p.faces.filter(f=>f.color===1);
 }const stairs=cinePart();parts.push(stairs);const plinth=cinePart();cineBox(plinth,0,.77,.13,1.7,.10,.8,2);parts.push(plinth);
 return {parts,rooms,stairs};},
 update(m,s){for(const p of m.rooms){const lit=s.t>1.5+(p.row*3+p.col)*.15;for(const f of p.windowFaces){f.color=lit?1:[51,37,33];f.material=lit?'light':'matte';}p.materialVersion=lit?'lit':'dark';const lag=cineEase((s.e-p.col*.15-p.row*.08)/2);p.pos=[p.home[0]*(1+lag*.43),p.home[1]*(1+lag*.43),p.home[2]+(p.col%2?-.30:.24)*lag];p.rot[1]=(p.col-1)*lag*.08;}
 m.stairs.faces=[];m.stairs.lines=[];for(let i=0;i<8;i++){const a=m.rooms[i].pos,b=m.rooms[i+1].pos;for(let j=0;j<9;j++){const f=j/8;cineBox(m.stairs,a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f+.2,a[2]+(b[2]-a[2])*f-.24,.11,.018,.10,3);}cineLine(m.stairs,[[a[0],a[1]+.10,a[2]-.24],[b[0],b[1]+.10,b[2]-.24]],1,.003);}
 },
 overlay(m,{ctx,w,h,S,cx,cy,state}){ctx.save();const fog=ctx.createLinearGradient(0,cy+S*.55,0,cy+S*1.3);fog.addColorStop(0,'transparent');fog.addColorStop(.5,'rgba(72,67,92,.16)');fog.addColorStop(1,'transparent');ctx.fillStyle=fog;ctx.fillRect(cx-S*1.2,cy+S*.55,S*2.4,S*.8);ctx.restore();}
});}
