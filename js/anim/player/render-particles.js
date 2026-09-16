import { ParticleSkin, REGION_RULES, MESH_RULES } from './ParticleSkin.js';
import { toHex } from './identity.js';

// RENDER (partículas): envuelve ParticleSkin y le pasa la paleta y la densidad de la identidad.
// La geometría sigue saliendo de la superficie real del SkinnedMesh: esta capa solo decide
// cuántas partículas caen en cada región y de qué color se pintan.

export const PALETTE_CYAN = { glow: 0x22e4ff, core: 0xf2fdff };

function rulesFor(identity) {
  const density = identity.particles?.density || {};
  const region = REGION_RULES.map((rule) => ({ ...rule, density: rule.density * (density[rule.name] ?? 1) }));
  const mesh = MESH_RULES.map((rule) => ({ ...rule, density: rule.density * (density[rule.name] ?? 1) }));
  return { region, mesh };
}

export function paletteOf(identity, mode = 'identity') {
  if (mode === 'cyan') return PALETTE_CYAN;
  const palette = identity.particles?.palette || {};
  return {
    glow: palette.glow ? toHex(palette.glow) : PALETTE_CYAN.glow,
    core: palette.core ? toHex(palette.core) : PALETTE_CYAN.core,
  };
}

export class ParticleSkinRenderer {
  constructor(skinnedMeshes, identity, { maxCount = 15000, seed = 7, paletteMode = 'cyan' } = {}) {
    const rules = rulesFor(identity);
    this.identity = identity;
    this.paletteMode = paletteMode;
    this.skin = new ParticleSkin(skinnedMeshes, {
      maxCount, seed,
      regionRules: rules.region,
      meshRules: rules.mesh,
      colors: paletteOf(identity, paletteMode),
    });
  }

  get object3D() {
    return this.skin.points;
  }

  get uniforms() {
    return this.skin.material.uniforms;
  }

  get count() {
    return this.skin.count;
  }

  setPaletteMode(mode) {
    this.paletteMode = mode;
    this.skin.setColors(paletteOf(this.identity, mode));
  }

  // Padre bajo el que se dibuja la nube, para que su transformación no se aplique dos veces.
  setReference(object3D) {
    this.skin.setReference(object3D);
    return this;
  }

  setVisible(visible) {
    this.skin.points.visible = visible;
  }

  setCount(n) {
    this.skin.setCount(n);
  }

  update() {
    this.skin.update();
  }

  measureError(samples) {
    return this.skin.measureError(samples);
  }

  dispose() {
    this.skin.dispose();
  }
}
