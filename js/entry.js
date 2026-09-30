// Valida los enlaces antes de iniciar una pantalla de edición o de dedicatoria.
import { getAnimation } from './catalog.js';
import { decodeCard } from './share.js';
import './support.js';
const page=document.querySelector('script[data-entry]').dataset.entry;
const params=new URLSearchParams(location.search);
const card=params.has('s')?decodeCard(params.get('s')):null;
const id=card?.a||params.get('a');
if(params.has('s')&&(!card||!getAnimation(card.a)) || id&&!getAnimation(id) || page==='viewer'&&!id) {
 const main=document.querySelector('main'); main.replaceChildren();main.className='container prose';
 const heading=document.createElement('h1');heading.textContent='Este enlace no está disponible';
 const text=document.createElement('p');text.textContent='El enlace está incompleto o no corresponde a una animación del proyecto. Pide a quien lo compartió que copie el enlace completo, o elige otra escena.';
 const link=document.createElement('a');link.href='/animaciones.html';link.className='btn btn-primary';link.textContent='Explorar animaciones';main.append(heading,text,link);
} else await import(`./${page}.js`);
