import { TAU, clamp, lerp, easeOutCubic } from './util.js';

const HUD = '#69f0ae';
const SHOTS = [0.9, 1.9, 2.9];

export default function create(ctx, w, h) {
  const S = Math.min(w, h * 0.62);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#07140f');
  bg.addColorStop(0.5, '#10271e');
  bg.addColorStop(1, '#1b3a2b');

  const vignette = ctx.createRadialGradient(w / 2, h / 2, S * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.85)');

  const hills = [
    { base: 0.5, color: '#132d22', seed: 0 },
    { base: 0.57, color: '#0c1f17', seed: 2 },
  ].map((layer) => Object.assign(layer, {
    pts: Array.from({ length: 13 }, (_, i) => ({
      x: (i / 12) * w,
      y: h * layer.base + Math.sin(i * 1.7 + layer.seed) * h * 0.03 + Math.sin(i * 0.6 + layer.seed) * h * 0.02,
    })),
  }));

  // Dianas de práctica
  const targets = [
    { x: w * 0.26, y: h * 0.64 },
    { x: w * 0.74, y: h * 0.58 },
    { x: w * 0.5, y: h * 0.73 },
  ].map((p) => ({ ...p, size: S * 0.075 }));
  const rest = { x: w / 2, y: h * 0.45 };

  function aimAt(t) {
    let from = rest;
    for (let i = 0; i < SHOTS.length; i++) {
      if (t < SHOTS[i]) {
        const k = easeOutCubic(clamp((t - (SHOTS[i] - 0.75)) / 0.6));
        return { x: lerp(from.x, targets[i].x, k), y: lerp(from.y, targets[i].y, k) };
      }
      from = targets[i];
    }
    const k = easeOutCubic(clamp((t - SHOTS.at(-1) - 0.5) / 0.8));
    return { x: lerp(from.x, rest.x, k), y: lerp(from.y, rest.y, k) };
  }

  return (t) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(105, 240, 174, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const cell = S * 0.1;
    for (let x = 0; x <= w; x += cell) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += cell) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    for (const hill of hills) {
      ctx.fillStyle = hill.color;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (const p of hill.pts) ctx.lineTo(p.x, p.y);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }

    const fired = SHOTS.filter((s) => t >= s).length;
    targets.forEach((target, i) => {
      const fall = easeOutCubic(clamp((t - SHOTS[i]) / 0.35));
      drawTarget(ctx, target.x, target.y, target.size, Math.cos((fall * Math.PI) / 2));
    });

    // Trazadoras, marcas de impacto y puntos
    let kick = 0;
    targets.forEach((target, i) => {
      const age = t - SHOTS[i];
      if (age < 0) return;
      if (age < 0.12) {
        ctx.globalAlpha = 1 - age / 0.12;
        ctx.strokeStyle = '#fff3bf';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(w * 0.64, h + 10);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }
      if (age < 0.15) kick = Math.max(kick, 1 - age / 0.15);
      if (age < 0.4) {
        const m = S * 0.035;
        ctx.globalAlpha = 1 - age / 0.4;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          ctx.moveTo(target.x + dx * m * 0.45, target.y + dy * m * 0.45);
          ctx.lineTo(target.x + dx * m, target.y + dy * m);
        }
        ctx.stroke();
      }
      if (age < 1.1) {
        ctx.globalAlpha = clamp(1 - (age - 0.6) / 0.5);
        ctx.fillStyle = '#ffd43b';
        ctx.font = `800 ${Math.round(S * 0.05)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('+100', target.x, target.y - target.size * 1.4 - age * S * 0.25);
      }
      ctx.globalAlpha = 1;
    });

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    const aim = aimAt(t);
    drawCrosshair(ctx, aim.x + Math.sin(t * 1.3) * S * 0.006, aim.y + Math.cos(t * 1.7) * S * 0.006, S * 0.09, kick);

    const radar = S * 0.13;
    const blips = targets
      .filter((_, i) => t < SHOTS[i])
      .map((p) => ({ x: (p.x / w - 0.5) * 1.4, y: (p.y / h - 0.55) * 1.4 }));
    drawRadar(ctx, radar + 16, h - radar - 18, radar, t, blips);

    ctx.fillStyle = HUD;
    ctx.textAlign = 'right';
    ctx.font = `700 ${Math.round(S * 0.055)}px system-ui, sans-serif`;
    ctx.fillText(`${30 - fired} / 90`, w - 16, h - 22);
    ctx.font = `600 ${Math.round(S * 0.038)}px system-ui, sans-serif`;
    ctx.fillText(`OBJETIVOS ${fired}/3`, w - 16, h - 22 - S * 0.07);
  };
}

// Diana sobre un poste; `face` (1 → 0) la hace caer hacia atrás.
function drawTarget(ctx, x, y, size, face) {
  ctx.fillStyle = '#5c4a32';
  ctx.fillRect(x - size * 0.06, y, size * 0.12, size * 1.3);
  ctx.save();
  ctx.translate(x, y + size);
  ctx.scale(1, Math.max(face, 0.02));
  ctx.translate(0, -size);
  ['#f8f9fa', '#e03131', '#f8f9fa', '#e03131', '#ffd43b'].forEach((color, k) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, size * (1 - k * 0.19), 0, TAU);
    ctx.fill();
  });
  ctx.restore();
}

function drawCrosshair(ctx, x, y, r, kick) {
  const gap = r * (0.28 + 0.25 * kick);
  ctx.save();
  ctx.strokeStyle = HUD;
  ctx.lineWidth = 2;
  ctx.shadowColor = HUD;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    ctx.moveTo(x + dx * gap, y + dy * gap);
    ctx.lineTo(x + dx * r * 1.35, y + dy * r * 1.35);
  }
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = HUD;
  ctx.beginPath();
  ctx.arc(x, y, 2.2, 0, TAU);
  ctx.fill();
}

// Radar con barrido; `blips` en coordenadas relativas (-1..1).
function drawRadar(ctx, x, y, r, t, blips) {
  ctx.fillStyle = 'rgba(5, 20, 14, 0.75)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(105, 240, 174, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.moveTo(x + r * 0.5, y);
  ctx.arc(x, y, r * 0.5, 0, TAU);
  ctx.stroke();

  const a = t * 2.5;
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = HUD;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r, a - 0.6, a);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#ff6b6b';
  for (const b of blips) {
    ctx.beginPath();
    ctx.arc(x + b.x * r, y + b.y * r, 2.5, 0, TAU);
    ctx.fill();
  }
}
