import {
  TAU, clamp, rand, lerp, easeInOut, rgbaOf, glow, sparkle, heartPoint, softBackdrop, makeLayer, makeVignette, makeStars, drawStars,
} from './util.js';

// ✏️ Colores del atardecer
const SUN = [255, 200, 120];
const SKY_A = ['#3a2a6a', '#c9577a', '#ff9a5c', '#ffd28a'];
const SKY_B = ['#140c2e', '#5a2a60', '#d4546a', '#ff9d6b'];

// Guion (segundos)
const TOUCH = 4.8; // el sol toca el horizonte: momento WOW
const HEART = 5.6; // al retirarse la ola aparece el corazón en la arena

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const horizon = h * 0.56;
  const shore = h * 0.8;
  const skies = [SKY_A, SKY_B].map((stops) => softBackdrop(w, h, dpr, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, horizon);
    stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
    g.fillStyle = grad;
    g.fillRect(0, 0, w, horizon + 2);
    for (let i = 0; i < 6; i++) {
      g.fillStyle = `rgba(255, ${Math.round(rand(120, 180))}, ${Math.round(rand(120, 160))}, ${rand(0.15, 0.3)})`;
      g.beginPath();
      g.ellipse(rand(0, w), rand(h * 0.1, horizon * 0.8), S * rand(0.25, 0.5), S * rand(0.03, 0.06), 0, 0, TAU);
      g.fill();
    }
  }, 5));
  const stars = makeStars(w, horizon * 0.7, Math.round((w * h) / 5000));

  const palm = makeLayer(w, h, dpr, (g) => {
    g.strokeStyle = '#0d0710';
    g.fillStyle = '#0d0710';
    g.lineCap = 'round';
    const bx = w * 0.12;
    const by = h;
    const tx = w * 0.2;
    const ty = h * 0.42;
    g.lineWidth = S * 0.035;
    g.beginPath();
    g.moveTo(bx, by);
    g.quadraticCurveTo(w * 0.02, h * 0.7, tx, ty);
    g.stroke();
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.5 + rand(-0.1, 0.1);
      const len = S * rand(0.28, 0.4);
      g.lineWidth = S * 0.012;
      g.beginPath();
      g.moveTo(tx, ty);
      const ex = tx + Math.cos(a) * len;
      const ey = ty + Math.sin(a) * len + len * 0.45;
      g.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.5 - len * 0.1, ex, ey);
      g.stroke();
      for (let k = 1; k < 10; k++) {
        const u = k / 10;
        const px = lerp(tx, ex, u);
        const py = lerp(ty, ey, u) - Math.sin(u * Math.PI) * len * 0.15;
        g.lineWidth = S * 0.006;
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px + Math.cos(a + 1.2) * len * 0.12 * (1 - u * 0.5), py + len * 0.1);
        g.moveTo(px, py);
        g.lineTo(px + Math.cos(a - 1.2) * len * 0.12 * (1 - u * 0.5), py + len * 0.1);
        g.stroke();
      }
    }
  });
  const birds = Array.from({ length: 4 }, () => ({ x: rand(-w * 0.5, w), y: rand(h * 0.15, h * 0.35), speed: rand(15, 25), size: rand(4, 7), phase: rand(0, TAU) }));
  const vignette = makeVignette(ctx, w, h, 0.5, w / 2, horizon);

  return (t) => {
    const dusk = easeInOut(clamp(t / (HEART + 2)));
    const sunY = lerp(horizon - S * 0.45, horizon + S * 0.02, easeInOut(clamp(t / (TOUCH + 1.5))));
    const sunR = S * 0.11;
    const wow = t > TOUCH ? Math.exp(-(t - TOUCH) * 1.4) : 0;

    ctx.drawImage(skies[0], 0, 0, w, h);
    ctx.globalAlpha = dusk;
    ctx.drawImage(skies[1], 0, 0, w, h);
    ctx.globalAlpha = dusk;
    drawStars(ctx, stars, t);
    ctx.globalAlpha = 1;

    // Sol recortado por el horizonte
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, w / 2, sunY, S * (0.9 + 0.5 * wow), SUN, 0.55 + 0.35 * wow);
    ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, horizon);
    ctx.clip();
    const disk = ctx.createRadialGradient(w / 2, sunY, 0, w / 2, sunY, sunR);
    disk.addColorStop(0, '#fff6d8');
    disk.addColorStop(1, '#ffb45e');
    ctx.fillStyle = disk;
    ctx.beginPath();
    ctx.arc(w / 2, sunY, sunR, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(30, 10, 30, 0.7)';
    ctx.lineWidth = 1.3;
    for (const b of birds) {
      const x = ((b.x + t * b.speed) % (w * 1.5)) - w * 0.2;
      const flap = Math.sin(t * 8 + b.phase) * b.size * 0.5;
      ctx.beginPath();
      ctx.moveTo(x - b.size, b.y - flap);
      ctx.quadraticCurveTo(x - b.size * 0.4, b.y, x, b.y + 1);
      ctx.quadraticCurveTo(x + b.size * 0.4, b.y, x + b.size, b.y - flap);
      ctx.stroke();
    }

    // Mar con olas y el camino de luz del sol
    const sea = ctx.createLinearGradient(0, horizon, 0, shore);
    sea.addColorStop(0, `rgb(${Math.round(lerp(180, 90, dusk))}, ${Math.round(lerp(90, 50, dusk))}, ${Math.round(lerp(110, 90, dusk))})`);
    sea.addColorStop(1, `rgb(${Math.round(lerp(30, 15, dusk))}, ${Math.round(lerp(40, 25, dusk))}, ${Math.round(lerp(70, 50, dusk))})`);
    ctx.fillStyle = sea;
    ctx.fillRect(0, horizon, w, shore - horizon + S * 0.1);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 28; i++) {
      const u = i / 28;
      const y = horizon + 2 + u * u * (shore - horizon);
      const width = S * (0.08 + u * 0.5) * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.3));
      ctx.fillStyle = rgbaOf(SUN, (0.5 - u * 0.35) * (1 - dusk * 0.5) + 0.3 * wow);
      ctx.fillRect(w / 2 - width / 2 + Math.sin(t * 1.5 + i) * S * 0.02, y, width, 1 + u * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(255, 220, 200, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const u = (i + ((t * 0.15) % 1)) / 10;
      const y = horizon + u * u * (shore - horizon);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.03 + t * 1.2 + i) * u * 3);
      ctx.stroke();
    }

    // Arena mojada, espuma que va y viene
    const reach = Math.sin(t * 0.9) * 0.5 + 0.5;
    const foam = (x) => shore + S * 0.02 + reach * S * 0.09 + Math.sin(x * 0.02 + t * 0.9) * S * 0.015;
    const sand = ctx.createLinearGradient(0, shore, 0, h);
    sand.addColorStop(0, `rgb(${Math.round(lerp(150, 90, dusk))}, ${Math.round(lerp(100, 60, dusk))}, ${Math.round(lerp(90, 70, dusk))})`);
    sand.addColorStop(1, `rgb(${Math.round(lerp(90, 45, dusk))}, ${Math.round(lerp(60, 35, dusk))}, ${Math.round(lerp(60, 45, dusk))})`);
    ctx.fillStyle = sand;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 10; x += 10) ctx.lineTo(x, foam(x));
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255, 245, 235, ${0.35 + 0.2 * (1 - reach)})`;
    ctx.lineWidth = S * 0.01;
    ctx.beginPath();
    for (let x = 0; x <= w + 10; x += 10) ctx.lineTo(x, foam(x));
    ctx.stroke();
    ctx.save();
    ctx.translate(w / 2, shore + (h - shore) * 0.35);
    ctx.scale(1, 0.35);
    glow(ctx, 0, 0, S * 0.6, SUN, 0.14 * (1 - dusk * 0.6));
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';

    // Corazón dibujado en la arena
    if (t > HEART) {
      const k = clamp((t - HEART) / 1.2);
      const cx = w * 0.55;
      const cy = h * 0.9;
      // Surco: borde claro desplazado y fondo oscuro
      for (const [dy, color, alpha] of [[1.5, [255, 220, 190], 0.35], [0, [40, 20, 20], 0.45]]) {
        ctx.strokeStyle = rgbaOf(color, alpha * k);
        ctx.lineWidth = S * 0.012;
        ctx.beginPath();
        for (let i = 0; i <= 80; i++) {
          const p = heartPoint(i / 80, S * 0.32);
          const x = cx + p.x;
          const y = cy + p.y * 0.45 + dy;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    }

    // Palmera con un vaivén leve desde la base
    ctx.save();
    ctx.translate(w * 0.12, h);
    ctx.rotate(Math.sin(t * 0.8) * 0.012);
    ctx.drawImage(palm, -w * 0.12, -h, w, h);
    ctx.restore();

    if (wow > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 10; i++) {
        const tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 2.3);
        sparkle(ctx, w / 2 + (i - 5) * S * 0.08 + Math.sin(i) * 10, horizon + S * (0.05 + (i % 4) * 0.05), S * 0.012 * tw, SUN, wow * tw);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (t < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - t})`;
      ctx.fillRect(0, 0, w, h);
    }
  };
}
