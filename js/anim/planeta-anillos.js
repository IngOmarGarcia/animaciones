import {
  TAU, clamp, rand, lerp, easeInOut, easeOutCubic, rgbaOf, glow, sparkle, softBackdrop, makeLayer, makeVignette, makeStars, drawStars,
} from './util.js';

// ✏️ Colores del planeta, los anillos y el sol
const BANDS = ['#e9c9a0', '#c98f5f', '#f2ddbd', '#a86b45', '#dcb68a', '#8f5a3a', '#f0d6b0'];
const RING = [235, 215, 185];
const SUN = [255, 225, 170];

// Guion (segundos)
const ARRIVE = 2.4; // el planeta termina de entrar
const SUNRISE = 4.5; // el sol asoma por el borde: momento WOW

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const scale = Math.min(2, Math.max(1, dpr));
  const R = S * 0.3;
  const ringIn = R * 1.3;
  const ringOut = R * 2.25;

  const backdrop = softBackdrop(w, h, dpr, (g) => {
    g.fillStyle = '#02030a';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) {
      g.fillStyle = rgbaOf([[60, 40, 110], [30, 60, 120], [110, 50, 80]][i % 3], rand(0.15, 0.3));
      g.beginPath();
      g.ellipse(rand(0, w), rand(0, h), S * rand(0.3, 0.6), S * rand(0.1, 0.3), rand(0, TAU), 0, TAU);
      g.fill();
    }
  }, 8);
  const stars = makeStars(w, h, Math.round((w * h) / 2400));

  // Planeta: bandas con turbulencia y terminador de luz
  const planet = makeLayer(R * 2 + 4, R * 2 + 4, scale, (g) => {
    g.translate(R + 2, R + 2);
    g.beginPath();
    g.arc(0, 0, R, 0, TAU);
    g.clip();
    let y = -R;
    let i = 0;
    while (y < R) {
      const band = R * rand(0.06, 0.18);
      g.fillStyle = BANDS[i++ % BANDS.length];
      g.fillRect(-R, y, R * 2, band + 1);
      y += band;
    }
    for (let k = 0; k < 40; k++) {
      g.fillStyle = `rgba(${Math.round(rand(120, 250))}, ${Math.round(rand(80, 200))}, ${Math.round(rand(50, 140))}, ${rand(0.08, 0.2)})`;
      g.beginPath();
      g.ellipse(rand(-R, R), rand(-R, R), R * rand(0.1, 0.4), R * rand(0.02, 0.05), 0, 0, TAU);
      g.fill();
    }
    g.fillStyle = 'rgba(180, 90, 60, 0.55)';
    g.beginPath();
    g.ellipse(R * 0.25, R * 0.3, R * 0.14, R * 0.07, 0, 0, TAU);
    g.fill();
    const light = g.createRadialGradient(-R * 0.45, -R * 0.35, R * 0.1, -R * 0.1, 0, R * 1.35);
    light.addColorStop(0, 'rgba(255, 250, 235, 0.25)');
    light.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
    light.addColorStop(0.85, 'rgba(0, 0, 15, 0.6)');
    light.addColorStop(1, 'rgba(0, 0, 15, 0.9)');
    g.fillStyle = light;
    g.fillRect(-R, -R, R * 2, R * 2);
  });

  // Anillos vistos desde arriba; se aplastan con la inclinación de la cámara
  const rings = makeLayer(ringOut * 2, ringOut * 2, scale, (g) => {
    g.translate(ringOut, ringOut);
    for (let r = ringIn; r < ringOut; r += 1.5) {
      const u = (r - ringIn) / (ringOut - ringIn);
      const gap = u > 0.58 && u < 0.64;
      const density = gap ? 0.04 : 0.25 + 0.45 * Math.abs(Math.sin(u * 37)) * (1 - u * 0.4);
      g.strokeStyle = rgbaOf(RING, density);
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(0, 0, r, 0, TAU);
      g.stroke();
    }
  });
  const moons = [
    { r: 2.7, speed: 0.5, size: 0.08, phase: 0.5, color: '#c9ccd4' },
    { r: 3.3, speed: 0.32, size: 0.05, phase: 3, color: '#d9b38c' },
  ];
  const vignette = makeVignette(ctx, w, h, 0.65);

  return (t) => {
    const arrive = easeOutCubic(clamp(t / ARRIVE));
    const cx = lerp(w * 1.2, w * 0.5, arrive);
    const cy = h * 0.55;
    const tilt = 0.24 + 0.06 * Math.sin(t * 0.25);
    const angle = -0.35 + Math.sin(t * 0.2) * 0.04;
    const sunK = easeInOut(clamp((t - SUNRISE + 0.8) / 1.4));
    const wow = t > SUNRISE ? Math.exp(-(t - SUNRISE) * 1.6) : 0;
    const sun = { x: cx + R * lerp(0.2, 0.95, sunK), y: cy - R * lerp(0.2, 0.92, sunK) };

    ctx.drawImage(backdrop, 0, 0, w, h);
    drawStars(ctx, stars, t);

    const drawRingHalf = (front) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      if (front) ctx.rect(-ringOut, 0, ringOut * 2, ringOut);
      else ctx.rect(-ringOut, -ringOut, ringOut * 2, ringOut);
      ctx.clip();
      ctx.scale(1, tilt);
      ctx.drawImage(rings, -ringOut, -ringOut, ringOut * 2, ringOut * 2);
      if (sunK > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.35 * sunK + 0.4 * wow;
        ctx.drawImage(rings, -ringOut, -ringOut, ringOut * 2, ringOut * 2);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    };

    // Lunas detrás del planeta
    const moonPos = moons.map((m) => {
      const a = t * m.speed + m.phase;
      return { m, x: cx + Math.cos(a) * R * m.r * Math.cos(angle), y: cy + Math.sin(a) * R * m.r * tilt + Math.cos(a) * R * m.r * Math.sin(angle), behind: Math.sin(a) < 0 };
    });
    const drawMoon = ({ m, x, y }) => {
      const r = R * m.size;
      const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
      g.addColorStop(0, m.color);
      g.addColorStop(1, '#1a1c24');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    };
    moonPos.filter((p) => p.behind).forEach(drawMoon);

    drawRingHalf(false);
    ctx.drawImage(planet, cx - R - 2, cy - R - 2, R * 2 + 4, R * 2 + 4);
    // Sombra de los anillos sobre el planeta
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0, 0, 10, 0.35)';
    ctx.fillRect(-R, R * 0.12, R * 2, R * 0.09);
    ctx.restore();
    drawRingHalf(true);
    moonPos.filter((p) => !p.behind).forEach(drawMoon);

    // Borde iluminado y amanecer del sol detrás del planeta
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgbaOf(SUN, 0.2 + 0.5 * sunK);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 0.5, -Math.PI * 0.95, -Math.PI * 0.05);
    ctx.stroke();
    if (sunK > 0) {
      glow(ctx, sun.x, sun.y, S * (0.5 + 0.6 * sunK), SUN, 0.5 * sunK + 0.4 * wow);
      glow(ctx, sun.x, sun.y, S * 0.06, [255, 255, 255], sunK);
      const streak = ctx.createLinearGradient(sun.x - S, 0, sun.x + S, 0);
      streak.addColorStop(0, 'rgba(255, 220, 170, 0)');
      streak.addColorStop(0.5, rgbaOf(SUN, 0.55 * sunK));
      streak.addColorStop(1, 'rgba(255, 220, 170, 0)');
      ctx.fillStyle = streak;
      ctx.fillRect(sun.x - S, sun.y - 1.5, S * 2, 3);
      [[0.4, 0.05, [120, 170, 255]], [0.8, 0.03, [255, 170, 120]], [1.4, 0.07, [160, 255, 200]]].forEach(([k, r, color]) => {
        ctx.fillStyle = rgbaOf(color, 0.08 * sunK);
        ctx.beginPath();
        ctx.arc(lerp(sun.x, w - sun.x, k * 0.5), lerp(sun.y, h - sun.y, k * 0.5), S * r, 0, TAU);
        ctx.fill();
      });
    }
    if (t > SUNRISE) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + t * 0.15;
        const tw = 0.5 + 0.5 * Math.sin(t * 2.5 + i * 1.3);
        sparkle(ctx, cx + Math.cos(a) * ringOut * 0.95, cy + Math.sin(a) * ringOut * 0.95 * tilt, S * 0.012 * tw, RING, 0.6 * tw * clamp((t - SUNRISE) / 1));
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  };
}
