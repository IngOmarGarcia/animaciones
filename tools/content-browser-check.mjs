import assert from 'node:assert/strict';
export async function reviewContent({call,evaluate,navigate,wait,overflow,screenshot,errors}){
 for(const [width,height] of [[360,640],[390,844],[430,932],[1365,900]]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
  await navigate('/animaciones.html');await wait("!!document.querySelector('.collection-controls [data-count]')?.textContent");
  await overflow(`catálogo ${width}`);
  const layout=await evaluate("({top:document.querySelector('[data-gallery] .card').getBoundingClientRect().top,height:innerHeight,strip:document.querySelector('.catalog-category-strip').scrollWidth>document.querySelector('.catalog-category-strip').clientWidth})");
  assert(layout.top<height-30,`No aparece la primera escena en ${width}: ${layout.top}`);
  if(width<500)assert(layout.strip,'Deben poder deslizarse las categorías');
  if(width===390||width===1365)await screenshot(`content-catalog-${width}`);
  await evaluate("document.querySelector('[data-filter]').value='letter';document.querySelector('[data-filter]').dispatchEvent(new Event('change'))");
  assert(await evaluate("[...document.querySelectorAll('[data-gallery] .card:not([hidden])')].every(c=>c.dataset.letter==='true')"));
  await navigate('/categorias/general.html');await overflow(`general ${width}`);
  assert.equal(await evaluate("document.querySelector('h1').textContent"),'General y motivación: encuentra tu escena');
  assert.equal(await evaluate("document.querySelectorAll('.collection-controls').length"),0);
  await navigate('/animaciones/me-daba-miedo.html');
  await wait("document.querySelector('.detail-scene .scene-poster').naturalWidth>0");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.detail-scene .scene-poster')).objectFit"),'contain','La imagen debe mostrar la frase sin recortarla');
  await overflow(`ficha ${width}`);
  assert.equal(await evaluate("document.querySelector('.scene-quote').textContent.trim()"),'Si te mando esto, ya hice la parte que me daba miedo.');
  if(width===390)await screenshot('content-detail-poster-390');
  await evaluate("document.getElementById('detail-play').click()");await wait("document.getElementById('detail-play').hidden");
  assert(await evaluate("document.querySelector('.detail-scene .scene-poster').hidden"));
  await evaluate("document.getElementById('detail-pause').click()");assert.equal(await evaluate("document.getElementById('detail-pause').textContent"),'Continuar');
  await evaluate("document.getElementById('detail-replay').click()");assert.equal(await evaluate("document.getElementById('detail-pause').textContent"),'Pausar');
 }
 await call('Emulation.setScriptExecutionDisabled',{value:true});
 try{
  for(const route of ['/animaciones/me-daba-miedo.html','/categorias/aniversario.html']){
   await navigate(route);await wait("[...document.querySelectorAll('img.scene-poster')].some(i=>i.complete&&i.naturalWidth>0)");
   await overflow('sin JavaScript '+route);
   if(route.includes('me-daba'))assert(await evaluate("document.querySelector('.scene-quote').textContent.includes('Si te mando esto')"));
  }
  await screenshot('content-no-javascript');
 }finally{await call('Emulation.setScriptExecutionDisabled',{value:false});}
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('OK: catálogo accesible en 360/390/430/1365, filtros, fichas, imágenes y frases sin JavaScript, reproducción, pausa y reinicio.');
}
