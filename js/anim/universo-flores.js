import {
  clamp, particleQuality, getParticleRenderer, viewProjection, projectVP, drawParticles2D, qualityGovernor,
} from './util.js';
import {
  DANA_FOV, readConfig, clamp01, ease, mixn,
  createCamera, createGyro, danaQuality, buildWorld, buildFlowers, flowerPoint,
  WATER_Y, buildWater, buildWaterfalls, buildPetals,
  INTRO, buildPortal, revealAt,
  FINALE, buildHeart, HEART_POS,
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
  const portal = buildPortal(budget);
  const water = buildWater(budget);
  const falls = buildWaterfalls(world, budget);
  const petals = buildPetals(budget);
  const heart = buildHeart(budget);
  const fallPoints = falls.reduce((sum, f) => sum + f.count, 0);
  let doneAt = -1; // instante en que se descubrió el último recuerdo
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
    + water.count + fallPoints + petals.length + portal.count + heart.length;
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
    // Intro: cada elemento entra en su momento, no todos en el mismo cuadro
    const showMoon = revealAt(t, INTRO.moon, 2.2);
    const showIslands = revealAt(t, INTRO.islands, 1.8);
    const showFalls = revealAt(t, INTRO.falls, 1.6);
    const showFlowers = revealAt(t, INTRO.flowers, 1.8);
    const warp = clamp01((t - INTRO.enter) / (INTRO.warp - INTRO.enter)) * (1 - clamp01((t - INTRO.warp) / 0.7));
    const portalLife = revealAt(t, INTRO.dark, 1.4) * (1 - clamp01((t - INTRO.enter) / 0.9));
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
    // En el final la cámara se queda quieta: el vagabundeo automático sacaba el corazón de cuadro.
    camera.update(step, !dragging && !gyro.active && doneAt < 0);
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
      // Durante el warp las estrellas se estiran en trazos
      write(s.x, s.y, s.z, 0.75 * tw * clamp01(t / 1.2) * (1 + warp * 2.2), s.warm ? STAR_WARM : STAR_COLD, s.size * 1.6 * (1 + warp * 5));
    }

    // --- Portal: espiral dorada que gira, crece y se atraviesa ---
    if (portalLife > 0.002) {
      const approach = clamp01((t - INTRO.portal) / (INTRO.enter - INTRO.portal));
      for (let i = 0; i < portal.count; i++) {
        const a = portal.pts[i * 4] + t * (0.5 + portal.pts[i * 4 + 1] * 0.02);
        const r = portal.pts[i * 4 + 1] * (1 + approach * 1.7);
        const twinkle = 0.6 + 0.4 * Math.sin(t * 3 + portal.pts[i * 4 + 3]);
        // Al acercarse, los puntos no deben crecer: se atraviesa el portal, no se pega a la cara.
        // Con tamaños grandes la espiral se convertía en manchas amarillas a pantalla completa.
        write(Math.cos(a) * r, 8 + Math.sin(a) * r, -46 + portal.pts[i * 4 + 2] + approach * 40,
          portalLife * twinkle * 1.1, config.flower, 0.55);
      }
    }

    // --- Luna: relieve por sombreado, no un disco plano ---
    for (const m of world.moon) {
      const lit = 0.3 + 0.7 * clamp01(m.nx * 0.4 + m.ny * 0.25 + m.nz * 0.85);
      const rim = Math.pow(1 - clamp01(m.nz), 3.5) * 0.35;
      // El tamaño del punto sale de la densidad de muestreo: la superficie debe quedar continua
      write(m.x, m.y, m.z, ((0.32 + m.shade * 0.5) * lit + rim * 0.35) * showMoon, config.moon, m.size * 3.4);
    }
    for (const g of world.halo) write(g.x, g.y, g.z, g.a * 0.16 * showMoon, config.moon, g.size * 4);

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
    for (const p of petals) {
      const y = p.y + (((t * p.drift + p.phase * 20) % 130) - 65);
      const flick = 0.55 + 0.45 * Math.sin(t * p.spin + p.phase);
      write(p.x + Math.sin(t * 0.3 + p.phase) * 7, y, p.z + Math.cos(t * 0.22 + p.phase) * 9, 0.75 * flick * showFlowers, config.flower, p.size * 1.8);
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
        const intensity = ((p.core ? 0.8 : 0.5 + f.open * 0.3) * bloom + halo * (p.core ? 0.5 : 0.2)) * showFlowers;
        write(tmp[0], tmp[1], tmp[2], intensity, c, p.size * 1.5);
      }
    }
    aimed = bestAim;
    // Aquí arriba porque el final las necesita antes de componer, y los textos de la interfaz
    // las reutilizan después: declararlas abajo lanzaba ReferenceError (zona muerta temporal).
    const memories = memoryFlowers();
    const found = memories.filter((f) => f.found).length;
    // Cuánto se ha apagado el mundo por la carta: lo necesita el render, que va antes del texto
    const letterDim = doneAt >= 0 ? revealAt(t - doneAt, FINALE.letter, 1.2) : 0;

    // --- Final: al descubrir el último recuerdo, un corazón se arma frente a la luna ---
    if (doneAt >= 0) {
      const ft = t - doneAt;
      // Las partículas salen de las flores y suben: `gather` las lanza, `form` las asienta
      const rise = clamp01((ft - FINALE.gather) / (FINALE.form - FINALE.gather));
      const formed = ease(clamp01((ft - FINALE.form) / 1.8));
      // Latido suave, solo una vez armado
      const beat = ft > FINALE.beat ? Math.pow(0.5 + 0.5 * Math.sin((ft - FINALE.beat) * 2.4), 3) : 0;
      const scale = HEART_POS.scale * (0.92 + formed * 0.08 + beat * 0.06);
      if (rise > 0) {
        for (const p of heart) {
          // Cada punto nace en su flor y viaja hasta su sitio del corazón
          const k = ease(clamp01((rise - p.delay) / (1 - p.delay * 0.6)));
          const src = memories[p.phase % memories.length | 0] || memories[0];
          const breathe = 1 + Math.sin(t * 1.6 + p.phase) * 0.012;
          const hx = HEART_POS.x + p.x * scale * breathe;
          // Con la carta abierta el corazón sube: una carta larga crece hacia arriba y, si no,
          // su borde superior alcanzaba el lóbulo inferior. Las cartas cortas no lo notan.
          const hy = HEART_POS.y + letterDim * 34 + p.y * scale * breathe;
          const hz = HEART_POS.z + p.z * scale * breathe;
          const x = src ? mixn(src.x, hx, k) : hx;
          const y = src ? mixn(src.y, hy, k) : hy;
          const z = src ? mixn(src.z, hz, k) : hz;
          const intensity = (0.35 + p.face * 0.5 + beat * 0.45) * formed + (1 - formed) * 0.5 * k;
          write(x, y, z, intensity * clamp01(rise * 1.4), config.flower, p.size * (1.7 + beat * 0.6));
        }
      }
    }

    // Se ofrece tras los primeros segundos y desaparece al activarlo (o si se rechazó hace rato).
    // Debe declararse antes del toque: en un móvil real, usarlo después lanzaba ReferenceError.
    // Solo después de la intro: durante el portal y el warp todavía no hay mundo que mirar
    // Durante el final la pantalla es de la carta: ni botón ni contador compiten con ella.
    const gyroButton = gyro.available && !gyro.active && t > INTRO.free && doneAt < 0
      && !(gyro.denied && t > INTRO.free + 8);
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
      // ¿Era el último? Entonces arranca el final y la cámara viaja hacia la luna
      if (doneAt < 0 && memoryFlowers().every((f) => f.found)) {
        doneAt = t;
        camera.travelTo(0, 0.16, 2.4);
      }
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
        // El mundo se apaga al abrirse la carta: bajar la exposición del render es más limpio
        // que superponer un rectángulo translúcido, porque el corazón también se atenúa y la
        // carta queda como único foco.
        exposure: 1.45 * (1 - letterDim * 0.55), time: t, reset: false, owner: pos,
      });
      ctx.drawImage(renderer.canvas, 0, 0, w, h);
    } else {
      drawParticles2D(ctx, w, h, vp, pos, col, o, 90, 0.02, '#03040c');
    }

    // --- Interfaz mínima: título de la intro, contador y mensaje descubierto ---
    // Todo el texto se dibuja DESPUÉS de componer las partículas: antes del drawImage quedaba
    // tapado por completo, y sin el textAlign de aquí salía corrido hacia la derecha desde el
    // centro en vez de centrado.
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // --- Título de la intro: nombre personalizable y mensaje, y luego la invitación a explorar ---
    const titleIn = revealAt(t, INTRO.title, 0.9) * (1 - clamp01((t - INTRO.free + 0.6) / 0.8));
    if (titleIn > 0.01) {
      const name = (config.recipientName || '').trim();
      const big = Math.max(20, w * 0.085);
      ctx.font = `700 ${big}px "Dancing Script", Georgia, serif`;
      ctx.shadowColor = 'rgba(0,0,0,.85)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = `rgba(255,246,214,${titleIn})`;
      ctx.fillText(name ? `Para ${name} 💛` : 'Para ti 💛', w / 2, h * 0.38, w * 0.86);
      ctx.font = `500 ${Math.max(12, w * 0.037)}px system-ui, sans-serif`;
      ctx.fillStyle = `rgba(226,232,255,${titleIn * 0.85})`;
      ctx.fillText(config.introMessage, w / 2, h * 0.45, w * 0.84);
      ctx.shadowBlur = 0;
    }
    const exploreIn = revealAt(t, INTRO.free, 0.8) * (1 - clamp01((t - INTRO.free - 4) / 1));
    if (exploreIn > 0.01 && found === 0) {
      ctx.font = `600 ${Math.max(12, w * 0.036)}px system-ui, sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,.85)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = `rgba(255,238,190,${exploreIn * 0.9})`;
      // Debajo de la luna: a 0.2 el texto caía sobre el borde brillante y no se leía
      ctx.fillText('Muévete y descubre cada flor', w / 2, h * 0.47, w * 0.86);
      ctx.shadowBlur = 0;
    }
    if ((found > 0 || t > INTRO.free) && doneAt < 0) {
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
    // --- Carta final: se abre sobre el mundo apagado, no es un texto plano encima ---
    if (doneAt >= 0 && letterDim > 0.002) {
      const ft = t - doneAt;
      const letterIn = revealAt(ft, FINALE.letter, 1.2);
      // Medidas de la hoja: se calculan antes para poder dibujar el papel y luego el texto
      ctx.font = `500 ${Math.max(12, w * 0.036)}px system-ui, sans-serif`;
      const words = config.letterText.split(/\s+/);
      const lines = [];
      let line = '';
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > w * 0.72 && line) { lines.push(line); line = word; }
        else line = next;
      }
      if (line) lines.push(line);
      const lh = Math.max(16, w * 0.05);
      const padY = h * 0.055;
      const sheetW = w * 0.84;
      const sheetH = padY * 2 + w * 0.09 + lines.length * lh + (config.senderName ? lh * 1.6 : 0);
      const cx = w / 2;
      // Debajo de la luna, no encima del corazón: a 0.46 la hoja caía justo sobre él
      // (corazón en v=0.38..0.52) y el corazón se veía como una mancha a través del papel.
      // Entre el borde inferior de la luna y la cascada queda cielo libre.
      const cy = Math.min(h * 0.8, h - sheetH / 2 - h * 0.04);
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
        ctx.font = `700 ${Math.max(18, w * 0.062)}px "Dancing Script", Georgia, serif`;
        ctx.fillStyle = `rgba(255,246,214,${textIn})`;
        ctx.fillText(config.letterTitle, cx, top, sheetW * 0.88);
        ctx.font = `500 ${Math.max(12, w * 0.036)}px system-ui, sans-serif`;
        ctx.fillStyle = `rgba(226,232,255,${textIn * 0.92})`;
        lines.forEach((l, i) => ctx.fillText(l, cx, top + w * 0.085 + i * lh, sheetW * 0.88));
        const senderIn = revealAt(ft, FINALE.sender, 1) * textIn;
        if (senderIn > 0.01 && config.senderName) {
          ctx.font = `700 ${Math.max(14, w * 0.045)}px "Dancing Script", Georgia, serif`;
          ctx.fillStyle = `rgba(255,238,190,${senderIn})`;
          ctx.fillText(`— ${config.senderName}`, cx, top + w * 0.085 + lines.length * lh + lh * 0.7, sheetW * 0.7);
        }
        ctx.shadowBlur = 0;
      }
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
