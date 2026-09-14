// Datos del sitio que cambian con frecuencia. Edita solo este archivo.
export const SITE = {
  url: 'https://animaciones.pages.dev',
  email: 'viralcss11@gmail.com',
  // Número de WhatsApp con código de país y sin espacios, ej. '5215512345678'.
  // Si está vacío, los encargos se piden por correo.
  whatsapp: '',
  // Enlace de Mercado Pago, Ko-fi, etc. Si está vacío, no se muestra el botón.
  donationUrl: '',
  customOrderPrice: '$49 MXN',
  customOrderDelivery: '24 horas',
};

// Regalos con enlace de afiliado de Mercado Libre (cuenta gaom3053613).
// Genera cada `url` desde el programa de afiliados (meli.la/...); un enlace normal no da comisión.
// category: 'flores' | 'mexico' | 'todas'. En cada página se muestran 4 al azar, primero los de su categoría.
// image: foto principal del producto en Mercado Libre (clic derecho → copiar dirección de imagen).
// Si no tiene `image`, la carta muestra el `emoji`.
const ML_IMG = 'https://http2.mlstatic.com/D_NQ_NP_';
export const GIFTS = [
  { category: 'flores', emoji: '🌻', title: '15 girasoles artificiales eternos', url: 'https://meli.la/1oqiJ2M', image: `${ML_IMG}712484-MLM117401533345_092026-O.webp` },
  { category: 'flores', emoji: '💛', title: 'Girasoles eternos con collar y bufanda', url: 'https://meli.la/2HmAjD2', image: `${ML_IMG}825994-CBT82013317553_012025-O.webp` },
  { category: 'flores', emoji: '🌙', title: 'Lámpara de noche de girasol', url: 'https://meli.la/1fcvy9m', image: `${ML_IMG}605943-CBT115568452761_082026-O.webp` },
  { category: 'flores', emoji: '🌹', title: 'Rosa dorada en caja de regalo', url: 'https://meli.la/1Z6W2sw', image: `${ML_IMG}724974-CBT112899686083_062026-O.webp` },
  { category: 'flores', emoji: '🌷', title: '20 tulipanes artificiales', url: 'https://meli.la/24wdmad', image: `${ML_IMG}672658-MLM107069122104_022026-O.webp` },
  { category: 'flores', emoji: '🌹', title: '25 rosas artificiales', url: 'https://meli.la/2KNHKeV', image: `${ML_IMG}802399-CBT113597067975_062026-O.webp` },
  { category: 'flores', emoji: '💐', title: '12 flores amarillas de wisteria', url: 'https://meli.la/11h8isk', image: `${ML_IMG}901645-MLM84141091848_052025-O.webp` },
  { category: 'todas', emoji: '🕯️', title: 'Canasta de regalo con velas para ella', url: 'https://meli.la/2m25Erc', image: `${ML_IMG}921466-MLA112491470470_062026-O.webp` },
  { category: 'todas', emoji: '👜', title: 'Bolso tejido con perlas', url: 'https://meli.la/1t2uXTv', image: `${ML_IMG}689024-MLA114227785315_072026-O.webp` },
  { category: 'todas', emoji: '🎁', title: 'Kit personalizado: termo, libreta y pluma', url: 'https://meli.la/1gi6yNX', image: `${ML_IMG}823743-MLM112277170739_052026-O.webp` },
  { category: 'todas', emoji: '👔', title: 'Set de cartera para caballero', url: 'https://meli.la/1gqRPAo', image: `${ML_IMG}774491-MLA96855963885_102025-O.webp` },
  { category: 'todas', emoji: '🎁', title: 'Kit de cumpleaños para él: cartera y cinturón', url: 'https://meli.la/2U2ra26', image: `${ML_IMG}847871-MLM95430302403_102025-O.webp` },
];
