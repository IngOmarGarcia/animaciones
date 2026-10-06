# Segunda auditoría de ViralCSS, después de las correcciones

4 de octubre de 2026, horario de México. Comparación con `ADSENSE-SECOND-REVIEW-AUDIT.md` y `ADSENSE-SCENE-INVENTORY.md`, conservados como evidencia anterior. Cambios locales autorizados; **sin push, despliegue ni solicitud a Google**.

Actualización posterior con las condiciones del propietario: Acerca identifica a OGR y se añadió Términos de Uso. El proyecto local ahora tiene **105 páginas indexables y 105 URLs en sitemap**, conservando las 87 escenas. Las cifras de 104 páginas en las evidencias públicas anteriores corresponden a la versión publicada, todavía sin estos cambios.

## Dictamen

Las correcciones técnicas y editoriales están implementadas en el proyecto y pasan las pruebas descritas abajo. Se conservan exactamente los **87 identificadores públicos**, las experiencias, la personalización, las fotografías, compartir, descargas y navegación. No se redujeron geometrías, materiales, iluminación ni densidades de las escenas. La modalidad estática solo se activa por la preferencia de movimiento reducido; el usuario puede solicitar el movimiento completo.

**No recomiendo enviar todavía la segunda solicitud desde la versión pública actual.** Producción no contiene estas correcciones. Las decisiones de responsable público y reutilización del código ya fueron recibidas e implementadas: OGR, creador y administrador; uso personal, educativo y experimental. Falta autorizar el despliegue y verificar de nuevo la versión publicada. No se identificó un bloqueo técnico local restante en las comprobaciones realizadas; esta conclusión no certifica cumplimiento legal completo, estado de la cuenta ni aprobación de AdSense.

## CRÍTICO

No se confirmó una infracción crítica activa en el proyecto: no se encontraron anuncios que tapen contenido, botones que simulen anuncios, páginas indexables vacías o enlaces internos rotos. No se activó publicidad ni consentimiento ficticio.

## IMPORTANTE: comparación individual

| Hallazgo anterior | Estado después | Implementación / pendiente |
| --- | --- | --- |
| I1: 14 fichas con contexto genérico | Corregido localmente | `js/recent-guides.js` contiene escena, gesto y uso específicos, contrastados con los motores. Se regeneraron las fichas, sin cuotas artificiales de palabras. |
| I2: «abrir recuerdos» donde no existen | Corregido localmente | `modeLabelFor` reserva esa descripción a escenas con carta/recuerdos; las demás indican explorar la escena o su gesto real. |
| I3: Grimorio/Herbario prometían deslizar | Corregido localmente | Guías, catálogo e instrucciones dentro de Canvas indican tocar para mover páginas/elevar ejemplares. Pan indica separar una porción. Se revisaron también las otras 11 guías recientes. El campo de foto del Retrato ya no se denomina «portal». |
| I4: canonical/sitemap/OG/schema discrepaban con producción | Corregido localmente; publicación pendiente | Las 104 URLs indexables usan `https://viralcss.com` sin `.html`. JSON-LD y OG coinciden. Los archivos físicos y enlaces locales siguen funcionando; los enlaces internos se normalizan en producción. No se retiró la compatibilidad del alojamiento con URLs antiguas, comprobada en público. |
| I5: CLS en portada y editor | Corregido en laboratorio | Primera página de 40 tarjetas ya presente en HTML; espacio de navegación reservado; editor se presenta tras inicializar campos. Los filtros reservan su espacio. Se mantiene 40/40/7 y el diseño. |
| I6: responsable poco claro y aviso de foto incompleto | Corregido localmente | Privacidad incluye Jardín y Retrato, tratamiento local, enlaces accesibles a terceros y ausencia de reconocimiento facial. Acerca identifica a OGR como creador y administrador, conservando el correo publicado. |
| I7: términos y licencia no definidos | Corregido localmente | `terminos.html` recoge únicamente las condiciones proporcionadas por el propietario. Enlazado en los footers, Acerca, FAQ y código; aviso en descargas. No se inventaron jurisdicción, domicilio, exenciones o permisos adicionales. |
| I8: bloqueo táctil en todas las escenas | Corregido en código y emulación | `pan-y` para escenas de toque/mantener. Captura completa reservada a Catrina, Retrato, Eclipse, Guitarra y mundos que requieren arrastre. Falta validación en un teléfono físico. |
| I9: movimiento reducido inconsistente | Corregido localmente | Política común en reproductor, galerías, editor, visor y HTML descargado: imagen del mismo renderizador sin RAF continuo, revelación del texto y opción explícita de reproducir con movimiento. Cambio de preferencia y limpieza de recursos contemplados. |
| I10: dedicatorias solo en Canvas | Corregido para el contenido textual | Representación accesible de nombre, mensaje, firma, carta y recuerdos, coordinada con la revelación y excluida en Sin texto. El dibujo artístico permanece intacto. No se afirma accesibilidad completa de toda exploración espacial. |

Las guías nuevas corresponden a Mansión, Telaraña, Grimorio, Carrusel, Catrina, Pan, Retrato, Bordado, Herbario, Eclipse, Máquina de dulces, Taller, Guitarra y Escalera. El [inventario posterior](ADSENSE-SCENE-INVENTORY-AFTER.md) documenta las 87 escenas y sus identificadores.

## MEJORA

| Hallazgo | Resultado |
| --- | --- |
| M1: reporte de errores poco explicado | Sugerencias explica qué escena, dispositivo, navegador y pasos aportar, evitando publicar información privada y sin prometer tiempos de respuesta. El contacto existente se conserva. |
| M2: saltos y alternativas accesibles | Saltar al contenido unificado en páginas informativas y utilidades; dedicatorias accesibles añadidas. Teclado básico conservado. La exploración espacial completa por coordenadas sigue sin certificación ni alternativas exhaustivas. |
| M3: instrucción muy pequeña en Canvas | Tamaño mínimo 11 px, contraste más legible y ajuste a dos líneas. La explicación HTML continúa fuera del lienzo. Revisado visualmente en editor móvil. |
| M4: logo/favicon sobredimensionados | Logo WebP 144 × 96, favicon PNG 48 × 48. Archivos usados: 34.685 bytes frente a 110.973 anteriores, ahorro aproximado del 69 %. Originales conservados; manifiesto corregido a la dimensión real de su icono de 180 × 180. |
| M5: herramientas públicas y procedencia de assets | Se mantienen noindex/nofollow y fuera del sitemap. Separar herramientas del paquete público y documentar licencias externas continúa pendiente; no se borraron recursos ni funcionalidades. |
| M6: prueba SEO repetía la URL equivocada | Prueba ahora exige rutas limpias, coherencia de OG/schema/sitemap, archivos existentes y exclusión de utilidades/escenas ocultas. Herramienta pública contrasta URL final y canonical. Informes anteriores conservados. |
| M7: indexación real no comprobada | Pendiente de Search Console del propietario. Un resultado `site:` vacío no demuestra ausencia de indexación. |

## CORRECTO y comprobaciones repetidas

- **Inventario y contenido:** 87 escenas, 12 categorías, 105 páginas públicas locales tras añadir Términos; mismos identificadores que el inventario anterior. Guías útiles en HTML, contenidos relacionados, H1, títulos y descripciones únicos. No se añadieron párrafos para rellenar SEO.
- **SEO:** `node tools/check-seo.mjs`: 105 páginas / 105 URLs / cero enlaces internos rotos; canonical, OG, datos estructurados, robots, noindex intencionados y sitemap verificados. Rutas viejas no eliminadas. La indexación efectiva sigue siendo una comprobación de cuenta.
- **Regresiones:** `node tools/check-regressions.mjs`: 93 módulos importables y siete recuerdos a longitud máxima.
- **Personalización:** `node tools/check-personalization.mjs`: cinco tipografías, 29 escenas con colores, serialización de enlaces y HTML descargable.
- **Variantes:** `node tools/check-turtle.mjs`: 14 escenas, 42 combinaciones de enlace/HTML y edad; `node tools/check-seasonal-text.mjs`: 30 combinaciones de frases, texto propio y Sin texto.
- **Navegador normal:** `node tools/browser-check.mjs`: las 87 escenas renderizan, con gestos, teclado y limpieza; portada 40/40/7, filtros, editor → compartir → visor, restauración, Atrás, pausa/reinicio y reintento de importación. Sin errores de ejecución.
- **Modo reducido y accesibilidad:** `node tools/adsense-browser-audit.mjs --corrections`: 87/87 escenas permanecen reveladas y estáticas; activación voluntaria del movimiento, texto largo accesible, firma, Sin texto, estilos táctiles, guías corregidas y HTML descargado con equivalente textual.
- **Lote reciente:** `node tools/browser-check.mjs --turtle`: interacción, dedicatorias largas, Sin texto, foto sintética y exportación; capturas de varios momentos y tamaños; mediciones sintéticas de renderizado. Se revisaron las capturas de composición y tipografía; no se declara validación manual de cada frame de las 87 experiencias.
- **Renderizado alternativo:** `node tools/cinematic-check.mjs --all`: 14 escenas con cuadros a 0, 3, 6, 9 y 12 segundos y muestras intermedias, Canvas de respaldo, textos y estabilidad de movimiento reducido. Sin errores de ejecución/GPU registrados; capturas individuales en `tools/review/cinema/`.
- **Móvil y escritorio:** `node tools/adsense-browser-audit.mjs --local`: 24 visitas a 390 × 844 y 1365 × 1000. Portada, catálogo, fútbol, muertos, Mansión, Retrato, Acerca, privacidad, sugerencias, editor y errores. Sin desbordamiento horizontal ni excepciones. La ruta deliberadamente inexistente devuelve el 404 esperado; el servidor local no replica la página 404 de Cloudflare.
- **Salida de enlace inválido:** se detectó un salto residual del footer en la pasada completa y se corrigió su presentación durante la inicialización. La repetición `--local --errors` dio CLS 0 en ambos tamaños, sin excepciones; evidencia en `adsense-browser-after-errors.json`.
- **Inspección visual:** capturas de portada, footer, fichas, editor y páginas informativas en ambos tamaños; repetición tras corregir espacio de filtros e instrucciones. Logo nítido, navegación y controles legibles; sin rediseño de las escenas.
- **Producción:** nueva consulta de 121 rutas y recursos, conservada en `tools/review/adsense-public-after.json`. Las 104 páginas indexables continúan en 200; dos 404 de prueba esperados; recursos reales públicos disponibles. La versión pública todavía muestra 103 canonical antiguas `.html`: evidencia de que las correcciones locales no están desplegadas, no un fallo del generador nuevo.
- **Confianza/publicidad:** contacto real conservado, privacidad específica ampliada, herramientas fuera de indexación. Se mantienen meta de asociación y ads.txt existentes; sin insertar anuncios, huecos publicitarios ficticios o consentimiento que afirme permisos no obtenidos.
- **Términos y responsable:** revisión adicional de Términos, Acerca y código en móvil/escritorio: seis visitas sin excepciones ni desbordamiento. Capturas revisadas y enlaces comprobados. Se repitieron las 87 escenas y las pruebas de exportación después de integrar las condiciones. Evidencia en `adsense-browser-after-terms.json`.

Las evidencias de navegador y capturas están en `tools/review/` y no se incluyen en Git. Las herramientas se conservaron para repetir las pruebas después de un despliegue autorizado.

## Rendimiento y estabilidad

| Medición de escritorio | Antes | Después |
| --- | ---: | ---: |
| CLS portada | 0,2490 | 0 |
| CLS editor del Retrato | 0,2241 | 0 |
| CLS catálogo | 0,0398 | 0 |
| CLS categoría fútbol | 0,0196 | 0 |
| CLS visor con enlace inválido | 0,7285 | 0 |

En móvil las páginas de la muestra mantienen CLS 0. Son resultados de laboratorio y ventanas concretas de observación, no percentiles CrUX, INP real o garantías universales. No se comparan bytes locales sin compresión con transferencias públicas comprimidas. El ahorro de imágenes se calcula sobre archivos, sin atribuirlo a todos los recursos de la página.

La comprobación adicional de las condiciones dio CLS 0 en Términos y Acerca. En la utilidad de código se observó CLS de escritorio 0,1507 durante su inicialización dinámica, sin errores ni desbordamiento; queda como mejora de estabilidad pendiente, fuera de los ajustes de portada/editor ya comprobados. No se obtuvo una medición anterior equivalente de esa utilidad para atribuir la diferencia a un cambio concreto.

Se conserva la carga diferida de vistas previas, límite de reproductores visibles y liberación al abandonar páginas. No se añadieron miles de nodos DOM ni se cambió la infraestructura artística. No se observó un fallo de limpieza en las regresiones; no se realizó un perfil prolongado de memoria, temperatura o FPS en teléfonos reales.

## Decisiones recibidas y acciones pendientes

1. **Responsable público, resuelto:** OGR, creador y administrador de ViralCSS; se conserva `viralcss11@gmail.com` por indicación del propietario.
2. **Reutilización del código, resuelto:** descarga, ejecución, estudio y modificación únicamente personales, educativas y experimentales. Sin permiso por defecto para uso comercial, venta, redistribución o republicación en otra colección/plataforma. Autorización necesaria para uso comercial o redistribución; atribución a ViralCSS para derivados públicos. Derechos originales de OGR/ViralCSS. Esto no certifica las licencias de recursos externos.
3. **Publicación:** autorización explícita para push/despliegue. Después, repetir rutas y metadatos públicos, probar enlaces antiguos, fotografías y compartir, y comprobar que las guías/privacidad nuevas se sirven realmente.
4. **Cuenta:** revisar en Search Console sitemap, canonical elegida e inspección de portada/categoría/fichas; consultar la causa exacta del primer rechazo y estado del dominio en AdSense. No se accedió a esas cuentas.
5. **Antes de activar anuncios:** configurar consentimiento cuando corresponda al público y los productos publicitarios; mantener anuncios separados de controles y escena, con dimensiones reservadas. No se activaron todavía y no se afirma que la ausencia actual de un banner sea una infracción.
6. **Validación adicional recomendable:** teléfono físico, Safari y lector de pantalla real; inventario documentado de recursos/licencias y exclusión de herramientas del despliegue si se decide cambiar el empaquetado.

La preparación sigue las recomendaciones de [calidad de AdSense](https://support.google.com/adsense/answer/7299563?hl=es), [contenido con valor para el usuario](https://support.google.com/publisherpolicies/answer/11112688?hl=en), [privacidad](https://support.google.com/publisherpolicies/answer/10437794?hl=es-419), [ubicación de anuncios](https://support.google.com/adsense/answer/1346295/ad-placement-policies?hl=en-GB) y [consentimiento para anuncios en regiones aplicables](https://support.google.com/adsense/answer/13554116?hl=en-GB). Canonicalización: [Google Search](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=es); CLS: [web.dev](https://web.dev/articles/cls?hl=es). No hay una cuota de palabras ni una promesa de aprobación derivada de estos resultados.
