# Las 20 experiencias de dibujo luminoso

> La implementación visual de este lote fue reconstruida posteriormente. El estado actual, los módulos `cine-*`, la revisión individual y sus límites están documentados en [CINEMATIC-AUDIT.md](CINEMATIC-AUDIT.md). El motor `turtle-experiences.js` mencionado abajo describe la primera versión y ya no es utilizado por las veinte entradas públicas.

Registro: `js/turtle-catalog.js`. Cada identificador tiene un módulo público en `js/anim/` y una ficha en `animaciones/`. Motor de trazos: `js/anim/turtle.js`. Geometrías y coreografías: `js/anim/turtle-experiences.js`.

## Comparación con el catálogo anterior y entre las nuevas escenas

| Identificador | Protagonista y acontecimiento propios | Distinción del catálogo anterior |
|---|---|---|
| mansion-imposible | Habitaciones con volumen, ventanas secuenciales y conexiones suspendidas | Arquitectura; no calabaza, fantasma ni luna |
| telarana-electrica | Red de resortes conectados, impulso y araña que se acerca al gesto | Propagación por una estructura elástica |
| espejo-tardio | Marco ovalado, mercurio en cintas y dos luces con tiempos distintos | Reflejo autónomo, sin otra figura de Halloween |
| grimorio-tinta-viva | Libro que se abre, filamentos de escritura con volumen y retorno a páginas | Postura de tinta y cambio de página |
| carrusel-medianoche | Caballos con volumen, postes, plataforma y órbitas helicoidales de ida y vuelta | Estructura circular que libera figuras |
| alebrije-mil-trazos | Criatura original, cuernos, alas, piel de motivos y cintas que vuelven | No reutiliza monarca ni mascota |
| catrina-encaje | Cuerpo entero, sombrero, vestido y encajes en abanico | Vestuario; no primer plano de calaverita |
| pan-memoria | Pan con relieves, corteza, azúcar, porción y mesa de vapor | Alimento y memoria compartida |
| retrato-historias | Marco rectangular ornamentado, mesa, sillas, ventana y fotografía opcional | Capas de objetos cotidianos; distinto del espejo ovalado |
| bordado-memoria | Tela de hilos con relieve y motivos conectados que se levantan | Superficie flexible; composición artística original |
| cometas-encuentro | Dos cabezas, caminos opuestos y cintas anudadas en profundidad | No termina en un corazón |
| herbario-luz | Páginas y ejemplares botánicos que se levantan del papel | No es crecimiento de una flor ni apertura de ramo |
| eclipse-corona | Discos, ocultación opaca y filamentos de corona | El eclipse es el protagonista, sin galaxia ni planeta con anillos |
| ola-de-tinta | Cresta curva con profundidad, suspensión y caída de espuma | Grabado escultórico; sin playa ni atardecer |
| dragon-circuito | Cuerpo articulado, alas de circuitos y haz por las pistas | Criatura original, sin marca ni personaje reconocible |
| trofeo-aficion | Copa volumétrica, asas, pedestal y bandas separadas | No reutiliza jugadas ni retratos |
| maquina-dulces | Máquina, conductos, bolitas, edad y cascada a bandeja | Sin pastel, regalo ni piñata |
| taller-juguetes | Engranajes, brazos, tren, vía progresiva y tarjeta | Tren de taller; sin árbol, esfera ni regalo protagonista |
| guitarra-resonancia | Caja con cintura, boca, mástil, seis cuerdas y ondas | Instrumento; sin pirotecnia ni papel picado |
| escalera-imposible | Tramos a distintas alturas alineados por proyección inversa y reconexión ascendente | Ilusión espacial que se resuelve al cambiar la cámara |

## Integración y decisiones

- Conserva todos los identificadores y enlaces anteriores. Añade la categoría General y motivación.
- Reutiliza reproductor, observación de tamaño, pausa, repetición, teclado, visibilidad y liberación de recursos.
- Turtle admite avance, giro, pluma levantada, tinta, grosor, rectas y curvas. Conserva muestras y distancia acumulada; esas muestras también alimentan las esculturas.
- Las partículas tienen coordenadas X/Y/Z y proyección con giro y perspectiva. El renderizado es Canvas 2D, sin dependencias ni miles de nodos DOM.
- Los 20 diseños admiten título, mensaje, firma, tipografía, dos colores y Sin texto. Los títulos cortos se integran en las estructuras adecuadas; los largos usan la zona de lectura inferior.
- Edad de 1 a 999; sin edad se forma una estrella. El retrato permite fotografía opcional, preparada y comprimida localmente, sin reconocimiento ni servicios externos. Se usa el límite existente de 22 000 caracteres y hasta 192 × 192 píxeles.
- Las escenas de memoria son composiciones artísticas; los efectos no se presentan como tradiciones o creencias.
- No se incluye sonido; la guitarra responde visualmente.

## Verificación reproducible

Con `node tools/serve-local.mjs` en ejecución:

```text
node tools/check-turtle.mjs
node tools/check-regressions.mjs
node tools/check-seasonal-text.mjs
node tools/check-personalization.mjs
node tools/check-seo.mjs
node tools/browser-check.mjs --turtle
```

La suite específica genera contactos de las 20 escenas a 1.5, 5, 10 y 15 segundos, vistas de escritorio, textos largos, Sin texto, movimiento reducido y capturas a tamaño real. Comprueba las interacciones, creación, enlaces, repetición, foto local, restauración de la foto y tiempos por cuadro. Resultados medidos: `tools/review/turtle/report.json`. Capturas: `tools/review/turtle/`.

La revisión visual se repite después de las correcciones. Las pruebas de navegador se realizan en Chrome con vistas móviles emuladas; no equivalen a una comprobación en dispositivos físicos, Safari o Firefox. Los tiempos dependen del equipo y no garantizan los mismos FPS en todos los teléfonos.

## Resultado de esta entrega

- 20 experiencias registradas: 5 Halloween, 5 Día de Muertos y 10 en los demás temas.
- Revisión visual inicial y revisión posterior a correcciones: 43 capturas finales, incluyendo 360 × 640, 390 × 844 y 1365 × 900.
- 20 interacciones verificadas; 20 HTML descargables ejecutados y repetidos en Chrome.
- 60 combinaciones de modo de texto/enlace/HTML verificadas; foto local y restauración de la imagen comprobadas.
- Regresión del proyecto: 93 escenas renderizadas, controles de teclado y limpieza, creación y visor, pausa y repetición, colores, tipografías, navegación y reintento de carga.
- 110 URLs públicas comprobadas, sin enlaces rotos. Ningún error de consola en las suites terminadas.
- Medición local final a resolución de escena móvil: peor promedio de 15.585 ms por cuadro. Es una medición de este ordenador, no de un teléfono físico.
