export function passingParticles(width,height,count) {
  return Array.from({length:count},(_,i)=>({x:Math.random()*width,y:Math.random()*height,phase:Math.random()*Math.PI*2,speed:12+Math.random()*28,size:.55+Math.random()*1.05,color:i%3?'#5b9bff':'#b28aff',seed:Math.random()}));
}
export function paintPassingParticles(ctx,points,width,height,ms,dt,reduced) {
  ctx.clearRect(0,0,width,height);ctx.globalCompositeOperation='lighter';
  for(const p of points){
    if(!reduced)p.x=(p.x+p.speed*dt)%(width+24);
    const x=p.x-12,y=p.y+Math.sin(ms*.0005+p.phase)*2;
    const intensity=.3+.35*Math.sin(ms*.0008+p.phase)**2;
    ctx.fillStyle=p.color;ctx.globalAlpha=intensity*.15;ctx.beginPath();ctx.arc(x,y,p.size*4,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=intensity;ctx.beginPath();ctx.arc(x,y,p.size,0,Math.PI*2);ctx.fill();
    if(p.seed>.82){ctx.strokeStyle=p.color;ctx.globalAlpha=intensity*.17;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-10-p.seed*10,y);ctx.stroke();}
  }
  ctx.globalAlpha=1;
}
export function initHeaderParticles(header) {
  if (header.querySelector('.header-particles')) return;
  const canvas = document.createElement('canvas');canvas.className = 'header-particles';canvas.setAttribute('aria-hidden','true');
  const ctx = canvas.getContext('2d');if (!ctx) return;
  header.prepend(canvas);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { running:false, frames:0, count:0 };header.headerParticles = state;
  let width=0,height=72,points=[],raf=0,last=0,visible=true,destroyed=false;
  function resize() {
    cancelAnimationFrame(raf);state.running=false;
    width=header.clientWidth;height=header.clientHeight;
    const dpr=Math.min(devicePixelRatio||1,1.25);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    points=passingParticles(width,height,Math.min(90,Math.max(22,Math.round(width/18))));
    state.count=points.length;paint(0);sync();
  }
  function paint(ms) {
    if(reduced.matches||document.hidden||!visible)state.running=false;
    const dt=last?Math.min((ms-last)/1000,.05):0;last=ms;
    paintPassingParticles(ctx,points,width,height,ms,dt,reduced.matches);state.frames++;
    if(state.running)raf=requestAnimationFrame(paint);
  }
  function sync() {
    cancelAnimationFrame(raf);last=0;
    state.running=!destroyed&&visible&&!document.hidden&&!reduced.matches;
    if(state.running)raf=requestAnimationFrame(paint);
    else if(!destroyed&&visible&&!document.hidden)paint(0);
  }
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(header);
  const visibility=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();});visibility.observe(header);
  const abort=new AbortController();
  document.addEventListener('visibilitychange',sync,{signal:abort.signal});reduced.addEventListener('change',sync,{signal:abort.signal});
  window.addEventListener('pagehide',event=>{
    state.running=false;cancelAnimationFrame(raf);
    if(!event.persisted){destroyed=true;resizeObserver.disconnect();visibility.disconnect();abort.abort();}
  },{signal:abort.signal});
  window.addEventListener('pageshow',sync,{signal:abort.signal});
}
