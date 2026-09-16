import {
  TAU, clamp, lerp, easeInOut, textPoints, cardName,
  PARTICLE_TAN, particleQuality, viewProjection, qualityGovernor, drawParticles2D,
} from './util.js';
// Renderizador propio, con profundidad: el compartido dibuja en aditivo puro y sin búfer de
// profundidad, así que la nuca suma luz sobre la cara y ningún rasgo llega a tener borde.
// Se mantiene aparte para no tocar el motor que ya usan las animaciones publicadas.
import { getPortraitRenderer } from './portrait-renderer.js';

// PARTICLE PORTRAIT — retrato de partículas a partir de la superficie real de un modelo 3D.
//
// Las partículas SON el objeto: no hay malla visible. Cada una nace dispersa, viaja hasta su
// punto sobre la superficie del modelo, sostiene el retrato, explota en XYZ y las MISMAS
// partículas se reordenan hasta formar el nombre. Nunca se destruyen ni se sustituyen.
//
// La nube de puntos se calcula fuera del navegador con tools/sample-head.mjs (muestreo
// ponderado por área de los triángulos) y se carga como binario compacto.
//
// Motor compartido: usa el renderizador de partículas de util.js (bloom, estelas, DOF,
// respaldo 2D). No crea un segundo motor.

// ---------- Carga de la nube de puntos ----------

const cache = new Map();

// Devuelve { pos: Float32Array(n*3), nor: Float32Array(n*3), count } con alto normalizado a 1.
export function loadPointCloud(url) {
  const clave = String(url);
  if (!cache.has(clave)) {
    cache.set(clave, fetch(clave).then(async (res) => {
      if (!res.ok) throw new Error(`No se pudo cargar ${clave}: ${res.status}`);
      const datos = await res.arrayBuffer();
      const cabecera = new DataView(datos);
      const magia = String.fromCharCode(cabecera.getUint8(0), cabecera.getUint8(1), cabecera.getUint8(2), cabecera.getUint8(3));
      if (magia !== 'VCPT') throw new Error('Formato de nube desconocido');
      const count = cabecera.getUint32(8, true);
      const crudoPos = new Int16Array(datos, 16, count * 3);
      const crudoNor = new Int8Array(datos, 16 + count * 6, count * 3);
      const pos = new Float32Array(count * 3);
      const nor = new Float32Array(count * 3);
      for (let i = 0; i < count * 3; i++) {
        pos[i] = crudoPos[i] / 32767;
        nor[i] = crudoNor[i] / 127;
      }
      return { pos, nor, count };
    }).catch((err) => {
      console.warn('Particle Portrait:', err.message);
      return null;
    }));
  }
  return cache.get(clave);
}

// ---------- Ayudas ----------

const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

// Ruido rizado barato: campo de velocidades sin divergencia aparente, para turbulencia orgánica.
function curl(x, y, z, out) {
  const s1 = Math.sin(y * 1.7 + z * 2.3);
  const s2 = Math.sin(z * 1.9 + x * 2.1);
  const s3 = Math.sin(x * 2.2 + y * 1.5);
  out[0] = s1 * Math.cos(z * 1.3) - s3 * Math.cos(y * 1.1);
  out[1] = s2 * Math.cos(x * 1.4) - s1 * Math.cos(z * 1.2);
  out[2] = s3 * Math.cos(y * 1.6) - s2 * Math.cos(x * 1.0);
}

// Luz principal: arriba, a la izquierda y algo hacia el espectador. Es la que da relieve a la
// cara (nariz, pómulo, cuenca) en una nube de puntos, donde no hay sombras reales.
const LUZ = (() => {
  const v = [-0.52, 0.62, 0.86];
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
})();

export const PHASES = ['awaken', 'formation', 'hero', 'buildup', 'explode', 'morph', 'reveal'];

// Guion en segundos. Cada fase empieza donde termina la anterior.
export const TIMELINE = {
  awaken: 0.0,
  formation: 0.8,
  hero: 3.2,
  buildup: 5.7,
  explode: 6.8,
  morph: 8.0,
  reveal: 9.4,
  end: 12.0,
};

export const DEFAULT_CONFIG = {
  points: null,              // URL del .bin con la nube (obligatorio)
  name: 'NEYMAR JR',         // texto del reveal
  subtitle: 'O JOGO NUNCA PARA',
  primary: [0.16, 0.42, 1.0],    // azul eléctrico
  secondary: [0.25, 0.85, 1.0],  // cyan
  highlight: [0.88, 0.96, 1.0],  // blanco azulado
  density: 1,                // multiplica el número de partículas
  rotation: 25,              // grados de giro a cada lado en el hero
  explosion: 1,              // fuerza de la explosión
  useCardName: true,         // si el visitante puso un nombre, sustituye a `name`
};

/**
 * Crea la experiencia. Devuelve la función `frame(t, dt)` que espera engine.js,
 * con métodos extra colgados para la página de depuración.
 */
export function createParticlePortrait(ctx, w, h, dpr, stage, opciones = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...opciones };
  const TAN = PARTICLE_TAN;
  const aspect = w / h;
  const renderer = getPortraitRenderer();
  const gobernador = qualityGovernor();

  // --- Presupuesto de partículas ---
  const esMovil = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const calidad = particleQuality(w, h, cfg.density);
  // Medido: la simulación en CPU costaba 20 ms por cuadro con 25.441 partículas de cabeza,
  // mientras las tres pasadas de GPU sumaban 0,5 ms. El límite real es el bucle en JavaScript,
  // así que se recorta el conteo y se compensa con puntos algo mayores.
  const N_CABEZA = renderer ? clamp(calidad.count, 7000, 15000) : 2600;
  const N_ANILLO = Math.round(clamp(N_CABEZA * 0.1, 400, 2600));
  const N_AMBIENTE = Math.round(clamp(N_CABEZA * 0.07, 300, 1800));
  const TOTAL = N_CABEZA + N_ANILLO + N_AMBIENTE;
  let activas = N_CABEZA;

  // --- Encuadre: la cabeza en el centro superior, sitio abajo para el anillo y el nombre ---
  const ALTO_CABEZA = 1.0;                      // la nube viene normalizada a 1
  const escalaCabeza = 2.05;                    // unidades de mundo
  // Dos encuadres. El lejano enseña el busto entero y deja sitio abajo para el anillo y para
  // el nombre; es el que define dónde vive cada cosa en el mundo.
  const dist = Math.max(
    (ALTO_CABEZA * escalaCabeza) / (0.56 * 2 * TAN),
    (ALTO_CABEZA * escalaCabeza * 0.78) / (0.72 * 2 * TAN * aspect),
  );

  // El cercano es para el plano heroico: encuadra SOLO la cabeza. En el busto normalizado la
  // barbilla cae a 0.42 y la corona a 1.0, así que la cabeza es el 58% de la altura total.
  // Medido: a la distancia lejana la cara ocupaba ~150 px y no se reconocía.
  // Medido: encuadrando el 58% del busto al 80% del alto del cuadro, la cabeza salía cortada
  // por las cejas. La cabeza entera necesita sitio de sobra, no ajuste justo.
  const ALTO_CARA = 0.62 * escalaCabeza;
  const ANCHO_CARA = 0.56 * escalaCabeza;
  const distCerca = Math.max(
    ALTO_CARA / (0.62 * 2 * TAN),
    ANCHO_CARA / (0.70 * 2 * TAN * aspect),
  );
  const medioAlto = dist * TAN;
  const medioAncho = medioAlto * aspect;
  const centroY = medioAlto * 0.18;             // la cabeza mira al tercio superior
  const anilloY = centroY - medioAlto * 0.72;
  const anilloR = Math.min(medioAncho * 0.66, escalaCabeza * 0.62);
  // Centro de la cabeza (no del busto): entre la barbilla (0.42) y la corona (1.0) del modelo
  // normalizado. Es a donde mira la cámara en el plano heroico.
  // A la altura de los ojos, no del centro geométrico de la cabeza: mirando a 0.71 la cámara
  // apuntaba por encima de las cejas y dejaba fuera la mitad inferior del rostro.
  const yCara = centroY + (0.63 - 0.5) * escalaCabeza;

  // --- Estado por partícula (sin reservas dentro del bucle) ---
  const px = new Float32Array(TOTAL); const py = new Float32Array(TOTAL); const pz = new Float32Array(TOTAL);
  const vx = new Float32Array(TOTAL); const vy = new Float32Array(TOTAL); const vz = new Float32Array(TOTAL);
  const tx = new Float32Array(N_CABEZA); const ty = new Float32Array(N_CABEZA); const tz = new Float32Array(N_CABEZA);
  const nx = new Float32Array(N_CABEZA); const ny = new Float32Array(N_CABEZA); const nz = new Float32Array(N_CABEZA);
  const mx = new Float32Array(N_CABEZA); const my = new Float32Array(N_CABEZA); const mz = new Float32Array(N_CABEZA);
  const rank = new Float32Array(N_CABEZA);      // orden de formación: silueta → volumen → rasgos
  const fase = new Float32Array(TOTAL);
  const semilla = new Float32Array(TOTAL);
  const tam = new Float32Array(TOTAL);
  const tono = new Float32Array(TOTAL);         // 0 azul, 1 blanco
  const brillo = new Float32Array(TOTAL);
  const enMorph = new Uint8Array(N_CABEZA);     // ya tiene destino de texto
  // Factor de visibilidad y luz por partícula. La cámara gira despacio, así que recalcularlo
  // en cada cuadro es tirar tiempo: se refresca cada tercer cuadro y se reutiliza.
  const vista = new Float32Array(N_CABEZA);
  let contadorCuadros = 0;

  // Buffers de dibujo, reutilizados en cada cuadro
  const pos = new Float32Array(TOTAL * 4);
  const col = new Float32Array(TOTAL * 4);
  const vp = new Float32Array(16);
  const eye = [0, 0, 0];
  const target = [0, 0, 0];
  const tmp = [0, 0, 0];

  let nube = null;            // nube cargada
  let listo = false;
  let tiempoCarga = 0;        // instante en que llegó la nube
  let modo = 'particles';     // particles | mesh | both (mesh solo afecta a la depuración)
  let saltoFase = null;       // fase forzada desde el panel de depuración
  let desfase = 0;            // corrimiento de tiempo al saltar de fase
  const interactivo = !!stage && !stage.auto;
  const ondas = [];           // toques del usuario: { x, y, z, t }

  // --- Anillo de energía y polvo ambiental (existen desde el principio) ---
  for (let k = N_CABEZA; k < N_CABEZA + N_ANILLO; k++) {
    const i = k - N_CABEZA;
    const anillo = i % 3;
    const a = Math.random() * TAU;
    const r = anilloR * (0.52 + anillo * 0.24) * (1 + gauss() * 0.03);
    px[k] = Math.cos(a) * r;
    py[k] = anilloY + gauss() * 0.02;
    pz[k] = Math.sin(a) * r;
    fase[k] = a;
    semilla[k] = 0.35 + Math.random() * 0.9 + anillo * 0.25;  // velocidad angular
    tam[k] = 0.012 + Math.random() * 0.012;
    tono[k] = Math.random() < 0.3 ? 1 : 0.45;
    brillo[k] = 0.2 + Math.random() * 0.3;
  }
  for (let k = N_CABEZA + N_ANILLO; k < TOTAL; k++) {
    pz[k] = lerp(-dist * 0.55, dist * 0.55, Math.pow(Math.random(), 0.8));
    const d = dist - pz[k];
    px[k] = (Math.random() * 2 - 1) * d * TAN * aspect * 1.1;
    py[k] = centroY + (Math.random() * 2 - 1) * d * TAN * 1.05;
    fase[k] = Math.random() * TAU;
    semilla[k] = Math.random();
    tam[k] = 0.012 + Math.random() * 0.02;
    tono[k] = Math.random() * 0.4;
    brillo[k] = 0.05 + Math.random() * 0.22;
  }

  // --- Cuando llega la nube: repartir objetivos y lanzar las partículas desde fuera ---
  function prepararCabeza(datos, t) {
    nube = datos;
    const n = datos.count;
    for (let k = 0; k < N_CABEZA; k++) {
      const j = (k % n) * 3;
      const sx = datos.pos[j] * escalaCabeza;
      const sy = datos.pos[j + 1] * escalaCabeza;
      const sz = datos.pos[j + 2] * escalaCabeza;
      // La nube tiene la base en y=0: se recoloca para que la cabeza quede centrada en el encuadre
      tx[k] = sx;
      ty[k] = sy - ALTO_CABEZA * escalaCabeza * 0.5 + centroY;
      tz[k] = sz;
      nx[k] = datos.nor[j]; ny[k] = datos.nor[j + 1]; nz[k] = datos.nor[j + 2];

      // Orden de construcción: primero la silueta (puntos alejados del eje), luego el volumen,
      // al final los rasgos frontales (nariz, labios, ojos).
      const radial = Math.min(1, Math.hypot(sx, sz) / (escalaCabeza * 0.42));
      const frontal = clamp(nz[k] * 0.5 + 0.5);
      rank[k] = clamp(0.45 * (1 - radial) + 0.35 * frontal + 0.2 * Math.random());

      fase[k] = Math.random() * TAU;
      semilla[k] = Math.random();
      const destello = Math.random();
      tono[k] = destello < 0.06 ? 1 : destello < 0.42 ? 0.65 : 0.12;
      // Solo ~12% de los puntos miran de frente a la cámara en cada instante: son los que
      // dibujan la cara, así que necesitan brillo. El resto ya lo hunde la caída por coseno.
      // Punto pequeño y brillante define un rasgo mejor que uno grande y difuso.
      brillo[k] = 0.55 + Math.random() * 0.5;
      tam[k] = 0.014 + Math.random() * 0.008;   // mayor: hay menos puntos que cubrir la cara

      // Posición inicial: envoltura dispersa alrededor, con profundidad real
      const a = Math.random() * TAU;
      const inc = Math.acos(1 - 2 * Math.random());
      const R = escalaCabeza * (1.9 + Math.random() * 2.4);
      px[k] = Math.sin(inc) * Math.cos(a) * R;
      py[k] = centroY + Math.cos(inc) * R * 0.75;
      pz[k] = Math.sin(inc) * Math.sin(a) * R;
      vx[k] = 0; vy[k] = 0; vz[k] = 0;
      enMorph[k] = 0;
    }
    pintarColoresFijos();
    tiempoCarga = t;
    listo = true;
  }

  // Color y tamaño que no cambian en toda la experiencia: se escriben una vez, no 15.000 veces
  // por cuadro. Solo el anillo se repinta, porque su tamaño sigue a la energía.
  function pintarColoresFijos() {
    for (let k = 0; k < N_CABEZA; k++) {
      const q = k * 4;
      const mezcla = tono[k];
      col[q] = lerp(cfg.primary[0], cfg.highlight[0], mezcla) * (1 - 0.25 * mezcla) + cfg.secondary[0] * 0.25 * mezcla;
      col[q + 1] = lerp(cfg.primary[1], cfg.highlight[1], mezcla);
      col[q + 2] = lerp(cfg.primary[2], cfg.highlight[2], mezcla);
      col[q + 3] = tam[k];
    }
    for (let k = N_CABEZA + N_ANILLO; k < TOTAL; k++) {
      const q = k * 4;
      col[q] = cfg.primary[0];
      col[q + 1] = cfg.primary[1];
      col[q + 2] = cfg.primary[2];
      col[q + 3] = tam[k];
    }
  }
  pintarColoresFijos();   // anillo y polvo ya existen; la cabeza se repinta al cargar la nube

  if (cfg.points) {
    const promesa = loadPointCloud(cfg.points);
    promesa.then((datos) => { if (datos) pendiente = datos; });
  }
  let pendiente = null;

  // --- Objetivos del nombre: las mismas partículas terminan escribiéndolo ---
  let textoPreparado = false;
  function prepararTexto() {
    const nombre = cfg.useCardName ? cardName(stage, cfg.name) : cfg.name;
    const lineas = nombre.split(/\s+/);
    const principal = lineas.slice(0, -1).join(' ') || lineas[0];
    const segunda = lineas.length > 1 ? lineas[lineas.length - 1] : '';
    const anchoPx = 900;
    const altoPx = 300;
    const puntos1 = textPoints(principal, anchoPx, altoPx, 4, 900);
    const puntos2 = segunda ? textPoints(segunda, anchoPx * 0.55, altoPx * 0.62, 4, 900) : [];
    const sub = cfg.subtitle ? textPoints(cfg.subtitle, anchoPx * 0.8, altoPx * 0.22, 5, 600) : [];

    const escala = (medioAncho * 1.42) / anchoPx;
    const grupos = [
      { pts: puntos1, dy: centroY + medioAlto * 0.16, peso: 0.56, esc: escala },
      { pts: puntos2, dy: centroY - medioAlto * 0.16, peso: 0.3, esc: escala },
      { pts: sub, dy: centroY - medioAlto * 0.42, peso: 0.14, esc: escala * 0.9 },
    ].filter((g) => g.pts.length);
    const pesoTotal = grupos.reduce((s, g) => s + g.peso, 0);

    let k = 0;
    for (const g of grupos) {
      const cuantas = Math.min(N_CABEZA - k, Math.round((g.peso / pesoTotal) * N_CABEZA));
      for (let i = 0; i < cuantas; i++, k++) {
        const p = g.pts[Math.floor(Math.random() * g.pts.length)];
        mx[k] = p.x * g.esc;
        my[k] = g.dy - p.y * g.esc;
        mz[k] = gauss() * 0.06;
        enMorph[k] = 1;
      }
    }
    // Las que sobran se quedan orbitando como halo
    for (; k < N_CABEZA; k++) {
      const a = Math.random() * TAU;
      const r = medioAncho * (0.75 + Math.random() * 0.5);
      mx[k] = Math.cos(a) * r;
      my[k] = centroY + gauss() * medioAlto * 0.5;
      mz[k] = Math.sin(a) * r * 0.6;
      enMorph[k] = 0;
    }
    textoPreparado = true;
  }

  // --- Explosión: velocidades estructuradas, no direcciones al azar ---
  function detonar() {
    for (let k = 0; k < N_CABEZA; k++) {
      const dx = px[k];
      const dy = py[k] - centroY;
      const dz = pz[k];
      const len = Math.hypot(dx, dy, dz) || 1;
      const radial = 2.5 + Math.random() * 2.2;
      // Componente tangencial: algunas orbitan antes de irse
      const tgx = -dz / len;
      const tgz = dx / len;
      const giro = (Math.random() - 0.35) * 2.4;
      curl(px[k] * 1.4, py[k] * 1.4, pz[k] * 1.4, tmp);
      // Una parte sale hacia cámara y otra hacia el fondo: profundidad real
      const haciaCamara = Math.random() < 0.22 ? 2.6 + Math.random() * 2.4 : (Math.random() - 0.5) * 1.2;
      const f = cfg.explosion;
      vx[k] = ((dx / len) * radial + tgx * giro + tmp[0] * 1.1) * f;
      vy[k] = ((dy / len) * radial * 0.85 + tmp[1] * 1.1 + 0.6) * f;
      vz[k] = ((dz / len) * radial + tgz * giro + tmp[2] * 1.1 + haciaCamara) * f;
    }
  }

  // --- Fases ---
  function faseDe(t) {
    if (saltoFase) return saltoFase;
    if (t < TIMELINE.formation) return 'awaken';
    if (t < TIMELINE.hero) return 'formation';
    if (t < TIMELINE.buildup) return 'hero';
    if (t < TIMELINE.explode) return 'buildup';
    if (t < TIMELINE.morph) return 'explode';
    if (t < TIMELINE.reveal) return 'morph';
    return 'reveal';
  }

  let explotado = false;
  let ultimoT = 0;
  let ultimoCrudo = 0;
  let atenuacion = 1;   // ver frame.setFacing
  const perfilCPU = { simulacion: 0, muestras: 0 };

  function frame(tCrudo, dt) {
    const tInicioCuadro = performance.now();
    ultimoCrudo = tCrudo;
    const t = Math.max(0, tCrudo - desfase);
    const paso = Math.min(dt || 0.016, 0.05);
    if (t < ultimoT - 0.2) { explotado = false; }   // el reproductor reinició
    ultimoT = t;

    if (pendiente && !listo) { prepararCabeza(pendiente, t); pendiente = null; }
    if (!textoPreparado && t > TIMELINE.hero - 1) prepararTexto();

    contadorCuadros++;
    const recalcularVista = (contadorCuadros % 3) === 1;
    const fasesActual = faseDe(t);
    const enExplosion = fasesActual === 'explode' || fasesActual === 'morph' || fasesActual === 'reveal';
    if (enExplosion && !explotado && listo) { detonar(); explotado = true; }
    if (!enExplosion && explotado) { explotado = false; }

    // ---------- Cámara ----------
    const giroHero = fasesActual === 'hero' || fasesActual === 'buildup'
      ? Math.sin((t - TIMELINE.hero) * 0.72) * (cfg.rotation * Math.PI / 180)
      : fasesActual === 'formation' ? Math.sin(t * 0.5) * 0.06 : 0;
    // Acercamiento al rostro: entra al empezar el hero y se deshace al estallar, para que la
    // explosión y el nombre vuelvan a caber en cuadro.
    const entra = easeInOut(clamp((t - TIMELINE.hero) / 0.9));
    const sale = easeInOut(clamp((t - TIMELINE.explode) / 0.55));
    const cerca = clamp(entra - sale);
    const empuje = clamp((t - TIMELINE.hero) / 2.4) * 0.05 * cerca;
    const d = lerp(dist, distCerca, cerca) * (1 - empuje);
    const miraY = lerp(centroY, yCara, cerca);
    let pxCam = 0;
    let pyCam = 0;
    if (stage && stage.pointer) {  // paralaje muy sutil en escritorio
      pxCam = (stage.pointer.x - 0.5) * 0.09;
      pyCam = (stage.pointer.y - 0.5) * 0.05;
    }
    eye[0] = Math.sin(giroHero + pxCam) * d;
    eye[1] = miraY + d * TAN * (0.02 + pyCam);
    eye[2] = Math.cos(giroHero + pxCam) * d;
    target[0] = 0;
    target[1] = miraY;
    target[2] = 0;
    viewProjection(vp, eye, target, aspect);

    // Dirección hacia la cámara. El render es aditivo y no oculta nada: sin esto, las
    // partículas de la nuca suman tanta luz como las de la cara y el rostro se pierde.
    let vdx = eye[0] - target[0];
    let vdy = eye[1] - target[1];
    let vdz = eye[2] - target[2];
    const vlen = Math.hypot(vdx, vdy, vdz) || 1;
    vdx /= vlen; vdy /= vlen; vdz /= vlen;

    // ---------- Partículas de la cabeza ----------
    const ondaViva = ondas.length ? ondas[ondas.length - 1] : null;
    const pulso = 0.5 + 0.5 * Math.sin(t * 2.1);
    for (let k = 0; k < activas; k++) {
      const q = k * 4;
      let intensidad = 0;
      if (!listo) { pos[q + 3] = 0; continue; }

      if (fasesActual === 'awaken') {
        // Casi nada: unas pocas chispas insinuando la silueta
        const visible = semilla[k] < 0.05;
        px[k] += (tx[k] - px[k]) * 0.4 * paso;
        py[k] += (ty[k] - py[k]) * 0.4 * paso;
        pz[k] += (tz[k] - pz[k]) * 0.4 * paso;
        intensidad = visible ? 0.25 * clamp(t / TIMELINE.formation) : 0;
      } else if (fasesActual === 'formation') {
        const local = clamp((t - TIMELINE.formation) / (TIMELINE.hero - TIMELINE.formation));
        const arranque = rank[k] * 0.55;
        const avance = clamp((local - arranque) / (1 - arranque));
        const e = easeInOut(avance);
        // Viaje físico con remolino y turbulencia que se apagan al llegar
        curl(px[k] * 0.9 + t * 0.2, py[k] * 0.9, pz[k] * 0.9, tmp);
        const caos = (1 - e) * 0.9;
        const ang = (1 - e) * 1.5 * paso;
        const cx = px[k] * Math.cos(ang) - pz[k] * Math.sin(ang);
        const cz = px[k] * Math.sin(ang) + pz[k] * Math.cos(ang);
        px[k] = cx; pz[k] = cz;
        px[k] += ((tx[k] - px[k]) * (1.6 + e * 5) + tmp[0] * caos) * paso;
        py[k] += ((ty[k] - py[k]) * (1.6 + e * 5) + tmp[1] * caos) * paso;
        pz[k] += ((tz[k] - pz[k]) * (1.6 + e * 5) + tmp[2] * caos) * paso;
        intensidad = brillo[k] * (0.25 + 0.75 * e);
      } else if (fasesActual === 'hero' || fasesActual === 'buildup') {
        // Micro movimiento: amplitud muy por debajo del tamaño de los rasgos
        const vibra = fasesActual === 'buildup'
          ? 0.004 + 0.01 * clamp((t - TIMELINE.buildup) / (TIMELINE.explode - TIMELINE.buildup))
          : 0.0035;
        const resp = Math.sin(t * 1.5 + fase[k]) * vibra;
        let dx = tx[k] * (1 + resp) - px[k];
        let dy = ty[k] + resp * 0.5 - py[k];
        let dz = tz[k] * (1 + resp) - pz[k];
        // Onda al tocar: empuja hacia fuera y vuelve
        if (ondaViva) {
          const edad = t - ondaViva.t;
          if (edad > 0 && edad < 0.9) {
            const frente = edad * 2.6;
            const dist2 = Math.abs(Math.hypot(px[k] - ondaViva.x, py[k] - ondaViva.y, pz[k] - ondaViva.z) - frente);
            const fuerza = Math.exp(-dist2 * dist2 * 9) * (1 - edad / 0.9) * 0.5;
            dx += nx[k] * fuerza; dy += ny[k] * fuerza; dz += nz[k] * fuerza;
          }
        }
        px[k] += dx * 9 * paso;
        py[k] += dy * 9 * paso;
        pz[k] += dz * 9 * paso;
        const destello = Math.sin(t * 3 + fase[k] * 2) > 0.985 ? 0.5 : 0;
        intensidad = brillo[k] * (0.85 + 0.15 * pulso) + destello;
      } else {
        // Explosión y morph: la misma partícula pierde velocidad y busca su letra
        const desdeExplosion = t - TIMELINE.explode;
        const aTexto = clamp((t - TIMELINE.morph) / (TIMELINE.reveal - TIMELINE.morph + 0.6));
        const arrastre = Math.exp(-paso * (1.1 + aTexto * 5.5));
        vx[k] *= arrastre; vy[k] *= arrastre; vz[k] *= arrastre;
        if (aTexto > 0) {
          const atrae = easeInOut(aTexto) * 10;
          vx[k] += (mx[k] - px[k]) * atrae * paso;
          vy[k] += (my[k] - py[k]) * atrae * paso;
          vz[k] += (mz[k] - pz[k]) * atrae * paso;
        } else {
          curl(px[k] * 0.7 + t, py[k] * 0.7, pz[k] * 0.7, tmp);
          vx[k] += tmp[0] * 1.6 * paso;
          vy[k] += tmp[1] * 1.6 * paso - 0.35 * paso;
          vz[k] += tmp[2] * 1.6 * paso;
        }
        px[k] += vx[k] * paso;
        py[k] += vy[k] * paso;
        pz[k] += vz[k] * paso;
        const asentado = aTexto > 0.8 && enMorph[k];
        if (asentado) {
          const micro = Math.sin(t * 2.2 + fase[k]) * 0.006;
          px[k] += (mx[k] + micro - px[k]) * 12 * paso;
          py[k] += (my[k] - py[k]) * 12 * paso;
        }
        const destelloRuptura = desdeExplosion < 0.12 ? (1 - desdeExplosion / 0.12) * 1.4 : 0;
        intensidad = brillo[k] * (enMorph[k] || aTexto < 0.3 ? 1 : 0.35) * (0.7 + 0.3 * pulso) + destelloRuptura;
      }

      // Mientras la cabeza existe como tal, la cara manda: lo que mira hacia el otro lado
      // queda como un fondo tenue que aporta volumen sin borrar los rasgos.
      if (!enExplosion && atenuacion && !recalcularVista) {
        intensidad *= vista[k];
      } else if (!enExplosion && atenuacion) {
        // Dos términos distintos, y hacen falta los dos:
        //
        // 1) Visibilidad. En el contorno la superficie queda tangente a la cámara y cientos de
        //    puntos se amontonan en pocos píxeles; con una curva suave ese borde gana por
        //    acumulación aditiva y borra la cara. La caída por coseno elevada lo hunde.
        // 2) Relieve. Una cara se reconoce por el degradado entre nariz, mejilla y cuenca, y
        //    todas ellas miran a la cámara: sin una luz lateral el rostro sale plano y punteado.
        const frente = (nx[k] * vdx + ny[k] * vdy + nz[k] * vdz) * atenuacion;
        const cara = clamp(frente);
        const visible = 0.02 + 0.98 * cara * cara * Math.sqrt(cara);
        const luz = clamp(nx[k] * LUZ[0] + ny[k] * LUZ[1] + nz[k] * LUZ[2]);
        // El suelo de luz no puede ser bajo: multiplica a la visibilidad, y dos atenuaciones
        // encadenadas apagan también la silueta. Aquí solo modela el relieve, no oculta.
        vista[k] = visible * (0.22 + 0.78 * luz * luz);   // se reutiliza en los dos cuadros siguientes
        intensidad *= vista[k];
      }
      // El color y el tamaño de estas partículas no cambian nunca: se escriben una sola vez
      // en pintarColoresFijos(). Aquí solo se actualiza posición e intensidad.
      pos[q] = px[k]; pos[q + 1] = py[k]; pos[q + 2] = pz[k]; pos[q + 3] = intensidad;
    }

    // ---------- Anillo de energía ----------
    const energia = fasesActual === 'buildup'
      ? 1 + 2.2 * clamp((t - TIMELINE.buildup) / (TIMELINE.explode - TIMELINE.buildup))
      : fasesActual === 'explode' ? 2.6 * Math.exp(-(t - TIMELINE.explode) * 2.2)
        : fasesActual === 'reveal' ? 1 + 0.8 * Math.exp(-(t - TIMELINE.reveal) * 1.6)
          : fasesActual === 'awaken' ? clamp(t / TIMELINE.formation) * 0.8 : 1;
    const expansion = fasesActual === 'explode' ? 1 + clamp((t - TIMELINE.explode) / 0.5) * 0.45 : 1;
    for (let k = N_CABEZA; k < N_CABEZA + N_ANILLO; k++) {
      const q = k * 4;
      fase[k] += semilla[k] * 0.35 * paso;
      const r = Math.hypot(px[k], pz[k]) * (1 + (expansion - 1) * paso * 4);
      const a = fase[k];
      px[k] = Math.cos(a) * r;
      pz[k] = Math.sin(a) * r;
      py[k] = anilloY + Math.sin(t * 2 + a * 3) * 0.03 * energia;
      pos[q] = px[k]; pos[q + 1] = py[k]; pos[q + 2] = pz[k];
      pos[q + 3] = brillo[k] * energia * (0.7 + 0.3 * Math.sin(t * 3 + a * 5));
      col[q] = lerp(cfg.secondary[0], cfg.highlight[0], tono[k]);
      col[q + 1] = lerp(cfg.secondary[1], cfg.highlight[1], tono[k]);
      col[q + 2] = lerp(cfg.secondary[2], cfg.highlight[2], tono[k]);
      col[q + 3] = tam[k] * (1 + 0.4 * (energia - 1));
    }

    // ---------- Polvo ambiental (profundidad y paralaje) ----------
    for (let k = N_CABEZA + N_ANILLO; k < TOTAL; k++) {
      const q = k * 4;
      py[k] += (0.04 + semilla[k] * 0.06) * paso;
      if (py[k] > centroY + medioAlto * 1.5) py[k] = centroY - medioAlto * 1.5;
      pos[q] = px[k]; pos[q + 1] = py[k]; pos[q + 2] = pz[k];
      pos[q + 3] = brillo[k] * (0.6 + 0.4 * Math.sin(t * 1.3 + fase[k])) * (fasesActual === 'awaken' ? 0.4 : 1);
    }

    // ---------- Dibujo ----------
    // Todo lo anterior es simulación en CPU; lo que sigue es GPU. Separarlos evita volver a
    // suponer dónde se va el tiempo.
    perfilCPU.simulacion += performance.now() - tInicioCuadro;
    perfilCPU.muestras++;
    const dibujadas = modo === 'mesh' ? 0 : TOTAL;
    const flash = fasesActual === 'explode' && t - TIMELINE.explode < 0.14
      ? (1 - (t - TIMELINE.explode) / 0.14) * 0.8 : 0;
    if (renderer) {
      const escalaCss = Math.min(dpr, 2) * calidad.scale;
      const fbW = Math.round(w * escalaCss);
      const fbH = Math.round(h * escalaCss);
      renderer.render({
        width: fbW,
        height: fbH,
        vp,
        pos,
        col,
        count: dibujadas,
        px: (fbH / 2) / TAN,
        maxSize: 30 * escalaCss,
        // Mientras la cabeza es materia se dibuja con profundidad: lo de delante tapa lo de
        // detrás y la cara deja de competir con la nuca. Al estallar ya es energía suelta.
        solid: !enExplosion,
        // Solo la cabeza es materia. El anillo y el polvo van detrás, en aditivo.
        solidCount: N_CABEZA,
        // El halo es la pasada cara (dibuja los mismos puntos otra vez) y además lava el
        // relieve del rostro. Con la cabeza formada se deja al mínimo, y en móvil se apaga:
        // medido, con halo al 0.7 el retrato caía a 30 fps.
        glow: enExplosion ? 1 : (esMovil ? 0 : 0.2),
        // La estela solo tiene sentido cuando las partículas viajan: sobre el retrato formado
        // acumula luz encima de la cara y la borra.
        trail: fasesActual === 'explode' ? 0.78 : fasesActual === 'morph' ? 0.5 : fasesActual === 'formation' ? 0.25 : 0,
        flash,
      });
      ctx.drawImage(renderer.canvas, 0, 0, w, h);
    } else {
      drawParticles2D(ctx, w, h, vp, pos, col, dibujadas, d);
    }

    if (stage && t > TIMELINE.reveal) stage.revealed = true;

    // Calidad adaptativa: si el dispositivo no llega, se dibujan menos partículas de la cabeza
    if (gobernador(t) && activas > 3000) {
      const antes = activas;
      activas = Math.round(activas * 0.8);
      // Las que dejan de simularse hay que apagarlas: si no, se quedan congeladas en pantalla
      for (let k = activas; k < antes; k++) pos[k * 4 + 3] = 0;
    }

    // Toques: onda de energía durante el hero (no explota)
    if (stage && stage.taps && stage.taps.length) {
      for (const tap of stage.taps.splice(0)) {
        if (!interactivo) continue;
        const u = tap.x / w - 0.5;
        const v = 0.5 - tap.y / h;
        ondas.push({ x: u * medioAncho * 2, y: centroY + v * medioAlto * 2, z: 0.4, t });
        if (ondas.length > 3) ondas.shift();
      }
    }
  }

  // --- API extra para la página de depuración (engine.js solo usa la función) ---
  frame.setMode = (m) => { modo = m; };
  frame.getMode = () => modo;
  // `tActual` es el tiempo del reproductor. Si no se pasa, se usa el último recibido: así
  // no se puede saltar de fase con un tiempo equivocado desde la consola.
  frame.jumpTo = (nombreFase, tActual = ultimoCrudo) => {
    if (nombreFase === null) { saltoFase = null; desfase = 0; return; }
    saltoFase = null;
    desfase = tActual - (TIMELINE[nombreFase] ?? 0);
    explotado = nombreFase === 'explode' ? false : explotado;
  };
  frame.info = () => ({
    cabeza: N_CABEZA, anillo: N_ANILLO, ambiente: N_AMBIENTE, activas, total: TOTAL,
    listo, webgl: !!renderer, escalaCabeza, dist, centroY, anilloY, anilloR,
    alturaCabeza: ALTO_CABEZA, fase: faseDe(Math.max(0, ultimoT)),
  });
  // La página de depuración necesita la cámara exacta para superponer la malla original.
  frame.camera = () => ({ eye: [eye[0], eye[1], eye[2]], target: [target[0], target[1], target[2]], tanHalf: TAN });
  // Coste medio de la simulación en CPU por cuadro (ms), para contrastarlo con el de la GPU.
  frame.perfilCPU = () => ({
    muestras: perfilCPU.muestras,
    simulacion_ms: +(perfilCPU.simulacion / Math.max(1, perfilCPU.muestras)).toFixed(3),
    particulas: activas + N_ANILLO + N_AMBIENTE,
  });
  frame.resetPerfilCPU = () => { perfilCPU.simulacion = 0; perfilCPU.muestras = 0; };
  frame.targets = () => (listo ? { tx, ty, tz, count: N_CABEZA } : null);
  // Búferes reales de dibujo: permiten comprobar intensidad, tamaño y posición sin adivinar.
  frame.buffers = () => ({ pos, col, total: TOTAL, cabeza: N_CABEZA, anillo: N_ANILLO, px, py, pz, nx, ny, nz });
  // 1 = atenúa lo que da la espalda a la cámara, -1 = al revés, 0 = sin atenuar (para comparar).
  frame.setFacing = (v) => { atenuacion = v; };
  return frame;
}
