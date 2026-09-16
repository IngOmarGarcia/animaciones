// La ficha es HTML completo. La escena se descarga solo cuando alguien pide verla.
const button = document.getElementById('detail-play');
button?.addEventListener('click', async () => {
  button.disabled = true;
  button.textContent = 'Cargando animación…';
  try {
    const [{ getAnimation }, { createPlayer }] = await Promise.all([
      import('./catalog.js'), import('./anim/engine.js'),
    ]);
    const anim = getAnimation(document.body.dataset.animation);
    if (!anim || anim.hidden) throw new Error('Animación no disponible');
    const mod = await anim.load();
    const player = createPlayer(document.getElementById('detail-canvas'), mod.default, { loop: anim.previewLoop, preview: true });
    button.hidden = true;
    player.play();
    document.addEventListener('visibilitychange', () => document.hidden ? player.pause() : player.play());
  } catch (error) {
    button.disabled = false;
    button.textContent = 'No se pudo cargar. Reintentar';
    console.error(error);
  }
});
