import { TAU, clamp, rand, pick, easeOutCubic, easeOutBack } from './util.js';

const FULL = 2.3;
const PIXEL_COLORS = ['#ffd43b', '#69db7c', '#4dabf7', '#f783ac', '#ffffff'];

export default function create(ctx, w, h) {
  const S = Math.min(w, h * 0.62);
  const cx = w / 2;
  const titleY = h * 0.46;
  const barY = h * 0.66;
  const barW = S * 0.78;
  const barH = S * 0.07;
  const barX = cx - barW / 2;
  const px = Math.max(3, Math.round(S * 0.012));

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0b0d1f');
  bg.addColorStop(1, '#1b1f4a');

  const snap = (v) => Math.round(v / px) * px;
  const pixels = Array.from({ length: 60 }, () => ({
    x: snap(rand(0, w)), y: snap(rand(0, h)), phase: rand(0, TAU), color: pick(PIXEL_COLORS),
  }));
  const burst = Array.from({ length: 70 }, () => ({
    a: rand(0, TAU), speed: rand(0.3, 1) * S, size: px * (Math.random() < 0.3 ? 2 : 1), color: pick(PIXEL_COLORS),
  }));

  return (t) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    for (const p of pixels) {
      ctx.globalAlpha = 0.2 + 0.5 * Math.max(0, Math.sin(t * 2 + p.phase));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, px, px);
    }
    ctx.globalAlpha = 1;

    const after = t - FULL;
    if (after > 0) {
      const k = easeOutCubic(clamp(after / 0.6));
      ctx.save();
      ctx.translate(cx, titleY);
      ctx.rotate(t * 0.4);
      ctx.fillStyle = `rgba(255, 212, 59, ${0.08 * k})`;
      const far = Math.max(w, h);
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, far, (i * TAU) / 12, (i * TAU) / 12 + TAU / 24);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Barra de experiencia por segmentos
    const fill = easeOutCubic(clamp((t - 0.4) / (FULL - 0.4)));
    ctx.fillStyle = '#000000';
    ctx.fillRect(barX - px, barY - px, barW + px * 2, barH + px * 2);
    ctx.fillStyle = '#2b2f5c';
    ctx.fillRect(barX, barY, barW, barH);
    const segW = barW / 20;
    const segments = Math.floor(fill * 20);
    for (let i = 0; i < segments; i++) {
      if (after > 0) ctx.fillStyle = Math.sin(t * 10) > 0 ? '#ffe066' : '#fab005';
      else ctx.fillStyle = i % 2 ? '#51cf66' : '#69db7c';
      ctx.fillRect(barX + i * segW + 1, barY + 1, segW - 2, barH - 2);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(barX, barY, segments * segW, barH * 0.3);

    ctx.font = `800 ${Math.round(S * 0.045)}px "Courier New", monospace`;
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#e9ecef';
    ctx.textAlign = 'left';
    ctx.fillText(after > 0 ? 'NIVEL 26' : 'NIVEL 25', barX, barY - px * 3);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(fill * 10000)} / 10000 XP`, barX + barW, barY - px * 3);

    // +XP que suben mientras se llena
    ctx.textAlign = 'center';
    ctx.fillStyle = '#69db7c';
    for (let k = 0; k < 6; k++) {
      const age = t - (0.5 + k * 0.3);
      if (age < 0 || age > 0.8) continue;
      ctx.globalAlpha = 1 - age / 0.8;
      ctx.fillText('+250', barX + barW * (0.1 + k * 0.15), barY - px * 9 - age * S * 0.1);
    }
    ctx.globalAlpha = 1;

    if (after > 0) {
      if (after < 0.3) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * (1 - after / 0.3)})`;
        ctx.fillRect(0, 0, w, h);
      }
      const fade = clamp(1 - after / 1.6);
      if (fade > 0) {
        ctx.globalAlpha = fade;
        const spread = easeOutCubic(clamp(after / 1.2));
        for (const p of burst) {
          ctx.fillStyle = p.color;
          ctx.fillRect(snap(cx + Math.cos(p.a) * p.speed * spread), snap(barY + barH / 2 + Math.sin(p.a) * p.speed * spread), p.size, p.size);
        }
        ctx.globalAlpha = 1;
      }

      const size = Math.round(S * 0.17);
      ctx.save();
      ctx.translate(cx, titleY);
      ctx.font = `900 ${size}px "Arial Black", Impact, system-ui, sans-serif`;
      const fit = Math.min(1, (w * 0.88) / ctx.measureText('LEVEL UP!').width);
      const pop = easeOutBack(clamp(after / 0.5));
      ctx.scale(pop * fit, pop * fit);
      ctx.rotate(Math.sin(t * 3) * 0.03);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#7048e8';
      ctx.fillText('LEVEL UP!', px * 2, px * 2);
      ctx.lineWidth = Math.max(3, px);
      ctx.strokeStyle = '#1b1f4a';
      ctx.strokeText('LEVEL UP!', 0, 0);
      const gold = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
      gold.addColorStop(0, '#fff3bf');
      gold.addColorStop(0.5, '#ffd43b');
      gold.addColorStop(1, '#f08c00');
      ctx.fillStyle = gold;
      ctx.fillText('LEVEL UP!', 0, 0);
      ctx.restore();
    }
  };
}
