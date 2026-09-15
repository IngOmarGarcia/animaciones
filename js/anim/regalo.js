import { TAU, clamp, rand, pick, lerp, easeOutCubic, shade } from './util.js';

// ✏️ Colores de la caja, el listón, la luz y el confeti
const BOX = '#d6336c';
const RIBBON = '#ffd43b';
const GLOW = [255, 214, 140];
const CONFETTI = ['#ffd43b', '#ff8fab', '#74c0fc', '#b2f2bb', '#ffffff', '#f783ac'];

// Guion en segundos desde que se toca la caja
const POP = 0.55; // la tapa sale volando
const RISE = 0.7; // empieza a subir el corazón
const PEAK = 1.2; // momento WOW
const REVEAL = 1.4; // aparece el mensaje

const smoothstep = (x) => x * x * (3 - 2 * x);
const rgba = ([r, g, b], a) => `rgba(${r}, ${g}, ${b}, ${Math.max(0, a)})`;

// Caras de un cubo: vértices por bits (x = 1, y = 2, z = 4) y esquina/aristas para mapear el papel.
const FACES = [
  { n: [0, 1, 0], poly: [6, 7, 3, 2], o: 6, e1: 7, e2: 2, top: true },
  { n: [0, 0, 1], poly: [6, 7, 5, 4], o: 6, e1: 7, e2: 4 },
  { n: [0, 0, -1], poly: [3, 2, 0, 1], o: 3, e1: 2, e2: 1 },
  { n: [1, 0, 0], poly: [7, 3, 1, 5], o: 7, e1: 3, e2: 5 },
  { n: [-1, 0, 0], poly: [2, 6, 4, 0], o: 2, e1: 6, e2: 0 },
];

// `stage` lo pasa el reproductor: { taps: [], revealed }. Sin stage (grabador de video) se abre sola.
export default function create(ctx, w, h, dpr = 1, stage) {
  const S = Math.min(w, h * 0.62);
  const U = S * 0.36;
  const D = S * 3.4;
  const cx = w / 2;
  const cy = h * 0.74;
  const scale = Math.min(2, Math.max(1, dpr));
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const autoOpen = stage && !stage.auto ? 6 : 2.5;
  const L = normalize3(-0.5, 0.85, -0.55);

  // Fondo borgoña con bokeh, dibujado pequeño y ampliado para desenfocarlo
  const blur = 6;
  const small = document.createElement('canvas');
  small.width = Math.ceil((w * scale) / blur);
  small.height = Math.ceil((h * scale) / blur);
  const s = small.getContext('2d');
  s.scale(scale / blur, scale / blur);
  const base = s.createRadialGradient(cx, h * 0.45, 0, cx, h * 0.45, Math.max(w, h) * 0.9);
  base.addColorStop(0, '#4a1030');
  base.addColorStop(0.55, '#1f0614');
  base.addColorStop(1, '#070105');
  s.fillStyle = base;
  s.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) {
    const warm = Math.random() < 0.6;
    s.fillStyle = warm ? `rgba(255, 190, 110, ${rand(0.15, 0.4)})` : `rgba(255, 110, 170, ${rand(0.12, 0.35)})`;
    s.beginPath();
    s.arc(rand(0, w), rand(0, h * 0.7), S * rand(0.04, 0.13), 0, TAU);
    s.fill();
  }
  const backdrop = document.createElement('canvas');
  backdrop.width = Math.ceil(w * scale);
  backdrop.height = Math.ceil(h * scale);
  const bctx = backdrop.getContext('2d');
  bctx.imageSmoothingQuality = 'high';
  bctx.drawImage(small, 0, 0, backdrop.width, backdrop.height);

  let camYaw = -0.62;
  const pitch = -0.42;
  const project = (x, y, z) => {
    const x1 = x * Math.cos(camYaw) + z * Math.sin(camYaw);
    const z1 = -x * Math.sin(camYaw) + z * Math.cos(camYaw);
    const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
    const f = D / (D + z2 * U);
    return { x: cx + x1 * U * f, y: cy - y2 * U * f, z: z2, f };
  };
  const cameraZ = (n) => n.y * Math.sin(pitch) + (-n.x * Math.sin(camYaw) + n.z * Math.cos(camYaw)) * Math.cos(pitch);

  // Caras visibles de un prisma, ordenadas de atrás hacia adelante
  function cuboid(c) {
    const rx = c.rx || 0;
    const ry = c.ry || 0;
    const rot = (px, py, pz) => {
      const y1 = py * Math.cos(rx) - pz * Math.sin(rx);
      const z1 = py * Math.sin(rx) + pz * Math.cos(rx);
      return [px * Math.cos(ry) + z1 * Math.sin(ry), y1, -px * Math.sin(ry) + z1 * Math.cos(ry)];
    };
    const verts = [];
    for (let i = 0; i < 8; i++) {
      const [x, y, z] = rot((i & 1 ? 0.5 : -0.5) * c.sx, (i & 2 ? 0.5 : -0.5) * c.sy, (i & 4 ? 0.5 : -0.5) * c.sz);
      verts.push(project(c.x + x, (c.y + y) * (c.mirror ? -1 : 1), c.z + z));
    }
    return FACES.map((face) => {
      const [nx, ny, nz] = rot(...face.n);
      const n = { x: nx, y: c.mirror ? -ny : ny, z: nz };
      return { ...face, n, verts, depth: face.poly.reduce((sum, i) => sum + verts[i].z, 0) / 4 };
    }).filter((face) => cameraZ(face.n) < 0).sort((a, b) => b.depth - a.depth);
  }

  const outline = (face) => {
    ctx.beginPath();
    face.poly.forEach((i, k) => (k ? ctx.lineTo(face.verts[i].x, face.verts[i].y) : ctx.moveTo(face.verts[i].x, face.verts[i].y)));
    ctx.closePath();
  };

  // Cara con papel de regalo: luz según la normal, lunares, listón y brillo mapeados a la cara
  const drawFace = (face, { detail = true, interior = false, glow = 0, sheen = 0.4 }) => {
    const light = Math.max(0, face.n.x * L.x + face.n.y * L.y + face.n.z * L.z);
    const amount = -0.45 + light * 0.55;
    ctx.save();
    outline(face);
    if (interior) {
      ctx.fillStyle = '#1a0610';
      ctx.fill();
      ctx.clip();
      const o = face.verts[face.o];
      const far = face.verts[face.poly[2]];
      const g = ctx.createRadialGradient((o.x + far.x) / 2, (o.y + far.y) / 2, 0, (o.x + far.x) / 2, (o.y + far.y) / 2, U * 0.7);
      g.addColorStop(0, rgba(GLOW, 0.95 * glow));
      g.addColorStop(1, rgba([120, 20, 60], 0.3 * glow));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.fillStyle = shade(BOX, amount);
    ctx.fill();
    if (detail) {
      ctx.clip();
      const O = face.verts[face.o];
      const A = face.verts[face.e1];
      const B = face.verts[face.e2];
      ctx.transform(A.x - O.x, A.y - O.y, B.x - O.x, B.y - O.y, O.x, O.y);
      const depth = ctx.createLinearGradient(0, 0, 0, 1);
      depth.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
      depth.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
      ctx.fillStyle = depth;
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          ctx.beginPath();
          ctx.arc((i + 0.3 + (j % 2) * 0.4) / 5, (j + 0.5) / 5, 0.035, 0, TAU);
          ctx.fill();
        }
      }
      const bands = face.top ? [[0.44, 0, 0.12, 1], [0, 0.44, 1, 0.12]] : [[0.44, 0, 0.12, 1]];
      for (const [x, y, bw, bh] of bands) {
        const band = ctx.createLinearGradient(x, y, bw < 1 ? x + bw : x, bh < 1 ? y + bh : y);
        band.addColorStop(0, shade(RIBBON, amount - 0.1));
        band.addColorStop(0.5, shade(RIBBON, amount + 0.2));
        band.addColorStop(1, shade(RIBBON, amount - 0.1));
        ctx.fillStyle = band;
        ctx.fillRect(x, y, bw, bh);
      }
      const shine = ctx.createLinearGradient(0, 0, 1, 1);
      const at = clamp(sheen, 0.05, 0.8);
      shine.addColorStop(0, 'rgba(255, 255, 255, 0)');
      shine.addColorStop(at, 'rgba(255, 255, 255, 0.2)');
      shine.addColorStop(Math.min(1, at + 0.18), 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = shine;
      ctx.fillRect(0, 0, 1, 1);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    outline(face);
    ctx.stroke();
  };

  // Moño de listón en la tapa; `untie` (0..1) lo desata
  const drawBow = (p, untie, t) => {
    const size = U * 0.28 * p.f * (1 - untie);
    if (size < 0.5) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(untie * 0.8);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.rotate(-0.25 + Math.sin(t * 2 + side) * 0.04);
      const g = ctx.createLinearGradient(0, -size, size * 1.2, size * 0.3);
      g.addColorStop(0, shade(RIBBON, 0.25));
      g.addColorStop(0.5, shade(RIBBON, -0.05));
      g.addColorStop(1, shade(RIBBON, -0.35));
      ctx.fillStyle = shade(RIBBON, -0.2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size * 0.55, size * 0.95);
      ctx.lineTo(size * 0.32, size * 1.0);
      ctx.lineTo(size * 0.1, size * 0.2);
      ctx.fill();
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(size * 0.3, -size * 1.1, size * 1.35, -size * 0.9, size * 1.05, -size * 0.15);
      ctx.bezierCurveTo(size * 0.9, size * 0.3, size * 0.35, size * 0.2, 0, 0);
      ctx.fill();
      ctx.fillStyle = shade(RIBBON, -0.5);
      ctx.beginPath();
      ctx.ellipse(size * 0.55, -size * 0.4, size * 0.22, size * 0.11, -0.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = shade(RIBBON, 0.05);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.22, size * 0.18, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  const drawHeart = (x, y, size, spin, glow) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2.4);
    halo.addColorStop(0, `rgba(255, 120, 165, ${0.5 * glow})`);
    halo.addColorStop(1, 'rgba(255, 120, 165, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(-size * 2.4, -size * 2.4, size * 4.8, size * 4.8);
    ctx.globalCompositeOperation = 'source-over';
    const turn = Math.cos(spin);
    ctx.scale(Math.max(0.1, Math.abs(turn)), 1);
    ctx.scale(size, size);
    ctx.beginPath();
    ctx.moveTo(0, -0.22);
    ctx.bezierCurveTo(0, -0.52, -0.5, -0.52, -0.5, -0.17);
    ctx.bezierCurveTo(-0.5, 0.13, 0, 0.38, 0, 0.6);
    ctx.bezierCurveTo(0, 0.38, 0.5, 0.13, 0.5, -0.17);
    ctx.bezierCurveTo(0.5, -0.52, 0, -0.52, 0, -0.22);
    const body = ctx.createRadialGradient(-0.18, -0.2, 0.02, 0, 0, 0.75);
    body.addColorStop(0, turn > 0 ? '#ffd0dd' : '#e8a0b4');
    body.addColorStop(0.45, turn > 0 ? '#f03e6e' : '#c2255c');
    body.addColorStop(1, '#7a0f33');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.ellipse(-0.22, -0.22, 0.09, 0.05, -0.6, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  const confetti = Array.from({ length: calm ? 40 : 110 }, () => ({
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rot: rand(0, TAU), spin: rand(-10, 10), size: rand(0.025, 0.05), color: pick(CONFETTI), landed: false,
  }));
  const sparkles = Array.from({ length: calm ? 12 : 30 }, () => ({
    a: rand(0, TAU), r: rand(0.35, 0.95), dy: rand(-0.3, 0.4), speed: rand(0.4, 1.2), phase: rand(0, TAU), size: rand(0.6, 1.6),
  }));
  const vignette = ctx.createRadialGradient(cx, h * 0.55, S * 0.35, cx, h * 0.55, Math.max(w, h) * 0.8);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.7)');

  let openAt = null;
  let launched = false;

  return (t, dt) => {
    // Un toque (o la espera) abre el regalo
    if (openAt === null) {
      const tapped = stage && stage.taps.length > 0 && t > 0.3;
      if (tapped || t >= autoOpen) openAt = t;
    }
    if (stage) stage.taps.length = 0;
    const q = openAt === null ? -1 : t - openAt;
    if (stage && q >= REVEAL) stage.revealed = true;

    camYaw = -0.62 + Math.sin(t * 0.3) * 0.08;
    const intro = smoothstep(clamp(t / 0.9));
    const burst = q >= POP ? Math.exp(-(q - POP) * 2) : 0;
    const glow = q >= POP ? clamp((q - POP) / 0.3) : 0;

    // Estado de la caja: saltitos de espera, aplastarse, temblar y rebotar al abrirse
    let hop = 0;
    let wobble = 0;
    let squash = 1;
    let shake = 0;
    if (q < 0) {
      const phase = t % 1.7;
      if (t > 0.9 && phase < 0.4 && !calm) {
        const k = phase / 0.4;
        hop = Math.sin(k * Math.PI) * 0.07;
        wobble = Math.sin(k * TAU * 2) * 0.05;
      }
    } else if (q < POP) {
      const k = q / POP;
      squash = 1 - 0.12 * smoothstep(k);
      shake = calm ? 0 : Math.sin(q * 70) * 0.03 * k;
    } else {
      squash = 1 + 0.08 * Math.exp(-(q - POP) * 8) * Math.cos((q - POP) * 25);
    }
    const bodyH = 0.8 * squash;
    const wide = 1 + (1 - squash) * 0.6;
    const body = { x: shake, y: bodyH / 2 + hop, z: 0, sx: wide, sy: bodyH, sz: wide, ry: wobble };

    let lid;
    if (q < POP) {
      lid = { x: shake, y: bodyH + hop + 0.07, z: 0, sx: 1.08 * wide, sy: 0.18, sz: 1.08 * wide, ry: wobble, rx: 0 };
    } else {
      const k = clamp((q - POP) / 1);
      const bounce = q - POP > 1 ? Math.abs(Math.sin((q - POP - 1) * 9)) * 0.08 * Math.exp(-(q - POP - 1) * 4) : 0;
      lid = {
        x: lerp(0, 1.2, k), z: lerp(0, 0.4, k), y: lerp(0.87, 0.09, k) + 4 * 1.3 * k * (1 - k) + bounce,
        sx: 1.08, sy: 0.18, sz: 1.08, rx: TAU * easeOutCubic(k), ry: 0.4 + 2 * k,
      };
    }

    ctx.drawImage(backdrop, 0, 0, w, h);

    // Reflector desde arriba
    ctx.globalCompositeOperation = 'lighter';
    const top = project(0, 2.6, 0);
    const spot = ctx.createLinearGradient(top.x, 0, top.x, cy);
    spot.addColorStop(0, rgba(GLOW, 0.14 * intro + 0.1 * burst));
    spot.addColorStop(1, rgba(GLOW, 0));
    ctx.fillStyle = spot;
    ctx.beginPath();
    ctx.moveTo(top.x - U * 0.15, 0);
    ctx.lineTo(top.x + U * 0.15, 0);
    ctx.lineTo(cx + U * 1.5, cy);
    ctx.lineTo(cx - U * 1.5, cy);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Reflejo en el piso brillante y sombra
    ctx.globalAlpha = 0.16;
    for (const face of cuboid({ ...body, mirror: true })) drawFace(face, { detail: false });
    ctx.globalAlpha = 1;
    const floor = ctx.createLinearGradient(0, cy - U * 0.1, 0, h);
    floor.addColorStop(0, 'rgba(12, 2, 8, 0.2)');
    floor.addColorStop(1, 'rgba(12, 2, 8, 0.92)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, cy - U * 0.1, w, h);
    const ground = project(0, 0, 0);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.45 - hop * 2})`;
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y, U * 0.95 * ground.f * (1 - hop), U * 0.3 * ground.f, 0, 0, TAU);
    ctx.fill();

    if (q < 0 && stage && t > 0.9) {
      const pulse = (t * 0.8) % 1;
      ctx.strokeStyle = `rgba(255, 230, 200, ${0.5 * (1 - pulse)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * TAU;
        const p = project(Math.cos(a) * (0.85 + pulse * 0.6), 0, Math.sin(a) * (0.85 + pulse * 0.6));
        if (i) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Confeti detrás de la caja
    if (q >= POP && !launched) {
      launched = true;
      for (const c of confetti) {
        c.x = rand(-0.35, 0.35);
        c.y = 0.85;
        c.z = rand(-0.35, 0.35);
        c.vx = rand(-1.6, 1.6);
        c.vy = rand(2.2, 4.4);
        c.vz = rand(-1.6, 1.6);
      }
    }
    const pieces = [];
    if (launched) {
      for (const c of confetti) {
        if (!c.landed) {
          c.vy -= 5.5 * dt;
          const drag = 1 - Math.min(1, 0.8 * dt);
          c.vx *= drag;
          c.vz *= drag;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.z += c.vz * dt;
          c.rot += c.spin * dt;
          if (c.y <= 0.005) {
            c.y = 0.005;
            c.landed = true;
          }
        }
        pieces.push({ c, p: project(c.x, c.y, c.z) });
      }
    }
    const drawPieces = (list) => {
      for (const { c, p } of list) {
        const size = c.size * U * p.f;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(c.rot);
        ctx.scale(1, c.landed ? 0.35 : Math.cos(c.rot * 1.7));
        ctx.fillStyle = c.color;
        ctx.fillRect(-size / 2, -size * 0.3, size, size * 0.6);
        ctx.restore();
      }
    };
    drawPieces(pieces.filter(({ p }) => p.z > 0));

    // Caja y tapa (la tapa en vuelo se dibuja detrás si queda más lejos)
    const lidFaces = cuboid(lid);
    const lidDepth = project(lid.x, lid.y, lid.z).z;
    const bodyDepth = project(0, 0.4, 0).z;
    const sheen = 0.35 + Math.sin(t * 0.5) * 0.15;
    const drawLid = () => {
      for (const face of lidFaces) drawFace(face, { sheen });
      if (q < POP + 0.2) {
        const untie = q < 0 ? 0 : clamp((q - 0.3) / 0.35);
        const c = Math.cos(lid.rx);
        drawBow(project(lid.x, lid.y + 0.09 * c, lid.z + 0.09 * Math.sin(lid.rx)), untie, t);
      }
    };
    if (q >= POP && lidDepth > bodyDepth) drawLid();
    for (const face of cuboid(body)) {
      drawFace(face, { interior: face.top && q >= POP, glow, sheen });
    }

    // Luz que sale del interior
    if (q >= POP) {
      const mouth = project(body.x, bodyH, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.save();
      ctx.translate(mouth.x, mouth.y);
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.19 + Math.sin(t * 0.6 + i) * 0.04;
        const len = S * (1.1 + 0.25 * Math.sin(t * 0.9 + i * 1.7));
        ctx.fillStyle = rgba(GLOW, (0.05 + 0.12 * burst) * glow);
        ctx.beginPath();
        ctx.moveTo(-U * 0.2, 0);
        ctx.lineTo(Math.cos(a - 0.05) * len, Math.sin(a - 0.05) * len);
        ctx.lineTo(Math.cos(a + 0.05) * len, Math.sin(a + 0.05) * len);
        ctx.lineTo(U * 0.2, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      const flash = ctx.createRadialGradient(mouth.x, mouth.y, 0, mouth.x, mouth.y, U * 2.2);
      flash.addColorStop(0, rgba([255, 240, 210], 0.75 * burst));
      flash.addColorStop(1, rgba(GLOW, 0));
      ctx.fillStyle = flash;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (!(q >= POP && lidDepth > bodyDepth)) drawLid();

    // Corazón que sube, gira y late
    let heartPoint = null;
    if (q >= RISE) {
      const rise = easeOutCubic(clamp((q - RISE) / (PEAK - RISE + 0.35)));
      const hy = lerp(0.8, 1.85, rise) + (q > PEAK ? Math.sin((q - PEAK) * 1.6) * 0.05 : 0);
      heartPoint = project(0, hy, 0);
      const beat = q > PEAK ? 1 + 0.08 * Math.pow(Math.max(0, Math.sin(q * 5.5)), 8) : 1;
      drawHeart(heartPoint.x, heartPoint.y, U * 0.62 * heartPoint.f * (0.2 + 0.8 * rise) * beat, (1 - rise) * TAU * 1.5, rise);
    }

    // Momento WOW: onda de luz con dispersión y chispas alrededor del corazón
    ctx.globalCompositeOperation = 'lighter';
    if (heartPoint && q >= PEAK && q < PEAK + 1.2) {
      const k = (q - PEAK) / 1.2;
      [[255, 110, 150], [255, 220, 140], [140, 190, 255]].forEach((color, i) => {
        const radius = (0.25 + 2.6 * easeOutCubic(k)) * (1 + (i - 1) * 0.04 * k);
        ctx.strokeStyle = rgba(color, 0.6 * (1 - k));
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let j = 0; j <= 48; j++) {
          const a = (j / 48) * TAU;
          const p = project(Math.cos(a) * radius, 1.85, Math.sin(a) * radius);
          if (j) ctx.lineTo(p.x, p.y);
          else ctx.moveTo(p.x, p.y);
        }
        ctx.stroke();
      });
      const flash = ctx.createRadialGradient(heartPoint.x, heartPoint.y, 0, heartPoint.x, heartPoint.y, U * 2.5);
      flash.addColorStop(0, `rgba(255, 230, 240, ${0.7 * (1 - k) ** 2})`);
      flash.addColorStop(1, 'rgba(255, 150, 190, 0)');
      ctx.fillStyle = flash;
      ctx.fillRect(0, 0, w, h);
    }
    if (heartPoint && q > PEAK - 0.2) {
      const appear = clamp((q - PEAK + 0.2) / 0.5);
      for (const sp of sparkles) {
        const a = sp.a + t * sp.speed;
        const p = project(Math.cos(a) * sp.r, 1.85 + sp.dy + Math.sin(t + sp.phase) * 0.08, Math.sin(a) * sp.r);
        const twinkle = 0.5 + 0.5 * Math.sin(t * 4 + sp.phase);
        const size = sp.size * p.f * (S / 400) * (1.5 + twinkle * 2);
        ctx.strokeStyle = rgba([255, 236, 180], 0.9 * appear * twinkle);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x - size * 2, p.y);
        ctx.lineTo(p.x + size * 2, p.y);
        ctx.moveTo(p.x, p.y - size * 2);
        ctx.lineTo(p.x, p.y + size * 2);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    drawPieces(pieces.filter(({ p }) => p.z <= 0));

    if (q < 0 && stage && t > 0.9) {
      const alpha = clamp((t - 0.9) / 0.6) * (0.6 + 0.4 * Math.sin(t * 3));
      ctx.fillStyle = `rgba(255, 240, 225, ${alpha})`;
      ctx.font = `600 ${Math.round(S * 0.05)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Toca el regalo', cx, Math.min(h - S * 0.06, cy + U * 0.75));
    }

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (intro < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - intro})`;
      ctx.fillRect(0, 0, w, h);
    }
  };
}

function normalize3(x, y, z) {
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}
