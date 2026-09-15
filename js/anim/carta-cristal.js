import {
  TAU, clamp, rand, lerp, easeOutCubic, easeOutBack, easeInOut, rgbaOf, glow, sparkle, heartPath, softBackdrop, makeVignette,
} from './util.js';

// ✏️ Colores del cristal, el sello y la tinta
const GLASS = [255, 190, 220];
const SEAL = '#c2185b';
const INK = [214, 160, 60];
const PAPER_TOP = '#fff8ec';
const PAPER_BOTTOM = '#f3e2c6';

// Guion en segundos desde que se toca la carta
const CRACK = 0.35; // se rompe el sello
const FLAP = 0.9; // termina de abrirse la solapa
const OUT = 2; // la carta terminó de salir: momento WOW
const REVEAL = 2.3; // aparece el mensaje

export default function create(ctx, w, h, dpr = 1, stage) {
  const S = Math.min(w, h * 0.62);
  const cx = w / 2;
  const cy = h * 0.62;
  const E = S * 0.78;
  const EH = E * 0.62;
  const autoOpen = stage && !stage.auto ? 6 : 2.5;
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const backdrop = softBackdrop(w, h, dpr, (g) => {
    const base = g.createRadialGradient(cx, h * 0.5, 0, cx, h * 0.5, Math.max(w, h) * 0.9);
    base.addColorStop(0, '#3b1450');
    base.addColorStop(0.6, '#150720');
    base.addColorStop(1, '#05020a');
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 24; i++) {
      g.fillStyle = Math.random() < 0.5 ? `rgba(255, 150, 210, ${rand(0.12, 0.35)})` : `rgba(190, 160, 255, ${rand(0.1, 0.3)})`;
      g.beginPath();
      g.arc(rand(0, w), rand(0, h), S * rand(0.04, 0.12), 0, TAU);
      g.fill();
    }
  });
  const vignette = makeVignette(ctx, w, h, 0.7, cx, h * 0.5);
  const shards = Array.from({ length: 12 }, () => ({ a: rand(0, TAU), v: S * rand(0.4, 1), spin: rand(-8, 8), size: S * rand(0.01, 0.025) }));
  const hearts = Array.from({ length: calm ? 8 : 22 }, () => ({
    x: rand(-0.5, 0.5), speed: rand(0.08, 0.2), size: rand(0.03, 0.07), phase: rand(0, TAU), delay: rand(0, 3),
  }));
  const lines = Array.from({ length: 6 }, (_, i) => ({ y: 0.22 + i * 0.1, len: i === 5 ? 0.45 : rand(0.6, 0.85), wave: rand(0, TAU) }));

  let openAt = null;

  const glassPanel = (draw, alpha = 1) => {
    ctx.save();
    draw();
    const fill = ctx.createLinearGradient(-E / 2, -EH / 2, E / 2, EH / 2);
    fill.addColorStop(0, rgbaOf(GLASS, 0.22 * alpha));
    fill.addColorStop(0.5, rgbaOf([255, 255, 255], 0.08 * alpha));
    fill.addColorStop(1, rgbaOf(GLASS, 0.18 * alpha));
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = rgbaOf([255, 235, 245], 0.55 * alpha);
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();
  };

  return (t) => {
    if (openAt === null) {
      const tapped = stage && stage.taps.length > 0 && t > 0.3;
      if (tapped || t >= autoOpen) openAt = t;
    }
    if (stage) stage.taps.length = 0;
    const q = openAt === null ? -1 : t - openAt;
    if (stage && q >= REVEAL) stage.revealed = true;

    const intro = clamp(t / 1);
    const bob = Math.sin(t * 1.3) * S * 0.015;
    const tilt = Math.sin(t * 0.7) * 0.05 + (q >= 0 && q < CRACK ? Math.sin(q * 60) * 0.02 : 0);
    const turn = 0.88 + 0.12 * Math.cos(t * 0.5);
    const flap = easeInOut(clamp((q - CRACK) / (FLAP - CRACK)));
    const out = easeOutCubic(clamp((q - FLAP + 0.1) / (OUT - FLAP)));
    const wow = q >= OUT ? Math.exp(-(q - OUT) * 2.2) : 0;

    ctx.drawImage(backdrop, 0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, cx, cy - EH * out * 0.8, S * (0.7 + out * 0.5), [255, 190, 230], 0.18 * intro + 0.25 * out + 0.3 * wow);
    ctx.globalCompositeOperation = 'source-over';

    // Sombra flotante
    ctx.fillStyle = `rgba(0, 0, 0, ${0.35 - bob / S})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy + EH * 0.95, E * 0.42, EH * 0.08, 0, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.rotate(tilt);
    ctx.scale(turn, 1);

    // Panel trasero
    glassPanel(() => {
      ctx.beginPath();
      ctx.roundRect(-E / 2, -EH / 2, E, EH, S * 0.02);
    });

    // Solapa abierta (queda detrás de la carta)
    const drawFlap = () => {
      ctx.save();
      ctx.translate(0, -EH / 2);
      ctx.scale(1, Math.cos(flap * Math.PI));
      glassPanel(() => {
        ctx.beginPath();
        ctx.moveTo(-E / 2, 0);
        ctx.lineTo(E / 2, 0);
        ctx.lineTo(0, EH * 0.58);
        ctx.closePath();
      }, flap > 0.5 ? 0.7 : 1);
      ctx.restore();
    };
    if (flap > 0.5) drawFlap();

    // Carta que sale y se escribe sola
    if (q >= FLAP - 0.1) {
      const pw = E * 0.86;
      const ph = EH * 1.25;
      const py = lerp(-EH * 0.3, -EH * 0.3 - ph * 0.72, out);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-E, -h, E * 2, h + EH * 0.35 + (q > OUT ? EH : 0));
      ctx.clip();
      const paper = ctx.createLinearGradient(0, py, 0, py + ph);
      paper.addColorStop(0, PAPER_TOP);
      paper.addColorStop(1, PAPER_BOTTOM);
      ctx.shadowColor = 'rgba(255, 200, 230, 0.6)';
      ctx.shadowBlur = 20 * out;
      ctx.fillStyle = paper;
      ctx.beginPath();
      ctx.roundRect(-pw / 2, py, pw, ph, S * 0.012);
      ctx.fill();
      ctx.shadowBlur = 0;
      const write = clamp((q - OUT + 0.6) / 1.6);
      ctx.strokeStyle = rgbaOf(INK, 0.85);
      ctx.lineWidth = Math.max(1, S * 0.005);
      ctx.lineCap = 'round';
      lines.forEach((line, i) => {
        const k = clamp(write * lines.length - i);
        if (k <= 0) return;
        ctx.beginPath();
        const y = py + ph * line.y;
        for (let s = 0; s <= 24 * k; s++) {
          const u = s / 24;
          const x = -pw * 0.38 + u * pw * 0.76 * line.len;
          const yy = y + Math.sin(u * 22 + line.wave) * ph * 0.012;
          if (s) ctx.lineTo(x, yy);
          else ctx.moveTo(x, yy);
        }
        ctx.stroke();
      });
      if (write >= 1) {
        heartPath(ctx, pw * 0.25, py + ph * 0.82, S * 0.06);
        ctx.fillStyle = SEAL;
        ctx.fill();
      }
      ctx.restore();
    }

    // Bolsillo delantero de cristal
    glassPanel(() => {
      ctx.beginPath();
      ctx.moveTo(-E / 2, -EH / 2 + EH * 0.08);
      ctx.lineTo(0, EH * 0.12);
      ctx.lineTo(E / 2, -EH / 2 + EH * 0.08);
      ctx.lineTo(E / 2, EH / 2);
      ctx.lineTo(-E / 2, EH / 2);
      ctx.closePath();
    });
    if (flap <= 0.5) drawFlap();

    // Reflejo que recorre el cristal
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-E / 2, -EH / 2, E, EH, S * 0.02);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const sweep = ((t * 0.35) % 1.6) - 0.3;
    const streak = ctx.createLinearGradient(-E / 2 + sweep * E, -EH / 2, -E / 2 + sweep * E + E * 0.25, EH / 2);
    streak.addColorStop(0, 'rgba(255, 255, 255, 0)');
    streak.addColorStop(0.5, 'rgba(255, 255, 255, 0.22)');
    streak.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = streak;
    ctx.fillRect(-E / 2, -EH / 2, E, EH);
    ctx.restore();

    // Sello de corazón que se rompe en luz
    const sealY = -EH / 2 + EH * 0.58 * (1 - flap * 2);
    if (q < CRACK) {
      const pulse = 1 + 0.06 * Math.sin(t * 4);
      const r = S * 0.065 * pulse * (q >= 0 ? 1 + q * 0.6 : 1);
      const seal = ctx.createRadialGradient(-r * 0.3, sealY - r * 0.3, r * 0.1, 0, sealY, r);
      seal.addColorStop(0, '#ff6f9c');
      seal.addColorStop(0.6, SEAL);
      seal.addColorStop(1, '#6d0a2e');
      ctx.fillStyle = seal;
      ctx.beginPath();
      ctx.arc(0, sealY, r, 0, TAU);
      ctx.fill();
      heartPath(ctx, 0, sealY - r * 0.05, r * 1.1);
      ctx.fillStyle = 'rgba(255, 210, 225, 0.55)';
      ctx.fill();
    } else if (q < CRACK + 1) {
      const k = q - CRACK;
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 0, -EH / 2 + EH * 0.58, S * 0.4 * (1 + k), [255, 150, 200], 0.8 * (1 - k));
      for (const sh of shards) {
        const x = Math.cos(sh.a) * sh.v * k;
        const y = -EH / 2 + EH * 0.58 + Math.sin(sh.a) * sh.v * k + S * 0.6 * k * k;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(sh.spin * k);
        ctx.fillStyle = rgbaOf([255, 120, 170], 1 - k);
        ctx.fillRect(-sh.size, -sh.size / 2, sh.size * 2, sh.size);
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();

    // Corazones que suben y chispas del momento WOW
    ctx.globalCompositeOperation = 'lighter';
    if (q >= OUT - 0.4) {
      const appear = clamp((q - OUT + 0.4) / 0.6);
      for (const heart of hearts) {
        const life = (q - OUT + heart.delay) * heart.speed;
        const y = cy - EH * 0.6 - ((life % 1.2) * h * 0.6);
        const x = cx + heart.x * E * 1.3 + Math.sin(t * 1.2 + heart.phase) * S * 0.03;
        heartPath(ctx, x, y, S * heart.size, Math.sin(t + heart.phase) * 0.3);
        ctx.fillStyle = rgbaOf([255, 130, 180], 0.5 * appear * (1 - ((life % 1.2) / 1.2)));
        ctx.fill();
      }
    }
    if (wow > 0.02) {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU + q;
        const d = S * (0.2 + (1 - wow) * 0.6);
        sparkle(ctx, cx + Math.cos(a) * d, cy - EH * 0.9 + Math.sin(a) * d * 0.7, S * 0.02, [255, 220, 240], wow);
      }
      glow(ctx, cx, cy - EH * 0.9, S * 1.2, [255, 230, 240], 0.45 * wow);
    }
    ctx.globalCompositeOperation = 'source-over';

    if (q < 0 && stage && !stage.auto && t > 1) {
      ctx.fillStyle = `rgba(255, 235, 245, ${clamp((t - 1) / 0.6) * (0.6 + 0.4 * Math.sin(t * 3))})`;
      ctx.font = `600 ${Math.round(S * 0.05)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Toca la carta', cx, Math.min(h - S * 0.06, cy + EH * 1.15));
    }

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (intro < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - intro})`;
      ctx.fillRect(0, 0, w, h);
    }
  };
}
