import {
  TAU, clamp, rand, lerp, easeInOut, rgbaOf, glow, heartPoint, softBackdrop, makeLayer, makeVignette,
} from './util.js';

// ✏️ Colores de la luz de las luciérnagas y de la luna
const FIREFLY = [210, 255, 120];
const MOON = [170, 200, 255];

// Guion (segundos)
const GATHER = 2.2; // aparecen muchas luciérnagas
const SYNC = 3.8; // empiezan a parpadear al mismo ritmo
const HEART = 5.2; // destello conjunto en forma de corazón: momento WOW

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const count = calm ? 40 : Math.round(clamp((w * h) / 2600, 50, 120));
  const floor = h * 0.84;
  const heart = { x: w / 2, y: h * 0.52, size: S * 0.85 };

  const night = softBackdrop(w, h, dpr, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#040b14');
    grad.addColorStop(0.6, '#0a1d24');
    grad.addColorStop(1, '#10261e');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });

  // Tres capas de árboles con neblina entre ellas
  const layers = [
    { color: '#0e2128', fog: 'rgba(90, 140, 150, 0.18)', trunks: 9, width: 0.02 },
    { color: '#08161b', fog: 'rgba(60, 110, 110, 0.14)', trunks: 6, width: 0.035 },
    { color: '#030a0c', fog: null, trunks: 4, width: 0.06 },
  ].map((layer, li) => makeLayer(w, h, dpr, (g) => {
    for (let i = 0; i < layer.trunks; i++) {
      let x = ((i + rand(0.1, 0.9)) / layer.trunks) * w;
      // Las capas cercanas dejan libre el centro para que se vea el corazón
      if (li > 0 && Math.abs(x - w / 2) < w * (li === 2 ? 0.34 : 0.22)) x = x < w / 2 ? w * rand(0.02, 0.16) : w * rand(0.84, 0.98);
      const tw = S * layer.width * rand(0.7, 1.3);
      g.fillStyle = layer.color;
      g.beginPath();
      g.moveTo(x - tw, floor + 10);
      g.lineTo(x - tw * 0.6, -10);
      g.lineTo(x + tw * 0.6, -10);
      g.lineTo(x + tw, floor + 10);
      g.closePath();
      g.fill();
      for (let k = 0; k < 3; k++) {
        const by = rand(h * 0.1, h * 0.5);
        const dir = Math.random() < 0.5 ? -1 : 1;
        g.strokeStyle = layer.color;
        g.lineWidth = tw * 0.35;
        g.beginPath();
        g.moveTo(x, by);
        g.quadraticCurveTo(x + dir * S * 0.12, by - S * 0.05, x + dir * S * 0.25, by - S * 0.12);
        g.stroke();
      }
    }
    g.fillStyle = layer.color;
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w + 12; x += 12) g.lineTo(x, floor + li * S * 0.02 - Math.abs(Math.sin(x * 0.05 + li)) * S * 0.04);
    g.lineTo(w, h);
    g.fill();
    if (layer.fog) {
      const fog = g.createLinearGradient(0, floor - h * 0.3, 0, floor);
      fog.addColorStop(0, 'rgba(0, 0, 0, 0)');
      fog.addColorStop(1, layer.fog);
      g.fillStyle = fog;
      g.fillRect(0, floor - h * 0.3, w, h * 0.3 + 10);
    }
  }));
  const vignette = makeVignette(ctx, w, h, 0.7, w / 2, h * 0.55);

  const flies = Array.from({ length: count }, (_, i) => ({
    seed: rand(0, 100),
    depth: rand(0.3, 1),
    phase: rand(0, TAU),
    rate: rand(1.6, 3),
    slot: i / count,
    appear: i < 3 ? 0.5 + i * 0.5 : rand(GATHER - 0.8, GATHER + 1.4),
    inHeart: i % 3 !== 2,
  }));

  return (t) => {
    const intro = clamp(t / 1.5);
    const sync = easeInOut(clamp((t - SYNC) / 1.4));
    const form = easeInOut(clamp((t - HEART + 1) / 1.1));
    const wow = t > HEART ? Math.exp(-(t - HEART) * 1.6) : 0;
    const shared = Math.pow(Math.max(0, Math.sin(t * 2.4)), 6);

    ctx.drawImage(night, 0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    // Rayos de luna entre los árboles
    for (let i = 0; i < 3; i++) {
      const x = w * (0.2 + i * 0.3) + Math.sin(t * 0.2 + i) * S * 0.03;
      ctx.fillStyle = rgbaOf(MOON, 0.035 * intro);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + S * 0.08, 0);
      ctx.lineTo(x - S * 0.1, floor);
      ctx.lineTo(x - S * 0.3, floor);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    const drawFlies = (near) => {
      for (const f of flies) {
        const front = (f.inHeart && form > 0) || f.depth > 0.65;
        if (front !== near || t < f.appear) continue;
        const appear = clamp((t - f.appear) / 0.8);
        const free = {
          x: w / 2 + Math.sin(t * 0.21 + f.seed) * w * 0.48 + Math.sin(t * 0.9 + f.seed * 3) * S * 0.04,
          y: h * 0.55 + Math.cos(t * 0.17 + f.seed * 1.3) * h * 0.28 + Math.sin(t * 0.7 + f.seed) * S * 0.04,
        };
        let x = free.x;
        let y = free.y;
        if (f.inHeart && form > 0) {
          const p = heartPoint(f.slot * 1.5 % 1, heart.size);
          x = lerp(free.x, heart.x + p.x + Math.sin(t * 1.5 + f.seed) * S * 0.01, form);
          y = lerp(free.y, heart.y + p.y + Math.cos(t * 1.3 + f.seed) * S * 0.01, form);
        }
        const own = Math.pow(Math.max(0, Math.sin(t * f.rate + f.phase)), 4);
        const blink = lerp(own, shared, sync) * 0.85 + 0.15;
        const size = S * 0.009 * (0.6 + f.depth);
        glow(ctx, x, y, size * 5.5, FIREFLY, 0.55 * blink * appear + 0.25 * wow * appear);
        ctx.fillStyle = rgbaOf([250, 255, 210], blink * appear);
        ctx.beginPath();
        ctx.arc(x, y, size * (0.6 + 0.4 * blink), 0, TAU);
        ctx.fill();
      }
    };

    ctx.drawImage(layers[0], 0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    drawFlies(false);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(layers[1], 0, 0, w, h);
    ctx.drawImage(layers[2], 0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    if (wow > 0.01 || t > HEART) {
      glow(ctx, heart.x, heart.y, S * 1.1, FIREFLY, 0.2 * wow + 0.06 * shared * clamp(t - HEART));
    }
    drawFlies(true);
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (intro < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - intro})`;
      ctx.fillRect(0, 0, w, h);
    }
  };
}
