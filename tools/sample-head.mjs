// Muestreo de superficie de un GLB → nube de puntos para las experiencias de partículas.
//
// Se ejecuta UNA vez (no en el navegador): lee los triángulos reales del modelo y reparte
// puntos sobre ellos con probabilidad proporcional al área, de modo que la densidad sea
// uniforme sobre la superficie. Equivale a MeshSurfaceSampler de Three.js, pero sin obligar
// al sitio a cargar Three.js ni a parsear 2,4 MB de GLB en cada visita.
//
//   node tools/sample-head.mjs assets/football/parts/head-tripo.glb assets/football/head-points.bin 36000
//
// Formato de salida (binario, little-endian):
//   "VCPT" | uint16 versión | uint16 reservado | uint32 nPuntos | float32 alto original
//   luego, por punto: int16 x, y, z (÷32767, caja normalizada a alto 1) + int8 nx, ny, nz (÷127)
//
// El modelo NO se modifica: solo se lee.

import fs from 'node:fs';

const [, , entrada, salida, cantidadArg] = process.argv;
if (!entrada || !salida) {
  console.error('uso: node tools/sample-head.mjs <modelo.glb> <salida.bin> [nPuntos]');
  process.exit(1);
}
const N = Number(cantidadArg || 36000);

// ---------- Lectura del GLB ----------
const buf = fs.readFileSync(entrada);
if (buf.toString('utf8', 0, 4) !== 'glTF') throw new Error('No es un GLB');
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
const binHeader = 20 + jsonLen;
const binLen = buf.readUInt32LE(binHeader);
const bin = buf.subarray(binHeader + 8, binHeader + 8 + binLen);

const TIPOS = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
const COMPONENTES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function leerAccessor(indice) {
  const acc = gltf.accessors[indice];
  const vista = gltf.bufferViews[acc.bufferView];
  const [Tipo, bytes] = TIPOS[acc.componentType];
  const n = COMPONENTES[acc.type];
  const base = (vista.byteOffset || 0) + (acc.byteOffset || 0);
  const stride = vista.byteStride || bytes * n;
  const salida = new Float32Array(acc.count * n);
  for (let i = 0; i < acc.count; i++) {
    const inicio = base + i * stride;
    const trozo = new Tipo(bin.buffer, bin.byteOffset + inicio, n);
    for (let c = 0; c < n; c++) salida[i * n + c] = trozo[c];
  }
  return { datos: salida, n, count: acc.count };
}

// ---------- Triángulos de todas las primitivas ----------
const posiciones = [];
const normales = [];
const triangulos = [];
let desplazamiento = 0;
for (const malla of gltf.meshes) {
  for (const prim of malla.primitives) {
    if (prim.mode !== undefined && prim.mode !== 4) continue; // solo triángulos
    const pos = leerAccessor(prim.attributes.POSITION);
    const nor = prim.attributes.NORMAL !== undefined ? leerAccessor(prim.attributes.NORMAL) : null;
    for (let i = 0; i < pos.count; i++) {
      posiciones.push(pos.datos[i * 3], pos.datos[i * 3 + 1], pos.datos[i * 3 + 2]);
      if (nor) normales.push(nor.datos[i * 3], nor.datos[i * 3 + 1], nor.datos[i * 3 + 2]);
      else normales.push(0, 0, 0);
    }
    const idx = prim.indices !== undefined ? leerAccessor(prim.indices).datos : null;
    const total = idx ? idx.length : pos.count;
    for (let i = 0; i < total; i += 3) {
      triangulos.push(
        desplazamiento + (idx ? idx[i] : i),
        desplazamiento + (idx ? idx[i + 1] : i + 1),
        desplazamiento + (idx ? idx[i + 2] : i + 2),
      );
    }
    desplazamiento += pos.count;
  }
}
const nTri = triangulos.length / 3;
if (!nTri) throw new Error('El modelo no tiene triángulos');

// ---------- Caja y normalización (alto = 1, centrado en X/Z, base en y = 0) ----------
const lo = [Infinity, Infinity, Infinity];
const hi = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < posiciones.length; i += 3) {
  for (let c = 0; c < 3; c++) {
    lo[c] = Math.min(lo[c], posiciones[i + c]);
    hi[c] = Math.max(hi[c], posiciones[i + c]);
  }
}
const alto = hi[1] - lo[1];
const escala = 1 / alto;
const centro = [(lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2];

// ---------- Áreas y suma acumulada ----------
// El reparto es proporcional al área, con un sesgo hacia la cara. Motivo medido: con reparto
// uniforme solo ~12% de los puntos miran a la cámara en cada instante y el rostro acaba
// dibujado por ~1.000 puntos, mientras 20.000 se gastan en la nuca, que además aporta velo.
// Como la cámara solo orbita unos grados, el hemisferio visible apenas cambia y este sesgo
// se puede calcular una vez, sin coste en ejecución. FRENTE = 0 lo desactiva.
const FRENTE = Number(process.env.SESGO_FRENTE ?? 2.2);
const acumulado = new Float64Array(nTri);
let total = 0;
let areaTotal = 0;
for (let t = 0; t < nTri; t++) {
  const a = triangulos[t * 3] * 3;
  const b = triangulos[t * 3 + 1] * 3;
  const c = triangulos[t * 3 + 2] * 3;
  const abx = posiciones[b] - posiciones[a];
  const aby = posiciones[b + 1] - posiciones[a + 1];
  const abz = posiciones[b + 2] - posiciones[a + 2];
  const acx = posiciones[c] - posiciones[a];
  const acy = posiciones[c + 1] - posiciones[a + 1];
  const acz = posiciones[c + 2] - posiciones[a + 2];
  const cx = aby * acz - abz * acy;
  const cy = abz * acx - abx * acz;
  const cz = abx * acy - aby * acx;
  const area = 0.5 * Math.hypot(cx, cy, cz);
  areaTotal += area;
  // El modelo mira hacia +Z (convención Y-up de glTF): cz > 0 es superficie de la cara.
  const largoN = Math.hypot(cx, cy, cz) || 1;
  const mirandoAlFrente = Math.max(0, cz / largoN);
  total += area * (1 + FRENTE * mirandoAlFrente * mirandoAlFrente);
  acumulado[t] = total;
}

// Generador reproducible: el mismo GLB da siempre la misma nube.
let semilla = 0x9e3779b9;
function aleatorio() {
  semilla ^= semilla << 13; semilla >>>= 0;
  semilla ^= semilla >> 17;
  semilla ^= semilla << 5; semilla >>>= 0;
  return semilla / 4294967296;
}

// ---------- Muestreo ----------
const pos16 = new Int16Array(N * 3);
const nor8 = new Int8Array(N * 3);
for (let p = 0; p < N; p++) {
  const objetivo = aleatorio() * total;
  let bajo = 0;
  let alto2 = nTri - 1;
  while (bajo < alto2) {
    const medio = (bajo + alto2) >> 1;
    if (acumulado[medio] < objetivo) bajo = medio + 1;
    else alto2 = medio;
  }
  const a = triangulos[bajo * 3] * 3;
  const b = triangulos[bajo * 3 + 1] * 3;
  const c = triangulos[bajo * 3 + 2] * 3;
  let u = aleatorio();
  let v = aleatorio();
  if (u + v > 1) { u = 1 - u; v = 1 - v; }
  const w = 1 - u - v;
  for (let k = 0; k < 3; k++) {
    const valor = (posiciones[a + k] * w + posiciones[b + k] * v + posiciones[c + k] * u - centro[k]) * escala;
    pos16[p * 3 + k] = Math.max(-32767, Math.min(32767, Math.round(valor * 32767)));
  }
  let nx = normales[a] * w + normales[b] * v + normales[c] * u;
  let ny = normales[a + 1] * w + normales[b + 1] * v + normales[c + 1] * u;
  let nz = normales[a + 2] * w + normales[b + 2] * v + normales[c + 2] * u;
  const largo = Math.hypot(nx, ny, nz) || 1;
  nor8[p * 3] = Math.round((nx / largo) * 127);
  nor8[p * 3 + 1] = Math.round((ny / largo) * 127);
  nor8[p * 3 + 2] = Math.round((nz / largo) * 127);
}

// ---------- Escritura ----------
const cabecera = Buffer.alloc(16);
cabecera.write('VCPT', 0, 'ascii');
cabecera.writeUInt16LE(1, 4);
cabecera.writeUInt16LE(0, 6);
cabecera.writeUInt32LE(N, 8);
cabecera.writeFloatLE(alto, 12);
fs.writeFileSync(salida, Buffer.concat([cabecera, Buffer.from(pos16.buffer), Buffer.from(nor8.buffer)]));

console.log(JSON.stringify({
  entrada, salida,
  triangulos: nTri,
  vertices: posiciones.length / 3,
  puntos: N,
  sesgo_hacia_la_cara: FRENTE,
  area_total: +areaTotal.toFixed(4),
  peso_total: +total.toFixed(4),
  caja_original: { min: lo.map(v => +v.toFixed(3)), max: hi.map(v => +v.toFixed(3)) },
  alto_original: +alto.toFixed(4),
  normalizado: 'alto = 1, centrado en X/Z, base en y = 0',
  bytes: fs.statSync(salida).size,
}, null, 1));
