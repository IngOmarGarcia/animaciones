import {
  clamp, lerp, easeInOut, mixPose, textPoints, cardName,
  PARTICLE_TAN, particleQuality, getParticleRenderer, viewProjection, projectVP, drawParticles2D, qualityGovernor,
  STAND_POSE, bodyPose, runPose, makeBody, placeBody, ballPoints,
} from './util.js';

// ✏️ Colores (r, g, b de 0 a 1) y textos
const MAGENTA = [1.0, 0.16, 0.7];
const VIOLET = [0.55, 0.24, 1.0];
const BLUE = [0.2, 0.36, 1.0];
const PINK = [1.0, 0.82, 0.96];
const FALLBACK = 'TE AMO';
const HOOK = '¿QUÉ ESTÁ ESCRIBIENDO?';

// Guion (segundos)
const START = 1.1; // arranca la carrera
const RUN = 8.0; // duración del recorrido
const CRANE = START + RUN + 0.1; // la cámara sube a vista cenital
const CRANE_TIME = 2.2;
const GLOW = CRANE + CRANE_TIME; // el nombre se enciende
const LETTER_H = 3.2; // alto de letra en metros (el jugador mide 1.8)
const PILLARS = 6;
const TAN = PARTICLE_TAN;

const READY = { ...STAND_POSE, lean: 0.12, head: 0.45, hipL: 0.35, knL: 0.35, footL: -0.2, shL: 0.2, shR: -0.1, armOutL: 0.35, armOutR: 0.3 };
const CELEBRATE = { ...STAND_POSE, head: -0.5, lean: -0.08, shL: 2.7, shR: 2.7, elL: 0.2, elR: 0.2, armOutL: -0.45, armOutR: -0.45 }; // brazo arriba: abrir es negativo

const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

// Recorrido continuo que escribe el texto: puntos finos del texto unidos por vecino más cercano
// (con preferencia a avanzar a la derecha). Un salto largo = el balón va por el aire.
function buildRoute(name) {
  const PXH = 240;
  const raw = textPoints(name, 3000, PXH, 3, 200);
  const MIN = 11;
  const cells = new Map();
  const kept = [];
  raw.sort((a, b) => a.x - b.x || a.y - b.y);
  for (const p of raw) {
    const cx = Math.floor(p.x / MIN);
    const cy = Math.floor(p.y / MIN);
    let ok = true;
    for (let i = -1; i <= 1 && ok; i++) {
      for (let j = -1; j <= 1 && ok; j++) {
        for (const q of cells.get(`${cx + i},${cy + j}`) || []) {
          if (Math.hypot(q.x - p.x, q.y - p.y) < MIN) { ok = false; break; }
        }
      }
    }
    if (!ok) continue;
    const key = `${cx},${cy}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(p);
    kept.push(p);
  }
  if (kept.length < 2) return null;
  const used = new Uint8Array(kept.length);
  let cur = 0;
  used[0] = 1;
  const order = [kept[0]];
  const jump = [false];
  for (let n = 1; n < kept.length; n++) {
    let best = -1;
    let bestCost = Infinity;
    let bestD = 0;
    const c = kept[cur];
    for (let i = 0; i < kept.length; i++) {
      if (used[i]) continue;
      const d = Math.hypot(kept[i].x - c.x, kept[i].y - c.y);
      const cost = d + 0.4 * Math.max(0, c.x - kept[i].x);
      if (cost < bestCost) { bestCost = cost; best = i; bestD = d; }
    }
    used[best] = 1;
    cur = best;
    order.push(kept[best]);
    jump.push(bestD > MIN * 2.6);
  }
  // Suaviza los tramos con balón en el suelo
  const k = LETTER_H / (PXH * 0.8 * 0.72);
  let xs = order.map((p) => p.x * k);
  let zs = order.map((p) => p.y * k);
  for (let pass = 0; pass < 2; pass++) {
    const nxs = xs.slice();
    const nzs = zs.slice();
    for (let i = 1; i < xs.length - 1; i++) {
      if (jump[i] || jump[i + 1]) continue;
      nxs[i] = (xs[i - 1] + xs[i] * 2 + xs[i + 1]) / 4;
      nzs[i] = (zs[i - 1] + zs[i] * 2 + zs[i + 1]) / 4;
    }
    xs = nxs;
    zs = nzs;
  }
  let minX = Infinity; let maxX = -Infinity; let minZ = Infinity; let maxZ = -Infinity;
  for (let i = 0; i < xs.length; i++) {
    minX = Math.min(minX, xs[i]); maxX = Math.max(maxX, xs[i]);
    minZ = Math.min(minZ, zs[i]); maxZ = Math.max(maxZ, zs[i]);
  }
  const ox = (minX + maxX) / 2;
  const oz = (minZ + maxZ) / 2;
  const S = new Float32Array(xs.length);
  for (let i = 0; i < xs.length; i++) {
    xs[i] -= ox;
    zs[i] -= oz;
    if (i > 0) S[i] = S[i - 1] + Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]);
  }
  return { xs, zs, jump, S, L: S[S.length - 1], width: maxX - minX, depth: maxZ - minZ };
}

export default function create(ctx, w, h, dpr = 1, stage) {
  const quality = particleQuality(w, h, 0.8);
  const renderer = getParticleRenderer();
  const total = renderer ? quality.count : Math.min(quality.count, 3200);
  const NB = Math.round(total * 0.26);
  const NT = Math.round(total * 0.36);
  const NBALL = Math.round(clamp(total * 0.025, 200, 450));
  const NPP = Math.round(clamp(total * 0.018, 80, 350)); // por columna
  const NG = Math.round(clamp(total * 0.1, 500, 2600));
  const ND = Math.round(clamp(total * 0.03, 200, 600));
  const TOTAL = NB + NT + NBALL + PILLARS * NPP + NG + ND;
  const governor = qualityGovernor();
  let renderScale = quality.scale;
  const aspect = w / h;

  const body = makeBody(NB, { hair: 0.03 });
  const J = new Float32Array(54);
  const bx = new Float32Array(NB); const by = new Float32Array(NB); const bz = new Float32Array(NB);
  const bodyPhase = new Float32Array(NB).map(() => Math.random() * 6.28);
  const ball = ballPoints(NBALL);
  const BALL_R = 0.11;

  // --- Recorrido, estela, columnas y campo (se rehacen si cambia el nombre) ---
  let route = null;
  let currentName = '';
  const trX = new Float32Array(NT); const trZ = new Float32Array(NT); const trS = new Float32Array(NT);
  const trT = new Float32Array(NT); const trHide = new Uint8Array(NT); const trP = new Float32Array(NT);
  const pil = Array.from({ length: PILLARS }, () => ({ x: 0, z: 0, s: 0, broke: -1 }));
  const ppA = new Float32Array(NPP); const ppH = new Float32Array(NPP);
  const ppx = new Float32Array(PILLARS * NPP); const ppy = new Float32Array(PILLARS * NPP); const ppz = new Float32Array(PILLARS * NPP);
  const pvx = new Float32Array(PILLARS * NPP); const pvy = new Float32Array(PILLARS * NPP); const pvz = new Float32Array(PILLARS * NPP);
  for (let i = 0; i < NPP; i++) { ppA[i] = Math.random() * Math.PI * 2; ppH[i] = Math.random(); }
  const gX = new Float32Array(NG); const gZ = new Float32Array(NG);
  const dX = new Float32Array(ND); const dY = new Float32Array(ND); const dZ = new Float32Array(ND); const dP = new Float32Array(ND);
  let topH = 20;
  let lookZ = 0;
  let hasRoute = false;

  const locate = (s) => {
    const S = route.S;
    let lo = 0;
    let hi = S.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (S[mid] <= s) lo = mid; else hi = mid;
    }
    const seg = Math.max(1, hi);
    const len = S[seg] - S[seg - 1] || 1e-6;
    return { seg, u: clamp((s - S[seg - 1]) / len) };
  };
  const at = (s, out) => {
    const { seg, u } = locate(clamp(s, 0, route.L));
    out.x = lerp(route.xs[seg - 1], route.xs[seg], u);
    out.z = lerp(route.zs[seg - 1], route.zs[seg], u);
    out.seg = seg;
    out.u = u;
    out.air = route.jump[seg];
    out.len = route.S[seg] - route.S[seg - 1];
    return out;
  };

  const build = (name) => {
    currentName = name;
    route = buildRoute(name);
    hasRoute = !!route;
    if (!route) return;
    const tmp = {};
    for (let i = 0; i < NT; i++) {
      const s = ((i + Math.random() * 0.9) / NT) * route.L;
      at(s, tmp);
      trS[i] = s;
      trHide[i] = tmp.air ? 1 : 0;
      const dxs = route.xs[tmp.seg] - route.xs[tmp.seg - 1];
      const dzs = route.zs[tmp.seg] - route.zs[tmp.seg - 1];
      const l = Math.hypot(dxs, dzs) || 1;
      const side = gauss() * 0.07;
      trX[i] = tmp.x - (dzs / l) * side;
      trZ[i] = tmp.z + (dxs / l) * side;
      trT[i] = -1;
      trP[i] = Math.random() * 6.28;
    }
    for (let j = 0; j < PILLARS; j++) {
      const s = route.L * (0.1 + (0.8 * j) / (PILLARS - 1));
      at(s, tmp);
      const dxs = route.xs[tmp.seg] - route.xs[tmp.seg - 1];
      const dzs = route.zs[tmp.seg] - route.zs[tmp.seg - 1];
      const l = Math.hypot(dxs, dzs) || 1;
      const side = j % 2 ? 0.95 : -0.95;
      Object.assign(pil[j], { x: tmp.x - (dzs / l) * side, z: tmp.z + (dxs / l) * side, s, broke: -1 });
    }
    const spanX = route.width + 14;
    const spanZ = route.depth + 14;
    const cols = Math.max(2, Math.round(Math.sqrt((NG * spanX) / spanZ)));
    const rows = Math.max(2, Math.ceil(NG / cols));
    for (let i = 0; i < NG; i++) {
      gX[i] = ((i % cols) / (cols - 1) - 0.5) * spanX + gauss() * 0.05;
      gZ[i] = (Math.floor(i / cols) / (rows - 1) - 0.5) * spanZ + gauss() * 0.05;
    }
    for (let i = 0; i < ND; i++) {
      dX[i] = (Math.random() - 0.5) * spanX;
      dY[i] = 0.3 + Math.random() * 4;
      dZ[i] = (Math.random() - 0.5) * spanZ;
      dP[i] = Math.random() * 6.28;
    }
    topH = Math.max(route.width * 1.14 / (2 * TAN * aspect), route.depth * 2.4 / (2 * TAN));
    lookZ = topH * TAN * 0.22; // el nombre queda arriba del centro: el mensaje va debajo
  };

  // --- Estado ---
  let lastT = -1;
  let prevS = 0;
  let speed = 0;
  let runPhase = 0;
  let yaw = Math.PI / 2;
  const camT = { x: 0, z: 0 };
  const root = { x: 0, z: 0 };
  const ballP = {};
  const runObj = {};
  const restart = () => {
    prevS = 0; speed = 0; runPhase = 0; yaw = Math.PI / 2;
    for (let i = 0; i < NT; i++) trT[i] = -1;
    for (const p of pil) p.broke = -1;
    if (route) { camT.x = route.xs[0]; camT.z = route.zs[0]; }
  };

  const vp = new Float32Array(16);
  const pos = new Float32Array(TOTAL * 4);
  const col = new Float32Array(TOTAL * 4);
  const eye = [0, 0, 0];
  const look = [0, 0, 0];
  const up = [0, 1, 0];
  const glow = new Float32Array(3);

  return (t, dt = 1 / 60) => {
    const name = cardName(stage, FALLBACK);
    if (name !== currentName) { build(name); restart(); }
    const restarted = t < lastT;
    lastT = t;
    if (restarted) restart();
    const step = Math.min(Math.max(dt, 0), 1 / 20);
    if (governor(t)) renderScale = Math.max(0.5, renderScale * 0.8);
    if (!hasRoute) {
      ctx.fillStyle = '#04020a';
      ctx.fillRect(0, 0, w, h);
      return;
    }

    // --- Avance del balón por el recorrido ---
    const u = clamp((t - START) / RUN);
    const sm = u * u * (3 - 2 * u);
    const sBall = route.L * (0.55 * sm + 0.45 * u) * (t >= START ? 1 : 0);
    if (step > 0) speed = lerp(speed, (sBall - prevS) / step, 1 - Math.exp(-step * 6));
    prevS = sBall;
    at(sBall, ballP);
    let ballY = BALL_R;
    if (ballP.air) ballY += 4 * clamp(ballP.len * 0.3, 0.3, 2.2) * ballP.u * (1 - ballP.u);
    else ballY += Math.abs(Math.sin(sBall * 3.2)) * 0.07 * clamp(speed / 4);

    // --- Jugador: detrás del balón, mirando hacia donde avanza ---
    const lead = 0.75;
    const rp = at(Math.max(0, sBall - lead), {});
    const mdx = ballP.x - rp.x;
    const mdz = ballP.z - rp.z;
    if (Math.hypot(mdx, mdz) > 0.05) {
      const target = Math.atan2(mdx, mdz);
      let diff = target - yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      yaw += diff * (1 - Math.exp(-step * 9));
    }
    root.x = rp.x; root.z = rp.z;
    const stride = Math.max(1.9, speed * 0.3);
    runPhase += ((speed * step) / stride) * Math.PI * 2;
    const moving = clamp(speed / 2.5);
    let pose;
    if (t < START) pose = READY;
    else if (u < 1) pose = mixPose(READY, runPose(runObj, runPhase, clamp(speed / 10)), clamp((t - START) / 0.3) * Math.max(moving, 0.3));
    else pose = mixPose(runPose(runObj, runPhase, 0.2), CELEBRATE, easeInOut(clamp((t - START - RUN) / 0.9)));
    bodyPose(J, pose);
    placeBody(body, J, root.x, 0, root.z, yaw, bx, by, bz);

    // --- Cámara: persecución → grúa cenital ---
    // Sigue al balón con poco retraso: el recorrido cambia de dirección muy rápido
    const follow = 1 - Math.exp(-step * 8);
    camT.x += ((root.x + ballP.x) / 2 - camT.x) * follow;
    camT.z += ((root.z + ballP.z) / 2 - camT.z) * follow;
    const hook = 1 - easeInOut(clamp((t - START + 0.3) / 1.2));
    const chaseEye = [camT.x + hook * 1.8, lerp(4.2, 1.5, hook), camT.z + lerp(7.0, 4.8, hook)];
    const chaseLook = [camT.x, lerp(0.4, 0.9, hook), camT.z - lerp(1.0, 0, hook)];
    const crane = easeInOut(clamp((t - CRANE) / CRANE_TIME));
    const lift = Math.sin(crane * Math.PI) * 4;
    eye[0] = lerp(chaseEye[0], 0, crane);
    eye[1] = lerp(chaseEye[1], topH, crane) + lift;
    eye[2] = lerp(chaseEye[2], lookZ + 0.01, crane);
    look[0] = lerp(chaseLook[0], 0, crane);
    look[1] = lerp(chaseLook[1], 0, crane);
    look[2] = lerp(chaseLook[2], lookZ, crane);
    const ul = Math.hypot(crane, 1 - crane) || 1;
    up[0] = 0; up[1] = (1 - crane) / ul; up[2] = -crane / ul;
    viewProjection(vp, eye, look, aspect, up);

    let o = 0;
    const write = (x, y, z, I, c, s) => {
      const q = o * 4;
      pos[q] = x; pos[q + 1] = y; pos[q + 2] = z; pos[q + 3] = I;
      col[q] = c[0]; col[q + 1] = c[1]; col[q + 2] = c[2]; col[q + 3] = s;
      o++;
    };
    const glowOn = clamp((t - GLOW) / 0.8);
    const sweep = ((t - GLOW) * 0.45) % 1.6 - 0.3;
    const zoomSize = lerp(1, clamp(topH / 9, 1, 4), crane); // desde arriba las partículas crecen para seguir leyéndose

    // --- Estela: se deposita al paso del balón ---
    for (let i = 0; i < NT; i++) {
      if (trHide[i]) continue;
      if (trT[i] < 0) {
        if (trS[i] <= sBall && t >= START) trT[i] = t; else continue;
      }
      const age = t - trT[i];
      const fresh = Math.exp(-age * 2.2);
      const xn = trX[i] / (route.width || 1) + 0.5;
      const wave = glowOn * Math.exp(-((xn - sweep) * (xn - sweep)) * 40);
      const I = (0.42 + 1.5 * fresh + 0.6 * glowOn + wave * 1.4) * (0.8 + 0.2 * Math.sin(t * 3 + trP[i]));
      const c = fresh > 0.4 || wave > 0.4 ? PINK : (trP[i] % 1 < 0.3 ? VIOLET : MAGENTA);
      write(trX[i], 0.03 + fresh * 0.05, trZ[i], I, c, 0.03 * zoomSize);
    }

    // --- Jugador ---
    for (let i = 0; i < NB; i++) {
      const p = bodyPhase[i];
      const I = (body.rad[i] < 0.9 ? 0.3 : 0.75) * (0.85 + 0.15 * Math.sin(t * 2 + p * 5));
      write(bx[i], by[i], bz[i], I * lerp(1, 0.8, crane), body.feat[i] === 1 ? VIOLET : p % 1 < 0.2 ? PINK : BLUE, 0.016 * lerp(1, 2.2, crane));
    }

    // --- Balón ---
    const roll = sBall / BALL_R;
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    const cyw = Math.cos(yaw);
    const syw = Math.sin(yaw);
    for (let i = 0; i < NBALL; i++) {
      const y1 = ball.y[i] * cr - ball.z[i] * sr;
      const z1 = ball.y[i] * sr + ball.z[i] * cr;
      const x1 = ball.x[i] * cyw + z1 * syw;
      const z2 = -ball.x[i] * syw + z1 * cyw;
      write(ballP.x + x1 * BALL_R, ballY + y1 * BALL_R, ballP.z + z2 * BALL_R, ball.patch[i] ? 0.5 : 1.1, ball.patch[i] ? MAGENTA : PINK, 0.012 * lerp(1, 3, crane));
    }

    // --- Columnas de luz: estallan cuando el balón pasa ---
    for (let j = 0; j < PILLARS; j++) {
      const pl = pil[j];
      if (pl.broke < 0 && sBall >= pl.s - 0.3 && t >= START) {
        pl.broke = t;
        for (let i = 0; i < NPP; i++) {
          const q = j * NPP + i;
          const a = ppA[i] + t * 1.5;
          ppx[q] = pl.x + Math.cos(a) * 0.22;
          ppy[q] = ppH[i] * 2.6;
          ppz[q] = pl.z + Math.sin(a) * 0.22;
          const sp = 1.5 + Math.random() * 3.5;
          pvx[q] = Math.cos(a) * sp + (pl.x - ballP.x) * 1.2;
          pvy[q] = 1 + Math.random() * 4;
          pvz[q] = Math.sin(a) * sp + (pl.z - ballP.z) * 1.2;
        }
      }
      for (let i = 0; i < NPP; i++) {
        const q = j * NPP + i;
        if (pl.broke < 0) {
          const a = ppA[i] + t * 1.5;
          const hgt = ppH[i] * 2.6;
          const scan = Math.exp(-(((hgt / 2.6 - ((t * 0.5 + j * 0.17) % 1.2)) / 0.08) ** 2));
          write(pl.x + Math.cos(a) * 0.22, hgt, pl.z + Math.sin(a) * 0.22, (0.35 + scan * 1.2) * clamp(t / 0.8), scan > 0.3 ? PINK : MAGENTA, 0.022);
        } else {
          const age = t - pl.broke;
          pvy[q] -= 9.8 * step;
          pvx[q] *= Math.exp(-step * 0.8); pvz[q] *= Math.exp(-step * 0.8);
          ppx[q] += pvx[q] * step; ppy[q] += pvy[q] * step; ppz[q] += pvz[q] * step;
          if (ppy[q] < 0.02) { ppy[q] = 0.02; pvy[q] *= -0.35; pvx[q] *= 0.7; pvz[q] *= 0.7; }
          write(ppx[q], ppy[q], ppz[q], 0.15 + 1.4 * Math.exp(-age * 1.8), age < 0.4 ? PINK : MAGENTA, 0.02 * lerp(1, 2.5, crane));
        }
      }
    }

    // --- Campo: malla de puntos que se enciende cerca del balón ---
    for (let i = 0; i < NG; i++) {
      const ddx = gX[i] - ballP.x;
      const ddz = gZ[i] - ballP.z;
      const near = u < 1 && t >= START ? Math.exp(-(ddx * ddx + ddz * ddz) / 1.2) : 0;
      write(gX[i], 0, gZ[i], (0.07 + near * 0.6) * clamp(t / 0.6) * lerp(1, 0.55, glowOn), near > 0.3 ? VIOLET : BLUE, 0.02 * zoomSize);
    }

    // --- Polvo en el aire ---
    for (let i = 0; i < ND; i++) {
      const p = dP[i];
      write(dX[i] + Math.sin(t * 0.2 + p) * 0.5, dY[i] + Math.sin(t * 0.3 + p * 2) * 0.3, dZ[i], 0.12 * (1 - crane * 0.7), BLUE, 0.025);
    }

    // --- Render ---
    const center = projectVP(vp, 0, 0, 0);
    glow[0] = center[0]; glow[1] = center[1]; glow[2] = 0.25 + glowOn * 0.5;
    const cssScale = Math.min(dpr, 2) * renderScale;
    const fbW = Math.max(2, Math.round(w * cssScale));
    const fbH = Math.max(2, Math.round(h * cssScale));
    const focus = lerp(Math.hypot(eye[0] - root.x, eye[1] - 1, eye[2] - root.z), topH, crane);
    if (renderer) {
      renderer.render({
        width: fbW, height: fbH, vp, pos, col, count: o,
        px: fbH / (2 * TAN), focus, aperture: lerp(0.04, 0.01, crane), maxSize: 36 * cssScale,
        trail: t < START ? 0.15 : u < 1 ? 0.55 : lerp(0.45, 0.15, crane),
        glow, beam: [0.5, 0, 0], flash: 0,
        bg: [0.004, 0.002, 0.01], glowColor: [0.05, 0.01, 0.06], flashColor: [1, 0.3, 0.8],
        exposure: 1.4, time: t, reset: restarted, owner: pos,
      });
      ctx.drawImage(renderer.canvas, 0, 0, w, h);
    } else {
      drawParticles2D(ctx, w, h, vp, pos, col, o, focus, 0.04, '#04020a');
    }

    // --- Pregunta ---
    const hookA = clamp(t / 0.3) * (1 - clamp((t - CRANE) / 0.6));
    if (hookA > 0) {
      const fs = Math.min(w * 0.058, h * 0.032);
      ctx.save();
      ctx.font = `800 ${fs}px system-ui, "Segoe UI", sans-serif`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${fs * 0.12}px`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255, 60, 200, 0.9)';
      ctx.shadowBlur = fs;
      ctx.fillStyle = `rgba(255, 235, 250, ${hookA})`;
      ctx.fillText(HOOK, w / 2, h * 0.1);
      ctx.restore();
    }
  };
}
