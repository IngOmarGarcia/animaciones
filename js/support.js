import { supportConfig } from './config.js';

const formatClabe = (digits) => digits.replace(/^(\d{3})(\d{3})(\d{11})(\d)$/, '$1 $2 $3 $4');
const clabeDigits = () => (supportConfig.clabe || '').replace(/\D/g, '');

function paymentUrl() {
  try {
    const url = new URL(supportConfig.paymentUrl);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

export function hasSupportMethod() {
  return !!(paymentUrl() || /^\d{18}$/.test(clabeDigits()));
}

let modal;
let returnFocus;
let closeMobileMenu = () => {};

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

async function copyClabe(button, digits) {
  let copied = false;
  try {
    await navigator.clipboard.writeText(digits);
    copied = true;
  } catch {
    const input = document.createElement('textarea');
    input.value = digits;
    input.setAttribute('readonly', '');
    input.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.append(input);
    input.select();
    try { copied = document.execCommand('copy'); } catch { /* sin permisos */ }
    input.remove();
  }
  if (!copied) {
    button.textContent = 'Selecciona y copia la CLABE';
    modal.querySelector('.support-clabe')?.focus();
    modal.querySelector('.support-clabe')?.select?.();
    return;
  }
  button.textContent = '✓ CLABE copiada';
  button.classList.remove('support-copied');
  void button.offsetWidth;
  button.classList.add('support-copied');
  clearTimeout(button._resetTimer);
  button._resetTimer = setTimeout(() => {
    button.textContent = 'Copiar CLABE';
    button.classList.remove('support-copied');
  }, 2400);
}

function getModal() {
  if (modal) return modal;
  modal = make('dialog', 'support-modal');
  modal.setAttribute('aria-labelledby', 'support-modal-title');
  modal.setAttribute('aria-describedby', 'support-modal-description');
  const close = make('button', 'support-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Cerrar');
  close.addEventListener('click', () => modal.close());
  const title = make('h2', '', 'Gracias por apoyar a ViralCss 💛');
  title.id = 'support-modal-title';
  const description = make('p', 'support-modal-text', 'Tu apoyo ayuda a mantener el sitio gratuito y a seguir creando nuevas animaciones.');
  description.id = 'support-modal-description';
  const label = make('p', 'support-transfer-label', `Transferencia vía ${supportConfig.provider || 'Mercado Pago'}`);
  const number = make('input', 'support-clabe');
  number.type = 'text'; number.readOnly = true;
  number.value = formatClabe(clabeDigits());
  number.setAttribute('aria-label', 'CLABE para transferencia');
  const copy = make('button', 'btn btn-primary support-copy', 'Copiar CLABE');
  copy.type = 'button';
  copy.addEventListener('click', () => copyClabe(copy, clabeDigits()));
  const note = make('p', 'support-modal-note', 'Cualquier cantidad es bienvenida.');
  modal.append(close, title, description, label, number, copy, note);
  modal.addEventListener('click', (event) => { if (event.target === modal) modal.close(); });
  modal.addEventListener('close', () => returnFocus?.focus());
  document.body.append(modal);
  return modal;
}

export function openSupport(event) {
  if (!hasSupportMethod()) return;
  const trigger = event?.currentTarget;
  returnFocus = trigger?.closest('.mobile-nav') ? document.querySelector('.header-menu-toggle') : trigger;
  closeMobileMenu();
  const url = paymentUrl();
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  getModal().showModal();
}

export function createSupportButton(label = 'Apoyar a ViralCss', className = 'btn btn-primary') {
  const button = make('button', className, label);
  button.type = 'button';
  button.addEventListener('click', openSupport);
  return button;
}

export function createSupportCard() {
  if (!hasSupportMethod()) return null;
  const box = make('section', 'donate');
  box.id = 'apoyar';
  box.append(
    make('h2', 'donate-title', '☕ ¿Te gustó? Apoya a ViralCss'),
    make('p', 'donate-text', 'ViralCss es gratis para todos. Si alguna animación te sacó una sonrisa y quieres ayudarme a seguir creando nuevas, puedes hacer una aportación voluntaria.'),
    createSupportButton(),
    make('p', 'donate-note', 'Cualquier cantidad ayuda. Gracias por apoyar el proyecto.'),
  );
  return box;
}

export function initSupportUI() {
  const header = document.querySelector('.site-header');
  if (!header || header.dataset.supportReady) return;
  header.dataset.supportReady = '1';
  const desktop = header.querySelector('nav');
  if (!desktop) return;
  desktop.classList.add('header-desktop-nav');
  if (hasSupportMethod()) desktop.append(createSupportButton('Apoyar', 'header-support-button'));

  const toggle = make('button', 'header-menu-toggle', '☰');
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Abrir menú');
  toggle.setAttribute('aria-expanded', 'false');
  const mobile = make('nav', 'mobile-nav');
  mobile.id = 'mobile-site-nav';
  mobile.hidden = true;
  mobile.setAttribute('aria-label', 'Menú móvil');
  toggle.setAttribute('aria-controls', mobile.id);
  for (const link of desktop.querySelectorAll('a')) mobile.append(link.cloneNode(true));
  if (hasSupportMethod()) mobile.append(createSupportButton('Apoyar a ViralCss', 'mobile-support-button'));
  closeMobileMenu = () => {
    mobile.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
  };
  toggle.addEventListener('click', () => {
    const opening = mobile.hidden;
    mobile.hidden = !opening;
    toggle.setAttribute('aria-expanded', String(opening));
    toggle.setAttribute('aria-label', opening ? 'Cerrar menú' : 'Abrir menú');
  });
  mobile.addEventListener('click', (event) => { if (event.target.closest('a')) closeMobileMenu(); });
  document.addEventListener('click', (event) => {
    if (!mobile.hidden && !header.contains(event.target)) closeMobileMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !mobile.hidden) { closeMobileMenu(); toggle.focus(); }
  });
  header.append(toggle, mobile);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSupportUI, { once: true });
  else initSupportUI();
}
