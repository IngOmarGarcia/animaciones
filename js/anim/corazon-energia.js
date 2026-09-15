import {
  TAU, clamp, lerp, easeInOut, textPoints, cardName,
  PARTICLE_TAN, particleQuality, getParticleRenderer, viewProjection, drawParticles2D,
} from './util.js';

// ✏️ Colores de la energía (r, g, b de 0 a 1) y texto por defecto (sin nombre)
const BLUE = [0.12, 0.36, 1.0];
const CYAN = [0.2, 0.9, 1.0];
const WHITE = [0.9, 0.97, 1.0];
const FALLBACK = 'TE AMO';

// Guion (segundos)
const PORTAL_ON = 2.0; // se enciende el portal
const EMIT_END = 5.6; // el portal deja de lanzar partículas
const GATHER = 3.6; // las partículas empiezan a buscar su lugar
const HERO = 7.0; // corazón formado: la cámara se acerca
const BEAT_START = 9.0; // empieza a latir
const TAP_FROM = 9.0; // desde aquí se puede tocar
const AUTO_TAP = 11.0; // sin interacción (grabador, revisión): explota sola
const WAIT_TAP = 16.0; // si nadie toca, explota sola
const SCATTER = 1.0; // tiempo que el corazón parece desaparecer
const REVEAL = 2.1; // tras la explosión, cuándo aparece el mensaje
const BEAT_PERIOD = 1.05;

const TAN = PARTICLE_TAN;

// ---------- Geometría del corazón (superficie implícita de Taubin, y hacia arriba) ----------

function heartField(x, y, z) {
  const a = x * x + 2.25 * z * z + y * y - 1;
  return a * a * a - x * x * y * y * y - 0.1125 * z * z * y * y * y;
}

// Distancia del centro al borde en una dirección.
function heartRadius(dx, dy, dz) {
  let r = 0;
  while (r < 1.8 && heartField(dx * r, dy * r, dz * r) < 0) r += 0.04;
  let lo = Math.max(0, r - 0.04);
  let hi = r;
  for (let k = 0; k < 7; k++) {
    const mid = (lo + hi) / 2;
    if (heartField(dx * mid, dy * mid, dz * mid) < 0) lo = mid;
    else hi = mid;
  }
  return lo;
}

// Borde exterior en un corte horizontal (para las líneas holográficas).
function sliceRadius(y, cx, cz) {
  let r = 1.6;
  while (r > 0 && heartField(cx * r, y, cz * r) >= 0) r -= 0.03;
  if (r <= 0) return 0;
  let lo = r;
  let hi = r + 0.03;
  for (let k = 0; k < 6; k++) {
    const mid = (lo + hi) / 2;
    if (heartField(cx * mid, y, cz * mid) < 0) lo = mid;
    else hi = mid;
  }
  return lo;
}

const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

// ---------- Escena ----------

export default function create(ctx, w, h, dpr = 1, stage) {
  const quality = particleQuality(w, h);
  const renderer = getParticleRenderer();
  const N = renderer ? quality.count : Math.min(quality.count, 3000);
  const AMB = Math.round(clamp(N * 0.09, 300, 2400));
  const POR = Math.round(clamp(N * 0.08, 500, 1800));
  const WAVES = 3;
  const WAVE_N = Math.round(clamp(N * 0.05, 400, 1200));
  const TOTAL = N + AMB + POR + WAVES * WAVE_N;
  let active = N; // baja si el dispositivo no alcanza 60 FPS
  let renderScale = quality.scale;
  const interactive = !!stage && !stage.auto;

  // Encuadre: el corazón ocupa ~74% del ancho en vertical, ~40% del alto en horizontal
  const aspect = w / h;
  const HEART_W = 2.3;
  const HEART_H = 2.3;
  const dHero = Math.max(HEART_W / (0.72 * 2 * TAN * aspect), HEART_H / (0.4 * 2 * TAN));
  const hh = dHero * TAN;
  const hw = hh * aspect;
  const lookY = -0.16 * hh;
  const portalY = lookY - 0.62 * hh;
  const portalR = Math.min(0.95, hw * 0.52);
  const dName = dHero * 1.04;

  // --- Partículas del núcleo (simuladas en el espacio del objeto) ---
  const px = new Float32Array(N); const py = new Float32Array(N); const pz = new Float32Array(N);
  const vx = new Float32Array(N); const vy = new Float32Array(N); const vz = new Float32Array(N);
  const hx = new Float32Array(N); const hy = new Float32Array(N); const hz = new Float32Array(N);
  const tx = new Float32Array(N); const ty = new Float32Array(N); const tz = new Float32Array(N);
  const base = new Float32Array(N); // intensidad en el corazón
  const cr = new Float32Array(N); const cg = new Float32Array(N); const cb = new Float32Array(N);
  const size = new Float32Array(N);
  const phase = new Float32Array(N);
  const rank = new Float32Array(N); // 0 = abajo, 1 = arriba (orden de construcción)
  const radial = new Float32Array(N);
  const emitAt = new Float32Array(N);
  const appear = new Float32Array(N);
  const flash = new Float32Array(N);
  const kind = new Uint8Array(N); // 0 superficie, 1 línea, 2 interior, 3 núcleo
  const born = new Uint8Array(N); // 0 portal, 1 polvo disperso
  const launched = new Uint8Array(N);
  const placed = new Uint8Array(N);
  const letter = new Uint8Array(N);
  const orbit = new Float32Array(N * 4); // halo alrededor del nombre: ángulo, velocidad, radio, altura

  const LEVELS = 20;
  let i = 0;
  let guard = 0;
  while (i < N && guard++ < N * 20) {
    const u = Math.random();
    let x;
    let y;
    let z;
    if (u < 0.15) {
      // Líneas holográficas: cortes horizontales sobre la superficie
      const level = Math.floor(Math.random() * LEVELS);
      y = -0.92 + (level + 0.5) * (2.12 / LEVELS);
      const a = Math.random() * TAU;
      const r = sliceRadius(y, Math.cos(a), Math.sin(a));
      if (r <= 0.02) continue;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
      kind[i] = 1;
    } else {
      let dx = gauss();
      let dy = gauss();
      let dz = gauss();
      const len = Math.hypot(dx, dy, dz);
      if (len < 1e-3) continue;
      dx /= len; dy /= len; dz /= len;
      const R = heartRadius(dx, dy, dz);
      let r;
      if (u < 0.73) {
        if (Math.random() > (R * R) / 1.7) continue; // densidad uniforme en la superficie
        r = R * (1 - Math.abs(gauss()) * 0.03);
        kind[i] = 0;
      } else if (u < 0.95) {
        r = R * Math.pow(Math.random(), 0.55) * 0.9;
        kind[i] = 2;
      } else {
        r = R * (0.08 + Math.pow(Math.random(), 1.2) * 0.4);
        kind[i] = 3;
      }
      x = dx * r;
      y = dy * r;
      z = dz * r;
    }
    hx[i] = x;
    hy[i] = y - 0.08;
    hz[i] = z;
    radial[i] = clamp(Math.hypot(x, y - 0.1, z) / 1.2);
    phase[i] = Math.random() * TAU;
    const shimmer = 0.5 + 0.5 * Math.sin(x * 3.1 + y * 2.3 + z * 4.0);
    let col;
    if (kind[i] === 1) {
      col = Math.random() < 0.35 ? WHITE : CYAN;
      base[i] = 0.75 + Math.random() * 0.35;
      size[i] = 0.034 + Math.random() * 0.012;
    } else if (kind[i] === 0) {
      col = Math.random() < 0.07 ? WHITE : shimmer > 0.45 ? CYAN : BLUE;
      base[i] = 0.4 + Math.random() * 0.5;
      size[i] = 0.03 + Math.random() * 0.02;
    } else if (kind[i] === 2) {
      col = Math.random() < 0.25 ? CYAN : BLUE;
      base[i] = 0.16 + Math.random() * 0.22;
      size[i] = 0.028 + Math.random() * 0.018;
    } else {
      col = Math.random() < 0.6 ? WHITE : CYAN;
      base[i] = 0.3 + Math.random() * 0.25;
      size[i] = 0.035 + Math.random() * 0.02;
    }
    cr[i] = col[0]; cg[i] = col[1]; cb[i] = col[2];
    born[i] = Math.random() < 0.12 ? 1 : 0;
    i++;
  }
  const filled = i;
  for (; i < N; i++) {
    // Por si el muestreo se quedó corto: repite puntos existentes
    const j = Math.floor(Math.random() * filled);
    hx[i] = hx[j]; hy[i] = hy[j]; hz[i] = hz[j]; radial[i] = radial[j]; kind[i] = kind[j];
    base[i] = base[j]; size[i] = size[j]; cr[i] = cr[j]; cg[i] = cg[j]; cb[i] = cb[j];
    phase[i] = Math.random() * TAU; born[i] = born[j];
  }

  // Orden de construcción: de la punta hacia los lóbulos, con algo de azar
  const order = Array.from({ length: N }, (_, k) => k);
  const key = new Float32Array(N);
  for (let k = 0; k < N; k++) key[k] = ((hy[k] + 1.1) / 2.3) * 0.72 + Math.random() * 0.28;
  order.sort((a, b) => key[a] - key[b]);
  // Barajado de índices para que reducir `active` siga cubriendo toda la figura
  const slot = new Uint32Array(N);
  for (let k = 0; k < N; k++) slot[k] = k;
  for (let k = N - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    const tmp = slot[k]; slot[k] = slot[j]; slot[j] = tmp;
  }
  order.forEach((k, r) => { rank[k] = r / N; });

  for (let k = 0; k < N; k++) {
    emitAt[k] = PORTAL_ON + 0.25 + Math.pow(rank[k], 0.9) * (EMIT_END - PORTAL_ON - 0.25);
    appear[k] = 0.15 + Math.random() * 2.2;
    if (born[k]) {
      // Polvo que ya flota desde el inicio y luego se une a la figura
      px[k] = (Math.random() * 2 - 1) * hw * 1.1;
      py[k] = lookY + (Math.random() * 2 - 1) * hh * 0.85;
      pz[k] = (Math.random() * 2 - 1) * 2.4;
      launched[k] = 1;
    } else {
      px[k] = 0; py[k] = portalY; pz[k] = 0;
    }
  }

  // --- Polvo ambiental (espacio del mundo, delante y detrás) ---
  const ax = new Float32Array(AMB); const ay = new Float32Array(AMB); const az = new Float32Array(AMB);
  const avx = new Float32Array(AMB); const avy = new Float32Array(AMB); const avz = new Float32Array(AMB);
  const aph = new Float32Array(AMB); const aI = new Float32Array(AMB); const aS = new Float32Array(AMB);
  const aAppear = new Float32Array(AMB);
  const ambTop = lookY + hh * 1.5;
  const ambBottom = lookY - hh * 1.5;
  for (let k = 0; k < AMB; k++) {
    az[k] = lerp(-9, dHero * 0.72, Math.pow(Math.random(), 0.8));
    const dist = dHero * 1.2 - az[k];
    ax[k] = (Math.random() * 2 - 1) * dist * TAN * aspect * 1.15;
    ay[k] = lookY + (Math.random() * 2 - 1) * dist * TAN * 1.1;
    aph[k] = Math.random() * TAU;
    aI[k] = 0.05 + Math.random() * 0.25;
    aS[k] = 0.014 + Math.random() * 0.022;
    aAppear[k] = Math.random() * 2.4;
  }

  // --- Portal (anillos, vórtice y chispas que suben) ---
  const pType = new Uint8Array(POR);
  const pSeed = new Float32Array(POR);
  const pRad = new Float32Array(POR);
  for (let k = 0; k < POR; k++) {
    const u = Math.random();
    pType[k] = u < 0.55 ? Math.floor(Math.random() * 3) : u < 0.85 ? 3 : 4;
    pSeed[k] = Math.random();
    pRad[k] = gauss() * 0.02;
  }
  const RINGS = [1.0, 0.74, 0.46];
  const RING_SPEED = [0.35, -0.55, 0.9];

  // --- Ondas con forma de corazón ---
  const wIdx = new Uint32Array(WAVE_N);
  for (let k = 0; k < WAVE_N; k++) {
    let j = Math.floor(Math.random() * N);
    for (let tries = 0; tries < 8 && kind[j] > 1; tries++) j = Math.floor(Math.random() * N);
    wIdx[k] = j;
  }
  const waves = Array.from({ length: WAVES }, () => ({ start: -99, power: 0, speed: 1 }));
  let nextWave = 0;
  const spawnWave = (t, power, speed) => {
    Object.assign(waves[nextWave], { start: t, power, speed });
    nextWave = (nextWave + 1) % WAVES;
  };

  // --- Nombre ---
  let currentName = '';
  let nameHalfW = 1;
  const buildName = (name) => {
    currentName = name;
    const WPX = 1000;
    const HPX = 340;
    const pts = textPoints(name, WPX, HPX, 2, 900);
    if (!pts.length) return;
    const visW = 2 * dName * TAN * aspect;
    const worldW = Math.min(visW * 0.88, 2 * dName * TAN * 1.25);
    const k = worldW / WPX;
    let minX = Infinity;
    let maxX = -Infinity;
    for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); }
    nameHalfW = Math.max(0.4, ((maxX - minX) / 2) * k);
    const letterShare = clamp((pts.length * 1.1) / N, 0.35, 0.62);
    for (let n = 0; n < N; n++) {
      const s = slot[n] / N;
      letter[n] = s < letterShare ? 1 : 0;
      if (letter[n]) {
        const p = pts[Math.floor(Math.random() * pts.length)];
        tx[n] = (p.x + (Math.random() * 2 - 1) * 1.2) * k;
        ty[n] = -(p.y + (Math.random() * 2 - 1) * 1.2) * k + 0.02;
        tz[n] = Math.random() < 0.18 ? -0.08 - Math.random() * 0.1 : gauss() * 0.04;
      } else {
        const o = n * 4;
        orbit[o] = Math.random() * TAU;
        orbit[o + 1] = (0.12 + Math.random() * 0.35) * (Math.random() < 0.8 ? 1 : -1);
        orbit[o + 2] = nameHalfW * (0.85 + Math.pow(Math.random(), 1.5) * 0.9) + 0.15;
        orbit[o + 3] = gauss() * 0.75;
      }
    }
  };

  // --- Estado ---
  let burstAt = -1;
  let burstFired = false;
  let lastBeat = -1;
  let revealed = false;
  let frameEma = 16;
  let slowTime = 0;
  let downgrades = 0;
  let lastNow = 0;
  let lastT = -1;
  const vp = new Float32Array(16);
  const pos = new Float32Array(TOTAL * 4);
  const col = new Float32Array(TOTAL * 4);
  const eye = [0, 0, 0];
  const look = [0, lookY, 0];
  const glowU = new Float32Array(3);
  const beamU = new Float32Array(3);

  const beatShape = (x) => {
    if (x < 0) return 0;
    const ph = x % BEAT_PERIOD;
    const a = (ph - 0.07) / 0.055;
    const b = (ph - 0.33) / 0.07;
    return Math.exp(-a * a) + 0.55 * Math.exp(-b * b);
  };

  const project = (x, y, z) => {
    const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
    return [
      ((vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / cw) * 0.5 + 0.5,
      ((vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / cw) * 0.5 + 0.5,
      cw,
    ];
  };

  return (t, dt = 1 / 60) => {
    // Reinicio (vistas previas en bucle): recrea el estado desde cero
    const reset = t < lastT;
    lastT = t;
    if (reset) {
      burstAt = -1; burstFired = false; lastBeat = -1; revealed = false;
      for (let k = 0; k < AMB; k++) avx[k] = avy[k] = avz[k] = 0;
      for (let k = 0; k < N; k++) {
        launched[k] = born[k]; placed[k] = 0; flash[k] = 0; vx[k] = vy[k] = vz[k] = 0;
        if (born[k]) {
          px[k] = (Math.random() * 2 - 1) * hw * 1.1;
          py[k] = lookY + (Math.random() * 2 - 1) * hh * 0.85;
          pz[k] = (Math.random() * 2 - 1) * 2.4;
        }
      }
      for (const wv of waves) wv.start = -99;
    }
    const step = Math.min(Math.max(dt, 0), 1 / 20);

    // Ajuste automático de calidad
    const now = performance.now();
    if (lastNow) {
      const real = now - lastNow;
      if (real < 250) frameEma += (real - frameEma) * 0.05;
      if (t > 1.5 && frameEma > 24 && downgrades < 3) {
        slowTime += real / 1000;
        if (slowTime > 1.5) {
          downgrades++;
          slowTime = 0;
          frameEma = 16;
          active = Math.max(2500, Math.round(active * 0.72));
          renderScale = Math.max(0.5, renderScale * 0.82);
        }
      } else {
        slowTime = 0;
      }
    }
    lastNow = now;

    const name = cardName(stage, FALLBACK);
    if (name !== currentName) buildName(name);

    // Toque / explosión
    if (stage && stage.taps.length) {
      if (burstAt < 0 && t >= TAP_FROM) burstAt = t;
      stage.taps.length = 0;
    }
    if (burstAt < 0 && t >= (interactive ? WAIT_TAP : AUTO_TAP)) burstAt = t;
    const bursting = burstAt >= 0;
    const tb = bursting ? t - burstAt : -1;

    if (bursting && !burstFired) {
      burstFired = true;
      // Impulso radial en 3D; algunas partículas salen hacia la cámara
      for (let k = 0; k < N; k++) {
        let dx = px[k] + gauss() * 0.35;
        let dy = py[k] + gauss() * 0.35;
        let dz = pz[k] + gauss() * 0.35;
        const len = Math.hypot(dx, dy, dz) || 1;
        const sp = (4.5 + Math.random() * 7) * (kind[k] === 3 ? 1.4 : 1);
        dx /= len; dy /= len; dz /= len;
        vx[k] = dx * sp + (Math.random() - 0.5) * 2;
        vy[k] = dy * sp + (Math.random() - 0.5) * 2;
        vz[k] = dz * sp + (Math.random() < 0.08 ? 3 + Math.random() * 4 : 0);
        placed[k] = 0;
        launched[k] = 1;
      }
      for (let k = 0; k < AMB; k++) {
        const dx = ax[k];
        const dy = ay[k];
        const dz = az[k];
        const len = Math.hypot(dx, dy, dz) || 1;
        const sp = 3.5 / (0.6 + len * 0.25);
        avx[k] += (dx / len) * sp; avy[k] += (dy / len) * sp; avz[k] += (dz / len) * sp;
      }
      spawnWave(t, 1.8, 3.2);
    }

    const heartness = bursting ? 1 - clamp((tb - SCATTER) / 0.6) : 1;
    const nameMorph = bursting ? easeInOut(clamp((tb - SCATTER) / 0.9)) : 0;
    const gatherAll = clamp((t - GATHER) / 3.4);

    // Latido
    let beat = 0;
    if (!bursting && t >= BEAT_START) {
      const n = Math.floor((t - BEAT_START) / BEAT_PERIOD);
      if (n !== lastBeat) {
        lastBeat = n;
        spawnWave(BEAT_START + n * BEAT_PERIOD + 0.06, 0.9, 1.9);
      }
      beat = beatShape(t - BEAT_START) * clamp((t - BEAT_START) / 0.1);
    }
    if (bursting && !revealed && tb >= REVEAL) {
      revealed = true;
      if (stage) stage.revealed = true;
    }

    // Rotación del objeto: el corazón gira para mostrar su volumen; el nombre casi de frente
    const yawHeart = 0.55 * Math.sin(t * 0.42) + 0.15 * Math.sin(t * 0.17);
    const yawName = 0.16 * Math.sin(t * 0.33);
    const yaw = lerp(yawHeart, yawName, nameMorph);
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const tilt = 0.06 * Math.sin(t * 0.29);
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const breathe = 1 + 0.012 * Math.sin(t * 1.3);

    // --- Simulación del núcleo ---
    let o = 0;
    for (let k = 0; k < N; k++) {
      if (slot[k] >= active) continue; // `slot` es una permutación: al bajar calidad queda un subconjunto disperso
      let visible = 1;
      let targetX;
      let targetY;
      let targetZ;
      let stiff;
      let damp;
      let noiseAmp;

      if (!bursting) {
        if (!launched[k]) {
          if (t < emitAt[k]) {
            pos[o * 4 + 3] = 0;
            col[o * 4 + 3] = 0;
            o++;
            continue;
          }
          // Sale del portal: disco con giro y empuje vertical
          launched[k] = 1;
          const a = phase[k] * 3 + t * 2;
          const r = portalR * (0.12 + Math.sqrt(Math.random()) * 0.3);
          px[k] = Math.cos(a) * r;
          pz[k] = Math.sin(a) * r;
          py[k] = portalY + 0.02;
          vx[k] = -Math.sin(a) * 0.9 + px[k] * 0.4;
          vz[k] = Math.cos(a) * 0.9 + pz[k] * 0.4;
          vy[k] = 2.3 + Math.random() * 1.3;
        }
        const age = born[k] ? t - appear[k] : t - emitAt[k];
        visible = clamp(age / (born[k] ? 1.2 : 0.12));
        const gateStart = GATHER + rank[k] * 1.9 + (born[k] ? 0.3 : 0);
        const gate = easeInOut(clamp((t - gateStart) / 0.9)) * (born[k] ? 1 : clamp((t - emitAt[k]) / 0.5));
        targetX = hx[k]; targetY = hy[k]; targetZ = hz[k];
        stiff = 30 * gate;
        damp = 2 * Math.sqrt(stiff) * 0.78 + (born[k] ? 1.3 : 0.55) * (1 - gate);
        noiseAmp = (born[k] ? 0.22 : 0.7) * (1 - gate * 0.92) + 0.04;
        if (!placed[k] && gate > 0.85) {
          const dx = px[k] - hx[k];
          const dy = py[k] - hy[k];
          const dz = pz[k] - hz[k];
          if (dx * dx + dy * dy + dz * dz < 0.004) {
            placed[k] = 1;
            flash[k] = 1;
          }
        }
      } else {
        const back = easeInOut(clamp((tb - SCATTER) / 0.55));
        if (letter[k]) {
          targetX = tx[k]; targetY = ty[k]; targetZ = tz[k];
          stiff = 62 * back;
        } else {
          const ob = k * 4;
          const ang = orbit[ob] + t * orbit[ob + 1];
          const r = orbit[ob + 2];
          targetX = Math.cos(ang) * r;
          targetZ = Math.sin(ang) * r * 0.7;
          targetY = orbit[ob + 3] + Math.sin(ang * 2 + phase[k]) * 0.12;
          stiff = 7 * back;
        }
        damp = back > 0 ? 2 * Math.sqrt(stiff) * 0.85 + 0.3 : 1.25;
        noiseAmp = letter[k] ? 0.6 * (1 - back) + 0.03 : 0.25;
        if (letter[k] && back > 0.9 && !placed[k]) {
          const dx = px[k] - targetX;
          const dy = py[k] - targetY;
          const dz = pz[k] - targetZ;
          if (dx * dx + dy * dy + dz * dz < 0.003) {
            placed[k] = 1;
            flash[k] = 0.8;
          }
        }
      }

      // Campo de flujo (suma de senos desfasados, barato y orgánico)
      const ph = phase[k];
      const fx = Math.sin(py[k] * 1.7 + t * 0.9 + ph) + Math.sin(pz[k] * 2.3 - t * 0.6);
      const fy = Math.sin(pz[k] * 1.9 + t * 0.7 + ph * 1.3) + Math.sin(px[k] * 1.4 + t * 0.5);
      const fz = Math.sin(px[k] * 2.1 - t * 0.8 + ph * 0.7) + Math.sin(py[k] * 1.2 + t * 0.4);
      vx[k] += (stiff * (targetX - px[k]) - damp * vx[k] + fx * noiseAmp) * step;
      vy[k] += (stiff * (targetY - py[k]) - damp * vy[k] + fy * noiseAmp) * step;
      vz[k] += (stiff * (targetZ - pz[k]) - damp * vz[k] + fz * noiseAmp) * step;
      px[k] += vx[k] * step;
      py[k] += vy[k] * step;
      pz[k] += vz[k] * step;
      flash[k] *= Math.exp(-step * 3.2);

      // Posición de render: micro movimiento, respiración y latido con retraso desde el centro
      const settled = bursting ? nameMorph : clamp((t - HERO + 0.4) / 1.2) * gatherAll;
      const micro = (kind[k] >= 2 ? 0.03 : 0.012) * (0.4 + 0.6 * settled);
      let lx = px[k] + Math.sin(t * 1.9 + ph * 5) * micro;
      let ly = py[k] + Math.sin(t * 1.6 + ph * 7) * micro;
      let lz = pz[k] + Math.cos(t * 1.7 + ph * 3) * micro;
      let pulse = 0;
      if (heartness > 0) {
        if (kind[k] >= 2) {
          // Flujo interno: los puntos de dentro giran un poco, más cerca del centro
          const sw = 0.28 * Math.sin(t * 0.55 + radial[k] * 3) * (1 - radial[k]) * settled * heartness;
          const cs = Math.cos(sw);
          const sn = Math.sin(sw);
          const nx = lx * cs - lz * sn;
          lz = lx * sn + lz * cs;
          lx = nx;
        }
        const bl = beat > 0 ? beatShape(t - BEAT_START - radial[k] * 0.11) : 0;
        pulse = bl * heartness;
        const grow = (breathe - 1) * settled * heartness + pulse * 0.075;
        lx += lx * grow; ly += (ly - 0.1) * grow; lz += lz * grow;
      } else {
        const b2 = 1 + 0.01 * Math.sin(t * 1.1) * nameMorph;
        lx *= b2; ly *= b2;
      }
      // Objeto → mundo (giro Y + leve inclinación X)
      const wx = lx * cy + lz * sy;
      const wz0 = -lx * sy + lz * cy;
      const wy = ly * ct - wz0 * st;
      const wz = ly * st + wz0 * ct;

      // Apariencia: del corazón al nombre
      let intensity = lerp(base[k], letter[k] ? 0.42 + 0.3 * ((ph * 5) % 1) : 0.22 + 0.12 * ((ph * 3) % 1), nameMorph);
      let r = cr[k];
      let g = cg[k];
      let b = cb[k];
      if (nameMorph > 0 && letter[k]) {
        const white = ((ph * 11) % 1) < 0.18 ? 1 : 0;
        r = lerp(r, white ? WHITE[0] : CYAN[0] * 0.7 + BLUE[0] * 0.3, nameMorph);
        g = lerp(g, white ? WHITE[1] : CYAN[1] * 0.7 + BLUE[1] * 0.3, nameMorph);
        b = lerp(b, white ? WHITE[2] : 1, nameMorph);
        // Barrido de brillo de izquierda a derecha
        const sweep = (tb * 0.42) % 1.8 - 0.4;
        const d = px[k] / (nameHalfW * 2) + 0.5 - sweep;
        intensity *= 1 + 1.1 * Math.exp(-d * d * 60) * nameMorph;
      }
      const speed = Math.abs(vx[k]) + Math.abs(vy[k]) + Math.abs(vz[k]);
      const energetic = Math.min(speed * 0.12, 1);
      intensity *= 1 + energetic * 0.3;
      if (!bursting && !placed[k]) intensity *= 0.5; // en viaje: trazos finos, sin saturar
      r = lerp(r, CYAN[0], energetic * 0.5);
      g = lerp(g, CYAN[1], energetic * 0.5);
      const tw = Math.sin(t * (1.3 + (ph % 1.7)) + ph * 9);
      if (tw > 0.97) intensity *= 1 + (tw - 0.97) * 60;
      intensity *= 1 + flash[k] * 1.4 + pulse * 1.1;
      if (bursting && tb < SCATTER + 0.4) intensity *= lerp(1, 0.3, Math.sin(clamp(tb / (SCATTER + 0.4)) * Math.PI));
      // Profundidad: lo que queda detrás del centro se apaga (se lee el volumen)
      intensity *= 0.72 * (0.45 + 0.55 * clamp((wz + 1.1) / 2.2));

      const q = o * 4;
      pos[q] = wx; pos[q + 1] = wy; pos[q + 2] = wz; pos[q + 3] = intensity * visible;
      col[q] = r; col[q + 1] = g; col[q + 2] = b;
      col[q + 3] = size[k] * (1 + flash[k] * 0.9 + energetic * 0.3) * (letter[k] ? lerp(1, 0.82, nameMorph) : 1);
      o++;
    }

    // --- Polvo ambiental ---
    const heartScreenR = 1.15;
    for (let k = 0; k < AMB; k++) {
      const ph = aph[k];
      avx[k] *= Math.exp(-step * 1.6); avy[k] *= Math.exp(-step * 1.6); avz[k] *= Math.exp(-step * 1.6);
      ax[k] += (Math.sin(ay[k] * 0.7 + t * 0.21 + ph) * 0.06 + avx[k]) * step;
      ay[k] += (0.05 + Math.cos(ax[k] * 0.6 + t * 0.17 + ph) * 0.04 + avy[k]) * step;
      az[k] += (Math.sin(t * 0.13 + ph * 2) * 0.05 + avz[k]) * step;
      if (ay[k] > ambTop) ay[k] = ambBottom;
      let boost = 0;
      const dist = Math.hypot(ax[k], ay[k], az[k]);
      for (const wv of waves) {
        const age = t - wv.start;
        if (age < 0 || age > 1.6) continue;
        const R = heartScreenR * (1 + age * wv.speed * 1.4);
        const d = (dist - R) / 0.35;
        boost += Math.exp(-d * d) * wv.power * (1 - age / 1.6);
      }
      const q = o * 4;
      pos[q] = ax[k]; pos[q + 1] = ay[k]; pos[q + 2] = az[k];
      pos[q + 3] = aI[k] * clamp((t - aAppear[k]) / 1.5) * (0.75 + 0.25 * Math.sin(t * 0.9 + ph * 4)) * (1 + boost * 2.5);
      const c = boost > 0.2 ? CYAN : BLUE;
      col[q] = c[0]; col[q + 1] = c[1]; col[q + 2] = c[2]; col[q + 3] = aS[k];
      o++;
    }

    // --- Portal ---
    const ignite = clamp((t - PORTAL_ON) / 0.9);
    const igniteShape = ignite <= 0 ? 0 : 1 + 2.70158 * Math.pow(ignite - 1, 3) + 1.70158 * Math.pow(ignite - 1, 2);
    const portalFlash = t > PORTAL_ON ? Math.exp(-(t - PORTAL_ON) * 2.2) : 0;
    const feeding = clamp((t - PORTAL_ON) / 0.4) * (1 - 0.6 * clamp((t - HERO) / 1.5));
    const portalLevel = bursting ? lerp(0.4, 0.28, nameMorph) : feeding + beat * 0.25;
    for (let k = 0; k < POR; k++) {
      const s = pSeed[k];
      const type = pType[k];
      let x;
      let y;
      let z;
      let I;
      let c;
      let sz = 0.03;
      if (type < 3) {
        const a = s * TAU + t * RING_SPEED[type];
        const r = portalR * (RINGS[type] + pRad[k]) * igniteShape;
        x = Math.cos(a) * r; z = Math.sin(a) * r;
        y = portalY + pRad[k] * 0.4 + Math.sin(a * 6 + t * 3) * 0.012;
        const dash = 0.55 + 0.45 * Math.sin(a * (type + 3) * 2 - t * 2.5);
        I = (type === 0 ? 0.9 : 0.6) * dash;
        c = type === 0 && s * 7 % 1 < 0.25 ? WHITE : CYAN;
      } else if (type === 3) {
        // Vórtice que cae hacia el centro
        const f = (s * 13 + t * 0.32) % 1;
        const r = portalR * 0.95 * (1 - f) * igniteShape;
        const a = s * TAU * 5 + t * 1.3 + f * 6;
        x = Math.cos(a) * r; z = Math.sin(a) * r; y = portalY - f * 0.04;
        I = Math.sin(f * Math.PI) * 0.55;
        c = f > 0.75 ? WHITE : BLUE;
        sz = 0.026;
      } else {
        // Chispas que suben alimentando la figura
        const f = (s * 17 + t * (0.28 + s * 0.2)) % 1;
        const a = s * TAU * 3 + t * 0.8;
        const r = portalR * 0.8 * (1 - f * 0.7) * igniteShape;
        x = Math.cos(a) * r; z = Math.sin(a) * r; y = portalY + f * (hh * 0.9);
        I = (1 - f) * (1 - f) * 0.7;
        c = CYAN;
        sz = 0.022;
      }
      const q = o * 4;
      pos[q] = x; pos[q + 1] = y; pos[q + 2] = z;
      pos[q + 3] = I * (portalLevel + portalFlash * 2.5) * (ignite > 0 ? 1 : 0);
      col[q] = c[0]; col[q + 1] = c[1]; col[q + 2] = c[2]; col[q + 3] = sz * (1 + portalFlash);
      o++;
    }

    // --- Ondas ---
    for (const wv of waves) {
      const age = t - wv.start;
      const alive = age >= 0 && age < 1.4;
      const scale = 1.02 + age * wv.speed;
      const fade = alive ? Math.pow(1 - age / 1.4, 2) * wv.power : 0;
      for (let k = 0; k < WAVE_N; k++) {
        const q = o * 4;
        if (!alive) {
          pos[q + 3] = 0;
          o++;
          continue;
        }
        const j = wIdx[k];
        const jit = 1 + Math.sin(phase[j] * 9 + age * 4) * 0.03;
        const lx = hx[j] * scale * jit;
        const ly = hy[j] * scale * jit + 0.05;
        const lz = hz[j] * scale * jit;
        const wx = lx * cy + lz * sy;
        const wz0 = -lx * sy + lz * cy;
        pos[q] = wx; pos[q + 1] = ly * ct - wz0 * st; pos[q + 2] = ly * st + wz0 * ct;
        pos[q + 3] = fade * 0.5;
        const c = age < 0.3 ? WHITE : CYAN;
        col[q] = c[0]; col[q + 1] = c[1]; col[q + 2] = c[2]; col[q + 3] = 0.03;
        o++;
      }
    }

    // --- Cámara ---
    const dStart = dHero * 1.24;
    let dist = lerp(dStart, dHero, easeInOut(clamp((t - HERO) / 2)));
    dist -= 0.02 * dHero * clamp((t - GATHER) / 3.4);
    if (bursting) {
      dist = lerp(dist, dName, easeInOut(clamp((tb - 0.3) / 1.8)));
      dist -= Math.sin(clamp(tb / 0.45) * Math.PI) * dHero * 0.05;
    }
    const camYaw = 0.1 * Math.sin(t * 0.19);
    const shake = bursting ? Math.exp(-tb * 7) * 0.08 : 0;
    eye[0] = Math.sin(camYaw) * dist + Math.sin(t * 61) * shake;
    eye[1] = lookY + dist * 0.12 + 0.06 * Math.sin(t * 0.27) + Math.cos(t * 53) * shake;
    eye[2] = Math.cos(camYaw) * dist;
    look[1] = lookY;
    viewProjection(vp, eye, look, aspect);

    const heartUV = project(0, 0, 0);
    const portalUV = project(0, portalY, 0);
    const formed = clamp((t - GATHER) / 3.5);
    glowU[0] = heartUV[0]; glowU[1] = heartUV[1];
    glowU[2] = bursting ? lerp(0.2, 0.55, nameMorph) : formed * (0.7 + beat * 0.9);
    beamU[0] = portalUV[0]; beamU[1] = portalUV[1];
    beamU[2] = (bursting ? 0.35 : feeding) * ignite + portalFlash;

    let trail = 0;
    if (!bursting) trail = clamp((t - PORTAL_ON) / 0.5) * lerp(0.55, 0.15, clamp((t - HERO + 0.5) / 1.2));
    else trail = lerp(0.62, 0.18, clamp((tb - SCATTER - 0.6) / 1.2));
    const burstFlash = bursting ? Math.exp(-tb * 7) * 0.22 : 0;

    const cssScale = Math.min(dpr, 2) * renderScale;
    const fbW = Math.max(2, Math.round(w * cssScale));
    const fbH = Math.max(2, Math.round(h * cssScale));
    const pxPerUnit = fbH / (2 * TAN);

    if (renderer) {
      renderer.render({
        width: fbW,
        height: fbH,
        vp,
        pos,
        col,
        count: o,
        px: pxPerUnit,
        focus: Math.hypot(eye[0], eye[1], eye[2]),
        aperture: 0.05,
        maxSize: 48 * cssScale,
        trail,
        flash: burstFlash + portalFlash * 0.12,
        glow: glowU,
        beam: beamU,
        time: t,
        reset,
        owner: pos,
      });
      ctx.drawImage(renderer.canvas, 0, 0, w, h);
    } else {
      drawParticles2D(ctx, w, h, vp, pos, col, o, Math.hypot(eye[0], eye[1], eye[2]));
    }

    // Indicación discreta para tocar
    if (interactive && !bursting && t > TAP_FROM + 0.6) {
      const a = clamp((t - TAP_FROM - 0.6) / 0.8) * (0.72 + 0.28 * Math.sin(t * 3.2));
      const fs = Math.max(11, Math.min(w, h) * 0.034);
      ctx.save();
      ctx.font = `600 ${fs}px system-ui, "Segoe UI", sans-serif`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${fs * 0.35}px`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(60, 200, 255, 0.9)';
      ctx.shadowBlur = fs;
      ctx.fillStyle = `rgba(190, 240, 255, ${a})`;
      ctx.fillText('TOCA EL CORAZÓN', w / 2, (1 - portalUV[1]) * h - h * 0.075);
      ctx.restore();
    }
  };
}
