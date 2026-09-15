import {
  TAU, clamp, rand, lerp, easeInOut, rgbaOf, glow, sparkle, softBackdrop, makeLayer, makeVignette, makeStars, drawStars,
} from './util.js';

// ✏️ Colores del cielo y de la luz de luna
const SKY_TOP = '#02040f';
const SKY_LOW = '#14254a';
const MOONLIGHT = [200, 220, 255];

// Guion (segundos)
const RISE_END = 3; // la luna termina de salir
const FULL = 4.6; // luna llena: momento WOW

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const scale = Math.min(2, Math.max(1, dpr));
  const R = Math.round(S * 0.27);
  const horizon = h * 0.78;

  const sky = softBackdrop(w, h, dpr, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, SKY_TOP);
    grad.addColorStop(0.7, SKY_LOW);
    grad.addColorStop(1, '#27365e');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      g.fillStyle = `rgba(${Math.round(rand(60, 120))}, ${Math.round(rand(70, 110))}, ${Math.round(rand(150, 220))}, ${rand(0.08, 0.2)})`;
      g.beginPath();
      g.ellipse(rand(0, w), rand(0, h * 0.6), S * rand(0.3, 0.7), S * rand(0.1, 0.25), rand(-0.5, 0.5), 0, TAU);
      g.fill();
    }
  });
  const stars = makeStars(w, horizon, Math.round((w * h) / 2600));

  // Textura de la luna: mares, cráteres con luz y sombra, repetida para girar sin cortes
  const texW = Math.ceil(Math.PI * R * 2);
  const texH = R * 2;
  const tex = makeLayer(texW * 2, texH, scale, (g) => {
    const drawOnce = (ox) => {
      const base = g.createLinearGradient(0, 0, 0, texH);
      base.addColorStop(0, '#b9bdc7');
      base.addColorStop(0.5, '#d4d7de');
      base.addColorStop(1, '#aeb2bd');
      g.fillStyle = base;
      g.fillRect(ox, 0, texW, texH);
    };
    drawOnce(0);
    drawOnce(texW);
    const marks = [];
    for (let i = 0; i < 14; i++) marks.push({ kind: 'sea', x: rand(0, texW), y: rand(texH * 0.2, texH * 0.8), rx: R * rand(0.2, 0.55), ry: R * rand(0.12, 0.35) });
    for (let i = 0; i < 110; i++) marks.push({ kind: 'crater', x: rand(0, texW), y: rand(texH * 0.05, texH * 0.95), r: R * rand(0.015, 0.09) });
    for (const ox of [0, texW, -texW, texW * 2]) {
      for (const m of marks) {
        if (m.kind === 'sea') {
          g.fillStyle = 'rgba(95, 100, 118, 0.22)';
          for (let k = 0; k < 4; k++) {
            g.beginPath();
            g.ellipse(m.x + ox + rand(-m.rx, m.rx) * 0.3, m.y + rand(-m.ry, m.ry) * 0.3, m.rx * rand(0.6, 1), m.ry * rand(0.6, 1), rand(0, 1), 0, TAU);
            g.fill();
          }
        } else {
          const x = m.x + ox;
          g.fillStyle = 'rgba(80, 84, 98, 0.35)';
          g.beginPath();
          g.arc(x, m.y, m.r, 0, TAU);
          g.fill();
          g.strokeStyle = 'rgba(245, 247, 255, 0.35)';
          g.lineWidth = Math.max(0.6, m.r * 0.25);
          g.beginPath();
          g.arc(x, m.y, m.r, 0.2, Math.PI * 0.9);
          g.stroke();
          g.strokeStyle = 'rgba(40, 42, 55, 0.35)';
          g.beginPath();
          g.arc(x, m.y, m.r, Math.PI * 1.1, Math.PI * 1.9);
          g.stroke();
        }
      }
    }
  });

  // Esfera: cada franja horizontal toma la textura comprimida hacia los bordes
  const moon = document.createElement('canvas');
  moon.width = Math.ceil((R * 2 + 4) * scale);
  moon.height = moon.width;
  const m = moon.getContext('2d');
  m.scale(scale, scale);
  const renderMoon = (spin) => {
    m.clearRect(0, 0, R * 2 + 4, R * 2 + 4);
    m.save();
    m.beginPath();
    m.arc(R + 2, R + 2, R, 0, TAU);
    m.clip();
    const step = 3;
    const segs = 6;
    for (let yy = -R; yy < R; yy += step) {
      const half = Math.sqrt(Math.max(0, R * R - (yy + step / 2) ** 2));
      if (half < 1) continue;
      for (let k = 0; k < segs; k++) {
        const x0 = -half + (k * 2 * half) / segs;
        const x1 = x0 + (2 * half) / segs;
        const l0 = Math.asin(clamp(x0 / half, -1, 1));
        const l1 = Math.asin(clamp(x1 / half, -1, 1));
        const u0 = ((((spin + ((l0 + Math.PI / 2) / Math.PI) * (texW / 2)) % texW) + texW) % texW);
        const du = ((l1 - l0) / Math.PI) * (texW / 2);
        m.drawImage(tex, u0 * scale, (yy + R) * scale, Math.max(0.5, du * scale), step * scale, x0 + R + 2 - 0.3, yy + R + 2, x1 - x0 + 0.6, step + 0.4);
      }
    }
    m.restore();
  };

  const mountains = makeLayer(w, h, scale, (g) => {
    [[0.07, '#0b1326'], [0.035, '#060b18']].forEach(([lift, color], layer) => {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, horizon + 2);
      for (let x = 0; x <= w + 12; x += 12) {
        const y = horizon - h * lift * (0.5 + 0.5 * Math.sin(x * 0.011 + layer * 2)) - h * lift * 0.4 * Math.sin(x * 0.033 + layer);
        g.lineTo(x, y);
      }
      g.lineTo(w, horizon + 2);
      g.closePath();
      g.fill();
    });
    const water = g.createLinearGradient(0, horizon, 0, h);
    water.addColorStop(0, '#0d1834');
    water.addColorStop(1, '#03060e');
    g.fillStyle = water;
    g.fillRect(0, horizon, w, h - horizon);
  });

  const clouds = Array.from({ length: 5 }, (_, i) => ({
    x: rand(-w * 0.3, w), y: rand(h * 0.2, h * 0.62), size: S * rand(0.25, 0.5), speed: rand(6, 14) * (i % 2 ? 1 : 0.6), front: i % 2 === 0,
  }));
  const cloudSprite = softBackdrop(S, S * 0.5, dpr, (g) => {
    for (let k = 0; k < 10; k++) {
      g.fillStyle = `rgba(160, 175, 210, ${rand(0.25, 0.45)})`;
      g.beginPath();
      g.ellipse(S * rand(0.25, 0.75), S * rand(0.2, 0.3), S * rand(0.12, 0.24), S * rand(0.06, 0.1), 0, 0, TAU);
      g.fill();
    }
  }, 4);
  const shootingStar = { at: FULL + 0.15 };
  const vignette = makeVignette(ctx, w, h, 0.6, w / 2, h * 0.45);

  return (t) => {
    const rise = easeInOut(clamp(t / RISE_END));
    const cx = w / 2;
    const cy = lerp(horizon + R * 1.2, h * 0.46, rise);
    const phase = lerp(0.12, 1, easeInOut(clamp((t - 0.6) / (FULL - 0.6))));
    const full = t > FULL ? Math.exp(-(t - FULL) * 1.8) : 0;
    const intro = clamp(t / 1.2);

    ctx.drawImage(sky, 0, 0, w, h);
    drawStars(ctx, stars, t);

    // Halo de luz de luna, crece con la fase
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, cx, cy, R * (3 + 1.5 * full), MOONLIGHT, (0.1 + 0.25 * phase) * intro + 0.35 * full);
    ctx.globalCompositeOperation = 'source-over';

    for (const c of clouds) if (!c.front) drawCloud(c, t, cy, phase);

    renderMoon(t * 9);
    ctx.drawImage(moon, cx - R - 2, cy - R - 2, R * 2 + 4, R * 2 + 4);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.clip();
    const limb = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.25, R * 0.2, cx, cy, R);
    limb.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    limb.addColorStop(0.8, 'rgba(0, 0, 20, 0.1)');
    limb.addColorStop(1, 'rgba(0, 0, 20, 0.45)');
    ctx.fillStyle = limb;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    // Sombra de la fase con borde suave (tres capas)
    const k = Math.cos(phase * Math.PI);
    for (const [grow, alpha] of [[1.06, 0.3], [1.02, 0.35], [1, 0.6]]) {
      ctx.fillStyle = `rgba(4, 7, 18, ${alpha * (1 - full * 0.3)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.02, Math.PI / 2, (Math.PI * 3) / 2);
      ctx.ellipse(cx, cy, Math.max(0.1, Math.abs(k) * R * grow), R * 1.02, 0, -Math.PI / 2, Math.PI / 2, k < 0);
      ctx.fill();
    }
    ctx.restore();

    ctx.globalCompositeOperation = 'lighter';
    const rim = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.12);
    rim.addColorStop(0, rgbaOf(MOONLIGHT, 0));
    rim.addColorStop(0.45, rgbaOf(MOONLIGHT, (0.12 + 0.25 * phase) * rise + 0.3 * full));
    rim.addColorStop(1, rgbaOf(MOONLIGHT, 0));
    ctx.fillStyle = rim;
    ctx.fillRect(cx - R * 1.2, cy - R * 1.2, R * 2.4, R * 2.4);
    if (full > 0.01) {
      const q = 1 - full;
      ctx.strokeStyle = rgbaOf([220, 235, 255], 0.5 * full);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R * (1.1 + q * 2.4), 0, TAU);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    for (const c of clouds) if (c.front) drawCloud(c, t, cy, phase);

    ctx.drawImage(mountains, 0, 0, w, h);

    // Reflejo de la luna en el agua
    ctx.globalCompositeOperation = 'lighter';
    const reflect = (0.25 + 0.5 * phase) * rise;
    for (let i = 0; i < 16; i++) {
      const y = horizon + 4 + i * ((h - horizon) / 16);
      const width = R * (0.3 + i * 0.07) * (0.7 + 0.3 * Math.sin(t * 2.3 + i * 1.7));
      ctx.fillStyle = rgbaOf(MOONLIGHT, reflect * (0.35 - i * 0.018));
      ctx.fillRect(cx - width / 2 + Math.sin(t * 1.3 + i) * 6, y, width, 2);
    }

    // Estrella fugaz al llegar a luna llena
    const shot = t - shootingStar.at;
    if (shot > 0 && shot < 1.1) {
      const q = shot / 1.1;
      const x = lerp(w * 0.95, w * 0.1, q);
      const y = lerp(h * 0.08, h * 0.3, q);
      const tail = ctx.createLinearGradient(x, y, x + S * 0.35, y - S * 0.1);
      tail.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      tail.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.strokeStyle = tail;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + S * 0.35, y - S * 0.1);
      ctx.stroke();
      sparkle(ctx, x, y, S * 0.02, [220, 235, 255], Math.sin(q * Math.PI));
    }
    if (t > FULL) {
      for (let i = 0; i < 6; i++) {
        const a = i * 1.047 + t * 0.2;
        const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 2);
        sparkle(ctx, cx + Math.cos(a) * R * 1.35, cy + Math.sin(a) * R * 1.35, S * 0.012 * tw, MOONLIGHT, 0.7 * tw * clamp((t - FULL) / 0.8));
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (intro < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - intro})`;
      ctx.fillRect(0, 0, w, h);
    }
  };

  function drawCloud(c, t, moonY, phase) {
    const x = ((c.x + t * c.speed) % (w + c.size * 2)) - c.size;
    const lit = clamp(1 - Math.abs(c.y - moonY) / (h * 0.5));
    ctx.globalAlpha = (c.front ? 0.55 : 0.35) * (0.4 + 0.6 * lit * phase);
    ctx.drawImage(cloudSprite, x - c.size / 2, c.y - c.size * 0.25, c.size, c.size * 0.5);
    ctx.globalAlpha = 1;
  }
}
