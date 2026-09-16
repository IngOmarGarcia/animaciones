// Sistema de personajes de ViralCss Football.
// PERFIL → ESQUELETO → GEOMETRÍA ANATÓMICA → POSE → MUESTREO DE SUPERFICIE → NUBE DE PUNTOS.
// La anatomía es un campo de distancia: volúmenes anatómicos unidos con uniones suaves (smooth-min),
// sin juntas duras. Las partículas solo muestrean esa superficie: nunca deciden la forma.
// La misma lista de primitivas se evalúa en JS (muestreo) y se compila a GLSL (siluetas por raymarching).
// Espacio del personaje: metros, y hacia arriba, mira hacia +z, su izquierda en +x, pies en y = 0.

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Matriz 3x3 por filas; R = Ry · Rx · Rz
function matEuler(rx, ry, rz) {
  const cx = Math.cos(rx); const sx = Math.sin(rx);
  const cy = Math.cos(ry); const sy = Math.sin(ry);
  const cz = Math.cos(rz); const sz = Math.sin(rz);
  const X = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
  const Y = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const Z = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
  return matMul(Y, matMul(X, Z));
}
function matMul(a, b, out = new Array(9)) {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  }
  return out;
}
const matApply = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const IDENTITY_AXES = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const axesOf = (m) => [[m[0], m[3], m[6]], [m[1], m[4], m[7]], [m[2], m[5], m[8]]];
// Ejes locales de una elipsoide con su eje y a lo largo de `dir`
function axesAlong(dir, side = [1, 0, 0]) {
  const ey = norm(dir);
  let ex = sub(side, mul(ey, dot(side, ey)));
  if (len(ex) < 1e-4) ex = [0, 0, 1];
  ex = norm(ex);
  return [ex, ey, cross(ex, ey)];
}

// Regiones (densidad adaptativa de muestreo y pesos por hueso)
export const REGION = { TORSO: 0, HEAD: 1, FACE: 2, HAIR: 3, ARM: 4, HAND: 5, LEG: 6, FOOT: 7, NECK: 8 };
const DENSITY = [1.0, 1.6, 4.0, 2.2, 0.9, 1.6, 0.8, 1.0, 0.9];

// Grupos anatómicos: dentro de cada grupo los volúmenes se funden con mezclas amplias;
// entre grupos se unen con radios propios (axila, ingle, cuello) para que un brazo no se pegue al torso.
export const GROUP = { TORSO: 0, ARM_L: 1, ARM_R: 2, LEG_L: 3, LEG_R: 4, HEAD: 5, HAIR: 6 };
const JOIN = { hip: 0.045, neck: 0.035, hair: 0.006, armpit: 0.022 };

export const BASE_PROFILE = {
  height: 1.75, legRatio: 0.52, headScale: 1, neckLen: 0.085, neckR: 0.056,
  shoulderHalf: 0.205, chestHalf: 0.152, chestDepth: 0.112, waistHalf: 0.122, hipHalf: 0.148,
  muscle: 0.5, armRatio: 1, armR: 1, thighR: 0.085, calf: 0.5,
  jawWidth: 0.05, chinWidth: 1, chinProj: 0, browProj: 0.003, noseProj: 0.004, cheek: 1, faceLen: 1,
  beard: 0,
  hair: { style: 'short', top: 0.012, back: 0.01, front: 0.008, sides: 0.006, hairline: 0 },
  posture: { headForward: 0, headTilt: 0, shoulderForward: 0, chestOut: 0, weightShift: 0, pelvisTilt: 0, stance: 0.105, armOut: 0.12, elbowBend: 0.2 },
};

// Interpretaciones originales de complexión, cabello y postura (sin fotos, logos ni uniformes).
export const PLAYER_PROFILES = {
  // Compacto y bajo, piernas cortas y fuertes, cabeza proporcionalmente grande, barba, hombros algo adelantados.
  messi: {
    height: 1.64, legRatio: 0.485, shoulderHalf: 0.196, chestHalf: 0.155, chestDepth: 0.124, waistHalf: 0.146, hipHalf: 0.15,
    muscle: 0.5, thighR: 0.1, calf: 0.9, armRatio: 0.93, neckLen: 0.058, neckR: 0.06, headScale: 1.13,
    jawWidth: 0.055, chinWidth: 1.1, beard: 1.6, faceLen: 0.96,
    kit: { shirt: [0.46, 0.7, 0.9], stripe: [0.96, 0.97, 1], shorts: [0.08, 0.08, 0.1], socks: [0.96, 0.97, 1], boots: [0.85, 0.65, 0.2], skin: [0.93, 0.76, 0.64], hair: [0.3, 0.2, 0.13] },
    hair: { style: 'short', top: 0.018, back: 0.01, front: 0.014, sides: 0.004, hairline: 0.004 },
    posture: { headForward: 0.024, headTilt: 0.07, shoulderForward: 0.03, chestOut: -0.008, stance: 0.1, armOut: 0.15, elbowBend: 0.26 },
  },
  // Espigado y delgado, cuello largo, piernas finas, volumen de cabello alto, peso cargado en una pierna.
  neymar: {
    height: 1.8, legRatio: 0.545, shoulderHalf: 0.19, chestHalf: 0.132, chestDepth: 0.098, waistHalf: 0.116, hipHalf: 0.126,
    muscle: 0.15, thighR: 0.068, calf: 0.25, armRatio: 1.05, armR: 0.8, neckLen: 0.118, neckR: 0.046, headScale: 0.96,
    jawWidth: 0.045, chinWidth: 0.88, chinProj: 0.006, beard: 0.35, faceLen: 1.06,
    kit: { shirt: [1, 0.84, 0.08], shorts: [0.1, 0.25, 0.62], socks: [0.96, 0.97, 1], boots: [0.95, 0.35, 0.6], skin: [0.84, 0.64, 0.5], hair: [0.25, 0.18, 0.12] },
    hair: { style: 'topVolume', volume: 1.7, top: 0.02, back: 0.012, front: 0.016, sides: 0.004, hairline: 0 },
    posture: { weightShift: 0.038, pelvisTilt: 0.07, headTilt: -0.04, stance: 0.11, armOut: 0.18, elbowBend: 0.22 },
  },
  // Alto y atlético, hombros anchos con forma de V, muslos y pantorrillas potentes, mandíbula cuadrada, tupé, pecho erguido.
  cristiano: {
    height: 1.94, legRatio: 0.54, shoulderHalf: 0.26, chestHalf: 0.192, chestDepth: 0.136, waistHalf: 0.138, hipHalf: 0.14,
    muscle: 1.25, thighR: 0.114, calf: 1.15, armRatio: 1, armR: 1.28, neckLen: 0.085, neckR: 0.078, headScale: 0.97,
    jawWidth: 0.064, chinWidth: 1.55, chinProj: 0.012, browProj: 0.007, beard: 0, faceLen: 1.03,
    kit: { shirt: [0.8, 0.07, 0.16], shorts: [0.05, 0.42, 0.24], socks: [0.8, 0.07, 0.16], boots: [0.95, 0.95, 0.95], skin: [0.88, 0.68, 0.52], hair: [0.12, 0.09, 0.07] },
    hair: { style: 'quiff', volume: 1.5, top: 0.01, back: 0.005, front: 0.012, sides: 0.002, hairline: 0.006 },
    posture: { chestOut: 0.024, shoulderForward: -0.02, headForward: -0.008, headTilt: -0.08, stance: 0.14, armOut: 0.25, elbowBend: 0.18 },
  },
};

// Huesos: [nombre, articulación inicial, articulación final, padre]
const BONE_DEFS = [
  ['pelvis', 'pelvis', 'spine', -1], ['spine', 'spine', 'chest', 0], ['chest', 'chest', 'neck', 1], ['neck', 'neck', 'head', 2], ['head', 'head', 'headTop', 3],
  ['upperArmL', 'shoulderL', 'elbowL', 2], ['forearmL', 'elbowL', 'wristL', 5], ['handL', 'wristL', 'handL', 6],
  ['upperArmR', 'shoulderR', 'elbowR', 2], ['forearmR', 'elbowR', 'wristR', 8], ['handR', 'wristR', 'handR', 9],
  ['thighL', 'hipL', 'kneeL', 0], ['shinL', 'kneeL', 'ankleL', 11], ['footL', 'ankleL', 'toeL', 12],
  ['thighR', 'hipR', 'kneeR', 0], ['shinR', 'kneeR', 'ankleR', 14], ['footR', 'ankleR', 'toeR', 15],
];

export function buildCharacter(input = {}) {
  const P = {
    ...BASE_PROFILE, ...input,
    hair: { ...BASE_PROFILE.hair, ...(input.hair || {}) },
    posture: { ...BASE_PROFILE.posture, ...(input.posture || {}) },
  };
  const S = P.posture;
  const H = P.height;
  const hs = P.headScale;
  const fl = P.faceLen;
  const m = P.muscle;

  // ---- Esqueleto ----
  const headY = H - 0.105 * hs;
  const chinY = headY - 0.118 * hs * fl;
  const neckBaseY = chinY + 0.02 - P.neckLen;
  const shoulderY = neckBaseY - 0.015;
  const hipY = H * P.legRatio;
  const ankleY = (0.075 * H) / 1.75;
  const kneeY = ankleY + (hipY - ankleY) * 0.52;
  const co = S.chestOut;
  const ws = S.weightShift;
  const J = {
    pelvis: [ws, hipY + 0.04, 0],
    spine: [ws * 0.6, hipY + 0.2, 0.01],
    chest: [ws * 0.2, shoulderY - 0.11, 0.005 + co],
    neck: [0, neckBaseY, -0.025 + co * 0.6 + S.headForward * 0.3],
    head: [0, headY, S.headForward],
    headTop: [0, H, S.headForward],
  };
  const upperLen = 0.172 * H * P.armRatio;
  const foreLen = 0.147 * H * P.armRatio;
  const handLen = (0.105 * H) / 1.75;
  for (const s of [1, -1]) {
    const k = s > 0 ? 'L' : 'R';
    const sh = [s * (P.shoulderHalf - 0.048), shoulderY, S.shoulderForward + co * 0.3];
    const d1 = norm([s * Math.sin(S.armOut), -Math.cos(S.armOut), 0.03]);
    const el = add(sh, mul(d1, upperLen));
    // Ángulo de carga: el antebrazo se abre más que el brazo y deja aire junto a la cadera
    const d2 = norm([s * Math.sin(S.armOut * 1.5), -Math.cos(S.elbowBend), Math.sin(S.elbowBend)]);
    const wr = add(el, mul(d2, foreLen));
    const d3 = norm([s * Math.sin(S.armOut * 0.5), -1, Math.sin(S.elbowBend) * 0.6]);
    const hd = add(wr, mul(d3, handLen));
    const hp = [ws + s * P.hipHalf * 0.52, hipY + s * S.pelvisTilt * 0.25, 0];
    const an = [s * S.stance + ws * 0.3, ankleY, -0.015];
    const kn = [hp[0] + (an[0] - hp[0]) * 0.55, kneeY, 0.015];
    Object.assign(J, {
      [`shoulder${k}`]: sh, [`elbow${k}`]: el, [`wrist${k}`]: wr, [`hand${k}`]: hd,
      [`hip${k}`]: hp, [`knee${k}`]: kn, [`ankle${k}`]: an,
      [`toe${k}`]: [an[0] + s * 0.025, 0.02, (0.2 * H) / 1.75], [`heel${k}`]: [an[0], 0.035, -0.055],
    });
  }

  // ---- Geometría anatómica ----
  const prims = [];
  const R = REGION;
  let group = GROUP.TORSO;
  const cone = (a, b, r1, r2, k, reg) => prims.push({ t: 'c', a, b, r1, r2, k, reg, op: 'u', g: group });
  const ell = (c, r, k, reg, ax = IDENTITY_AXES, op = 'u', clip = null) => prims.push({ t: 'e', c, r, ax, k, reg, op, clip, g: group });

  // Torso: pelvis, glúteos, abdomen, caja torácica, pectorales, dorsales, trapecios y deltoides
  // Pelvis masculina: más estrecha que la caja torácica, glúteos compactos
  ell([J.pelvis[0], hipY + 0.045, -0.01], [P.hipHalf * 0.88, 0.1, 0.1], 0.06, R.TORSO);
  for (const s of [1, -1]) ell([J.pelvis[0] + s * 0.058, hipY, -0.06], [0.064, 0.08, 0.06], 0.045, R.TORSO);
  // Abdomen y oblicuos: cintura casi recta, sin forma de reloj de arena
  ell([J.spine[0], hipY + 0.2, 0.012 + co * 0.4], [P.waistHalf, 0.17, 0.104 + co * 0.3], 0.1, R.TORSO);
  // Caja torácica algo retrasada y aplanada: el frente del pecho lo definen los pectorales, no una cúpula
  ell([J.chest[0], J.chest[1], J.chest[2] - 0.03], [P.chestHalf, 0.17, P.chestDepth * 0.88], 0.1, R.TORSO);
  // Oblicuos y serratos: transición continua entre costillas y abdomen (sin borde de coraza)
  ell([(J.spine[0] + J.chest[0]) / 2, (hipY + 0.2 + J.chest[1]) / 2, 0.005 + co * 0.6], [(P.waistHalf + P.chestHalf) / 2, 0.13, P.chestDepth * 0.86], 0.12, R.TORSO);
  // Pecho alto bajo las clavículas: une pectorales, hombros y cuello en una sola masa
  ell([J.chest[0], shoulderY - 0.045, J.chest[2] + 0.01], [P.shoulderHalf - 0.06, 0.05, P.chestDepth * 0.75], 0.06, R.TORSO);
  for (const s of [1, -1]) {
    const k = s > 0 ? 'L' : 'R';
    const sh = J[`shoulder${k}`];
    // Pectoral: placa ancha y plana que sube hacia el hombro
    // Proporciones ≤ 3:1: una elipsoide muy aplanada distorsiona el campo y deja un borde visible al mezclarse
    ell([J.chest[0] + s * 0.07, shoulderY - 0.1, J.chest[2] + P.chestDepth * 0.3], [0.085, 0.065, 0.05 + 0.012 * m], 0.06, R.TORSO, axesOf(matEuler(0, 0, s * -0.25)));
    // Dorsal: detrás y debajo de la axila, pegado a la caja torácica
    ell([s * (P.chestHalf - 0.06), shoulderY - 0.17, J.chest[2] - 0.045], [0.04 + 0.012 * m, 0.11, 0.06], 0.07, R.TORSO, axesOf(matEuler(0, 0, s * 0.18)));
    // Trapecio: pendiente continua del cuello al hombro
    cone([0, neckBaseY + 0.02, J.neck[2] - 0.015], [s * (P.shoulderHalf - 0.07), shoulderY, sh[2] - 0.015], 0.05 + 0.012 * m, 0.032, 0.06, R.TORSO);
    // Deltoide: cubre la articulación y cae hacia el brazo
    group = s > 0 ? GROUP.ARM_L : GROUP.ARM_R;
    ell([s * (P.shoulderHalf - 0.05), shoulderY - 0.045, sh[2]], [0.043 + 0.014 * m, 0.068, 0.048 + 0.01 * m], 0.05, R.ARM, axesOf(matEuler(0, 0, s * 0.2)));
    group = GROUP.TORSO;
  }
  // Cuello: base ancha (esternocleidomastoideo) que se estrecha bajo el cráneo
  cone(add(J.neck, [0, -0.02, 0]), [0, chinY + 0.035, J.head[2] - 0.035], P.neckR * 1.3, P.neckR * 0.85, 0.05, R.NECK);

  // Brazos: hombro → bíceps/tríceps → codo → antebrazo ancho → muñeca fina → palma y pulgar
  for (const s of [1, -1]) {
    const k = s > 0 ? 'L' : 'R';
    const sh = J[`shoulder${k}`];
    const el = J[`elbow${k}`];
    const wr = J[`wrist${k}`];
    const hd = J[`hand${k}`];
    group = s > 0 ? GROUP.ARM_L : GROUP.ARM_R;
    const ar = P.armR;
    const up = sub(el, sh);
    const upAxes = axesAlong(up);
    cone(sh, el, 0.046 * ar + 0.008 * m, 0.035 * ar, 0.03, R.ARM);
    ell(add(add(sh, mul(up, 0.52)), [0, 0, 0.016]), [0.029 * ar + 0.012 * m, len(up) * 0.3, 0.029 * ar + 0.01 * m], 0.025, R.ARM, upAxes);
    ell(add(add(sh, mul(up, 0.42)), [0, 0, -0.02]), [0.029 * ar + 0.006 * m, len(up) * 0.33, 0.027 * ar], 0.025, R.ARM, upAxes);
    const fore = sub(wr, el);
    const bulge = add(el, mul(fore, 0.28));
    cone(el, bulge, 0.034 * ar, 0.038 * ar + 0.004 * m, 0.035, R.ARM);
    cone(bulge, wr, 0.038 * ar + 0.004 * m, 0.023 * ar, 0.035, R.ARM);
    const hdir = sub(hd, wr);
    ell(add(wr, mul(hdir, 0.42)), [0.025, len(hdir) * 0.46, 0.042], 0.02, R.HAND, axesAlong(hdir));
    cone(add(add(wr, mul(hdir, 0.12)), [-s * 0.004, 0, 0.03]), add(add(wr, mul(hdir, 0.55)), [-s * 0.012, 0, 0.042]), 0.011, 0.008, 0.01, R.HAND);
    // Índice extendido: hace legibles los gestos (señalar al cielo)
    cone(add(wr, mul(hdir, 0.75)), add(add(wr, mul(hdir, 1.45)), [0, 0, 0.012]), 0.0095, 0.007, 0.008, R.HAND);
  }

  // Piernas: muslo → cuádriceps/aductor → rodilla estrecha → pantorrilla → tobillo → bota
  for (const s of [1, -1]) {
    const k = s > 0 ? 'L' : 'R';
    const hp = J[`hip${k}`];
    const kn = J[`knee${k}`];
    const an = J[`ankle${k}`];
    const toe = J[`toe${k}`];
    const heel = J[`heel${k}`];
    group = s > 0 ? GROUP.LEG_L : GROUP.LEG_R;
    const thigh = sub(kn, hp);
    const thAxes = axesAlong(thigh);
    cone(add(hp, [0, 0.04, 0]), kn, P.thighR, 0.041, 0.05, R.LEG);
    // Cuádriceps largo que baja hasta la rodilla (sin estrangulamiento sobre ella)
    ell(add(add(hp, mul(thigh, 0.5)), [0, 0, 0.028]), [P.thighR * 0.68, len(thigh) * 0.42, P.thighR * 0.58], 0.04, R.LEG, thAxes);
    ell(add(add(hp, mul(thigh, 0.3)), [-s * 0.03, 0, -0.005]), [P.thighR * 0.55, len(thigh) * 0.3, P.thighR * 0.55], 0.04, R.LEG, thAxes);
    // Rodilla continua: el muslo termina un poco más ancho que la tibia y se funden sin bola
    const shin = sub(an, kn);
    cone(kn, an, 0.041, 0.029, 0.05, R.LEG);
    ell(add(add(kn, mul(shin, 0.3)), [s * 0.004, 0, -0.03]), [0.034 + 0.018 * P.calf, len(shin) * 0.26, 0.034 + 0.014 * P.calf], 0.035, R.LEG, axesAlong(shin));
    ell(an, [0.031, 0.034, 0.034], 0.02, R.FOOT);
    cone(heel, add(toe, [0, 0.012, -0.02]), 0.034, 0.028, 0.03, R.FOOT);
    ell(add(mix(heel, toe, 0.58), [0, -0.01, 0]), [0.043, 0.1, 0.027], 0.03, R.FOOT, axesAlong(sub(toe, heel)));
  }

  // Cabeza: cráneo, occipital, frente, cejas, maxilar, pómulos, mandíbula, mentón, nariz, labios, orejas y cuencas
  group = GROUP.HEAD;
  const Rh = matEuler(S.headTilt, 0, 0);
  const C = J.head;
  const Hp = (x, y, z) => add(C, matApply(Rh, [x * hs, y * hs, z * hs]));
  const hr = (r) => mul(r, hs);
  const tiltAxes = (extra = 0) => axesOf(matEuler(S.headTilt + extra, 0, 0));
  ell(Hp(0, 0.012, -0.012), hr([0.08, 0.093, 0.1]), 0.03, R.HEAD, tiltAxes());
  ell(Hp(0, -0.02, -0.05), hr([0.06, 0.06, 0.055]), 0.04, R.HEAD, tiltAxes());
  ell(Hp(0, 0.03, 0.055), hr([0.066, 0.045, 0.045]), 0.05, R.HEAD, tiltAxes());
  ell(Hp(0, 0.0, 0.086 + P.browProj), hr([0.058, 0.014, 0.018]), 0.018, R.FACE, tiltAxes());
  ell(Hp(0, -0.045 * fl, 0.05), hr([0.06, 0.055 * fl, 0.052]), 0.05, R.HEAD, tiltAxes());
  for (const s of [1, -1]) ell(Hp(s * 0.047 * P.cheek, -0.025, 0.063), hr([0.024, 0.017, 0.02]), 0.02, R.FACE, tiltAxes());
  const jawBack = (s) => Hp(s * P.jawWidth, -0.058 * fl, -0.012);
  const jawFront = (s) => Hp(s * 0.018 * P.chinWidth, -0.112 * fl, 0.07 + P.chinProj);
  for (const s of [1, -1]) cone(jawBack(s), jawFront(s), 0.022 * hs, 0.017 * hs, 0.03, R.FACE);
  ell(Hp(0, -0.118 * fl, 0.074 + P.chinProj), hr([0.022 * P.chinWidth, 0.018, 0.017]), 0.02, R.FACE, tiltAxes());
  cone(Hp(0, -0.005, 0.096), Hp(0, -0.043 * fl, 0.106 + P.noseProj), 0.007 * hs, 0.011 * hs, 0.012, R.FACE);
  ell(Hp(0, -0.046 * fl, 0.097 + P.noseProj * 0.5), hr([0.017, 0.008, 0.01]), 0.012, R.FACE, tiltAxes());
  ell(Hp(0, -0.073 * fl, 0.094), hr([0.023, 0.012, 0.012]), 0.01, R.FACE, tiltAxes());
  for (const s of [1, -1]) ell(Hp(s * 0.078, -0.018, -0.008), hr([0.009, 0.026, 0.017]), 0.01, R.HEAD, tiltAxes());
  // Cuencas de los ojos: resta suave y poco profunda (sin globos oculares de caricatura)
  for (const s of [1, -1]) ell(Hp(s * 0.031, -0.006, 0.098), hr([0.012, 0.007, 0.004]), 0.014, R.FACE, tiltAxes(), 's');

  // Cabello: casco recortado por la línea de nacimiento + volumen propio del estilo
  group = GROUP.HAIR;
  const hair = P.hair;
  const nl = norm([0, -1, 0.47]); // plano de nacimiento: más alto en la frente, más bajo en la nuca
  const nw = matApply(Rh, nl);
  const hlLocal = -(0.045 + hair.hairline - 0.47 * 0.09) * 0.905;
  const clip = { n: nw, h: hlLocal * hs + dot(nw, C) };
  ell(Hp(0, 0.012 + hair.top * 0.5, -0.012 - hair.back * 0.3), hr([0.077 + hair.sides, 0.093 + hair.top, 0.1 + (hair.front + hair.back) / 2]), 0.008, R.HAIR, tiltAxes(), 'u', clip);
  if (hair.style === 'short') {
    ell(Hp(0, 0.062, 0.07), hr([0.06, 0.02, 0.035]), 0.02, R.HAIR, tiltAxes(0.3));
  } else if (hair.style === 'topVolume') {
    // Volumen alto y rizado en la coronilla, laterales cortos
    // Cúpula de volumen alto con rizos que rompen el contorno (no una cima plana)
    const vol = hair.volume || 1;
    ell(Hp(0, 0.072 + 0.02 * (vol - 1), 0.005), hr([0.072 * (0.7 + 0.3 * vol), 0.052 * vol, 0.088 * (0.8 + 0.2 * vol)]), 0.035, R.HAIR, tiltAxes());
    const curls = [[0, 0.112, 0.015], [0.042, 0.095, -0.015], [-0.038, 0.098, -0.02], [0.034, 0.1, 0.055], [-0.036, 0.097, 0.05], [0.004, 0.1, -0.06], [-0.006, 0.096, 0.085]];
    for (const [x, y, z] of curls) ell(Hp(x * (0.8 + 0.2 * vol), y + 0.035 * (vol - 1), z), hr(mul([0.028, 0.024, 0.028], 0.8 + 0.2 * vol)), 0.018, R.HAIR, tiltAxes());
  } else if (hair.style === 'quiff') {
    // Laterales muy cortos y tupé ancho que se levanta hacia el frente
    const vol = hair.volume || 1;
    ell(Hp(0, 0.08 + 0.012 * (vol - 1), 0.035), hr([0.068, 0.024 * vol, 0.07]), 0.03, R.HAIR, tiltAxes(-0.35));
    ell(Hp(0, 0.092 + 0.02 * (vol - 1), 0.078 + 0.01 * (vol - 1)), hr([0.05, 0.02 * vol, 0.03 * vol]), 0.02, R.HAIR, tiltAxes(-0.6));
  }
  if (P.beard > 0) {
    const b = P.beard;
    // La barba envuelve la mandíbula (no cuelga): mismo trazo que el hueso con algo más de grosor
    for (const s of [1, -1]) cone(jawBack(s), jawFront(s), (0.022 + 0.006 * b) * hs, (0.017 + 0.007 * b) * hs, 0.015, R.HAIR);
    ell(Hp(0, -0.116 * fl, 0.075 + P.chinProj), hr([0.022 * P.chinWidth + 0.006 * b, 0.018 + 0.005 * b, 0.017 + 0.005 * b]), 0.015, R.HAIR, tiltAxes());
    if (b > 0.6) ell(Hp(0, -0.06 * fl, 0.098), hr([0.026, 0.007, 0.009]), 0.01, R.HAIR, tiltAxes());
  }

  // Límites para descartar primitivas lejanas al evaluar en JS
  for (const p of prims) {
    if (p.t === 'c') {
      p.ba = sub(p.b, p.a);
      p.l2 = dot(p.ba, p.ba);
      p.rr = p.r1 - p.r2;
      p.a2 = p.l2 - p.rr * p.rr;
      p.il2 = 1 / p.l2;
      p.bc = mix(p.a, p.b, 0.5);
      p.br = Math.sqrt(p.l2) / 2 + Math.max(p.r1, p.r2);
    } else {
      p.bc = p.c;
      p.br = Math.max(p.r[0], p.r[1], p.r[2]);
    }
  }

  const bones = BONE_DEFS.map(([name, h, tl, parent]) => ({ name, head: J[h], tail: J[tl], parent }));
  return { profile: P, joints: J, prims, bones };
}

// ---- Evaluación del campo de distancia (JS) ----
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
function smoothSub(s, d, k) {
  const h = Math.min(Math.max(0.5 - (0.5 * (d + s)) / k, 0), 1);
  return d + (-s - d) * h + k * h * (1 - h);
}
function primDistance(p, x, y, z) {
  if (p.t === 'c') {
    const pax = x - p.a[0]; const pay = y - p.a[1]; const paz = z - p.a[2];
    const [bax, bay, baz] = p.ba;
    const l2 = p.l2;
    const yy = pax * bax + pay * bay + paz * baz;
    const zz = yy - l2;
    const xvx = pax * l2 - bax * yy; const xvy = pay * l2 - bay * yy; const xvz = paz * l2 - baz * yy;
    const x2 = xvx * xvx + xvy * xvy + xvz * xvz;
    const y2 = yy * yy * l2;
    const z2 = zz * zz * l2;
    const k = Math.sign(p.rr) * p.rr * p.rr * x2;
    if (Math.sign(zz) * p.a2 * z2 > k) return Math.sqrt(x2 + z2) * p.il2 - p.r2;
    if (Math.sign(yy) * p.a2 * y2 < k) return Math.sqrt(x2 + y2) * p.il2 - p.r1;
    return (Math.sqrt(x2 * p.a2 * p.il2) + yy * p.rr) * p.il2 - p.r1;
  }
  const dx = x - p.c[0]; const dy = y - p.c[1]; const dz = z - p.c[2];
  const [ex, ey, ez] = p.ax;
  const lx = (dx * ex[0] + dy * ex[1] + dz * ex[2]) / p.r[0];
  const ly = (dx * ey[0] + dy * ey[1] + dz * ey[2]) / p.r[1];
  const lz = (dx * ez[0] + dy * ez[1] + dz * ez[2]) / p.r[2];
  const k0 = Math.hypot(lx, ly, lz);
  const k1 = Math.hypot(lx / p.r[0], ly / p.r[1], lz / p.r[2]);
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(p.r[0], p.r[1], p.r[2]);
}

const GROUP_COUNT = 7;

// Une los grupos: piernas a la pelvis (ingle), cabello a la cabeza, cabeza al cuello y brazos al torso (axila).
function joinGroups(g) {
  let d = g[GROUP.TORSO];
  d = smin(d, g[GROUP.LEG_L], JOIN.hip);
  d = smin(d, g[GROUP.LEG_R], JOIN.hip);
  d = smin(d, smin(g[GROUP.HEAD], g[GROUP.HAIR], JOIN.hair), JOIN.neck);
  d = smin(d, g[GROUP.ARM_L], JOIN.armpit);
  d = smin(d, g[GROUP.ARM_R], JOIN.armpit);
  return d;
}

export function characterDistance(ch, x, y, z) {
  const g = ch.groupScratch || (ch.groupScratch = new Float64Array(GROUP_COUNT));
  g.fill(1000);
  for (const p of ch.prims) {
    const cur = g[p.g];
    const bd = Math.hypot(x - p.bc[0], y - p.bc[1], z - p.bc[2]) - p.br;
    if (p.op === 's') {
      if (bd + cur > p.k) continue;
    } else if (bd - p.k > cur) {
      continue;
    }
    let e = primDistance(p, x, y, z);
    if (p.clip) e = Math.max(e, x * p.clip.n[0] + y * p.clip.n[1] + z * p.clip.n[2] - p.clip.h);
    g[p.g] = p.op === 's' ? smoothSub(e, cur, p.k) : smin(cur, e, p.k);
  }
  return joinGroups(g);
}

// ---- Compilación a GLSL (mismas primitivas, mismas fórmulas) ----
export const CHARACTER_GLSL_LIB = `
float opSmin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
float opSmoothSub(float s, float d, float k) { float h = clamp(0.5 - 0.5 * (d + s) / k, 0.0, 1.0); return mix(d, -s, h) + k * h * (1.0 - h); }
float sdEllipsoidR(vec3 q, vec3 ex, vec3 ey, vec3 ez, vec3 r) {
  vec3 l = vec3(dot(q, ex), dot(q, ey), dot(q, ez));
  float k0 = length(l / r);
  float k1 = length(l / (r * r));
  return k0 * (k0 - 1.0) / max(k1, 1e-6);
}
float sdRoundCone(vec3 p, vec3 a, vec3 b, float r1, float r2) {
  vec3 ba = b - a;
  float l2 = dot(ba, ba);
  float rr = r1 - r2;
  float a2 = l2 - rr * rr;
  float il2 = 1.0 / l2;
  vec3 pa = p - a;
  float y = dot(pa, ba);
  float z = y - l2;
  vec3 xv = pa * l2 - ba * y;
  float x2 = dot(xv, xv);
  float y2 = y * y * l2;
  float z2 = z * z * l2;
  float k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
`;

export function characterGLSL(ch, name) {
  const f = (v) => (Math.abs(v) < 1e-7 ? 0 : v).toFixed(5);
  const v3 = (a) => `vec3(${f(a[0])}, ${f(a[1])}, ${f(a[2])})`;
  const out = [`float ${name}(vec3 p) {`, '  float e;'];
  for (let i = 0; i < GROUP_COUNT; i++) out.push(`  float g${i} = 1000.0;`);
  for (const p of ch.prims) {
    out.push(p.t === 'c'
      ? `  e = sdRoundCone(p, ${v3(p.a)}, ${v3(p.b)}, ${f(p.r1)}, ${f(p.r2)});`
      : `  e = sdEllipsoidR(p - ${v3(p.c)}, ${v3(p.ax[0])}, ${v3(p.ax[1])}, ${v3(p.ax[2])}, ${v3(p.r)});`);
    if (p.clip) out.push(`  e = max(e, dot(p, ${v3(p.clip.n)}) - ${f(p.clip.h)});`);
    out.push(p.op === 's' ? `  g${p.g} = opSmoothSub(e, g${p.g}, ${f(p.k)});` : `  g${p.g} = opSmin(g${p.g}, e, ${f(p.k)});`);
  }
  const G = GROUP;
  out.push(
    `  float d = g${G.TORSO};`,
    `  d = opSmin(d, g${G.LEG_L}, ${f(JOIN.hip)});`,
    `  d = opSmin(d, g${G.LEG_R}, ${f(JOIN.hip)});`,
    `  d = opSmin(d, opSmin(g${G.HEAD}, g${G.HAIR}, ${f(JOIN.hair)}), ${f(JOIN.neck)});`,
    `  d = opSmin(d, g${G.ARM_L}, ${f(JOIN.armpit)});`,
    `  d = opSmin(d, g${G.ARM_R}, ${f(JOIN.armpit)});`,
    '  return d;',
    '}',
  );
  return out.join('\n');
}

// ---- Muestreo de superficie ----
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function primArea(p) {
  if (p.t === 'c') {
    const l = Math.sqrt(p.l2);
    return Math.PI * (p.r1 + p.r2) * l + 2 * Math.PI * (p.r1 * p.r1 + p.r2 * p.r2);
  }
  const [a, b, c] = p.r;
  return 4 * Math.PI * Math.pow((Math.pow(a * b, 1.6) + Math.pow(a * c, 1.6) + Math.pow(b * c, 1.6)) / 3, 1 / 1.6);
}

function primSurfacePoint(p, rnd) {
  const g = () => {
    let x; let y; let z; let l;
    do { x = rnd() * 2 - 1; y = rnd() * 2 - 1; z = rnd() * 2 - 1; l = x * x + y * y + z * z; } while (l > 1 || l < 1e-4);
    l = Math.sqrt(l);
    return [x / l, y / l, z / l];
  };
  if (p.t === 'e') {
    const u = g();
    const [ex, ey, ez] = p.ax;
    const lx = u[0] * p.r[0]; const ly = u[1] * p.r[1]; const lz = u[2] * p.r[2];
    return [p.c[0] + ex[0] * lx + ey[0] * ly + ez[0] * lz, p.c[1] + ex[1] * lx + ey[1] * ly + ez[1] * lz, p.c[2] + ex[2] * lx + ey[2] * ly + ez[2] * lz];
  }
  const t = rnd();
  const axis = norm(p.ba);
  const [e1, , e2] = axesAlong(axis, Math.abs(axis[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1]);
  const ang = rnd() * Math.PI * 2;
  const r = p.r1 + (p.r2 - p.r1) * t;
  const c = add(p.a, mul(p.ba, t));
  return add(c, add(mul(e1, Math.cos(ang) * r), mul(e2, Math.sin(ang) * r)));
}

// Gradiente sin normalizar: las mezclas amplias no son distancias exactas (|∇f| ≠ 1)
function gradient(ch, x, y, z) {
  const e = 0.0012;
  const gx = characterDistance(ch, x + e, y, z) - characterDistance(ch, x - e, y, z);
  const gy = characterDistance(ch, x, y + e, z) - characterDistance(ch, x, y - e, z);
  const gz = characterDistance(ch, x, y, z + e) - characterDistance(ch, x, y, z - e);
  return [gx / (2 * e), gy / (2 * e), gz / (2 * e)];
}

function segmentDistance(p, a, b) {
  const ab = sub(b, a);
  const t = Math.min(Math.max(dot(sub(p, a), ab) / (dot(ab, ab) || 1), 0), 1);
  return len(sub(p, add(a, mul(ab, t))));
}

// Zonas de color del uniforme (solo colores de selección: sin escudos, marcas ni patrocinadores)
export const ZONE = { SKIN: 0, HAIR: 1, SHIRT: 2, STRIPE: 3, SHORTS: 4, SOCKS: 5, BOOTS: 6 };

function boneT(bone, q) {
  const ab = sub(bone.tail, bone.head);
  return Math.min(Math.max(dot(sub(q, bone.head), ab) / (dot(ab, ab) || 1), 0), 1);
}

function clothingZone(ch, q, reg, boneIndex) {
  const R = REGION;
  const J = ch.joints;
  const bone = ch.bones[boneIndex];
  if (reg === R.HAIR) return ZONE.HAIR;
  if (reg === R.HEAD || reg === R.FACE || reg === R.HAND) return ZONE.SKIN;
  if (reg === R.FOOT) return ZONE.BOOTS;
  if (reg === R.NECK) return q[1] < J.neck[1] + 0.015 ? ZONE.SHIRT : ZONE.SKIN;
  if (reg === R.TORSO) {
    if (q[1] < J.hipL[1] + 0.07) return ZONE.SHORTS;
    return Math.floor((q[0] + 1) / 0.055) % 2 ? ZONE.STRIPE : ZONE.SHIRT;
  }
  if (reg === R.ARM) {
    if (bone.name.startsWith('upperArm')) return boneT(bone, q) < 0.42 ? ZONE.SHIRT : ZONE.SKIN;
    return bone.name === 'chest' ? ZONE.SHIRT : ZONE.SKIN;
  }
  if (bone.name.startsWith('thigh')) return boneT(bone, q) < 0.55 ? ZONE.SHORTS : ZONE.SKIN;
  if (bone.name.startsWith('shin')) return boneT(bone, q) > 0.22 ? ZONE.SOCKS : ZONE.SKIN;
  if (bone.name === 'pelvis') return ZONE.SHORTS;
  return ZONE.BOOTS;
}

// Gestos icónicos como rotaciones de huesos (interpretaciones originales, no copias de un video).
// Ángulos [rx, ry, rz] relativos al reposo: rx > 0 lleva la extremidad hacia atrás, rz > 0 abre el lado izquierdo.
export const SIGNATURE_POSES = {
  // Señala al cielo con ambos índices y mira hacia arriba
  messi: {
    upperArmL: [-0.12, 0, 2.72], upperArmR: [-0.12, 0, -2.72],
    forearmL: [-0.2, 0, 0.12], forearmR: [-0.2, 0, -0.12],
    chest: [-0.1, 0, 0], neck: [-0.15, 0, 0], head: [-0.35, 0, 0],
  },
  // Brazos abiertos, peso en una pierna, cabeza ladeada
  neymar: {
    pelvis: [0, 0.1, 0.06], chest: [0.05, -0.2, -0.05], head: [0.05, 0.25, 0.2],
    upperArmL: [-0.3, 0, 1.3], upperArmR: [-0.3, 0, -1.3],
    forearmL: [-0.5, 0, 0.2], forearmR: [-0.5, 0, -0.2],
    thighL: [-0.25, 0, 0.12], shinL: [0.45, 0, 0], thighR: [0.05, 0, -0.06],
  },
  // Aterrizaje de celebración: piernas muy abiertas, rodillas flexionadas, brazos atrás, pecho fuera
  cristiano: {
    thighL: [-0.3, 0, 0.45], thighR: [-0.3, 0, -0.45],
    shinL: [0.5, 0, -0.1], shinR: [0.5, 0, 0.1], footL: [-0.25, 0, 0], footR: [-0.25, 0, 0],
    upperArmL: [0.45, 0, 0.8], upperArmR: [0.45, 0, -0.8],
    forearmL: [0.1, 0, 0.25], forearmR: [0.1, 0, -0.25],
    spine: [-0.08, 0, 0], chest: [-0.18, 0, 0], head: [-0.25, 0, 0],
  },
};

// Huesos candidatos por región, para que un punto del brazo no quede pegado al torso.
function boneCandidates(region, left) {
  const R = REGION;
  if (region === R.HEAD || region === R.FACE || region === R.HAIR) return [4];
  if (region === R.NECK) return [2, 3, 4];
  // El torso nunca sigue al brazo: al levantarlo arrastraría pecho y dorsales (efecto capa).
  // La transición del hombro la dan los puntos del deltoides (región ARM), que mezclan pecho y brazo.
  if (region === R.TORSO) return [0, 1, 2, 3];
  if (region === R.ARM || region === R.HAND) return left ? [2, 5, 6, 7] : [2, 8, 9, 10];
  return left ? [0, 11, 12, 13] : [0, 14, 15, 16];
}

// Nube de puntos sobre la superficie: posición, normal, región y dos huesos con peso (skinning).
export function sampleCharacter(ch, count, seed = 1) {
  const rnd = mulberry32(seed);
  const usable = ch.prims.filter((p) => p.op === 'u');
  const cumulative = [];
  let total = 0;
  for (const p of usable) {
    total += primArea(p) * DENSITY[p.reg];
    cumulative.push(total);
  }
  const cloud = {
    count: 0,
    x: new Float32Array(count), y: new Float32Array(count), z: new Float32Array(count),
    nx: new Float32Array(count), ny: new Float32Array(count), nz: new Float32Array(count),
    region: new Uint8Array(count), zone: new Uint8Array(count), b0: new Uint8Array(count), b1: new Uint8Array(count), w0: new Float32Array(count),
  };
  let n = 0;
  let tries = 0;
  while (n < count && tries < count * 14) {
    tries++;
    const r = rnd() * total;
    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < r) lo = mid + 1; else hi = mid;
    }
    const prim = usable[lo];
    let q = primSurfacePoint(prim, rnd);
    // Enterrado dentro de otra parte. La unión suave abulta la superficie hasta k/4 (~3 cm) por fuera
    // de cada volumen, así que un umbral menor descartaría justo las zonas de mezcla (pecho, cuello, rodilla).
    if (characterDistance(ch, q[0], q[1], q[2]) < -0.032) continue;
    // Proyección de Newton sobre la superficie f = 0
    for (let it = 0; it < 8; it++) {
      const d = characterDistance(ch, q[0], q[1], q[2]);
      if (Math.abs(d) < 2e-4) break;
      const gr = gradient(ch, q[0], q[1], q[2]);
      const g2 = dot(gr, gr);
      if (g2 < 1e-8) break;
      q = sub(q, mul(gr, d / g2));
    }
    if (Math.abs(characterDistance(ch, q[0], q[1], q[2])) > 0.0015) continue;
    const g = norm(gradient(ch, q[0], q[1], q[2]));
    const candidates = boneCandidates(prim.reg, q[0] >= ch.joints.pelvis[0]);
    let best0 = candidates[0];
    let best1 = candidates[0];
    let d0 = Infinity;
    let d1 = Infinity;
    for (const b of candidates) {
      const bone = ch.bones[b];
      const d = segmentDistance(q, bone.head, bone.tail);
      if (d < d0) { best1 = best0; d1 = d0; best0 = b; d0 = d; } else if (d < d1) { best1 = b; d1 = d; }
    }
    cloud.x[n] = q[0]; cloud.y[n] = q[1]; cloud.z[n] = q[2];
    cloud.nx[n] = g[0]; cloud.ny[n] = g[1]; cloud.nz[n] = g[2];
    cloud.region[n] = prim.reg;
    cloud.b0[n] = best0;
    cloud.b1[n] = best1;
    // Pesos definidos: con rotaciones extremas (brazo arriba) una mezcla amplia deja puntos a medio camino, fuera del cuerpo
    cloud.w0[n] = d1 === Infinity ? 1 : 1 / (1 + Math.pow(d0 / Math.max(d1, 1e-5), 10));
    cloud.zone[n] = clothingZone(ch, q, prim.reg, best0);
    n++;
  }
  cloud.count = n;
  return cloud;
}

// ---- Pose (cinemática directa) y skinning ----
export function createPose(ch) {
  return { rot: new Float32Array(ch.bones.length * 9), head: new Float32Array(ch.bones.length * 3) };
}

// angles: { nombreHueso: [rx, ry, rz] } en radianes, relativos a la pose de reposo. root: desplazamiento de la pelvis.
export function solvePose(ch, angles, pose, root = [0, 0, 0]) {
  const tmp = new Array(9);
  for (let i = 0; i < ch.bones.length; i++) {
    const b = ch.bones[i];
    const a = angles[b.name];
    const L = a ? matEuler(a[0], a[1], a[2]) : [1, 0, 0, 0, 1, 0, 0, 0, 1];
    if (b.parent < 0) {
      for (let k = 0; k < 9; k++) pose.rot[k] = L[k];
      pose.head[0] = b.head[0] + root[0]; pose.head[1] = b.head[1] + root[1]; pose.head[2] = b.head[2] + root[2];
      continue;
    }
    const pr = b.parent * 9;
    const PR = Array.from(pose.rot.subarray(pr, pr + 9));
    matMul(PR, L, tmp);
    for (let k = 0; k < 9; k++) pose.rot[i * 9 + k] = tmp[k];
    const parent = ch.bones[b.parent];
    const off = matApply(PR, sub(b.head, parent.head));
    const ph = b.parent * 3;
    pose.head[i * 3] = pose.head[ph] + off[0];
    pose.head[i * 3 + 1] = pose.head[ph + 1] + off[1];
    pose.head[i * 3 + 2] = pose.head[ph + 2] + off[2];
  }
  return pose;
}

export function skinPoints(ch, cloud, pose, ox, oy, oz, onx, ony, onz) {
  const { rot, head } = pose;
  const bh = ch.bones.map((b) => b.head);
  for (let i = 0; i < cloud.count; i++) {
    const x = cloud.x[i]; const y = cloud.y[i]; const z = cloud.z[i];
    let px = 0; let py = 0; let pz = 0; let qx = 0; let qy = 0; let qz = 0;
    for (let s = 0; s < 2; s++) {
      const b = s === 0 ? cloud.b0[i] : cloud.b1[i];
      const w = s === 0 ? cloud.w0[i] : 1 - cloud.w0[i];
      if (w <= 0) continue;
      const r = b * 9;
      const rx = x - bh[b][0]; const ry = y - bh[b][1]; const rz = z - bh[b][2];
      px += w * (head[b * 3] + rot[r] * rx + rot[r + 1] * ry + rot[r + 2] * rz);
      py += w * (head[b * 3 + 1] + rot[r + 3] * rx + rot[r + 4] * ry + rot[r + 5] * rz);
      pz += w * (head[b * 3 + 2] + rot[r + 6] * rx + rot[r + 7] * ry + rot[r + 8] * rz);
      if (onx) {
        const nx = cloud.nx[i]; const ny = cloud.ny[i]; const nz = cloud.nz[i];
        qx += w * (rot[r] * nx + rot[r + 1] * ny + rot[r + 2] * nz);
        qy += w * (rot[r + 3] * nx + rot[r + 4] * ny + rot[r + 5] * nz);
        qz += w * (rot[r + 6] * nx + rot[r + 7] * ny + rot[r + 8] * nz);
      }
    }
    ox[i] = px; oy[i] = py; oz[i] = pz;
    if (onx) { onx[i] = qx; ony[i] = qy; onz[i] = qz; }
  }
}
