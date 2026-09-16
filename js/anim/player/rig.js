import * as THREE from 'three';

// RIG: única capa que conoce los nombres de huesos del esqueleto.
// El resto del sistema pide roles ('upLegL', 'neck'…), nunca nombres.
// Para usar otro esqueleto que no sea Mixamo basta con cambiar ROLE_BONES.

export const ROLE_BONES = {
  hips: 'Hips',
  spine: 'Spine',
  chest: 'Spine1',
  upperChest: 'Spine2',
  neck: 'Neck',
  head: 'Head',
  shoulderL: 'LeftShoulder',
  shoulderR: 'RightShoulder',
  armL: 'LeftArm',
  armR: 'RightArm',
  foreArmL: 'LeftForeArm',
  foreArmR: 'RightForeArm',
  handL: 'LeftHand',
  handR: 'RightHand',
  upLegL: 'LeftUpLeg',
  upLegR: 'RightUpLeg',
  legL: 'LeftLeg',
  legR: 'RightLeg',
  footL: 'LeftFoot',
  footR: 'RightFoot',
  toeL: 'LeftToeBase',
  toeR: 'RightToeBase',
};

// GLTFLoader limpia los nombres de nodo, así que "mixamorig:Hips" puede llegar como
// "mixamorigHips" o "mixamorig_Hips" según la versión.
export function normalizeBoneName(name) {
  return String(name).replace(/^mixamorig[:_]?/i, '');
}

export class RigMap {
  constructor(root) {
    this.root = root;
    this.byName = new Map();
    this.bones = [];
    root.traverse((obj) => {
      if (!obj.isBone) return;
      this.bones.push(obj);
      this.byName.set(normalizeBoneName(obj.name).toLowerCase(), obj);
    });
    this.roles = new Map();
    for (const [role, bone] of Object.entries(ROLE_BONES)) {
      const found = this.byName.get(bone.toLowerCase());
      if (found) this.roles.set(role, found);
    }
  }

  get(role) {
    return this.roles.get(role) || null;
  }

  // Roles declarados en ROLE_BONES que este esqueleto no trae (diagnóstico).
  missingRoles() {
    return Object.keys(ROLE_BONES).filter((role) => !this.roles.has(role));
  }

  // Cuántas unidades del esqueleto mide un metro del mundo.
  // El rig de Mixamo viene en centímetros y el nodo Armature trae escala 0.01,
  // así que cualquier desplazamiento en metros hay que convertirlo antes de aplicarlo a un hueso.
  unitsPerMeter(role = 'hips') {
    const bone = this.get(role);
    if (!bone) return 1;
    const scale = new THREE.Vector3();
    bone.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
    const s = (scale.x + scale.y + scale.z) / 3;
    return s > 1e-9 ? 1 / s : 1;
  }
}
