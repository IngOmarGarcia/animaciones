// Geometry is sampled once; only luminous particles are rendered in the scene.
import { TAU, textTargets, seeded, ease, flare, point } from './flower-premium-core.js';
import { customPalette } from './color-style.js';
function geometry(kind) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 320;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  g.translate(160, 160);
  const ellipse = (x,y,rx,ry,color) => { g.fillStyle=color; g.beginPath(); g.ellipse(x,y,rx,ry,0,0,TAU); g.fill(); };
  const line = (pts,color,width=3) => { g.strokeStyle=color; g.lineWidth=width; g.beginPath(); pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y)); g.stroke(); };
  const flower = (x,y,r) => { for(let i=0;i<16;i++){let a=i*TAU/16; ellipse(x+Math.cos(a)*r*.62,y+Math.sin(a)*r*.62,r*.38,r*.38,i%2?'#ffb329':'#ff751c');} ellipse(x,y,r*.3,r*.3,'#ffdb66'); };
  const candle = (x,y,s=1) => { g.fillStyle='#ffe6a2';g.fillRect(x-8*s,y-30*s,16*s,48*s);ellipse(x,y-44*s,6*s,15*s,'#ff982e');ellipse(x,y-48*s,2*s,7*s,'#fff1bf'); };
  const butterfly = (x,y,s,color='#ff922c') => {g.save();g.translate(x,y);g.rotate(-.2);for(let side of [-1,1]){ellipse(side*19*s,-10*s,20*s,27*s,color);ellipse(side*15*s,18*s,15*s,18*s,color);line([[side*8*s,-20*s],[side*28*s,-7*s],[side*8*s,15*s]],'#ffdb88',2);}ellipse(0,0,3*s,30*s,'#c08aff');g.restore();};
  if(kind==='pumpkin') {
    for(let i=-2;i<=2;i++) ellipse(i*25,12,48,83,i%2?'#ff7935':'#ffa42f');
    line([[0,-64],[4,-98],[23,-110]],'#9cfc98',10);
    g.fillStyle='#100818';for(let x of [-42,42]){g.beginPath();g.moveTo(x-20,-9);g.lineTo(x+19,-9);g.lineTo(x, -37);g.fill();}
    g.beginPath();g.moveTo(-58,38);g.lineTo(-32,62);g.lineTo(-10,48);g.lineTo(9,62);g.lineTo(30,48);g.lineTo(57,34);g.lineTo(37,76);g.lineTo(-30,78);g.fill();
  } else if(kind==='ghost') {
    g.fillStyle='#ffc3ec';g.beginPath();g.moveTo(-83,92);g.lineTo(-83,-22);g.bezierCurveTo(-83,-123,83,-123,83,-22);g.lineTo(83,92);for(let i=0;i<5;i++)g.quadraticCurveTo(66-i*33,55,50-i*33,92);g.fill();
    for(let x of [-28,28])ellipse(x,-20,9,16,'#221133');ellipse(0,12,8,11,'#221133');for(let x of [-49,49])ellipse(x,6,12,6,'#ff719e');
    butterfly(100,-90,.34,'#b293ff');
  } else if(kind==='cat') {
    ellipse(0,45,63,72,'#a284ff');ellipse(0,-39,76,57,'#bc9aff');
    g.fillStyle='#bc9aff';for(let side of [-1,1]){g.beginPath();g.moveTo(side*70,-55);g.lineTo(side*67,-117);g.lineTo(side*20,-80);g.fill();}
    for(let x of [-31,31]){ellipse(x,-40,18,9,'#c9ff78');ellipse(x,-40,3,9,'#1c1030');}
    line([[0,-14],[-6,-20],[6,-20],[0,-14],[0,-5]],'#ffb5dc');
    for(let side of [-1,1])for(let i=0;i<3;i++)line([[side*22,-10+i*8],[side*98,-22+i*20]],'#ecd2ff',2);
    g.strokeStyle='#a284ff';g.lineWidth=15;g.beginPath();g.moveTo(49,89);g.bezierCurveTo(145,117,128,16,103,38);g.stroke();
  } else if(kind==='potion') {
    g.fillStyle='#af84ff';g.fillRect(-29,-103,58,55);ellipse(0,28,88,89,'#8960dc');ellipse(0,47,74,57,'#91fbba');
    line([[-34,-100],[34,-100]],'#f0d0ff',8);for(let i=0;i<9;i++)ellipse(Math.sin(i*3)*47,50-i*18,3+i%4,3+i%4,'#e9ffad');
  } else if(kind==='moon') {
    ellipse(0,-13,100,100,'#e8c6ff');g.globalCompositeOperation='destination-out';ellipse(40,-39,85,87,'#fff');g.globalCompositeOperation='source-over';
    for(let i=0;i<5;i++){let x=-112+i*51,y=68+Math.sin(i)*20;line([[x-19,y],[x-9,y-8],[x,y],[x+9,y-8],[x+19,y]],'#c09cff',6);}
  } else if(kind==='skull') {
    ellipse(0,-25,88,91,'#ffecca');g.fillStyle='#ffecca';g.fillRect(-56,10,112,93);
    for(let x of [-34,34]){flower(x,-31,26);ellipse(x,-31,14,17,'#271333');}ellipse(0,17,9,13,'#271333');
    for(let x=-40;x<=40;x+=16)line([[x,66],[x,91]],'#d76ead',4);line([[-45,74],[45,74]],'#d76ead',3);flower(0,-95,18);for(let x of [-68,68])flower(x,25,13);
  } else if(kind==='marigold') {
    flower(0,-20,96);line([[0,45],[0,115]],'#a4e88c',7);ellipse(-24,80,27,10,'#8ddb84');ellipse(25,100,29,10,'#8ddb84');
  } else if(kind==='monarch') {
    butterfly(0,-7,2.4);for(let i=0;i<7;i++)flower(-115+i*38,112-Math.sin(i)*10,13);
  } else if(kind==='altar') {
    for(let i=0;i<3;i++){g.fillStyle=['#ac67d9','#ef81b3','#c965a2'][i];g.fillRect(-125+i*22,90-i*38,250-i*44,24);}
    for(let x of [-87,87])candle(x,49,.85);candle(0,-27,1.3);for(let i=0;i<9;i++)flower(-112+i*28,105,12);flower(-51,23,24);flower(51,23,24);
    line([[-113,-91],[113,-91]],'#ffc760');for(let i=0;i<5;i++){g.fillStyle=['#fc77bc','#af85ff','#ffbb4c'][i%3];g.fillRect(-109+i*45,-88,34,27);g.globalCompositeOperation='destination-out';ellipse(-92+i*45,-75,5,7,'#fff');g.globalCompositeOperation='source-over';}
  } else if(kind==='dog') {
    ellipse(0,25,57,75,'#c98bff');ellipse(0,-51,50,45,'#dcb3ff');for(let side of [-1,1]){g.fillStyle='#c98bff';g.beginPath();g.moveTo(side*45,-56);g.lineTo(side*56,-129);g.lineTo(side*12,-85);g.fill();ellipse(side*21,-56,6,8,'#ffdc86');line([[side*33,51],[side*40,107]],'#eab5ff',13);}
    ellipse(0,-25,11,7,'#ffbd71');for(let i=0;i<7;i++)flower(-111+i*37,121,14);line([[48,74],[97,44],[113,-5]],'#b598ff',8);
  }
  const data=g.getImageData(0,0,320,320).data,pts=[];
  for(let y=0;y<320;y+=3)for(let x=0;x<320;x+=3){let i=(y*320+x)*4;if(data[i+3]>128)pts.push({x:(x-160)/145,y:(y-160)/145,color:`rgb(${data[i]},${data[i+1]},${data[i+2]})`});}
  return pts;
}
export function seasonal(kind, palette, caption) {
  return (ctx,w,h,dpr=1,stage={}) => {
    const rand=seeded(kind.split('').reduce((n,c)=>n+c.charCodeAt(0),17)),targets=geometry(kind);
    const calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const count=stage.preview?950:calm?1000:Math.min(3400,Math.max(1800,Math.floor(w*h/95)));
    const particles=Array.from({length:count},()=>{const p=targets[Math.floor(rand()*targets.length)];return {...p,z:(rand()-.5)*.3,phase:rand()*TAU,seed:rand(),startX:(rand()-.5)*3.8,startY:(rand()-.5)*4};});
    const colors=customPalette(stage, []),colored=colors.length>0;
    const energy=colored?colors[0].join(','):palette[0],accent=colored?`rgb(${colors[1].join(',')})`:palette[2];
    if(colored)for(const p of particles){const rgb=p.color.match(/\d+/g).map(Number),brightness=Math.max(...rgb)/255;if(brightness>.25){const base=colors[p.seed<.3?1:0];p.customColor=`rgb(${base.map(v=>Math.round(v*brightness)).join(',')})`;}}
    const size=Math.min(w*.37,h*.255),cx=w/2,cy=h*.51;
    const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(w,h));bg.addColorStop(0,palette[1]);bg.addColorStop(1,'#030209');
    let burstAt=null,name='',letters=[];
    return t=>{
      ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
      const noText=stage.card?.tm==='none';
      const current=noText?'':(stage.card?.p||'').trim();
      if(current!==name){
        name=current;
        const textWidth=Math.max(w*.82,current.length*20),scale=w*.82/textWidth;
        letters=current?textTargets(current,textWidth,stage.preview?5:3).map(([x,y])=>[x*scale,y*scale]):[];
      }
      if(stage.taps?.length){stage.taps.length=0;if(t>3.5)burstAt=t;}
      if(burstAt===null&&t>7.8)burstAt=t;
      const age=burstAt===null?-1:t-burstAt,shock=age<0?0:Math.exp(-age*1.6),morph=age<0?0:ease((age-.7)/2.4);
      const yaw=Math.sin(t*.32)*.19+(stage.pointer?.x-.5||0)*.16;
      flare(ctx,cx,cy,size*1.8,.15,energy);
      ctx.save();ctx.globalCompositeOperation='lighter';
      for(let i=0;i<65;i++){const a=i*2.399+t*.07,r=size*(.35+(i%17)/12);point(ctx,cx+Math.cos(a)*r,cy+Math.sin(a)*r*.8,1,.16+Math.sin(t+i)**2*.24,accent);}
      for(let i=0;i<particles.length;i++){
        const p=particles[i],build=ease((t-.3-p.seed*1.7)/2.5),breath=1+Math.sin(t*1.5+p.phase)*.012;
        let gx=p.x,gy=p.y;
        if(!calm){
          if(kind==='monarch')gx*=.74+Math.sin(t*2.4)*.24;
          if(kind==='ghost')gy+=Math.sin(t*1.6)*.07+Math.sin(p.x*6+t*2)*.025;
          if(kind==='marigold'){const a=Math.sin(t*.4)*.1;gx=p.x*Math.cos(a)-p.y*Math.sin(a);gy=p.x*Math.sin(a)+p.y*Math.cos(a);}
          if(kind==='potion'&&p.color.startsWith('rgb(233'))gy-=((t*.18+p.seed)%1)*.3;
          if(kind==='dog'&&p.y<-.55)gx+=Math.sin(t*2.5)*.025;
        }
        const z=p.z*Math.cos(yaw)-gx*Math.sin(yaw),pers=1/(1-z*.25);
        let x=cx+((gx*Math.cos(yaw)+p.z*Math.sin(yaw))*build+p.startX*(1-build))*size*pers*breath;
        let y=cy+(gy*build+p.startY*(1-build))*size*pers*breath;
        if(morph&&letters.length){const q=letters[i%letters.length];x+=(cx+q[0]-x)*morph;y+=(h*.5+q[1]-y)*morph;}
        x+=Math.cos(p.phase)*shock*size*.65+Math.sin(t*2+p.phase)*1.2;y+=Math.sin(p.phase)*shock*size*.65+Math.cos(t*1.8+p.phase)*1.2;
        const color=morph>.8&&letters.length?accent:p.customColor||p.color;
        if(i%17===0)point(ctx,x,y,3.5*pers,.08,color);
        point(ctx,x,y,(i%19===0?1.85:1.05)*pers,.5+p.seed*.45,color);
      }
      if(age>=0&&age<2){ctx.strokeStyle=`rgba(${energy},${shock*.55})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(cx,cy,size*(1+age),size*(1+age)*.7,0,0,TAU);ctx.stroke();}
      // Ground rings and their floating embers establish depth.
      for(let j=0;j<3;j++){ctx.strokeStyle=`rgba(${energy},${.12+j*.04})`;ctx.beginPath();ctx.ellipse(cx,h*.79,size*(.63+j*.14),size*(.07+j*.025),0,0,TAU);ctx.stroke();}
      ctx.restore();
      ctx.textAlign='center';ctx.fillStyle=palette[2];ctx.font=`${Math.max(9,Math.min(12,w/32))}px system-ui`;ctx.globalAlpha=.7;
      if(!noText&&!stage.preview)ctx.fillText(t<3?'La noche despierta…':age<0?'Toca para despertar la magia':'',cx,h*.86,w*.88);ctx.globalAlpha=1;
      if(age>2.8)stage.revealed=true;
    };
  };
}
