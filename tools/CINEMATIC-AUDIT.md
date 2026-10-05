# Auditoría cinematográfica del último lote de ViralCSS

> Registro histórico de la reconstrucción de veinte escenas. A petición del usuario se retiraron posteriormente `espejo-tardio`, `ola-de-tinta`, `alebrije-mil-trazos`, `trofeo-aficion`, `cometas-encuentro` y `dragon-circuito`, incluidos módulos públicos, fichas, recomendaciones y sitemap. El lote activo contiene catorce escenas; el catálogo visible completo contiene 87.

Fecha: 4 de octubre de 2026. Alcance: las 20 experiencias de `js/turtle-catalog.js`. Habilidad aplicada: `viralcss-cinematic-animation`.

## Decisión de implementación

El motor anterior construía demasiados protagonistas como muestras de contornos y nubes aditivas. Su iluminación no explicaba materiales, las siluetas dependían del brillo y los acontecimientos perdían profundidad. Se sustituyó su uso en las veinte entradas públicas por veinte módulos de escena independientes. Los identificadores y contratos públicos se conservaron.

`js/anim/cinema.js` contiene proyección, materiales, luz direccional, sombra ambiental, cámara, tipografía, entrada, calidad adaptable y liberación. `cine-gpu.js` rasteriza superficies con WebGL, profundidad real y buffers reutilizables. Hay respaldo Canvas sin dependencias externas. El eclipse usa Canvas deliberadamente: textura granular, ocultación opaca y filamentos son su material principal. La infraestructura compartida no determina las geometrías ni las transformaciones de las veinte escenas.

Se mantienen los caminos procedurales internos como grabados, costuras, circuitos, nervaduras y trayectorias que pertenecen al objeto. Se retiró la capa compartida de contorno progresivo con cursor: recorría objetos ya construidos y no alimentaba ninguna transformación. También se eliminaron sus propiedades auxiliares `engraving` en los módulos de escena. No se sustituyó por otro elemento visual. `turtle.js` sigue disponible; `turtle-experiences.js` conserva la primera implementación como referencia, pero las veinte entradas ya no la ejecutan.

La corrección posterior de Turtle no cambia geometría, materiales, iluminación, partículas, cámara, interacción ni microdetalle. Los núcleos de cometas, la luz/reflejo del espejo y los efectos estructurales siguen presentes porque pertenecen a la experiencia. Turtle/procedural drawing es opcional; no se requiere un cursor visible.

## Auditoría individual

Cada entrada incluye diagnóstico, decisión y resultado implementado. Los números corresponden a las capturas de `review/cinema/`, empezando por cero.

### 0. Mansión de las habitaciones imposibles — `mansion-imposible`

**Problema:** fachada reducida a líneas y puntos, sin espesor de muros, profundidad de ventanas ni lectura de las habitaciones separadas. **Decisión:** reconstruir arquitectura y desmontaje (`cine-mansion.js`).

Nueve volúmenes con cornisas, mampostería, balcones, cortinas, cristales, tejados y torretas. Violeta oscuro y luz cálida interior; encendido por habitación, no iluminación uniforme. El ángulo oblicuo y las oclusiones distinguen plantas y profundidad. El acontecimiento abre distancias diferentes entre las habitaciones y mantiene conexiones mediante peldaños reales. La cámara compensa el despliegue; polvo y neblina acompañan sin ocultar la fachada. El toque adelanta el diorama. Momento distintivo: arquitectura desmontada que sigue conectada.

### 1. Telaraña de electricidad — `telarana-electrica`

**Problema:** red plana, impulso visual sin respuesta estructural y araña poco reconocible. **Decisión:** reconstruir red, criatura y propagación (`cine-web.js`).

Seda fina radial y espiral, gotas de vidrio, anclajes oscuros y cuerpo con abdomen, cabeza y ocho patas articuladas. Un grafo de 144 nodos conecta vecinos con resortes y amortiguación: el impulso se transmite, deforma la seda y transporta las gotas. Las patas tienen desfases propios; la araña se orienta hacia el contacto. Se corrigieron la oscuridad excesiva y el encuadre móvil en la segunda pasada. Momento distintivo: tensión que viaja por conexiones físicas, en vez de una explosión de puntos.

### 2. El espejo que llega tarde — `espejo-tardio`

**Problema:** el marco y la superficie eran una nube ovalada, sin material reflectante ni borde consistente al abrirse. **Decisión:** reconstruir marco, mercurio y reflejo (`cine-mirror.js`).

Metal tallado, hojas ornamentales, doble bisel y superficie con iluminación diagonal, ondulación y reflejo amortiguado. El reflejo conserva movimiento propio y termina empujando desde dentro. Cintas de mercurio se separan con profundidad mientras el marco continúa reconocible. Se sustituyó el recorte por una elipse analítica para evitar bordes dentados. Momento distintivo: reflejo autónomo y apertura material. En movimiento reducido la posición retardada se estabiliza directamente.

### 3. Grimorio de tinta viva — `grimorio-tinta-viva`

**Problema:** libro de contorno y criatura como filamentos sin soporte material. **Decisión:** reconstruir encuadernación, páginas y cuerpo de tinta (`cine-book.js`).

Cubiertas de cuero, nervios del lomo, esquinas ornamentadas y páginas superpuestas con escritura. La tinta conserva sus trazos, pero estos forman membranas tridimensionales con hombros curvos, torsión y variación de espesor. El pase de página dobla el papel y modifica la postura; el cuerpo vuelve al libro. Se corrigió una silueta demasiado simétrica durante la revisión final. Nombre corto sobre la página, con tinta oscura. Momento distintivo: escritura que se convierte en volumen y regresa al papel.

### 4. El carrusel de medianoche — `carrusel-medianoche`

**Problema:** monturas sugeridas por puntos y círculo sin peso ni soportes. **Decisión:** reconstruir carrusel y caballos (`cine-carousel.js`).

Base torneada, cubierta en paneles de satén verdes y ámbar, postes, lámparas y caballos de perfiles tallados con músculos, bridas, sillas y cascos. Las monturas conservan orientación individual, oscilación de galope y profundidad mientras salen en hélice. Sus estelas son consecuencia del recorrido; los soportes pierden presencia durante la liberación y reaparecen al regreso. Momento distintivo: el carrusel conserva su arquitectura mientras libera cuerpos reconocibles.

### 5. Alebrije de mil trazos — `alebrije-mil-trazos`

**Problema:** figura compuesta por muestras de líneas, patrones independientes de la piel y alas de lectura débil. **Decisión:** reconstruir criatura original y superficies (`cine-alebrije.js`).

Cabeza, ojos, cuernos, patas, cola y alas de plumas con volumen. Patrones pintados por regiones del cuerpo, no cambio global de paleta. Las alas articuladas abren la silueta y siete partes de motivos se convierten en cintas que se separan y vuelven a la piel. La luz modela el cuerpo y deja zonas oscuras entre las plumas. Se corrigió la orientación de las alas. Momento distintivo: los motivos abandonan una piel que sigue visible. Fantasía artística original, sin presentarla como una creencia tradicional.

### 6. Catrina de encaje luminoso — `catrina-encaje`

**Problema:** cuerpo esquemático y vestido como malla luminosa plana. **Decisión:** reconstruir silueta completa y tejido (`cine-catrina.js`).

Corsé, cuello de perlas, brazos, cabeza, sombrero floral amplio y falda plegada con sombreado suave. Doce paneles adicionales de encaje se levantan como abanicos y responden con retrasos diferentes. Arrastre orienta el cuerpo; el vestido conserva masa mientras el encaje se despliega. Se redujeron subdivisiones secundarias sin quitar la silueta y se suavizaron normales. Momento distintivo: capas de vestuario que se separan alrededor de un cuerpo entero, no un retrato de calavera.

### 7. Pan de muerto: memoria compartida — `pan-memoria`

**Problema:** alimento sugerido por puntos dorados sin corteza, miga ni textura. **Decisión:** reconstruir volumen dividido y revelación cálida (`cine-bread.js`).

Cúpula tostada sobre plato, relieves de masa, azúcar de tamaños distintos y caras de miga interiores. La porción abre una separación sin destruir el pan. El vapor sale de la abertura y contiene la mesa y dos sillas como recuerdo abstracto. Luz cálida localizada, fondo sobrio y ritmo contenido. Momento distintivo: escena de memoria contenida dentro del alimento. La representación es estilizada, no una simulación culinaria fotográfica.

### 8. El retrato que guarda historias — `retrato-historias`

**Problema:** marco y escena cotidiana eran iconos sin capas ni profundidad. **Decisión:** reconstruir habitación y marco (`cine-portrait.js`).

Marco ornamentado con grosor, parquet, mesa, dos sillas, ventana, cortinas, libros, tazas y vela. Mover el dedo cambia el paralaje entre los planos; la iluminación interior permite reconocer cada objeto sin glow. La fotografía opcional se incorpora localmente en la revelación y conserva el recorrido de compartir. Sin foto permanece la habitación. Momento distintivo: un retrato que contiene una habitación. No hay reconocimiento facial ni servicios de imagen externos.

### 9. Bordado de la memoria — `bordado-memoria`

**Problema:** motivos flotantes sin tela y puntadas sin relieve. **Decisión:** reconstruir superficie tejida y elevación (`cine-embroidery.js`).

Trama y urdimbre, borde cosido, flores y hojas con puntadas. La tela se deforma coherentemente; mantener pulsado levanta los motivos conservando sus conexiones y al soltar vuelve el relieve. Nombre corto cosido visualmente al centro. Luz suave para tejido, variación entre hilos y fondo oscuro. Momento distintivo: dibujo que adquiere volumen y regresa a una superficie flexible. Composición artística original.

### 10. Dos cometas, un encuentro — `cometas-encuentro`

**Problema:** caminos luminosos repetitivos, encuentro sin masa ni profundidad. **Decisión:** reconstruir trayectorias y nudo (`cine-comets.js`).

Dos cintas independientes con núcleos y bordes, material satinado y dos acentos controlados. Se acercan con easing y construyen un nudo tridimensional de trayectoria trefoil; el toque despliega los recorridos manteniendo oclusiones. Se corrigieron entradas recortadas. Momento distintivo: el encuentro se convierte en un nudo espacial, sin terminar en otro corazón.

### 11. Herbario de luz — `herbario-luz`

**Problema:** plantas parecidas entre sí, páginas sin grosor y transición desconectada del papel. **Decisión:** reconstruir libro botánico y cuatro ejemplares (`cine-herbarium.js`).

Encuadernación oscura y páginas con volumen; cuatro especies visuales distintas con hojas, nervaduras y flores pequeñas. Inicialmente reposan sobre el papel, luego el giro de página los levanta hasta cuerpos suspendidos. Materiales vegetales mates, luz lateral, cámara oblicua y etiqueta con el nombre. Momento distintivo: colección que sale del papel, no ramo que se abre.

### 12. Eclipse de corona viva — `eclipse-corona`

**Problema:** discos uniformes y rayos idénticos, sin verdadera ocultación ni contraste. **Decisión:** rehacer el espectáculo en Canvas (`cine-eclipse.js`).

Textura solar granular precalculada, luna opaca con cráteres sutiles, corona de filamentos curvos con longitudes, anchuras y fases diferentes. El disco solar desaparece detrás de la luna; arrastrar modifica la alineación y el centro amplía la corona. La oscuridad del centro se conserva. Momento distintivo: ocultación que descubre material y filamentos antes invisibles. El detalle solar se reutiliza, no se genera cada fotograma.

### 13. La gran ola de tinta — `ola-de-tinta`

**Problema:** curva abierta como cinta, sin espesor ni cavidad de cresta. **Decisión:** reconstruir escultura de agua y ruptura (`cine-wave.js`).

Volumen cerrado con cresta hueca, caras laterales subdivididas, grabado marino sobre la superficie y espuma construida en el borde. Mantener suspende la fase de caída; soltar deja caer la superficie y lanza espuma con trayectorias balísticas propias. La cámara muestra el hueco y la profundidad. Dos iteraciones visuales corrigieron primero una cinta demasiado fina y después un lateral demasiado plano. Momento distintivo: escultura que se rompe manteniendo reconocible su cresta.

### 14. Dragón de circuito — `dragon-circuito`

**Problema:** silueta genérica y alas triangulares propias de una demo geométrica. **Decisión:** reconstruir articulación, armadura y alas (`cine-dragon.js`).

Segmentos de armadura, articulaciones, hocico, cuernos, garras y cola. Alas festoneadas de paneles con costillas y capas, sustituyendo los triángulos iniciales. Las pistas se iluminan por zonas y la activación despliega el cuerpo; el pulso recorre los circuitos. Metal oscuro, relleno limitado y acento electrónico localizado. Momento distintivo: circuito que activa un cuerpo mecánico articulado. Diseño original sin personaje ni marca.

### 15. El trofeo de la afición — `trofeo-aficion`

**Problema:** copa luminosa sin paredes, interior ni lectura metálica. **Decisión:** reconstruir copa y bandas (`cine-trophy.js`).

Metal torneado con interior, asas, laureles y pedestal. Reflejos concentrados y regiones oscuras, con gradas alejadas que no compiten. Las bandas son piezas de superficie independientes; se separan y vuelven a ensamblar con tiempos suaves. El nombre corto puede aparecer en el espacio de las bandas. Momento distintivo: despiece de un volumen metálico, sin reutilizar una jugada.

### 16. La edad en una máquina de dulces — `maquina-dulces`

**Problema:** contenedor esquemático y puntos sin peso ni material. **Decisión:** reconstruir máquina y movimiento (`cine-candy.js`).

Cristal, marco, conductos, remaches, controles, ranura y bandeja. Bolitas sombreadas recorren los tubos y forman la edad; la liberación se desfasa por bola, con rebote amortiguado y acomodo en bandeja. Se corrigió la oclusión del vidrio sobre los conductos. Sin edad aparece un motivo original de siete brazos curvos de dulces. Se revisaron además edades 1 y 999. Momento distintivo: edad construida por materia que después cae y se reúne.

### 17. Taller de juguetes de luz — `taller-juguetes`

**Problema:** tren rectangular sin mecanismo y taller definido solo por rieles luminosos. **Decisión:** reconstruir locomotora y ensamblaje (`cine-workshop.js`).

Caldera, cabina, ventanas, chimenea, faro, apartapiedras, seis ruedas con llantas y radios, bielas, brazos de montaje y banco con tablones. Las ruedas llegan a su lugar, los brazos se retiran y el tren recorre la vía que aparece delante. Vapor sutil y tarjeta entregada al final. Se corrigieron ruedas que parecían estrellas en lugar de mecanismos. Momento distintivo: ensamblaje visible seguido de recorrido y entrega.

### 18. Guitarra de resonancia — `guitarra-resonancia`

**Problema:** silueta delineada sin caja, madera ni separación de cuerdas. **Decisión:** reconstruir instrumento y resonancia (`cine-guitar.js`).

Caja de contorno modelado, grosor, veta tenue, roseta, boca, puente, trastes y clavijas. Se corrigió la boca que ocultaba las cuerdas y se redujo el contraste excesivo de la veta. El arrastre excita seis cuerdas con frecuencias y amortiguación diferentes; las ondas recorren el cuerpo. Cámara sutil y madera iluminada lateralmente. Momento distintivo: vibración del instrumento con resonancia visible. El sonido opcional no se incorporó; la experiencia funciona en silencio.

### 19. Escalera hacia lo imposible — `escalera-imposible`

**Problema:** ilusión plana y escalones como líneas sin espesor ni resolución espacial. **Decisión:** reconstruir geometría y cámara (`cine-stairs.js`).

Tramos situados en profundidades distintas, peldaños sólidos, bordes y barandillas. La proyección inicial oculta las separaciones; la cámara revela los huecos y después cada peldaño conecta una subida continua con retraso por índice. Material pétreo claro y sombras de profundidad. Momento distintivo: la perspectiva imposible se explica y se convierte en un camino real.

## Criterios transversales de la habilidad

Se inspeccionaron composición y silueta antes de ajustar efectos; superficies, normales y materiales antes de brillo; dirección de luz y contraste; primer plano, protagonista y fondo; paleta focal; aceleración/easing, desfases y amortiguación; imperfección coherente; introducción, desarrollo, acontecimiento y resolución; movimiento de cámara; propósito de partículas; integración del trazo; gesto y reproducción automática; zonas seguras verticales; coste, calidad adaptable y liberación; texto con y sin dedicatoria; lectura narrativa; fotogramas congelados y detección de geometría de demo. Las veinte escenas tienen un acontecimiento propio y mantienen la temática original.

La luz ambiental no reemplaza materiales. Las partículas secundarias pierden densidad si aumenta el coste; no se sacrifica el cuerpo principal. La tipografía se dibuja en Canvas, usa las fuentes existentes y conserva nombre, mensaje, firma y colores. Los nombres cortos pueden integrarse sobre papel, tejido o espacios del objeto; los textos largos pasan a una zona inferior segura para evitar que tapen la silueta. La opción sin texto se respeta.

## Evidencia y comprobaciones

- `node tools/browser-check.mjs --cinematic-all`: siete momentos por escena en 390 × 844 (0, 3, 6, 9, 12, 4.37 y 7.83 segundos), escritorio 1365 × 900 con texto largo, gesto/pulsación/liberación, renderizado Canvas forzado sin texto, movimiento reducido y medición de 60 fotogramas. Informes individuales: `review/cinema/0.json` a `19.json`; imágenes de timeline, escritorio y respaldo por número.
- Movimiento reducido: postura, cámara y tiempo visual fijos. Comparación de píxeles admite únicamente hasta 30 canales con diferencia máxima de 4/255 por rasterización; no se acepta desplazamiento animado. El informe conserva las diferencias observadas.
- `node tools/browser-check.mjs --turtle`: las veinte experiencias, interacción, repetición del visor, previews, compartición, fotografía local y su round trip, textos largos, sin texto, viewport pequeño y ejecución/repetición de los veinte HTML autónomos descargables.
- Suite general de navegador: las 93 animaciones visibles, catálogo, categorías, editor, enlaces, tipografías, colores, navegación, pausa/repetición, teclado y ausencia de desbordamiento en móvil/escritorio.
- Comprobaciones de catálogo/módulos, personalización, textos de temporada, share y SEO: `check-regressions.mjs`, `check-personalization.mjs`, `check-seasonal-text.mjs`, `check-turtle.mjs`, `check-seo.mjs`.
- Segunda inspección visual posterior a las correcciones: superficies de espejo, alas, encaje, cresta, cuerdas, vidrio, rueda, conexiones y textos. Las capturas son evidencia de revisión, no sustituyen la observación de la interacción en un dispositivo físico.

## Límites de validación

Resultado de la pasada individual final: 20/20 escenas, 140 fotogramas de timeline, cero excepciones y movimiento reducido estable en las veinte. Coste medio de la función de renderizado por escena entre 0.92 y 12.75 ms en la medición aislada de 60 llamadas. Es una medición del envío/renderizado desde JavaScript, no del tiempo completo de presentación del navegador ni una promesa de FPS.

Resultado de integración posterior a la última corrección: 20 escenas, 43 capturas, cero excepciones y cero llamadas de consola de tipo error; veinte exportaciones autónomas con reproducción automática y repetición correctas. Se verificaron foto local/round trip y los controles existentes. El máximo medio de esa pasada fue 14.76 ms por llamada de renderizado.

Las pruebas se ejecutan en Chrome de Windows con viewports móviles emulados y WebGL mediante SwiftShader. El coste medido no garantiza 60 FPS en teléfonos reales. Quedan pendientes pruebas en teléfonos físicos, Safari y Firefox. El respaldo Canvas conserva la composición, pero puede costar más y ofrece un sombreado menos suave que WebGL. No se implementaron audio ni simulación física de líquidos/ropa de precisión; sus deformaciones son procedurales. No se publicó ni se desplegó el proyecto.

Abrir el catálogo local: `http://localhost:8080/animaciones.html`. Los nombres e identificadores se conservan y los enlaces anteriores siguen usando las mismas entradas.
