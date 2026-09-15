import { TAU, clamp, rand, easeOutCubic } from './util.js';

const BURST = 2.2;

// Número pseudoaleatorio estable (0..1) para que los rayos no cambien en cada cuadro.
const noise = (n) => {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

export default function create(ctx, w, h) {
  const S = Math.min(w, h * 0.62);
  const cx = w / 2;
  const cy = h * 0.6;
  const groundY = h * 0.8;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#04030a');
  bg.addColorStop(0.6, '#140d2b');
  bg.addColorStop(1, '#231642');

  const sparks = Array.from({ length: 90 }, () => ({
    a: rand(0, TAU), r0: S * rand(0.5, 1.1), delay: rand(0, 1.6), dur: rand(0.5, 1), size: rand(1, 2.4),
  }));
  const flames = Array.from({ length: 22 }, (_, i) => ({
    x: (i / 21 - 0.5) * 2, phase: rand(0, TAU), speed: rand(5, 9), height: rand(0.7, 1.1),
  }));
  const rocks = Array.from({ length: 12 }, () => ({
    x: rand(-0.9, 0.9), size: rand(0.012, 0.03), speed: rand(0.05, 0.12), rot: rand(0, TAU), spin: rand(-1, 1), delay: rand(0, 1.5),
  }));
  const cracks = Array.from({ length: 7 }, (_, k) => {
    const dir = k % 2 ? 1 : -1;
    const pts = [{ x: cx, y: groundY }];
    let x = cx;
    let y = groundY;
    for (let s = 0; s < 5; s++) {
      x += dir * rand(0.04, 0.1) * S;
      y += rand(-0.005, 0.03) * S;
      pts.push({ x, y });
    }
    return pts;
  });

  return (t) => {
    const after = t - BURST;
    const shake = after > 0 && after < 0.6 ? (1 - after / 0.6) * S * 0.025 : 0;
    const power = easeOutCubic(clamp(t / BURST));

    ctx.save();
    ctx.translate((noise(t * 50) - 0.5) * shake * 2, (noise(t * 50 + 3) - 0.5) * shake * 2);
    ctx.fillStyle = bg;
    ctx.fillRect(-20, -20, w + 40, h + 40);

    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * (0.5 + (after > 0 ? 0.9 : power * 0.4)));
    glow.addColorStop(0, `rgba(255, 212, 59, ${0.15 + 0.3 * power})`);
    glow.addColorStop(1, 'rgba(255, 170, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-20, -20, w + 40, h + 40);

    ctx.fillStyle = '#0a0714';
    ctx.fillRect(-20, groundY, w + 40, h - groundY + 20);
    if (after > 0) {
      ctx.strokeStyle = `rgba(255, 212, 59, ${clamp(after / 0.3) * (0.5 + 0.3 * Math.sin(t * 6))})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const crack of cracks) {
        crack.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      }
      ctx.stroke();

      // Piedras que flotan hacia arriba
      ctx.fillStyle = '#3b2f55';
      for (const rock of rocks) {
        const life = after - rock.delay;
        if (life <= 0) continue;
        const size = S * rock.size;
        ctx.save();
        ctx.translate(cx + rock.x * S * 0.8, groundY - life * rock.speed * h);
        ctx.rotate(rock.rot + life * rock.spin);
        ctx.fillRect(-size, -size * 0.7, size * 2, size * 1.4);
        ctx.restore();
      }
    }

    ctx.globalCompositeOperation = 'lighter';

    // Chispas que convergen al centro mientras se carga
    if (after < 0.1) {
      for (const s of sparks) {
        const p = clamp((t - s.delay) / s.dur);
        if (p <= 0 || p >= 1) continue;
        const r = s.r0 * (1 - p * p);
        const x = cx + Math.cos(s.a) * r;
        const y = cy + Math.sin(s.a) * r;
        const tail = S * 0.05 * p;
        ctx.strokeStyle = `rgba(255, 230, 140, ${0.8 * p})`;
        ctx.lineWidth = s.size;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(s.a) * tail, y + Math.sin(s.a) * tail);
        ctx.stroke();
      }
    }

    // Aura de llamas después de la explosión
    if (after > 0) {
      const grow = easeOutCubic(clamp(after / 0.5));
      ctx.fillStyle = 'rgba(255, 196, 0, 0.18)';
      for (const f of flames) {
        const baseX = cx + f.x * S * 0.26;
        const tall = S * 0.75 * f.height * grow * (0.75 + 0.25 * Math.sin(t * f.speed + f.phase)) * (1 - Math.abs(f.x) * 0.45);
        const wide = S * 0.07;
        const lean = Math.sin(t * 3 + f.phase) * wide * 0.6;
        ctx.beginPath();
        ctx.moveTo(baseX - wide, groundY - S * 0.02);
        ctx.quadraticCurveTo(baseX - wide * 0.6 + lean, groundY - tall * 0.6, baseX + lean * 1.5, groundY - tall);
        ctx.quadraticCurveTo(baseX + wide * 0.6 + lean, groundY - tall * 0.6, baseX + wide, groundY - S * 0.02);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Esfera de energía
    const core = (S * 0.03 + S * 0.09 * power) * (after > 0 ? 1 + 0.08 * Math.sin(t * 12) : 1);
    const sphere = ctx.createRadialGradient(cx, cy, 0, cx, cy, core * 2.6);
    sphere.addColorStop(0, 'rgba(255, 255, 255, 1)');
    sphere.addColorStop(0.3, 'rgba(255, 240, 170, 0.95)');
    sphere.addColorStop(0.55, 'rgba(255, 190, 40, 0.5)');
    sphere.addColorStop(1, 'rgba(255, 150, 0, 0)');
    ctx.fillStyle = sphere;
    ctx.beginPath();
    ctx.arc(cx, cy, core * 2.6, 0, TAU);
    ctx.fill();

    // Rayos eléctricos
    const slot = Math.floor(t * 9);
    const bolts = after > 0 ? 3 : t > 0.8 ? 1 : 0;
    ctx.strokeStyle = 'rgba(165, 216, 255, 0.9)';
    ctx.lineWidth = 2;
    for (let b = 0; b < bolts; b++) {
      if (noise(slot * 7 + b) > 0.55) continue;
      const a = noise(slot * 13 + b) * TAU;
      const len = S * (0.25 + 0.35 * noise(slot * 3 + b));
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let k = 1; k <= 7; k++) {
        const d = (k / 7) * len;
        const j = (noise(slot * 31 + b * 5 + k) - 0.5) * S * 0.08;
        ctx.lineTo(cx + Math.cos(a) * d - Math.sin(a) * j, cy + Math.sin(a) * d + Math.cos(a) * j);
      }
      ctx.stroke();
    }

    if (after > 0 && after < 0.9) {
      const q = after / 0.9;
      const r = S * 1.3 * easeOutCubic(q);
      ctx.strokeStyle = `rgba(255, 240, 180, ${1 - q})`;
      ctx.lineWidth = S * 0.02 * (1 - q) + 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.55, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    if (after > 0 && after < 0.35) {
      ctx.fillStyle = `rgba(255, 250, 220, ${0.7 * (1 - after / 0.35)})`;
      ctx.fillRect(0, 0, w, h);
    }
  };
}
