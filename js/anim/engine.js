// Reproductor de escenas en <canvas>.
// Una escena es `create(ctx, w, h, dpr, stage)` que devuelve `frame(t, dt)`;
// `t` son los segundos transcurridos y `dt` el delta del cuadro.
// `stage.taps` recibe los toques sobre el canvas ({ x, y } en píxeles CSS) y una escena
// interactiva pone `stage.revealed = true` cuando ya debe aparecer el mensaje.
// `stage.card` ({ p, m, d }) permite que una escena dibuje el nombre.
export function createPlayer(canvas, create, { loop = 0, card = null, preview = false } = {}) {
  const ctx = canvas.getContext('2d');
  const stage = { taps: [], pointer: { x: 0.5, y: 0.5 }, holding: false, preview, revealed: false, card };
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const rect = canvas.getBoundingClientRect();
    stage.pointer.x = (event.clientX - rect.left) / rect.width;
    stage.pointer.y = (event.clientY - rect.top) / rect.height;
  });
  canvas.addEventListener('pointerdown', (event) => {
    stage.holding = true;
    const rect = canvas.getBoundingClientRect();
    stage.taps.push({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  });
  const release = () => { stage.holding = false; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', release);
  let frame = null;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let t = 0;
  let last = 0;
  let raf = 0;
  let running = false;

  // Recrea la escena solo si cambió el tamaño (conserva el tiempo).
  function setup(force = false) {
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
    frame = create(ctx, w, h, dpr, stage);
    return true;
  }

  function render(dt) {
    if (!frame && !setup()) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // Limpiar evita que la luz aditiva se acumule donde una escena no pinta opaco
    ctx.clearRect(0, 0, w, h);
    frame(t, dt);
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
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function restart() {
    t = 0;
    setup(true);
    if (!running) render(0);
  }

  function destroy() {
    pause();
    resizeObserver.disconnect();
  }

  return {
    play,
    pause,
    restart,
    destroy,
    stage,
    get time() { return t; },
  };
}
