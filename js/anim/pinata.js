import {
  TAU, clamp, rand, pick, lerp, easeOutCubic, rgbaOf, glow, sparkle, softBackdrop, makeVignette,
} from './util.js';

// ✏️ Colores de la piñata, los dulces y el confeti
const CONES = ['#e03131', '#f59f00', '#1c7ed6', '#12b886', '#be4bdb', '#fcc419', '#ff6b9d'];
const CANDY = ['#ff6b9d', '#ffd43b', '#74c0fc', '#69db7c', '#ff922b', '#b197fc', '#ffffff'];

const HITS = 3; // golpes para romperla
const REVEAL = 1.2; // segundos después de romperse

export default function create(ctx, w, h, dpr = 1, stage) {
  const S = Math.min(w, h * 0.62);
  const pivot = { x: w / 2, y: -h * 0.05 };
  const rope = h * 0.5;
  const R = S * 0.16;
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const auto = !stage || stage.auto;
  const autoHits = auto ? [1.2, 1.9, 2.6] : [6, 6.7, 7.4];

  const party = softBackdrop(w, h, dpr, (g) => {
    const base = g.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#3b0d4a');
    base.addColorStop(1, '#12051c');
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = rgbaOf(pick([[255, 110, 160], [255, 210, 90], [110, 200, 255], [120, 255, 170]]), rand(0.15, 0.35));
      g.beginPath();
      g.arc(rand(0, w), rand(0, h), S * rand(0.03, 0.1), 0, TAU);
      g.fill();
    }
  });
  const vignette = makeVignette(ctx, w, h, 0.6);

  const candies = Array.from({ length: calm ? 40 : 90 }, () => ({
    a: rand(-Math.PI, 0), v: S * rand(0.8, 2.2), spin: rand(-8, 8), size: S * rand(0.015, 0.03), color: pick(CANDY), kind: Math.floor(rand(0, 3)), bounce: rand(0.2, 0.45),
  }));

  let hits = [];
  let lastTap = -1;
  let brokeAt = null;
  let userTapped = false;
  let lastT = 0;

  return (t) => {
    if (t < lastT) {
      hits = [];
      brokeAt = null;
      userTapped = false;
      lastTap = -1;
    }
    lastT = t;
    if (brokeAt === null) {
      // Un golpe por toque (con un respiro para no contar dobles)
      if (stage && !stage.auto && stage.taps.length && t > 0.3 && t - lastTap > 0.25) {
        hits.push(t);
        lastTap = t;
        userTapped = true;
      }
      // Si nadie ha tocado, la piñata se rompe sola
      if (!userTapped) {
        while (hits.length < HITS && t >= autoHits[hits.length]) hits.push(autoHits[hits.length]);
      }
      if (hits.length >= HITS) brokeAt = hits[HITS - 1];
    }
    if (stage) stage.taps.length = 0;
    const q = brokeAt === null ? -1 : t - brokeAt;
    if (stage && q >= REVEAL) stage.revealed = true;

    // Balanceo: cada golpe le da un empujón que se amortigua
    let swing = Math.sin(t * 1.4) * 0.08;
    let jolt = 0;
    for (const hit of hits) {
      const k = t - hit;
      if (k < 0) continue;
      swing += Math.sin(k * 7) * 0.35 * Math.exp(-k * 1.8);
      jolt = Math.max(jolt, Math.exp(-k * 12));
    }
    const bx = pivot.x + Math.sin(swing) * rope;
    const by = pivot.y + Math.cos(swing) * rope;
    const cracks = Math.min(hits.length, HITS);

    ctx.drawImage(party, 0, 0, w, h);

    ctx.strokeStyle = 'rgba(230, 210, 170, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivot.x, pivot.y);
    ctx.lineTo(bx, by - R);
    ctx.stroke();

    if (q < 0) {
      ctx.save();
      ctx.translate(bx + (Math.random() - 0.5) * jolt * S * 0.03, by);
      ctx.rotate(swing * 0.6);
      ctx.scale(1 + jolt * 0.08, 1 - jolt * 0.08);
      // Picos de la estrella con flecos de papel
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU - Math.PI / 2;
        ctx.save();
        ctx.rotate(a);
        const cone = ctx.createLinearGradient(0, -R * 0.4, 0, R * 0.4);
        cone.addColorStop(0, CONES[i]);
        cone.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
        ctx.fillStyle = CONES[i];
        ctx.beginPath();
        ctx.moveTo(R * 0.75, -R * 0.32);
        ctx.lineTo(R * 2.1, 0);
        ctx.lineTo(R * 0.75, R * 0.32);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = cone;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let k = 1; k < 5; k++) {
          const u = k / 5;
          ctx.moveTo(R * lerp(0.75, 2.1, u), -R * 0.32 * (1 - u));
          ctx.lineTo(R * lerp(0.75, 2.1, u), R * 0.32 * (1 - u));
        }
        ctx.stroke();
        ctx.fillStyle = CONES[(i + 3) % CONES.length];
        for (let k = 0; k < 6; k++) ctx.fillRect(R * 2.05, (k - 3) * R * 0.03, R * (0.25 + 0.1 * Math.sin(t * 8 + k + i)), R * 0.02);
        ctx.restore();
      }
      const body = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R);
      body.addColorStop(0, '#ff8fb8');
      body.addColorStop(1, '#c2255c');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ffd43b';
      ctx.lineWidth = R * 0.12;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.7, 0, TAU);
      ctx.stroke();
      if (cracks > 0) {
        ctx.strokeStyle = 'rgba(40, 10, 20, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let c = 0; c < cracks * 2; c++) {
          let x = 0;
          let y = 0;
          const a = c * 2.4;
          ctx.moveTo(x, y);
          for (let s = 0; s < 4; s++) {
            x += Math.cos(a + (s % 2 ? 0.5 : -0.5)) * R * 0.25;
            y += Math.sin(a + (s % 2 ? 0.5 : -0.5)) * R * 0.25;
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
      ctx.restore();
      if (jolt > 0.05) {
        ctx.globalCompositeOperation = 'lighter';
        sparkle(ctx, bx, by, S * 0.12 * jolt, [255, 240, 200], jolt);
        ctx.globalCompositeOperation = 'source-over';
      }
    } else {
      // Explosión de dulces y confeti con gravedad y rebote en el piso
      const floor = h * 0.94;
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, bx, by, S * (0.6 + q), [255, 220, 150], 0.7 * Math.exp(-q * 2.5));
      ctx.globalCompositeOperation = 'source-over';
      for (const c of candies) {
        let x = bx + Math.cos(c.a) * c.v * Math.min(q, 1.5) * 0.7;
        let y = by + Math.sin(c.a) * c.v * q + S * 1.8 * q * q;
        if (y > floor) {
          const over = y - floor;
          y = floor - Math.abs(Math.sin(over * 0.02)) * S * 0.05 * c.bounce * Math.exp(-q);
          x += 0;
        }
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(c.spin * Math.min(q, 2));
        ctx.fillStyle = c.color;
        if (c.kind === 0) {
          ctx.beginPath();
          ctx.arc(0, 0, c.size, 0, TAU);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.arc(-c.size * 0.3, -c.size * 0.3, c.size * 0.3, 0, TAU);
          ctx.fill();
        } else if (c.kind === 1) {
          ctx.fillRect(-c.size * 1.2, -c.size * 0.5, c.size * 2.4, c.size);
          ctx.beginPath();
          ctx.moveTo(-c.size * 1.2, 0);
          ctx.lineTo(-c.size * 1.9, -c.size * 0.6);
          ctx.lineTo(-c.size * 1.9, c.size * 0.6);
          ctx.moveTo(c.size * 1.2, 0);
          ctx.lineTo(c.size * 1.9, -c.size * 0.6);
          ctx.lineTo(c.size * 1.9, c.size * 0.6);
          ctx.fill();
        } else {
          ctx.scale(1, Math.cos(q * 6 + c.spin));
          ctx.fillRect(-c.size * 0.6, -c.size * 0.3, c.size * 1.2, c.size * 0.6);
        }
        ctx.restore();
      }
      const shards = 7;
      for (let i = 0; i < shards; i++) {
        const a = (i / shards) * TAU;
        const x = bx + Math.cos(a) * S * 0.6 * Math.min(q, 1);
        const y = by + Math.sin(a) * S * 0.4 * q + S * 1.5 * q * q;
        if (y > h + 40) continue;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + q * 4);
        ctx.fillStyle = CONES[i];
        ctx.beginPath();
        ctx.moveTo(0, -R * 0.3);
        ctx.lineTo(R * 1.2, 0);
        ctx.lineTo(0, R * 0.3);
        ctx.fill();
        ctx.restore();
      }
      if (q < 1.5) {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU;
          sparkle(ctx, bx + Math.cos(a) * S * 0.4 * easeOutCubic(q / 1.5), by + Math.sin(a) * S * 0.4 * easeOutCubic(q / 1.5), S * 0.02, [255, 230, 180], 1 - q / 1.5);
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    if (q < 0 && stage && !stage.auto && t > 1) {
      ctx.fillStyle = `rgba(255, 240, 220, ${clamp((t - 1) / 0.6) * (0.6 + 0.4 * Math.sin(t * 3))})`;
      ctx.font = `700 ${Math.round(S * 0.05)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`¡Dale ${HITS - cracks} ${HITS - cracks === 1 ? 'golpe' : 'golpes'}! Toca la piñata`, w / 2, h * 0.92);
    }

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (t < 0.8) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - t / 0.8})`;
      ctx.fillRect(0, 0, w, h);
    }
  };
}
