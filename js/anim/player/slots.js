import * as THREE from 'three';
import { normalizeBoneName } from './rig.js';

// SLOTS: piezas intercambiables (cabello, cabeza, accesorios) sobre el MISMO esqueleto.
// Una pieza con pesos se ata al esqueleto del personaje por nombre de hueso, así que
// se anima sola con los clips que ya existen: no hay que reexportar el personaje.

// Piezas disponibles. Cada una es un GLB con la misma armadura en reposo.
export const PARTS = {
  base: { url: 'assets/football/parts/hair-base.glb', mesh: /hair/i },
};

// Un GLB de pieza se descarga una sola vez aunque lo usen varios jugadores.
const partCache = new Map();

async function loadPart(loader, url) {
  if (!partCache.has(url)) partCache.set(url, loader.loadAsync(url));
  return partCache.get(url);
}

// Ata una malla con pesos al esqueleto de destino buscando cada hueso por nombre.
export function rebindToSkeleton(mesh, rig) {
  const bones = mesh.skeleton.bones.map((b) => rig.byName.get(normalizeBoneName(b.name).toLowerCase()));
  if (bones.some((b) => !b)) return false;
  mesh.bind(new THREE.Skeleton(bones, mesh.skeleton.boneInverses), mesh.bindMatrix);
  return true;
}

// Escala la geometría en espacio de bind para dar más o menos volumen sin crear geometría nueva.
// Con anchor 'bottom' el pivote va en el centro en X/Z y en la base en Y: el cabello crece
// hacia arriba y hacia los lados pero su borde inferior sigue pegado al cráneo. Escalado desde
// el centro se despegaría y quedaría flotando sobre la cabeza.
export function scaleGeometry(geometry, factor, { lift = 0, anchor = 'bottom', yFactor = 0.6 } = {}) {
  if (factor === 1 && !lift) return;
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const center = box.getCenter(new THREE.Vector3());
  const pivotY = anchor === 'bottom' ? box.min.y : center.y;
  // A lo alto se crece menos que a lo ancho, o un tupé se convierte en un casco.
  const fy = anchor === 'bottom' ? 1 + (factor - 1) * yFactor : factor;
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      center.x + (pos.getX(i) - center.x) * factor,
      pivotY + (pos.getY(i) - pivotY) * fy + lift,
      center.z + (pos.getZ(i) - center.z) * factor,
    );
  }
  pos.needsUpdate = true;
  geometry.computeBoundingSphere();
}

export class SlotSystem {
  constructor(root, rig, { loader, basePath = '' } = {}) {
    this.root = root;
    this.rig = rig;
    this.loader = loader;
    this.basePath = basePath;
    this.attached = new Map(); // slot -> Object3D
  }

  // Mallas del personaje base que coinciden con un patrón (p. ej. el cabello fusionado).
  findParts(pattern) {
    const found = [];
    this.root.traverse((o) => {
      if (o.isSkinnedMesh && pattern.test(o.name)) found.push(o);
    });
    return found;
  }

  // Ocultar una parte es permanente: se marca para que ninguna capa de render la reviva.
  hideParts(pattern) {
    for (const mesh of this.findParts(pattern)) {
      mesh.visible = false;
      mesh.userData.slotHidden = true;
    }
    return this;
  }

  showParts(pattern) {
    for (const mesh of this.findParts(pattern)) {
      mesh.userData.slotHidden = false;
      mesh.visible = true;
    }
    return this;
  }

  // CABELLO: quita el del personaje base y engancha la pieza indicada.
  // `volume` cambia la silueta sin necesitar otra geometría.
  async setHair({ part = 'base', volume = 1, color = null } = {}) {
    this.removeSlot('hair');
    if (!part) {
      this.hideParts(/hair/i);
      return null;
    }
    const def = PARTS[part];
    if (!def) throw new Error(`Pieza de cabello desconocida: ${part}`);

    const gltf = await loadPart(this.loader, this.basePath + def.url);
    let source = null;
    gltf.scene.traverse((o) => {
      if (!source && o.isSkinnedMesh && def.mesh.test(o.name)) source = o;
    });
    if (!source) throw new Error(`La pieza ${part} no trae malla con pesos`);

    // Se clona para no tocar el GLB en caché, que comparten todos los jugadores.
    const piece = new THREE.SkinnedMesh(source.geometry.clone(), null);
    piece.bindMatrix.copy(source.bindMatrix);
    piece.bindMatrixInverse.copy(source.bindMatrixInverse);
    piece.skeleton = source.skeleton;
    scaleGeometry(piece.geometry, volume, { anchor: 'bottom' });
    if (!rebindToSkeleton(piece, this.rig)) {
      throw new Error(`La pieza ${part} usa huesos que este esqueleto no tiene`);
    }
    piece.material = new THREE.MeshStandardMaterial({
      color: color !== null ? new THREE.Color(color) : new THREE.Color(0xc49a62),
      roughness: 0.85,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    });
    piece.frustumCulled = false;
    piece.name = 'HairSlot';
    this.hideParts(/^hair$/i);
    this.root.add(piece);
    this.attached.set('hair', piece);
    return piece;
  }

  // CABEZA: el GLB base trae la cabeza fusionada con el cuerpo, así que para meter una
  // cabeza propia se colapsa el hueso Head (los vértices de la cara caen sobre el hueso)
  // y se engancha la geometría nueva. Mientras no haya rostros propios, collapse = false.
  setHeadPolicy({ collapse = false, scale = 0.001 } = {}) {
    const head = this.rig.get('head');
    if (!head) return this;
    head.userData.collapse = collapse ? scale : null;
    return this;
  }

  // ACCESORIOS: se cuelgan de un hueso y se mueven con él (cintas, muñequeras…).
  addAccessory({ id, object3D, bone = 'head', position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
    const target = this.rig.get(bone);
    if (!target || !object3D) return null;
    object3D.position.fromArray(position);
    object3D.rotation.fromArray(rotation);
    object3D.scale.setScalar(scale);
    target.add(object3D);
    this.attached.set(id, object3D);
    return object3D;
  }

  removeSlot(id) {
    const obj = this.attached.get(id);
    if (!obj) return;
    obj.parent?.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
    this.attached.delete(id);
  }

  // Mallas con pesos que forman el personaje ahora mismo: es lo que muestrea el render de
  // partículas. Se filtra por pieza oculta, no por `visible`, porque en modo PARTICLES
  // la malla entera está invisible y aun así hay que muestrearla.
  skinnedMeshes() {
    const list = [];
    this.root.traverse((o) => {
      if (o.isSkinnedMesh && !o.userData.slotHidden) list.push(o);
    });
    return list;
  }

  dispose() {
    for (const id of [...this.attached.keys()]) this.removeSlot(id);
  }
}
