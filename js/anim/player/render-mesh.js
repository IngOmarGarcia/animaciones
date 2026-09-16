import * as THREE from 'three';
import { toHex } from './identity.js';

// RENDER (malla): la vista sólida del personaje, para validar y comparar con las partículas.
// Solo lee colores de la identidad; no modifica geometría ni animación.

const PART_COLORS = [
  { re: /eyelash/i, key: 'hair' },
  { re: /eye/i, key: null, color: 0xf0f0f0 },
  { re: /hair/i, key: 'hair' },
  { re: /shoe|boot/i, key: 'boots' },
  { re: /bottom|short/i, key: 'shorts' },
  { re: /top|shirt/i, key: 'shirt' },
  { re: /body|skin/i, key: 'skin' },
];

export class MeshSkinRenderer {
  constructor(root, identity) {
    this.root = root;
    this.materials = new Map();
    this.visible = true;
    this.refresh(identity);
  }

  // Vuelve a recoger las mallas: hace falta tras cambiar una pieza (el cabello es otra malla).
  refresh(identity = this.identity) {
    this.identity = identity;
    this.meshes = [];
    this.root.traverse((o) => {
      // Las mallas ocultas por el sistema de piezas no vuelven a mostrarse nunca.
      if (o.isSkinnedMesh && !o.userData.slotHidden) this.meshes.push(o);
    });
    const kit = identity.kit;
    for (const mesh of this.meshes) {
      const rule = PART_COLORS.find((r) => r.re.test(mesh.name));
      const color = rule ? (rule.key ? toHex(kit[rule.key] || kit.skin) : rule.color) : 0xaaaaaa;
      let material = this.materials.get(mesh.uuid);
      if (!material) {
        // polygonOffset aleja un poco la malla en profundidad para que en BOTH las partículas
        // que están exactamente sobre la superficie no parpadeen contra ella.
        material = new THREE.MeshStandardMaterial({
          roughness: 0.75, metalness: 0,
          polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
        });
        this.materials.set(mesh.uuid, material);
        mesh.material = material;
        mesh.frustumCulled = false;
      }
      material.color.set(color);
      mesh.visible = this.visible;
    }
    return this;
  }

  setIdentity(identity) {
    return this.refresh(identity);
  }

  setVisible(visible) {
    this.visible = visible;
    for (const mesh of this.meshes) mesh.visible = visible;
  }

  dispose() {
    for (const material of this.materials.values()) material.dispose();
    this.materials.clear();
  }
}
