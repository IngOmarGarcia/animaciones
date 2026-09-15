import { TAU, clamp, rand, pick, lerp, easeOutCubic, easeOutBack } from './util.js';

const OPEN = 2;
const GEM_COLORS = ['#22d3ee', '#e879f9', '#4ade80', '#f87171'];

export default function create(ctx, w, h) {
  const S = Math.min(w, h * 0.62);
  const cx = w / 2;
  const floorY = h * 0.78;
  const cw = S * 0.56;
  const ch = S * 0.3;

  const bg = ctx.createRadialGradient(cx, floorY - ch, 0, cx, floorY - ch, Math.max(w, h) * 0.8);
  bg.addColorStop(0, '#3b1d6b');
  bg.addColorStop(1, '#0c0618');

  const loot = Array.from({ length: 40 }, () => ({
    coin: Math.random() < 0.65, x: 0, y: 0, vx: 0, vy: 0, floor: 0, delay: 0, landed: false,
    rot: rand(0, TAU), spin: rand(-6, 6), color: pick(GEM_COLORS), size: S * rand(0.03, 0.045),
  }));
  const sparkles = Array.from({ length: 30 }, () => ({
    x: rand(0, w), y: rand(0, floorY), phase: rand(0, TAU), speed: rand(2, 5), size: rand(3, 7),
  }));
  let launched = false;

  return (t, dt) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const after = t - OPEN;
    if (after > 0) {
      const k = easeOutCubic(clamp(after / 0.5));
      ctx.save();
      ctx.translate(cx, floorY - ch * 0.62);
      ctx.rotate(t * 0.3);
      const far = Math.max(w, h);
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = i % 2 ? `rgba(255, 214, 90, ${0.12 * k})` : `rgba(200, 120, 255, ${0.08 * k})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, far, (i * TAU) / 16, (i * TAU) / 16 + TAU / 32);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.fillStyle = '#0a0514';
    ctx.fillRect(0, floorY, w, h - floorY);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, floorY + 4, cw * 0.62, ch * 0.12, 0, 0, TAU);
    ctx.fill();

    // Cae, tiembla y se abre
    const bottom = lerp(-ch * 2, floorY, easeOutBack(clamp(t / 0.7)));
    const shake = t > 0.9 && t < OPEN ? (t - 0.9) / (OPEN - 0.9) : 0;
    const open = after > 0 ? easeOutBack(clamp(after / 0.45)) : 0;
    drawChest(ctx, cx + Math.sin(t * 60) * S * 0.012 * shake, bottom, cw, ch, open, after > 0 ? 1 : shake);

    if (after > 0) {
      if (!launched) {
        launched = true;
        for (const l of loot) {
          l.x = cx + rand(-cw * 0.25, cw * 0.25);
          l.y = floorY - ch * 0.62;
          l.vx = rand(-0.55, 0.55) * S;
          l.vy = -rand(0.9, 1.6) * S;
          l.floor = floorY + rand(4, h * 0.07);
          l.delay = rand(0, 0.6);
        }
      }
      for (const l of loot) {
        if (after < l.delay) continue;
        if (!l.landed) {
          l.vy += S * 2.2 * dt;
          l.x += l.vx * dt;
          l.y += l.vy * dt;
          l.rot += l.spin * dt;
          if (l.y > l.floor && l.vy > 0) {
            l.y = l.floor;
            l.vy *= -0.35;
            l.vx *= 0.6;
            if (Math.abs(l.vy) < S * 0.1) l.landed = true;
          }
        }
        if (l.coin) drawCoin(ctx, l.x, l.y, l.size, l.rot);
        else drawGem(ctx, l.x, l.y, l.size, l.rot, l.color);
      }

      ctx.fillStyle = '#fff3bf';
      for (const s of sparkles) {
        const a = Math.max(0, Math.sin(t * s.speed + s.phase));
        if (a < 0.05) continue;
        ctx.globalAlpha = a;
        ctx.fillRect(s.x - s.size / 2, s.y - 0.75, s.size, 1.5);
        ctx.fillRect(s.x - 0.75, s.y - s.size / 2, 1.5, s.size);
      }
      ctx.globalAlpha = 1;
    }

    if (after > 0.4) {
      const pop = easeOutBack(clamp((after - 0.4) / 0.5));
      ctx.save();
      ctx.translate(cx, h * 0.92);
      ctx.font = `900 ${Math.round(S * 0.085)}px system-ui, sans-serif`;
      const fit = Math.min(1, (w * 0.9) / ctx.measureText('★ LEGENDARIO ★').width);
      ctx.scale(pop * fit, pop * fit);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#f59f00';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ffd43b';
      ctx.fillText('★ LEGENDARIO ★', 0, 0);
      ctx.restore();
    }
  };
}

// Cofre de madera con bandas doradas; `bottom` es la base y `open` (0..1) levanta la tapa.
function drawChest(ctx, x, bottom, cw, ch, open, glow) {
  const bodyH = ch * 0.62;
  const top = bottom - bodyH;

  if (glow > 0) {
    const light = ctx.createRadialGradient(x, top, 0, x, top, cw * (0.4 + 0.8 * open));
    light.addColorStop(0, `rgba(255, 236, 153, ${0.9 * glow})`);
    light.addColorStop(1, 'rgba(255, 236, 153, 0)');
    ctx.fillStyle = light;
    ctx.fillRect(x - cw * 1.5, top - cw * 1.5, cw * 3, cw * 3);
  }

  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(x - cw / 2, top, cw, bodyH);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  for (let i = 1; i < 4; i++) ctx.fillRect(x - cw / 2, top + (bodyH * i) / 4, cw, 2);
  ctx.fillStyle = '#fcc419';
  ctx.fillRect(x - cw / 2, top, cw, bodyH * 0.1);
  ctx.fillRect(x - cw * 0.36, top, cw * 0.08, bodyH);
  ctx.fillRect(x + cw * 0.28, top, cw * 0.08, bodyH);
  ctx.strokeStyle = '#5c3a1a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - cw / 2, top, cw, bodyH);
  ctx.fillStyle = '#ffd43b';
  ctx.fillRect(x - cw * 0.06, top + bodyH * 0.05, cw * 0.12, bodyH * 0.3);
  ctx.fillStyle = '#212529';
  ctx.fillRect(x - cw * 0.012, top + bodyH * 0.14, cw * 0.024, bodyH * 0.1);

  ctx.save();
  ctx.translate(x, top - ch * 0.25 * open);
  ctx.scale(1, 1 - 0.55 * open);
  ctx.beginPath();
  ctx.moveTo(-cw / 2, 0);
  ctx.lineTo(-cw / 2, -ch * 0.2);
  ctx.quadraticCurveTo(0, -ch * 0.62, cw / 2, -ch * 0.2);
  ctx.lineTo(cw / 2, 0);
  ctx.closePath();
  ctx.fillStyle = '#a0692f';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#fcc419';
  ctx.fillRect(-cw * 0.36, -ch * 0.5, cw * 0.08, ch * 0.5);
  ctx.fillRect(cw * 0.28, -ch * 0.5, cw * 0.08, ch * 0.5);
  ctx.fillRect(-cw / 2, -ch * 0.06, cw, ch * 0.06);
  ctx.restore();
  ctx.strokeStyle = '#5c3a1a';
  ctx.stroke();
  ctx.restore();

  if (glow > 0 && open === 0) {
    ctx.strokeStyle = `rgba(255, 240, 150, ${glow})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - cw / 2, top);
    ctx.lineTo(x + cw / 2, top);
    ctx.stroke();
  }
}

function drawCoin(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(Math.max(0.15, Math.abs(Math.cos(rot))), 1);
  ctx.fillStyle = '#f59f00';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffd43b';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.75, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawGem(ctx, x, y, r, rot, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot * 0.3);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.8, -r * 0.2);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.8, -r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.3, -r * 0.2);
  ctx.lineTo(-r * 0.3, -r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
