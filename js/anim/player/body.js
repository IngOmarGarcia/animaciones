import * as THREE from 'three';

// BODY: convierte las proporciones de una identidad en transformaciones sobre el rig.
// No toca geometría ni pesos: solo escala huesos y añade pequeños giros de postura.
// Por eso un mismo GLB sirve para todos los futbolistas.
//
// Se aplica DESPUÉS de mixer.update() en cada cuadro, porque el clip de Mixamo
// escribe escala y posición en los huesos y borraría cualquier ajuste previo.
//
// Los huesos de Mixamo apuntan a lo largo de su eje Y local: escalar en Y alarga el hueso
// y escalar en X/Z lo engorda. Escalar un hueso arrastra a sus hijos, así que donde el
// cambio no debe propagarse (pie, mano, cabeza) se aplica la escala inversa.

// Cuánto giro produce cada centímetro de desviación de postura (ajustado a ojo sobre el rig).
const POSTURE_GAIN = {
  headForward: 5.0,      // metros → radianes de cabeceo de la cabeza
  headTilt: 1.0,         // ya viene en radianes
  shoulderForward: 3.0,  // metros → radianes de giro del hombro
  chestOut: 4.0,         // metros → radianes de inclinación del pecho
  pelvisTilt: 1.0,       // ya viene en radianes
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class BodyShaper {
  constructor(rig, identity) {
    this.rig = rig;
    this.setIdentity(identity);
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._unitsPerMeter = null;
  }

  setIdentity(identity) {
    this.identity = identity;
    const b = identity.body;
    // Se acotan para que una escala no uniforme fuerte no cizalle la malla en las articulaciones.
    this.m = {
      legLength: clamp(b.legLength, 0.8, 1.25),
      legThickness: clamp(b.legThickness, 0.7, 1.4),
      shoulderWidth: clamp(b.shoulderWidth, 0.8, 1.35),
      torsoVolume: clamp(b.torsoVolume, 0.82, 1.3),
      waist: clamp(b.waist, 0.8, 1.3),
      neckLength: clamp(b.neckLength, 0.6, 1.5),
      neckWidth: clamp(b.neckWidth, 0.7, 1.4),
      armLength: clamp(b.armLength, 0.85, 1.2),
      armThickness: clamp(b.armThickness, 0.7, 1.4),
      headScale: clamp(b.headScale, 0.85, 1.2),
    };
    this.posture = identity.posture || {};
  }

  // Escala un hueso y deja al hijo indicado con la escala inversa para no propagar el cambio.
  _scaleChain(role, sx, sy, sz, counterRoles = []) {
    const bone = this.rig.get(role);
    if (!bone) return;
    bone.scale.set(sx, sy, sz);
    for (const counter of counterRoles) {
      const child = this.rig.get(counter);
      if (child) child.scale.set(1 / sx, 1 / sy, 1 / sz);
    }
  }

  _rotate(role, axis, radians) {
    if (!radians) return;
    const bone = this.rig.get(role);
    if (!bone) return;
    this._e.set(axis === 'x' ? radians : 0, axis === 'y' ? radians : 0, axis === 'z' ? radians : 0);
    bone.quaternion.multiply(this._q.setFromEuler(this._e));
  }

  // Aplica proporciones y postura al esqueleto ya animado.
  apply() {
    const m = this.m;
    const p = this.posture;

    // Torso: ancho y fondo, sin alargarlo. La escala de un hueso se hereda, así que cada
    // eslabón aplica solo la diferencia respecto al anterior: cintura en Spine, pecho en
    // Spine1, y Spine2 ya no añade nada.
    const v = m.torsoVolume;
    const waist = m.waist;
    this._scaleChain('spine', waist, 1, waist);
    this._scaleChain('chest', v / waist, 1, v / waist);
    this._scaleChain('upperChest', 1, 1, 1);

    // Hombros: alargar el hueso separa los brazos del eje del cuerpo.
    // Se divide entre el volumen del torso porque el hombro ya hereda esa escala.
    const sw = m.shoulderWidth / v;
    this._scaleChain('shoulderL', sw, sw, sw);
    this._scaleChain('shoulderR', sw, sw, sw);

    // Brazos: largo en Y, grosor en X/Z. La mano deshace la escala para no crecer.
    const at = m.armThickness / sw;
    const al = m.armLength / sw;
    this._scaleChain('armL', at, al, at, ['handL']);
    this._scaleChain('armR', at, al, at, ['handR']);

    // Cuello y cabeza: el cuello alarga, la cabeza compensa y aplica su propio tamaño.
    const nw = m.neckWidth / v;
    const nl = m.neckLength;
    const headBone = this.rig.get('head');
    this._scaleChain('neck', nw, nl, nw);
    if (headBone) headBone.scale.set((m.headScale / nw), (m.headScale / nl), (m.headScale / nw));

    // Piernas: largo y grosor desde el muslo; el pie deshace ambos para conservar su tamaño.
    this._scaleChain('upLegL', m.legThickness, m.legLength, m.legThickness, ['footL']);
    this._scaleChain('upLegR', m.legThickness, m.legLength, m.legThickness, ['footR']);

    // Postura: giros pequeños encima de la animación.
    this._rotate('upperChest', 'x', -(p.chestOut || 0) * POSTURE_GAIN.chestOut);
    this._rotate('neck', 'x', (p.headForward || 0) * POSTURE_GAIN.headForward * 0.5);
    this._rotate('head', 'x', (p.headForward || 0) * POSTURE_GAIN.headForward * 0.5);
    this._rotate('head', 'z', (p.headTilt || 0) * POSTURE_GAIN.headTilt);
    this._rotate('shoulderL', 'y', (p.shoulderForward || 0) * POSTURE_GAIN.shoulderForward);
    this._rotate('shoulderR', 'y', -(p.shoulderForward || 0) * POSTURE_GAIN.shoulderForward);
    this._rotate('hips', 'x', (p.pelvisTilt || 0) * POSTURE_GAIN.pelvisTilt);

    // Reparto de peso: desplaza la cadera de lado, en unidades del esqueleto.
    const shift = p.weightShift || 0;
    if (shift) {
      const hips = this.rig.get('hips');
      if (hips) {
        if (this._unitsPerMeter === null) this._unitsPerMeter = this.rig.unitsPerMeter('hips');
        hips.position.x += shift * this._unitsPerMeter;
      }
    }
  }

  // Devuelve las medidas aplicadas (para HUD y depuración).
  metrics() {
    return { ...this.m, heightRatio: this.identity.body.heightRatio };
  }
}
