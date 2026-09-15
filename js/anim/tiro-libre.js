import {
  TAU, clamp, rand, pick, lerp, easeOutCubic, mixPose, playerJoints, drawPlayer, makeSoccerBall, drawSoccerBall,
} from './util.js';

const KICK = 1.6;
const ARRIVE = 2.65;
const smoothstep = (x) => x * x * (3 - 2 * x);

const HOME = { shirt: '#c92a2a', shorts: '#f1f3f5', socks: '#c92a2a', skin: '#b97a50', hair: '#1a1410', boots: '#fcc419', accent: '#ffffff' };
const KEEPER = { shirt: '#82c91e', shorts: '#212529', socks: '#82c91e', skin: '#e2b08a', hair: '#4a2e14', boots: '#212529', accent: '#212529', gloves: '#f8f9fa' };
const RIM = { flat: 'rgba(255, 244, 214, 0.7)' };

const STAND = { x: 0, y: 0, lean: 2, bend: 0, head: 5, hipN: 5, kneeN: -6, ankleN: 0, hipF: -5, kneeF: -6, ankleF: 0, shN: -8, elN: 15, shF: 8, elF: 15 };
const PLANT = { ...STAND, lean: 10, bend: -4, head: 22, hipN: -40, kneeN: -100, ankleN: -20, hipF: 22, kneeF: -28, ankleF: -5, shN: 45, elN: 35, shF: -55, elF: 30 };
const STRIKE = { ...STAND, lean: -6, bend: -6, head: 25, hipN: 35, kneeN: -8, ankleN: -45, hipF: 10, kneeF: -22, ankleF: 0, shN: -45, elN: 30, shF: 70, elF: 25 };
const FOLLOW = { ...STAND, lean: -16, bend: -4, head: 5, hipN: 100, kneeN: -10, ankleN: -40, hipF: 4, kneeF: -14, ankleF: 5, shN: -80, elN: 20, shF: 95, elF: 15 };
const CHEER = { ...STAND, lean: -6, bend: -10, head: -28, hipN: 30, kneeN: -75, ankleN: 10, hipF: -8, kneeF: -12, ankleF: 0, shN: 165, elN: 15, shF: 150, elF: 25 };
const KEEPER_READY = { ...STAND, lean: 20, bend: 8, head: -8, hipN: 25, kneeN: -50, ankleN: 12, hipF: -12, kneeF: -48, ankleF: 12, shN: 45, elN: 55, shF: 35, elF: 55 };
const KEEPER_LEAP = { ...STAND, lean: -8, bend: -6, head: -20, hipN: 35, kneeN: -70, ankleN: 20, hipF: 5, kneeF: -40, ankleF: 20, shN: 175, elN: 5, shF: 168, elF: 8 };
const KEEPER_SAD = { ...STAND, lean: 12, bend: 10, head: 35, shN: -5, shF: 5 };

function runPose(phase) {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  return {
    ...STAND, lean: 14, bend: 4, head: 6,
    hipN: 40 * s, kneeN: -12 - 80 * Math.max(0, c), ankleN: 10 * s,
    hipF: -40 * s, kneeF: -12 - 80 * Math.max(0, -c), ankleF: -10 * s,
    shN: -40 * s, elN: 80, shF: 40 * s, elF: 80,
  };
}

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const H = S * 0.5;
  const scale = Math.min(2, Math.max(1, dpr));
  const groundY = h * 0.8;
  const ballR = H * 0.06;
  const ball = makeSoccerBall(ballR, scale);

  // Pies en el pasto (el grosor de la bota queda sobre la línea)
  const ground = (pose) => {
    const j = playerJoints(pose, H);
    const low = Math.max(j.legN.ankle.y, j.legN.toe.y, j.legN.heel.y, j.legF.ankle.y, j.legF.toe.y, j.legF.heel.y);
    return { ...pose, y: pose.y + groundY - low - H * 0.018 };
  };

  const ballX = w * 0.6;
  const strike = playerJoints(ground(STRIKE), H);
  const kickX = ballX - strike.legN.toe.x - ballR * 0.5;
  const goalX = ballX + w * 1.3;
  const keeperX = goalX - H * 0.35;
  const camGoal = goalX - w * 0.62;
  const camCheer = Math.max(0, kickX + H * 0.12 - w * 0.5);
  const parallax = 0.35;

  // Estadio de fondo: gradas con público, reflectores y vallas LED
  const standsTop = h * 0.2;
  const boardH = H * 0.13;
  const boardsY = groundY - H * 0.42;
  const bw = Math.ceil(w + (camGoal + w) * parallax);
  const backdrop = document.createElement('canvas');
  backdrop.width = Math.ceil(bw * scale);
  backdrop.height = Math.ceil(groundY * scale);
  const b = backdrop.getContext('2d');
  b.scale(scale, scale);
  const sky = b.createLinearGradient(0, 0, 0, standsTop);
  sky.addColorStop(0, '#03050c');
  sky.addColorStop(1, '#0c1830');
  b.fillStyle = sky;
  b.fillRect(0, 0, bw, standsTop);
  const stands = b.createLinearGradient(0, standsTop, 0, boardsY);
  stands.addColorStop(0, '#0d1220');
  stands.addColorStop(1, '#1f2937');
  b.fillStyle = stands;
  b.fillRect(0, standsTop, bw, boardsY - standsTop);
  const crowd = ['#e9ecef', '#c92a2a', '#f1f3f5', '#868e96', '#ffd43b', '#1c7ed6', '#495057'];
  const people = Math.min(9000, Math.round((bw * (boardsY - standsTop)) / 22));
  for (let i = 0; i < people; i++) {
    const y = rand(standsTop + 3, boardsY - 3);
    const depth = (y - standsTop) / (boardsY - standsTop);
    b.globalAlpha = 0.3 + 0.45 * depth;
    b.fillStyle = pick(crowd);
    b.beginPath();
    b.arc(rand(0, bw), y, 0.8 + depth * 1.6, 0, TAU);
    b.fill();
  }
  b.globalAlpha = 1;
  b.fillStyle = 'rgba(0, 0, 0, 0.35)';
  for (let k = 1; k < 6; k++) b.fillRect(0, standsTop + ((boardsY - standsTop) * k) / 6, bw, 1.5);
  b.fillStyle = '#05070d';
  b.fillRect(0, standsTop - h * 0.03, bw, h * 0.03);
  b.globalCompositeOperation = 'lighter';
  for (let x = w * 0.3; x < bw; x += w * 0.85) {
    const y = standsTop - h * 0.08;
    const glow = b.createRadialGradient(x, y, 0, x, y, S * 0.55);
    glow.addColorStop(0, 'rgba(210, 225, 255, 0.5)');
    glow.addColorStop(1, 'rgba(210, 225, 255, 0)');
    b.fillStyle = glow;
    b.fillRect(x - S * 0.55, y - S * 0.55, S * 1.1, S * 1.1);
    b.fillStyle = '#ffffff';
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 6; c++) {
        b.beginPath();
        b.arc(x - S * 0.05 + c * S * 0.02, y + r * S * 0.02, S * 0.006, 0, TAU);
        b.fill();
      }
    }
  }
  b.globalCompositeOperation = 'source-over';
  const led = ['#1c7ed6', '#e03131', '#f59f00', '#12b886', '#7048e8'];
  for (let x = 0; x < bw; x += S * 0.7) {
    const g = b.createLinearGradient(0, boardsY, 0, boardsY + boardH);
    g.addColorStop(0, pick(led));
    g.addColorStop(1, '#0b0f19');
    b.fillStyle = g;
    b.fillRect(x, boardsY, S * 0.68, boardH);
    b.fillStyle = 'rgba(255, 255, 255, 0.75)';
    b.fillRect(x + S * 0.08, boardsY + boardH * 0.38, S * 0.3, boardH * 0.14);
  }
  const far = b.createLinearGradient(0, boardsY + boardH, 0, groundY);
  far.addColorStop(0, '#1c5427');
  far.addColorStop(1, '#2b7a3a');
  b.fillStyle = far;
  b.fillRect(0, boardsY + boardH, bw, groundY - boardsY - boardH);

  // Textura de pasto que se repite y se desplaza con la cámara
  const tileW = Math.ceil(S);
  const tileH = Math.ceil(h - groundY + H * 0.05);
  const grass = document.createElement('canvas');
  grass.width = Math.ceil(tileW * scale);
  grass.height = Math.ceil(tileH * scale);
  const gg = grass.getContext('2d');
  gg.scale(scale, scale);
  for (let i = 0; i < (tileW * tileH) / 18; i++) {
    const x = rand(0, tileW);
    const y = rand(0, tileH);
    const depth = y / tileH;
    gg.strokeStyle = Math.random() < 0.5 ? `rgba(150, 220, 120, ${0.05 + depth * 0.1})` : `rgba(10, 40, 15, ${0.08 + depth * 0.12})`;
    gg.lineWidth = 0.6 + depth;
    gg.beginPath();
    gg.moveTo(x, y);
    gg.lineTo(x + rand(-1, 1), y - (1 + depth * 4));
    gg.stroke();
  }
  const pitch = ctx.createLinearGradient(0, groundY - H * 0.05, 0, h);
  pitch.addColorStop(0, '#2f8a3e');
  pitch.addColorStop(1, '#1b5626');
  const vignette = ctx.createRadialGradient(w / 2, h * 0.55, S * 0.4, w / 2, h * 0.55, Math.max(w, h) * 0.8);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.6)');

  function shooterAt(t) {
    const runEnd = 1.25;
    let pose;
    let x;
    if (t < runEnd) {
      pose = runPose(t * 11);
      x = lerp(w * 0.04, kickX - H * 0.12, t / runEnd);
    } else if (t < 1.45) {
      const k = smoothstep((t - runEnd) / 0.2);
      pose = mixPose(runPose(runEnd * 11), PLANT, k);
      x = lerp(kickX - H * 0.12, kickX, k);
    } else if (t < KICK) {
      pose = mixPose(PLANT, STRIKE, smoothstep((t - 1.45) / 0.15));
      x = kickX;
    } else if (t < 2) {
      pose = mixPose(STRIKE, FOLLOW, easeOutCubic((t - KICK) / 0.4));
      x = kickX + (t - KICK) * H * 0.3;
    } else if (t < 3.7) {
      pose = mixPose(FOLLOW, STAND, smoothstep(clamp((t - 2) / 0.5)));
      x = kickX + H * 0.12;
    } else {
      pose = mixPose(STAND, CHEER, smoothstep(clamp((t - 3.7) / 0.5)));
      x = kickX + H * 0.12;
    }
    const placed = ground({ ...pose, x, y: 0 });
    if (t > 4.2) placed.y -= Math.abs(Math.sin((t - 4.2) * 5)) * H * 0.14;
    return placed;
  }

  function keeperAt(t) {
    if (t < 2.2) {
      const pose = ground({ ...KEEPER_READY, x: keeperX, y: 0 });
      pose.y += Math.sin(t * 6) * H * 0.01;
      return pose;
    }
    if (t < 3.1) {
      const k = (t - 2.2) / 0.9;
      const lift = Math.sin(Math.PI * k);
      const pose = ground({ ...mixPose(KEEPER_READY, KEEPER_LEAP, lift), x: keeperX, y: 0 });
      pose.y -= lift * H * 0.45;
      return pose;
    }
    return ground({ ...mixPose(KEEPER_READY, KEEPER_SAD, smoothstep(clamp((t - 3.1) / 0.5))), x: keeperX, y: 0 });
  }

  const entry = { x: goalX + H * 0.14, y: groundY - H * 1.18 };
  const netBack = { x: goalX + H * 0.7, y: groundY - H * 0.55 };
  const rest = { x: goalX + H * 0.55, y: groundY - H * 0.1 - ballR };
  function ballAt(t) {
    if (t < KICK) return { x: ballX, y: groundY - ballR, spin: 0 };
    if (t < ARRIVE) {
      const k = (t - KICK) / (ARRIVE - KICK);
      return {
        x: lerp(ballX, entry.x, 1 - (1 - k) ** 1.6),
        y: lerp(groundY - ballR, entry.y, k) - Math.sin(k * Math.PI) * H * 0.9,
        spin: (t - KICK) * 25,
      };
    }
    if (t < ARRIVE + 0.25) {
      const k = (t - ARRIVE) / 0.25;
      return { x: lerp(entry.x, netBack.x, k), y: lerp(entry.y, netBack.y, k), spin: (t - KICK) * 25 };
    }
    const k = easeOutCubic(clamp((t - ARRIVE - 0.25) / 0.5));
    return { x: lerp(netBack.x, rest.x, k), y: lerp(netBack.y, rest.y, k), spin: (ARRIVE - KICK) * 25 + k * 2 };
  }

  function camAt(t) {
    if (t < 1.7) return 0;
    if (t < ARRIVE) return lerp(0, camGoal, smoothstep((t - 1.7) / (ARRIVE - 1.7)));
    if (t < 3.6) return camGoal;
    if (t < 4.5) return lerp(camGoal, camCheer, smoothstep((t - 3.6) / 0.9));
    return camCheer;
  }

  // Arco visto de lado: poste cercano, travesaño en perspectiva y red que se agita
  function drawGoal(camX, t) {
    const x = goalX - camX;
    const top = groundY - H * 1.3;
    const depth = H * 0.95;
    const lift = H * 0.12;
    const ripple = t > ARRIVE ? Math.exp(-(t - ARRIVE) * 3) * Math.sin((t - ARRIVE) * 18) : 0;
    const point = (u, v) => {
      const nearX = x;
      const nearY = lerp(top, groundY, v);
      const backX = lerp(x + depth * 0.7, x + depth, v);
      const backY = lerp(top - lift, groundY - lift * 0.3, v);
      const push = ripple * H * 0.08 * Math.sin(u * Math.PI) * Math.exp(-((v - 0.3) ** 2) / 0.08);
      return { x: lerp(nearX, backX, u) + push, y: lerp(nearY, backY, u) };
    };
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      for (let s = 0; s <= 10; s++) {
        const p = point(i / 10, s / 10);
        if (s) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      }
    }
    for (let s = 0; s <= 10; s++) {
      for (let i = 0; i <= 10; i++) {
        const p = point(i / 10, s / 10);
        if (i) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      }
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(240, 240, 240, 0.85)';
    ctx.lineWidth = H * 0.022;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + H * 0.28, top - H * 0.07);
    ctx.lineTo(x + H * 0.28, groundY - H * 0.07);
    ctx.stroke();
    const post = ctx.createLinearGradient(x - H * 0.02, 0, x + H * 0.02, 0);
    post.addColorStop(0, '#adb5bd');
    post.addColorStop(0.4, '#ffffff');
    post.addColorStop(1, '#ced4da');
    ctx.fillStyle = post;
    ctx.fillRect(x - H * 0.02, top - H * 0.01, H * 0.04, groundY - top + H * 0.01);
  }

  const figure = (pose, kit, camX, mirrored) => {
    const screen = { ...pose, x: pose.x - camX };
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(screen.x + H * 0.05, groundY + H * 0.01, H * 0.28, H * 0.04, 0, 0, TAU);
    ctx.fill();
    ctx.save();
    if (mirrored) {
      ctx.translate(screen.x, 0);
      ctx.scale(-1, 1);
      screen.x = 0;
    }
    ctx.save();
    ctx.translate(-H * 0.012, -H * 0.008);
    drawPlayer(ctx, screen, H, RIM);
    ctx.restore();
    drawPlayer(ctx, screen, H, kit);
    ctx.restore();
  };

  return (t) => {
    const camX = camAt(t);
    ctx.drawImage(backdrop, -camX * parallax, 0, bw, groundY);

    if (t > ARRIVE) {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) {
        if (Math.random() < 0.4) continue;
        ctx.globalAlpha = rand(0.5, 1);
        ctx.beginPath();
        ctx.arc(rand(0, w), rand(standsTop, boardsY), rand(1.5, 3), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = pitch;
    ctx.fillRect(0, groundY - H * 0.05, w, h - groundY + H * 0.05);
    const stripe = S * 0.5;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
    for (let k = Math.floor(camX / stripe); k * stripe - camX < w; k++) {
      if (k % 2 === 0) ctx.fillRect(k * stripe - camX, groundY - H * 0.05, stripe, h);
    }
    const offset = -(((camX % tileW) + tileW) % tileW);
    for (let x = offset; x < w; x += tileW) ctx.drawImage(grass, x, groundY - H * 0.05, tileW, tileH);

    const shot = ballAt(t);
    const goalOnScreen = goalX - camX < w * 1.5;
    if (goalOnScreen && t < ARRIVE) drawGoal(camX, t);
    if (goalOnScreen) figure(keeperAt(t), KEEPER, camX, true);

    const air = clamp((groundY - ballR - shot.y) / (H * 1.5));
    ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * (1 - air)})`;
    ctx.beginPath();
    ctx.ellipse(shot.x - camX, groundY, ballR * (1.2 + air), ballR * 0.3, 0, 0, TAU);
    ctx.fill();
    if (t > KICK && t < ARRIVE) {
      for (let k = 5; k >= 1; k--) {
        const past = ballAt(t - k * 0.025);
        ctx.globalAlpha = 0.12 * (6 - k) / 5;
        drawSoccerBall(ctx, ball, past.x - camX, past.y, past.spin);
      }
      ctx.globalAlpha = 1;
    }
    drawSoccerBall(ctx, ball, shot.x - camX, shot.y, shot.spin);
    if (goalOnScreen && t >= ARRIVE) drawGoal(camX, t);

    figure(shooterAt(t), HOME, camX, false);

    if (t > KICK && t < KICK + 0.15) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${1 - (t - KICK) / 0.15})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ballX - camX, groundY - ballR, ballR * (1.5 + (t - KICK) * 20), 0, TAU);
      ctx.stroke();
    }

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  };
}
