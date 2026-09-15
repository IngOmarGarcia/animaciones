import {
  TAU, clamp, rand, lerp, easeOutCubic, qpoint, mixPose, playerJoints, drawPlayer, makeSoccerBall, drawSoccerBall,
} from './util.js';

const CONTACT = 2.2;
const smoothstep = (x) => x * x * (3 - 2 * x);

const AWAY = { shirt: '#262b38', shorts: '#262b38', socks: '#262b38', skin: '#8a5634', hair: '#0c0c0c', boots: '#fd7e14', accent: '#fab005' };
const RIM = { flat: 'rgba(255, 238, 200, 0.9)' };
const GHOST = { flat: 'rgba(170, 200, 255, 0.1)' };

const READY = { x: 0, y: 0, lean: 4, bend: 0, head: -30, hipN: 8, kneeN: -18, ankleN: 0, hipF: -6, kneeF: -14, ankleF: 0, shN: 15, elN: 40, shF: -12, elF: 40 };
const CROUCH = { ...READY, lean: 22, bend: 6, head: -40, hipN: 50, kneeN: -95, ankleN: 20, hipF: 40, kneeF: -90, ankleF: 20, shN: -35, elN: 40, shF: -40, elF: 45 };
const TAKEOFF = { ...READY, lean: -35, bend: -6, head: -25, hipN: 15, kneeN: -35, ankleN: -20, hipF: 95, kneeF: -45, ankleF: -20, shN: 70, elN: 30, shF: 120, elF: 25 };
const SCISSOR = { ...READY, lean: -105, bend: -8, head: -10, hipN: 125, kneeN: -4, ankleN: -45, hipF: 35, kneeF: -30, ankleF: -20, shN: 95, elN: 20, shF: 150, elF: 30 };
const FALL = { ...READY, lean: -95, bend: 0, head: 5, hipN: 70, kneeN: -30, ankleN: -20, hipF: 30, kneeF: -45, ankleF: -10, shN: 70, elN: 15, shF: 120, elF: 20 };
const LYING = { ...READY, lean: -90, bend: 0, head: 12, hipN: 25, kneeN: -65, ankleN: 0, hipF: 8, kneeF: -20, ankleF: 0, shN: 175, elN: 40, shF: 80, elF: 20 };
const KEYS = [[0, READY], [0.9, READY], [1.25, CROUCH], [1.55, TAKEOFF], [CONTACT, SCISSOR], [2.75, FALL], [3.15, LYING]];

function poseAt(t) {
  for (let i = KEYS.length - 1; i >= 0; i--) {
    if (t < KEYS[i][0]) continue;
    const next = KEYS[i + 1];
    if (!next) return { ...KEYS[i][1] };
    return mixPose(KEYS[i][1], next[1], smoothstep((t - KEYS[i][0]) / (next[0] - KEYS[i][0])));
  }
  return { ...READY };
}

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const H = S * 0.58;
  const scale = Math.min(2, Math.max(1, dpr));
  const groundY = h * 0.84;
  const px = w * 0.56;
  const drift = (t) => clamp(t - 1.55, 0, 1.2) * H * 0.15;
  const lx = w * 0.84;
  const ly = h * 0.08;
  const ballR = H * 0.055;
  const ball = makeSoccerBall(ballR, scale);

  const ground = (pose) => {
    const j = playerJoints(pose, H);
    const low = Math.max(j.legN.ankle.y, j.legN.toe.y, j.legN.heel.y, j.legF.ankle.y, j.legF.toe.y, j.legF.heel.y);
    return { ...pose, y: pose.y + groundY - low - H * 0.018 };
  };
  const takeoffY = ground({ ...TAKEOFF, x: px }).y;
  const peakY = takeoffY - H * 0.5;
  const lieY = groundY - H * 0.06;

  function bodyAt(t) {
    const pose = poseAt(t);
    pose.x = px - drift(t);
    if (t < 1.55) return ground(pose);
    if (t < CONTACT) {
      pose.y = takeoffY - Math.sin(((t - 1.55) / (CONTACT - 1.55)) * (Math.PI / 2)) * H * 0.5;
      return pose;
    }
    const k = clamp((t - CONTACT) / 0.8);
    pose.y = lerp(peakY, lieY, k * k);
    return pose;
  }

  const contact = playerJoints({ ...SCISSOR, x: px - drift(CONTACT), y: peakY }, H).legN.toe;
  const ballStart = { x: w * 1.1, y: h * 0.12 };
  const ballCtrl = { x: w * 0.8, y: h * 0.02 };
  const exit = { x: -w * 0.3, y: h * 0.28 };

  // Estadio oscuro, reflector y pasto mojado pre-renderizados
  const backdrop = document.createElement('canvas');
  backdrop.width = Math.ceil(w * scale);
  backdrop.height = Math.ceil(h * scale);
  const b = backdrop.getContext('2d');
  b.scale(scale, scale);
  const sky = b.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, '#02030a');
  sky.addColorStop(1, '#0b1226');
  b.fillStyle = sky;
  b.fillRect(0, 0, w, groundY);
  b.fillStyle = '#04060d';
  b.beginPath();
  b.moveTo(0, h * 0.34);
  b.lineTo(0, h * 0.2);
  b.lineTo(w, h * 0.16);
  b.lineTo(w, groundY - H * 0.3);
  b.lineTo(0, groundY - H * 0.3);
  b.closePath();
  b.fill();
  for (let i = 0; i < 1400; i++) {
    const y = rand(h * 0.22, groundY - H * 0.32);
    b.fillStyle = `rgba(${Math.round(rand(80, 160))}, ${Math.round(rand(90, 150))}, ${Math.round(rand(110, 180))}, ${rand(0.1, 0.35)})`;
    b.fillRect(rand(0, w), y, 1.5, 1.5);
  }
  b.globalCompositeOperation = 'lighter';
  const glow = b.createRadialGradient(lx, ly, 0, lx, ly, S * 1.3);
  glow.addColorStop(0, 'rgba(210, 225, 255, 0.5)');
  glow.addColorStop(0.3, 'rgba(160, 185, 255, 0.15)');
  glow.addColorStop(1, 'rgba(120, 150, 255, 0)');
  b.fillStyle = glow;
  b.fillRect(0, 0, w, h);
  b.globalCompositeOperation = 'source-over';
  const turf = b.createLinearGradient(0, groundY, 0, h);
  turf.addColorStop(0, '#0f2616');
  turf.addColorStop(1, '#06120a');
  b.fillStyle = turf;
  b.fillRect(0, groundY, w, h - groundY);
  b.globalCompositeOperation = 'lighter';
  const wet = b.createRadialGradient(lx, groundY + (h - groundY) * 0.5, 0, lx, groundY + (h - groundY) * 0.5, S * 0.5);
  wet.addColorStop(0, 'rgba(170, 195, 255, 0.22)');
  wet.addColorStop(1, 'rgba(170, 195, 255, 0)');
  b.save();
  b.translate(lx, groundY + (h - groundY) * 0.5);
  b.scale(0.35, 1);
  b.translate(-lx, -(groundY + (h - groundY) * 0.5));
  b.fillStyle = wet;
  b.fillRect(0, groundY, w * 3, h - groundY);
  b.restore();
  b.globalCompositeOperation = 'source-over';

  const rain = Array.from({ length: Math.round((w * h) / 1500) }, () => ({
    x: rand(-w * 0.2, w * 1.1), y: rand(-h, h), len: rand(10, 22), speed: rand(700, 1100),
  }));
  const splashes = [];
  const spray = Array.from({ length: 30 }, () => {
    const a = rand(0, TAU);
    const v = S * rand(0.3, 1.1);
    return { vx: Math.cos(a) * v, vy: Math.sin(a) * v - S * 0.3, size: rand(1, 2.5) };
  });
  const vignette = ctx.createRadialGradient(w / 2, h * 0.55, S * 0.35, w / 2, h * 0.55, Math.max(w, h) * 0.8);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 10, 0.7)');

  return (t, dt) => {
    const slow = t > 1.5 && t < 2.6 ? 0.2 : 1;
    ctx.drawImage(backdrop, 0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(200, 215, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(px - S * 0.45, groundY + H * 0.1);
    ctx.lineTo(px + S * 0.35, groundY + H * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Lluvia iluminada por el reflector
    const buckets = [[], [], []];
    for (const d of rain) {
      d.y += d.speed * dt * slow;
      d.x -= d.speed * 0.18 * dt * slow;
      if (d.y > groundY + rand(0, h - groundY)) {
        if (splashes.length < 60) splashes.push({ x: d.x, y: d.y, age: 0 });
        d.y = rand(-h * 0.3, -10);
        d.x = rand(-w * 0.1, w * 1.2);
      }
      const lit = Math.max(0, 1 - Math.hypot(d.x - lx, d.y - ly) / (S * 1.4));
      buckets[lit > 0.5 ? 2 : lit > 0.15 ? 1 : 0].push(d);
    }
    ctx.lineWidth = 1;
    buckets.forEach((list, i) => {
      ctx.strokeStyle = `rgba(200, 215, 255, ${[0.14, 0.3, 0.55][i]})`;
      ctx.beginPath();
      for (const d of list) {
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.len * 0.18, d.y - d.len);
      }
      ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(200, 215, 255, 0.35)';
    for (let i = splashes.length - 1; i >= 0; i--) {
      const sp = splashes[i];
      sp.age += dt * slow;
      if (sp.age > 0.3) {
        splashes.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = 1 - sp.age / 0.3;
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y, 2 + sp.age * 20, 0.6 + sp.age * 5, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const body = bodyAt(t);
    const height = clamp((groundY - H * 0.45 - body.y) / (H * 0.6));
    ctx.fillStyle = `rgba(0, 0, 0, ${0.45 - 0.25 * height})`;
    ctx.beginPath();
    ctx.ellipse(body.x - H * 0.1, groundY + H * 0.02, H * (0.3 + 0.1 * height), H * 0.045, 0, 0, TAU);
    ctx.fill();

    // Estelas en cámara lenta
    if (t > 1.6 && t < 2.7) {
      for (const lag of [0.36, 0.24, 0.12]) drawPlayer(ctx, bodyAt(t - lag), H, GHOST);
    }
    ctx.save();
    ctx.translate(H * 0.014, -H * 0.012);
    drawPlayer(ctx, body, H, RIM);
    ctx.restore();
    drawPlayer(ctx, body, H, AWAY);

    // Balón
    if (t < CONTACT) {
      const k = clamp((t - 0.4) / (CONTACT - 0.4));
      const p = qpoint(ballStart, ballCtrl, contact, k);
      drawSoccerBall(ctx, ball, p.x, p.y, t * 4);
    } else if (t < CONTACT + 0.45) {
      const k = (t - CONTACT) / 0.45;
      const x = lerp(contact.x, exit.x, k);
      const y = lerp(contact.y, exit.y, k) - Math.sin(k * Math.PI) * h * 0.08;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = ballR * 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(lerp(contact.x, x, 0.6), lerp(contact.y, y, 0.6));
      ctx.stroke();
      drawSoccerBall(ctx, ball, x, y, t * 30);
    }

    // Impacto: anillo y gotas que salen disparadas
    const since = t - CONTACT;
    if (since > 0 && since < 0.6) {
      const q = since / 0.6;
      ctx.strokeStyle = `rgba(255, 255, 255, ${1 - q})`;
      ctx.lineWidth = 3 * (1 - q) + 0.5;
      ctx.beginPath();
      ctx.arc(contact.x, contact.y, S * (0.02 + 0.25 * easeOutCubic(q)), 0, TAU);
      ctx.stroke();
      ctx.fillStyle = `rgba(220, 235, 255, ${0.9 * (1 - q)})`;
      for (const p of spray) {
        ctx.beginPath();
        ctx.arc(contact.x + p.vx * since, contact.y + p.vy * since + S * 1.5 * since * since, p.size, 0, TAU);
        ctx.fill();
      }
      if (since < 0.12) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.35 * (1 - since / 0.12)})`;
        ctx.fillRect(0, 0, w, h);
      }
    }

    // Destello del reflector
    ctx.globalCompositeOperation = 'lighter';
    const flicker = 0.9 + 0.1 * Math.sin(t * 23);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * flicker})`;
    ctx.beginPath();
    ctx.arc(lx, ly, S * 0.025, 0, TAU);
    ctx.fill();
    const streak = ctx.createLinearGradient(lx - S * 0.6, 0, lx + S * 0.6, 0);
    streak.addColorStop(0, 'rgba(180, 200, 255, 0)');
    streak.addColorStop(0.5, `rgba(220, 230, 255, ${0.45 * flicker})`);
    streak.addColorStop(1, 'rgba(180, 200, 255, 0)');
    ctx.fillStyle = streak;
    ctx.fillRect(lx - S * 0.6, ly - 1.5, S * 1.2, 3);
    for (const [k, r, color] of [[0.35, 0.05, '120, 170, 255'], [0.7, 0.03, '255, 190, 120'], [1.3, 0.08, '150, 255, 200']]) {
      ctx.fillStyle = `rgba(${color}, 0.06)`;
      ctx.beginPath();
      ctx.arc(lerp(lx, w / 2, k), lerp(ly, h / 2, k), S * r, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  };
}
