import { TAU, clamp, rand, easeOutBack } from './util.js';

const TRICOLOR = ['#16a34a', '#f8fafc', '#dc2626'];
const FIESTA = ['#ec4899', '#f97316', '#facc15', '#06b6d4', '#8b5cf6'];

export default function create(ctx, w, h, dpr = 1) {
  const fw = Math.max(46, Math.min(110, w / 6.5));
  const fh = fw * 1.25;
  const gap = fw * 0.12;

  const bg = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, Math.max(w, h) * 0.8);
  bg.addColorStop(0, '#3a1450');
  bg.addColorStop(1, '#12081f');

  const templates = new Map();
  const template = (color, variant) => {
    const key = `${color}-${variant}`;
    if (!templates.has(key)) templates.set(key, makeFlag(color, fw, fh, dpr, variant));
    return templates.get(key);
  };

  const rows = [
    { y: h * 0.02, sag: h * 0.035, colors: TRICOLOR, delay: 0.1, offset: 0 },
    { y: h * 0.02 + fh * 1.15, sag: h * 0.045, colors: FIESTA, delay: 0.7, offset: fw * 0.5 },
  ];
  for (const [ri, row] of rows.entries()) {
    const count = Math.ceil((w + fw) / (fw + gap)) + 1;
    row.yAt = (x) => row.y + row.sag * (1 - ((x - w / 2) / (w / 2 + fw)) ** 2);
    row.flags = Array.from({ length: count }, (_, i) => {
      const xc = row.offset - fw * 0.3 + i * (fw + gap) + fw / 2;
      return {
        xc,
        image: template(row.colors[i % row.colors.length], (i + ri) % 2),
        phase: i * 0.55 + ri,
        delay: row.delay + i * 0.04,
      };
    });
  }

  const bokeh = Array.from({ length: 10 }, (_, i) => ({
    x: rand(0, w), y: rand(h * 0.3, h), r: rand(w * 0.05, w * 0.12), color: TRICOLOR[i % 3], phase: rand(0, TAU),
  }));

  const confetti = Array.from({ length: Math.round(Math.min(180, (w * h) / 2000)) }, (_, i) => ({
    x: rand(0, w), y: rand(-h, h), vy: rand(50, 120), vx: rand(-15, 15),
    rotation: rand(0, TAU), spin: rand(-4, 4), flip: rand(0, TAU), flipSpeed: rand(3, 8),
    size: rand(5, 9), color: TRICOLOR[i % 3],
  }));

  return (t, dt) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    for (const b of bokeh) {
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x + Math.sin(t * 0.3 + b.phase) * 20, b.y + Math.cos(t * 0.25 + b.phase) * 15, b.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const row of rows) {
      ctx.strokeStyle = 'rgba(233, 236, 239, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = -10; x <= w + 10; x += 10) {
        const y = row.yAt(x);
        if (x === -10) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      for (const flag of row.flags) {
        const e = easeOutBack(clamp((t - flag.delay) / 0.7));
        const dropOffset = (1 - e) * -(row.y + fh * 1.6 + row.sag);
        const sway = Math.sin(t * 1.6 + flag.phase) * 0.06 + Math.sin(t * 0.37 + flag.phase * 0.2) * 0.03;
        ctx.save();
        ctx.translate(flag.xc, row.yAt(flag.xc) + dropOffset);
        ctx.rotate(sway);
        ctx.drawImage(flag.image, -fw / 2, 0, fw, fh);
        ctx.restore();
      }
    }

    for (const c of confetti) {
      c.y += c.vy * dt;
      c.x += (c.vx + Math.sin(t * 2 + c.flip) * 20) * dt;
      c.rotation += c.spin * dt;
      if (c.y > h + 20) {
        c.y = -20;
        c.x = rand(0, w);
      }
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);
      ctx.scale(1, Math.cos(t * c.flipSpeed + c.flip));
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size * 0.3, c.size, c.size * 0.6);
      ctx.restore();
    }
  };
}

// Banderita de papel picado pre-renderizada con recortes transparentes.
function makeFlag(color, fw, fh, scale, variant) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(fw * scale);
  canvas.height = Math.ceil(fh * scale);
  const g = canvas.getContext('2d');
  g.scale(scale, scale);

  const bodyH = fh * 0.9;
  const teeth = 7;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(fw, 0);
  g.lineTo(fw, bodyH);
  for (let i = teeth * 2; i >= 0; i--) g.lineTo((fw * i) / (teeth * 2), i % 2 ? fh : bodyH);
  g.closePath();
  g.fillStyle = color;
  g.fill();
  g.fillStyle = 'rgba(0, 0, 0, 0.12)';
  g.fillRect(0, 0, fw, fh * 0.05);

  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  const u = fw / 10;
  const hole = (x, y, r) => {
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  };

  for (let i = 1; i < 10; i++) {
    hole(i * u, fh * 0.12, u * 0.18);
    hole(i * u, bodyH - u * 0.6, u * 0.18);
  }
  for (let j = 0; j < 5; j++) {
    const y = fh * 0.22 + (j * (bodyH - fh * 0.4)) / 4;
    hole(u * 0.8, y, u * 0.2);
    hole(fw - u * 0.8, y, u * 0.2);
  }

  const cx = fw / 2;
  const cy = fh * 0.47;
  if (variant === 0) {
    for (let k = 0; k < 8; k++) {
      g.save();
      g.translate(cx, cy);
      g.rotate((k * TAU) / 8);
      g.beginPath();
      g.ellipse(0, -u * 1.5, u * 0.45, u * 1.05, 0, 0, TAU);
      g.fill();
      g.restore();
    }
    hole(cx, cy, u * 0.45);
  } else {
    g.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? u * 1.0 : u * 2.4;
      const a = (k * TAU) / 10 - Math.PI / 2;
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  }

  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = cx + dx * u * 3;
    const y = cy + dy * u * 3.2;
    const s = u * 0.55;
    g.beginPath();
    g.moveTo(x, y - s);
    g.lineTo(x + s, y);
    g.lineTo(x, y + s);
    g.lineTo(x - s, y);
    g.closePath();
    g.fill();
  }

  return canvas;
}
