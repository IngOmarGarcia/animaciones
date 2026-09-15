import {
  clamp, lerp, easeInOut, mixPose, textPoints,
  PARTICLE_TAN, particleQuality, getParticleRenderer, viewProjection, projectVP, drawParticles2D, qualityGovernor,
  STAND_POSE, bodyPose, makeBody, placeBody, ballPoints,
} from './util.js';

// ✏️ Jugador a adivinar, colores (r, g, b de 0 a 1) y textos
const NAME = 'MESSI';
const NUMBER = '10';
const GOLD = [1.0, 0.66, 0.24];
const CREAM = [1.0, 0.92, 0.76];
const EMBER = [0.72, 0.34, 0.1];
const HOOK = '¿QUIÉN ES?';

// Guion (segundos). REVEAL: [tiempo, fracción de puntos visibles]
const REVEAL = [[0, 0], [0.35, 0.05], [1.5, 0.1], [2.6, 0.2], [3.7, 0.36], [4.8, 0.6], [5.9, 0.82], [6.9, 1]];
const JUGGLE = 0.62; // periodo de cada dominada (con la zurda)
const LAUNCH = JUGGLE * 8; // último toque: el balón sube al cielo
const ORBIT = 7.3; // la cámara rodea al jugador hasta ver el número
const ORBIT_TIME = 1.6;
const DROP = 9.0; // el balón vuelve a caer
const IMPACT = 9.45; // lo golpea: el jugador explota y se forma el nombre
const TAN = PARTICLE_TAN;

const IDLE = { ...STAND_POSE, head: 0.5, lean: 0.08, bob: -0.03, knL: 0.2, knR: 0.3, hipR: 0.12, shL: 0.15, shR: 0.15, elL: 0.6, elR: 0.6, armOutL: 0.5, armOutR: 0.45 };
const TOUCH = { ...IDLE, hipL: 0.95, knL: 1.05, footL: -0.3, sway: -0.06, armOutL: 0.7, armOutR: 0.6, head: 0.6 };
const KICK_UP = { ...IDLE, hipL: 1.35, knL: 0.35, footL: 0.1, lean: -0.12, head: -0.35, armOutL: 0.9, armOutR: 0.8 };
const CELEBRATE = { ...STAND_POSE, head: -0.6, lean: -0.1, shL: 2.65, shR: 2.65, elL: 0.1, elR: 0.1, armOutL: -0.5, armOutR: -0.5, knL: 0.08, knR: 0.08, legOutL: 0.1, legOutR: 0.1 };

const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

function revealAt(t) {
  for (let i = 1; i < REVEAL.length; i++) {
    const [t1, f1] = REVEAL[i];
    if (t < t1) {
      const [t0, f0] = REVEAL[i - 1];
      return lerp(f0, f1, easeInOut((t - t0) / (t1 - t0)));
    }
  }
  return 1;
}

export default function create(ctx, w, h, dpr = 1) {
  const quality = particleQuality(w, h, 0.75);
  const renderer = getParticleRenderer();
  const total = renderer ? quality.count : Math.min(quality.count, 3000);
  const NB = Math.round(total * 0.64);
  const NBALL = Math.round(clamp(total * 0.04, 250, 700));
  const NG = Math.round(clamp(total * 0.05, 300, 900));
  const ND = Math.round(clamp(total * 0.06, 300, 1200));
  const TOTAL = NB + NBALL + NG + ND;
  const governor = qualityGovernor();
  let renderScale = quality.scale;
  let density = 1;

  // Encuadre: el jugador con los brazos arriba ocupa ~60% del alto
  const aspect = w / h;
  const D = Math.max(2.35 / (0.6 * 2 * TAN), 1.2 / (0.62 * 2 * TAN * aspect));
  const LOOK_Y = 1.02;

  // --- Jugador ---
  const body = makeBody(NB, { hair: 0.035, beard: 0.05, number: NUMBER });
  const J = new Float32Array(54);
  const touchJ = bodyPose(new Float32Array(54), TOUCH);
  const BALL_R = 0.11;
  const contact = { x: touchJ[39], y: touchJ[40] + BALL_R + 0.02, z: touchJ[41] + 0.03 };

  const bx = new Float32Array(NB); const by = new Float32Array(NB); const bz = new Float32Array(NB);
  const px = new Float32Array(NB); const py = new Float32Array(NB); const pz = new Float32Array(NB);
  const vx = new Float32Array(NB); const vy = new Float32Array(NB); const vz = new Float32Array(NB);
  const hx = new Float32Array(NB); const hy = new Float32Array(NB); const hz = new Float32Array(NB);
  const nx = new Float32Array(NB); const ny = new Float32Array(NB); const nz = new Float32Array(NB);
  const thr = new Float32Array(NB);
  const seen = new Float32Array(NB);
  const flash = new Float32Array(NB);
  const phase = new Float32Array(NB);
  const base = new Float32Array(NB);
  const size = new Float32Array(NB);
  const tint = new Uint8Array(NB); // 0 oro, 1 crema, 2 brasa
  const letter = new Uint8Array(NB);
  const orbit = new Float32Array(NB * 4);

  for (let i = 0; i < NB; i++) {
    const f = body.feat[i];
    thr[i] = f === 0 ? Math.pow(Math.random(), 1.1) : f === 3 ? 0.6 + Math.random() * 0.32 : 0.38 + Math.random() * 0.3;
    // Polvo inicial en una cáscara amplia alrededor del jugador
    let dx = gauss(); let dy = gauss(); let dz = gauss();
    const l = Math.hypot(dx, dy, dz) || 1;
    const r = 2.2 + Math.random() * 4;
    hx[i] = (dx / l) * r; hy[i] = LOOK_Y + (dy / l) * r * 0.8; hz[i] = (dz / l) * r;
    phase[i] = Math.random() * Math.PI * 2;
    const inner = body.rad[i] < 0.9;
    base[i] = f === 3 ? 1.0 : inner ? 0.28 : 0.55 + Math.random() * 0.35;
    tint[i] = f === 3 ? 1 : f === 1 || f === 2 ? 2 : Math.random() < 0.14 ? 1 : 0;
    size[i] = f === 3 ? 0.017 : 0.013 + Math.random() * 0.006;
  }

  // Nombre: plano de frente a la cámara cuando ya está detrás del jugador (su derecha en pantalla = -x)
  const pts = textPoints(NAME, 1000, 300, 2, 900);
  const worldW = Math.min(2 * D * TAN * aspect * 0.84, 2 * D * TAN);
  const k = worldW / 1000;
  const letterShare = clamp((pts.length * 1.2) / NB, 0.35, 0.6);
  for (let i = 0; i < NB; i++) {
    letter[i] = Math.random() < letterShare ? 1 : 0;
    if (letter[i] && pts.length) {
      const p = pts[Math.floor(Math.random() * pts.length)];
      nx[i] = -(p.x + (Math.random() - 0.5) * 2) * k;
      ny[i] = 1.2 - (p.y + (Math.random() - 0.5) * 2) * k;
      nz[i] = gauss() * 0.03;
    } else {
      const o = i * 4;
      orbit[o] = Math.random() * Math.PI * 2;
      orbit[o + 1] = (0.15 + Math.random() * 0.3) * (Math.random() < 0.75 ? 1 : -1);
      orbit[o + 2] = worldW * 0.5 * (0.9 + Math.random() * 0.9);
      orbit[o + 3] = 1.2 + gauss() * 0.7;
    }
  }

  // --- Balón, suelo y polvo ---
  const ball = ballPoints(NBALL);
  const gR = new Float32Array(NG); const gA = new Float32Array(NG); const gT = new Float32Array(NG);
  for (let i = 0; i < NG; i++) {
    gR[i] = 0.22 + Math.floor(Math.random() * 7) * 0.18 + gauss() * 0.012;
    gA[i] = Math.random() * Math.PI * 2;
    gT[i] = Math.random();
  }
  const dx0 = new Float32Array(ND); const dy0 = new Float32Array(ND); const dz0 = new Float32Array(ND);
  const dI = new Float32Array(ND); const dS = new Float32Array(ND); const dP = new Float32Array(ND);
  for (let i = 0; i < ND; i++) {
    dz0[i] = lerp(-10, D * 0.7, Math.pow(Math.random(), 0.8));
    const far = D - dz0[i];
    dx0[i] = (Math.random() * 2 - 1) * far * TAN * aspect * 1.2;
    dy0[i] = LOOK_Y + (Math.random() * 2 - 1) * far * TAN * 1.1;
    dI[i] = 0.05 + Math.random() * 0.18;
    dS[i] = 0.01 + Math.random() * 0.02;
    dP[i] = Math.random() * Math.PI * 2;
  }

  let lastT = -1;
  let burst = false;
  const reset = () => {
    burst = false;
    for (let i = 0; i < NB; i++) {
      px[i] = hx[i]; py[i] = hy[i]; pz[i] = hz[i];
      vx[i] = vy[i] = vz[i] = 0; seen[i] = -1; flash[i] = 0;
    }
  };
  reset();

  const vp = new Float32Array(16);
  const pos = new Float32Array(TOTAL * 4);
  const col = new Float32Array(TOTAL * 4);
  const eye = [0, 0, 0];
  const look = [0, LOOK_Y, 0];
  const glow = new Float32Array(3);
  const beam = new Float32Array(3);
  const COLORS = [GOLD, CREAM, EMBER];

  return (t, dt = 1 / 60) => {
    const restarted = t < lastT;
    lastT = t;
    if (restarted) reset();
    const step = Math.min(Math.max(dt, 0), 1 / 20);
    if (governor(t)) {
      renderScale = Math.max(0.5, renderScale * 0.82);
      density = Math.max(0.45, density * 0.75);
    }

    const frac = revealAt(t);

    // --- Pose del jugador y balón ---
    const ph = (t % JUGGLE) / JUGGLE;
    const near = ph < 0.5 ? ph : ph - 1;
    const lift = Math.exp(-(near / 0.17) * (near / 0.17));
    let pose;
    if (t < LAUNCH - 0.2) pose = mixPose(IDLE, TOUCH, lift);
    else if (t < LAUNCH + 0.12) pose = mixPose(mixPose(IDLE, TOUCH, lift), KICK_UP, clamp((t - LAUNCH + 0.2) / 0.3));
    else pose = mixPose(KICK_UP, CELEBRATE, easeInOut(clamp((t - LAUNCH - 0.12) / 0.8)));
    if (t > LAUNCH + 1) {
      pose.bob += 0.012 * Math.sin(t * 2.1);
      pose.shL += 0.05 * Math.sin(t * 1.7);
      pose.shR += 0.05 * Math.sin(t * 1.9 + 1);
    }
    bodyPose(J, pose);
    placeBody(body, J, 0, 0, 0, 0, bx, by, bz);

    let ballX = contact.x;
    let ballY = contact.y;
    let ballZ = contact.z;
    let ballOn = clamp((t - 0.2) / 0.4);
    if (t < LAUNCH) {
      ballY = contact.y + 4 * 0.8 * ph * (1 - ph);
    } else if (t < DROP) {
      const tau = t - LAUNCH;
      ballY = contact.y + 8.5 * tau - 4.9 * tau * tau;
      if (tau > 1.3) ballOn = 0;
    } else if (t < IMPACT) {
      const u = (t - DROP) / (IMPACT - DROP);
      ballX = 0; ballZ = 0.05;
      ballY = 7 - (7 - 1.95) * u * u;
    } else {
      ballOn = 0;
    }

    // --- Explosión al impacto ---
    if (!burst && t >= IMPACT) {
      burst = true;
      for (let i = 0; i < NB; i++) {
        let ex = px[i] + gauss() * 0.2;
        let ey = py[i] - 1.3 + gauss() * 0.2;
        let ez = pz[i] + gauss() * 0.2;
        const l = Math.hypot(ex, ey, ez) || 1;
        const sp = 2.5 + Math.random() * 5;
        vx[i] = (ex / l) * sp; vy[i] = (ey / l) * sp + 1; vz[i] = (ez / l) * sp - (Math.random() < 0.15 ? 3 : 0);
        seen[i] = Math.max(seen[i], 0);
      }
    }
    const tb = t - IMPACT;
    const nameMorph = burst ? easeInOut(clamp((tb - 0.5) / 0.9)) : 0;
    const numberGlow = !burst ? clamp((t - ORBIT - 0.9) / 0.6) : 0;

    // --- Cámara ---
    let yaw;
    if (t < ORBIT) yaw = 0.55 - 0.35 * easeInOut(clamp(t / ORBIT));
    else yaw = lerp(0.2, Math.PI, easeInOut(clamp((t - ORBIT) / ORBIT_TIME)));
    if (t > ORBIT + ORBIT_TIME) yaw += 0.05 * Math.sin((t - ORBIT - ORBIT_TIME) * 0.5);
    let dist = lerp(D * 1.14, D, easeInOut(clamp(t / 7)));
    if (burst) dist = lerp(dist, D * 1.04, easeInOut(clamp(tb / 1.5))) - Math.sin(clamp(tb / 0.4) * Math.PI) * 0.25;
    const shake = burst ? Math.exp(-tb * 8) * 0.05 : 0;
    eye[0] = Math.sin(yaw) * dist + Math.sin(t * 57) * shake;
    eye[1] = 0.85 + 0.08 * Math.sin(t * 0.3) + Math.cos(t * 49) * shake;
    eye[2] = Math.cos(yaw) * dist;
    viewProjection(vp, eye, look, aspect);
    const camSx = Math.sin(yaw);
    const camSz = Math.cos(yaw);

    let o = 0;
    const write = (x, y, z, I, c, s) => {
      const q = o * 4;
      pos[q] = x; pos[q + 1] = y; pos[q + 2] = z; pos[q + 3] = I;
      col[q] = c[0]; col[q + 1] = c[1]; col[q + 2] = c[2]; col[q + 3] = s;
      o++;
    };

    // --- Partículas del jugador ---
    for (let i = 0; i < NB; i++) {
      if (density < 1 && ((i * 7919) % 1000) / 1000 > density) continue;
      if (seen[i] < 0 && thr[i] <= frac) seen[i] = t;
      let tx;
      let ty;
      let tz;
      let stiff;
      let damp;
      let noise;
      let arrive = 0;
      if (!burst) {
        if (seen[i] >= 0) {
          arrive = clamp((t - seen[i]) / 0.8);
          stiff = 55 * arrive * arrive;
          damp = 2 * Math.sqrt(stiff) * 0.85 + 1.4 * (1 - arrive);
          noise = 0.5 * (1 - arrive) + 0.02;
          tx = bx[i]; ty = by[i]; tz = bz[i];
          if (arrive > 0.95 && flash[i] === 0) flash[i] = 1;
        } else {
          stiff = 0.6; damp = 0.9; noise = 0.18;
          tx = hx[i]; ty = hy[i]; tz = hz[i];
        }
      } else {
        const back = easeInOut(clamp((tb - 0.5) / 0.55));
        if (letter[i]) {
          tx = nx[i]; ty = ny[i]; tz = nz[i];
          stiff = 70 * back;
        } else {
          const q = i * 4;
          const a = orbit[q] + t * orbit[q + 1];
          tx = Math.cos(a) * orbit[q + 2]; tz = Math.sin(a) * orbit[q + 2] * 0.7; ty = orbit[q + 3];
          stiff = 6 * back;
        }
        damp = back > 0 ? 2 * Math.sqrt(stiff) * 0.85 + 0.4 : 1.1;
        noise = letter[i] ? 0.4 * (1 - back) + 0.02 : 0.2;
        arrive = 1;
      }
      const p = phase[i];
      vx[i] += (stiff * (tx - px[i]) - damp * vx[i] + Math.sin(py[i] * 2.1 + t * 0.9 + p) * noise) * step;
      vy[i] += (stiff * (ty - py[i]) - damp * vy[i] + Math.sin(pz[i] * 1.8 + t * 0.7 + p * 1.3) * noise) * step;
      vz[i] += (stiff * (tz - pz[i]) - damp * vz[i] + Math.sin(px[i] * 2.3 - t * 0.8 + p * 0.7) * noise) * step;
      px[i] += vx[i] * step; py[i] += vy[i] * step; pz[i] += vz[i] * step;
      if (flash[i] > 0) flash[i] = Math.max(0.001, flash[i] * Math.exp(-step * 3.5));

      let I;
      if (seen[i] < 0) {
        I = 0.06 * (0.6 + 0.4 * Math.sin(t * 1.3 + p * 5));
      } else {
        I = base[i] * (0.3 + 0.7 * arrive);
        if (!burst) {
          // Lo que mira a la cámara brilla más: se lee el volumen
          const facing = (px[i] * camSx + pz[i] * camSz) / 0.2;
          I *= 0.55 + 0.45 * clamp(facing * 0.5 + 0.5);
          // El número está en la espalda: solo se ve cuando la cámara ya está detrás
          if (body.feat[i] === 3) I *= clamp(-camSz * 1.5 + 0.1) * (1 + numberGlow * 2.2);
        } else {
          I = lerp(I * 0.7, letter[i] ? 0.8 : 0.28, nameMorph);
        }
        I *= 1 + flash[i] * 1.5;
        const tw = Math.sin(t * (1.1 + (p % 1.3)) + p * 7);
        if (tw > 0.97) I *= 1 + (tw - 0.97) * 50;
      }
      const c = burst && letter[i] && nameMorph > 0.5 ? (p % 1 < 0.25 ? CREAM : GOLD) : COLORS[tint[i]];
      const m = seen[i] >= 0 && !burst ? 0.004 : 0;
      write(px[i] + Math.sin(t * 1.9 + p * 5) * m, py[i] + Math.sin(t * 1.6 + p * 7) * m, pz[i], I, c, size[i] * (1 + flash[i] * 0.6));
    }

    // --- Balón ---
    const spin = t * 5;
    const cs = Math.cos(spin);
    const sn = Math.sin(spin);
    for (let i = 0; i < NBALL; i++) {
      const y1 = ball.y[i] * cs - ball.z[i] * sn;
      const z1 = ball.y[i] * sn + ball.z[i] * cs;
      const patch = ball.patch[i];
      write(ballX + ball.x[i] * BALL_R, ballY + y1 * BALL_R, ballZ + z1 * BALL_R, ballOn * (patch ? 0.25 : 0.6), patch ? EMBER : CREAM, 0.011);
    }

    // --- Suelo: anillos que vibran con cada toque ---
    const lastTouch = t < LAUNCH + 0.01 ? Math.floor(t / JUGGLE) * JUGGLE : LAUNCH;
    const rippleAge = t - lastTouch;
    const impactAge = burst ? tb : -1;
    for (let i = 0; i < NG; i++) {
      const r = gR[i];
      let boost = 0;
      if (rippleAge < 0.7) {
        const d = (r - (0.15 + rippleAge * 2.4)) / 0.09;
        boost += Math.exp(-d * d) * (1 - rippleAge / 0.7);
      }
      if (impactAge >= 0 && impactAge < 1.2) {
        const d = (r - impactAge * 3) / 0.15;
        boost += Math.exp(-d * d) * 2 * (1 - impactAge / 1.2);
      }
      const visible = gT[i] <= frac ? 1 : 0.15;
      const a = gA[i] + t * 0.08;
      write(Math.cos(a) * r + contact.x * 0.5, 0.002, Math.sin(a) * r, (0.1 + boost * 0.8) * visible * (burst ? lerp(1, 0.45, nameMorph) : 1), boost > 0.3 ? CREAM : GOLD, 0.012);
    }

    // --- Polvo dorado ---
    for (let i = 0; i < ND; i++) {
      const p = dP[i];
      write(
        dx0[i] + Math.sin(t * 0.15 + p) * 0.4,
        dy0[i] + ((t * 0.08 + p) % 3) - 1.5,
        dz0[i] + Math.cos(t * 0.12 + p * 2) * 0.3,
        dI[i] * clamp(t / 1.5) * (0.7 + 0.3 * Math.sin(t + p * 4)),
        EMBER,
        dS[i],
      );
    }

    // --- Render ---
    const feet = projectVP(vp, 0, 0, 0);
    const center = projectVP(vp, 0, 1.1, 0);
    glow[0] = center[0]; glow[1] = center[1]; glow[2] = 0.35 + 0.6 * frac;
    beam[0] = feet[0]; beam[1] = feet[1]; beam[2] = (burst ? 0.3 : 0.6) * clamp(t / 1.5);
    const trail = burst ? lerp(0.6, 0.2, clamp((tb - 0.6) / 1.2)) : lerp(0.45, 0.2, clamp((t - 6) / 1.5));
    const cssScale = Math.min(dpr, 2) * renderScale;
    const fbW = Math.max(2, Math.round(w * cssScale));
    const fbH = Math.max(2, Math.round(h * cssScale));
    const focus = Math.hypot(eye[0], eye[1] - 1, eye[2]);
    if (renderer) {
      renderer.render({
        width: fbW, height: fbH, vp, pos, col, count: o,
        px: fbH / (2 * TAN), focus, aperture: 0.035, maxSize: 40 * cssScale, trail,
        flash: burst ? Math.exp(-tb * 7) * 0.3 : 0,
        glow, beam,
        bg: [0.004, 0.0025, 0.001], glowColor: [0.06, 0.03, 0.008], beamColor: [0.3, 0.16, 0.04], flashColor: [0.9, 0.6, 0.3],
        exposure: 1.35, time: t, reset: restarted, owner: pos,
      });
      ctx.drawImage(renderer.canvas, 0, 0, w, h);
    } else {
      drawParticles2D(ctx, w, h, vp, pos, col, o, focus, 0.035, '#050302');
    }

    // --- Textos: pregunta y porcentaje ---
    const fs = Math.min(w * 0.075, h * 0.042);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const hookA = clamp(t / 0.3) * (1 - clamp((t - 6.6) / 0.5));
    if (hookA > 0) {
      ctx.font = `800 ${fs}px system-ui, "Segoe UI", sans-serif`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${fs * 0.18}px`;
      ctx.shadowColor = 'rgba(255, 170, 60, 0.8)';
      ctx.shadowBlur = fs * 0.8;
      ctx.fillStyle = `rgba(255, 244, 225, ${hookA})`;
      ctx.fillText(HOOK, w / 2, h * 0.1);
    }
    const countA = clamp((t - 0.3) / 0.3) * (1 - clamp((t - 7.9) / 0.6));
    if (countA > 0) {
      let keyT = 0;
      for (const [kt] of REVEAL) if (kt <= t) keyT = kt;
      const bump = 1 + 0.18 * Math.exp(-(t - keyT) * 7) + (t > 6.9 ? 0.12 * Math.sin(clamp((t - 6.9) / 0.4) * Math.PI) : 0);
      const big = fs * 2.3 * bump;
      ctx.font = `900 ${big}px system-ui, "Segoe UI", sans-serif`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ctx.shadowColor = 'rgba(255, 150, 40, 0.9)';
      ctx.shadowBlur = big * 0.35;
      ctx.fillStyle = `rgba(255, 196, 90, ${countA})`;
      ctx.fillText(`${Math.round(frac * 100)}%`, w / 2, h * 0.885);
    }
    ctx.restore();
  };
}
