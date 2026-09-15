import {
  TAU, clamp, rand, pick, lerp, easeOutCubic, rgbaOf, glow, sparkle, softBackdrop, makeLayer, makeVignette,
} from './util.js';

// ✏️ Colores de la escena navideña
const LIGHTS = [[255, 90, 90], [255, 210, 90], [110, 220, 140], [110, 170, 255]];
const STAR = [255, 225, 130];

// Guion en segundos desde que se agita
const SHAKE = 0.9; // tiempo agitándose
const STAR_ON = 1.8; // se enciende la estrella del árbol: momento WOW
const REVEAL = 2.4;

export default function create(ctx, w, h, dpr = 1, stage) {
  const S = Math.min(w, h * 0.62);
  const R = S * 0.36;
  const cx = w / 2;
  const cy = h * 0.52;
  const autoShake = stage && !stage.auto ? 6 : 2.5;
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const room = softBackdrop(w, h, dpr, (g) => {
    const base = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h));
    base.addColorStop(0, '#2a1a22');
    base.addColorStop(1, '#070308');
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = rgbaOf(pick(LIGHTS), rand(0.2, 0.45));
      g.beginPath();
      g.arc(rand(0, w), rand(0, h * 0.8), S * rand(0.02, 0.06), 0, TAU);
      g.fill();
    }
  });

  // Pueblito dentro de la esfera: nieve en el piso, pinos y casita con ventana cálida
  const village = makeLayer(R * 2, R * 2, dpr, (g) => {
    g.translate(R, R);
    g.beginPath();
    g.arc(0, 0, R * 0.97, 0, TAU);
    g.clip();
    const air = g.createLinearGradient(0, -R, 0, R);
    air.addColorStop(0, '#20355a');
    air.addColorStop(1, '#5a7aa6');
    g.fillStyle = air;
    g.fillRect(-R, -R, R * 2, R * 2);
    const pine = (x, base, size, shade) => {
      g.fillStyle = shade;
      for (let k = 0; k < 3; k++) {
        const top = base - size * (0.5 + k * 0.35);
        g.beginPath();
        g.moveTo(x, top - size * 0.35);
        g.lineTo(x + size * (0.45 - k * 0.1), top + size * 0.25);
        g.lineTo(x - size * (0.45 - k * 0.1), top + size * 0.25);
        g.fill();
        g.fillStyle = 'rgba(255, 255, 255, 0.7)';
        g.beginPath();
        g.moveTo(x, top - size * 0.35);
        g.lineTo(x + size * 0.12, top - size * 0.15);
        g.lineTo(x - size * 0.12, top - size * 0.15);
        g.fill();
        g.fillStyle = shade;
      }
    };
    pine(-R * 0.55, R * 0.55, R * 0.45, '#1e5a3a');
    pine(R * 0.55, R * 0.58, R * 0.38, '#1a4d32');
    g.fillStyle = '#7a3b2a';
    g.fillRect(-R * 0.2, R * 0.2, R * 0.4, R * 0.32);
    g.fillStyle = '#f0f4ff';
    g.beginPath();
    g.moveTo(-R * 0.28, R * 0.22);
    g.lineTo(0, -R * 0.02);
    g.lineTo(R * 0.28, R * 0.22);
    g.fill();
    g.fillStyle = '#ffc46b';
    g.fillRect(-R * 0.07, R * 0.3, R * 0.12, R * 0.1);
    pine(0, R * 0.05, R * 0.55, '#237a47');
    g.fillStyle = '#eef3ff';
    g.beginPath();
    g.ellipse(0, R * 0.62, R * 1.1, R * 0.2, 0, 0, TAU);
    g.fill();
  });
  const treeTop = { x: 0, y: -R * 0.55 };
  const vignette = makeVignette(ctx, w, h, 0.7, cx, cy);

  const flakes = Array.from({ length: calm ? 50 : 140 }, () => {
    const a = rand(0, TAU);
    const d = Math.sqrt(Math.random()) * R * 0.85;
    return { x: Math.cos(a) * d * 0.9, y: R * rand(0.35, 0.6), vx: 0, vy: 0, size: rand(0.8, 2.2) * (S / 380), phase: rand(0, TAU) };
  });

  let shakeAt = null;
  let kicked = false;

  return (t, dt) => {
    if (shakeAt === null) {
      const tapped = stage && stage.taps.length > 0 && t > 0.3;
      if (tapped || t >= autoShake) shakeAt = t;
    }
    if (stage) stage.taps.length = 0;
    const q = shakeAt === null ? -1 : t - shakeAt;
    if (stage && q >= REVEAL) stage.revealed = true;

    const intro = clamp(t / 1);
    const shaking = q >= 0 && q < SHAKE ? Math.sin((q / SHAKE) * Math.PI) : 0;
    const ox = Math.sin(t * 40) * S * 0.02 * shaking;
    const tilt = Math.sin(t * 25) * 0.06 * shaking;
    const star = q >= STAR_ON ? easeOutCubic(clamp((q - STAR_ON) / 0.6)) : 0;
    const wow = q >= STAR_ON ? Math.exp(-(q - STAR_ON) * 1.8) : 0;

    // La nieve sube al agitar y cae despacio
    if (q >= 0 && !kicked) {
      kicked = true;
      for (const f of flakes) {
        f.vx = rand(-1, 1) * R * 1.2;
        f.vy = -rand(0.6, 1.8) * R;
      }
    }
    for (const f of flakes) {
      if (shaking > 0) {
        f.vx += Math.sin(t * 30 + f.phase) * R * 3 * shaking * dt;
        f.vy += Math.cos(t * 27 + f.phase) * R * 2 * shaking * dt;
      }
      f.vx *= 1 - Math.min(1, 1.6 * dt);
      f.vy = f.vy * (1 - Math.min(1, 1.6 * dt)) + R * 0.12 * dt;
      f.x += (f.vx + Math.sin(t + f.phase) * R * 0.03) * dt;
      f.y += f.vy * dt;
      const limit = R * 0.9;
      const d = Math.hypot(f.x, f.y);
      if (d > limit) {
        f.x *= limit / d;
        f.y *= limit / d;
        f.vx *= -0.3;
        f.vy *= -0.3;
      }
      if (f.y > R * 0.55) {
        f.y = R * 0.55;
        f.vy = 0;
        f.vx *= 0.5;
      }
    }

    ctx.drawImage(room, 0, 0, w, h);

    ctx.save();
    ctx.translate(cx + ox, cy);
    ctx.rotate(tilt);

    // Base de madera
    const base = ctx.createLinearGradient(-R, 0, R, 0);
    base.addColorStop(0, '#3b2012');
    base.addColorStop(0.45, '#8a5a34');
    base.addColorStop(1, '#2a160c');
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.moveTo(-R * 0.75, R * 0.8);
    ctx.lineTo(R * 0.75, R * 0.8);
    ctx.lineTo(R * 0.9, R * 1.25);
    ctx.lineTo(-R * 0.9, R * 1.25);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(-R * 0.8, R * 0.95, R * 1.6, R * 0.05);

    ctx.drawImage(village, -R, -R, R * 2, R * 2);

    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 0, R * 0.35, R * 0.3, [255, 190, 110], 0.3 * intro);
    if (star > 0) {
      glow(ctx, treeTop.x, treeTop.y, R * (0.6 + 0.8 * wow), STAR, 0.4 * star + 0.5 * wow);
      sparkle(ctx, treeTop.x, treeTop.y, R * 0.12 * star, STAR, star);
    }
    ctx.globalCompositeOperation = 'source-over';
    if (star > 0) {
      ctx.fillStyle = rgbaOf(STAR, star);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? R * 0.03 : R * 0.075;
        const a = (i / 10) * TAU - Math.PI / 2;
        ctx.lineTo(treeTop.x + Math.cos(a) * r * star, treeTop.y + Math.sin(a) * r * star);
      }
      ctx.closePath();
      ctx.fill();
    }

    for (const f of flakes) {
      const glint = wow > 0.05 ? wow : 0;
      ctx.fillStyle = glint ? rgbaOf([255, 235, 170], 0.9) : 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size * (1 + glint), 0, TAU);
      ctx.fill();
    }

    // Vidrio: brillo de borde, reflejo curvo y refracción
    const glass = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R);
    glass.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    glass.addColorStop(0.7, 'rgba(255, 255, 255, 0.02)');
    glass.addColorStop(0.95, 'rgba(200, 220, 255, 0.25)');
    glass.addColorStop(1, 'rgba(255, 255, 255, 0.45)');
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = R * 0.03;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.82, Math.PI * 1.1, Math.PI * 1.45);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = R * 0.015;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.9, Math.PI * 0.1, Math.PI * 0.35);
    ctx.stroke();
    ctx.restore();

    if (q < 0 && stage && !stage.auto && t > 1) {
      ctx.fillStyle = `rgba(255, 240, 230, ${clamp((t - 1) / 0.6) * (0.6 + 0.4 * Math.sin(t * 3))})`;
      ctx.font = `600 ${Math.round(S * 0.05)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Toca para agitar la esfera', cx, Math.min(h - S * 0.05, cy + R * 1.5));
    }

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (intro < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - intro})`;
      ctx.fillRect(0, 0, w, h);
    }
  };
}
