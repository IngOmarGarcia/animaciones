import { enhanceGallery, refreshGallery, setGalleryPaused, galleryPaused } from './gallery.js';
for(const gallery of document.querySelectorAll('[data-gallery]')) enhanceGallery(gallery);
for(const controls of document.querySelectorAll('.collection-controls')) {
 controls.hidden=false;
 controls.removeAttribute('data-pending');
 const gallery=controls.nextElementSibling, cards=[...gallery.querySelectorAll('.card')];
 const filter=controls.querySelector('[data-filter]'), count=controls.querySelector('[data-count]'), motion=controls.querySelector('[data-motion]');
 const update=()=>{for(const card of cards) {const v=filter.value;card.hidden=!(v==='all'||v==='auto'&&card.dataset.mode==='auto'||v==='interactive'&&card.dataset.mode!=='auto'||v==='color'&&card.dataset.color==='true'||v==='letter'&&card.dataset.letter==='true');}count.textContent=`${cards.filter(c=>!c.hidden).length} escenas disponibles`;refreshGallery(gallery);};
 filter.addEventListener('change',update);update();
 const label=()=>{motion.textContent=galleryPaused()?'Animar miniaturas':'Pausar miniaturas';motion.setAttribute('aria-pressed',String(galleryPaused()));};
 motion.addEventListener('click',()=>{setGalleryPaused(!galleryPaused(),{userInitiated:true});label();});label();
}
