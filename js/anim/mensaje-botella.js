import {
  TAU, clamp, rand, lerp, easeInOut, easeOutCubic, easeOutBack, rgbaOf, glow, sparkle, softBackdrop, makeVignette, makeStars, drawStars,
} from './util.js';

// ✏️ Colores del vidrio, el pergamino y la luna
const GLASS = [120, 200, 190];
const WARM = [255, 205, 140];
const MOON = [220, 230, 255];

// Guion (segundos)
const ARRIVE = 3; // la botella llega flotando
const POP = 3.8; // salta el corcho
const UNROLL = 5; // el pergamino se abre en el aire: momento WOW

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const horizon = h * 0.5;
  const moon = { x: w * 0.7, y: h * 0.2, r: S * 0.08 };

  const sky = softBackdrop(w, h, dpr, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, horizon);
    grad.addColorStop(0, '#040818');
    grad.addColorStop(1, '#1b2b50');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  const stars = makeStars(w, horizon * 0.9, Math.round((w * h) / 3000));
  const vignette = makeVignette(ctx, w, h, 0.6, w / 2, h * 0.55);

  const waveY = (x, row, t) => {
    const u = row / 10;
    return horizon + u * u * (h - horizon) + Math.sin(x * (0.02 / (0.3 + u)) + t * (0.8 + u) + row) * S * 0.012 * (0.3 + u * 2);
  };

  return (t) => {
    const intro = clamp(t / 1.2);
    const arrive = easeOutCubic(clamp(t / ARRIVE));
    const bob = Math.sin(t * 1.6) * S * 0.012;
    const bx = lerp(w * 0.35, w * 0.5, arrive);
    const by = lerp(horizon + S * 0.08, h * 0.7, arrive) + bob;
    const scale = lerp(0.35, 1, arrive);
    const tilt = -0.9 + Math.sin(t * 1.1) * 0.08;
    const cork = t > POP ? easeOutCubic(clamp((t - POP) / 0.8)) : 0;
    const unroll = easeOutBack(clamp((t - UNROLL) / 1.2));
    const floatUp = easeInOut(clamp((t - POP) / 1.4));
    const wow = t > UNROLL ? Math.exp(-((t - UNROLL - 0.6) ** 2) * 2) : 0;

    ctx.drawImage(sky, 0, 0, w, h);
    drawStars(ctx, stars, t);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, moon.x, moon.y, S * 0.5, MOON, 0.35 * intro);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#eef2ff';
    ctx.beginPath();
    ctx.arc(moon.x, moon.y, moon.r, 0, TAU);
    ctx.fill();

    // Mar por filas en perspectiva
    const water = ctx.createLinearGradient(0, horizon, 0, h);
    water.addColorStop(0, '#16284a');
    water.addColorStop(1, '#030814');
    ctx.fillStyle = water;
    ctx.fillRect(0, horizon, w, h - horizon);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const u = i / 26;
      const y = horizon + u * u * (h - horizon);
      const width = S * (0.05 + u * 0.35) * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.7));
      ctx.fillStyle = rgbaOf(MOON, (0.35 - u * 0.25) * intro);
      ctx.fillRect(moon.x - width / 2 + Math.sin(t + i) * S * 0.02, y, width, 1 + u * 1.5);
    }
    ctx.globalCompositeOperation = 'source-over';
    const drawRows = (from, to) => {
      for (let row = from; row < to; row++) {
        ctx.strokeStyle = `rgba(150, 190, 230, ${0.05 + row * 0.012})`;
        ctx.lineWidth = 1 + row * 0.1;
        ctx.beginPath();
        for (let x = 0; x <= w + 10; x += 10) ctx.lineTo(x, waveY(x, row, t));
        ctx.stroke();
      }
    };
    drawRows(0, 8);

    // Botella de vidrio con el pergamino brillando adentro
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(tilt);
    ctx.scale(scale, scale);
    const L = S * 0.34;
    const R = S * 0.07;
    glow(ctx, 0, 0, L * 0.9, WARM, 0.25 * (1 - floatUp));
    if (floatUp < 0.2) {
      ctx.fillStyle = `rgba(240, 215, 170, ${1 - floatUp * 5})`;
      ctx.fillRect(-L * 0.28, -R * 0.45, L * 0.5, R * 0.9);
    }
    const glass = ctx.createLinearGradient(0, -R, 0, R);
    glass.addColorStop(0, rgbaOf(GLASS, 0.5));
    glass.addColorStop(0.5, rgbaOf(GLASS, 0.15));
    glass.addColorStop(1, rgbaOf(GLASS, 0.45));
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.moveTo(-L * 0.45, -R);
    ctx.lineTo(L * 0.2, -R);
    ctx.quadraticCurveTo(L * 0.32, -R, L * 0.36, -R * 0.35);
    ctx.lineTo(L * 0.55, -R * 0.35);
    ctx.lineTo(L * 0.55, R * 0.35);
    ctx.lineTo(L * 0.36, R * 0.35);
    ctx.quadraticCurveTo(L * 0.32, R, L * 0.2, R);
    ctx.lineTo(-L * 0.45, R);
    ctx.quadraticCurveTo(-L * 0.52, 0, -L * 0.45, -R);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgbaOf([220, 255, 245], 0.6);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = R * 0.18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-L * 0.38, -R * 0.62);
    ctx.lineTo(L * 0.15, -R * 0.62);
    ctx.stroke();
    const corkX = L * 0.62 + cork * L * 0.9;
    const corkY = -cork * L * 1.1 + cork * cork * L * 1.4;
    ctx.save();
    ctx.translate(corkX, corkY);
    ctx.rotate(cork * 6);
    ctx.fillStyle = '#a0703f';
    ctx.fillRect(-L * 0.07, -R * 0.35, L * 0.14, R * 0.7);
    ctx.restore();
    ctx.restore();

    // Olas delante de la botella (tapan su parte sumergida)
    const front = ctx.createLinearGradient(0, by, 0, by + S * 0.08);
    front.addColorStop(0, 'rgba(10, 25, 50, 0.85)');
    front.addColorStop(1, 'rgba(3, 8, 20, 0.95)');
    ctx.fillStyle = front;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 10; x += 10) ctx.lineTo(x, by + S * 0.02 * scale + Math.sin(x * 0.03 + t * 1.6) * S * 0.01);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    drawRows(8, 11);

    // Pergamino que sale, flota y se desenrolla
    if (t > POP) {
      const px = lerp(bx, w / 2, floatUp);
      const py = lerp(by, h * 0.42, floatUp) + Math.sin(t * 1.2) * S * 0.01;
      const pw = lerp(S * 0.05, S * 0.62, unroll);
      const ph = S * 0.34;
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, px, py, S * (0.4 + 0.5 * unroll), WARM, 0.35 * floatUp + 0.45 * wow);
      ctx.globalCompositeOperation = 'source-over';
      const paper = ctx.createLinearGradient(px - pw / 2, 0, px + pw / 2, 0);
      paper.addColorStop(0, '#d8b98a');
      paper.addColorStop(0.5, '#fbeccb');
      paper.addColorStop(1, '#d8b98a');
      ctx.fillStyle = paper;
      ctx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#c49a64';
        ctx.beginPath();
        ctx.ellipse(px + (side * pw) / 2, py, S * 0.025, ph * 0.52, 0, 0, TAU);
        ctx.fill();
      }
      if (unroll > 0.6) {
        const lines = clamp((unroll - 0.6) / 0.4);
        ctx.strokeStyle = `rgba(120, 80, 40, ${0.5 * lines})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const y = py - ph * 0.25 + k * ph * 0.16;
          ctx.moveTo(px - pw * 0.35, y);
          ctx.lineTo(px - pw * 0.35 + pw * 0.7 * (k === 3 ? 0.5 : 1) * lines, y);
        }
        ctx.stroke();
      }
      if (wow > 0.02) {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU + t * 0.4;
          sparkle(ctx, px + Math.cos(a) * S * 0.45, py + Math.sin(a) * S * 0.3, S * 0.015, WARM, wow);
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    if (t > POP && t < POP + 0.6) {
      ctx.globalCompositeOperation = 'lighter';
      sparkle(ctx, bx + Math.cos(tilt) * S * 0.2 * scale, by + Math.sin(tilt) * S * 0.2 * scale, S * 0.05, WARM, 1 - (t - POP) / 0.6);
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (intro < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - intro})`;
      ctx.fillRect(0, 0, w, h);
    }
  };
}
