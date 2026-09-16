import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { RigMap } from './rig.js';
import { getIdentity, PROFILE_IDS } from './identity.js';
import { BodyShaper } from './body.js';
import { AnimationSet } from './animation.js';
import { SlotSystem } from './slots.js';
import { MeshSkinRenderer } from './render-mesh.js';
import { ParticleSkinRenderer } from './render-particles.js';

// PlayerIdentitySystem: junta las capas sin mezclarlas.
//
//   IDENTITY  identity.js        datos del futbolista (proporciones, cabello, colores)
//   BODY      body.js            aplica esas proporciones al esqueleto
//   RIG       rig.js             nombres de huesos → roles
//   ANIMATION animation.js       clips y reproducción
//   RENDER    render-mesh.js / render-particles.js / ParticleSkin.js
//
// El GLB base se carga UNA sola vez y cada jugador es un clon del esqueleto que comparte
// la geometría: cambiar de futbolista no vuelve a descargar ni reconstruir el personaje.

export class PlayerIdentitySystem {
  constructor({
    baseUrl = 'assets/football/test-player.glb',
    basePath = '',
    targetHeight = 1.8,
    maxParticles = 15000,
    loader = new GLTFLoader(),
  } = {}) {
    this.baseUrl = baseUrl;
    this.basePath = basePath;
    this.targetHeight = targetHeight;
    this.maxParticles = maxParticles;
    this.loader = loader;
    this._base = null;
    this._loading = null;
  }

  get profiles() {
    return PROFILE_IDS;
  }

  // Carga (y cachea) el personaje base: malla, esqueleto, pesos y clips.
  loadBase() {
    if (this._base) return Promise.resolve(this._base);
    if (!this._loading) {
      this._loading = this.loader.loadAsync(this.basePath + this.baseUrl).then((gltf) => {
        this._base = { scene: gltf.scene, animations: gltf.animations };
        return this._base;
      });
    }
    return this._loading;
  }

  async createPlayer(identityId = 'generic', options = {}) {
    const base = await this.loadBase();
    const identity = typeof identityId === 'string' ? getIdentity(identityId) : identityId;
    const player = new Player({
      identity,
      scene: cloneSkinned(base.scene),
      animations: base.animations,
      targetHeight: options.targetHeight ?? this.targetHeight,
      maxParticles: options.maxParticles ?? this.maxParticles,
      loader: this.loader,
      basePath: this.basePath,
      paletteMode: options.paletteMode ?? 'cyan',
    });
    await player.build();
    return player;
  }
}

export class Player {
  constructor({ identity, scene, animations, targetHeight, maxParticles, loader, basePath, paletteMode }) {
    this.identity = identity;
    this.targetHeight = targetHeight;
    this.maxParticles = maxParticles;
    this.paletteMode = paletteMode;
    this.group = new THREE.Group();
    this.group.name = `Player_${identity.id}`;
    this.character = scene;
    this.group.add(this.character);

    this.rig = new RigMap(this.character);
    this.animation = new AnimationSet(this.character, animations);
    this.shaper = new BodyShaper(this.rig, identity);
    this.slots = new SlotSystem(this.character, this.rig, { loader, basePath });
    this.mode = 'particles';
  }

  async build() {
    await this.applyIdentitySlots();
    this.mesh = new MeshSkinRenderer(this.character, this.identity);
    this.particles = new ParticleSkinRenderer(this.slots.skinnedMeshes(), this.identity, {
      maxCount: this.maxParticles,
      paletteMode: this.paletteMode,
    });
    this.group.add(this.particles.object3D);
    this.particles.setReference(this.group);
    this.normalize();
    this.setMode(this.mode);
    return this;
  }

  // Cabello, cabeza y accesorios de esta identidad.
  async applyIdentitySlots() {
    const hair = this.identity.hair;
    if (hair?.slot) {
      await this.slots.setHair({ part: hair.slot, volume: hair.volume ?? 1, color: hair.color && rgbHex(hair.color) });
    } else if (hair && hair.slot === null) {
      this.slots.hideParts(/hair/i);
    }
    this.slots.setHeadPolicy({ collapse: Boolean(this.identity.head?.collapseBase) });
  }

  // Deja al jugador con los pies en y = 0, la cadera en el origen y la altura relativa de su perfil.
  normalize() {
    this.group.scale.setScalar(1);
    this.group.position.set(0, 0, 0);
    this.animation.setTime(0);
    this.shaper.apply();
    this.group.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(this.character, true);
    const height = box.max.y - box.min.y;
    const scale = height > 1e-6 ? (this.targetHeight * this.identity.body.heightRatio) / height : 1;
    this.group.scale.setScalar(scale);
    this.group.updateMatrixWorld(true);

    const hips = this.rig.get('hips');
    const hipsWorld = hips ? hips.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
    const box2 = new THREE.Box3().setFromObject(this.character, true);
    this.group.position.set(-hipsWorld.x, -box2.min.y, -hipsWorld.z);
    this.group.updateMatrixWorld(true);
    this.height = this.targetHeight * this.identity.body.heightRatio;
  }

  setMode(mode) {
    this.mode = mode;
    this.mesh.setVisible(mode !== 'particles');
    this.particles.setVisible(mode !== 'mesh');
    return this;
  }

  // Cambia de futbolista reutilizando esqueleto, clips y animación en curso.
  // Solo se rehacen las piezas y el muestreo de partículas, que dependen de la geometría visible.
  async setIdentity(identity) {
    const next = typeof identity === 'string' ? getIdentity(identity) : identity;
    this.identity = next;
    this.shaper.setIdentity(next);
    await this.applyIdentitySlots();
    // refresh() vuelve a recoger las mallas: el cabello de la identidad nueva es otra malla.
    this.mesh.refresh(next);
    const count = this.particles.count;
    this.group.remove(this.particles.object3D);
    this.particles.dispose();
    this.particles = new ParticleSkinRenderer(this.slots.skinnedMeshes(), next, {
      maxCount: this.maxParticles,
      paletteMode: this.paletteMode,
    });
    this.particles.setCount(count);
    this.group.add(this.particles.object3D);
    this.particles.setReference(this.group);
    this.normalize();
    this.setMode(this.mode);
    return this;
  }

  // Orden fijo por cuadro: animación → proporciones → matrices → partículas.
  update(dt) {
    this.animation.update(dt);
    this.shaper.apply();
    this.group.updateMatrixWorld(true);
    if (this.mode !== 'mesh') this.particles.update();
  }

  dispose() {
    this.animation.dispose();
    this.slots.dispose();
    this.mesh.dispose();
    this.particles.dispose();
    this.group.parent?.remove(this.group);
  }
}

const rgbHex = ([r, g, b]) => (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
