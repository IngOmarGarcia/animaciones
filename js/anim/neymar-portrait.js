import { createParticlePortrait } from './particle-portrait.js';

// Retrato de partículas de un futbolista: la cabeza se construye con la superficie real del
// modelo 3D, sostiene el plano, explota y las mismas partículas escriben el nombre.
//
// Para otro jugador basta con cambiar esta configuración: la nube se genera con
//   node tools/sample-head.mjs <modelo.glb> assets/football/<nombre>-points.bin 36000
// y el motor (particle-portrait.js) no se toca.

// ✏️ Configuración de la experiencia
export const experienceConfig = {
  // Nube de puntos precalculada a partir del GLB (ruta relativa a este módulo)
  points: new URL('../../assets/football/head-points.bin', import.meta.url).href,
  name: 'NEYMAR JR',
  subtitle: 'O JOGO NUNCA PARA',
  primary: [0.14, 0.38, 1.0],     // azul eléctrico
  secondary: [0.22, 0.86, 1.0],   // cyan
  highlight: [0.9, 0.97, 1.0],    // blanco azulado
  density: 1,
  rotation: 25,        // grados de giro a cada lado en el plano heroico
  explosion: 1,
  useCardName: false,  // el nombre del jugador manda; la dedicatoria la pone el reproductor
};

export default function create(ctx, w, h, dpr = 1, stage) {
  return createParticlePortrait(ctx, w, h, dpr, stage, experienceConfig);
}
