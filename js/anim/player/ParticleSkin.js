import * as THREE from 'three';

// PARTICLE RENDERER (núcleo): partículas derivadas de la superficie real de uno o varios SkinnedMesh.
// Cada partícula guarda un triángulo (a, b, c) y coordenadas baricéntricas.
// Cada cuadro se skinean en CPU solo los vértices que usan las partículas activas, con los
// mismos 4 pesos y matrices de hueso que usa la GPU, y se interpola dentro del triángulo:
// la partícula queda exactamente sobre la superficie deformada, también en articulaciones.
//
// Esta capa NO sabe nada de identidad: recibe mallas y reglas ya resueltas.

// Densidad relativa según el hueso dominante del triángulo.
export const REGION_RULES = [
  { name: 'hands', re: /hand|thumb|index|middle|ring|pinky/i, density: 4.0, tone: 0.75 },
  { name: 'head', re: /head|eye/i, density: 3.2, tone: 0.8 },
  { name: 'neck', re: /neck/i, density: 2.0, tone: 0.55 },
  { name: 'feet', re: /foot|toe/i, density: 2.8, tone: 0.65 },
  { name: 'torso', re: /spine/i, density: 1.7, tone: 0.4 },
];
export const DEFAULT_REGION = { name: 'other', density: 1.0, tone: 0.2 };

// Ajustes por malla: los globos oculares quedan dentro del cráneo y con mezcla aditiva
// se verían a través de la cara.
export const MESH_RULES = [
  { name: 'eyelashes', re: /eyelash/i, density: 0.5 },
  { name: 'eyes', re: /eye/i, density: 0.12 },
  { name: 'hair', re: /hair/i, density: 0.8 },
];

// La piel cubierta por ropa, cabello o zapatos recibe pocas partículas: evita una doble capa.
const SKIN_MESH = /body/i;
const NON_COVER_MESH = /eye/i;

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uScale;
  uniform float uJitter;
  uniform float uTwinkle;
  attribute float aSeed;
  attribute float aTone;
  attribute float aSize;
  varying float vTone;
  varying float vDepth;
  void main() {
    vec3 p = position;
    p += uJitter * vec3(
      sin(uTime * 1.7 + aSeed * 40.0),
      sin(uTime * 2.3 + aSeed * 73.0),
      sin(uTime * 1.9 + aSeed * 19.0)
    );
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float twinkle = 1.0 - uTwinkle * 0.2 * (0.5 + 0.5 * sin(uTime * 3.0 + aSeed * 100.0));
    gl_PointSize = max(1.0, uSize * aSize * twinkle * uScale / -mv.z);
    vTone = aTone;
    vDepth = -mv.z;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uGlow;
  uniform vec3 uCore;
  uniform float uOpacity;
  uniform float uFadeNear;
  uniform float uFadeFar;
  varying float vTone;
  varying float vDepth;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = smoothstep(0.45, 0.0, d);
    float halo = pow(1.0 - d, 2.0) * 0.35;
    float depthFade = mix(1.0, 0.35, smoothstep(uFadeNear, uFadeFar, vDepth));
    vec3 color = mix(uGlow, uCore, vTone);
    gl_FragColor = vec4(color, (core + halo) * uOpacity * depthFade);
  }
`;

function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function findRule(rules, name, fallback) {
  for (const rule of rules) if (rule.re.test(name)) return rule;
  return fallback;
}

export class ParticleSkin {
  constructor(skinnedMeshes, {
    maxCount = 15000,
    seed = 7,
    regionRules = REGION_RULES,
    meshRules = MESH_RULES,
    coveredFactor = 0.1,
    colors = { glow: 0x22e4ff, core: 0xf2fdff },
  } = {}) {
    this.meshes = skinnedMeshes;
    this.maxCount = maxCount;
    this.regionRules = regionRules;
    this.meshRules = meshRules;
    this.coveredFactor = coveredFactor;
    this.skeletons = [...new Set(skinnedMeshes.map((m) => m.skeleton))];
    this.meshTransforms = skinnedMeshes.map(() => new THREE.Matrix4());
    this._tmp = new THREE.Vector3();
    // Las posiciones se calculan en espacio de mundo. Si el objeto de puntos cuelga de un
    // padre con transformación propia, hay que entregarlas en el espacio de ese padre o se
    // aplicaría dos veces: una aquí y otra al dibujar.
    this.reference = null;
    this._refInverse = new THREE.Matrix4();
    this._buildVertexTable();
    this._sample(mulberry32(seed));
    this._buildPoints(colors);
    this.setCount(maxCount);
  }

  _buildVertexTable() {
    this.offsets = [];
    let total = 0;
    for (const mesh of this.meshes) {
      this.offsets.push(total);
      total += mesh.geometry.attributes.position.count;
    }
    this.vertexCount = total;
    this.rest = new Float32Array(total * 3); // bindMatrix · posición original
    this.skinIndex = new Uint16Array(total * 4);
    this.skinWeight = new Float32Array(total * 4);
    this.meshOf = new Uint8Array(total);
    this.skinned = new Float32Array(total * 3);

    const v = this._tmp;
    this.meshes.forEach((mesh, mi) => {
      const { position, skinIndex, skinWeight } = mesh.geometry.attributes;
      const offset = this.offsets[mi];
      for (let i = 0; i < position.count; i++) {
        const g = offset + i;
        v.fromBufferAttribute(position, i).applyMatrix4(mesh.bindMatrix);
        this.rest[g * 3] = v.x;
        this.rest[g * 3 + 1] = v.y;
        this.rest[g * 3 + 2] = v.z;
        for (let k = 0; k < 4; k++) {
          this.skinIndex[g * 4 + k] = skinIndex.getComponent(i, k);
          this.skinWeight[g * 4 + k] = skinWeight.getComponent(i, k);
        }
        this.meshOf[g] = mi;
      }
    });
  }

  _coverTest(height) {
    const radius = height * 0.04;
    const cells = new Map();
    const key = (x, y, z) => `${x},${y},${z}`;
    this.meshes.forEach((mesh, mi) => {
      if (SKIN_MESH.test(mesh.name) || NON_COVER_MESH.test(mesh.name)) return;
      const start = this.offsets[mi];
      const end = start + mesh.geometry.attributes.position.count;
      for (let g = start; g < end; g++) {
        const k = key(
          Math.floor(this.rest[g * 3] / radius),
          Math.floor(this.rest[g * 3 + 1] / radius),
          Math.floor(this.rest[g * 3 + 2] / radius),
        );
        let list = cells.get(k);
        if (!list) cells.set(k, (list = []));
        list.push(g);
      }
    });
    const r2 = radius * radius;
    return (x, y, z) => {
      const cx = Math.floor(x / radius);
      const cy = Math.floor(y / radius);
      const cz = Math.floor(z / radius);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const list = cells.get(key(cx + dx, cy + dy, cz + dz));
            if (!list) continue;
            for (const g of list) {
              const ex = this.rest[g * 3] - x;
              const ey = this.rest[g * 3 + 1] - y;
              const ez = this.rest[g * 3 + 2] - z;
              if (ex * ex + ey * ey + ez * ez < r2) return true;
            }
          }
        }
      }
      return false;
    };
  }

  _sample(rand) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (let g = 0; g < this.vertexCount; g++) {
      const y = this.rest[g * 3 + 1];
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const isCovered = this._coverTest(maxY - minY);

    let triCount = 0;
    for (const mesh of this.meshes) {
      const geo = mesh.geometry;
      triCount += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
    }
    const triA = new Uint32Array(triCount);
    const triB = new Uint32Array(triCount);
    const triC = new Uint32Array(triCount);
    const triTone = new Float32Array(triCount);
    const cdf = new Float64Array(triCount);

    const R = this.rest;
    const W = this.skinWeight;
    const I = this.skinIndex;
    let t = 0;
    let sum = 0;
    const boneIds = new Int32Array(12);
    const boneSums = new Float32Array(12);

    this.meshes.forEach((mesh, mi) => {
      const geo = mesh.geometry;
      const offset = this.offsets[mi];
      const meshDensity = findRule(this.meshRules, mesh.name, { density: 1 }).density;
      const isSkin = SKIN_MESH.test(mesh.name);
      const regions = mesh.skeleton.bones.map((bone) => findRule(this.regionRules, bone.name, DEFAULT_REGION));
      const n = geo.index ? geo.index.count : geo.attributes.position.count;

      for (let i = 0; i < n; i += 3) {
        const a = offset + (geo.index ? geo.index.getX(i) : i);
        const b = offset + (geo.index ? geo.index.getX(i + 1) : i + 1);
        const c = offset + (geo.index ? geo.index.getX(i + 2) : i + 2);

        const abx = R[b * 3] - R[a * 3], aby = R[b * 3 + 1] - R[a * 3 + 1], abz = R[b * 3 + 2] - R[a * 3 + 2];
        const acx = R[c * 3] - R[a * 3], acy = R[c * 3 + 1] - R[a * 3 + 1], acz = R[c * 3 + 2] - R[a * 3 + 2];
        const cx = aby * acz - abz * acy;
        const cy = abz * acx - abx * acz;
        const cz = abx * acy - aby * acx;
        const area = 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);

        // Hueso dominante: mayor suma de pesos entre los tres vértices
        let used = 0;
        for (const vtx of [a, b, c]) {
          for (let k = 0; k < 4; k++) {
            const w = W[vtx * 4 + k];
            if (w === 0) continue;
            const id = I[vtx * 4 + k];
            let j = 0;
            while (j < used && boneIds[j] !== id) j++;
            if (j === used) {
              boneIds[used] = id;
              boneSums[used++] = 0;
            }
            boneSums[j] += w;
          }
        }
        let best = 0;
        for (let j = 1; j < used; j++) if (boneSums[j] > boneSums[best]) best = j;
        const region = used ? regions[boneIds[best]] : DEFAULT_REGION;

        let weight = area * region.density * meshDensity;
        if (isSkin) {
          const mx = (R[a * 3] + R[b * 3] + R[c * 3]) / 3;
          const my = (R[a * 3 + 1] + R[b * 3 + 1] + R[c * 3 + 1]) / 3;
          const mz = (R[a * 3 + 2] + R[b * 3 + 2] + R[c * 3 + 2]) / 3;
          if (isCovered(mx, my, mz)) weight *= this.coveredFactor;
        }

        triA[t] = a;
        triB[t] = b;
        triC[t] = c;
        triTone[t] = region.tone;
        sum += weight;
        cdf[t++] = sum;
      }
    });

    const N = this.maxCount;
    this.pa = new Uint32Array(N);
    this.pb = new Uint32Array(N);
    this.pc = new Uint32Array(N);
    this.bary = new Float32Array(N * 3);
    this.seeds = new Float32Array(N);
    this.tones = new Float32Array(N);
    this.sizes = new Float32Array(N);

    for (let p = 0; p < N; p++) {
      const target = rand() * sum;
      let lo = 0;
      let hi = t - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cdf[mid] < target) lo = mid + 1;
        else hi = mid;
      }
      let u = rand();
      let w = rand();
      if (u + w > 1) {
        u = 1 - u;
        w = 1 - w;
      }
      this.pa[p] = triA[lo];
      this.pb[p] = triB[lo];
      this.pc[p] = triC[lo];
      this.bary[p * 3] = 1 - u - w;
      this.bary[p * 3 + 1] = u;
      this.bary[p * 3 + 2] = w;
      this.seeds[p] = rand();
      this.tones[p] = Math.min(1, Math.max(0, triTone[lo] + (rand() - 0.5) * 0.5));
      this.sizes[p] = 0.6 + rand() * 0.8;
    }
  }

  _buildPoints(colors) {
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.maxCount * 3);
    const position = new THREE.BufferAttribute(this.positions, 3);
    position.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', position);
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(this.seeds, 1));
    geometry.setAttribute('aTone', new THREE.BufferAttribute(this.tones, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 0.02 },
        uScale: { value: 500 },
        uJitter: { value: 0 },
        uTwinkle: { value: 1 },
        uOpacity: { value: 1 },
        uFadeNear: { value: 2 },
        uFadeFar: { value: 12 },
        uGlow: { value: new THREE.Color(colors.glow) },
        uCore: { value: new THREE.Color(colors.core) },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
  }

  // Padre bajo el que se va a dibujar la nube (null = directamente en la escena).
  setReference(object3D) {
    this.reference = object3D || null;
    return this;
  }

  setColors({ glow, core }) {
    if (glow !== undefined) this.material.uniforms.uGlow.value.set(glow);
    if (core !== undefined) this.material.uniforms.uCore.value.set(core);
  }

  // Cambia cuántas partículas se muestran y recalcula qué vértices hay que skinear.
  setCount(n) {
    const count = Math.max(1, Math.min(this.maxCount, Math.round(n)));
    const used = new Uint8Array(this.vertexCount);
    for (let p = 0; p < count; p++) {
      used[this.pa[p]] = 1;
      used[this.pb[p]] = 1;
      used[this.pc[p]] = 1;
    }
    let total = 0;
    for (let g = 0; g < this.vertexCount; g++) total += used[g];
    const active = new Uint32Array(total);
    let k = 0;
    for (let g = 0; g < this.vertexCount; g++) if (used[g]) active[k++] = g;
    this.active = active;
    this.count = count;
    this.points.geometry.setDrawRange(0, count);
  }

  // Llamar después de mixer.update() y updateMatrixWorld(), antes de renderizar.
  update() {
    for (const skeleton of this.skeletons) skeleton.update();
    if (this.reference) this._refInverse.copy(this.reference.matrixWorld).invert();
    this.meshes.forEach((mesh, mi) => {
      const m = this.meshTransforms[mi].multiplyMatrices(mesh.matrixWorld, mesh.bindMatrixInverse);
      if (this.reference) m.premultiply(this._refInverse);
    });

    const { rest, skinIndex, skinWeight, skinned, active, meshOf } = this;
    for (let n = 0; n < active.length; n++) {
      const g = active[n];
      const mi = meshOf[g];
      const bm = this.meshes[mi].skeleton.boneMatrices;
      const f = this.meshTransforms[mi].elements;
      const x = rest[g * 3];
      const y = rest[g * 3 + 1];
      const z = rest[g * 3 + 2];
      let sx = 0;
      let sy = 0;
      let sz = 0;
      for (let k = 0; k < 4; k++) {
        const w = skinWeight[g * 4 + k];
        if (w === 0) continue;
        const j = skinIndex[g * 4 + k] * 16;
        sx += w * (bm[j] * x + bm[j + 4] * y + bm[j + 8] * z + bm[j + 12]);
        sy += w * (bm[j + 1] * x + bm[j + 5] * y + bm[j + 9] * z + bm[j + 13]);
        sz += w * (bm[j + 2] * x + bm[j + 6] * y + bm[j + 10] * z + bm[j + 14]);
      }
      skinned[g * 3] = f[0] * sx + f[4] * sy + f[8] * sz + f[12];
      skinned[g * 3 + 1] = f[1] * sx + f[5] * sy + f[9] * sz + f[13];
      skinned[g * 3 + 2] = f[2] * sx + f[6] * sy + f[10] * sz + f[14];
    }

    const { positions, bary, pa, pb, pc } = this;
    for (let p = 0; p < this.count; p++) {
      const a = pa[p] * 3;
      const b = pb[p] * 3;
      const c = pc[p] * 3;
      const u = bary[p * 3];
      const v = bary[p * 3 + 1];
      const w = bary[p * 3 + 2];
      positions[p * 3] = u * skinned[a] + v * skinned[b] + w * skinned[c];
      positions[p * 3 + 1] = u * skinned[a + 1] + v * skinned[b + 1] + w * skinned[c + 1];
      positions[p * 3 + 2] = u * skinned[a + 2] + v * skinned[b + 2] + w * skinned[c + 2];
    }
    const attr = this.points.geometry.attributes.position;
    attr.clearUpdateRanges();
    attr.addUpdateRange(0, this.count * 3);
    attr.needsUpdate = true;
  }

  // Compara el skinning en CPU con SkinnedMesh.getVertexPosition() de three.js.
  // Devuelve la distancia máxima (unidades de mundo) entre ambos en una muestra de vértices.
  measureError(samples = 64) {
    const v = this._tmp;
    let max = 0;
    for (let s = 0; s < samples; s++) {
      const g = this.active[(Math.random() * this.active.length) | 0];
      const mi = this.meshOf[g];
      const mesh = this.meshes[mi];
      mesh.getVertexPosition(g - this.offsets[mi], v).applyMatrix4(mesh.matrixWorld);
      if (this.reference) v.applyMatrix4(this._refInverse); // mismo espacio que this.skinned
      const dx = v.x - this.skinned[g * 3];
      const dy = v.y - this.skinned[g * 3 + 1];
      const dz = v.z - this.skinned[g * 3 + 2];
      max = Math.max(max, Math.sqrt(dx * dx + dy * dy + dz * dz));
    }
    return max;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
