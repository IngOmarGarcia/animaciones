import {
  clamp, lerp, easeInOut, easeOutCubic, mixPose, textPoints,
  particleQuality, getParticleRenderer, viewProjection, projectVP, drawParticles2D, qualityGovernor,
  STAND_POSE, bodyPose, runPose, makeBody, placeBody, ballPoints,
} from './util.js';

// ✏️ Colores (r, g, b de 0 a 1) y textos
const WHITE = [0.9, 0.94, 1.0];
const RED = [1.0, 0.1, 0.07];
const HOT = [1.0, 0.78, 0.72];
const HOOK = 'NO PARPADEES';
const WORD = 'GOLAZO';

// Guion (segundos)
const CUT = 1.0; // corte: del adelanto al tiro
const RUNUP = 1.1; // empieza la carrera
const PLANT = 2.3; // pie de apoyo
const STRIKE = 2.55; // golpe
const HIT = 3.35; // el balón toca la red (llega frenando: cámara lenta)
const STRETCH = 4.35; // máxima deformación, a centímetros del lente
const RELEASE = 5.0; // la red lo devuelve
const FORM = 5.5; // los nudos se sueltan y escriben GOLAZO
const TAN = Math.tan((12 * Math.PI) / 180); // teleobjetivo: comprime la distancia al tirador

const SPOT = { x: 0.1, z: -11 };
const NET_POINT = { x: 0.0, y: 1.12 };
const DEPTH = 3.55; // cuánto se estira la red hacia la cámara
const CAM_Z = 4.35;
const BALL_R = 0.11;

const PLANT_POSE = { ...STAND_POSE, lean: -0.05, head: 0.45, twist: -0.3, sway: 0.12, hipR: -0.9, knR: 1.3, footR: 0.6, hipL: 0.35, knL: 0.35, shL: 0.4, armOutL: 1.1, shR: -0.4, armOutR: 0.5 };
const STRIKE_POSE = { ...STAND_POSE, lean: -0.12, head: 0.35, twist: 0.35, sway: 0.1, hipR: 0.9, knR: 0.15, footR: 0.7, hipL: 0.1, knL: 0.25, shL: 0.5, armOutL: 1.3, shR: -0.6, armOutR: 0.4 };
const FOLLOW_POSE = { ...STAND_POSE, lean: -0.3, head: -0.1, twist: 0.55, bob: 0.06, hipR: 1.6, knR: 0.3, footR: 0.5, hipL: -0.05, knL: 0.1, shL: 0.9, armOutL: 1.0, shR: -0.9, armOutR: 0.5 };
const CELEBRATE = { ...STAND_POSE, head: -0.45, lean: -0.1, shL: 2.6, shR: 2.6, elL: 0.3, elR: 0.3, armOutL: -0.6, armOutR: -0.6, legOutL: 0.15, legOutR: 0.15 };

const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

export default function create(ctx, w, h, dpr = 1) {
  const quality = particleQuality(w, h, 0.8);
  const renderer = getParticleRenderer();
  const rich = renderer && quality.count > 12000;
  const total = renderer ? quality.count : Math.min(quality.count, 3200);
  const NB = Math.round(total * 0.2);
  const NBALL = Math.round(clamp(total * 0.05, 400, 1000));
  const NGR = Math.round(clamp(total * 0.07, 400, 1600));
  const NBG = Math.round(clamp(total * 0.03, 200, 600));
  const NFX = 900; // estela, onda y pasto
  const aspect = w / h;
  const governor = qualityGovernor();
  let renderScale = quality.scale;

  // --- Red: nudos con Verlet, bordes fijos ---
  const CELL = rich ? 0.09 : 0.12;
  const NET_X = 1.3;
  const NET_Y0 = -0.15;
  const NET_Y1 = 2.5;
  const cols = Math.round((2 * NET_X) / CELL) + 1;
  const rows = Math.round((NET_Y1 - NET_Y0) / CELL) + 1;
  const NN = cols * rows;
  const nx = new Float32Array(NN); const ny = new Float32Array(NN); const nz = new Float32Array(NN);
  const ox = new Float32Array(NN); const oy = new Float32Array(NN); const oz = new Float32Array(NN);
  const rx = new Float32Array(NN); const ry = new Float32Array(NN);
  const pinned = new Uint8Array(NN);
  const edges = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      rx[i] = -NET_X + c * CELL;
      ry[i] = NET_Y0 + r * CELL;
      pinned[i] = r === 0 || c === 0 || r === rows - 1 || c === cols - 1 ? 1 : 0;
      if (c + 1 < cols) edges.push(i, i + 1);
      if (r + 1 < rows) edges.push(i, i + cols);
    }
  }
  const E = edges.length / 2;
  const edgeA = new Uint32Array(E);
  const edgeB = new Uint32Array(E);
  for (let e = 0; e < E; e++) { edgeA[e] = edges[e * 2]; edgeB[e] = edges[e * 2 + 1]; }
  const SP = rich ? 5 : 4;
  const NS = E * SP;
  const sE = new Uint32Array(NS);
  const sU = new Float32Array(NS);
  const sP = new Float32Array(NS);
  for (let e = 0; e < E; e++) {
    for (let k = 0; k < SP; k++) {
      sE[e * SP + k] = e;
      sU[e * SP + k] = (k + Math.random() * 0.6) / SP;
      sP[e * SP + k] = Math.random() * 6.28;
    }
  }

  const restNet = () => {
    for (let i = 0; i < NN; i++) { nx[i] = ox[i] = rx[i]; ny[i] = oy[i] = ry[i]; nz[i] = oz[i] = 0; }
  };
  let ballCollide = false;
  const bpos = { x: 0, y: 0, z: 0 };
  const simulate = (hstep) => {
    const damp = 0.975;
    for (let i = 0; i < NN; i++) {
      if (pinned[i]) continue;
      const vx = (nx[i] - ox[i]) * damp;
      const vy = (ny[i] - oy[i]) * damp;
      const vz = (nz[i] - oz[i]) * damp;
      ox[i] = nx[i]; oy[i] = ny[i]; oz[i] = nz[i];
      nx[i] += vx; ny[i] += vy - 1.5 * hstep * hstep; nz[i] += vz - nz[i] * 6 * hstep * hstep;
    }
    for (let iter = 0; iter < 5; iter++) {
      for (let e = 0; e < E; e++) {
        const a = edgeA[e];
        const b = edgeB[e];
        const dx = nx[b] - nx[a];
        const dy = ny[b] - ny[a];
        const dz = nz[b] - nz[a];
        const d = Math.hypot(dx, dy, dz);
        if (d <= CELL) continue; // una red no resiste compresión
        const diff = ((d - CELL) / d) * 0.5 * 0.4;
        if (!pinned[a]) { nx[a] += dx * diff; ny[a] += dy * diff; nz[a] += dz * diff; }
        if (!pinned[b]) { nx[b] -= dx * diff; ny[b] -= dy * diff; nz[b] -= dz * diff; }
      }
      if (ballCollide) {
        const R = BALL_R + 0.02;
        for (let i = 0; i < NN; i++) {
          if (pinned[i]) continue;
          const dx = nx[i] - bpos.x;
          const dy = ny[i] - bpos.y;
          const r2 = dx * dx + dy * dy;
          if (r2 >= R * R) continue;
          const front = bpos.z + Math.sqrt(R * R - r2);
          if (nz[i] < front) nz[i] = front;
        }
      }
    }
  };
  // Estado del adelanto: la red ya estirada con el balón encima
  restNet();
  ballCollide = true;
  for (let s = 0; s < 150; s++) {
    Object.assign(bpos, { x: NET_POINT.x, y: NET_POINT.y, z: Math.min(1, s / 70) * (DEPTH - 0.35) });
    simulate(1 / 120);
  }

  // --- Tirador ---
  const body = makeBody(NB, {});
  const J = new Float32Array(54);
  const bx = new Float32Array(NB); const by = new Float32Array(NB); const bz = new Float32Array(NB);
  const YAW = 0.1;
  const strikeJ = bodyPose(new Float32Array(54), STRIKE_POSE);
  const toeX = strikeJ[51] * Math.cos(YAW) + strikeJ[53] * Math.sin(YAW);
  const toeZ = -strikeJ[51] * Math.sin(YAW) + strikeJ[53] * Math.cos(YAW);
  const plantRoot = { x: SPOT.x - toeX, z: SPOT.z - BALL_R - toeZ };
  const startRoot = { x: plantRoot.x + 1.3, z: plantRoot.z - 3.6 };

  // --- GOLAZO: plano entre la red y la cámara ---
  const TEXT_Z = 1.7;
  const textDist = CAM_Z - TEXT_Z;
  const textW = Math.min(2 * textDist * TAN * aspect * 0.95, 2 * textDist * TAN * 1.1);
  // Peso 600: letras con huecos abiertos que se siguen leyendo con el bloom
  const tpts = textPoints(WORD, 1000, 260, 2, 600);
  const letterShare = clamp((tpts.length * 1.15) / NS, 0.3, 0.7);
  const isLetter = new Uint8Array(NS);
  const txs = new Float32Array(NS); const tys = new Float32Array(NS); const tzs = new Float32Array(NS);
  const lx = new Float32Array(NS); const ly = new Float32Array(NS); const lz = new Float32Array(NS);
  const lvx = new Float32Array(NS); const lvy = new Float32Array(NS); const lvz = new Float32Array(NS);
  const kText = textW / 1000;
  for (let i = 0; i < NS; i++) {
    if (tpts.length && Math.random() < letterShare) {
      isLetter[i] = 1;
      const p = tpts[Math.floor(Math.random() * tpts.length)];
      txs[i] = NET_POINT.x * 0.3 + (p.x + (Math.random() - 0.5) * 2) * kText;
      tys[i] = 1.3 - (p.y + (Math.random() - 0.5) * 1.2) * kText;
      tzs[i] = TEXT_Z + gauss() * 0.01;
    }
  }

  // --- Balón, efectos, campo y estadio ---
  const ball = ballPoints(NBALL);
  const fx = new Float32Array(NFX); const fy = new Float32Array(NFX); const fz = new Float32Array(NFX);
  const fvx = new Float32Array(NFX); const fvy = new Float32Array(NFX); const fvz = new Float32Array(NFX);
  const fLife = new Float32Array(NFX); const fBorn = new Float32Array(NFX).fill(-9); const fKind = new Uint8Array(NFX);
  let fxNext = 0;
  const spawn = (x, y, z, vx, vy, vz, life, kind, t) => {
    const i = fxNext;
    fxNext = (fxNext + 1) % NFX;
    fx[i] = x; fy[i] = y; fz[i] = z; fvx[i] = vx; fvy[i] = vy; fvz[i] = vz; fLife[i] = life; fBorn[i] = t; fKind[i] = kind;
  };
  const grX = new Float32Array(NGR); const grZ = new Float32Array(NGR); const grI = new Float32Array(NGR);
  for (let i = 0; i < NGR; i++) {
    const line = Math.random();
    if (line < 0.35) {
      // Líneas del área: frontal del área chica (z = -5.5), del área grande (-16.5) y punto penal
      const which = Math.random();
      if (which < 0.45) { grX[i] = (Math.random() - 0.5) * 18.3; grZ[i] = -5.5; } else if (which < 0.9) { grX[i] = (Math.random() - 0.5) * 40; grZ[i] = -16.5; } else {
        const a = Math.random() * 6.28; grX[i] = Math.cos(a) * 0.12; grZ[i] = -11 + Math.sin(a) * 0.12;
      }
      grI[i] = 0.35;
    } else {
      grX[i] = (Math.random() - 0.5) * 9;
      grZ[i] = -Math.pow(Math.random(), 0.7) * 26;
      grI[i] = 0.05 + Math.random() * 0.06;
    }
  }
  const bgX = new Float32Array(NBG); const bgY = new Float32Array(NBG); const bgZ = new Float32Array(NBG); const bgK = new Uint8Array(NBG);
  for (let i = 0; i < NBG; i++) {
    if (i < 16) {
      bgX[i] = (i - 7.5) * 1.8; bgY[i] = 13 + (i % 3) * 1.4; bgZ[i] = -72; bgK[i] = 0;
    } else {
      bgX[i] = (Math.random() - 0.5) * 30; bgY[i] = 2 + Math.random() * 8; bgZ[i] = -55 - Math.random() * 10; bgK[i] = 1;
    }
  }

  const TOTAL = NB + NBALL + NS + NFX + NGR + NBG;
  const vp = new Float32Array(16);
  const pos = new Float32Array(TOTAL * 4);
  const col = new Float32Array(TOTAL * 4);
  const eye = [0, 1.12, CAM_Z];
  const look = [0.1, 0.95, -11];
  const runObj = {};
  let lastT = -1;
  let cutDone = false;
  let formed = false;
  let struck = false;
  let simClock = 0;
  let prevBall = null;
  const snapshot = { x: nx.slice(), y: ny.slice(), z: nz.slice() };
  const restoreHook = () => {
    nx.set(snapshot.x); ny.set(snapshot.y); nz.set(snapshot.z);
    ox.set(snapshot.x); oy.set(snapshot.y); oz.set(snapshot.z);
    cutDone = false; formed = false; struck = false; prevBall = null; fBorn.fill(-9);
  };
  restoreHook();

  // Trayectoria del balón (tiempo real)
  const ballAt = (t, out) => {
    if (t < CUT) {
      Object.assign(out, { x: NET_POINT.x, y: NET_POINT.y, z: DEPTH - 0.35 + 0.25 * (t / CUT), vis: 1 });
    } else if (t < STRIKE) {
      Object.assign(out, { x: SPOT.x, y: BALL_R, z: SPOT.z, vis: 1 });
    } else if (t < HIT) {
      const v = (t - STRIKE) / (HIT - STRIKE);
      const k = 1 - Math.pow(1 - v, 2.2);
      out.x = lerp(SPOT.x, NET_POINT.x, k) + Math.sin(k * Math.PI) * 0.25;
      out.y = lerp(BALL_R, NET_POINT.y, k) + Math.sin(k * Math.PI) * 0.45;
      out.z = lerp(SPOT.z, 0, k);
      out.vis = 1;
    } else if (t < STRETCH) {
      Object.assign(out, { x: NET_POINT.x, y: NET_POINT.y, z: DEPTH * easeOutCubic((t - HIT) / (STRETCH - HIT)), vis: 1 });
    } else if (t < RELEASE) {
      const v = (t - STRETCH) / (RELEASE - STRETCH);
      Object.assign(out, { x: NET_POINT.x, y: NET_POINT.y - v * v * 0.2, z: DEPTH * (1 - v * v * v) - 0.45 * v * v * v, vis: 1 });
    } else {
      const tau = t - RELEASE;
      let y = NET_POINT.y - 0.2 + 1.2 * tau - 4.9 * tau * tau;
      if (y < BALL_R) y = BALL_R + Math.abs(Math.sin(tau * 6)) * 0.12 * Math.exp(-tau * 2);
      Object.assign(out, { x: NET_POINT.x - tau * 0.1, y, z: -0.45 - tau * 0.6 * Math.exp(-tau), vis: 1 });
    }
    return out;
  };
  const B = {};

  return (t, dt = 1 / 60) => {
    const restarted = t < lastT;
    lastT = t;
    if (restarted) restoreHook();
    const step = Math.min(Math.max(dt, 0), 1 / 20);
    if (governor(t)) renderScale = Math.max(0.5, renderScale * 0.8);

    if (!cutDone && t >= CUT) {
      cutDone = true;
      restNet();
    }
    ballAt(t, B);

    // --- Red: física con cámara lenta alrededor del impacto ---
    const slow = t > HIT - 0.3 && t < STRETCH + 0.3 ? 0.3 : 1;
    ballCollide = t < CUT || (t >= HIT - 0.05 && t < RELEASE + 0.15);
    Object.assign(bpos, B);
    simClock += step * slow;
    const H = 1 / 120;
    let guard = 0;
    while (simClock >= H && guard++ < 6) {
      simulate(H);
      simClock -= H;
    }
    if (guard >= 6) simClock = 0;

    // --- Tirador ---
    let root;
    let pose;
    let yaw = YAW;
    if (t < PLANT) {
      const v = clamp((t - RUNUP) / (PLANT - RUNUP));
      const k = 1 - (1 - v) * (1 - v) * 0.4 - 0.6 * (1 - v);
      root = { x: lerp(startRoot.x, plantRoot.x, k), z: lerp(startRoot.z, plantRoot.z, k) };
      yaw = Math.atan2(plantRoot.x - startRoot.x, plantRoot.z - startRoot.z) * (1 - v) + YAW * v;
      const run = runPose(runObj, v * Math.PI * 2 * 2.5, 0.75);
      pose = t < RUNUP ? mixPose(STAND_POSE, run, 0.2) : mixPose(run, PLANT_POSE, clamp((v - 0.8) / 0.2));
    } else {
      root = plantRoot;
      if (t < STRIKE) pose = mixPose(PLANT_POSE, STRIKE_POSE, easeInOut((t - PLANT) / (STRIKE - PLANT)));
      else if (t < STRIKE + 0.35) pose = mixPose(STRIKE_POSE, FOLLOW_POSE, easeOutCubic((t - STRIKE) / 0.35));
      else pose = mixPose(FOLLOW_POSE, CELEBRATE, easeInOut(clamp((t - STRIKE - 0.9) / 1.0)));
    }
    bodyPose(J, pose);
    placeBody(body, J, root.x, 0, root.z, yaw, bx, by, bz);

    // --- Efectos del golpe ---
    if (!struck && t >= STRIKE) {
      struck = true;
      for (let i = 0; i < 260; i++) {
        const a = (i / 260) * Math.PI * 2;
        spawn(SPOT.x, BALL_R, SPOT.z, Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0, 0.35, 1, t);
      }
      for (let i = 0; i < 220; i++) {
        spawn(SPOT.x + gauss() * 0.15, 0.02, SPOT.z + gauss() * 0.15, gauss() * 1.4, 1.5 + Math.random() * 3, gauss() * 1.4, 0.9, 2, t);
      }
    }
    if (t >= STRIKE && t < HIT + 0.1 && prevBall) {
      for (let k = 0; k < 18; k++) {
        const u = k / 18;
        spawn(lerp(prevBall.x, B.x, u) + gauss() * 0.02, lerp(prevBall.y, B.y, u) + gauss() * 0.02, lerp(prevBall.z, B.z, u), 0, 0, 0, 0.45, 0, t);
      }
    }
    prevBall = { x: B.x, y: B.y, z: B.z };

    // --- Cámara ---
    let camZ = CAM_Z;
    if (t >= CUT && t < STRIKE) camZ = lerp(CAM_Z + 0.35, CAM_Z, easeInOut((t - CUT) / (STRIKE - CUT)));
    if (t >= HIT) camZ += 0.2 * Math.sin(clamp((t - HIT) / (RELEASE - HIT + 0.6)) * Math.PI);
    const shake = (t >= HIT ? Math.exp(-(t - HIT) * 6) * 0.012 : 0) + (t >= RELEASE ? Math.exp(-(t - RELEASE) * 7) * 0.01 : 0);
    eye[0] = Math.sin(t * 43) * shake;
    eye[1] = 1.12 + Math.cos(t * 37) * shake;
    eye[2] = camZ;
    viewProjection(vp, eye, look, aspect, undefined, TAN);

    // Foco: tirador → balón en vuelo → texto. Con foco cercano se cierra el diafragma
    // para que el tirador lejano no se convierta en una mancha.
    const focusBall = Math.hypot(B.x - eye[0], B.y - eye[1], B.z - eye[2]);
    let focus = Math.hypot(root.x - eye[0], 1 - eye[1], root.z - eye[2]);
    if (t < CUT) focus = focusBall;
    else if (t >= STRIKE && t < FORM) focus = lerp(focus, focusBall, easeInOut(clamp((t - STRIKE) / 0.4)));
    else if (t >= FORM) focus = lerp(focusBall, CAM_Z - TEXT_Z, easeInOut(clamp((t - FORM) / 0.8)));
    const nearFocus = clamp((8 - focus) / 4);
    const aperture = lerp(0.045, 0.01, nearFocus);

    let o = 0;
    const write = (x, y, z, I, c, s) => {
      const q = o * 4;
      pos[q] = x; pos[q + 1] = y; pos[q + 2] = z; pos[q + 3] = I;
      col[q] = c[0]; col[q + 1] = c[1]; col[q + 2] = c[2]; col[q + 3] = s;
      o++;
    };

    // --- Red y nudos que forman GOLAZO ---
    if (!formed && t >= FORM) {
      formed = true;
      for (let i = 0; i < NS; i++) {
        if (!isLetter[i]) continue;
        const e = sE[i];
        const u = sU[i];
        lx[i] = lerp(nx[edgeA[e]], nx[edgeB[e]], u);
        ly[i] = lerp(ny[edgeA[e]], ny[edgeB[e]], u);
        lz[i] = lerp(nz[edgeA[e]], nz[edgeB[e]], u);
        lvx[i] = gauss() * 0.3; lvy[i] = gauss() * 0.3; lvz[i] = 0.5 + Math.random();
      }
    }
    const waveAge = t - HIT;
    const tf = t - FORM;
    const back = formed ? easeInOut(clamp(tf / 0.7)) : 0;
    const textOn = formed ? clamp((tf - 0.5) / 0.6) : 0;
    for (let i = 0; i < NS; i++) {
      if (formed && isLetter[i]) {
        const k = 60 * back * back;
        const c = 2 * Math.sqrt(k) * 0.9 + 1.5 * (1 - back);
        const p = sP[i];
        lvx[i] += (k * (txs[i] - lx[i]) - c * lvx[i] + Math.sin(t * 2 + p) * 0.05) * step;
        lvy[i] += (k * (tys[i] - ly[i]) - c * lvy[i] + Math.cos(t * 1.7 + p) * 0.05) * step;
        lvz[i] += (k * (tzs[i] - lz[i]) - c * lvz[i]) * step;
        lx[i] += lvx[i] * step; ly[i] += lvy[i] * step; lz[i] += lvz[i] * step;
        const sweep = ((tf * 0.5) % 1.6) - 0.3;
        const xn = (lx[i] - NET_POINT.x * 0.3) / textW + 0.5;
        const shine = Math.exp(-((xn - sweep) ** 2) * 50) * textOn;
        write(lx[i], ly[i], lz[i], (0.2 + 0.18 * textOn + shine * 0.7) * (0.85 + 0.15 * Math.sin(t * 3 + p)), p % 1 < 0.22 || shine > 0.4 ? HOT : RED, 0.0036);
        continue;
      }
      const e = sE[i];
      const a = edgeA[e];
      const b = edgeB[e];
      const u = sU[i];
      const x = lerp(nx[a], nx[b], u);
      const y = lerp(ny[a], ny[b], u);
      const z = lerp(nz[a], nz[b], u);
      let I = 0.34;
      let c = WHITE;
      if (waveAge > 0 && waveAge < 1.6) {
        const r = Math.hypot(rx[a] - NET_POINT.x, ry[a] - NET_POINT.y);
        const d = (r - waveAge * 1.8) / 0.12;
        const wave = Math.exp(-d * d) * (1 - waveAge / 1.6);
        I += wave * 1.6;
        if (wave > 0.25) c = RED;
      }
      I += Math.min(z * 0.25, 0.6); // la parte estirada capta más luz
      if (formed) I *= lerp(1, 0.55, back);
      write(x, y, z, I * (t < CUT ? 0.9 : 1), c, 0.0062);
    }

    // --- Balón (tamaño de punto constante en pantalla) ---
    const camDist = Math.hypot(B.x - eye[0], B.y - eye[1], B.z - eye[2]);
    const ps = clamp(0.0024 * camDist, 0.0035, 0.03);
    let sqX = 1;
    let sqZ = 1;
    if (t >= STRIKE && t < STRIKE + 0.12) {
      const v = Math.sin(((t - STRIKE) / 0.12) * Math.PI);
      sqX = 1 + 0.3 * v;
      sqZ = 1 - 0.35 * v;
    }
    const spin = t < STRIKE ? t * 0.8 : (t - STRIKE) * 14;
    const cs = Math.cos(spin);
    const sn = Math.sin(spin);
    for (let i = 0; i < NBALL; i++) {
      const y1 = ball.y[i] * cs - ball.z[i] * sn;
      const z1 = ball.y[i] * sn + ball.z[i] * cs;
      const patch = ball.patch[i];
      const ballI = t > RELEASE ? lerp(1, 0.35, clamp((t - RELEASE) / 0.8)) : 1;
      write(B.x + ball.x[i] * BALL_R * sqX, B.y + y1 * BALL_R * sqX, B.z + z1 * BALL_R * sqZ, (patch ? 0.75 : 0.95) * ballI, patch ? RED : WHITE, ps);
    }

    // --- Tirador ---
    for (let i = 0; i < NB; i++) {
      write(bx[i], by[i], bz[i], (body.rad[i] < 0.9 ? 0.3 : 0.7) * (t < CUT ? 0 : clamp((t - CUT) / 0.25)) * lerp(1, 0.3, nearFocus), i % 9 === 0 ? HOT : WHITE, 0.02);
    }

    // --- Efectos: estela roja, onda del golpe y pasto ---
    for (let i = 0; i < NFX; i++) {
      const age = t - fBorn[i];
      if (age < 0 || age > fLife[i]) { write(0, 0, 0, 0, WHITE, 0.01); continue; }
      const life = 1 - age / fLife[i];
      if (fKind[i] === 2) {
        fvy[i] -= 9.8 * step;
        fx[i] += fvx[i] * step; fy[i] += fvy[i] * step; fz[i] += fvz[i] * step;
        if (fy[i] < 0.01) { fy[i] = 0.01; fvy[i] *= -0.3; }
      } else {
        fx[i] += fvx[i] * step; fy[i] += fvy[i] * step;
      }
      const I = fKind[i] === 0 ? life * life * 1.4 : fKind[i] === 1 ? life * 1.6 : life * 0.6;
      write(fx[i], fy[i], fz[i], I, fKind[i] === 2 ? WHITE : fKind[i] === 1 ? HOT : RED, fKind[i] === 0 ? 0.03 : 0.018);
    }

    // --- Campo y estadio ---
    for (let i = 0; i < NGR; i++) write(grX[i], 0, grZ[i], grI[i] * (t < CUT ? 0.3 : 1), WHITE, 0.03);
    for (let i = 0; i < NBG; i++) {
      if (bgK[i] === 0) write(bgX[i], bgY[i], bgZ[i], 0.9 + 0.1 * Math.sin(t * 2 + i), WHITE, 0.5);
      else write(bgX[i], bgY[i], bgZ[i], 0.12 * (0.6 + 0.4 * Math.sin(t * 3 + i * 1.7)), RED, 0.12);
    }

    // --- Render ---
    const cssScale = Math.min(dpr, 2) * renderScale;
    const fbW = Math.max(2, Math.round(w * cssScale));
    const fbH = Math.max(2, Math.round(h * cssScale));
    const netUV = projectVP(vp, NET_POINT.x, NET_POINT.y, 0);
    const cutFlash = t >= CUT ? Math.exp(-(t - CUT) * 9) : 0;
    const hitFlash = t >= HIT ? Math.exp(-(t - HIT) * 8) * 0.25 : 0;
    if (renderer) {
      renderer.render({
        width: fbW, height: fbH, vp, pos, col, count: o,
        px: fbH / (2 * TAN), focus, aperture, maxSize: 44 * cssScale,
        trail: t < CUT ? 0.3 : t >= STRIKE && t < RELEASE ? 0.55 : 0.2,
        glow: [netUV[0], netUV[1], t >= HIT ? 0.8 * Math.exp(-(t - HIT) * 1.2) + (formed ? 0.35 : 0) : 0.15],
        beam: [0.5, 0, 0],
        flash: cutFlash * 0.9 + hitFlash,
        bg: [0.004, 0.004, 0.006], glowColor: [0.12, 0.02, 0.015], flashColor: [1, 0.95, 0.95],
        exposure: 1.3, time: t, reset: restarted, owner: pos,
      });
      ctx.drawImage(renderer.canvas, 0, 0, w, h);
    } else {
      drawParticles2D(ctx, w, h, vp, pos, col, o, focus, 0.045, '#030304');
    }

    // --- Texto del gancho y barrido del corte ---
    const hookA = clamp(t / 0.15) * (1 - clamp((t - CUT + 0.12) / 0.12));
    if (hookA > 0) {
      const fs = Math.min(w * 0.085, h * 0.045);
      ctx.save();
      ctx.font = `900 ${fs}px system-ui, "Segoe UI", sans-serif`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${fs * 0.1}px`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255, 30, 20, 0.9)';
      ctx.shadowBlur = fs * 0.6;
      ctx.fillStyle = `rgba(255, 255, 255, ${hookA})`;
      ctx.fillText(HOOK, w / 2, h * 0.12);
      ctx.fillStyle = `rgba(255, 40, 30, ${hookA})`;
      ctx.fillRect(w * 0.3, h * 0.12 + fs * 0.7, w * 0.4 * clamp(t / CUT), Math.max(2, fs * 0.08));
      ctx.restore();
    }
    if (cutFlash > 0.02) {
      ctx.save();
      const g = ctx.createLinearGradient(0, 0, w, 0);
      const x = clamp((t - CUT) / 0.3);
      g.addColorStop(Math.max(0, x - 0.3), 'rgba(255,255,255,0)');
      g.addColorStop(x, `rgba(255,255,255,${cutFlash * 0.8})`);
      g.addColorStop(Math.min(1, x + 0.02), 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  };
}
