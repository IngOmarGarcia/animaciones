export const CATEGORIES = [
  { id: 'todas', name: 'Todas' },
  { id: 'flores', name: '🌼 Flores amarillas' },
  { id: 'mexico', name: '🎉 Independencia de México' },
];

// file: nombre de la escena en js/anim/ (sin .js).
// textPosition: 'top' | 'center'. textDelay: segundos antes de mostrar el mensaje.
// previewLoop: cada cuántos segundos se reinicia en las vistas previas.
export const ANIMATIONS = [
  {
    id: 'ramo-flores-amarillas',
    file: 'ramo',
    category: 'flores',
    title: 'Ramo de flores amarillas',
    description: 'Un ramo que florece frente a sus ojos.',
    defaultMessage: 'Te regalo estas flores amarillas 💛',
    textPosition: 'top',
    textDelay: 3.6,
    previewLoop: 12,
  },
  {
    id: 'girasol',
    file: 'girasol',
    category: 'flores',
    title: 'Girasol que florece',
    description: 'Un girasol que se abre pétalo a pétalo.',
    defaultMessage: 'Eres el sol que ilumina mis días 🌻',
    textPosition: 'top',
    textDelay: 4.2,
    previewLoop: 12,
  },
  {
    id: 'corazon-flores',
    file: 'corazon',
    category: 'flores',
    title: 'Corazón de flores amarillas',
    description: 'Decenas de florecitas forman un corazón.',
    defaultMessage: 'Mi corazón florece contigo',
    textPosition: 'top',
    textDelay: 4,
    previewLoop: 11,
  },
  {
    id: 'fuegos-viva-mexico',
    file: 'fuegos',
    category: 'mexico',
    title: 'Fuegos artificiales ¡Viva México!',
    description: 'Pirotecnia verde, blanco y rojo sobre la ciudad.',
    defaultMessage: '¡Viva México!',
    textPosition: 'center',
    textDelay: 1.5,
    previewLoop: 20,
  },
  {
    id: 'papel-picado',
    file: 'papel-picado',
    category: 'mexico',
    title: 'Papel picado y confeti',
    description: 'Fiesta mexicana para celebrar el 15 de septiembre.',
    defaultMessage: '¡Feliz Día de la Independencia! 🎉',
    textPosition: 'center',
    textDelay: 1.8,
    previewLoop: 14,
  },
];

for (const anim of ANIMATIONS) anim.load = () => import(`./anim/${anim.file}.js`);

export const getAnimation = (id) => ANIMATIONS.find((a) => a.id === id);
export const getCategory = (id) => CATEGORIES.find((c) => c.id === id);
