import { SITE } from './config.js';
import { contactHref } from './extras.js';

const message = 'Hola, quiero una animación personalizada. Para: ___ · Mensaje: ___ · Tema (flores amarillas, girasoles, Independencia…): ___ (te mando la foto por aquí)';

for (const node of document.querySelectorAll('[data-price]')) node.textContent = SITE.customOrderPrice;
for (const node of document.querySelectorAll('[data-delivery]')) node.textContent = SITE.customOrderDelivery;
for (const link of document.querySelectorAll('[data-contact]')) {
  link.href = contactHref(message);
  if (SITE.whatsapp) {
    link.target = '_blank';
    link.rel = 'noopener';
  }
  if (!SITE.whatsapp && link.dataset.contact === 'main') {
    link.textContent = 'Pedir por correo';
    link.classList.replace('btn-wa', 'btn-primary');
  }
}
