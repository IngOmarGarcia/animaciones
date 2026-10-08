// Reproductor de escenas en <canvas>.
// Una escena es `create(ctx, w, h, dpr, stage)` que devuelve `frame(t, dt)`;
// `t` son los segundos transcurridos y `dt` el delta del cuadro.
// `stage.taps` recibe los toques sobre el canvas ({ x, y } en píxeles CSS) y una escena
// interactiva pone `stage.revealed = true` cuando ya debe aparecer el mensaje.
// `stage.card` ({ p, m, d }) permite que una escena dibuje el nombre.
export function createPlayer(canvas, create, { loop = 0, card = null, preview = false } = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no pudo crear el lienzo de la animación.');
  const stage = { taps: [], pointer: { x: 0.5, y: 0.5 }, holding: false, preview, revealed: false, card };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let motionAllowed = !reduced.matches, snapshotReady = false, wantsPlayback=false;
  stage.requestRender=()=>{if(!running&&!destroyed)render(0);};
  const DRAG_SCENES = new Set(['catrina-encaje','retrato-historias','eclipse-corona','guitarra-resonancia','jardin-de-lunas','universo-de-flores']);
  const listeners = new AbortController();
  const add = (name, handler) => canvas.addEventListener(name, handler, { signal: listeners.signal });
  if (!preview) canvas.style.touchAction = 'pan-y';
  add('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    stage.pointer.x = (event.clientX - rect.left) / rect.width;
    stage.pointer.y = (event.clientY - rect.top) / rect.height;
    if (!motionAllowed && stage.holding) render(0);
  });
  add('pointerdown', (event) => {
    stage.holding = true;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    stage.pointer.x = x / rect.width;
    stage.pointer.y = y / rect.height;
    if (event.pointerType === 'touch') canvas.setPointerCapture(event.pointerId);
    if (!stage.onPointerDown?.({ x, y, nx: stage.pointer.x, ny: stage.pointer.y, event })) {
      stage.taps.push({ x, y });
    }
    if (!motionAllowed) render(0);
  });
  const release = () => { stage.holding = false; if (!motionAllowed && frame) render(0); };
  add('pointerup', release);
  add('pointercancel', release);
  add('pointerleave', release);
  add('keydown', event => {
    if (!['Enter', ' '].includes(event.key) || event.repeat) return;
    event.preventDefault(); stage.holding = true;
    const x = w * .5, y = h * .5;
    stage.pointer.x = stage.pointer.y = .5;
    if (!stage.onPointerDown?.({x,y,nx:.5,ny:.5,event})) stage.taps.push({x,y});
    if (!motionAllowed) render(0);
  });
  add('keyup', event => { if (['Enter',' '].includes(event.key)) {event.preventDefault();release();} });
  add('blur', release);
  let frame = null;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let t = 0;
  let last = 0;
  let raf = 0;
  let running = false;
  let destroyed = false;
  let replayFrame = null;

  // Recrea la escena solo si cambió el tamaño (conserva el tiempo).
  function setup(force = false) {
    if (destroyed) return false;
    const rect = canvas.getBoundingClientRect();
    const nw = Math.round(rect.width);
    const nh = Math.round(rect.height);
    const ndpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!nw || !nh) return false;
    if (!force && frame && nw === w && nh === h && ndpr === dpr) return true;
    w = nw;
    h = nh;
    dpr = ndpr;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stage.taps.length = 0;
    stage.revealed = false;
    stage.onDispose?.();
    stage.onDispose = null;
    stage.onPointerDown = null;
    snapshotReady = false;
    stage.forceMotion = motionAllowed;
    frame = null;
    frame = create(ctx, w, h, dpr, stage);
    if (!preview) canvas.style.touchAction = DRAG_SCENES.has(stage.card?.a) ? 'none' : 'pan-y';
    return true;
  }

  function render(dt) {
    if (!frame && !setup()) return;
    if (!motionAllowed && !snapshotReady) {
      snapshotReady = true;
      // Construct a still from the same full-quality renderer. No RAF is left
      // running; timeline sampling does not open letters or select memories.
      const steps = preview ? 8 : 24;
      for (let i=0;i<steps;i++) {
        ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,w,h);
        frame(i*18/steps,.1);
      }
      t=18;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // Limpiar evita que la luz aditiva se acumule donde una escena no pinta opaco
    ctx.clearRect(0, 0, w, h);
    frame(t, dt);
    if(replayFrame){
      const progress=Math.min(1,t/create.fadeReplay);
      ctx.save();ctx.globalAlpha=1-progress*progress*(3-2*progress);ctx.drawImage(replayFrame,0,0,w,h);ctx.restore();
      if(progress>=1)replayFrame=null;
    }
    if (!motionAllowed) stage.revealed = true;
  }

  function tick(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    t += dt;
    if (loop && t > loop) {
      t = 0;
      setup(true);
    }
    render(dt);
    raf = requestAnimationFrame(tick);
  }

  const resizeObserver = new ResizeObserver(() => {
    if (setup() && !running) render(0);
  });
  resizeObserver.observe(canvas);

  function play() {
    wantsPlayback=true;
    if (running || destroyed) return;
    if (!setup()) return;
    render(0);
    if (!motionAllowed || preview && create.staticPreview) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function pause() {
    wantsPlayback=false;
    running = false;
    cancelAnimationFrame(raf);
    stage.holding = false;
  }

  function restart() {
    if (destroyed) return;
    if(frame&&motionAllowed&&create.fadeReplay){replayFrame=document.createElement('canvas');replayFrame.width=canvas.width;replayFrame.height=canvas.height;replayFrame.getContext('2d').drawImage(canvas,0,0);}else replayFrame=null;
    t = 0;
    setup(true);
    if (!running) render(0);
  }

  function destroy() {
    if (destroyed) return;
    pause();
    stage.onDispose?.();
    resizeObserver.disconnect();
    listeners.abort();
    destroyed = true;
    replayFrame = null;
    frame = null;
    stage.onDispose = null;
    stage.requestRender = null;
  }
  function enableMotion() {motionAllowed=true;t=0;setup(true);}
  reduced.addEventListener('change',()=>{
    const wanted=wantsPlayback;motionAllowed=!reduced.matches;pause();setup(true);render(0);wantsPlayback=wanted;
    canvas.dispatchEvent(new CustomEvent('motionpreferencechange',{detail:{reduced:!motionAllowed}}));
    if(motionAllowed&&wanted&&!document.hidden)play();
  },{signal:listeners.signal});

  return {
    play,
    pause,
    restart,
    destroy,
    enableMotion,
    get motionReduced() {return !motionAllowed;},
    redraw() {if(!running&&!destroyed)render(0);},
    stage,
    get time() { return t; },
  };
}
