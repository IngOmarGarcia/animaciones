import {
  clamp, particleQuality, getParticleRenderer, viewProjection, projectVP, drawParticles2D, qualityGovernor,
} from './util.js';
import {
  DANA_FOV, readConfig, clamp01, ease, mixn,
  createCamera, createGyro, danaQuality, buildWorld, buildFlowers, flowerPoint,
  WATER_Y, buildWater, buildWaterfalls, buildPetals,
} from './dana-core.js';

// UNIVERSO DE FLORES AMARILLAS (codename interno: Dana)
//
// Un pequeño mundo que se mira en 360°: luna gigante, islas flotantes y flores que guardan
// recuerdos. Las partículas construyen el mundo; no hay imágenes ni geometría prerenderizada.
//
// Estado: oculta en el catálogo (`hidden: true`). Para abrirla en desarrollo:
//   v.html?a=universo-de-flores&autoplay   ·   crear.html?a=universo-de-flores
//   tools/preview.html?ids=universo-de-flores   ·   añade &debug=1 para el panel de depuración.

const STAR_COLD = [0.72, 0.84, 1.0];
const STAR_WARM = [1.0, 0.88, 0.7];
const ROCK = [0.16, 0.2, 0.42];

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
  const water = buildWater(budget);
  const falls = buildWaterfalls(world, budget);
  const petals = buildPetals(budget);
  const fallPoints = falls.reduce((sum, f) => sum + f.count, 0);
  const memoryFlowers = () => flowers.filter((f) => f.memory >= 0);
  const gyro = createGyro();
  let gyroBase = null; // ángulos de la cámara al activar el sensor
  let aimed = null; // flor de recuerdo que el visitante tiene en el centro de la vista
  let shown = null; // { flower, at } mensaje visible
  const tmp = [0, 0, 0];
  const camera = createCamera();
  // La cámara mira desde un poco más arriba: de canto, la isla se aplastaba en una pastilla
  camera.eye[1] = 12;
  camera.pitch = camera.targetPitch = -0.24;
  const aspect = w / h;
  const debug = typeof location !== 'undefined' && /[?&]debug=1/.test(location.search);

  // Buffers reutilizados: ninguna reserva por cuadro
  const total = world.stars.length + world.moon.length + world.halo.length
    + world.islands.reduce((sum, i) => sum + i.points.length, 0)
    + flowers.reduce((sum, f) => sum + f.points.length, 0)
    + water.count + fallPoints + petals.length;
  const pos = new Float32Array(total * 4);
  const col = new Float32Array(total * 4);
  const vp = new Float32Array(16);
  const glow = new Float32Array(3);
  const beam = new Float32Array(3);

  // Arrastre con el dedo o el ratón: gira la cámara (el giroscopio llega en la fase D)
  let lastPointer = null;
  let dragging = false;
  let lastT = -1;

  return (t, dt = 1 / 60) => {
    if (t < lastT) { camera.yaw = camera.targetYaw = 0; camera.pitch = camera.targetPitch = -0.24; }
    lastT = t;
    const step = Math.min(Math.max(dt, 0), 1 / 20);
    let tapped = false;
    let tapPoint = null;
    if (governor(t)) renderScale = Math.max(0.5, renderScale * 0.82);
    if (stage && stage.card !== cardRef) { cardRef = stage.card; config = readConfig(cardRef); }

    // --- Entrada: arrastre horizontal/vertical ---
    if (stage) {
      const p = stage.pointer;
      if (stage.holding && lastPointer) {
        camera.look((p.x - lastPointer.x) * -2.6, (p.y - lastPointer.y) * 1.6);
        dragging = true;
      }
      lastPointer = stage.holding ? { x: p.x, y: p.y } : null;
      if (!stage.holding) dragging = false;
      tapped = stage.taps.length > 0;
      if (tapped) tapPoint = [stage.taps[0].x / w, 1 - stage.taps[0].y / h];
      stage.taps.length = 0;
    }
    // Con el sensor activo la cámara sigue al teléfono, siempre a través del amortiguado
    if (gyro.active) {
      if (!gyroBase) gyroBase = { yaw: camera.targetYaw, pitch: camera.targetPitch };
      // Sensibilidad reducida y recorrido corto: el mundo ocupa un cono estrecho, así que un
      // mapeo 1:1 dejaba la luna y la isla fuera del encuadre en cuanto se giraba el teléfono.
      const swing = Math.max(-0.55, Math.min(0.55, gyro.yaw * 0.42));
      camera.targetYaw = gyroBase.yaw - swing;
      const tilt = Math.max(-0.3, Math.min(0.3, gyro.pitch * 0.5));
      camera.targetPitch = Math.max(-0.85, Math.min(0.5, gyroBase.pitch + tilt));
    }
    camera.update(step, !dragging && !gyro.active);
    viewProjection(vp, camera.eye, camera.target, aspect, [0, 1, 0], DANA_FOV, 0.5, 2600);

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
      write(s.x, s.y, s.z, 0.75 * tw, s.warm ? STAR_WARM : STAR_COLD, s.size * 1.6);
    }

    // --- Luna: relieve por sombreado, no un disco plano ---
    for (const m of world.moon) {
      const lit = 0.3 + 0.7 * clamp01(m.nx * 0.4 + m.ny * 0.25 + m.nz * 0.85);
      const rim = Math.pow(1 - clamp01(m.nz), 3.5) * 0.35;
      // El tamaño del punto sale de la densidad de muestreo: la superficie debe quedar continua
      write(m.x, m.y, m.z, (0.32 + m.shade * 0.5) * lit + rim * 0.35, config.moon, m.size * 3.4);
    }
    for (const g of world.halo) write(g.x, g.y, g.z, g.a * 0.16, config.moon, g.size * 4);

    // --- Islas: roca oscura con luz de luna en los bordes ---
    for (const island of world.islands) {
      const sway = Math.sin(t * 0.25 + island.x * 0.05) * 0.6;
      for (const p of island.points) {
        // La roca queda casi en silueta; la luz de luna solo dibuja el borde superior
        const lit = clamp01((p.y - island.y + island.depth * 0.2) / (island.depth * 0.6));
        const glowEdge = p.top && p.edge > 0.93 ? 0.5 : 0;
        const intensity = p.top ? 0.12 + p.edge * 0.28 + glowEdge : 0.04 + lit * 0.22;
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
      write(x, WATER_Y + ripple, z, (0.04 + column * (0.16 + glint * 0.5)) * fade, column > 0.4 ? config.moon : config.water, (5 + column * 3.5) * sc);
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
          0.22 + (1 - fall) * 0.35 + broke * 0.55,
          config.energy,
          0.55 + broke * 1.1,
        );
      }
    }

    // --- Pétalos ---
    for (const p of petals) {
      const y = p.y + (((t * p.drift + p.phase * 20) % 130) - 65);
      const flick = 0.55 + 0.45 * Math.sin(t * p.spin + p.phase);
      write(p.x + Math.sin(t * 0.3 + p.phase) * 7, y, p.z + Math.cos(t * 0.22 + p.phase) * 9, 0.75 * flick, config.flower, p.size * 1.8);
    }

    // --- Flores: las de recuerdo se abren al descubrirlas ---
    let bestAim = null;
    let bestAimScore = 0.13; // solo sugiere cuando la flor está realmente cerca de la vista
    let bestTap = null;
    let bestTapScore = 0.16; // radio del dedo en pantalla
    for (const f of flowers) {
      const memory = f.memory >= 0;
      if (memory) {
        const uv = projectVP(vp, f.x, f.y, f.z);
        if (uv[2] > 0 && uv[2] < 160) {
          const dc = Math.hypot((uv[0] - 0.5) * aspect, uv[1] - 0.5);
          if (dc < bestAimScore && !f.found) { bestAimScore = dc; bestAim = f; }
          if (tapPoint && !f.found) {
            const dt2 = Math.hypot((uv[0] - tapPoint[0]) * aspect, uv[1] - tapPoint[1]);
            if (dt2 < bestTapScore) { bestTapScore = dt2; bestTap = f; }
          }
        }
      }
      const target = f.found || !memory ? 1 : 0.35;
      f.open += (target - f.open) * (1 - Math.exp(-step * 2.2));
      const halo = memory && !f.found ? 0.35 + 0.35 * Math.sin(t * 2.2 + f.phase) : 0;
      const bloom = f.found ? 1 + 0.5 * Math.exp(-(t - f.foundAt) * 1.6) : 1;
      for (const p of f.points) {
        flowerPoint(f, p, f.open, t, tmp);
        const c = p.core ? config.energy : config.flower;
        const intensity = (p.core ? 0.8 : 0.5 + f.open * 0.3) * bloom + halo * (p.core ? 0.5 : 0.2);
        write(tmp[0], tmp[1], tmp[2], intensity, c, p.size * 1.5);
      }
    }
    aimed = bestAim;
    // Se ofrece tras los primeros segundos y desaparece al activarlo (o si se rechazó hace rato).
    // Debe declararse antes del toque: en un móvil real, usarlo después lanzaba ReferenceError.
    const gyroButton = gyro.available && !gyro.active && t > 4 && !(gyro.denied && t > 12);
    // El botón de vista 360° se atiende antes que las flores
    if (tapped && tapPoint && gyroButton && !gyro.active && !gyro.denied) {
      const bx = Math.abs(tapPoint[0] - 0.5) < 0.3;
      const by = Math.abs((1 - tapPoint[1]) - 0.88) < 0.055;
      // Recentrar al activar: si no, la primera lectura del teléfono ya viene desviada y la
      // vista arranca descentrada, sin forma de recuperarla.
      if (bx && by) { gyro.recenter(); gyro.enable(); gyroBase = null; tapped = false; }
    }
    // El toque descubre la flor más cercana al dedo: en el celular se toca la flor, no se apunta
    if (tapped && bestTap) {
      bestTap.found = true;
      bestTap.foundAt = t;
      shown = { flower: bestTap, at: t };
    }

    // --- Render ---
    const cssScale = Math.min(dpr, 2) * renderScale;
    const fbW = Math.max(2, Math.round(w * cssScale));
    const fbH = Math.max(2, Math.round(h * cssScale));
    const moonUV = projectVP(vp, world.MOON.x, world.MOON.y, world.MOON.z);
    glow[0] = moonUV[0]; glow[1] = moonUV[1]; glow[2] = moonUV[2] > 0 ? 0.55 : 0;
    beam[0] = 0.5; beam[1] = 0; beam[2] = 0;
    if (renderer) {
      renderer.render({
        width: fbW, height: fbH, vp, pos, col, count: o,
        px: fbH / (2 * DANA_FOV), focus: 90, aperture: 0.02, maxSize: 46 * cssScale,
        trail: 0.12, flash: 0, glow, beam,
        bg: [0.004, 0.006, 0.02], glowColor: [0.05, 0.06, 0.12], beamColor: [0.02, 0.1, 0.3], flashColor: [0.9, 0.8, 0.5],
        exposure: 1.45, time: t, reset: false, owner: pos,
      });
      ctx.drawImage(renderer.canvas, 0, 0, w, h);
    } else {
      drawParticles2D(ctx, w, h, vp, pos, col, o, 90, 0.02, '#03040c');
    }

    // --- Interfaz mínima: contador de recuerdos y mensaje descubierto ---
    const memories = memoryFlowers();
    const found = memories.filter((f) => f.found).length;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (found > 0 || t > 6) {
      // Abajo y con sombra: arriba quedaba encima de la luna y no se leía
      ctx.font = `600 ${Math.max(11, w * 0.031)}px system-ui, sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,.95)';
      ctx.shadowBlur = 16;
      ctx.fillStyle = 'rgba(255,238,190,.82)';
      ctx.fillText(`${found} / ${memories.length} recuerdos`, w / 2, h * 0.945);
      ctx.shadowBlur = 0;
    }
    // Botón de vista 360°: solo en dispositivos con sensor y antes de activarlo
    if (gyroButton) {
      const label = gyro.denied ? 'Arrastra para mirar alrededor' : '✦ Activar vista 360° ✦';
      const fs = Math.max(12, w * 0.036);
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
    if (aimed && !aimed.found) {
      ctx.font = `600 ${Math.max(11, w * 0.03)}px system-ui, sans-serif`;
      ctx.fillStyle = `rgba(255,240,200,${0.35 + 0.25 * Math.sin(t * 3)})`;
      ctx.fillText('toca la flor', w / 2, h * 0.62);
    }
    if (stage) {
      const waterUV = projectVP(vp, 0, WATER_Y, -170);
      stage.debugInfo = {
        found, total: memories.length,
        msg: shown ? config.memories[shown.flower.memory] || '(vacío)' : null,
        pitch: +camera.pitch.toFixed(2), yaw: +camera.yaw.toFixed(2),
        gyro: `${gyro.available ? 'hay' : 'no'}/${gyro.asked ? 'pedido' : '-'}/${gyro.active ? 'activo' : '-'}/${gyro.denied ? 'rechazado' : '-'}`,
        gyroYaw: +gyro.yaw.toFixed(2),
        // v > 1 o < 0 significa que el lago cae fuera de la pantalla
        aguaV: +waterUV[1].toFixed(2), aguaDist: Math.round(waterUV[2]),
      };
    }
    if (shown) {
      const age = t - shown.at;
      // Solo se descarta cuando ya pasó su tiempo: con `alpha <= 0` se borraba en el mismo
      // cuadro del toque, porque al nacer la edad es 0 y la entrada aún no había subido.
      const alpha = clamp01(age / 0.5) * (1 - clamp01((age - 4.2) / 0.8));
      if (age > 5.2) shown = null;
      else {
        const text = config.memories[shown.flower.memory] || '';
        ctx.font = `700 ${Math.max(16, w * 0.052)}px "Dancing Script", Georgia, serif`;
        ctx.shadowColor = 'rgba(0,0,0,.8)';
        ctx.shadowBlur = 14;
        ctx.fillStyle = `rgba(255,246,214,${alpha})`;
        ctx.fillText(text, w / 2, h * 0.42, w * 0.82);
      }
    }
    ctx.restore();

    if (debug) {
      ctx.save();
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(180,230,255,.75)';
      ctx.fillText(`Dana · ${quality.tier} · ${o} pts · yaw ${camera.yaw.toFixed(2)} pitch ${camera.pitch.toFixed(2)}`, 10, 16);
      ctx.restore();
    }
  };
}
