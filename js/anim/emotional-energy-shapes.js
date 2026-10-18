const TAU=Math.PI*2;
// Same implicit heart volume as corazon-energia.js (Y points upward).
function heartField(x,y,z){const a=x*x+2.25*z*z+y*y-1;return a*a*a-x*x*y*y*y-.1125*z*z*y*y*y;}
function heartRadius(dx,dy,dz){
  let r=0;while(r<1.8&&heartField(dx*r,dy*r,dz*r)<0)r+=.04;
  let lo=Math.max(0,r-.04),hi=r;
  for(let k=0;k<7;k++){const mid=(lo+hi)/2;if(heartField(dx*mid,dy*mid,dz*mid)<0)lo=mid;else hi=mid;}
  return lo;
}
// Deliberate irregular spacing: no rows or repeated left/centre/right columns.
// Each entry is [lateral position, depth, relative flower size].
const HANDMADE_PATH=[
  [-.12,.01,.86],[.14,.07,.94],[-.27,.15,.88],[.26,.18,1.03],
  [.02,.25,.92],[-.36,.3,1.06],[.39,.34,.88],[-.08,.4,1.02],
  [-.56,.44,.9],[.43,.48,1.12],[.02,.52,.93],[-.74,.58,1.04],
  [.52,.6,.91],[-.27,.65,1.13],[.17,.69,.94],[-.86,.73,.99],
  [.71,.75,1.07],[-.05,.8,.9],[-.55,.84,1.12],[.43,.87,.96],
  [-.99,.92,1.01],[.04,.94,1.08],[.78,.98,.94],[-.39,1.03,1.04],
  [-.81,.63,.92],[-1.12,.8,.97],[.91,.55,.96],[1.02,.83,1.04],
];

// Filled surfaces, interior energy and holographic contours, as in the implicit
// heart surface. Coordinates remain in CSS-pixel units until the shared renderer.
export function energyShape(motif,i,n,w,h,rnd){
  const scale=Math.min(w*.36,h*.235),cx=w*.5,cy=h*.45;
  const u=rnd(),v=rnd(),a=rnd()*TAU;
  const kind=i%19<3?'contour':i%19<7?'interior':'surface';
  const inside=kind==='interior'?.48+u*.4:1;
  let x=0,y=0,z=0,accent=false,normal=1,flowerCenter=null,flowerIndex=-1,destination=false,part='';
  if(motif==='flower'){
    const stem=i%17===0,leaf=i%23===0;
    const layer=u<.68?2:u<.91?1:0,petals=[5,7,9][layer],petal=Math.floor(rnd()*petals);
    const angle=petal*TAU/petals+layer*.37,t=rnd(),side=kind==='contour'?(i%2?-.98:.98):rnd()*2-1;
    const length=scale*(.45+layer*.25),radius=scale*.07+t*length;
    const width=Math.sin(Math.PI*t)**.7*scale*(.17+layer*.025)*side;
    x=Math.cos(angle)*radius-Math.sin(angle)*width;
    y=(Math.sin(angle)*radius+Math.cos(angle)*width)*.8-scale*.1;
    z=(Math.sin(t*Math.PI)*(.4-layer*.07)+side*side*.2+layer*.04)*scale;
    normal=.4+.6*(1-Math.abs(side)*.55);
    if(stem){const t=rnd();x=Math.sin(t*2)*scale*.04+Math.cos(a)*scale*.016;y=t*scale*1.35;z=Math.sin(a)*scale*.016;normal=.55;}
    if(leaf){const side=i%2?1:-1,t=rnd();x=side*t*scale*.48;y=scale*.72-t*scale*.23+Math.sin(a)*Math.sin(Math.PI*t)*scale*.1;z=Math.cos(a)*Math.sin(Math.PI*t)*scale*.08;}
    if(i%31===0){const r=Math.sqrt(rnd())*scale*.105;x=Math.cos(a)*r;y=Math.sin(a)*r*.75-scale*.1;z=scale*.22;accent=true;}
  }else if(motif==='candle'){
    if(u<.63){
      part='wax';
      const t=kind==='contour'?Math.floor(rnd()*14)/14:rnd(),radius=scale*.24*inside;
      x=Math.cos(a)*radius;y=(t-.5)*scale*1.32+scale*.35;z=Math.sin(a)*radius;
      normal=.25+.75*Math.max(0,Math.sin(a)*.7+Math.cos(a)*.4);
      if(i%13===0){y=-scale*.31+Math.sin(a*5)*scale*.018;x=Math.cos(a)*radius;z=Math.sin(a)*radius;accent=true;}
      if(i%19===0){const t=rnd();y=-scale*.31+t*scale*(.15+.18*(.5+.5*Math.sin(a*7)));x=Math.cos(a)*scale*.25;z=Math.sin(a)*scale*.25;normal=.85;}
      if(i%37===0){const r=Math.sqrt(rnd())*scale*.23;x=Math.cos(a)*r;y=-scale*.31+Math.sin(a)*scale*.012;z=Math.sin(a)*r;}
    }else if(i%13===0){
      part='wick';x=(rnd()-.5)*scale*.025;y=-scale*.31-rnd()*scale*.16;z=scale*.015;normal=.4;
    }else{
      part='flame';
      const t=rnd(),radius=Math.sin(Math.PI*t)*scale*.18*(1-t*.55)*inside;
      x=Math.cos(a)*radius+Math.sin(t*3)*scale*.04;y=-scale*.34-t*scale*.82;z=Math.sin(a)*radius;
      normal=.55+t*.4;accent=t>.35;
    }
  }else if(motif==='tree'){
    part='needles';
    const tier=Math.floor(rnd()*9),t=rnd(),depth=(tier+.3+t*.8)/9;
    const radius=scale*(.05+depth*.9)*inside*(.55+.45*t),needle=.93+rnd()*.07;
    x=Math.cos(a)*radius*needle;y=-scale+depth*scale*1.82;z=Math.sin(a)*radius*.7*needle;
    normal=.3+.7*(.5+.5*Math.sin(a));
    if(i%23===0){part='trunk';x=Math.cos(a)*scale*.065;y=scale*(.74+rnd()*.34);z=Math.sin(a)*scale*.065;normal=.55;}
    if(i%11===0){const t=rnd(),a=t*TAU*5;x=Math.cos(a)*scale*t;y=-scale+t*scale*1.9;z=Math.sin(a)*scale*t*.7;accent=true;}
    if(i%29===0){
      part='star';
      const edge=Math.floor(rnd()*10),a1=-Math.PI/2+edge*Math.PI/5,a2=a1+Math.PI/5;
      const r1=scale*(edge%2?.065:.15),r2=scale*(edge%2?.15:.065),t=rnd();
      x=Math.cos(a1)*r1*(1-t)+Math.cos(a2)*r2*t;
      y=-scale*1.16+Math.sin(a1)*r1*(1-t)+Math.sin(a2)*r2*t;z=(rnd()-.5)*scale*.035;accent=true;
    }
  }else if(motif==='home'){
    const group=i%48;
    if(group>=4){
      // A true implicit shell: both lobes retain their rounded depth through
      // the cleft. No flat silhouette band is drawn over the surface.
      const snow=group>=43,dy=rnd()*2-1,angle=rnd()*TAU,side=Math.sqrt(1-dy*dy);
      const dx=Math.cos(angle)*side,dz=Math.sin(angle)*side;
      const radius=heartRadius(dx,dy,dz)*(snow?Math.cbrt(rnd())*.72:.985+rnd()*.015);
      const hx=dx*radius,hy=dy*radius,hz=dz*radius,e=.002;
      const nx=heartField(hx+e,hy,hz)-heartField(hx-e,hy,hz),ny=heartField(hx,hy+e,hz)-heartField(hx,hy-e,hz),nz=heartField(hx,hy,hz+e)-heartField(hx,hy,hz-e);
      const length=Math.hypot(nx,ny,nz)||1;
      part=snow?'homeSnow':'homeHeart';
      x=hx*scale*.95;y=-hy*scale*.95+scale*.12;z=hz*scale*.95;
      normal=snow?.6:Math.min(1,.2+.55*Math.max(0,(-nx*.5+ny*.7+nz*.6)/length)+.35*(1-Math.abs(nz)/length)**3);
      accent=snow;
    }else{
      part='homeSpark';accent=true;
      // Soft central light: a dense core fades into a loose spherical halo.
      const angle=rnd()*TAU,latitude=rnd()*2-1,radius=scale*.22*rnd()**1.8;
      const side=Math.sqrt(1-latitude*latitude);
      x=Math.cos(angle)*side*radius;
      y=Math.sin(angle)*side*radius+scale*.12;
      z=latitude*radius;
      normal=.15+.5*(1-radius/(scale*.22))**2;
    }
  }else if(motif==='path'){
    if(i%11===0){
      // An upright luminous arch at the far end, not a ring below the path.
      destination=true;
      const t=rnd(),rx=scale*.39,height=scale*.78,baseY=-scale*.78;
      const band=(rnd()-.5)*scale*.045;
      if(t<.2){x=-rx+band;y=baseY-t/.2*height*.45;}
      else if(t>.8){x=rx+band;y=baseY-height*.45+(t-.8)/.2*height*.45;}
      else{const a=(t-.2)/.6*Math.PI;x=-Math.cos(a)*(rx+band);y=baseY-height*.45-Math.sin(a)*(height*.55+band);}
      z=-scale*2.35+(rnd()-.5)*scale*.08;
      normal=.85;accent=i%3===0;
    }else{
      const flower=Math.floor(i*10/11)%HANDMADE_PATH.length,[lateral,depth,relativeSize]=HANDMADE_PATH[flower];
      const perspective=.33+depth*.75,centerX=(Math.sin(depth*4.2)*.14+lateral)*scale;
      const petal=Math.floor(rnd()*13),angle=petal*TAU/13+flower*.37,t=rnd(),r=scale*.2*perspective*t*relativeSize;
      const width=Math.sin(Math.PI*t)*scale*.05625*perspective*relativeSize*(kind==='contour'?(i%2?1:-1):rnd()*2-1);
      x=centerX+Math.cos(angle)*r-Math.sin(angle)*width;
      y=-scale*.7+depth*scale*1.9+(Math.sin(angle)*r+Math.cos(angle)*width)*.5;
      z=-scale*(1-depth)*2+Math.sin(t*Math.PI)*scale*.075*perspective;
      flowerCenter={x:cx+centerX,y:cy-scale*.7+depth*scale*1.9,z:-scale*(1-depth)*2,depth};flowerIndex=flower;
      normal=.55+t*.35;accent=i%23===0;
    }
  }else if(motif==='constellation'){
    // A readable heart made of starlight, with a rounded particle shell.
    // Sparse bright stars follow its silhouette; no crossing chords.
    const star=i%17===0;
    const angle=star?((i%11)+.35)/11*TAU:a;
    const radial=star?1:kind==='contour'?.97+rnd()*.035:kind==='interior'?Math.sqrt(rnd())*.86:Math.sqrt(1-(v*2-1)**2);
    const hx=Math.sin(angle)**3;
    const hy=-(13*Math.cos(angle)-5*Math.cos(2*angle)-2*Math.cos(3*angle)-Math.cos(4*angle))/16;
    const jitter=star?scale*.012:scale*.005;
    x=hx*scale*radial+(rnd()-.5)*jitter;
    y=(hy*radial+.12)*scale+(rnd()-.5)*jitter;
    z=star?scale*.035:(v*2-1)*scale*.34;
    normal=star?.7:kind==='interior'?.45:.65+.35*Math.max(0,z/scale);
    accent=star;
  }else if(motif==='arch'){
    const a=Math.PI*.08+rnd()*Math.PI*.84,ring=kind==='contour'?Math.floor(rnd()*3)/3:rnd();
    const r=scale*(.82+ring*.12);x=Math.cos(a)*r;y=-Math.sin(a)*r+scale*.4;z=Math.sin(ring*TAU)*scale*.22;accent=i%13===0;
  }else if(motif==='clock'){
    const group=i%20;
    if(group<9){
      part='rim';const r=scale*(.88+rnd()*.055);x=Math.cos(a)*r;y=Math.sin(a)*r;z=(rnd()-.5)*scale*.09;normal=.8;accent=group===0;
    }else if(group<13){
      part='ticks';const tick=Math.floor(rnd()*12),angle=tick*TAU/12-Math.PI/2;
      const r=scale*(.7+rnd()*(tick%3===0?.13:.075)),jitter=(rnd()-.5)*scale*.017;
      x=Math.cos(angle)*r-Math.sin(angle)*jitter;y=Math.sin(angle)*r+Math.cos(angle)*jitter;z=scale*.06;normal=.85;
    }else if(group<18){
      part=group<16?'hour':'minute';const angle=part==='hour'?-Math.PI*5/6:-Math.PI/6;
      const length=scale*(part==='hour'?.48:.64),t=rnd(),width=(rnd()-.5)*scale*.035;
      x=Math.cos(angle)*length*t-Math.sin(angle)*width;y=Math.sin(angle)*length*t+Math.cos(angle)*width;z=scale*.08;normal=.85;accent=true;
    }else if(group===18){
      part='second';const t=rnd();x=0;y=-scale*.67*t;z=scale*.1;normal=.7;accent=true;
    }else{
      part='hub';const r=Math.sqrt(rnd())*scale*.065;x=Math.cos(a)*r;y=Math.sin(a)*r;z=scale*.12;normal=.9;accent=true;
    }
  }else if(motif==='orbits'){
    const ring=i%3,a=rnd()*TAU;x=Math.cos(a)*scale*(.52+ring*.22);y=Math.sin(a)*scale*(.3+ring*.14);z=Math.sin(a+ring)*scale*.65;normal=.35;
  }else{
    const r=scale*(.6+rnd()*1.6);x=Math.cos(a)*r;y=Math.sin(a)*r*.8;z=(rnd()-.5)*scale*2;
    if(motif==='fall'){x=(rnd()-.5)*w*.9;y=h*.35+rnd()*h*.09;z=(rnd()-.5)*scale*.5;}
    normal=.45;
  }
  return {x:cx+x,y:cy+y,z,accent,kind:destination||part==='homeRim'?'contour':kind,normal,flowerCenter,flowerIndex,destination,part};
}
