# Haunted Night — recursos y licencia

Verificación: 8 de octubre de 2026. Alcance de esta iteración: solo Haunted Night.

## Recursos integrados

| Recurso | Autor | Procedencia | Licencia | Archivos en ejecución |
| --- | --- | --- | --- | --- |
| Dead Tree Trunk | Rob Tuytel | https://polyhaven.com/a/dead_tree_trunk | CC0-1.0 | `web/dead-tree-trunk.glb` |
| Forest Ground 04 | Rob Tuytel (fotografía/procesado), Rico Cilliers (ajuste) | https://polyhaven.com/a/forest_ground_04 | CC0-1.0 | `web/forest-diff-512.jpg`, `web/forest-diff-1024.jpg`, `web/forest-nor_gl-1024.jpg`, `web/forest-rough-1024.jpg` |

Poly Haven permite expresamente redistribuir los recursos dentro de productos vendidos: https://polyhaven.com/license . CC0 permite modificación y distribución comercial de los archivos originales y derivados; no exige atribución. Conservamos estos créditos voluntariamente. El permiso se refiere a los recursos, no a los logotipos, textos o renders de ejemplo del sitio. No se han incluido esos renders.

Licencia: https://creativecommons.org/publicdomain/zero/1.0/ . Metadatos oficiales, URLs concretas, fechas y hashes de los originales: `provenance.json`. Transformaciones, tamaños y hashes de derivados: `optimization.json`.

`source/` contiene únicamente los archivos oficiales verificados. El navegador no solicita esa carpeta. Los JPG `web/dead_tree_trunk_*` son intermediarios de optimización; el GLB contiene sus propias texturas y no solicita esos JPG.

## Optimización e integración

Three.js 0.180.0, GLTFLoader oficial con licencia MIT conservada en `js/vendor/three/LICENSE`, Blender 5.2.2 LTS. Modelo reducido de 101.802 a 17.999 triángulos, texturas PBR a 512 px, GLB de 677.932 bytes. Instancing para dos troncos en calidad baja y tres en alta; texturas y geometrías pertenecen a cada reproductor y se liberan al destruirlo. Las imágenes decodificadas se reutilizan sin compartir objetos GPU entre reproductores.

Transferencia de recursos aproximada, sin contar runtime/caché: 789 KB en móvil o memoria <=4 GB; 1,95 MB en escritorio con mayor memoria. Móvil usa suelo de 512 px sin normal/rugosidad. Escritorio usa tres mapas de 1.024 px. PBR del tronco: color, normal y canales AO/rugosidad/metalness.

La importación de esta escena carga únicamente sus recursos locales. Sin WebGL2/HDR no se descargan. Si falla un recurso o excede 12 segundos, se conserva el entorno procedural. Reinicio, puerta, relámpago, siete ventanas, raycasting, mensaje y compartir conservan su funcionamiento.

Reproducir: `node tools/fetch-haunted-assets.mjs`, seguido de Blender en modo background con `--factory-startup --python tools/optimize-haunted-assets.py`. El descargador verifica MD5/tamaño oficiales y registra SHA-256. No necesita cuentas.

## Mansión: pendiente de acceso al archivo oficial

**HAUNTED MANSION — n-malmberg**: https://sketchfab.com/3d-models/haunted-mansion-94e1f8e882014d95a0ab14f195372443 . API oficial: https://api.sketchfab.com/v3/models/94e1f8e882014d95a0ab14f195372443 . La API declara 68.606 caras, 40.345 vértices, cinco texturas, un material, PBR metalness y descarga habilitada; el autor describe geometría original creada en Blender y texturas pintadas en Photoshop. Candidata por detalle arquitectónico y volumen, aún sin evaluación de geometría descargada ni comparación renderizada. Sus texturas pintadas requieren comprobar el acabado PBR real; la etiqueta de la API no basta para afirmar fotorrealismo.

Licencia declarada: CC BY 4.0, https://creativecommons.org/licenses/by/4.0/ . Permite distribuir y modificar comercialmente, también archivos fuente, conservando crédito a n-malmberg, enlace original, enlace de licencia e indicación de cambios. No debe quedar sometida a restricciones adicionales incompatibles en una futura EULA. No está integrada ni incluida en el paquete actual.

El endpoint oficial `/download` responde HTTP 401 sin sesión autenticada. No se han extraído datos del visor ni de juegos que usan el modelo. Se pidió al usuario la ruta de una descarga oficial para continuar. La mansión procedural sigue intacta hasta poder comparar un reemplazo real.

## Alternativas estudiadas y no integradas

| Recurso | Fuente | Motivo |
| --- | --- | --- |
| Gothic Manor 01 | https://polyhaven.com/a/gothic_manor_01 | Es un HDRI, no una mansión tridimensional; luz diurna poco adecuada. |
| Haunted House, naovia | https://opengameart.org/node/4083 | CC0, pero el autor lo describe como cartoon/low poly; no satisface el salto visual solicitado. |
| Haunted Old Shack, DEEPgames | https://blendswap.com/blend/20445 | Cabaña, no mansión. Geometría CC0; texturas de Textures.com no incluidas, requieren revisión separada. |
| Lakeside Mansion, cjmitchell | https://sketchfab.com/3d-models/lakeside-mansion-d6c5158e0eb14915a3e9ed356f889fd9 | CC BY; 1,2 millones de triángulos y composición de finca/lago, menos adecuada al encuadre gótico. Descarga también autenticada. |
| Victorian Style House, MrChimp2313 | https://blendswap.com/blend/12687 | Geometría CC0 y detalle atractivo; el autor enlaza texturas CGTextures y materiales de terceros. No se puede inferir que todos esos elementos sean CC0. No se descargó el paquete. Futuro posible: obtener solo geometría y sustituir todos los materiales por recursos verificados. |
| Conversión House de Bitterli / gltf-research-scenes | https://benedikt-bitterli.me/resources/ ; https://github.com/ErfanMo77/gltf-research-scenes/tree/main/scenes/house | Misma casa victoriana; el rótulo CC0 del paquete no resuelve la procedencia de las texturas que declara el autor original. No descargada. |
| Simple Mansion, jsevamo | https://www.blendswap.com/blend/15786 | Detalle/estilo insuficientes; CC BY-SA introduce obligaciones de compartir derivados que deben mantenerse en los archivos afectados. |
| Gothic Medieval Mansion, FUBA-3D | https://www.cgtrader.com/3d-models/exterior/house/gothic-medieval-mansion-grand-fantasy-estate | De pago, royalty-free; sin permiso específico verificado para redistribuir el modelo fuente dentro de paquetes. |
| Haunted House, KanistraReserved | https://www.blendkit.com/asset-gallery-detail/a0cbe588-c6a4-45fb-8d78-04ef26434cd9/ | Recurso de plan de pago, royalty-free; no cumple la selección gratuita y redistribuible verificada. |
| Haunted House Facade 01 | https://threejsassets.com/assets/haunted-house-facade-01 | Fachada y paquete de pago; no sustituye una mansión con volumen. |
| Gothic Mansion model pack | https://free3d.online/model/6507450-gothic-mansion-model-pack | Autor/procedencia/licencia de redistribución no suficientemente verificables; no descargado. |

ambientCG se revisó como fuente CC0 de superficies (https://docs.ambientcg.com/license/), pero no se añadió una segunda biblioteca sin necesidad: los mapas de Poly Haven cubren este cambio.

## Validación y límites

Capturas comparativas a 0, 8, 13,45 y 22 segundos, en móvil y escritorio: `tools/review/haunted-night/assets-*.png`. Evaluación visual realizada mediante lectura de capturas reales de Chrome, no solo inspección del código. El suelo y los troncos mejoran visiblemente el primer plano; **esta entrega parcial todavía no logra el salto radical de calidad de la mansión solicitado**.

Pruebas aprobadas: `node tools/autumn-review.mjs haunted-night --assets-comparison`; `--integration --performance`; `--asset-failure`; `node tools/check-regressions.mjs`; `node tools/check-seo.mjs`; `node --check` en los módulos y scripts modificados; `git diff --check`. Regresiones: 94 escenas importables. Rutas: 113 páginas, cero enlaces rotos. Medición local: Radeon 610M, 390 × 693, DPR 1, 180 cuadros, últimos 90 medidos; media 16,68 ms, p95 18,10 ms, 59,96 FPS. No garantiza 60 FPS en otros equipos. Evidencia generada en `tools/review/haunted-night/` (ignorada por Git). La prueba de escritorio fuerza 8 GB anunciados para ejercitar los mapas grandes; no representa una medición en otro equipo físico.

Archivos de esta iteración: `assets/haunted-night/**`, `js/anim/haunted-night-assets.js`, `js/anim/haunted-night-renderer.js`, `js/vendor/three/GLTFLoader.js`, `js/vendor/three/BufferGeometryUtils.js`, `img/haunted-night.webp`, `tools/fetch-haunted-assets.mjs`, `tools/optimize-haunted-assets.py`, `tools/autumn-review.mjs`, `tools/new-expert-review.html`. Los cambios que ya había en otras experiencias se conservaron.

Antes de publicar: conseguir el archivo oficial de la mansión candidata, verificar jerarquía/UV/materiales, comparar con la escena actual, adaptar puertas y ventanas a su geometría, revisar la composición final y medir en teléfonos físicos. No se hizo push ni despliegue.
