// Núcleo del universo de flores amarillas (codename interno: Dana).
// Las partículas SON el mundo: luna, islas, cascadas, agua y flores se muestrean como puntos
// y se dibujan con el renderizador compartido de util.js (un solo drawArrays por cuadro).
// La personalización vive en readConfig(): el motor nunca lee la tarjeta directamente.

export const DANA_FOV = Math.tan((31 * Math.PI) / 180); // vertical ~62°: un mundo 360° pide más campo que un retrato

export const DANA_DEFAULTS = {
  recipientName: '',
  senderName: '',
  introMessage: 'Porque las flores normales estaban demasiado fáciles.',
  letterTitle: 'Para mi persona favorita',
  letterText: 'Gracias por cada día, por tu risa y por estar incluso cuando todo se complica. Quería darte algo que no se marchitara.',
  memories: ['Mi lugar favorito', 'Gracias por existir', 'Mi persona favorita', 'Nuestro primer viaje', 'Tu risa de siempre', 'Siempre contigo', 'Te amo'],
  flower: [1.0, 0.78, 0.26],
  energy: [0.25, 0.85, 1.0],
  water: [0.1, 0.3, 0.75],
  moon: [1.0, 0.93, 0.8],
};

const hex = (value, fallback) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(value || ''));
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

// Tarjeta del enlace → configuración. Fuera del motor gráfico, como pide la skill.
export function readConfig(card) {
  const memories = String(card?.mem || '').split('|').map((x) => x.trim().slice(0, 40)).filter(Boolean);
  return {
    ...DANA_DEFAULTS,
    recipientName: (card?.p || '').trim().slice(0, 24),
    senderName: (card?.d || '').trim().slice(0, 24),
    introMessage: (card?.m || '').trim() || DANA_DEFAULTS.introMessage,
    letterTitle: (card?.lt || '').trim() || DANA_DEFAULTS.letterTitle,
    letterText: (card?.l || '').trim() || DANA_DEFAULTS.letterText,
    memories: memories.length ? memories : DANA_DEFAULTS.memories,
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
// La cámara vive dentro del mundo: solo gira (yaw/pitch) y puede viajar a un POI.
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
  cam.travelTo = (yaw, pitch, seconds = 1.8) => {
    let delta = yaw - cam.targetYaw;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta)); // por el camino corto
    cam.travel = { fromYaw: cam.targetYaw, toYaw: cam.targetYaw + delta, fromPitch: cam.targetPitch, toPitch: pitch, t: 0, seconds };
  };

  cam.update = (dt, autoDrift) => {
    if (cam.travel) {
      cam.travel.t += dt;
      const k = ease(cam.travel.t / cam.travel.seconds);
      cam.targetYaw = mixn(cam.travel.fromYaw, cam.travel.toYaw, k);
      cam.targetPitch = mixn(cam.travel.fromPitch, cam.travel.toPitch, k);
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
// La luna entra antes y se solapa con el warp: con moon=7.2 quedaba un hueco casi negro
// alrededor de 7.5 s, ya apagado el portal y sin nada todavía en pantalla.
export const INTRO = { dark: 1.4, portal: 4.2, enter: 5.6, warp: 6.4, moon: 6.3, islands: 7.6, falls: 8.6, flowers: 9.4, title: 10.6, free: 13.4 };

// Espiral dorada que gira frente a la cámara antes de atravesarla.
export function buildPortal(budget) {
  const rnd = seeded(404);
  const count = Math.max(300, Math.round(budget * 0.1));
  const pts = new Float32Array(count * 4); // ángulo, radio, z, fase
  for (let i = 0; i < count; i++) {
    const arm = Math.floor(rnd() * 3);
    const k = Math.pow(rnd(), 0.7);
    pts[i * 4] = arm * 2.09 + k * 6.2 + rnd() * 0.25;
    pts[i * 4 + 1] = 1.2 + k * 16 + rnd() * 1.4;
    pts[i * 4 + 2] = (rnd() - 0.5) * 3;
    pts[i * 4 + 3] = rnd() * 6.28;
  }
  return { count, pts };
}

// Curva de la intro: 0 antes de empezar, 1 cuando el elemento está del todo presente.
export const revealAt = (t, start, dur = 1.6) => ease((t - start) / dur);

// ---- Giroscopio ----
// Nunca pide permiso al cargar: solo cuando el visitante toca el botón de vista 360°.
// Si no hay sensor o lo rechaza, la experiencia sigue completa con el arrastre.
export function createGyro() {
  const gyro = {
    available: typeof window !== 'undefined' && typeof window.DeviceOrientationEvent !== 'undefined',
    active: false, asked: false, denied: false,
    yaw: 0, pitch: 0, base: null,
  };

  const onOrientation = (event) => {
    if (event.alpha === null && event.beta === null && event.gamma === null) return;
    const yaw = (event.alpha || 0) * Math.PI / 180;
    const pitch = (event.beta || 0) * Math.PI / 180;
    // Calibración: la primera lectura tras activar (o recentrar) marca el centro de la vista
    if (!gyro.base) { gyro.base = { yaw, pitch }; gyro.yaw = 0; gyro.pitch = 0; return; }
    let dy = yaw - gyro.base.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    gyro.yaw = dy;
    gyro.pitch = Math.max(-0.7, Math.min(0.7, pitch - gyro.base.pitch));
  };

  gyro.enable = async () => {
    if (!gyro.available || gyro.asked) return gyro.active;
    gyro.asked = true;
    try {
      const request = window.DeviceOrientationEvent.requestPermission;
      if (typeof request === 'function') {
        const answer = await request();
        if (answer !== 'granted') { gyro.denied = true; return false; }
      }
      window.addEventListener('deviceorientation', onOrientation);
      gyro.active = true;
    } catch (error) {
      gyro.denied = true;
    }
    return gyro.active;
  };

  gyro.recenter = () => { gyro.base = null; };
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
  const budget = { high: 34000, medium: 18000, low: 9000 }[tier];
  const area = Math.min(1, Math.sqrt((w * h) / (390 * 844)));
  return { tier, budget: Math.max(6000, Math.round(budget * area)), scale: coarse ? 0.8 : 1 };
}

// ---- Mundo ----
// Cada sistema devuelve puntos con posición fija en el mundo; el brillo se calcula por cuadro.
const MOON = { x: 0, y: 235, z: -1250, r: 300 };

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

  // Islas flotantes: disco superior con relieve y cuerpo de roca que se afila hacia abajo
  const islandSpecs = [
    // Varias caen dentro del corredor -z para que el primer vistazo ya tenga profundidad
    { x: 0, y: -34, z: -96, r: 26, depth: 34, main: true },
    { x: -52, y: -14, z: -138, r: 19, depth: 26 },
    { x: 62, y: 10, z: -164, r: 17, depth: 22 },
    { x: -104, y: -30, z: -46, r: 20, depth: 26 },
    { x: 106, y: -44, z: 28, r: 18, depth: 24 },
    { x: -40, y: 30, z: 150, r: 12, depth: 16 },
    { x: 70, y: -54, z: 190, r: 18, depth: 24 },
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

  return { stars, moon, halo, islands, MOON, config };
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
// Cada flor se muestrea como pétalos radiales + corazón. Algunas guardan un recuerdo y solo
// revelan su mensaje cuando el visitante las mira y las toca: los mensajes se descubren.
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

  // Flores de recuerdo: repartidas por la isla principal y las dos más cercanas
  const hosts = [world.islands[0], world.islands[0], world.islands[0], world.islands[0], world.islands[1], world.islands[2], world.islands[3]];
  const count = Math.min(config.memories.length, hosts.length);
  for (let i = 0; i < count; i++) {
    const island = hosts[i] || world.islands[0];
    const a = (i / count) * Math.PI * 2 + 0.6;
    const rr = island.r * (0.35 + rnd() * 0.45);
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
// Se dispara al descubrir el último recuerdo; los tiempos son relativos a ese instante.
export const FINALE = {
  travel: 0,      // la cámara viaja hacia la luna
  gather: 1.2,    // las flores descubiertas sueltan su luz y sube hacia el cielo
  form: 2.6,      // el corazón se arma
  beat: 4.6,      // late
  letter: 6.4,    // aparece el título y el texto de la carta
  sender: 8.6,    // y la firma
};

// Superficie implícita de Taubin (la misma del «Corazón de Energía»): da un corazón con volumen
// real, no un icono extruido. Se copia en vez de importarse para no arrastrar aquella escena
// entera al código descargable de Dana.
function heartField(x, y, z) {
  const a = x * x + 2.25 * z * z + y * y - 1;
  return a * a * a - x * x * y * y * y - 0.1125 * z * z * y * y * y;
}

// Distancia del centro a la superficie en una dirección: marcha gruesa y luego bisección.
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

// Corazón muestreado sobre su superficie, en coordenadas locales (centro en 0, alto ~2).
// Cada punto guarda de dónde sale (una flor descubierta) para poder viajar hasta su sitio.
export function buildHeart(budget) {
  const rnd = seeded(53);
  const count = Math.max(700, Math.round(budget * 0.22));
  const pts = [];
  // Muestreo por rechazo pesado con r²: con direcciones uniformes sobre la esfera, la punta
  // (radio grande) recibía tantos puntos como la parte alta (radio pequeño), así que el área
  // real quedaba clarísima abajo y amontonada en el centro: un montículo, no un corazón.
  // El área de superficie por unidad de ángulo crece con r², y así se compensa.
  const RMAX = 1.25; // radio máximo de la superficie; sobra un poco para no recortar la punta
  let guard = 0;
  while (pts.length < count && guard < count * 60) {
    guard++;
    const u = rnd() * Math.PI * 2;
    const v = Math.acos(2 * rnd() - 1);
    const dx = Math.sin(v) * Math.cos(u);
    const dy = Math.cos(v);
    const dz = Math.sin(v) * Math.sin(u);
    const r = heartRadius(dx, dy, dz);
    if (r <= 0) continue;
    // Acepta con probabilidad (r/RMAX)²: reparte los puntos por superficie, no por dirección
    if (rnd() > Math.min(1, (r / RMAX) * (r / RMAX))) continue;
    // Un poco de grosor hacia dentro: la cáscara pura se ve hueca en los bordes
    const shell = r * (1 - Math.pow(rnd(), 3) * 0.16);
    pts.push({
      // Sin invertir. Medido con la sonda de encuadre, que proyecta la nube real con la vista
      // del final: la punta (y local negativa, el extremo largo) cae en v menor, o sea ARRIBA
      // en pantalla. Para que la punta quede abajo, la punta debe ir en +y, que es esta forma.
      x: dx * shell, y: dy * shell, z: dz * shell,
      phase: rnd() * 6.28,
      size: 0.5 + rnd() * 0.5,
      // Las que miran al frente brillan más: da relieve sin calcular iluminación
      face: clamp01(dz * 0.5 + 0.5),
      delay: rnd() * 0.5, // no todas llegan a la vez
    });
  }
  return pts;
}

// Posición del corazón en el mundo: entre la cámara y la luna, alto y bastante lejos.
// Medido con la proyección del final (ver sonda de encuadre), no a ojo: con y=150/z=-430 el
// corazón se salía por arriba (u_lado 0.86) y se comía el texto de la carta. Con estos valores
// la silueta entera cae en la banda oscura entre la carta (hasta v≈0.34) y el borde superior
// de la luna (v≈0.70), y el ancho se queda dentro del cuadro.
export const HEART_POS = { x: 0, y: 70, z: -640, scale: 48 };

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
