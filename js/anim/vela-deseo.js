import {
  TAU, clamp, rand, lerp, easeInOut, easeOutCubic, rgbaOf, glow, sparkle, softBackdrop, makeVignette,
} from './util.js';

// ✏️ Colores de la llama, la cera y la magia del deseo
const FLAME = [255, 190, 90];
const WAX = '#f4e4d4';
const MAGIC = [255, 215, 140];

// Guion en segundos desde el soplido
const OUT = 0.5; // se apaga la llama
const MAGIC_AT = 1.6; // el humo se vuelve chispas doradas: momento WOW
const REVEAL = 2.3;

export default function create(ctx, w, h, dpr = 1, stage) {
  const S = Math.min(w, h * 0.62);
  const cx = w / 2;
  const candleTop = h * 0.56;
  const cw = S * 0.12;
  const autoBlow = stage && !stage.auto ? 6 : 2.5;
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const room = softBackdrop(w, h, dpr, (g) => {
    const base = g.createRadialGradient(cx, candleTop, 0, cx, candleTop, Math.max(w, h));
    base.addColorStop(0, '#3a1f14');
    base.addColorStop(0.5, '#140a08');
    base.addColorStop(1, '#030101');
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {
      g.fillStyle = `rgba(255, ${Math.round(rand(140, 200))}, 90, ${rand(0.12, 0.3)})`;
      g.beginPath();
      g.arc(rand(0, w), rand(0, h * 0.7), S * rand(0.03, 0.1), 0, TAU);
      g.fill();
    }
  });
  const vignette = makeVignette(ctx, w, h, 0.75, cx, candleTop);
  const drips = Array.from({ length: 5 }, (_, i) => ({ x: (i / 4 - 0.5) * cw * 0.8, len: rand(0.05, 0.2) * S }));
  const smoke = Array.from({ length: calm ? 14 : 34 }, (_, i) => ({ delay: i * 0.05, seed: rand(0, 100), size: rand(0.02, 0.05) }));
  const stars = Array.from({ length: calm ? 20 : 50 }, () => ({ a: rand(0, TAU), speed: rand(0.6, 1.4), r: rand(0.2, 1), size: rand(0.6, 1.6), phase: rand(0, TAU) }));

  let blowAt = null;

  return (t) => {
    if (blowAt === null) {
      const tapped = stage && stage.taps.length > 0 && t > 0.3;
      if (tapped || t >= autoBlow) blowAt = t;
    }
    if (stage) stage.taps.length = 0;
    const q = blowAt === null ? -1 : t - blowAt;
    if (stage && q >= REVEAL) stage.revealed = true;

    const intro = clamp(t / 1.2);
    const lean = q < 0 ? Math.sin(t * 1.7) * 0.05 : clamp(q / OUT) * 0.9;
    const alive = q < 0 ? 1 : 1 - easeInOut(clamp(q / OUT));
    const flick = 0.9 + 0.1 * Math.sin(t * 17) * Math.sin(t * 7.3);
    const magic = q >= MAGIC_AT ? easeOutCubic(clamp((q - MAGIC_AT) / 1)) : 0;
    const wow = q >= MAGIC_AT ? Math.exp(-(q - MAGIC_AT) * 1.8) : 0;
    const wickY = candleTop - S * 0.01;

    ctx.drawImage(room, 0, 0, w, h);
    ctx.globalAlpha = 0.35 + 0.65 * alive;
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, cx, wickY - S * 0.06, S * 1.1 * flick, FLAME, 0.35 * intro);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Plato y vela con cera derretida y luz de la llama
    ctx.fillStyle = '#2a1a12';
    ctx.beginPath();
    ctx.ellipse(cx, h * 0.86, S * 0.28, S * 0.05, 0, 0, TAU);
    ctx.fill();
    const body = ctx.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0);
    body.addColorStop(0, '#b9a48f');
    body.addColorStop(0.35, WAX);
    body.addColorStop(1, '#8d7867');
    ctx.fillStyle = body;
    ctx.fillRect(cx - cw / 2, candleTop, cw, h * 0.86 - candleTop);
    ctx.fillStyle = 'rgba(255, 190, 120, 0.25)';
    ctx.fillRect(cx - cw / 2, candleTop, cw, S * 0.08 * (0.4 + 0.6 * alive));
    ctx.fillStyle = WAX;
    ctx.beginPath();
    ctx.ellipse(cx, candleTop, cw / 2, cw * 0.14, 0, 0, TAU);
    ctx.fill();
    for (const d of drips) {
      ctx.fillStyle = '#efdcc9';
      ctx.beginPath();
      ctx.moveTo(cx + d.x - cw * 0.06, candleTop);
      ctx.lineTo(cx + d.x - cw * 0.05, candleTop + d.len);
      ctx.arc(cx + d.x, candleTop + d.len, cw * 0.05, Math.PI, 0, true);
      ctx.lineTo(cx + d.x + cw * 0.06, candleTop);
      ctx.fill();
    }
    ctx.strokeStyle = '#1b120c';
    ctx.lineWidth = Math.max(1.5, S * 0.006);
    ctx.beginPath();
    ctx.moveTo(cx, candleTop);
    ctx.quadraticCurveTo(cx + S * 0.004, wickY - S * 0.01, cx + S * 0.002, wickY - S * 0.025);
    ctx.stroke();

    // Llama en capas: halo, cuerpo naranja, núcleo claro y base azul
    if (alive > 0.01) {
      const fh = S * 0.13 * flick * alive;
      const fw = S * 0.035 * alive;
      ctx.save();
      ctx.translate(cx, wickY - S * 0.02);
      ctx.rotate(lean);
      ctx.globalCompositeOperation = 'lighter';
      for (const [scaleW, scaleH, color, alpha] of [[1.8, 1.3, FLAME, 0.25], [1, 1, [255, 150, 60], 0.9], [0.55, 0.62, [255, 245, 210], 1], [0.4, 0.2, [90, 140, 255], 0.6]]) {
        const hh = fh * scaleH;
        const ww = fw * scaleW;
        ctx.fillStyle = rgbaOf(color, alpha * intro);
        ctx.beginPath();
        ctx.moveTo(0, -hh);
        ctx.bezierCurveTo(ww * 0.9, -hh * 0.45, ww, hh * 0.1, 0, hh * 0.15);
        ctx.bezierCurveTo(-ww, hh * 0.1, -ww * 0.9, -hh * 0.45, 0, -hh);
        ctx.fill();
      }
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    } else if (q < MAGIC_AT + 2) {
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, cx + S * 0.002, wickY - S * 0.025, S * 0.015, [255, 90, 40], 0.8 * clamp(1 - (q - OUT) / 2));
      ctx.globalCompositeOperation = 'source-over';
    }

    // Humo que sube en espiral y se convierte en chispas doradas
    if (q > OUT - 0.2) {
      for (const puff of smoke) {
        const life = q - OUT + 0.2 - puff.delay;
        if (life <= 0) continue;
        const rise = life * S * 0.25;
        const x = cx + Math.sin(life * 2.2 + puff.seed) * S * 0.04 * (1 + life) + Math.sin(puff.seed) * life * S * 0.02;
        const y = wickY - S * 0.03 - rise;
        const fade = clamp(1 - life / 2.4) * (1 - magic);
        const r = S * puff.size * (1 + life * 0.8);
        if (fade > 0.01) {
          ctx.fillStyle = `rgba(200, 190, 185, ${0.12 * fade})`;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, TAU);
          ctx.fill();
        }
      }
    }
    if (magic > 0) {
      ctx.globalCompositeOperation = 'lighter';
      const center = { x: cx, y: wickY - S * 0.45 };
      glow(ctx, center.x, center.y, S * (0.5 + 0.8 * wow), MAGIC, 0.25 * magic + 0.5 * wow);
      for (const s of stars) {
        const a = s.a + q * s.speed;
        const r = S * s.r * 0.45 * magic;
        const tw = 0.5 + 0.5 * Math.sin(t * 5 + s.phase);
        sparkle(ctx, center.x + Math.cos(a) * r, center.y + Math.sin(a) * r * 0.8 - (1 - magic) * S * 0.1, S * 0.012 * s.size * (0.6 + tw), MAGIC, magic * tw);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    if (q < 0 && stage && !stage.auto && t > 1) {
      ctx.fillStyle = `rgba(255, 235, 210, ${clamp((t - 1) / 0.6) * (0.6 + 0.4 * Math.sin(t * 2.5))})`;
      ctx.font = `600 ${Math.round(S * 0.048)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Pide un deseo y toca para soplar', cx, h * 0.94);
    }

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (intro < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - intro})`;
      ctx.fillRect(0, 0, w, h);
    }
  };
}
