import {
  clamp, particleQuality, getParticleRenderer, viewProjection, projectVP, drawParticles2D, qualityGovernor,
} from './util.js';
import {
  DANA_FOV, readConfig, clamp01, ease, mixn, JOURNEY_STOPS, JOURNEY_LEG_SECONDS, journeyPose,
  createCamera, createGyro, danaQuality, buildWorld, buildFlowers, flowerPoint,
  WATER_Y, buildWater, buildWaterfalls, buildPetals,
  INTRO, buildPortal, revealAt,
  FINALE, buildHeart, HEART_POS,
  buildTree, buildBridges, buildDomes, buildLandmarks,
} from './dana2-core.js';

// JARDÍN DE LUNAS DORADAS (codename interno: Dana2)
//
// Un pequeño mundo que se mira en 360°: luna gigante, islas flotantes y flores que guardan
// recuerdos. Las partículas construyen el mundo; no hay imágenes ni geometría prerenderizada.
//
// Estado: oculta en el catálogo (`hidden: true`). Para abrirla en desarrollo:
//   v.html?a=jardin-de-lunas&autoplay   ·   crear.html?a=jardin-de-lunas
//   tools/preview.html?ids=jardin-de-lunas   ·   añade &debug=1 para el panel de depuración.

const STAR_COLD = [0.72, 0.84, 1.0];
const STAR_WARM = [1.0, 0.88, 0.7];
const ROCK = [0.16, 0.2, 0.42];
const HEART_COLOR = [1.0, 0.19, 0.46];
const EARTH_BLUE = [0.1, 0.49, 0.93];
const EARTH_GREEN = [0.19, 0.72, 0.38];
const EARTH_ATMOS = [0.27, 0.72, 1.0];
export default function create(ctx, w, h, dpr = 1, stage) {
  const quality = danaQuality(w, h);
  const renderer = getParticleRenderer();
  const budget = renderer ? quality.budget : Math.min(quality.budget, 4000);
  const governor = qualityGovernor();
  let renderScale = quality.scale;

  let config = readConfig(stage?.card);
  let cardRef = stage?.card;
  const world = buildWorld(config, budget);
  let flowers = buildFlowers(world, config, budget);
  const portal = buildPortal(budget);
  const water = buildWater(budget);
  const falls = buildWaterfalls(world, budget);
  const petals = buildPetals(budget);
  const heart = buildHeart(budget);
  const tree = buildTree(world, budget);
  const bridges = buildBridges(world, budget);
  const domes = buildDomes(world, budget);
  const landmarks = buildLandmarks(world, budget);
  const rand = (n) => { const x = Math.sin(n * 127.1 + 78.233) * 43758.5453; return x - Math.floor(x); };
  const motes = world.islands.flatMap((island, index) => Array.from({ length: index === 3 || index === 6 ? 32 : 22 }, (_, i) => {
    const seed = index * 41 + i + 1;
    return { island, index, phase: rand(seed) * Math.PI * 2,
      radius: 9 + rand(seed + 3) * 22, height: 8 + rand(seed + 7) * 22,
      speed: (rand(seed + 11) < 0.5 ? -1 : 1) * (0.11 + rand(seed + 13) * 0.28),
      wobble: rand(seed + 17) * 6, size: 0.8 + rand(seed + 19) * 1.1 };
  }));
  const heartMotes = Array.from({ length: 110 }, (_, i) => ({
    phase: rand(i + 391) * Math.PI * 2,
    elevation: (rand(i + 443) - 0.5) * 1.35,
    offset: Math.floor(i / 14) / 8 + rand(i + 419) * 0.025,
    speed: 0.082 + rand(i + 491) * 0.018,
    size: 0.65 + rand(i + 523) * 0.85,
    gold: i % 7 === 0,
  }));
  const portalPhoto = new Image();
  if (config.photo) portalPhoto.src = config.photo;
  const fallPoints = falls.reduce((sum, f) => sum + f.count, 0);
  let doneAt = -1; // instante en que termina el recorrido
  let letterOpenedAt = -1;
  const memoryFlowers = () => flowers.filter((f) => f.memory >= 0);
  const memoryMessage = (index) => {
    return config.memories[index] || '';
  };
  const gyro = createGyro();
  let shown = null; // { flower, at } mensaje visible
  let announced = -1;
  let lookYaw = 0, lookPitch = 0;
  const tmp = [0, 0, 0];
  const journeyView = { eye: [0, 0, 0], yaw: 0, pitch: 0 };
  const camera = createCamera();
  camera.eye[1] = 12;
  camera.pitch = camera.targetPitch = -0.24;
  const moonEye = JOURNEY_STOPS[0].eye;
  const moonDx = world.MOON.x - moonEye[0];
  const moonDy = world.MOON.y - moonEye[1];
  const moonDz = world.MOON.z - moonEye[2];
  const moonYaw = Math.atan2(moonDx, -moonDz);
  const moonPitch = Math.atan2(moonDy, Math.hypot(moonDx, moonDz));
  let approachStarted = false;
  let motionPromptVisible = false;
  if (stage?.preview) {
    camera.eye[0] = JOURNEY_STOPS[0].eye[0];
    camera.eye[1] = JOURNEY_STOPS[0].eye[1];
    camera.eye[2] = JOURNEY_STOPS[0].eye[2];
    const first = journeyPose(world, 0);
    camera.yaw = camera.targetYaw = first.yaw;
    camera.pitch = camera.targetPitch = first.pitch;
  }
  if (stage) stage.onDispose = () => gyro.disable();
  if (stage) stage.onPointerDown = ({ nx, ny }) => {
    if (motionPromptVisible && Math.abs(nx - 0.5) < 0.35 && Math.abs(ny - 0.88) < 0.05) {
      // iOS exige que requestPermission ocurra en esta misma pila del gesto.
      gyro.recenter(); gyro.enable();
      return true;
    }
    return false;
  };
  const aspect = w / h;
  const sceneFov = aspect > 1 ? Math.tan(24 * Math.PI / 180) : DANA_FOV;
  const finePointer = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;
  const debug = typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    && /[?&]debug=1/.test(location.search);
  if (debug && !window.__dana2Debug) {
    window.__dana2Debug = { command: '', quality: quality.tier };
    window.addEventListener('keydown', (event) => {
      if (event.target?.matches?.('input,textarea')) return;
      window.__dana2Debug.command = event.key.toLowerCase();
    });
  }

  // Buffers reutilizados: ninguna reserva por cuadro
  const total = world.stars.length + world.moon.length + world.halo.length
    + world.earth.length + world.earthHalo.length
    + world.islands.reduce((sum, i) => sum + i.points.length, 0)
    + flowers.reduce((sum, f) => sum + f.points.length, 0)
    + water.count + fallPoints + petals.length + portal.count + heart.length
    + tree.length + bridges.length + domes.length + landmarks.length
    + motes.length + heartMotes.length * 3;
  const pos = new Float32Array(total * 4);
  const col = new Float32Array(total * 4);
  const vp = new Float32Array(16);
  const glow = new Float32Array(3);
  const beam = new Float32Array(3);

  // Arrastre con el dedo o el ratón: gira la cámara (el giroscopio llega en la fase D)
  let lastPointer = null;
  let dragging = false;
  let lastT = -1;
  let debugOffset = 0;

  return (t, dt = 1 / 60) => {
    if (stage?.preview) t += 10;
    const command = debug ? window.__dana2Debug.command : '';
    if (debug) window.__dana2Debug.command = '';
    if (command === 'i') debugOffset = Math.max(debugOffset, INTRO.free + 0.5 - t);
    if (command === 'r') { debugOffset = -t; for (const f of flowers) f.found = false; doneAt = -1; letterOpenedAt = -1; shown = null; announced = -1; lookYaw = lookPitch = 0; }
    t += debugOffset;
    if (command === 'a' || command === 'f' || command === 'l') {
      for (const f of flowers) if (f.memory >= 0) f.found = true;
      doneAt = t - (command === 'l' ? FINALE.letter + 1.5 : 0);
      if (command === 'l') letterOpenedAt = t;
      camera.travelTo(0, 0.28, 3.4, [0, 18, -700]);
    }
    if (/^[1-7]$/.test(command)) {
      debugOffset = INTRO.free + (Number(command) - 1) * JOURNEY_LEG_SECONDS - t;
      doneAt = -1; announced = Number(command) - 2; shown = null;
    }
    if (command === 'g') { gyro.recenter(); gyro.enable(); }
    if (command === 'q') {
      window.__dana2Debug.quality = ({ high: 'medium', medium: 'low', low: 'high' })[window.__dana2Debug.quality];
      renderScale = ({ high: 1, medium: 0.75, low: 0.5 })[window.__dana2Debug.quality];
    }
    if (t < lastT) { camera.yaw = camera.targetYaw = 0; camera.pitch = camera.targetPitch = -0.24; approachStarted = false; announced = -1; }
    lastT = t;
    const step = Math.min(Math.max(dt, 0), 1 / 20);
    let tapped = false;
    let tapPoint = null;
    // Intro: cada elemento entra en su momento, no todos en el mismo cuadro
    const showMoon = revealAt(t, INTRO.moon, 2.2);
    const showIslands = revealAt(t, INTRO.islands, 1.8);
    const showFalls = revealAt(t, INTRO.falls, 1.6);
    const showFlowers = revealAt(t, INTRO.flowers, 1.8);
    const warp = clamp01((t - INTRO.enter) / (INTRO.warp - INTRO.enter)) * (1 - clamp01((t - INTRO.warp) / 0.7));
    // El portal aguanta hasta bien entrado el warp: apagándose en enter+0.9 dejaba un hueco
    // casi vacío entre que desaparecía y entraba la luna.
    const portalLife = revealAt(t, INTRO.dark, 1.4) * (1 - clamp01((t - INTRO.warp - 0.25) / 1.15));
    if (!approachStarted && t >= INTRO.warp + 0.6 && !stage?.preview) {
      approachStarted = true;
      camera.travelTo(moonYaw, moonPitch, 2.8, moonEye);
    }
    if (governor(t)) renderScale = Math.max(0.5, renderScale * 0.82);
    if (stage && stage.card !== cardRef) {
      cardRef = stage.card;
      config = readConfig(cardRef);
      portalPhoto.src = config.photo || '';
      flowers = buildFlowers(world, config, budget);
      doneAt = -1;
      shown = null;
      announced = -1;
    }

    // --- Entrada: arrastre horizontal/vertical ---
    if (stage) {
      const p = stage.pointer;
      if (stage.holding && lastPointer) {
        const dyaw = (p.x - lastPointer.x) * -4.2;
        const dpitch = (p.y - lastPointer.y) * 2.5;
        lookYaw += dyaw;
        lookPitch = Math.max(-0.75, Math.min(0.65, lookPitch + dpitch));
        dragging = true;
      }
      lastPointer = stage.holding ? { x: p.x, y: p.y } : null;
      if (!stage.holding) dragging = false;
      tapped = stage.taps.length > 0;
      if (tapped) tapPoint = [stage.taps[0].x / w, 1 - stage.taps[0].y / h];
      stage.taps.length = 0;
    }
    const memories = memoryFlowers();
    const elapsed = Math.max(0, t - INTRO.free);
    // La última isla necesita una pausa, pero no un tramo de viaje sin destino.
    const journeyEnd = (memories.length - 1) * JOURNEY_LEG_SECONDS + 5.5;
    const journeyIndex = Math.min(memories.length - 1, Math.floor(elapsed / JOURNEY_LEG_SECONDS));
    if (t >= INTRO.look && t < INTRO.free && !stage?.preview) {
      camera.targetYaw = moonYaw + lookYaw - (gyro.active ? gyro.yaw : 0);
      camera.targetPitch = Math.max(-0.85, Math.min(0.5,
        moonPitch + lookPitch + (gyro.active ? gyro.pitch * 0.85 : 0)));
      if (!dragging) { lookYaw *= Math.exp(-step * 0.11); lookPitch *= Math.exp(-step * 0.11); }
    }
    if (t >= INTRO.free && doneAt < 0 && elapsed < journeyEnd) {
      const pose = journeyPose(world, Math.min(memories.length - 1, elapsed / JOURNEY_LEG_SECONDS), journeyView);
      for (let axis = 0; axis < 3; axis++) camera.eye[axis] = pose.eye[axis];
      // El visitante conserva la mirada libre mientras el trayecto sigue avanzando.
      const hoverYaw = finePointer && stage && !stage.holding ? (stage.pointer.x - 0.5) * 0.45 : 0;
      camera.targetYaw = pose.yaw + lookYaw + hoverYaw - (gyro.active ? gyro.yaw : 0);
      camera.targetPitch = Math.max(-0.85, Math.min(0.5,
        pose.pitch + (aspect > 1 ? 0.09 : 0) + lookPitch + (gyro.active ? gyro.pitch * 0.85 : 0)));
      if (!dragging) { lookYaw *= Math.exp(-step * 0.11); lookPitch *= Math.exp(-step * 0.11); }
      const memoryDelay = journeyIndex === 0 ? 3.1 : 1;
      if (elapsed % JOURNEY_LEG_SECONDS > memoryDelay && journeyIndex > announced && memories[journeyIndex]) {
        announced = journeyIndex;
        const flower = memories[journeyIndex];
        flower.found = true; flower.foundAt = t;
        shown = { flower, at: t };
      }
    }
    if (t >= INTRO.free && doneAt < 0 && elapsed >= journeyEnd) {
      doneAt = t;
      lookYaw = lookPitch = 0;
      gyro.recenter();
      camera.travelTo(0, 0.28, 4.2, [0, 18, -700]);
    }
    if (doneAt >= 0 && !camera.travel && t - doneAt > 5) {
      camera.targetYaw = -(gyro.active ? gyro.yaw : 0) + lookYaw;
      camera.targetPitch = Math.max(-0.7, Math.min(0.5, 0.28 + lookPitch + (gyro.active ? gyro.pitch * 0.75 : 0)));
    }
    camera.update(step, false);
    viewProjection(vp, camera.eye, camera.target, aspect, [0, 1, 0], sceneFov, 0.5, 2600);

    let o = 0;
    const write = (x, y, z, intensity, c, size) => {
      const q = o * 4;
      pos[q] = x; pos[q + 1] = y; pos[q + 2] = z; pos[q + 3] = intensity;
      col[q] = c[0]; col[q + 1] = c[1]; col[q + 2] = c[2]; col[q + 3] = size;
      o++;
    };

    // --- Estrellas: parpadeo lento, las cercanas más grandes ---
    for (const s of world.stars) {
      const tw = 0.55 + 0.45 * Math.sin(t * 0.7 + s.phase);
      // Durante el warp las estrellas se estiran en trazos
      // El warp estira, no engorda: con size ×5 y brillo ×2.2 las estrellas se volvían pelotas
      // blancas. Menos tamaño y menos intensidad dejan ver el trazo.
      write(s.x, s.y, s.z, 0.75 * tw * clamp01(t / 1.2) * (1 + warp * 0.9), s.warm ? STAR_WARM : STAR_COLD, s.size * 1.6 * (1 + warp * 1.6));
    }

    // La Tierra espera al otro lado del cielo para quien mire hacia atrás.
    const earthLife = clamp01(t / 1.8) * (0.28 + 0.72 * revealAt(t, INTRO.warp + 0.5, 2));
    for (const e of world.earth) {
      const light = 0.2 + 0.8 * clamp01(e.nx * -0.1 + e.ny * 0.25 - e.nz * 0.9);
      write(e.x, e.y, e.z, e.shade * light * earthLife * 0.8,
        e.land ? EARTH_GREEN : EARTH_BLUE, e.size * 3.1);
    }
    for (const e of world.earthHalo) {
      write(e.x, e.y, e.z, e.alpha * earthLife * 0.12, EARTH_ATMOS, e.size * 3.2);
    }

    // --- Entrada: un girasol de luz con centro oscuro que atravesamos ---
    if (portalLife > 0.002) {
      const approach = ease(clamp01((t - INTRO.portal) / (INTRO.warp - INTRO.portal)));
      const sunflowerScale = aspect > 1 ? 1.4 : 1;
      const tilt = -1.08, spin = t * 0.13;
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      const cs = Math.cos(spin), ss = Math.sin(spin);
      for (let i = 0; i < portal.count; i++) {
        const seed = i < portal.seedCount;
        const a = portal.pts[i * 4] + (seed ? t * 0.11 : 0);
        const r = portal.pts[i * 4 + 1] * (seed ? 1 - 0.08 * Math.sin(t * 1.6 + portal.pts[i * 4 + 3]) : 1);
        const twinkle = 0.6 + 0.4 * Math.sin(t * 3 + portal.pts[i * 4 + 3]);
        const px = Math.cos(a) * r * sunflowerScale;
        const py = Math.sin(a) * r * sunflowerScale;
        const pz = portal.pts[i * 4 + 2];
        const flatY = py * ct - pz * st;
        const depth = py * st + pz * ct;
        // Acercar el plano hace que los pétalos salgan del encuadre mientras el hueco central
        // ocupa la vista; ahí entra el mundo de las islas.
        write(px * cs + depth * ss, 8 + flatY,
          -46 - px * ss + depth * cs + approach * 33,
          portalLife * twinkle * (seed ? 0.7 : 1.25), seed ? config.energy : config.flower,
          seed ? 0.42 : 0.72);
      }
    }

    // --- Luna: relieve por sombreado, no un disco plano ---
    const finalBackdrop = doneAt < 0 ? 1 : 1 - 0.48 * ease((t - doneAt) / 3.5);
    for (const m of world.moon) {
      const lit = 0.3 + 0.7 * clamp01(m.nx * 0.4 + m.ny * 0.25 + m.nz * 0.85);
      const rim = Math.pow(1 - clamp01(m.nz), 3.5) * 0.35;
      // El tamaño del punto sale de la densidad de muestreo: la superficie debe quedar continua
      write(m.x, m.y, m.z, ((0.32 + m.shade * 0.5) * lit + rim * 0.35) * showMoon * finalBackdrop, config.moon, m.size * 3.4);
    }
    for (const g of world.halo) write(g.x, g.y, g.z, g.a * 0.16 * showMoon * finalBackdrop, config.moon, g.size * 4);

    // --- Islas: roca oscura con luz de luna en los bordes ---
    for (const island of world.islands) {
      const sway = Math.sin(t * 0.25 + island.x * 0.05) * 0.6;
      for (const p of island.points) {
        // La roca queda casi en silueta; la luz de luna solo dibuja el borde superior
        const lit = clamp01((p.y - island.y + island.depth * 0.2) / (island.depth * 0.6));
        const glowEdge = p.top && p.edge > 0.93 ? 0.5 : 0;
        const intensity = (p.top ? 0.12 + p.edge * 0.28 + glowEdge : 0.04 + lit * 0.22) * showIslands;
        write(p.x, p.y + sway, p.z, intensity, glowEdge ? config.energy : ROCK, p.size * 1.7);
      }
    }

    // --- Agua: franja de niebla con la columna del reflejo de la luna ---
    for (let i = 0; i < water.count; i++) {
      const x = water.pts[i * 4];
      const z = water.pts[i * 4 + 1];
      const ph = water.pts[i * 4 + 2];
      const sc = water.pts[i * 4 + 3];
      const ripple = Math.sin(x * 0.05 + t * 0.7 + ph) * 0.6 + Math.sin(z * 0.03 - t * 0.5) * 0.7;
      // La columna del reflejo se rompe en destellos, como la luna sobre el agua
      const column = Math.exp(-Math.abs(x) / 18);
      const glint = Math.pow(0.5 + 0.5 * Math.sin(z * 0.25 + t * 1.8 + ph * 2), 3);
      // El borde cercano se desvanece: sin esto la franja cortaba la escena con una línea recta
      const fade = clamp01((-90 - z) / 70);
      write(x, WATER_Y + ripple, z, (0.04 + column * (0.16 + glint * 0.5)) * fade * showIslands, column > 0.4 ? config.moon : config.water, (5 + column * 3.5) * sc);
    }

    // --- Cascadas: aceleran al caer y rompen en espuma ---
    for (const f of falls) {
      for (let i = 0; i < f.count; i++) {
        const u = (f.parts[i * 3] + t * f.parts[i * 3 + 2]) % 1;
        const fall = u * u;
        const spread = f.width * (0.4 + u * 1.7);
        const broke = clamp01((fall - 0.84) / 0.16);
        write(
          f.x + f.parts[i * 3 + 1] + Math.sin(t * 1.3 + i) * spread * 0.3,
          f.top - fall * f.length,
          f.z + Math.cos(t * 1.1 + i * 0.7) * spread * 0.25,
          (0.22 + (1 - fall) * 0.35 + broke * 0.55) * showFalls,
          config.energy,
          0.55 + broke * 1.1,
        );
      }
    }

    // --- Pétalos ---
    // El árbol central y los puentes dan una silueta reconocible incluso en calidad baja.
    for (const p of tree) {
      const sway = p.crown ? Math.sin(t * 0.65 + p.phase) * p.sway : 0;
      const pulse = p.crown ? 0.72 + 0.28 * Math.sin(t * 1.4 + p.phase) : 1;
      write(p.x + sway, p.y, p.z, p.brightness * pulse * showFlowers,
        p.crown ? config.flower : ROCK, p.size);
    }
    for (const p of bridges) {
      const current = 0.5 + 0.5 * Math.sin(t * 2.5 - p.phase * 15);
      write(p.x, p.y, p.z, (p.rail ? 0.48 + current * 0.55 : 0.22 + current * 0.5) * showIslands,
        config.energy, p.size);
    }
    for (const p of domes) {
      const shimmer = 0.65 + 0.35 * Math.sin(t * 0.8 + p.phase);
      write(p.x, p.y, p.z, p.brightness * shimmer * showFlowers,
        p.gold ? config.flower : config.energy, p.size);
    }
    for (const p of landmarks) {
      // Cada figura termina de formarse antes de que la cámara se detenga ante ella.
      const arrival = clamp01((t - (INTRO.free + p.island * JOURNEY_LEG_SECONDS - 4 + p.delay)) / 2.4);
      if (arrival <= 0) continue;
      const formed = ease(arrival);
      const twinkle = 0.82 + 0.18 * Math.sin(t * 1.5 + p.phase);
      const gathering = 1 + 0.45 * Math.sin(Math.PI * arrival);
      const floatY = p.float === undefined ? 0 : Math.sin(t * (0.55 + p.float * 0.045) + p.float * 1.7) * (1.2 + p.float * 0.18);
      const floatX = p.float === undefined ? 0 : Math.sin(t * 0.31 + p.float * 2.2) * 0.65;
      write(mixn(p.fromX, p.x, formed) + floatX, mixn(p.fromY, p.y, formed) + floatY,
        mixn(p.fromZ, p.z, formed),
        p.brightness * twinkle * gathering * showFlowers * Math.min(1, arrival * 2.5),
        p.color, p.size);
    }

    // Motes sueltas: trayectorias distintas, con deriva vertical y radial.
    for (const mote of motes) {
      const arrival = clamp01((t - (INTRO.free + mote.index * JOURNEY_LEG_SECONDS - 2.7)) / 1.7);
      if (arrival <= 0) continue;
      const a = mote.phase + t * mote.speed + Math.sin(t * 0.21 + mote.phase) * 0.35;
      const r = mote.radius + Math.sin(t * 0.48 + mote.phase * 3) * mote.wobble;
      write(mote.island.x + Math.cos(a) * r,
        mote.island.y + mote.height + Math.sin(t * 0.63 + mote.phase * 2) * 5,
        mote.island.z + Math.sin(a * 0.73 + mote.phase) * r * 0.7,
        arrival * showFlowers * (0.75 + 0.3 * Math.sin(t * 1.5 + mote.phase)),
        mote.index % 3 === 0 ? config.energy : config.flower, mote.size);
    }

    for (const p of petals) {
      const y = p.y + (((t * p.drift + p.phase * 20) % 130) - 65);
      const flick = 0.55 + 0.45 * Math.sin(t * p.spin + p.phase);
      write(p.x + Math.sin(t * 0.3 + p.phase) * 7, y, p.z + Math.cos(t * 0.22 + p.phase) * 9, 0.75 * flick * showFlowers, config.flower, p.size * 1.8);
    }

    // --- Las flores se abren al llegar a cada isla; no interrumpen el vuelo. ---
    for (const f of flowers) {
      const memory = f.memory >= 0;
      const target = f.found || !memory ? 1 : 0.35;
      f.open += (target - f.open) * (1 - Math.exp(-step * 2.2));
      const halo = memory && !f.found ? 0.35 + 0.35 * Math.sin(t * 2.2 + f.phase) : 0;
      const bloom = f.found ? 1 + 0.5 * Math.exp(-(t - f.foundAt) * 1.6) : 1;
      for (const p of f.points) {
        flowerPoint(f, p, f.open, t, tmp);
        const c = p.core ? config.energy : config.flower;
        const intensity = ((p.core ? 0.8 : 0.5 + f.open * 0.3) * bloom + halo * (p.core ? 0.5 : 0.2)) * showFlowers;
        write(tmp[0], tmp[1], tmp[2], intensity, c, p.size * 1.5);
      }
    }
    const found = memories.filter((f) => f.found).length;
    if (doneAt >= 0 && letterOpenedAt < 0 && t - doneAt > FINALE.beat && tapped && tapPoint) {
      const heartUV = projectVP(vp, HEART_POS.x, HEART_POS.y, HEART_POS.z);
      const distance = Math.hypot((heartUV[0] - tapPoint[0]) * aspect, heartUV[1] - tapPoint[1]);
      if (heartUV[2] > 0 && distance < 0.17) letterOpenedAt = t;
    }
    const letterDim = letterOpenedAt >= 0 ? revealAt(t, letterOpenedAt, 1.2) : 0;
    if (doneAt >= 0 && letterOpenedAt < 0 && t - doneAt > FINALE.letter + 3) letterOpenedAt = t;
    if (stage && doneAt >= 0 && letterOpenedAt >= 0 && t - letterOpenedAt > 2.5) stage.revealed = true;

    // --- Final: al descubrir el último recuerdo, un corazón se arma frente a la luna ---
    if (doneAt >= 0) {
      const ft = t - doneAt;
      // Las partículas salen de las flores y suben: `gather` las lanza, `form` las asienta
      const rise = clamp01((ft - FINALE.gather) / (FINALE.form - FINALE.gather));
      const formed = ease(clamp01((ft - FINALE.form) / 1.8));
      // Latido suave, solo una vez armado
      const beat = ft > FINALE.beat ? Math.pow(0.5 + 0.5 * Math.sin((ft - FINALE.beat) * 2.4), 3) : 0;
      const scale = HEART_POS.scale * (0.92 + formed * 0.08 + beat * 0.06);
      const axisTilt = 0.16;
      const spin = Math.max(0, ft - FINALE.form) * 0.085;
      const ct = Math.cos(axisTilt), st = Math.sin(axisTilt);
      const cs = Math.cos(spin), ss = Math.sin(spin);
      if (rise > 0) {
        for (const p of heart) {
          // Cada punto nace en su flor y viaja hasta su sitio del corazón
          const k = ease(clamp01((rise - p.delay) / (1 - p.delay)));
          const src = memories[p.phase % memories.length | 0] || memories[0];
          const breathe = 1 + Math.sin(t * 1.6 + p.phase) * 0.012;
          const turnedX = p.x * cs + p.z * ss;
          const turnedZ = -p.x * ss + p.z * cs;
          const hx = HEART_POS.x + (turnedX * ct - p.y * st) * scale * breathe;
          // Con la carta abierta el corazón sube: una carta larga crece hacia arriba y, si no,
          // su borde superior alcanzaba el lóbulo inferior. Las cartas cortas no lo notan.
          const hy = HEART_POS.y + letterDim * 34 + (turnedX * st + p.y * ct) * scale * breathe;
          const hz = HEART_POS.z + turnedZ * scale * breathe;
          const x = src ? mixn(src.x, hx, k) : hx;
          const y = src ? mixn(src.y, hy, k) : hy;
          const z = src ? mixn(src.z, hz, k) : hz;
          const faceLight = 0.58 + 0.42 * clamp01(turnedZ + 0.55);
          const intensity = ((0.35 + p.face * 0.5 + beat * 0.45) * formed + (1 - formed) * 0.5 * k) * faceLight;
          write(x, y, z, intensity * clamp01(rise * 1.4), HEART_COLOR, p.size * (1.95 + beat * 0.6));
        }
        // Explosión perpetua en cámara lenta: oleadas que nacen en el centro y viajan
        // hacia el espectador. Cada chispa deja dos puntos tenues a su paso.
        if (formed > 0) {
          for (const mote of heartMotes) {
            const u = (Math.max(0, ft - FINALE.form) * mote.speed + mote.offset) % 1;
            for (let trail = 0; trail < 3; trail++) {
              const age = Math.max(0, u - trail * 0.018);
              if (age <= 0.22) continue;
              const travel = Math.pow(age, 0.9);
              const spread = 14 + travel * (24 + Math.sin(mote.phase * 3) * 9);
              const drift = Math.sin(t * 0.32 + mote.phase * 2) * travel * 5;
              const heartY = HEART_POS.y + letterDim * 34;
              const towardEye = Math.max(0, camera.eye[2] - HEART_POS.z - 24);
              const fade = clamp01((age - 0.22) / 0.13) * (1 - clamp01((age - 0.76) / 0.24));
              write(HEART_POS.x + Math.cos(mote.phase) * spread + drift,
                mixn(heartY, camera.eye[1], travel * 0.82)
                  + Math.sin(mote.elevation) * spread,
                HEART_POS.z + towardEye * travel
                  + Math.sin(mote.phase) * Math.cos(mote.elevation) * spread * 0.25,
                formed * fade * (1 - trail * 0.31) * (1 - letterDim * 0.18) * 2.1,
                mote.gold ? STAR_WARM : HEART_COLOR, mote.size * (1 - trail * 0.15));
            }
          }
        }
      }
    }

    // Se ofrece tras los primeros segundos y desaparece al activarlo (o si se rechazó hace rato).
    // Debe declararse antes del toque: en un móvil real, usarlo después lanzaba ReferenceError.
    // Solo después de la intro: durante el portal y el warp todavía no hay mundo que mirar
    // Durante el final la pantalla es de la carta: ni botón ni contador compiten con ella.
    const gyroButton = !finePointer && gyro.available && !gyro.active && !gyro.denied
      && t >= INTRO.look && doneAt < 0 && !stage?.preview;
    motionPromptVisible = gyroButton && !gyro.pending;

    // --- Render ---
    const cssScale = Math.min(dpr, 2) * renderScale;
    const fbW = Math.max(2, Math.round(w * cssScale));
    const fbH = Math.max(2, Math.round(h * cssScale));
    const moonUV = projectVP(vp, world.MOON.x, world.MOON.y, world.MOON.z);
    glow[0] = moonUV[0]; glow[1] = moonUV[1]; glow[2] = moonUV[2] > 0 ? showMoon * 0.55 : 0;
    beam[0] = 0.5; beam[1] = 0; beam[2] = 0;
    if (renderer) {
      renderer.render({
        width: fbW, height: fbH, vp, pos, col, count: o,
        px: fbH / (2 * sceneFov), focus: 90, aperture: 0.02, maxSize: 46 * cssScale,
        trail: 0.12, flash: 0, glow, beam,
        bg: [0.004, 0.006, 0.02], glowColor: [0.05, 0.06, 0.12], beamColor: [0.02, 0.1, 0.3], flashColor: [0.9, 0.8, 0.5],
        // El mundo se apaga al abrirse la carta: bajar la exposición del render es más limpio
        // que superponer un rectángulo translúcido, porque el corazón también se atenúa y la
        // carta queda como único foco.
        exposure: 1.45 * (1 - letterDim * 0.55), time: t, reset: false, owner: pos,
      });
      ctx.drawImage(renderer.canvas, 0, 0, w, h);
    } else {
      drawParticles2D(ctx, w, h, vp, pos, col, o, 90, 0.02, '#03040c');
    }

    // La foto vive dentro del quinto portal y sigue su perspectiva durante el recorrido.
    if (portalPhoto.complete && portalPhoto.naturalWidth && t >= INTRO.free && doneAt < 0) {
      const island = world.islands[4];
      const center = projectVP(vp, island.x, island.y + 15, island.z);
      const edge = projectVP(vp, island.x + 10, island.y + 15, island.z);
      const edgeY = projectVP(vp, island.x, island.y + 25, island.z);
      const radius = Math.abs(edge[0] - center[0]) * w;
      const radiusY = Math.abs(edgeY[1] - center[1]) * h;
      const arrival = clamp01((t - INTRO.free - 4 * JOURNEY_LEG_SECONDS + 4) / 2.4);
      if (center[2] > 0 && radius > 3 && radius < Math.max(w, h) && arrival > 0) {
        const x = center[0] * w, y = (1 - center[1]) * h;
        const sourceSide = Math.min(portalPhoto.naturalWidth, portalPhoto.naturalHeight);
        const sourceX = (portalPhoto.naturalWidth - sourceSide) / 2;
        const sourceY = (portalPhoto.naturalHeight - sourceSide) / 2;
        const dw = radius * 1.72, dh = radiusY * 1.72;
        ctx.save();
        ctx.globalAlpha = arrival * 0.84;
        ctx.beginPath();
        ctx.ellipse(x, y, radius * 0.86, radiusY * 0.86, 0, 0, Math.PI * 2);
        ctx.clip();
        // Bandas de refracción leves: la imagen se ondula dentro del campo del portal.
        for (let band = 0; band < 16; band++) {
          const shift = (Math.sin(t * 2.2 + band * 0.77) + Math.sin(t * 0.9 - band * 1.31)) * radius * 0.018;
          ctx.drawImage(portalPhoto, sourceX, sourceY + band * sourceSide / 16,
            sourceSide, sourceSide / 16 + 1,
            x - dw / 2 + shift, y - dh / 2 + band * dh / 16,
            dw, dh / 16 + 1);
        }
        const veil = ctx.createRadialGradient(x, y, radius * 0.16, x, y, radius * 0.9);
        veil.addColorStop(0, 'rgba(20,42,65,0.05)');
        veil.addColorStop(0.68, 'rgba(8,25,48,0.18)');
        veil.addColorStop(1, 'rgba(2,11,34,0.9)');
        ctx.fillStyle = veil;
        ctx.fillRect(x - radius, y - radiusY, radius * 2, radiusY * 2);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = `rgba(130,223,255,${arrival * (0.28 + 0.08 * Math.sin(t * 2.7))})`;
        ctx.lineWidth = Math.max(1, radius * 0.025);
        ctx.beginPath();
        ctx.ellipse(x, y, radius * 0.87, radiusY * 0.87, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // --- Interfaz mínima: título de la intro, contador y mensaje descubierto ---
    // Todo el texto se dibuja DESPUÉS de componer las partículas: antes del drawImage quedaba
    // tapado por completo, y sin el textAlign de aquí salía corrido hacia la derecha desde el
    // centro en vez de centrado.
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textScale = Math.min(w, h * 1.1);
    // Primera frase durante el acercamiento al girasol; se lee en dos líneas sin competir
    // con el hueco central. Se omite el antiguo rótulo «Para Alma» entre ambas frases.
    const introIn = revealAt(t, 1.8, 0.8) * (1 - clamp01((t - 7.2) / 0.9));
    if (introIn > 0.01) {
      const small = Math.max(18, textScale * 0.046);
      const words = config.introMessage.trim().split(/\s+/);
      const split = words.length > 5 ? Math.ceil(words.length / 2) : words.length;
      const lines = [words.slice(0, split).join(' '), words.slice(split).join(' ')].filter(Boolean);
      ctx.font = `700 ${small}px Georgia, "Times New Roman", serif`;
      ctx.shadowColor = 'rgba(0,0,0,.85)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = `rgba(255,246,214,${introIn})`;
      lines.forEach((line, index) => ctx.fillText(line, w / 2,
        h * 0.75 + (index - (lines.length - 1) / 2) * small * 1.3, w * 0.84));
      ctx.shadowBlur = 0;
    }
    if (stage?.preview) {
      ctx.font = `700 ${Math.max(19, textScale * 0.077)}px Georgia, "Times New Roman", serif`;
      ctx.shadowColor = 'rgba(0,0,0,.95)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = 'rgba(255,240,193,.9)';
      ctx.fillText(`Para ${config.recipientName}`, w / 2, h * 0.73, w * 0.8);
      ctx.shadowBlur = 0;
    }
    const exploreIn = revealAt(t, INTRO.look, 0.5) * (1 - clamp01((t - INTRO.free + 1.2) / 0.8));
    if (exploreIn > 0.01 && found === 0 && !shown) {
      ctx.font = `600 ${Math.max(14, textScale * 0.04)}px system-ui, sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,.85)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = `rgba(255,238,190,${exploreIn * 0.9})`;
      // Debajo de la luna: a 0.2 el texto caía sobre el borde brillante y no se leía
      const lookMessage = gyro.available && !gyro.denied
        ? (gyro.active ? 'Mueve tu celular para mirar alrededor' : 'Activa la vista 360° y mueve tu celular')
        : 'Desliza la pantalla para mirar alrededor';
      ctx.fillText(lookMessage, w / 2, h * 0.47, w * 0.9);
      ctx.shadowBlur = 0;
    }
    if ((found > 0 || t > INTRO.free) && doneAt < 0) {
      // Abajo y con sombra: arriba quedaba encima de la luna y no se leía
      ctx.font = `600 ${Math.max(12, textScale * 0.034)}px system-ui, sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,.95)';
      ctx.shadowBlur = 16;
      ctx.fillStyle = 'rgba(255,238,190,.82)';
      ctx.fillText(`${found} / ${memories.length} recuerdos`, w / 2, h * 0.945);
      ctx.shadowBlur = 0;
    }
    // Botón de vista 360°: solo en dispositivos con sensor y antes de activarlo
    if (gyroButton) {
      const label = gyro.pending ? 'Esperando sensor...' : '✦ Activar vista 360° ✦';
      const fs = Math.max(14, textScale * 0.04);
      ctx.font = `600 ${fs}px system-ui, sans-serif`;
      const pad = fs * 0.9;
      const tw = ctx.measureText(label).width;
      const bx = w / 2 - tw / 2 - pad;
      const by = h * 0.88 - fs * 0.95;
      ctx.fillStyle = 'rgba(8,10,26,.62)';
      ctx.strokeStyle = 'rgba(190,230,255,.45)';
      ctx.lineWidth = 1;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(bx, by, tw + pad * 2, fs * 1.9, fs);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(226,244,255,.92)';
      ctx.fillText(label, w / 2, h * 0.88);
    }
    if (doneAt >= 0 && t - doneAt > FINALE.letter && letterOpenedAt < 0) {
      const pulse = 0.72 + 0.28 * Math.sin(t * 2);
      ctx.fillStyle = `rgba(255,236,184,${pulse})`;
      ctx.font = `600 ${Math.max(15, textScale * 0.05)}px system-ui, sans-serif`;
      const heartUV = projectVP(vp, HEART_POS.x, HEART_POS.y - HEART_POS.scale, HEART_POS.z);
      ctx.fillText('Toca el corazón para abrir la carta', w / 2,
        Math.min(h * 0.87, h * (1 - heartUV[1]) + h * 0.07), w * 0.85);
    }
    // --- Carta final: se abre sobre el mundo apagado, no es un texto plano encima ---
    if (doneAt >= 0 && letterDim > 0.002) {
      const ft = t - doneAt;
      const letterIn = revealAt(t, letterOpenedAt, 1.2);
      // Medidas de la hoja: se calculan antes para poder dibujar el papel y luego el texto
      const bodySize = Math.max(14, textScale * 0.04);
      const headingSize = Math.max(20, textScale * 0.069);
      const sheetW = Math.min(w * 0.84, h * 0.86);
      ctx.font = `500 ${bodySize}px system-ui, sans-serif`;
      const words = config.letterText.split(/\s+/);
      const lines = [];
      let line = '';
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > sheetW * 0.82 && line) { lines.push(line); line = word; }
        else line = next;
      }
      if (line) lines.push(line);
      const lh = bodySize * 1.45;
      const padY = h * 0.055;
      const headingGap = (headingSize + bodySize) * 0.7;
      const sheetH = padY * 2 + headingGap + lines.length * lh + (config.senderName ? lh * 1.6 : 0);
      const cx = w / 2;
      // Debajo de la luna, no encima del corazón: a 0.46 la hoja caía justo sobre él
      // (corazón en v=0.38..0.52) y el corazón se veía como una mancha a través del papel.
      // Entre el borde inferior de la luna y la cascada queda cielo libre.
      const cy = Math.min(h * 0.76, h - sheetH / 2 - h * 0.09);
      // La hoja se despliega: primero una línea de luz, luego alto completo
      const openY = ease(clamp01(letterIn * 1.3));
      const sh = sheetH * Math.max(0.02, openY);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.6)';
      ctx.shadowBlur = 26;
      ctx.fillStyle = `rgba(14,16,34,${0.62 * letterIn})`;
      ctx.strokeStyle = `rgba(255,236,190,${0.45 * letterIn})`;
      ctx.lineWidth = 1;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx - sheetW / 2, cy - sh / 2, sheetW, sh, Math.min(18, w * 0.045));
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      // El texto entra cuando la hoja ya está abierta: si no, se lee sobre una rendija
      const textIn = ease(clamp01((openY - 0.75) / 0.25)) * letterIn;
      if (textIn > 0.01) {
        const top = cy - sheetH / 2 + padY;
        ctx.shadowColor = 'rgba(0,0,0,.85)';
        ctx.shadowBlur = 14;
        ctx.font = `700 ${headingSize}px Georgia, "Times New Roman", serif`;
        ctx.fillStyle = `rgba(255,246,214,${textIn})`;
        ctx.fillText(config.letterTitle, cx, top, sheetW * 0.88);
        ctx.font = `500 ${bodySize}px system-ui, sans-serif`;
        ctx.fillStyle = `rgba(226,232,255,${textIn * 0.92})`;
        lines.forEach((l, i) => ctx.fillText(l, cx, top + headingGap + i * lh, sheetW * 0.88));
        const senderIn = revealAt(ft, FINALE.sender, 1) * textIn;
        if (senderIn > 0.01 && config.senderName) {
          ctx.font = `700 ${Math.max(16, textScale * 0.05)}px Georgia, "Times New Roman", serif`;
          ctx.fillStyle = `rgba(255,238,190,${senderIn})`;
          ctx.fillText(`— ${config.senderName}`, cx, top + headingGap + lines.length * lh + lh * 0.7, sheetW * 0.7);
        }
        ctx.shadowBlur = 0;
      }
    }
    if (stage) {
      const waterUV = projectVP(vp, 0, WATER_Y, -170);
      stage.debugInfo = {
        found, total: memories.length,
        msg: shown ? memoryMessage(shown.flower.memory) || '(vacío)' : null,
        pitch: +camera.pitch.toFixed(2), yaw: +camera.yaw.toFixed(2),
        gyro: `${gyro.available ? 'hay' : 'no'}/${gyro.asked ? 'pedido' : '-'}/${gyro.active ? 'activo' : '-'}/${gyro.denied ? 'rechazado' : '-'}`,
        gyroYaw: +gyro.yaw.toFixed(2),
        heartUV: doneAt >= 0 ? projectVP(vp, HEART_POS.x, HEART_POS.y, HEART_POS.z) : null,
        // v > 1 o < 0 significa que el lago cae fuera de la pantalla
        aguaV: +waterUV[1].toFixed(2), aguaDist: Math.round(waterUV[2]),
      };
    }
    if (shown) {
      const age = t - shown.at;
      // Solo se descarta cuando ya pasó su tiempo: con `alpha <= 0` se borraba en el mismo
      // cuadro del toque, porque al nacer la edad es 0 y la entrada aún no había subido.
      const alpha = clamp01(age / 0.35) * (1 - clamp01((age - 2.2) / 0.6));
      if (age > 2.85) shown = null;
      else {
        const [title, message = ''] = memoryMessage(shown.flower.memory).split('~');
        const memoryTitleSize = Math.max(18, textScale * 0.058);
        const memoryBodySize = Math.max(14, textScale * 0.038);
        ctx.font = `700 ${memoryTitleSize}px Georgia, "Times New Roman", serif`;
        ctx.shadowColor = 'rgba(0,0,0,.8)';
        ctx.shadowBlur = 14;
        ctx.fillStyle = `rgba(255,246,214,${alpha})`;
        ctx.fillText(title, w / 2, h * 0.38, w * 0.82);
        if (message) {
          ctx.font = `500 ${memoryBodySize}px system-ui, sans-serif`;
          ctx.fillText(message, w / 2, h * 0.38 + (memoryTitleSize + memoryBodySize) * 0.7, w * 0.84);
        }
      }
    }
    ctx.restore();

    if (debug) {
      ctx.save();
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(180,230,255,.75)';
      ctx.fillText(`Dana2 · ${window.__dana2Debug.quality} · ${Math.round(1 / Math.max(dt, 0.001))} FPS · ${o} pts`, 10, 16);
      ctx.fillText(`cam ${camera.eye.map((v) => v.toFixed(0)).join(',')} · yaw ${camera.yaw.toFixed(2)} pitch ${camera.pitch.toFixed(2)}`, 10, 30);
      ctx.fillText('I intro · 1–7 paradas · A/F final · L carta · G sensor · Q calidad · R reiniciar', 10, 44);
      ctx.restore();
    }
  };
}
