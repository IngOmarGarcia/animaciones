// Núcleo del Jardín de lunas doradas (codename interno: Dana2).
// Las partículas SON el mundo: luna, islas, cascadas, agua y flores se muestrean como puntos
// y se dibujan con el renderizador compartido de util.js (un solo drawArrays por cuadro).
// La personalización vive en readConfig(): el motor nunca lee la tarjeta directamente.

export const DANA_FOV = Math.tan((31 * Math.PI) / 180); // vertical ~62°: un mundo 360° pide más campo que un retrato

export const DANA_DEFAULTS = {
  recipientName: 'Dana',
  senderName: '',
  introMessage: 'Porque las flores normales estaban demasiado fáciles.',
  letterTitle: 'Un lugar para nosotros',
  letterText: 'Hay lugares que solo existen cuando estamos juntos. Este jardín es uno de ellos.',
  memories: ['Tu luz~Hace más bonito cada día', 'Aquel instante~Quisiera vivirlo otra vez', 'Tu risa~Mi sonido favorito', 'Para siempre~No sé cuánto dura el infinito, pero me gustaría descubrirlo contigo.', 'El futuro~Me emociona imaginarlo a tu lado', 'La calma~Contigo todo encuentra su lugar', 'Para Dana~Cada rincón de este universo lo hice pensando en ti.'],
  flower: [1.0, 0.73, 0.16],
  energy: [0.22, 0.82, 0.96],
  water: [0.06, 0.24, 0.55],
  moon: [0.85, 0.91, 1.0],
};

const hex = (value, fallback) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(value || ''));
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

// Tarjeta del enlace → configuración. Fuera del motor gráfico, como pide la skill.
export function readConfig(card) {
  const memories = String(card?.mem || '').split('|').map((x) => x.trim().slice(0, 160)).filter(Boolean);
  const recipientName = (card?.p || DANA_DEFAULTS.recipientName).trim().slice(0, 24);
  return {
    ...DANA_DEFAULTS,
    recipientName,
    senderName: (card?.d || '').trim().slice(0, 24),
    introMessage: (card?.m || '').trim() || DANA_DEFAULTS.introMessage,
    letterTitle: (card?.lt || '').trim() || DANA_DEFAULTS.letterTitle,
    letterText: (card?.l || '').trim() || DANA_DEFAULTS.letterText,
    memories: memories.length ? memories : DANA_DEFAULTS.memories.map((entry, index) => index === 6 ? entry.replace('Para Dana~', `Para ${recipientName}~`) : entry),
    photo: /^data:image\/(?:jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(card?.img || '') ? card.img : '',
    flower: hex(card?.c1, DANA_DEFAULTS.flower),
    energy: hex(card?.c2, DANA_DEFAULTS.energy),
  };
}

// ---- Utilidades ----
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const ease = (x) => { const c = clamp01(x); return c * c * (3 - 2 * c); };
export const mixn = (a, b, t) => a + (b - a) * t;

export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ruido barato de sumas de senos: suficiente para relieve de islas y ondas de agua.
export const wobble = (x, y, z) => Math.sin(x * 1.7 + y * 2.3) * 0.5 + Math.sin(y * 3.1 - z * 1.9) * 0.3 + Math.sin(z * 2.7 + x * 1.3) * 0.2;

// ---- Cámara 360° ----
// La cámara recorre el mundo y conserva la mirada libre entre estaciones.
export function createCamera() {
  const cam = {
    yaw: 0, pitch: 0.02,
    targetYaw: 0, targetPitch: 0.02,
    eye: [0, 0, 0], target: [0, 0, -1],
    travel: null,
    drift: 0,
  };

  cam.look = (dyaw, dpitch) => {
    cam.targetYaw += dyaw;
    // Hacia abajo se permite más recorrido: ahí están el lago y el reflejo
    cam.targetPitch = Math.max(-0.85, Math.min(0.5, cam.targetPitch + dpitch));
    cam.travel = null; // cualquier gesto cancela el viaje automático
  };

  // Viaje cinematográfico a un punto de interés: nunca teletransporta
  cam.travelTo = (yaw, pitch, seconds = 1.8, eye = null) => {
    let delta = yaw - cam.targetYaw;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta)); // por el camino corto
    cam.travel = {
      fromYaw: cam.targetYaw, toYaw: cam.targetYaw + delta,
      fromPitch: cam.targetPitch, toPitch: pitch,
      fromEye: [...cam.eye], toEye: eye ? [...eye] : [...cam.eye], t: 0, seconds,
    };
  };

  cam.update = (dt, autoDrift) => {
    if (cam.travel) {
      cam.travel.t += dt;
      const k = ease(cam.travel.t / cam.travel.seconds);
      cam.targetYaw = mixn(cam.travel.fromYaw, cam.travel.toYaw, k);
      cam.targetPitch = mixn(cam.travel.fromPitch, cam.travel.toPitch, k);
      for (let axis = 0; axis < 3; axis++) cam.eye[axis] = mixn(cam.travel.fromEye[axis], cam.travel.toEye[axis], k);
      if (cam.travel.t >= cam.travel.seconds) cam.travel = null;
    } else if (autoDrift) {
      cam.drift += dt;
      cam.targetYaw += Math.sin(cam.drift * 0.08) * dt * 0.02;
    }
    // Amortiguado: el sensor y el dedo nunca mueven la cámara de golpe
    const k = 1 - Math.exp(-dt * 4.5);
    cam.yaw += (cam.targetYaw - cam.yaw) * k;
    cam.pitch += (cam.targetPitch - cam.pitch) * k;
    const cp = Math.cos(cam.pitch);
    cam.target[0] = cam.eye[0] + Math.sin(cam.yaw) * cp;
    cam.target[1] = cam.eye[1] + Math.sin(cam.pitch);
    cam.target[2] = cam.eye[2] - Math.cos(cam.yaw) * cp;
    return cam;
  };

  return cam;
}

// ---- Intro cinematográfica ----
// Fases: oscuridad → portal → entrada → warp → revelado escalonado → título → exploración.
// La luna aparece después de atravesar el centro del girasol.
export const INTRO = { dark: 1.4, portal: 4.2, enter: 5.6, warp: 6.4, moon: 7.9, look: 10, islands: 15.2, falls: 15.8, flowers: 16.2, title: 10.6, free: 15.2 };

// Espiral dorada que gira frente a la cámara antes de atravesarla.
export function buildPortal(budget) {
  const rnd = seeded(404);
  const count = Math.max(300, Math.round(budget * 0.1));
  const seedCount = Math.round(count * 0.3);
  const pts = new Float32Array(count * 4); // ángulo, radio, profundidad, fase
  for (let i = 0; i < count; i++) {
    if (i < seedCount) {
      const k = Math.sqrt(rnd());
      pts[i * 4] = i * 2.39996 + (rnd() - 0.5) * 0.15;
      pts[i * 4 + 1] = 1.65 + k * 3.65;
      pts[i * 4 + 2] = (rnd() - 0.5) * 1.5;
    } else {
      const petal = Math.floor(rnd() * 16);
      const u = rnd();
      pts[i * 4] = petal * Math.PI / 8 + (rnd() - 0.5) * Math.sin(Math.PI * u) * 0.35;
      pts[i * 4 + 1] = 5.3 + u * 8.1 + (rnd() - 0.5) * 0.55;
      pts[i * 4 + 2] = (rnd() - 0.5) * 1.8;
    }
    pts[i * 4 + 3] = rnd() * 6.28;
  }
  return { count, seedCount, pts };
}

// Curva de la intro: 0 antes de empezar, 1 cuando el elemento está del todo presente.
export const revealAt = (t, start, dur = 1.6) => ease((t - start) / dur);

// ---- Giroscopio ----
// Nunca pide permiso al cargar: solo cuando el visitante toca el botón de vista 360°.
// Si no hay sensor o lo rechaza, la experiencia sigue completa con el arrastre.
export function createGyro() {
  const gyro = {
    available: typeof window !== 'undefined' && window.isSecureContext
      && typeof window.DeviceOrientationEvent !== 'undefined',
    active: false, pending: false, asked: false, denied: false,
    yaw: 0, pitch: 0, base: null, samples: 0,
  };

  const onOrientation = (event) => {
    if (event.alpha === null && event.beta === null && event.gamma === null) return;
    const yaw = (event.alpha || 0) * Math.PI / 180;
    const pitch = (event.beta || 0) * Math.PI / 180;
    const roll = (event.gamma || 0) * Math.PI / 180;
    gyro.samples++;
    gyro.pending = false;
    gyro.active = true;
    // Calibración: la primera lectura tras activar (o recentrar) marca el centro de la vista
    if (!gyro.base) { gyro.base = { yaw, pitch, roll }; gyro.yaw = 0; gyro.pitch = 0; return; }
    let dy = yaw - gyro.base.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    gyro.yaw = dy + (roll - gyro.base.roll) * 0.55;
    gyro.pitch = Math.max(-0.7, Math.min(0.7, pitch - gyro.base.pitch));
  };

  gyro.enable = async () => {
    if (!gyro.available || gyro.asked) return gyro.active;
    gyro.asked = true;
    try {
      if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
        const answer = await window.DeviceOrientationEvent.requestPermission();
        if (answer !== 'granted') { gyro.denied = true; return false; }
      }
      window.addEventListener('deviceorientation', onOrientation);
      gyro.pending = true;
      window.setTimeout(() => {
        if (gyro.samples === 0) {
          gyro.active = false;
          gyro.pending = false;
          gyro.denied = true;
          window.removeEventListener('deviceorientation', onOrientation);
        }
      }, 2500);
    } catch (error) {
      gyro.pending = false;
      gyro.denied = true;
    }
    return gyro.active;
  };

  gyro.recenter = () => { gyro.base = null; };
  gyro.disable = () => {
    if (typeof window !== 'undefined') window.removeEventListener('deviceorientation', onOrientation);
    gyro.active = false;
    gyro.pending = false;
  };
  return gyro;
}

// ---- Calidad ----
export function danaQuality(w, h) {
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  let tier = 'high';
  if (coarse) tier = cores >= 8 && memory >= 4 ? 'medium' : 'low';
  else if (cores < 8) tier = 'medium';
  const budget = { high: 24000, medium: 13000, low: 6000 }[tier];
  const area = Math.min(1, Math.sqrt((w * h) / (390 * 844)));
  return { tier, budget: Math.max(6000, Math.round(budget * area)), scale: coarse ? 0.8 : 1 };
}

// ---- Mundo ----
// Cada sistema devuelve puntos con posición fija en el mundo; el brillo se calcula por cuadro.
const MOON = { x: -80, y: 280, z: -1350, r: 370 };
const EARTH = { x: 100, y: -240, z: 4800, r: 3150 };

// La cámara viaja por el centro y cada estación encuadra una isla distinta.
// Las mismas estaciones alimentan la cinta de luz visible bajo el recorrido.
export const JOURNEY_STOPS = [
  { eye: [0, -8, -30], island: 0 },
  { eye: [10, -1, -112], island: 1 },
  { eye: [-10, 6, -198], island: 2 },
  { eye: [12, -8, -286], island: 3 },
  { eye: [-11, 13, -376], island: 4 },
  { eye: [11, -1, -470], island: 5 },
  { eye: [0, 8, -575], island: 6 },
];
export const JOURNEY_LEG_SECONDS = 9;

export function journeyPose(world, progress, out = { eye: [0, 0, 0], yaw: 0, pitch: 0 }) {
  const i = Math.min(JOURNEY_STOPS.length - 1, Math.max(0, Math.floor(progress)));
  const next = Math.min(i + 1, JOURNEY_STOPS.length - 1);
  // La cámara se detiene ante cada isla antes de continuar hacia la siguiente.
  const k = ease(clamp01((progress - i - 0.42) / 0.58));
  const a = JOURNEY_STOPS[i].eye, b = JOURNEY_STOPS[next].eye;
  const eye = out.eye;
  for (let axis = 0; axis < 3; axis++) eye[axis] = mixn(a[axis], b[axis], k);
  const from = world.islands[i], to = world.islands[next];
  const dx = mixn(from.x, to.x, k) - eye[0];
  const dy = mixn(from.y, to.y, k) + 6 - eye[1];
  const dz = mixn(from.z, to.z, k) - eye[2];
  out.yaw = Math.atan2(dx, -dz);
  out.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  return out;
}

export function buildWorld(config, budget) {
  const rnd = seeded(7);
  const share = (f) => Math.max(200, Math.round(budget * f));

  // Estrellas en tres capas: el parallax real lo da la distancia, no un truco 2D
  const stars = [];
  for (const [count, near, far, size] of [[share(0.1), 900, 1600, 0.9], [share(0.07), 420, 900, 1.3], [share(0.04), 120, 420, 2.0]]) {
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2;
      const b = Math.acos(2 * rnd() - 1);
      const d = mixn(near, far, rnd());
      stars.push({
        x: Math.sin(b) * Math.cos(a) * d, y: Math.cos(b) * d * 0.7, z: Math.sin(b) * Math.sin(a) * d,
        size: size * (0.7 + rnd() * 0.8), phase: rnd() * 6.28, warm: rnd() < 0.18,
      });
    }
  }

  // Luna: superficie muestreada (no un círculo) con cráteres y halo
  const moon = [];
  const moonCount = share(0.16);
  for (let i = 0; i < moonCount; i++) {
    const u = rnd() * Math.PI * 2;
    const v = Math.acos(2 * rnd() - 1);
    const nx = Math.sin(v) * Math.cos(u);
    const ny = Math.cos(v);
    const nz = Math.sin(v) * Math.sin(u);
    if (nz < -0.25) continue; // solo la cara visible: no se gastan puntos en la nuca
    const crater = wobble(nx * 5, ny * 5, nz * 5);
    const mare = wobble(nx * 1.7, ny * 1.7, nz * 1.7);
    moon.push({
      x: MOON.x + nx * MOON.r, y: MOON.y + ny * MOON.r, z: MOON.z + nz * MOON.r,
      nx, ny, nz,
      shade: clamp01(0.35 + crater * 0.3 + mare * 0.45),
      size: 2.6 + rnd() * 1.6,
    });
  }
  const halo = [];
  const haloCount = share(0.04);
  for (let i = 0; i < haloCount; i++) {
    const a = rnd() * Math.PI * 2;
    const d = MOON.r * (1.02 + Math.pow(rnd(), 2.2) * 0.5);
    halo.push({ x: MOON.x + Math.cos(a) * d, y: MOON.y + Math.sin(a) * d * 0.96, z: MOON.z + 12, a: Math.pow(1 - (d / MOON.r - 1) / 0.5, 2), size: 3 + rnd() * 5 });
  }

  // La Tierra queda al lado opuesto del recorrido: aparece al mirar hacia atrás.
  // El ruido continuo crea masas verdes reconocibles.
  const earth = [];
  const earthCount = Math.max(6000, Math.round(budget * 0.68));
  for (let i = 0; i < earthCount; i++) {
    const az = rnd() * Math.PI * 2;
    const ny = rnd() * 2 - 1;
    const ring = Math.sqrt(1 - ny * ny);
    const nx = Math.cos(az) * ring, nz = Math.sin(az) * ring;
    if (nz > 0.18) continue;
    const land = wobble(nx * 2.7 + 0.8, ny * 2.7 - 0.4, nz * 2.7)
      + wobble(nx * 6.2, ny * 6.2, nz * 6.2) * 0.28 > 0.1;
    earth.push({
      x: EARTH.x + nx * EARTH.r, y: EARTH.y + ny * EARTH.r, z: EARTH.z + nz * EARTH.r,
      nx, ny, nz, land, shade: 0.65 + rnd() * 0.35, size: 5 + rnd() * 2,
    });
  }
  const earthHalo = [];
  for (let i = 0, count = Math.max(720, Math.round(budget * 0.09)); i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const r = EARTH.r * (1.005 + Math.pow(rnd(), 2) * 0.12);
    earthHalo.push({ x: EARTH.x + Math.cos(a) * r, y: EARTH.y + Math.sin(a) * r,
      z: EARTH.z - 30, alpha: 1 - (r / EARTH.r - 1) / 0.125, size: 5 + rnd() * 4 });
  }

  // Islas flotantes: disco superior con relieve y cuerpo de roca que se afila hacia abajo
  const islandSpecs = [
    // Varias caen dentro del corredor -z para que el primer vistazo ya tenga profundidad
    { x: -24, y: -20, z: -75, r: 22, depth: 33, main: true },
    { x: 38, y: -9, z: -157, r: 18, depth: 28 },
    { x: -40, y: 0, z: -242, r: 19, depth: 27 },
    { x: 40, y: -20, z: -331, r: 18, depth: 29 },
    { x: -42, y: 10, z: -420, r: 19, depth: 30 },
    { x: 37, y: -13, z: -516, r: 18, depth: 29 },
    { x: 0, y: -4, z: -620, r: 22, depth: 33 },
  ];
  const islands = [];
  for (const spec of islandSpecs) {
    const distance = Math.hypot(spec.x, spec.y, spec.z);
    const detail = spec.main ? 1 : Math.max(0.28, 1 - distance / 320); // las lejanas gastan menos puntos
    const count = Math.round(share(spec.main ? 0.16 : 0.05) * detail);
    const points = [];
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2;
      const top = rnd() < 0.42;
      let px; let py; let pz;
      if (top) {
        const rr = spec.r * Math.sqrt(rnd());
        px = Math.cos(a) * rr; pz = Math.sin(a) * rr;
        py = wobble(px * 0.12, 0, pz * 0.12) * spec.r * 0.06;
      } else {
        const k = Math.pow(rnd(), 0.65);
        const rr = spec.r * (1 - k) * (0.85 + wobble(a * 2, k * 4, 0) * 0.18);
        px = Math.cos(a) * rr; pz = Math.sin(a) * rr;
        py = -k * spec.depth;
      }
      points.push({
        x: spec.x + px, y: spec.y + py, z: spec.z + pz,
        top, edge: Math.hypot(px, pz) / spec.r,
        size: spec.main ? 0.5 + rnd() * 0.45 : 0.42 + rnd() * 0.4,
        phase: rnd() * 6.28,
      });
    }
    islands.push({ ...spec, points, distance });
  }

  return { stars, moon, halo, earth, earthHalo, islands, MOON, EARTH, config };
}

// Dirección de la luz de la luna en un punto: sirve para el rim light de islas y flores
export function moonLight(x, y, z) {
  const dx = MOON.x - x;
  const dy = MOON.y - y;
  const dz = MOON.z - z;
  const d = Math.hypot(dx, dy, dz) || 1;
  return [dx / d, dy / d, dz / d];
}

// ---- Flores ----
// Cada flor se muestrea como pétalos radiales + centro. Una flor por isla abre
// su recuerdo automáticamente cuando la cámara llega a esa parada.
export function buildFlowers(world, config, budget) {
  const rnd = seeded(31);
  const perFlower = Math.max(26, Math.round(budget * 0.0022));
  const flowers = [];

  const make = (x, y, z, scale, memory) => {
    const petals = 8 + Math.floor(rnd() * 5);
    const petalLen = scale;
    const tilt = (rnd() - 0.5) * 0.5;
    const points = [];
    const steps = Math.max(4, Math.round(perFlower / petals));
    for (let p = 0; p < petals; p++) {
      const a = (p / petals) * Math.PI * 2 + rnd() * 0.15;
      for (let i = 0; i < steps; i++) {
        const k = (i + 0.5) / steps;
        const wide = Math.sin(k * Math.PI) * petalLen * 0.3;
        const side = (i % 2 ? 1 : -1) * wide * (0.35 + rnd() * 0.65);
        points.push({
          a, k, side,
          r: petalLen * (0.22 + k * 0.78),
          lift: petalLen * (0.42 - k * 0.3),
          core: false,
          size: petalLen * (0.2 + rnd() * 0.12),
        });
      }
    }
    for (let i = 0; i < Math.max(4, Math.round(steps * 1.2)); i++) {
      const a = rnd() * Math.PI * 2;
      const r = petalLen * 0.22 * Math.sqrt(rnd());
      points.push({ a, k: 0, side: 0, r, lift: petalLen * 0.12, core: true, size: petalLen * 0.22 });
    }
    flowers.push({
      x, y, z, scale, tilt, points,
      memory, // índice del recuerdo, o -1 si es flor de ambiente
      open: memory >= 0 ? 0.35 : 0.8, // las de recuerdo empiezan cerradas: se abren al descubrirlas
      found: false, foundAt: 0, phase: rnd() * 6.28,
    });
  };

  // Una flor de recuerdo por isla: la narrativa acompaña el vuelo.
  const hosts = world.islands;
  const count = Math.min(config.memories.length, hosts.length);
  for (let i = 0; i < count; i++) {
    const island = hosts[i] || world.islands[0];
    const a = Math.PI * 0.5 + (i % 2 ? 0.35 : -0.35);
    const rr = island.r * 0.44;
    make(island.x + Math.cos(a) * rr, island.y + island.r * 0.05 + 1.4, island.z + Math.sin(a) * rr, island.main ? 2.6 : 2.1, i);
  }
  // Flores de ambiente: dan densidad sin competir con los recuerdos
  for (const island of world.islands) {
    const ambient = island.main ? 18 : 6;
    for (let i = 0; i < ambient; i++) {
      const a = rnd() * Math.PI * 2;
      const rr = island.r * Math.sqrt(rnd()) * 0.92;
      make(island.x + Math.cos(a) * rr, island.y + island.r * 0.05 + 0.9, island.z + Math.sin(a) * rr, island.main ? 1.5 : 1.1, -1);
    }
  }
  return flowers;
}

// Posición de un punto de la flor en el mundo. `open` 0 = pétalos cerrados hacia arriba, 1 = abiertos.
export function flowerPoint(flower, p, open, t, out) {
  const spread = 0.25 + open * 0.75;
  const r = p.core ? p.r : p.r * spread;
  const lift = p.core ? p.lift : p.lift * (1.6 - open * 1.2);
  const sway = Math.sin(t * 0.9 + flower.phase + p.k * 2) * flower.scale * 0.04;
  out[0] = flower.x + Math.cos(p.a) * r - Math.sin(p.a) * p.side * spread + sway;
  out[1] = flower.y + lift + Math.cos(p.a + flower.tilt) * flower.scale * 0.06;
  out[2] = flower.z + Math.sin(p.a) * r + Math.cos(p.a) * p.side * spread;
  return out;
}

// ---- Agua, cascadas y pétalos ----
// Bastante por debajo de la isla principal (su base está en -68) para que el lago quede al fondo
// y las cascadas tengan recorrido visible antes de llegar.
export const WATER_Y = -128;

// Lago: no es un plano de puntos sueltos (a esta distancia se leía como polvo), sino una franja
// de niebla luminosa. Pocos puntos, grandes y tenues, que se solapan en una superficie continua.
export function buildWater(budget) {
  const rnd = seeded(91);
  const count = Math.max(400, Math.round(budget * 0.12));
  const pts = new Float32Array(count * 4); // x, z, fase, escala
  for (let i = 0; i < count; i++) {
    // Más densidad hacia el fondo: es donde una superficie real se comprime en perspectiva
    const depth = Math.pow(rnd(), 0.35);
    pts[i * 4] = (rnd() * 2 - 1) * (110 + depth * 340);
    // Empieza por detrás de la isla principal (z = -96): así el reflejo queda al fondo, no delante
    pts[i * 4 + 1] = -150 - depth * 430;
    pts[i * 4 + 2] = rnd() * 6.28;
    pts[i * 4 + 3] = 0.6 + rnd() * 0.85;
  }
  return { count, pts };
}

// Cascadas: chorros de partículas que aceleran al caer y rompen en espuma abajo.
export function buildWaterfalls(world, budget) {
  const rnd = seeded(53);
  const falls = [];
  for (const island of [world.islands[0], world.islands[1], world.islands[3]]) {
    if (!island) continue;
    const streams = island.main ? 3 : 2;
    for (let s = 0; s < streams; s++) {
      const a = rnd() * Math.PI * 2;
      const top = island.y - island.depth * 0.25;
      const count = Math.max(50, Math.round(budget * (island.main ? 0.02 : 0.011)));
      const parts = new Float32Array(count * 3); // avance, desvío lateral, velocidad
      for (let i = 0; i < count; i++) {
        parts[i * 3] = rnd();
        parts[i * 3 + 1] = (rnd() - 0.5) * island.r * 0.18;
        parts[i * 3 + 2] = 0.05 + rnd() * 0.05;
      }
      // Nacen del borde del disco, no de un punto suelto del centro
      falls.push({
        x: island.x + Math.cos(a) * island.r * 0.94,
        z: island.z + Math.sin(a) * island.r * 0.94,
        top, length: top - WATER_Y, count, parts, width: island.r * 0.2,
      });
    }
  }
  return falls;
}

// ---- Final: corazón de partículas frente a la luna ----
// Se dispara al completar el recorrido; los tiempos son relativos a ese instante.
export const FINALE = {
  travel: 0,      // la cámara viaja hacia la luna
  gather: 1.2,    // las flores descubiertas sueltan su luz y sube hacia el cielo
  form: 2.6,      // el corazón se arma
  beat: 4.6,      // late
  letter: 6.4,    // aparece el título y el texto de la carta
  sender: 8.6,    // y la firma
};

// Las propias partículas ocupan el volumen de una curva de corazón.
// El borde concentra más luz para mantener la silueta legible sobre la luna.
export function buildHeart(budget) {
  const rnd = seeded(53);
  const count = Math.max(1500, Math.round(budget * 0.32));
  const pts = [];
  const field = (x, y, z) => {
    const a = x * x + 2.25 * z * z + y * y - 1;
    return a * a * a - x * x * y * y * y - 0.1125 * z * z * y * y * y;
  };
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const silhouette = i < count * 0.18;
    let dy = silhouette ? Math.sin(a) : rnd() * 2 - 1;
    const ring = Math.sqrt(1 - dy * dy);
    let dx = silhouette ? Math.cos(a) : Math.cos(a) * ring;
    let dz = silhouette ? (rnd() - 0.5) * 0.12 : Math.sin(a) * ring;
    if (silhouette) { const len = Math.hypot(dx, dy, dz); dx /= len; dy /= len; dz /= len; }
    let lo = 0, hi = 1.8;
    for (let step = 0; step < 11; step++) {
      const mid = (lo + hi) * 0.5;
      if (field(dx * mid, dy * mid, dz * mid) < 0) lo = mid;
      else hi = mid;
    }
    const surface = i < count * 0.88;
    const r = lo * (surface ? 0.98 + rnd() * 0.02 : Math.cbrt(rnd()) * 0.9);
    const x = dx * r, y = dy * r - 0.08, z = dz * r;
    pts.push({
      x, y, z,
      phase: rnd() * 6.28,
      size: silhouette ? 0.65 + rnd() * 0.25 : surface ? 0.56 + rnd() * 0.26 : 0.3 + rnd() * 0.23,
      face: silhouette ? 1.6 : surface ? 1.3 : 0.42,
      delay: rnd() * 0.5, // no todas llegan a la vez
    });
  }
  return pts;
}

// Frente a la luna y más allá de la última isla: así ninguna copa dorada compite
// con la silueta rosa del corazón.
export const HEART_POS = { x: 0, y: 82, z: -920, scale: 52 };

// Pétalos sueltos: algunos pasan muy cerca de la cámara y refuerzan la profundidad.
export function buildPetals(budget) {
  const rnd = seeded(17);
  const count = Math.max(50, Math.round(budget * 0.035));
  const petals = [];
  for (let i = 0; i < count; i++) {
    petals.push({
      x: (rnd() - 0.5) * 240, y: (rnd() - 0.5) * 130 - 12, z: (rnd() - 0.5) * 260 - 40,
      drift: 6 + rnd() * 14, phase: rnd() * 6.28, size: 0.4 + rnd() * 0.55, spin: 0.6 + rnd() * 1.6,
    });
  }
  return petals;
}

// Estructuras de luz propias de Dana2. Se generan una vez y comparten el buffer
// de puntos del mundo; no añaden objetos DOM ni trabajo de geometría por cuadro.
export function buildTree(world, budget) {
  const rnd = seeded(802);
  const root = world.islands[0];
  const points = [];
  const count = Math.round(budget * 0.055);
  for (let i = 0; i < count; i++) {
    const crown = i > count * 0.38;
    if (crown) {
      const a = rnd() * Math.PI * 2;
      const elevation = Math.acos(2 * rnd() - 1);
      const radius = 11 + rnd() * 8;
      points.push({
        x: root.x + Math.cos(a) * Math.sin(elevation) * radius,
        y: root.y + 22 + Math.cos(elevation) * 10,
        z: root.z + Math.sin(a) * Math.sin(elevation) * radius,
        crown: true, brightness: 0.45 + rnd() * 0.55,
        size: 0.65 + rnd() * 0.9, phase: rnd() * 6.28, sway: 0.12 + rnd() * 0.6,
      });
    } else {
      const height = rnd() * 22;
      const branch = rnd() < 0.55 && height > 9;
      const a = rnd() * Math.PI * 2;
      const spread = branch ? (height - 9) * rnd() * 0.65 : (1 - height / 28) * 1.3 * rnd();
      points.push({ x: root.x + Math.cos(a) * spread, y: root.y + height,
        z: root.z + Math.sin(a) * spread, crown: false,
        brightness: 0.25 + rnd() * 0.3, size: 0.55 + rnd() * 0.4, phase: 0, sway: 0 });
    }
  }
  return points;
}

export function buildBridges(world, budget) {
  const rnd = seeded(132);
  const points = [];
  const count = Math.max(1400, Math.round(budget * 0.13));
  for (let i = 0; i < count; i++) {
    const along = rnd() * (JOURNEY_STOPS.length - 1);
    const segment = Math.min(JOURNEY_STOPS.length - 2, Math.floor(along));
    const u = ease(along - segment);
    const from = JOURNEY_STOPS[segment].eye, to = JOURNEY_STOPS[segment + 1].eye;
    const lane = i % 4;
    const offset = lane === 0 ? -5 : lane === 1 ? 5 : (rnd() - 0.5) * 8;
    points.push({
      x: mixn(from[0], to[0], u) + offset,
      y: mixn(from[1], to[1], u) - 15 + Math.sin(along * 3.1) * 1.3,
      z: mixn(from[2], to[2], u),
      phase: along * 0.17 + rnd() * 0.03,
      size: lane < 2 ? 1.1 : 0.7, rail: lane < 2,
    });
  }
  // Cada bifurcación llega a la isla que guarda el siguiente recuerdo.
  for (let stop = 0; stop < world.islands.length; stop++) {
    const from = JOURNEY_STOPS[stop].eye;
    const island = world.islands[stop];
    for (let i = 0; i < 90; i++) {
      const u = rnd();
      points.push({
        x: mixn(from[0], island.x, u),
        y: mixn(from[1] - 15, island.y + 1, u),
        z: mixn(from[2] - 20, island.z, u),
        phase: stop + u * 0.15, size: 0.65, rail: false,
      });
    }
  }
  return points;
}

export function buildDomes(world, budget) {
  const rnd = seeded(590);
  const points = [];
  for (const island of [world.islands[1]]) {
    const count = Math.round(budget * 0.022);
    for (let i = 0; i < count; i++) {
      const az = rnd() * Math.PI * 2;
      const polar = rnd() * Math.PI * 0.5;
      const radius = island.r * 1.15;
      points.push({
        x: island.x + Math.cos(az) * Math.sin(polar) * radius,
        y: island.y + 2 + Math.cos(polar) * radius,
        z: island.z + Math.sin(az) * Math.sin(polar) * radius,
        brightness: 0.17 + Math.pow(Math.sin(polar), 7) * 0.36 + (i % 17 === 0 ? 0.5 : 0),
        size: 0.5 + rnd() * 0.35, phase: rnd() * 6.28, gold: i % 17 === 0,
      });
    }
  }
  return points;
}

// Cada isla tiene un motivo reconocible desde la trayectoria central.
// Todo comparte el mismo draw de partículas: cero objetos nuevos durante el render.
export function buildLandmarks(world, budget) {
  const rnd = seeded(941);
  const points = [];
  const flower = [1, 0.72, 0.17], leaf = [0.28, 0.83, 0.5];
  const ice = [0.45, 0.9, 1], white = [0.9, 0.94, 1];
  let islandIndex = 0;
  const add = (x, y, z, color, brightness = 0.8, size = 0.7, phase = 0) => {
    const island = world.islands[islandIndex];
    const angle = rnd() * Math.PI * 2;
    const radius = 10 + rnd() * 24;
    points.push({ x, y, z, color, brightness, size, phase, island: islandIndex,
      // Cada punto llega desde el espacio cercano antes de ocupar su lugar fijo.
      fromX: island.x + Math.cos(angle) * radius,
      fromY: island.y + 15 + (rnd() - 0.5) * 34,
      fromZ: island.z + Math.sin(angle) * radius + 18,
      delay: rnd() * 1.1 });
  };
  const line = (a, b, count, color, size = 0.65) => {
    for (let i = 0; i < count; i++) {
      const k = (i + rnd() * 0.4) / count;
      add(mixn(a[0], b[0], k), mixn(a[1], b[1], k), mixn(a[2], b[2], k),
        color, 0.5 + rnd() * 0.5, size, k * 6);
    }
  };
  const petals = (cx, cy, cz, radius, count, color, petalsCount = 8) => {
    for (let i = 0; i < count; i++) {
      const lobe = Math.floor(rnd() * petalsCount);
      const a = lobe * Math.PI * 2 / petalsCount;
      const r = radius * (0.22 + Math.sqrt(rnd()) * 0.78);
      const side = (rnd() - 0.5) * radius * 0.53 * Math.sin(Math.PI * r / radius);
      add(cx + Math.cos(a) * r - Math.sin(a) * side,
        cy + (Math.sin(a) * r + Math.cos(a) * side) * 0.88,
        cz + (rnd() - 0.5) * 1.8, color, 0.65 + rnd() * 0.55, 0.58, a);
    }
    for (let i = 0; i < Math.max(28, count * 0.13); i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * radius * 0.2;
      add(cx + Math.cos(a) * r, cy + Math.sin(a) * r,
        cz + 0.7, flower, 0.85 + rnd() * 0.5, 0.68, a);
    }
  };

  // 2: flor amarilla conservada en una cúpula de cristal.
  {
    islandIndex = 1;
    const s = world.islands[1], n = Math.max(480, Math.round(budget * 0.046));
    line([s.x, s.y + 2, s.z], [s.x, s.y + 15, s.z], Math.round(n * 0.18), ice);
    petals(s.x, s.y + 15, s.z, 6, Math.round(n * 0.82), flower, 9);
  }
  // 3: envoltorio verde en forma de cono; las flores salen por encima de su borde.
  {
    islandIndex = 2;
    const s = world.islands[2], n = Math.max(600, Math.round(budget * 0.058));
    const wrapBottom = s.y + 2, wrapTop = s.y + 15;
    for (let i = 0; i < Math.max(700, Math.round(n * 1.1)); i++) {
      const u = Math.sqrt(rnd());
      const width = 1.1 + 9.2 * u;
      const side = (rnd() * 2 - 1) * width;
      const fold = Math.sin(side * 0.7 + u * 6) * 0.35;
      add(s.x + side, mixn(wrapBottom, wrapTop, u), s.z + 3.8 + u * 1.2 + fold,
        leaf, 0.32 + rnd() * 0.32, 0.7 + rnd() * 0.3, u * 6);
    }
    line([s.x - 1.1, wrapBottom, s.z + 4], [s.x - 10.3, wrapTop, s.z + 5], 100, leaf, 0.9);
    line([s.x + 1.1, wrapBottom, s.z + 4], [s.x + 10.3, wrapTop, s.z + 5], 100, leaf, 0.9);
    line([s.x - 10.3, wrapTop, s.z + 5], [s.x + 10.3, wrapTop, s.z + 5], 120, leaf, 0.85);
    for (let j = 0; j < 5; j++) {
      const x = s.x + (j - 2) * 3.6, z = s.z + 5.4 + (j % 2) * 0.7;
      const y = s.y + 19 + (j % 2 ? 3 : 0) + (j === 2 ? 3 : 0);
      petals(x, y, z, 3.4, Math.round(n / 5), flower, 8);
    }
    // Cinta en la parte estrecha del envoltorio.
    for (let i = 0; i < 120; i++) {
      const a = i * Math.PI * 2 / 120;
      add(s.x + Math.cos(a) * 2.6, s.y + 5 + Math.sin(a) * 1.2,
        s.z + 5.2, flower, 0.9, 0.85, a);
    }
  }
  // 4: constelación de dos órbitas entrelazadas sobre la roca.
  {
    islandIndex = 3;
    const s = world.islands[3], n = Math.max(620, Math.round(budget * 0.055));
    for (let i = 0; i < n; i++) {
      const a = i * Math.PI * 2 / n;
      const r = 14 + Math.sin(a * 6) * 0.32;
      add(s.x + Math.sin(a) * r, s.y + 19 + Math.sin(a * 2) * 8,
        s.z + 2, ice, i % 17 ? 0.95 : 1.5, i % 17 ? 0.8 : 1.5, a);
    }
  }
  // 5: portal vertical con doble aro y centro oscuro.
  {
    islandIndex = 4;
    const s = world.islands[4], n = Math.max(750, Math.round(budget * 0.065));
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, ring = i % 3;
      const r = 11 + ring * 1.4;
      add(s.x + Math.cos(a) * r, s.y + 15 + Math.sin(a) * r,
        s.z + (rnd() - 0.5) * 1.8, ice, 0.45 + rnd() * 0.5, 0.75, a);
    }
  }
  // 6: corazones amarillos suspendidos a distintas alturas y profundidades.
  {
    islandIndex = 5;
    const s = world.islands[5], n = Math.max(540, Math.round(budget * 0.05));
    for (let j = 0; j < 7; j++) {
      const cx = s.x + (j - 3) * 4.2 + (rnd() - 0.5) * 1.3;
      const cy = s.y + 11 + (j * 7 % 13);
      const cz = s.z + (j % 3 - 1) * 4;
      const size = 2.1 + (j * 3 % 5) * 0.55;
      for (let i = 0; i < n / 7; i++) {
        const a = rnd() * Math.PI * 2;
        const edge = i < n / 7 * 0.75 ? 1 : Math.sqrt(rnd()) * 0.88;
        const x = Math.pow(Math.sin(a), 3) * size * edge;
        const y = (13 * Math.cos(a) - 5 * Math.cos(2 * a)
          - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 18 * size * edge;
        add(cx + x, cy + y, cz + (rnd() - 0.5) * 0.65,
          flower, 0.7 + rnd() * 0.5, 0.7 + size * 0.055, a);
        points[points.length - 1].float = j;
      }
    }
  }
  // 7: observatorio lunar, una corona abierta que señala el final.
  {
    islandIndex = 6;
    const s = world.islands[6], n = Math.max(650, Math.round(budget * 0.058));
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI;
      const r = 15 + (rnd() - 0.5) * 2;
      add(s.x + Math.cos(a) * r, s.y + 5 + Math.sin(a) * r,
        s.z, white, 0.5 + rnd() * 0.45, 0.8, a);
    }
  }
  return points;
}
