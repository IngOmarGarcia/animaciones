import { BASE_PROFILE, PLAYER_PROFILES } from '../character.js';

// IDENTITY: solo datos. No importa three.js ni toca el rig, la animación ni el render.
// Las medidas de cada jugador viven ya en character.js (sistema de personajes procedural),
// así que aquí se derivan de ahí en vez de mantener una segunda tabla que se desincronice.
//
// Un IdentityProfile describe QUÉ cambia entre futbolistas:
//   body        proporciones relativas al perfil base (1 = igual que el base)
//   posture     desviaciones de postura (metros para desplazamientos, radianes para giros)
//   head        geometría de cabeza intercambiable (todavía sin rostros propios)
//   hair        pieza de cabello intercambiable + volumen y color
//   accessories piezas atadas a un hueso (cintas, muñequeras…)
//   kit         colores genéricos de uniforme, sin escudos ni marcas
//   particles   paleta y densidad por región para el render de partículas

const DEFAULT_KIT = {
  shirt: [0.22, 0.24, 0.28], stripe: [0.95, 0.96, 1], shorts: [0.14, 0.15, 0.18],
  socks: [0.9, 0.92, 0.95], boots: [0.95, 0.95, 0.95], skin: [0.85, 0.68, 0.55], hair: [0.25, 0.18, 0.12],
};

export const toHex = ([r, g, b]) => (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);

const ratio = (a, b) => (b ? a / b : 1);

// Deriva las proporciones para el rig a partir de un perfil de character.js.
export function identityFromCharacterProfile(id, profile = {}, { label = id } = {}) {
  const B = BASE_PROFILE;
  const P = {
    ...B, ...profile,
    hair: { ...B.hair, ...(profile.hair || {}) },
    posture: { ...B.posture, ...(profile.posture || {}) },
  };
  const kit = profile.kit || DEFAULT_KIT;

  return {
    id,
    label,
    // Proporciones relativas: 1 = como el personaje base del GLB
    body: {
      heightRatio: ratio(P.height, B.height),
      legLength: ratio(P.legRatio, B.legRatio),
      legThickness: ratio(P.thighR, B.thighR),
      shoulderWidth: ratio(P.shoulderHalf, B.shoulderHalf),
      // Volumen de torso: área del pecho (ancho × fondo), pasada a factor lineal
      torsoVolume: Math.sqrt(ratio(P.chestHalf * P.chestDepth, B.chestHalf * B.chestDepth)),
      waist: ratio(P.waistHalf, B.waistHalf),
      neckLength: ratio(P.neckLen, B.neckLen),
      neckWidth: ratio(P.neckR, B.neckR),
      armLength: ratio(P.armRatio, B.armRatio),
      armThickness: ratio(P.armR, B.armR),
      headScale: ratio(P.headScale, B.headScale),
    },
    posture: { ...P.posture },
    // Todavía se usa la cabeza fusionada del GLB base. Al tener geometrías propias:
    // { url, mesh, collapseBase: true } y el sistema colapsa el hueso Head del base.
    head: { slot: null, collapseBase: false },
    hair: {
      slot: 'base',        // id de pieza en PARTS; null = sin cabello
      style: P.hair.style, // 'short' | 'topVolume' | 'quiff' — para elegir pieza cuando existan varias
      volume: P.hair.volume ?? 1,
      color: kit.hair,
    },
    accessories: [], // { id, url|builder, bone: 'handL', position, rotation, scale }
    kit,
    particles: {
      palette: { core: [0.95, 0.99, 1], glow: kit.shirt },
      // Multiplicadores sobre la densidad por región del ParticleSkin.
      // El reparto es relativo: si al cabello se le da todo su volumen (1.7 en Neymar) le quita
      // partículas al cuerpo y la figura se ve deshilachada, así que se aplica atenuado.
      density: { head: 1, hair: 1 + ((P.hair.volume ?? 1) - 1) * 0.35, hands: 1, feet: 1, torso: 1 },
    },
  };
}

export const PROFILES = {
  generic: identityFromCharacterProfile('generic', {}, { label: 'Genérico' }),
  messi: identityFromCharacterProfile('messi', PLAYER_PROFILES.messi, { label: 'Messi' }),
  neymar: identityFromCharacterProfile('neymar', PLAYER_PROFILES.neymar, { label: 'Neymar' }),
  cristiano: identityFromCharacterProfile('cristiano', PLAYER_PROFILES.cristiano, { label: 'Cristiano' }),
};

export const PROFILE_IDS = Object.keys(PROFILES);

export function getIdentity(id) {
  const identity = PROFILES[id];
  if (!identity) throw new Error(`Perfil de identidad desconocido: ${id}`);
  return identity;
}

// Perfil propio sin tocar los existentes: útil para personalización del usuario final.
export function defineIdentity(id, overrides = {}) {
  const base = PROFILES.generic;
  return {
    ...base, ...overrides, id,
    body: { ...base.body, ...(overrides.body || {}) },
    posture: { ...base.posture, ...(overrides.posture || {}) },
    head: { ...base.head, ...(overrides.head || {}) },
    hair: { ...base.hair, ...(overrides.hair || {}) },
    kit: { ...base.kit, ...(overrides.kit || {}) },
    particles: {
      palette: { ...base.particles.palette, ...(overrides.particles?.palette || {}) },
      density: { ...base.particles.density, ...(overrides.particles?.density || {}) },
    },
  };
}
