# Configuración publicitaria — 19 de octubre de 2026

## Estado

La integración está preparada, pero no activada: faltan los IDs de bloques, la publicación de la CMP certificada y la aprobación del sitio en AdSense. No se ha solicitado una nueva revisión ni se ha modificado la información de pagos. Los marcadores de localhost no son anuncios reales.

## Ubicaciones

- Solo portada pública, con `cat` como único parámetro opcional y una categoría válida. Otras consultas o rutas quedan excluidas por `js/ad-policy.js`.
- Editor, página de código y visor de dedicatorias no incluyen `js/ads.js` ni espacios publicitarios. La exclusión alcanza también sus salidas de error, enlaces rotos y escenas sin código descargable.
- Portada con menos de cuatro escenas filtradas: sin anuncios ni carrusel de productos. Entre cuatro y nueve: un bloque inferior y hasta tres productos. Desde diez: espacios completos. Estos umbrales son decisiones del sitio, no reglas numéricas de Google.
- Lateral 160×600: escritorio de al menos 1280×800. Una única unidad sticky, entra con el flujo de desplazamiento y se oculta cuando no cabe. Ancho interior mínimo de 160 píxeles.
- El bloque inferior está después del contenido y productos, separado del apoyo voluntario. La contribución nunca se vincula a hacer clic en anuncios.
- No hay anuncios automáticos, actualizaciones por temporizador ni anuncios superpuestos a Canvas o controles.

## Consentimiento

1. En AdSense, completar los pendientes de cuenta, pagos y estado del sitio. El rechazo por contenido de bajo valor requiere revisión de Google después del despliegue; no se da por resuelto solo por pasar pruebas técnicas.
2. En Privacidad y mensajería, configurar y publicar una CMP certificada apropiada para el tráfico del sitio. Configurar los proveedores y ofrecer las opciones de consentimiento y gestión posterior que exija la CMP. No habilitar Auto Ads para suplir los bloques manuales.
3. Si la CMP requiere su propio código de instalación, obtenerlo de la cuenta y añadirlo solo en la portada pública. Debe iniciarse antes del cargador publicitario: no depender de cargar primero `adsbygoogle.js` para que aparezca la CMP.
4. Verificar la API `__tcfapi` y las señales en visitas reales o herramientas oficiales, incluidas aceptación, rechazo, retirada, falta de señal y usuarios fuera del ámbito del RGPD. Las pruebas locales con señales simuladas no acreditan una CMP publicada.
5. Solo entonces cambiar `consentVerified` a `true` en `js/ads.js` y configurar los IDs reales de unidades de display. Mantenerla en `false` hasta completar esa verificación.

El cargador no fabrica señales de consentimiento. Para tráfico al que la CMP indique que no se aplica RGPD, requiere una respuesta cargada válida. Para tráfico al que se aplica, este sitio opta por solicitar anuncios solo cuando la CMP comunique consentimiento para almacenamiento y publicidad personalizada, además de Google como proveedor. No se utiliza como alternativa publicidad limitada o no personalizada ante una negativa. Google procesa las señales del TCF mediante su integración oficial.

La retirada de consentimiento desconecta solicitudes pendientes y elimina los bloques existentes. Las solicitudes iniciadas antes de la retirada no pueden deshacerse; la CMP y Google son responsables de su gestión posterior. No se prometen borrado de cookies o cumplimiento jurídico integral mediante este código.

## Políticas consultadas

- [Datos personales en URLs](https://support.google.com/adsense/answer/6156630?hl=es).
- [Emplazamiento y comunicaciones privadas](https://support.google.com/adsense/answer/1346295?hl=es).
- [Pantallas sin contenido del editor](https://support.google.com/publisherpolicies/answer/11112688?hl=en). «Under construction» se refiere a pantallas inacabadas; no implica que toda herramienta de edición web esté prohibida. La exclusión del editor es una decisión de diseño que también evita URLs personales.
- [Proporción de publicidad y promociones](https://support.google.com/publisherpolicies/answer/11169917?hl=es).
- [CMP certificada](https://support.google.com/adsense/answer/13554116?hl=es).
- [Anuncios sticky](https://support.google.com/adsense/answer/10734935?hl=en).
- [Dimensiones explícitas del código adaptable](https://support.google.com/adsense/answer/9183363?hl=es).

## Validación

`tools/check-ad-policy.mjs` comprueba rutas excluidas, densidad, bloqueo por consentimiento desconocido o denegado y retirada del consentimiento. `tools/browser-check.mjs --ad-policy` revisa la disposición móvil/escritorio y la lógica de producción en un Chrome aislado; intercepta los recursos y sustituye el servidor de anuncios por un stub local. No contacta al servidor publicitario ni genera impresiones reales. `--ad-placements` comprueba la exclusión en utilidades y errores. Las pruebas del resto del sitio cubren galería, paginación, personalización y enlaces.

La revisión y aprobación definitivas corresponden a Google. No se inventan IDs de unidad ni se afirma que la cuenta tenga configurada la CMP.
