import { LightTurtle } from './turtle.js';
import { customPalette } from './color-style.js';
import { canvasTextFont } from './text-style.js';

const TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,u)=>a+(b-a)*u;
const stairPosition=g=>{const side=Math.floor(g/7),u=(g%7)/7;return side===0?[-.5+u,-.5]:side===1?[.5,-.5+u]:side===2?[.5-u,.5]:[-.5,.5-u];};
// Inverse projection makes the loop close from the initial viewpoint despite
// physically separated elevations. Orbiting exposes those separations.
const stairAnchor=g=>{const [sx,sy]=stairPosition(g),yaw=-.72,pitch=.25,z=g*.032-.43,b=sx*Math.sin(yaw)-sy*Math.sin(pitch)*Math.cos(yaw),depth=(z-b)/(b/3.4+Math.cos(pitch)*Math.cos(yaw)),rx=sx*(1+depth/3.4),yp=sy*(1+depth/3.4),rz=-yp*Math.sin(pitch)+depth*Math.cos(pitch);return [rx*Math.cos(yaw)-rz*Math.sin(yaw),yp*Math.cos(pitch)+depth*Math.sin(pitch),z];};
// Deterministic geometry keeps the object stable during editor updates and replay.
function randomSource(seed){return ()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}

function sculpture(kind,card,quality) {
 const pen=new LightTurtle(), points=[],rand=randomSource(1977+kind*993);
 const add=(x,y,z=0,c=0,g=0,u=0,v=0)=>points.push({x,y,z,c,g,u,v,phase:rand()*TAU,size:.65+rand()*.85});
 const line=(a,b,c=0,g=0)=>{const before=pen.points.length;pen.path([a,b],c);for(const p of pen.points.slice(before)){p.g=g;add(p.x,p.y,p.z,c,g);}};
 const path=(p,c=0,g=0)=>{for(let i=1;i<p.length;i++)line(p[i-1],p[i],c,g);};
 const oval=(x,y,rx,ry,z=0,c=0,g=0)=>{const before=pen.points.length;pen.ellipse(x,y,rx,ry,z,c);for(const p of pen.points.slice(before))p.g=g;for(let i=0;i<100;i++){const a=i/100*TAU;add(x+rx*Math.cos(a),y+ry*Math.sin(a),z,c,g,a);}};
 const ball=(x,y,z,rx,ry,rz,c=0,g=0,n=360)=>{for(let i=0;i<n*quality;i++){const a=rand()*TAU,b=Math.acos(2*rand()-1);add(x+rx*Math.sin(b)*Math.cos(a),y+ry*Math.cos(b),z+rz*Math.sin(b)*Math.sin(a),c,g,a,b);}};
 const plane=(x,y,z,wx,hy,c=0,g=0,n=300)=>{for(let i=0;i<n*quality;i++)add(x+(rand()-.5)*wx,y+(rand()-.5)*hy,z,c,g);};
 const box=(x,y,z,wx,hy,d,c=0,g=0)=>{for(const zz of [z-d/2,z+d/2]){path([[x-wx/2,y-hy/2,zz],[x+wx/2,y-hy/2,zz],[x+wx/2,y+hy/2,zz],[x-wx/2,y+hy/2,zz],[x-wx/2,y-hy/2,zz]],c,g);plane(x,y,zz,wx,hy,c,g,100);}for(const xx of [-1,1])for(const yy of [-1,1])line([x+xx*wx/2,y+yy*hy/2,z-d/2],[x+xx*wx/2,y+yy*hy/2,z+d/2],c,g);};
 const leaf=(x,y,z,angle,length,c=0,g=0)=>{const start=pen.points.length;pen.move(x,y,z).ink(c).curve(x+Math.cos(angle+.8)*length,y+Math.sin(angle+.8)*length,x+Math.cos(angle)*length,y+Math.sin(angle)*length,z).curve(x+Math.cos(angle-.8)*length,y+Math.sin(angle-.8)*length,x,y,z);for(const p of pen.points.slice(start))add(p.x,p.y,p.z,c,g);for(let i=0;i<140*quality;i++){const u=rand(),v=(rand()-.5)*Math.sin(u*Math.PI)*length*.55;add(x+Math.cos(angle)*length*u-Math.sin(angle)*v,y+Math.sin(angle)*length*u+Math.cos(angle)*v,z+Math.sin(u*Math.PI)*.04,c,g,u,v);}line([x,y,z],[x+Math.cos(angle)*length,y+Math.sin(angle)*length,z+.01],1,g);};
 const horse=(x,y,z,g)=>{ball(x,y,z,.19,.1,.07,0,g,250);ball(x+.19,y-.12,z,.06,.13,.055,0,g,100);ball(x+.25,y-.22,z,.08,.055,.05,1,g,80);path([[x+.1,y,z],[x+.18,y-.22,z],[x+.28,y-.24,z],[x+.32,y-.17,z],[x+.2,y-.12,z]],1,g);for(const a of [-1,1]){path([[x+a*.1,y+.04,z],[x+a*.15,y+.23,z],[x+a*.24,y+.21,z]],0,g);ball(x+a*.15,y+.14,z,.024,.08,.025,0,g,55);}path([[x-.16,y,z],[x-.28,y-.06,z],[x-.31,y+.12,z]],1,g);};
 const glyph=(text,c=0,g=0)=>{const cv=document.createElement('canvas');cv.width=320;cv.height=170;const cc=cv.getContext('2d');cc.font='bold 130px system-ui';cc.textAlign='center';cc.fillText(text,160,133);const image=cc.getImageData(0,0,320,170).data;for(let y=10;y<150;y+=5)for(let x=10;x<310;x+=5)if(image[(y*320+x)*4+3]>100)add((x-160)/240,(y-82)/240,rand()*.08,c,g);};
 switch(kind){
 case 0: // Architecture: each solid room has an individual group and connected stairs.
  for(let r=0;r<3;r++)for(let c=0;c<3;c++){const g=r*3+c,x=(c-1)*.43,y=(r-1)*.4;box(x,y,0,.4,.35,.28,0,g);box(x,y-.02,.155,.14,.18,.012,1,20+g);for(let j=0;j<4;j++)line([x-.14+j*.07,y+.11,-.12],[x-.07+j*.07,y+.08,.12],1,g);}
  path([[-.72,-.61,0],[0,-1.02,0],[.72,-.61,0]],0,9);for(let i=0;i<8;i++)path([[-.5+i*.12,.7-i*.05,.05],[-.5+i*.12,.65-i*.05,.05],[-.38+i*.12,.65-i*.05,.05]],1,10);
  break;
 case 1:
  for(let j=0;j<16;j++){const a=j/16*TAU;line([0,0,0],[Math.cos(a)*.86,Math.sin(a)*.86,0],0,0);}
  {const p=[];for(let i=0;i<740;i++){const a=i*.105,r=.07+i/740*.77;p.push([Math.cos(a)*r,Math.sin(a)*r,.015]);}path(p,0,0);}
  for(let i=0;i<60;i++){const a=rand()*TAU,r=rand()*.8;ball(Math.cos(a)*r,Math.sin(a)*r,.03,.018,.025,.025,1,0,10);}
  ball(0,0,.08,.055,.09,.045,1,1,90);for(let j=0;j<8;j++){const s=j<4?-1:1,y=(j%4-1.5)*.04;path([[0,y,.08],[s*.1,y-.08,.1],[s*.16,y+.08,.1]],1,1);}
  break;
 case 2:
  for(let r=0;r<4;r++)oval(0,0,.57+r*.025,.8+r*.025,0,r%2,0);
  for(let i=0;i<12;i++){const a=i/12*TAU;leaf(Math.cos(a)*.62,Math.sin(a)*.84,0,a,.13,1,0);}
  for(let i=0;i<2000*quality;i++){const a=rand()*TAU,r=Math.sqrt(rand());add(Math.cos(a)*r*.55,Math.sin(a)*r*.77,.02,0,1,a,r);}
  ball(0,0,.12,.08,.08,.08,1,2,90);break;
 case 3:
  box(0,.4,0,1.3,.15,.85,1,0);path([[-.64,.3,-.43],[-.64,-.37,-.43],[0,-.1,-.43],[.64,-.37,-.43],[.64,.3,-.43]],0,1);
  for(let page=0;page<2;page++)for(let j=0;j<12;j++){const p=[];for(let i=0;i<44;i++){const u=i/43;p.push([(page?1:-1)*(.06+u*.55),.26-j*.012,-.37+j*.06]);}path(p,j%3?0:1,2);}
  for(let j=0;j<50;j++)for(let i=0;i<45;i++){const a=j/50*TAU,u=i/44;add(Math.sin(a+u*7)*(.12+.25*Math.sin(u*Math.PI)),.35-u*1.1,Math.cos(a+u*7)*.2,0,3,u,a);}
  break;
 case 4:
  for(let j=0;j<5;j++){const a=j/5*TAU,x=Math.sin(a)*.58,z=Math.cos(a)*.58;horse(x,.08,z,j);line([x,-.65,z],[x,.55,z],1,10+j);}
  for(let j=0;j<6;j++)oval(0,-.67+j*.022,.8-j*.08,.16,0,1,20);
  for(let i=0;i<650*quality;i++){const a=rand()*TAU,r=Math.sqrt(rand())*.82;add(Math.cos(a)*r,.66,Math.sin(a)*r,0,21);}break;
 case 5:
  ball(0,.08,0,.32,.2,.19,0,0,550);ball(.24,-.2,0,.17,.2,.12,1,1,280);
  for(const s of [-1,1]){path([[s*.2,.16,0],[s*.25,.5,.04],[s*.36,.51,.04]],1,2);ball(s*.24,.28,.04,.045,.15,.055,0,2,90);path([[.23,-.35,s*.06],[.25,-.65,s*.08],[.4,-.47,s*.08]],0,1);leaf(s*.18,-.05,0,s===1?-.65:-2.5,.7,1,3);leaf(s*.17,-.03,.02,s===1?-.2:-2.95,.62,0,3);}
  for(let j=0;j<9;j++){const a=j/9*TAU;oval(Math.cos(a)*.24,.09+Math.sin(a)*.13,.032,.032,.19,1,0);}ball(.29,-.23,.13,.022,.026,.013,0,1,35);
  for(let j=0;j<8;j++){const b=(j+.5)/8*Math.PI,p=[];for(let i=0;i<=80;i++){const a=i/80*TAU;p.push([.325*Math.sin(b)*Math.cos(a),.08+.205*Math.cos(b),.195*Math.sin(b)*Math.sin(a)]);}path(p,2+j%3,5);}
  {const p=[];for(let i=0;i<100;i++){const u=i/99;p.push([-.2-u*.6,.1+Math.sin(u*5)*.14,u*.1]);}path(p,1,4);}break;
 case 6:
  oval(0,-.55,.67,.13,0,1,0);ball(0,-.69,0,.27,.13,.15,0,0,300);ball(0,-.39,0,.09,.12,.08,1,1,240);box(0,-.15,0,.18,.3,.13,0,2);
  for(const s of [-1,1])oval(s*.034,-.41,.02,.024,-.083,0,1);for(let j=0;j<6;j++)line([-.042+j*.016,-.333,-.086],[-.042+j*.016,-.312,-.086],0,1);
  for(let j=0;j<8;j++)leaf(-.23+j*.066,-.6,-.14,-Math.PI/2,.17,1,0);
  for(const s of [-1,1])path([[s*.12,-.24,0],[s*.26,-.02,0],[s*.32,.1,.02]],1,2);
  for(let i=0;i<2100*quality;i++){const u=rand(),a=rand()*TAU,r=.1+u*.48;add(Math.cos(a)*r,-.04+u*.78,Math.sin(a)*r*.55,Math.floor(u*14)%2,3,u,a);}
  for(let j=0;j<16;j++){const a=j/16*TAU,p=[];for(let i=0;i<60;i++){const u=i/59,r=.1+u*.48;p.push([Math.cos(a)*r,-.04+u*.78,Math.sin(a)*r*.55]);}path(p,j%2,3);}break;
 case 7:
  ball(0,.16,0,.63,.34,.48,0,0,1900);oval(0,.1,.63,.27,0,0,0);
  for(let j=0;j<4;j++){const a=j/4*TAU,p=[];for(let i=0;i<60;i++){const u=i/59,r=(u-.5)*1.05;p.push([Math.cos(a)*r,-.15+Math.pow(r,2)*.45,Math.sin(a)*r]);}path(p,1,1);for(const s of [-1,1])ball(Math.cos(a)*s*.51,-.01,Math.sin(a)*s*.51,.065,.06,.065,1,1,35);}
  ball(0,-.2,0,.08,.05,.08,1,1,100);for(let i=0;i<230*quality;i++){const a=rand()*TAU,r=Math.sqrt(rand())*.56;add(Math.cos(a)*r,-.17+Math.pow(r,2)*.5,Math.sin(a)*r,1,0);}break;
 case 8:
  for(let j=0;j<3;j++)box(0,0,-.25,1.35+j*.045,1.55+j*.045,.045,j%2,0);for(const x of [-.67,.67])for(const y of [-.78,.78])for(let j=0;j<4;j++)leaf(x,y,-.29,j/4*TAU,.1,1,0);
  box(.25,-.32,-.2,.44,.5,.03,1,1);line([.03,-.32,-.16],[.47,-.32,-.16],0,1);line([.25,-.57,-.16],[.25,-.07,-.16],0,1);
  box(0,.25,.18,.7,.08,.43,0,2);for(const x of [-.28,.28])line([x,.25,.3],[x,.66,.3],0,2);
  for(const x of [-.48,.48]){box(x,.39,.07,.21,.06,.23,1,3);box(x,.13,-.02,.21,.47,.04,1,3);line([x,.4,.17],[x,.67,.17],1,3);}
  ball(-.27,.16,.19,.045,.08,.05,1,4,70);oval(.18,.16,.08,.025,.2,1,4);break;
 case 9:
  for(let row=0;row<27;row++)line([-.76,-.65+row*.05,0],[.76,-.65+row*.05,0],0,0);
  for(let x=-2;x<=2;x++)for(let y=-1;y<=1;y++){if(y===0&&Math.abs(x)<2)continue;const cx=x*.28,cy=y*.34;for(let j=0;j<6;j++)leaf(cx,cy,.02,j/6*TAU,.13,1,1);oval(cx,cy,.045,.045,.04,0,1);}
  path([[-.78,-.69,0],[.78,-.69,0],[.78,.69,0],[-.78,.69,0],[-.78,-.69,0]],1,0);break;
 case 10:
  for(let j=0;j<2;j++){const p=[];for(let i=0;i<420;i++){const u=i/419,a=u*TAU*2+j*Math.PI;p.push([Math.sin(a)*(.27+u*.12),Math.sin(a*2)*.45,Math.cos(a)*.3]);}path(p,j,j);for(let i=0;i<900*quality;i++){const u=rand(),a=u*TAU*2+j*Math.PI;add(Math.sin(a)*(.27+u*.12)+(rand()-.5)*.035,Math.sin(a*2)*.45+(rand()-.5)*.045,Math.cos(a)*.3,j,j,u,a);}}break;
 case 11:
  for(const s of [-1,1])box(s*.35,.39,0,.68,.035,.97,1,0);
  for(let j=0;j<5;j++){const x=-.54+j*.25,y=.34,z=-.35+j*.15;line([x,y,z],[x,-.25,z],0,1+j);for(let k=0;k<4;k++)leaf(x,.24-k*.12,z,k%2?-.55:-2.6,.18,0,1+j);for(let k=0;k<5;k++)leaf(x,-.23,z,k/5*TAU,.075,1,1+j);}break;
 case 12:
  for(let j=0;j<2;j++){pen.move(-.8,j*.12).ink(j).curve(0,-1, .8,j*.12);}
  for(let j=0;j<2;j++)for(let i=0;i<1500*quality;i++){const a=rand()*TAU,r=Math.sqrt(rand())*.52;add(Math.cos(a)*r,Math.sin(a)*r,j*.15,j,j,a,r);}
  for(let j=0;j<130;j++){const a=j/130*TAU,p=[];for(let i=0;i<35;i++){const u=i/34,r=.53+u*(.14+.13*Math.sin(j*2.3));p.push([Math.cos(a+u*.15)*r,Math.sin(a+u*.15)*r,-.08+Math.sin(u*4+j)*.04]);}path(p,j%2,2);}break;
 case 13:
  {const crest=u=>u<.7?[-.9+u/.7*.95,.55-1.1*Math.sin(u/.7*Math.PI/2)]:[.05+.35*Math.cos(-Math.PI/2+(u-.7)/.3*Math.PI),-.2+.35*Math.sin(-Math.PI/2+(u-.7)/.3*Math.PI)];
  for(let j=0;j<34;j++){const z=(j/33-.5)*.85,p=[];for(let i=0;i<100;i++){const u=i/99,[x,y]=crest(u);p.push([x+Math.sin(z*4)*.05,y+Math.cos(z*4)*.06,z]);}path(p,j>27?1:0,j);}
  for(let i=0;i<1800*quality;i++){const u=rand(),[x,y]=crest(u),z=(rand()-.5)*.85;add(x+Math.sin(z*4)*.05,y+Math.cos(z*4)*.06,z,u>.65?1:0,40,u,z);}}break;
 case 14:
  for(let j=0;j<8;j++){const x=-.42+j*.12,y=.1+Math.sin(j*.7)*.13;box(x,y,0,.13,.17,.19,j%2,j);}
  ball(.5,-.02,0,.19,.12,.12,1,8,220);path([[.45,-.12,0],[.5,-.29,0],[.55,-.12,0],[.73,.03,0],[.59,.08,0]],0,8);
  for(const s of [-1,1]){for(let j=0;j<4;j++)path([[0,.05,s*.06],[-.1-j*.13,-.6+j*.13,s*.28],[-.48,.02,s*.23],[0,.05,s*.06]],j%2,10+(s+1)/2);path([[-.22,.12,s*.06],[-.29,.39,s*.18],[-.14,.46,s*.18]],1,12);}
  path([[-.49,.08,0],[-.67,.15,.04],[-.88,-.07,.06]],0,13);break;
 case 15:
  for(let i=0;i<2200*quality;i++){const u=rand(),a=rand()*TAU,r=.13+.4*Math.pow(1-u,1.8);add(Math.cos(a)*r,-.52+u*.63,Math.sin(a)*r,0,Math.floor(u*6),u,a);}
  oval(0,-.52,.53,.12,0,1,0);box(0,.5,0,.64,.16,.4,0,8);line([0,.12,0],[0,.43,0],1,7);
  for(const s of [-1,1]){const p=[];for(let i=0;i<=90;i++){const a=i/90*Math.PI;p.push([s*(.4+Math.sin(a)*.29),-.38+(1-Math.cos(a))*.25,.02]);}path(p,1,6);}break;
 case 16:
  box(0,0,0,1.3,1.65,.35,1,0);box(0,.66,.2,1.1,.12,.6,0,1);
  for(const s of [-1,1]){pen.move(s*.55,-.67,.16).ink(1).curve(s*.2,-.9, s*.2,-.1,.16).curve(s*.5,.3,s*.36,.52,.16);}
  glyph(card?.age||'✦',0,2);break;
 case 17:
  for(let j=0;j<2;j++)line([-.85,.65,j*.3],[.25,.65,j*.3],1,0);
  for(let j=0;j<2;j++){const x=j?-.75:.75;oval(x,-.38,.17,.17,0,0,1);for(let k=0;k<12;k++){const a=k/12*TAU;line([x+Math.cos(a)*.16,-.38+Math.sin(a)*.16,0],[x+Math.cos(a)*.21,-.38+Math.sin(a)*.21,0],1,1);}path([[x,-.2,0],[x*.7,.1,0],[x*.4,.21,0]],0,2);}
  box(-.15,.33,0,.48,.28,.27,0,3);box(.17,.21,0,.24,.49,.29,1,3);box(-.27,.03,0,.1,.28,.13,1,3);for(let j=0;j<3;j++)for(const s of [-1,1])oval(-.34+j*.2,.5,.085,.085,s*.17,1,3);box(.63,.35,0,.25,.3,.05,1,4);break;
 case 18:
  {const outline=a=>[Math.cos(a)*(.27+.14*Math.abs(Math.sin(a))+.045*Math.sin(a)),.2+.46*Math.sin(a)];const p=[];for(let i=0;i<=180;i++){const a=i/180*TAU,[x,y]=outline(a);p.push([x,y,0]);}path(p,0,0);for(let i=0;i<1600*quality;i++){const a=rand()*TAU,u=Math.sqrt(rand()),[x,y]=outline(a);add(x*u,.2+(y-.2)*u,-.06+Math.sin(u*Math.PI)*.1,0,0,u,a);}}
  box(0,-.5,0,.13,.88,.08,0,1);box(0,-.91,0,.22,.27,.1,1,1);oval(0,.12,.105,.105,.055,1,0);
  for(let j=0;j<6;j++)line([-.038+j*.015,-1,.09],[-.038+j*.015,.55,.09],1,2+j);for(let j=0;j<12;j++)line([-.066,-.82+j*.065,.06],[.066,-.82+j*.065,.06],1,1);break;
 case 19:
  for(let j=0;j<28;j++){const [x,y,z]=stairAnchor(j);box(x,y,z,.24,.025,.23,j%2,j);}
  break;
 }
 // Traces feed the same material as surfaces, and retain their distance timing.
 for(const p of pen.points)if(p.draw&&rand()<.45)add(p.x,p.y,p.z,p.c,p.g??90,p.d/Math.max(1,pen.distance));
 const cap=Math.round(quality*5400);if(points.length>cap){const stride=points.length/cap;return {pen,points:Array.from({length:cap},(_,i)=>points[Math.floor(i*stride)])};}
 return {pen,points};
}

export function turtleExperience(kind,palette,hint) {
 return function create(ctx,w,h,dpr,stage) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const quality=stage.preview?.32: Math.min(w<600?.72:1,(navigator.hardwareConcurrency||4)<4?.5:1);
  const {pen,points}=sculpture(kind,stage.card,quality),rand=randomSource(881+kind);
  const S=Math.min(w*.48,h*.31)*(kind===4?.78:kind===0?.94:1),cx=w/2,cy=h*.4;
  let eventAt=-1,clock=0,lastPointer=.5,drag=0,refX=0,refY=0,photo=null,photoURL='',disposed=false,holdLift=0,wavePause=0;
  let age=stage.card?.age||'',shapePoints=points;
  const starts=points.map(()=>({x:(rand()-.5)*3,y:(rand()-.5)*3,z:(rand()-.5)*2}));
  const intro=reduced?.7:2.9+(kind%3)*.35;
  // Elastic graph: impulses travel through neighboring radial/spiral junctions.
  const web=kind===1?Array.from({length:128},(_,i)=>{const ring=Math.floor(i/16),a=i%16/16*TAU,r=(ring+1)/8*.84;return {x:Math.cos(a)*r,y:Math.sin(a)*r,z:0,v:0,neighbors:[ring*16+(i+1)%16,ring*16+(i+15)%16,...(ring?[i-16]:[]),...(ring<7?[i+16]:[])]};}):null;
  let webEvent=-2;
  if(web)for(const p of points){const ring=Math.min(7,Math.max(0,Math.round(Math.hypot(p.x,p.y)/.84*8)-1)),angular=(Math.round(Math.atan2(p.y,p.x)/TAU*16)+16)%16;p.webIndex=ring*16+angular;}
  stage.onPointerDown=()=>{if(clock>intro*.5&&(kind!==12||Math.abs(stage.pointer.x-.5)<.09)){eventAt=clock;wavePause=0;}return true;};
  stage.onDispose=()=>{disposed=true;if(photo)photo.onload=null;photo=null;shapePoints=[];};
  const pitch=[.18,.06,.03,.42,.12,.13,.05,.3,.06,.16,.19,.34,0,.18,.14,.15,.04,.2,.03,.25][kind];
  const project=(x,y,z,angle)=>{const xx=x*Math.cos(angle)+z*Math.sin(angle),zz=z*Math.cos(angle)-x*Math.sin(angle),yy=y*Math.cos(pitch)-zz*Math.sin(pitch),depth=zz*Math.cos(pitch)+y*Math.sin(pitch),scale=3.4/(3.4+depth);return [cx+xx*S*scale,cy+yy*S*scale,scale];};
  let textBounds=[];
  const text=(value,y,size,maxWidth,color,center=cx)=>{
   if(!value)return y;const font=canvasTextFont(stage,`500 ${size}px`);ctx.font=font;ctx.fillStyle=color;ctx.textAlign='center';
   let line='';const lines=[];
   for(const word of value.split(/\s+/)){const next=line?line+' '+word:word;ctx.font=font;if(ctx.measureText(next).width>maxWidth&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
   for(const l of lines){ctx.font=font;const width=ctx.measureText(l).width,scale=Math.min(1,maxWidth/Math.max(1,width));ctx.save();ctx.translate(center,y);ctx.scale(scale,1);ctx.fillText(l,0,0);ctx.restore();textBounds.push({y,width:width*scale,left:center-width*scale/2,right:center+width*scale/2,size});y+=size*1.3;}return y;
  };
  return (t,dt)=>{
   clock=t;dt=Math.min(dt||.016,.05);textBounds=[];
   if(disposed)return;
   const colors=customPalette(stage,palette),css=colors.map(c=>`rgb(${c.join(',')})`);
   if(kind===16&&age!==(stage.card?.age||'')){age=stage.card?.age||'';shapePoints=sculpture(kind,stage.card,quality).points;}
   if(kind===8&&(stage.card?.img||'')!==photoURL){photoURL=stage.card?.img||'';photo=null;if(photoURL){const im=new Image();im.onload=()=>{if(!disposed&&photoURL===im.src)photo=im;im.onload=null;};im.src=photoURL;}}
   drag+=(stage.pointer.x-lastPointer)*(stage.holding?1:0);lastPointer=stage.pointer.x;
   if(stage.holding&&t>intro&&[3,6,8,11,18].includes(kind)&&Math.abs(stage.pointer.x-.5)>.06&&eventAt<0)eventAt=t;
   if(kind===12&&stage.holding&&t>intro&&Math.abs(stage.pointer.x-.5)<.08&&eventAt<0)eventAt=t;
   if(eventAt<0&&t>intro+3.2)eventAt=intro+3.2;
   const e=eventAt<0?0:Math.max(0,t-eventAt),a=smooth(e/2.5),returning=smooth((e-4)/2.5),wave=Math.sin(Math.min(e/6,1)*Math.PI),form=reduced?1:smooth((t-.05)/intro);
   if(web){
    if(eventAt>=0&&webEvent!==eventAt){webEvent=eventAt;const px=(stage.pointer.x-.5)*1.65,py=(stage.pointer.y-.4)*2;let nearest=web[0];for(const n of web)if(Math.hypot(n.x-px,n.y-py)<Math.hypot(nearest.x-px,nearest.y-py))nearest=n;nearest.v=reduced?.15:2.2;}
    for(let step=0;step<2;step++){const next=web.map(n=>-14*n.z-3.5*n.v+n.neighbors.reduce((sum,j)=>sum+(web[j].z-n.z)*24,0));web.forEach((n,i)=>{n.v+=next[i]*dt/2;n.z+=n.v*dt/2;});}
   }
   if(kind===13&&stage.holding&&e>0)wavePause+=dt;holdLift=mix(holdLift,stage.holding?1:0,clamp(dt*3));
   const base=[-.28,.04,-.12,-.38,.3,-.24,-.2,.3,-.12,-.12,-.34,-.27,0,-.3,.35,-.22,-.14,-.27,.12,-.72][kind];
   const angle=kind===19?mix(-.72,.45,a):kind===6?-.2+drag*.9+(reduced?0:Math.sin(t*.2)*.07):kind===8?-.12+(stage.pointer.x-.5)*.35:base+(reduced?0:Math.sin(t*(.12+kind*.005)+kind)*.045);
   const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(w,h)*.8);bg.addColorStop(0,kind>=5&&kind<=9?'#211625':kind===13?'#081e32':'#121324');bg.addColorStop(1,'#030611');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
   // Quiet depth cues; never a flashing screen.
   ctx.fillStyle=css[0];for(let i=0;i<45;i++){ctx.globalAlpha=.07+(i%3)*.025;ctx.fillRect((i*113.7)%w,(i*79.1)%h,1,1);}ctx.globalAlpha=1;
   refX=mix(refX,(stage.pointer.x-.5)*.85,clamp(dt*1.6));refY=mix(refY,(stage.pointer.y-.45)*1.25,clamp(dt*1.6));
   const transformed=[];
   for(let i=0;i<shapePoints.length;i++){
    const p=shapePoints[i];let {x,y,z}=p;const g=p.g;
    const motion=reduced?.15:1;
    switch(kind){
     case 0:{const room=g<9?g:g>=20&&g<29?g-20:-1;if(room>=0){x+=(room%3-1)*a*.23;y+=(Math.floor(room/3)-1)*a*.19;z+=(room%2?1:-1)*a*.33;}if(g===10){x+=Math.sin(p.x*8)*a*.13;z+=Math.sin(p.x*6)*a*.24;}break;}
     case 1:{const tx=(stage.pointer.x-.5)*1.65,ty=(stage.pointer.y-.4)*2;if(g!==1){const tension=web[p.webIndex]?.z||0;z+=tension;x+=(tx-x)*Math.abs(tension)*.13;y+=(ty-y)*Math.abs(tension)*.13;}else{x+=tx*a;y+=ty*a;z+=.07+Math.sin(e*6)*wave*.012;}break;}
     case 2:if(g===1){const stripe=Math.floor((p.x+.55)*12);z+=Math.sin(p.u*4+e*2)*a*.22;x+=Math.sin(stripe*.8)*a*.3;y+=Math.cos(stripe)*a*.15;}if(g===2){x+=refX+Math.sin(e*2)*a*.2;y+=refY+Math.cos(e*1.4)*a*.17;z+=a*.25;}break;
     case 3:{const opening=smooth((t-intro*.55)/2.2);if(g===1){y=mix(.25,y,opening)-a*.25;z+=Math.sin(e)*wave*.25;}if(g===2){x*=.55+.45*opening;y=mix(.29,y,opening);z-=Math.sin(p.x*4+e+drag)*wave*.15;}if(g===3){const rise=smooth((t-intro)/2)*(1-returning);x*=rise;y=mix(.3,y,rise);z*=rise;x+=Math.sin(p.v+e+drag*2)*wave*.15;}break;}
     case 4:if(g<5){const az=g/5*TAU+TAU*2*smooth(e/6),r=.58+wave*.34,ox=Math.sin(g/5*TAU)*.58,oz=Math.cos(g/5*TAU)*.58;x+=Math.sin(az)*r-ox;z+=Math.cos(az)*r-oz;y-=Math.sin(e*3+g)*wave*.2+wave*.2;}break;
     case 5:if(g===3){z+=Math.sin(p.x*3)*a*.5;x*=1+a*.16;y-=wave*.16;}else if(g===5){const lift=wave*(1-returning);z+=Math.sin(p.x*12+e*2)*lift*.24;y-=lift*.15;x*=1+lift*.5;}if(g===4)z+=Math.sin(t*1.7+p.x*5)*.04;break;
     case 6:if(g===3){const spread=a*(1-returning*.4);x*=1+spread*.4;z+=Math.sin(p.v*6+e)*spread*.24;y-=Math.cos(p.v*5)*spread*.12;}break;
     case 7:if(g===0&&x>.25){x+=a*.28;z+=a*.2;}if(g===90){y-=a*.25;}break;
     case 8:if(g>0&&g<5)z+=(g-2)*a*.14;break;
     case 9:z+=Math.sin(x*4+t*.8)*Math.sin(y*4)*((.04+holdLift*.14)*motion);if(g===1)z+=Math.max(holdLift,a*(1-returning))*.4;break;
     case 10:{const entry=1-form;x+=(g===0?-1:1)*entry*1.2;y+=Math.sin(p.u*8+t)*entry*.2;z+=Math.sin(p.u*TAU+e)*wave*.32;x*=1+a*.24;y*=1+a*.17;break;}
     case 11:if(g>0&&g<7){const lift=a*(1-returning*.2);y-=lift*.5;z+=lift*(g%2?.34:-.24);x+=Math.sin(e+g)*wave*.1;}if(g===0&&x>0){z+=a*(x/.7)*.65;y-=a*x*.45;}break;
     case 12:if(g===1){x+=(1-form)*.9+(stage.holding?(stage.pointer.x-.5)*.24:0);z=-.14; }if(g===2){const grow=1+wave*.6;x*=grow;y*=grow;z+=Math.sin(p.x*8+t)*.04*motion;}break;
     case 13:{const phase=stage.holding?Math.min(e,1):Math.max(0,e-wavePause);const fall=smooth((phase-1)/3);if(p.u>.5||g<40){x+=fall*.3;y+=fall*(.2+Math.pow(Math.sin(p.phase),2)*.45);z+=fall*Math.sin(p.phase)*.3;}y+=Math.sin(p.x*6+t*.5)*.02*motion;break;}
     case 14:if(g===10||g===11){z+=(g===10?-1:1)*a*.45;y-=wave*.2;}if(g<8)y+=Math.sin(g*.7+e*2)*wave*.06;if(g===8){y-=wave*.12;z+=wave*.05;}break;
     case 15:if(g<6){y+=(g-2.5)*wave*.12;z+=wave*Math.sin(g)*.17;}if(g===6)x*=1+wave*.2;break;
     case 16:if(g===2){const drop=a*(1-returning);y+=drop*(.7+Math.sin(p.phase)*.09);x+=Math.sin(p.phase)*drop*.18;z+=Math.sin(p.phase*2)*drop*.19;y+=Math.sin(t+p.phase)*.009;}break;
     case 17:if(g===1){const xx=x-(x<0?-.75:.75),yy=y+.38;x=(x<0?-.75:.75)+xx*Math.cos(e)-yy*Math.sin(e);y=-.38+xx*Math.sin(e)+yy*Math.cos(e);}if(g===2)y-=wave*.18;if(g===3){x+=a*.65;y-=Math.sin(e*3)*wave*.025;}if(g===4){x=mix(x,.38,form);y-=a*.18;}break;
     case 18:if(g>=2&&g<8){z+=Math.sin((y+1)*12-e*7+g)*wave*.06; x+=Math.sin(e*7+g)*wave*.015;}if(g===0)z+=Math.sin(p.v*5-e*3)*wave*.02;break;
     case 19:if(g<28){const join=smooth((e-1.2)/2.7),targetX=-.62+g*.047,targetY=.76-g*.056,[sx,sy,sz]=stairAnchor(g);x=mix(x,targetX+(p.x-sx),join);y=mix(y,targetY+(p.y-sy),join);z=mix(z,(g-14)*.015+(p.z-sz),join);}break;
    }
    if(reduced){x=mix(p.x,x,.18);y=mix(p.y,y,.18);z=mix(p.z,z,.18);}
    const start=kind===16&&g===2?{x:p.phase>Math.PI?.4:-.4,y:-.7,z:.18}:starts[i%starts.length];let arrival=reduced?1:smooth((form-.1-(i%19)*.013)/.68);if(kind===0&&g>=20&&g<29&&!reduced)arrival=smooth((t-intro-(g-20)*.15)/.8);
    x=mix(start.x,x,arrival);y=mix(start.y,y,arrival);z=mix(start.z,z,arrival);
    x+=Math.sin(t*.7+p.phase)*.006*motion;y+=Math.cos(t*.8+p.phase)*.006*motion;
    const q=project(x,y,z,angle);transformed.push({p,q,z,alpha:.15+.75*arrival});
   }
   // Additive material is order-independent. Rectangular subpixel cores avoid
   // the expensive winding calculation of a path with thousands of circles.
   ctx.globalCompositeOperation='lighter';
   for(let c=0;c<css.length;c++){
    ctx.fillStyle=css[c];ctx.globalAlpha=.14+.76*form;
    for(const {p,q} of transformed)if(p.c%css.length===c){const r=Math.max(.65,Math.min(1.65,p.size*q[2]*S/235));ctx.fillRect(q[0]-r,q[1]-r,r*2,r*2);}
    ctx.globalAlpha=(.14+.76*form)*.028;
    for(let i=c;i<transformed.length;i+=7){const {p,q}=transformed[i];if(p.c%css.length!==c)continue;const r=Math.max(.65,Math.min(1.65,p.size*q[2]*S/235))*3;ctx.fillRect(q[0]-r,q[1]-r,r*2,r*2);}
   }
   // Opaque occultation: additive light alone cannot hide the solar disc.
   if(kind===12&&form>.35){const mx=(1-form)*.9+(stage.holding?(stage.pointer.x-.5)*.24:0),q=project(mx,0,-.14,angle);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=smooth((form-.35)/.3);ctx.fillStyle='#03050d';ctx.beginPath();ctx.arc(q[0],q[1],S*.513*q[2],0,TAU);ctx.fill();ctx.strokeStyle='#766a77';ctx.lineWidth=1;ctx.stroke();ctx.globalAlpha=1;ctx.globalCompositeOperation='lighter';}
   // The live pen shares world coordinates with the sculpture, never a disconnected intro.
   const distance=pen.distance*clamp((t+.15)/intro);let head=null;
   if(t<intro+1||a<.95){
   ctx.lineWidth=1.2;ctx.globalAlpha=t<intro?.8:.08*(1-a);ctx.beginPath();
   if(kind===10){
    for(let g=0;g<2;g++){const group=pen.points.filter(p=>p.g===g),first=group[0]?.d||0,end=group.at(-1)?.d||first,limit=first+(end-first)*clamp((t+.15)/intro);ctx.beginPath();for(const p of group){if(p.d>limit)break;const q=project(p.x,p.y,p.z,angle);p.start?ctx.moveTo(q[0],q[1]):ctx.lineTo(q[0],q[1]);head=q;}ctx.strokeStyle=css[g];ctx.stroke();if(head&&t<intro){ctx.fillStyle=css[g];ctx.beginPath();ctx.arc(head[0],head[1],4,0,TAU);ctx.fill();}}
   }else for(const p of pen.points){if(p.d>distance)break;const q=project(p.x,p.y,p.z,angle);if(p.start||!p.draw){ctx.moveTo(q[0],q[1]);}else ctx.lineTo(q[0],q[1]);head=q;}
   ctx.strokeStyle=css[0];ctx.stroke();
   if(head&&t<intro){ctx.globalAlpha=1;const glow=ctx.createRadialGradient(head[0],head[1],0,head[0],head[1],15);glow.addColorStop(0,'#ffffff');glow.addColorStop(.2,css[1]);glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(head[0]-15,head[1]-15,30,30);}
   }
   ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
   // Scene-specific secondary structures are consequences of the original material.
   const strokePath=(coords,c=1)=>{ctx.strokeStyle=css[c];ctx.lineWidth=1;ctx.beginPath();coords.forEach((p,i)=>{const q=project(...p,angle);i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);});ctx.stroke();};
   if(kind===0&&a>0){ctx.globalAlpha=a*.7;for(let j=0;j<8;j++){const r=j%3,c=Math.floor(j/3),r2=(j+1)%3,c2=Math.floor((j+1)/3);const p1=[(r-1)*(.43+a*.23),(c-1)*(.4+a*.19),j%2?a*.33:-a*.33],p2=[(r2-1)*(.43+a*.23),(c2-1)*(.4+a*.19),(j+1)%2?a*.33:-a*.33];strokePath([p1,[p1[0],p2[1],p2[2]],p2]);}ctx.globalAlpha=1;}
   if(kind===7&&a>0){ctx.globalAlpha=a;strokePath([[-.45,-.43,.1],[.45,-.43,.1],[.45,-.38,.1],[-.45,-.38,.1]]);for(const x of [-.31,.31])strokePath([[x,-.38,.1],[x,-.2,.1]]);for(const x of [-.56,.56])strokePath([[x,-.6,.06],[x,-.2,.06],[x*.8,-.2,.06]]);for(let j=0;j<9;j++){const p=[];for(let i=0;i<30;i++)p.push([Math.sin(i*.15+j)*(.12+i*.004),-.05-i*.025,j*.035]);strokePath(p,0);}ctx.globalAlpha=1;}
   if(kind===2){const real=project((stage.pointer.x-.5)*.85,(stage.pointer.y-.45)*1.25,-.1,angle);ctx.fillStyle='#fff7d6';ctx.beginPath();ctx.arc(real[0],real[1],3.5,0,TAU);ctx.fill();if(e>1){const q=project(refX+Math.sin(e*2)*a*.2,refY+Math.cos(e*1.4)*a*.17,-.06,angle);ctx.strokeStyle=css[1];ctx.beginPath();ctx.ellipse(q[0],q[1],12+wave*15,17+wave*21,e*.1,0,TAU);ctx.stroke();}}
   if(kind===8&&photo&&a>.2){const q=project(0,0,-.05,angle);ctx.save();ctx.globalAlpha=smooth((a-.2)/.8)*.9;ctx.beginPath();ctx.rect(q[0]-S*.51,q[1]-S*.61,S*1.02,S*1.22);ctx.clip();ctx.drawImage(photo,q[0]-S*.61,q[1]-S*.61,S*1.22,S*1.22);ctx.restore();}
   if(kind===14&&wave>.05){ctx.globalAlpha=wave;strokePath([[.66,-.05,.04],[.95,-.12,.06],[.67,.03,.04],[.96,-.12,.06]],1);ctx.globalAlpha=1;}
   if(kind===16){for(let j=0;j<24;j++){const u=((t*.2+j/24)%1),side=j%2?1:-1,q=project(side*(.38+.12*Math.sin(u*TAU)),-.7+u*1.2,.18,angle);ctx.fillStyle=css[j%2];ctx.beginPath();ctx.arc(q[0],q[1],2,0,TAU);ctx.fill();}}
   if(kind===17&&a>0){for(let j=0;j<2;j++)strokePath([[.25,.65,j*.3],[.25+a*.75,.65,j*.3]]);for(let j=0;j<14*a;j++){const x=-.8+j*.14;strokePath([[x,.64,-.08],[x,.64,.39]]);}}
   if(kind===18&&a>0){for(let j=0;j<4;j++){const r=(e*.13+j*.19)%1;ctx.globalAlpha=(1-r)*wave;const q=project(0,.2,.03,angle);ctx.strokeStyle=css[1];ctx.beginPath();ctx.ellipse(q[0],q[1],S*r*.9,S*r*.5,0,0,TAU);ctx.stroke();}ctx.globalAlpha=1;}
   if(kind===18){const hole=project(0,.12,.055,angle);ctx.fillStyle='#06090e';ctx.beginPath();ctx.ellipse(hole[0],hole[1],S*.095,S*.1,0,0,TAU);ctx.fill();ctx.strokeStyle=css[1];ctx.stroke();for(let j=0;j<6;j++){const p=[];for(let i=0;i<50;i++){const yy=-1+i/49*1.55;p.push([-.038+j*.015+Math.sin((yy+1)*12-e*7+j)*wave*.012,yy,.1]);}strokePath(p);}}
   const revealed=e>(reduced?1:2.8);stage.revealed=revealed;
   if(kind===13&&revealed){const shade=ctx.createLinearGradient(0,h*.65,0,h*.79);shade.addColorStop(0,'transparent');shade.addColorStop(1,'rgba(5,17,30,.94)');ctx.fillStyle=shade;ctx.fillRect(0,h*.65,w,h*.35);}
   // Text is owned here so every experience can place it without hiding its protagonist.
   if(revealed&&stage.card?.tm!=='none'&&!stage.preview){
    ctx.globalAlpha=smooth((e-2.6)/.8);const card=stage.card||{};
    const inside=[0,1,2,3,8,9,15,16,17].includes(kind)&&(card.p||'').length<=24;
    let fit=1,y=h*.72;
    const lineCount=(value,size)=>{if(!value)return 0;ctx.font=canvasTextFont(stage,`500 ${size}px`);let line='',n=1;for(const word of value.split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>w*.85&&line){n++;line=word;}else line=next;}return n;};
    for(let i=0;i<4;i++){const titleSize=Math.min(24,w*.052)*fit,msgSize=Math.min(18,w*.042)*fit,signSize=Math.min(15,w*.035)*fit;const total=(inside?0:lineCount(card.p,titleSize)*titleSize*1.3)+lineCount(card.m,msgSize)*msgSize*1.3+lineCount(card.d,signSize)*signSize*1.3+13;if(total>h*.22)fit*=h*.22/total;}
    if(inside){const q=project(kind===17?.63:0,kind===16?.65:kind===3?.3:kind===17?.35:0,-.3,angle);ctx.save();if(kind===8&&photo){ctx.shadowColor='#000';ctx.shadowBlur=5;ctx.shadowOffsetY=1;}text(card.p,q[1],Math.min(20,w*.048)*fit,w*(kind===0?.25:kind===17?.28:.45),kind===8&&photo?'#fff8e7':css[1],q[0]);ctx.restore();}else y=text(card.p,y,Math.min(24,w*.052)*fit,w*.85,css[1]);
    y=text(card.m,y+6,Math.min(18,w*.042)*fit,w*.85,'#f4f1ed');
    text(card.d,y+7,Math.min(15,w*.035)*fit,w*.85,css[0]);ctx.globalAlpha=1;
   }
   if(!stage.preview){ctx.font=canvasTextFont(stage,`400 ${Math.min(12,w*.029)}px`);ctx.textAlign='center';ctx.fillStyle='#c9c6d9';ctx.globalAlpha=.75;ctx.fillText(hint,cx,h*.96);ctx.globalAlpha=1;}
   stage.diagnostics={kind,particles:shapePoints.length,traces:pen.points.length,event:e,formed:form,reduced,textBounds};
  };
 };
}
