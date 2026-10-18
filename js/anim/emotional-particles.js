import { EMOTIONAL_SCENES } from '../emotional-catalog.js';
import { particleQuality } from './util.js';
import { createEmotionalEnergyRenderer } from './emotional-energy-renderer.js';
import { energyShape } from './emotional-energy-shapes.js';

const TAU=Math.PI*2;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));

// Rasterization supplies targets only. Every visible glyph is drawn as particles.
export function phraseTargets(blocks,w,h,key,small=false,hardBreaks=false) {
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(w);canvas.height=Math.ceil(h);
  const g=canvas.getContext('2d',{willReadFrequently:true});
  const maxWidth=w*.86, maxHeight=h*.58,lineHeight=1.25;
  let size=Math.min(w*.112,h*.082),lines=[];
  for(let attempt=0;attempt<30;attempt++){
    g.font=`900 ${size}px "Arial Black", system-ui, sans-serif`;lines=[];
    for(const block of hardBreaks?blocks:[blocks.join(' ')]){
      let line='';
      for(const word of block.split(' ')){
        const candidate=line?`${line} ${word}`:word;
        if(line&&g.measureText(candidate).width>maxWidth){lines.push(line);line=word;}else line=candidate;
      }
      if(line)lines.push(line);
    }
    if(lines.length*size*lineHeight<=maxHeight&&lines.every(line=>g.measureText(line).width<=maxWidth))break;
    size*=.95;
  }
  g.textBaseline='alphabetic';g.fillStyle='#fff';
  const points=[],top=h*.47-(lines.length-1)*size*lineHeight/2;
  const step=small?1.9:1.5;
  lines.forEach((line,index)=>{
    g.clearRect(0,0,w,h);
    const width=g.measureText(line).width,x=(w-width)/2,y=top+index*size*lineHeight;
    g.fillText(line,x,y);
    const image=g.getImageData(0,0,canvas.width,canvas.height).data;
    const at=line.toLocaleLowerCase().indexOf(key.toLocaleLowerCase());
    const keyStart=at<0?-1:x+g.measureText(line.slice(0,at)).width;
    const keyEnd=at<0?-1:keyStart+g.measureText(line.slice(at,at+key.length)).width;
    for(let py=Math.max(0,Math.floor(y-size));py<Math.min(h,y+size*.3);py+=step){
      for(let px=Math.max(0,Math.floor(x));px<Math.min(w,x+width+2);px+=step){
        if(image[(Math.floor(py)*canvas.width+Math.floor(px))*4+3]>100)
          points.push({x:px,y:py,z:0,line:index,key:px>=keyStart&&px<=keyEnd});
      }
    }
  });
  const bounds=points.reduce((b,p)=>({left:Math.min(b.left,p.x),right:Math.max(b.right,p.x),top:Math.min(b.top,p.y),bottom:Math.max(b.bottom,p.y)}),{left:w,right:0,top:h,bottom:0});
  return {points,lines,size,bounds};
}

export function emotionalExperience(id){
 const spec=EMOTIONAL_SCENES.find(s=>s.id===id);
 if(!spec)throw Error(`Experiencia desconocida: ${id}`);
 const create=(ctx,w,h,dpr=1,stage={})=>{
  const rnd=random([...id].reduce((a,c)=>a+c.charCodeAt(0),23));
  const freeFlow=['sostenian-mis-mensajes','imagine-tu-regreso','empezar-de-mi-lado','aprender-a-recibir'].includes(spec.id);
  const flowerPath=spec.id==='por-si-acaso-flores';
  const memoryHeart=spec.id==='dias-sin-fotografias';
  const pageTurns=spec.id==='aprender-a-recibir';
  const finalTrio=['la-parte-que-no-se-rindio','tu-horario-tu-vida','cuando-ya-vienes','mi-deseo-de-navidad'].includes(spec.id);
  const calm=stage.forceMotion===false||!stage.forceMotion&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const low=stage.preview||((navigator.hardwareConcurrency||4)<=4),small=w<300;
  const scenes=spec.narrative?spec.blocks.map(block=>phraseTargets([block],w,h,spec.key,small)):[phraseTargets(spec.blocks,w,h,spec.key,small,spec.hardBreaks)];
  const stillLayout=spec.narrative?phraseTargets(spec.blocks,w,h,spec.key,small):scenes[0];
  const deviceQuality=particleQuality(w,h,.7);
  const painter=createEmotionalEnergyRenderer(ctx,w,h,dpr,28000,{preview:stage.preview,fallback:stage.forceFallback});
  const budget=stage.preview?2000:painter.webgl?Math.min(w<500?13000:18000,deviceQuality.count):Math.min(3400,deviceQuality.count);
  const count=Math.ceil(budget*1.2);
  const particles=Array.from({length:count},(_,i)=>({
    x:w*(rnd()*1.8-.4),y:h*(rnd()*1.6-.3),z:(rnd()-.5)*200,vx:0,vy:0,vz:0,
    seed:rnd(),phase:rnd()*TAU,size:.8+rnd()*.8,figure:energyShape(spec.motif,i,count,w,h,rnd),
  }));
  if(freeFlow)for(const p of particles){
    // Enter from outside the frame instead of revealing a rectangular cloud.
    const angle=rnd()*TAU,radius=Math.hypot(w,h)*(.65+rnd()*.4);
    p.x=w*.5+Math.cos(angle)*radius;p.y=h*.47+Math.sin(angle)*radius;
    p.z=(rnd()-.6)*w;
  }
  let active=count,quality=low?.65:1,lag=0,lastT=-1,lastBlock=-1,burst=-1,pulse=0,pulseAt=-99,exploded=false,cardKey='',namePoints=[];
  let departing=[],pageAt=-99,enterPage=false;
  const colors=[...spec.colors];
  const palette=[];
  function rebuildColors(){
    palette.splice(0,palette.length,...colors.map((color,index)=>rgb(color).map(c=>index===2?c/255:(c/255)**2.2)));
  }
  rebuildColors();
  const atmosphere=Array.from({length:freeFlow?1400:memoryHeart?1450:flowerPath?1200:finalTrio?1100:650},()=>({x:rnd()*w,y:rnd()*h,z:(rnd()-.65)*h*.7,phase:rnd()*TAU,seed:rnd(),size:2+rnd()*5,energy:.04+rnd()*.12}));
  const waves=Array.from({length:900},()=>{const a=rnd()*TAU,z=rnd()*2-1,r=Math.sqrt(1-z*z);return {x:Math.cos(a)*r,y:Math.sin(a)*r,z,seed:rnd()};});
  function frame(t,dt=.016){
    const began=performance.now(),card=stage.card||{};
    const settings=[card.c1,card.c2,card.glow,card.speed,card.density,card.p].join('|');
    if(settings!==cardKey){
      cardKey=settings;colors[0]=/^#[\da-f]{6}$/i.test(card.c1||'')?card.c1:spec.colors[0];colors[1]=/^#[\da-f]{6}$/i.test(card.c2||'')?card.c2:spec.colors[1];rebuildColors();
      namePoints=spec.name&&card.p?phraseTargets([card.p.slice(0,24)],w,h,'',small).points.map(p=>({...p,y:p.y+h*.28})):[];
    }
    const speed=clamp(Number(card.speed)||1,.75,1.25),density=clamp(Number(card.density)||1,.65,1.2),glow=clamp(Number(card.glow)||1,.4,1.4);
    // Speed changes motion, never the minimum reading windows.
    const time=stage.preview?8.5:calm?8.5:t;
    const narrative=spec.narrative&&!stage.preview;
    const blockDuration=7.4;
    const block=narrative?Math.min(spec.blocks.length-1,Math.floor(Math.max(0,time-1)/blockDuration)):0;
    const local=narrative?time-block*blockDuration:time;
    const layout=calm?stillLayout:scenes[stage.preview?0:block];
    const endRead=spec.narrative?.8+spec.blocks.length*blockDuration:spec.duration-5;
    let age=Math.max(0,time-endRead);
    if(burst>=0)age=Math.max(age,time-burst);
    const resolving=!calm&&!stage.preview&&(time>=endRead||burst>=0);
    const figureFlight=!freeFlow;
    const flightEnd=figureFlight?1.65:freeFlow?1.5:.85;
    const morph=resolving?smooth((age-(figureFlight?1.65:.9))/(figureFlight?3.4:3.8)):0;
    // This flower presents its volume in one broad, eased turn after forming.
    // Rotate only its figure targets; the phrase, final name and portal stay put.
    const flowerTurn=spec.id==='me-daba-miedo'&&resolving
      ? TAU*smooth((age-5)/12)+Math.sin(Math.max(0,age-17)*.35)*.34*smooth((age-17)/3) : 0;
    const turnCos=Math.cos(flowerTurn),turnSin=Math.sin(flowerTurn);
    const flowerLean=spec.id==='me-daba-miedo'&&resolving?Math.sin(Math.max(0,age-5)*.45)*.1*morph:0;
    const leanCos=Math.cos(flowerLean),leanSin=Math.sin(flowerLean);
    if(stage.taps?.length){pulse=1;pulseAt=time;if(time>endRead&&burst<0)burst=time;stage.taps.length=0;}
    pulse*=Math.exp(-Math.min(dt,.1)*3);
    enterPage=false;
    if(lastBlock!==block){
      if(pageTurns&&!calm&&!stage.preview&&lastBlock>=0&&!resolving){
        pageAt=time;enterPage=true;
        const departingCount=Math.min(active,7000,24000-active);
        departing=Array.from({length:departingCount},(_,j)=>particles[Math.floor(j/departingCount*active)/active*count|0]).filter(p=>p.seed<.74).map(p=>({x:p.x,y:p.y,z:p.z,vx:-w*(.85+p.seed*.5),vy:Math.sin(p.phase)*85,seed:p.seed,phase:p.phase,size:p.size,color:lastBlock===1?1:0}));
      }
      lastBlock=block;stage.emotionalBlock=block;
    }
    const instantaneous=calm||stage.preview||lastT<0&&time>4||t<lastT;
    const delta=clamp(dt||.016,.001,.04),substeps=Math.ceil(delta/.012),step=delta/substeps;
    active=Math.max(700,Math.min(count,Math.round(budget*density*quality)));
    painter.begin();
    const ignite=calm||stage.preview?0:smooth((time-.6)/1.5);
    const passingDust=freeFlow||flowerPath&&resolving;
    for(let j=0;j<(freeFlow?(low?650:1400):memoryHeart?(low?580:1450):flowerPath&&resolving?(low?480:1200):finalTrio?(low?440:1100):(low?230:650))*quality;j++){
      const p=atmosphere[j],memoryDrift=(memoryHeart||finalTrio)&&j%4===0,passing=passingDust||memoryDrift;
      const y=passing?p.y+Math.sin(time*(memoryDrift?.5:.35)+p.phase)*(memoryDrift?18:12):(p.y-time*(1+j%3)*.8+h*8)%h;
      const x=passing?(p.x+time*speed*(memoryDrift?14+p.seed*30:flowerPath?18+p.seed*55:24+p.seed*70))%(w+60)-30:p.x+Math.sin(time*.13+p.phase)*4;
      painter.point(x,y,p.z,p.energy*(.65+.35*Math.sin(time*.5+p.phase)**2)*glow*(memoryDrift?2:flowerPath||memoryHeart?1.25:1),palette[memoryDrift?j%11===0?2:0:passingDust&&j%11===0?2:j%5?0:1],p.size*(memoryDrift?1.15:1));
    }
    // Counter-rotating energy rings and ascending sparks feed the sculpture.
    const baseY=h*(namePoints.length?.88:.77),portalRadius=Math.min(w*.27,h*.16),portalPower=ignite*(resolving?.18+morph*.16:.035)*(freeFlow&&resolving?Math.exp(-age*2.8):1);
    const drawPalette=palette.map(color=>color.map(c=>c+(1-c)*.32*(1-morph)));
    for(let j=0;j<(stage.preview||calm||flowerPath?0:900*quality);j++){
      const ring=j%3,angle=j*2.399+time*[.35,-.55,.9][ring],r=portalRadius*([1,.75,.46][ring]+Math.sin(j*19.7)*.008);
      const flicker=.6+.4*Math.sin(angle*(ring+3)*2-time*2);
      painter.point(w/2+Math.cos(angle)*r,baseY+Math.sin(angle)*r*.1,Math.sin(angle)*r*.7,portalPower*flicker*glow,palette[ring%2],5.5);
      if(memoryHeart||finalTrio||j%3===0){const life=(j*.071+time*.26)%1,angle=memoryHeart||finalTrio?life*TAU*2-time*.8+(j%2)*Math.PI+Math.sin(j*13.7)*.16:j*1.7+life*4,radius=portalRadius*(1-life)*.7;
        painter.point(w/2+Math.cos(angle)*radius,baseY-life*h*.3,Math.sin(angle)*radius,(1-life)**2*portalPower*(memoryHeart||finalTrio?1:.7)*glow,palette[memoryHeart||finalTrio?0:1],4);}
      if(j%5===0){const life=(j*.031+time*.31)%1,angle=j*.7+life*6,radius=portalRadius*(1-life)*.8;
        painter.point(w/2+Math.cos(angle)*radius,baseY+Math.sin(angle)*radius*.1,Math.sin(angle)*radius*.7,Math.sin(life*Math.PI)*portalPower*.4*glow,palette[0],4);}
    }
    if(spec.motif==='fall'&&!freeFlow&&!calm&&!stage.preview){
      const support=smooth((time-1)/3)*(resolving?Math.exp(-age*3):1);
      for(let j=0;j<85;j++){
        const phase=(time*.16+j/85)%1,x=w*.5+(j%9-4)*w*.018+Math.sin(j+time)*2,y=h*.7-phase*h*.18;
        painter.point(x,y,0,support*(.04+.1*Math.sin(phase*Math.PI)),palette[0],4.5);
      }
    }
    const held=stage.holding&&!stage.preview,px=(stage.pointer?.x??.5)*w,py=(stage.pointer?.y??.5)*h;
    const breathe=calm?0:Math.sin(time*.85)*.7;
    const bounds=layout.bounds,orbitShare=painter.webgl?.26:.16;
    const textCX=(bounds.left+bounds.right)/2,textCY=(bounds.top+bounds.bottom)/2;
    const halfWidth=(bounds.right-bounds.left)/2,halfHeight=(bounds.bottom-bounds.top)/2;
    let orbitCount=0,flightRadius=0,flightSamples=0;
    for(let i=0;i<active;i++){
      const p=particles[Math.floor(i/active*count)],q=layout.points[Math.floor(i/active*layout.points.length)]||{x:w/2,y:h/2,line:0};
      const delay=.7+q.line*.25+p.seed*.75+(spec.narrative&&q.key ? .3 : 0);
      const build=calm||stage.preview?1:pageTurns&&block>0?smooth((local-.9-p.seed*.25)/1.6):smooth((local-delay)/2.5);
      const orbiting=p.seed>1-orbitShare;
      let tx=q.x,ty=q.y,tz=Math.sin(p.phase)*9;
      if(orbiting){
        orbitCount++;
        const angle=p.phase+(calm?0:time*(.14+p.seed*.22)*(i%7?1:-1)*speed);
        const outer=1+(p.seed-(1-orbitShare))/orbitShare;
        tx=textCX+Math.cos(angle)*(halfWidth+12+w*.085*outer);
        const cloudHeight=(Math.sin(p.phase*3.7)+Math.sin(p.phase*9.1))*.5;
        ty=textCY+cloudHeight*(halfHeight+w*.12)+Math.sin(angle*2+p.phase)*w*.025;
        tz=Math.sin(angle)*(w*.24+outer*w*.06);
      }else if(i%11===0){
        // A soft shell lifts away from each glyph while its core remains sharp.
        tx+=Math.cos(p.phase+time*.2)*5;ty+=Math.sin(p.phase+time*.2)*5;tz+=Math.sin(p.phase)*15;
      }
      const organic=calm?0:.25+Math.sin(time*.6*speed+p.phase)*.22;
      tx+=Math.sin(time*.7+p.phase)*organic;ty+=Math.cos(time*.8+p.phase)*organic+breathe;
      const important=q.key;
      if(important&&spec.motif==='orbits'&&!calm)tx+=Math.sin(time*2.5+p.phase)*Math.max(0,time-7)*.08;
      if(important&&spec.motif==='release'&&block===spec.blocks.length-1&&!calm)ty+=Math.sin(time*1.3)*1.2;
      if(enterPage){
        // New particles enter from the right; the previous glyphs have their
        // own short-lived pool and can never be pulled into the next phrase.
        p.x=w+tx*.8+p.seed*w*.4;p.y=ty+Math.sin(p.phase)*30;p.z=tz;
        p.vx=-w*(.4+p.seed*.25);p.vy=p.vz=0;
      }
      const f=p.figure;
      if(resolving&&!freeFlow){
        let shapeX=f.x,shapeY=f.y,shapeZ=f.z;
        if(finalTrio){
          const yaw=spec.motif==='home'?.28+Math.sin(time*.32)*.4:Math.sin(time*.36)*(spec.motif==='tree'?.28:.13),x=f.x-w*.5,z=f.z;
          shapeX=w*.5+x*Math.cos(yaw)+z*Math.sin(yaw);
          shapeZ=-x*Math.sin(yaw)+z*Math.cos(yaw);
          shapeY=f.y+Math.sin(time*.6)*2;
          if(f.part==='flame'){
            const height=Math.max(0,(h*.45-f.y)/Math.min(w*.36,h*.235)-.34);
            shapeX+=Math.sin(time*2.3)*height*12+Math.sin(time*4.1+p.phase)*height*1.4;
            shapeY+=Math.sin(time*2.7)*height*4;
          }
          if(spec.motif==='tree')shapeX+=Math.sin(time*.7)*Math.max(0,h*.45-f.y)*.025;
          if(spec.motif==='home'){
            const breath=1+Math.sin(time*.75)*.012;
            shapeX=w*.5+(shapeX-w*.5)*breath;
            shapeY=h*.45+(shapeY-h*.45)*breath;
            const pitch=Math.sin(time*.28)*.08,y=shapeY-h*.45,z=shapeZ;
            shapeY=h*.45+y*Math.cos(pitch)-z*Math.sin(pitch);
            shapeZ=y*Math.sin(pitch)+z*Math.cos(pitch);
            if(f.part==='homeSnow'){
              shapeX+=Math.sin(time*.65+p.phase)*8;
              shapeY+=Math.sin(time*.5+p.phase)*14;
              shapeZ+=Math.cos(time*.55+p.phase)*14;
            }
            if(f.part==='homeSpark'){
              const beat=.8+.3*Math.sin(time*TAU/1.8)**4;
              shapeX=w*.5+(shapeX-w*.5)*beat;
              shapeY=h*.45+(shapeY-h*.45)*beat;
              shapeX+=Math.sin(time*1.2+p.phase)*2.5;
              shapeY+=Math.cos(time*1.1+p.phase)*2.5;
              shapeZ+=Math.sin(time+p.phase)*3;
            }
          }
          if(f.part==='second'){
            const angle=time*.35,x=f.x-w*.5,y=f.y-h*.45;
            shapeX=w*.5+x*Math.cos(angle)-y*Math.sin(angle);
            shapeY=h*.45+x*Math.sin(angle)+y*Math.cos(angle);
          }
        }
        if(spec.motif==='constellation'){
          const yaw=Math.sin(time*.42)*.48,roll=Math.sin(time*.34)*.075,breath=1+Math.sin(time*1.05)*.028;
          const x=f.x-w*.5,y=f.y-h*.45,z=f.z;
          const turnedX=x*Math.cos(yaw)+z*Math.sin(yaw);
          shapeX=w*.5+(turnedX*Math.cos(roll)-y*Math.sin(roll))*breath+Math.sin(time*.38)*w*.012;
          shapeY=h*.45+(turnedX*Math.sin(roll)+y*Math.cos(roll))*breath+Math.sin(time*.65)*5;
          shapeZ=-x*Math.sin(yaw)+z*Math.cos(yaw);
        }
        if(flowerPath&&f.flowerCenter){
          const c=f.flowerCenter,phase=f.flowerIndex*.61,wind=time*speed;
          const tilt=Math.sin(wind*.8+phase)*.22,roll=Math.sin(wind*.62+phase)*.14;
          const x=f.x-c.x,y=f.y-c.y,z=f.z-c.z;
          const tiltedY=y*Math.cos(tilt)-z*Math.sin(tilt),tiltedZ=y*Math.sin(tilt)+z*Math.cos(tilt);
          shapeX=c.x+x*Math.cos(roll)-tiltedY*Math.sin(roll)+Math.sin(wind*.72+phase)*(2+c.depth*3);
          shapeY=c.y+x*Math.sin(roll)+tiltedY*Math.cos(roll)+Math.sin(wind*.95+phase)*(1.5+c.depth*2);
          shapeZ=c.z+tiltedZ+Math.sin(wind*.55+phase)*3;
        }
        if(flowerPath&&f.destination){shapeZ+=Math.sin(time*.6+p.phase)*1.5;}
        if(spec.id==='me-daba-miedo'){
          const x=f.x-w*.5,y=f.y-h*.45,z=f.z-w*.035;
          const rotatedX=x*turnCos+z*turnSin;
          shapeZ=-x*turnSin+z*turnCos+w*.035;
          shapeX=w*.5+rotatedX*leanCos-y*leanSin;
          shapeY=h*.45+rotatedX*leanSin+y*leanCos;
        }
        // Once this phrase bursts, its glyph targets are permanently released.
        // The free-flight phase has no attraction; reconstruction seeks only
        // the final figure, never an intermediate blend back toward the letters.
        if(figureFlight){tx=shapeX;ty=shapeY;tz=shapeZ;}
        else{tx+=(shapeX-tx)*morph;ty+=(shapeY-ty)*morph;tz+=(shapeZ-tz)*morph;}
        if(spec.motif==='fall')ty+=Math.min(h*.18,age*age*1.6)*morph;
        if(spec.motif==='release'||spec.motif==='care'){
          tx+=Math.cos(p.phase)*age*5*morph;ty+=Math.sin(p.phase)*age*3*morph;
        }
        if(spec.motif==='orbits'){tx+=Math.cos(p.phase+time*.15)*age*3*morph;ty+=Math.sin(p.phase+time*.15)*age*2*morph;}
        if(spec.motif==='candle'&&f.part==='flame'){tx+=Math.sin(time*2+p.phase)*.8*morph;ty+=Math.sin(time*3+p.phase)*.8*morph;}
        if(spec.motif==='flower'){const open=.91+Math.sin(time*.7)*.025;tx=w/2+(tx-w/2)*open;}
        if(spec.motif==='tree'){ty+=Math.sin(time*.6+p.phase)*.65*morph;}
        if(namePoints.length&&morph>.6&&i>active*.78){const first=Math.floor(active*.78),np=namePoints[Math.min(namePoints.length-1,Math.floor((i-first)/(active-first)*namePoints.length))];tx+=(np.x-tx)*smooth((morph-.6)/.4);ty+=(np.y-ty)*smooth((morph-.6)/.4);tz*=1-morph;}
      }
      if(calm&&namePoints.length&&i>active*.82){const first=Math.floor(active*.82),np=namePoints[Math.min(namePoints.length-1,Math.floor((i-first)/(active-first)*namePoints.length))];tx=np.x;ty=np.y;tz=0;}
      if(resolving&&!exploded&&!instantaneous){
        if(figureFlight||freeFlow){
          const dx=p.x-textCX,dy=p.y-textCY,angle=Math.atan2(dy,dx)+Math.sin(p.phase)*.65;
          const launch=w*(1.65+p.seed*.95);
          p.vx+=Math.cos(angle)*launch;p.vy+=Math.sin(angle)*launch*.95;
          p.vz+=(p.seed-.68)*w*1.7;
        }else{
          const radial=w*(.7+p.seed*.6);p.vx+=Math.cos(p.phase)*radial;p.vy+=Math.sin(p.phase)*radial*.8;p.vz+=(p.seed-.5)*w*1.5;
        }
      }
      if(pulse>0){tx+=(tx-w/2)*pulse*.035;ty+=(ty-h*.47)*pulse*.035;}
      let fx=0,fy=0;
      if(held){const dx=p.x-px,dy=p.y-py,dist=Math.hypot(dx,dy)+1,influence=Math.max(0,1-dist/(w*.35));const sign=spec.motif==='care'?-1:1;fx=sign*dx/dist*influence*420;fy=sign*dy/dist*influence*420;}
      if(instantaneous){p.x=tx;p.y=ty;p.z=tz;p.vx=p.vy=p.vz=0;}
      else for(let s=0;s<substeps;s++){
        const scatter=resolving&&age<flightEnd;
        const k=freeFlow&&resolving?0:figureFlight&&resolving?(scatter?0:42*speed*smooth((age-flightEnd)/1.35)):scatter?.7:build>0?42*build*speed:2;
        const damping=freeFlow&&resolving?(scatter?.7:1.1):figureFlight&&scatter?.65:scatter?2.2:build>0?11:2;
        const drag=Math.exp(-step*damping);
        const turbulence=(1-build)*9;
        const passing=freeFlow&&resolving&&!scatter;
        p.vx=(p.vx+((tx-p.x)*k+Math.sin(time*1.7+p.phase)*(passing?9:turbulence)+fx+(passing?35+p.seed*40:0))*step)*drag;
        p.vy=(p.vy+((ty-p.y)*k+Math.cos(time*1.1+p.phase)*(passing?12:turbulence)+fy+(passing?5+p.seed*8:0))*step)*drag;
        p.vz=(p.vz+(tz-p.z)*k*step)*drag;
        p.x+=p.vx*step;p.y+=p.vy*step;p.z+=p.vz*step;
      }
      if(freeFlow&&resolving&&age>2.4&&(p.x< -w*.25||p.x>w*1.25||p.y< -h*.2||p.y>h*1.2)){
        // Seed the first drift across the whole frame, not as one rectangular
        // batch entering from the left. Later passages recycle at the edge.
        p.x=p.flowSpawned?-w*(.08+rnd()*.3):(rnd()*1.3-.15)*w;
        p.flowSpawned=true;p.flowBorn=time;
        p.y=rnd()*h;p.z=(rnd()-.65)*w*1.5;
        p.vx=50+p.seed*55;p.vy=(rnd()-.3)*20;p.vz=0;
      }
      if(i%64===0&&!orbiting){flightRadius+=Math.hypot(p.x-textCX,p.y-textCY);flightSamples++;}
      const narrativeColor=spec.narrative&&block>0?(spec.motif==='release'||block===1?1:p.seed<.5?1:0):p.seed<.17?1:0;
      const colorIndex=resolving&&f.part==='homeHeart'?1:resolving&&f.accent?2:important?2:narrativeColor;
      const surface=f.part==='homeHeart'?.23:f.part==='homeSnow'?.16:f.kind==='interior'?.07:f.kind==='contour'?.28:.16;
      const textEnergy=orbiting?.065:i%11===0?.075:.19+p.seed*.065;
      const sweep=(time*.14)%1,scan=Math.exp(-((q.x/w-sweep)**2)*65);
      let alpha=(textEnergy+(surface*f.normal-textEnergy)*morph)*(time<.6?.2+time:1);
      if(!orbiting)alpha*=1+scan*.32*(1-morph);
      if(finalTrio&&resolving&&f.part==='flame')alpha*=1-.18*morph;
      if(spec.motif==='home'&&resolving&&f.part==='homeSpark')alpha*=1+morph*(-.65+1.4*Math.sin(time*TAU/1.8)**4);
      if(figureFlight&&resolving&&age<flightEnd)alpha*=1.15;
      if(freeFlow&&resolving){
        const fade=smooth((age-1.6)/2.2),passingEnergy=.14+p.seed*.18;
        alpha=alpha*(1-fade)+passingEnergy*fade;
        alpha*=1-fade+fade*(p.phase<TAU*.38?1:0);
      }
      if(!freeFlow&&resolving&&['release','fall','orbits'].includes(spec.motif))alpha*=Math.max(.14,1-age*.055);
      if(freeFlow&&!resolving&&!calm&&!stage.preview)alpha*=smooth(build*1.4);
      if(freeFlow&&p.flowBorn!==undefined)alpha*=smooth((time-p.flowBorn)/.8);
      alpha=clamp(alpha*(.65+.35*glow),0,1);
      const size=(4.1+p.size*1.1+morph*1.7+(orbiting?1.2*(1-morph):0)+(freeFlow&&resolving?morph*2:0))*(1+pulse*.15)*(f.part==='homeSnow'?1-morph*.35:1);
      if(!calm&&!stage.preview&&time<2.3&&p.seed>.035+smooth((time-.6)/1.7)*.965)continue;
      painter.point(p.x,p.y,p.z,alpha,drawPalette[freeFlow&&resolving&&p.seed>.83?2:colorIndex],size);
    }
    const pageAge=time-pageAt;
    if(pageAge<1.8&&!calm&&!stage.preview)for(const p of departing){
      const departure=smooth((pageAge-p.seed*.2)/.55);
      p.vx-=w*.8*delta*departure;
      p.x+=p.vx*delta;p.y+=(p.vy+Math.sin(time*3+p.phase)*30)*delta;
      p.z+=Math.sin(p.phase)*45*delta*departure;
      if(p.x< -w*.2)continue;
      const energy=(.19+p.seed*.065)*(1-smooth((pageAge-1.15)/.65));
      painter.point(p.x,p.y,p.z,energy,drawPalette[p.color],4.1+p.size*1.1);
    }
    else if(departing.length)departing=[];
    if(resolving)exploded=true;
    const waveAge=Math.min(resolving?age:99,time-pulseAt),waveLife=calm||stage.preview?0:1-clamp(waveAge/1.55),radius=w*(.2+waveAge*.85);
    if(waveLife>0&&waveAge>=0)for(let j=0;j<waves.length*quality;j++){
      const p=waves[j];painter.point(w/2+p.x*radius,h*.47+p.y*radius*.75,p.z*radius,waveLife*waveLife*.19*glow,palette[j%7?1:2],5+p.seed*3);
    }
    painter.draw({time,glow,formation:smooth((local-1)/3),resolution:freeFlow?0:morph,shock:waveLife,palette,quality,calm,portalV:1-baseY/h,portal:!flowerPath});
    stage.revealed=time>4;stage.emotionalPhase=resolving?'resolution':local<3.8?'formation':'reading';
    const transitionPhase=!resolving?'text':age<flightEnd?'flight':freeFlow?'drift':morph<1?'rebuild':'figure';
    stage.emotionalStats={active,quality,block,phase:stage.emotionalPhase,lines:layout.lines,fontSize:layout.size,bounds,orbitCount,renderer:painter.webgl?'energy-webgl':'energy-canvas',exploded,flowerTurn,transitionPhase,flightRadius:flightSamples?flightRadius/flightSamples:0,glyphAttraction:(figureFlight||freeFlow)&&resolving?0:1-morph,figureAttraction:freeFlow?0:morph,portalEnabled:!flowerPath,flowerCount:flowerPath?28:0,destinationArch:flowerPath,pageTransition:pageTurns&&pageAge<1.8,outgoingParticles:departing.length};
    const cost=performance.now()-began;
    if(!stage.preview&&!calm){
      lag=cost>18||dt>.045?lag+1:Math.max(0,lag-2);
      if(lag>20){quality=Math.max(.45,quality-.1);lag=0;}
    }
    lastT=t;
  }
  return frame;
 };
 create.staticPreview=true;
 create.maxDpr=(typeof navigator!=='undefined'&&(navigator.hardwareConcurrency||4)<=4)?1:1.5;
 return create;
}
