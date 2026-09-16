import {
  TAU, clamp, lerp, particleQuality, qualityGovernor, getParticleRenderer,
  viewProjection, projectVP, drawParticles2D,
} from './util.js';

// Textos y aspecto viven en la tarjeta compartida. Estas posiciones son geometría, no contenido.
const DEFAULT_MEMORIES = ['Te amo', 'Mi vida', 'Siempre contigo', 'Eres increíble', 'Gracias por existir', 'Mi lugar favorito eres tú'];
const FLOWERS = [
  { position: [-0.96, 1.30, -0.2], size: 0.33, petals: 12, phase: 0.3 },
  { position: [0.98, 1.53, -1.6], size: 0.38, petals: 13, phase: 1.9 },
  { position: [-0.82, -0.08, -2.4], size: 0.28, petals: 10, phase: 3.4 },
  { position: [0.67, 0.05, 0.55], size: 0.34, petals: 12, phase: 4.7 },
  { position: [-0.70, 2.59, -3.4], size: 0.27, petals: 11, phase: 2.6 },
  { position: [0.73, 2.69, -0.65], size: 0.27, petals: 10, phase: 5.8 },
  { position: [-0.22, 3.05, -2.1], size: 0.23, petals: 11, phase: 0.9 },
  { position: [0.15, -0.45, -1.9], size: 0.22, petals: 10, phase: 3.1 },
  { position: [-0.48, 0.62, 1.1], size: 0.22, petals: 12, phase: 5.2 },
];
const DEFAULTS = { recipientName: '', senderName: '', title: 'Para mi persona favorita',
  letter: 'Si pudiera guardar un instante para siempre, elegiría cualquiera contigo. Gracias por iluminar mi universo.',
  primaryColor: '#ffd75a', secondaryColor: '#ff9d3c', memories: DEFAULT_MEMORIES };

const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
function color(hex, fallback) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) hex = fallback;
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
function config(card) {
  const memories = (card?.mem || '').split('|').map((x) => x.trim().slice(0, 40)).filter(Boolean);
  return {
    recipientName: card?.p || DEFAULTS.recipientName,
    senderName: card?.d || DEFAULTS.senderName,
    title: card?.lt || DEFAULTS.title,
    letter: card?.l || card?.m || DEFAULTS.letter,
    primaryColor: color(card?.c1, DEFAULTS.primaryColor),
    secondaryColor: color(card?.c2, DEFAULTS.secondaryColor),
    primaryHex: /^#[0-9a-f]{6}$/i.test(card?.c1 || '') ? card.c1 : DEFAULTS.primaryColor,
    secondaryHex: /^#[0-9a-f]{6}$/i.test(card?.c2 || '') ? card.c2 : DEFAULTS.secondaryColor,
    memories: memories.length ? memories.slice(0, FLOWERS.length) : DEFAULT_MEMORIES,
  };
}
function rng(seed) {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let a = Math.imul(seed ^ seed >>> 15, 1 | seed);
    a = (a + Math.imul(a ^ a >>> 7, 61 | a)) ^ a; return ((a ^ a >>> 14) >>> 0) / 4294967296; };
}
function heartTarget(u, v) {
  const a = u * TAU;
  const shell = 0.74 + 0.26 * v;
  return [shell * 1.25 * Math.pow(Math.sin(a), 3),
    1.62 + shell * (0.81 * Math.cos(a) - 0.31 * Math.cos(2 * a) - 0.13 * Math.cos(3 * a) - 0.06 * Math.cos(4 * a)),
    -4.2 - (1 - v) * 0.8 + 0.13 * Math.sin(a * 3 + v * 8)];
}
function wrap(ctx, text, x, y, max, lineHeight) {
  const words = text.split(/\s+/);
  let line = '', row = 0;
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (line && ctx.measureText(next).width > max) { ctx.fillText(line, x, y + row++ * lineHeight); line = word; }
    else line = next;
  }
  if (line) ctx.fillText(line, x, y + row * lineHeight);
  return row + 1;
}

export default function create(ctx, w, h, dpr = 1, stage) {
  const q = particleQuality(w, h, 0.44);
  const renderer = getParticleRenderer();
  const rand = rng(12094);
  const stars = Math.round(q.count * 0.45);
  const portal = Math.round(q.count * 0.24);
  const heart = Math.round(q.count * 0.31);
  const count = stars + portal + heart;
  const pos = new Float32Array(count * 4);
  const col = new Float32Array(count * 4);
  const seed = new Float32Array(count * 4);
  const vp = new Float32Array(16);
  const govern = qualityGovernor();
  let density = 1, scale = q.scale, selected = -1, selectedAt = 0, letterOpen = false;
  let burst = null;
  const flowerScreen = [];
  let liveConfig = config(stage?.card);
  let cardRef = stage?.card;
  const aspect = w / h;
  const worldWidth = Math.max(3.9, 7.0 * aspect);

  for (let i = 0; i < count; i++) {
    const k = i * 4;
    seed[k] = rand(); seed[k + 1] = rand(); seed[k + 2] = rand(); seed[k + 3] = rand();
  }

  function point(i, x, y, z, intensity, rgb, size) {
    const k = i * 4;
    pos[k] = x; pos[k + 1] = y; pos[k + 2] = z; pos[k + 3] = intensity;
    col[k] = rgb[0]; col[k + 1] = rgb[1]; col[k + 2] = rgb[2]; col[k + 3] = size;
  }
  function projection(x, y, z) {
    const p = projectVP(vp, x, y, z);
    return { x: p[0] * w, y: (1 - p[1]) * h, depth: p[2] };
  }
  function drawFlower(f, i, t) {
    const appear = ease((t - 3.2 - i * 0.75) / 1.3);
    if (appear <= 0) return;
    const drift = Math.sin(t * (0.33 + i * 0.027) + f.phase) * 0.065;
    const p = projection(f.position[0] + drift, f.position[1] + Math.sin(t * 0.47 + f.phase) * 0.06, f.position[2]);
    const radius = clamp(f.size * h * 0.85 / p.depth, 15, 52) * appear;
    flowerScreen[i] = { x: p.x, y: p.y, r: radius };
    if (p.x < -80 || p.x > w + 80 || p.y < -80 || p.y > h + 80) return;
    const active = selected === i && t - selectedAt < 4;
    const r = radius * (active ? 1.15 + 0.07 * Math.sin((t - selectedAt) * 5) : 1);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(t * 0.22 + f.phase) * 0.07);
    ctx.globalAlpha = appear;
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.4);
    glow.addColorStop(0, 'rgba(255,193,63,.25)'); glow.addColorStop(1, 'rgba(255,193,63,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, TAU); ctx.fill();
    for (let j = 0; j < f.petals; j++) {
      const a = j * TAU / f.petals + Math.sin(t * 0.3 + f.phase) * 0.08;
      ctx.save(); ctx.rotate(a);
      const grad = ctx.createLinearGradient(0, -r * 0.15, 0, -r * 1.1);
      grad.addColorStop(0, '#624119'); grad.addColorStop(0.5, liveConfig.secondaryHex); grad.addColorStop(1, liveConfig.primaryHex);
      ctx.fillStyle = grad; ctx.beginPath(); ctx.ellipse(0, -r * 0.67, r * 0.16, r * 0.43, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#4a270d'; ctx.beginPath(); ctx.arc(0, 0, r * 0.31, 0, TAU); ctx.fill();
    ctx.fillStyle = '#de9a3b';
    for (let j = 0; j < 13; j++) {
      const a = j * 2.399; const rr = Math.sqrt(j / 13) * r * 0.27;
      ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, Math.max(0.7, r * 0.025), 0, TAU); ctx.fill();
    }
    ctx.restore();
    const phrase = liveConfig.memories[i % liveConfig.memories.length];
    if (t > 4.6 + i * 0.55 && phrase) {
      ctx.save(); ctx.globalAlpha = ease((t - 4.6 - i * 0.55) / 0.9) * (active ? 1 : 0.78);
      ctx.textAlign = 'center';
      ctx.font = `${active ? 600 : 500} ${clamp(w * 0.030, 10, 15)}px system-ui, sans-serif`;
      ctx.fillStyle = '#fff2ca'; ctx.shadowColor = '#000'; ctx.shadowBlur = 9;
      const words = phrase.split(' '), mid = Math.ceil(words.length / 2);
      if (ctx.measureText(phrase).width < w * 0.38) ctx.fillText(phrase, p.x, p.y + r + 17, w * 0.42);
      else {
        ctx.fillText(words.slice(0, mid).join(' '), p.x, p.y + r + 14, w * 0.42);
        ctx.fillText(words.slice(mid).join(' '), p.x, p.y + r + 27, w * 0.42);
      }
      ctx.restore();
    }
  }
  function drawLetter() {
    ctx.save(); ctx.filter = 'blur(4px)'; ctx.drawImage(ctx.canvas, 0, 0, w, h); ctx.restore();
    ctx.fillStyle = 'rgba(3,2,7,.77)'; ctx.fillRect(0, 0, w, h);
    const cw = Math.min(w * 0.86, 410), ch = Math.min(h * 0.75, 540);
    const x = (w - cw) / 2, y = (h - ch) / 2;
    ctx.shadowColor = '#d5a43a'; ctx.shadowBlur = 28;
    ctx.fillStyle = '#fff9e9'; ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 12); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#cfa75c'; ctx.lineWidth = 1; ctx.strokeRect(x + 12, y + 12, cw - 24, ch - 24);
    ctx.textAlign = 'center'; ctx.fillStyle = '#6c451e';
    ctx.font = `600 ${Math.min(24, w * 0.055)}px Georgia, serif`;
    ctx.fillText(liveConfig.title, w / 2, y + 62, cw - 50);
    ctx.fillStyle = '#b7893c'; ctx.font = '16px Georgia, serif'; ctx.fillText('✦  ✦  ✦', w / 2, y + 93);
    const bodySize = liveConfig.letter.length > 320 ? 13 : Math.min(17, w * 0.039);
    const lineHeight = bodySize + 5;
    ctx.fillStyle = '#4b392b'; ctx.font = `${bodySize}px Georgia, serif`;
    const lines = wrap(ctx, liveConfig.letter, w / 2, y + 126, cw - 62, lineHeight);
    ctx.font = 'italic 16px Georgia, serif';
    ctx.fillText(`Con amor, ${liveConfig.senderName || 'alguien especial'}`, w / 2, Math.min(y + ch - 36, y + 143 + lines * lineHeight), cw - 48);
    ctx.fillStyle = '#ffdf8b'; ctx.font = '600 14px system-ui, sans-serif'; ctx.fillText('✕  Cerrar', w / 2, y + ch + 32);
  }

  return function frame(t, dt) {
    if (stage && t > 10) stage.revealed = true;
    if (stage?.card !== cardRef) { cardRef = stage.card; liveConfig = config(cardRef); }
    if (govern(t)) { density *= 0.77; scale = Math.max(0.55, scale * 0.84); }
    const touch = stage?.taps?.splice(0) || [];
    for (const tap of touch) {
      if (letterOpen) { letterOpen = false; continue; }
      if (t > 6.8 && tap.y > h * 0.90 && tap.x > w * 0.16 && tap.x < w * 0.84) { letterOpen = true; continue; }
      for (let i = 0; i < liveConfig.memories.length; i++) {
        const p = flowerScreen[i];
        if (p && Math.hypot(tap.x - p.x, tap.y - p.y) < Math.max(28, p.r * 1.6)) {
          selected = i; selectedAt = t; burst = { x: FLOWERS[i].position[0], y: FLOWERS[i].position[1], z: FLOWERS[i].position[2], at: t }; break;
        }
      }
    }
    const mouse = stage?.pointer || { x: 0.5, y: 0.5 };
    const cameraX = Math.sin(t * 0.11) * 0.10 + (mouse.x - 0.5) * 0.16;
    const cameraY = 0.62 + Math.sin(t * 0.09) * 0.07 - (mouse.y - 0.5) * 0.09;
    const cameraZ = 7.6 - ease(t / 11) * 0.53 + Math.sin(t * 0.13) * 0.07;
    viewProjection(vp, [cameraX, cameraY, cameraZ], [0, 0.85, -1.35], w / h);
    const pColor = liveConfig.primaryColor, sColor = liveConfig.secondaryColor;
    const intro = ease((t - 0.4) / 2.5), portalOn = ease((t - 1.3) / 2.1);
    let n = 0;
    for (let i = 0; i < stars * density; i++, n++) {
      const k = i * 4, a = seed[k], b = seed[k + 1], c = seed[k + 2], d = seed[k + 3];
      const z = -8 + c * 9.7, x = (a - 0.5) * worldWidth * (1.0 + (7 - z) * 0.14);
      const y = (b - 0.5) * 8 + 0.7;
      const tw = 0.45 + 0.55 * Math.sin(t * (0.7 + d * 2) + a * 40);
      point(n, x + Math.sin(t * 0.08 + b * 30) * 0.018, y, z,
        intro * (0.11 + tw * 0.25) * (0.35 + 0.65 * c), [0.66 + d * 0.3, 0.48 + d * 0.42, 0.29 + d * 0.5], 0.008 + d * 0.014);
    }
    for (let i = 0; i < portal * density; i++, n++) {
      const k = (stars + i) * 4, a = seed[k], b = seed[k + 1], c = seed[k + 2], d = seed[k + 3];
      const radius = Math.sqrt(a) * 1.13;
      const spin = t * (0.35 + (1 - a) * 0.58) + radius * 5.0 + (i % 3) * TAU / 3 + b * 0.45;
      const x = Math.cos(spin) * radius;
      const z = 0.7 + Math.sin(spin) * radius * 0.52;
      const y = -1.0 + Math.sin(radius * 9 - t * 1.7 + c * 5) * 0.05 + (1 - a) * 0.12;
      const launch = ease((t - 2.8) / 1.4) * (i % 19 === 0 ? 1 : 0);
      point(n, x, y + launch * ((t * (0.45 + c * 0.4) + b * 2) % 2.8), z,
        portalOn * (0.24 + d * 0.52) * (0.8 + 0.2 * Math.sin(t * 3 + b * 10)),
        [lerp(sColor[0], pColor[0], a), lerp(sColor[1], pColor[1], a), lerp(sColor[2], pColor[2], a)],
        0.012 + c * 0.017);
    }
    const gather = ease((t - 6.2) / 3.7);
    for (let i = 0; i < heart * density; i++, n++) {
      const k = (stars + portal + i) * 4, a = seed[k], b = seed[k + 1], c = seed[k + 2], d = seed[k + 3];
      const target = heartTarget(a, b);
      const travel = ease((t - 6.0 - d * 1.9) / 2.7);
      const scatter = 1 - travel;
      const breath = 1 + gather * Math.sin(t * 1.35 + d * 0.7) * 0.022;
      const noise = Math.sin(t * (0.7 + c) + d * 19) * (0.018 + scatter * 0.11);
      const sx = (c - 0.5) * 2.2, sy = -1.0 + d * 0.1, sz = 0.4 + b * 0.5;
      let x = lerp(sx, target[0] * breath, travel) + noise;
      let y = lerp(sy, target[1] * breath, travel) + Math.sin(t + a * 22) * 0.018;
      let z = lerp(sz, target[2], travel) + Math.cos(t * 0.8 + b * 28) * 0.027;
      // Al tocar una flor, una onda atraviesa brevemente la geometría del corazón.
      if (burst && t - burst.at < 1.1) {
        const wave = Math.max(0, 1 - Math.abs(Math.hypot(x - burst.x, y - burst.y) - (t - burst.at) * 3) * 2);
        x += wave * 0.07 * (x - burst.x); y += wave * 0.07 * (y - burst.y);
      }
      point(n, x, y, z, (0.1 + travel * 1.05) * (0.55 + d * 0.45),
        [pColor[0], lerp(sColor[1], pColor[1], 0.55), lerp(sColor[2], pColor[2], 0.5)], 0.009 + c * 0.013);
    }
    const width = Math.max(1, Math.round(w * Math.min(dpr, 1.5) * scale));
    const height = Math.max(1, Math.round(h * Math.min(dpr, 1.5) * scale));
    if (renderer) {
      renderer.render({ width, height, vp, pos, col, count: n, px: height / (2 * Math.tan(19 * Math.PI / 180)),
        focus: 8, aperture: 0.035, maxSize: 16, trail: 0.12, time: t, owner: 'galaxia-flores',
        glow: [0.5, 0.28, portalOn * 0.21], glowColor: [pColor[0] * 0.12, pColor[1] * 0.075, pColor[2] * 0.03],
        beam: [0.5, 0.27, portalOn * 0.15], beamColor: [sColor[0] * 0.18, sColor[1] * 0.12, sColor[2] * 0.05],
        bg: [0.0015, 0.001, 0.002], exposure: 1.25 });
      ctx.drawImage(renderer.canvas, 0, 0, w, h);
    } else drawParticles2D(ctx, w, h, vp, pos, col, n, 8, 0.035, '#030207');
    for (let i = liveConfig.memories.length - 1; i >= 0; i--) drawFlower(FLOWERS[i], i, t);
    if (burst && t - burst.at < 0.8) {
      const center = projection(burst.x, burst.y, burst.z);
      const age = (t - burst.at) / 0.8;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - age;
      ctx.fillStyle = liveConfig.primaryHex;
      for (let i = 0; i < 24; i++) {
        const a = i * TAU / 24 + i * 0.13;
        const radius = (9 + i % 5 * 3) + age * (26 + i % 7 * 5);
        ctx.beginPath(); ctx.arc(center.x + Math.cos(a) * radius,
          center.y + Math.sin(a) * radius, 1.2 + i % 3 * 0.4, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    if (t > 6.8) {
      ctx.save(); ctx.textAlign = 'center'; ctx.globalAlpha = ease((t - 6.8) / 0.8);
      const labelY = h * 0.955;
      ctx.fillStyle = 'rgba(9,6,12,.82)'; ctx.beginPath();
      ctx.roundRect(w * 0.22, labelY - 19, w * 0.56, 28, 14); ctx.fill();
      ctx.fillStyle = '#f5d487'; ctx.font = `600 ${clamp(w * 0.037, 12, 17)}px system-ui, sans-serif`;
      ctx.fillText('✦  Haz clic aquí  ✦', w / 2, labelY); ctx.restore();
    }
    if (letterOpen) drawLetter();
  };
}
