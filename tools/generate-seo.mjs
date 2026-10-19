import { mkdir, writeFile } from 'node:fs/promises';
import { VISIBLE_ANIMATIONS as animations, CATEGORIES } from '../js/catalog.js';
import { guideFor, modeLabelFor, relatedAnimations } from '../js/scene-guides.js';
import { CATEGORY_GUIDES } from '../js/category-guides.js';
import { EMOTIONAL_ANIMATIONS, EMOTIONAL_SCENES } from '../js/emotional-catalog.js';
import { CATEGORY_HELP, EMOTIONAL_CONTEXT } from '../js/editorial-guides.js';
import { orderHomeCategories } from '../js/home-categories.js';

const origin = 'https://viralcss.com';
const onlyIds=new Set(process.argv.find(s=>s.startsWith('--only='))?.slice(7).split(',').filter(Boolean)||[]);
const publicPath = path => path.replace(/\.html$/, '');
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const aurl = a => `/animaciones/${a.id}.html`;
const curl = id => `/categorias/${id}.html`;
const edit = a => `/crear.html?a=${a.id}`;
const categories = CATEGORIES.filter(c=>c.id!=='todas' && animations.some(a=>a.category===c.id));
const cname = id => categories.find(c=>c.id===id).name.replace(/^[^\p{L}\p{N}]+/u,'');
const poster = a => `/img/previews/${a.id}.webp`;
const emotional = new Map(EMOTIONAL_SCENES.map(scene=>[scene.id,scene]));
const posterImage = (a,detail=false) => `<img class="scene-poster" src="${poster(a)}" alt="Vista de ${esc(a.title)}" width="320" height="426"${detail?' fetchpriority="high"':' loading="lazy"'} decoding="async">`;
const particleNames = new Set(['corazon-de-girasoles','flor-holografica','cascada-de-petalos-invertida','corazon-de-energia','constelacion-con-tu-nombre','fuegos-con-tu-nombre']);
const shortNames = new Set(['corazon-de-energia','constelacion-con-tu-nombre','fuegos-con-tu-nombre']);
const options = a => a.emotional?'Frase de partículas · Ritmo y brillo ajustables':`${a.seasonalText||a.cinematic?'Frases o sin texto':a.letterFields?'Carta y recuerdos':'Nombre y mensaje'}${a.colorControls?' · Colores editables':a.colorDefaults?' · Dos colores':''}`;
function card(a) {
 const g=guideFor(a);
 return `<article class="card" data-id="${a.id}" data-mode="${g.mode}" data-color="${!!a.colorDefaults}" data-letter="${!!a.letterFields}"><a class="card-preview-link" href="${aurl(a)}" aria-label="Ver ${esc(a.title)}"><div class="thumb">${posterImage(a)}<canvas aria-hidden="true"></canvas><span class="badge">${modeLabelFor(a)}</span></div></a><div class="card-body"><h3><a href="${aurl(a)}">${esc(a.title)}</a></h3><p>${esc(a.description)}</p><p class="card-options">${options(a)}</p><div class="card-links"><a href="${aurl(a)}">Ver escena y detalles</a><a href="${edit(a)}">Personalizar<span class="sr-only"> ${esc(a.title)}</span> →</a></div></div></article>`;
}
const controls = `<div class="collection-controls" data-pending><label>Buscar por función <select data-filter><option value="all">Todas las escenas</option><option value="auto">Se reproducen solas</option><option value="interactive">Con interacción</option><option value="color">Con colores editables</option><option value="letter">Con carta y recuerdos</option></select></label><button class="btn btn-ghost" type="button" data-motion>Pausar miniaturas</button><p data-count role="status"></p></div>`;
function grid(list) {return `<div class="grid" data-gallery>${list.map(card).join('\n')}</div>`;}
function template({title,description,path,body,schema,script='collection',id='',image=`${origin}/img/og.jpg`}) {
 return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description.slice(0,160))}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description.slice(0,160))}"><meta property="og:image" content="${origin}/img/og.jpg"><meta property="og:url" content="${origin}${publicPath(path)}"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#0b1020"><link rel="canonical" href="${origin}${publicPath(path)}"><link rel="icon" href="/img/favicon.png" type="image/png"><link rel="stylesheet" href="/css/styles.css"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script></head><body${id?` data-animation="${id}"`:''}><a class="skip-link" href="#contenido">Saltar al contenido</a><header class="site-header"><a class="brand" href="/">Viral<span>Css</span></a><nav class="header-desktop-nav" aria-label="Navegación principal"><a href="/animaciones.html">Animaciones</a><a href="/acerca.html">Acerca</a><a href="/sugerencias.html">Sugerencias</a></nav></header><noscript><style>@media(max-width:699px){.site-header .header-desktop-nav{display:flex!important}.site-header::after{display:none!important}}</style></noscript><main id="contenido" class="container content-page">${body}</main><footer class="site-footer"><span>ViralCss · Crea y comparte una escena</span><div><a href="/acerca.html">Acerca y contacto</a><a href="/privacidad.html">Privacidad</a><a href="/terminos.html">Términos de Uso</a><a href="/animaciones.html">Todas las animaciones</a></div></footer><script type="module" src="/js/${script}.js"></script><script type="module" src="/js/support.js"></script></body></html>`;
}
function layout(config) {
 return template(config).replace(`<body data-animation="${config.id}">`,`<body${emotional.has(config.id)?' class="emotional-experience"':''} data-animation="${config.id}">`).replace('property="og:image" content="https://viralcss.com/img/og.jpg"',`property="og:image" content="${config.image||`${origin}/img/og.jpg`}"`).replace('<a class=\"brand\" href=\"/\">Viral<span>Css</span></a>',"<a class=\"brand\" href=\"/\" aria-label=\"ViralCSS — Ir al inicio\"><img class=\"brand-static\" src=\"/img/logo.webp\" alt=\"\" width=\"72\" height=\"48\"><span class=\"brand-name\">Viral<span class=\"accent\">Css</span></span></a>").replace(/></g,'>\n<')+'\n';
}
function categoryHelp(id) {
 const help=CATEGORY_HELP[id];if(!help)throw Error(`Falta guía de uso: ${id}`);
 return `<section class="selection-guide category-help"><h2>${esc(help.title)}</h2>${help.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}<h3>${esc(help.question)}</h3><p>${esc(help.answer)}</p><p>También puedes explorar ${help.related.map(key=>`<a href="${curl(key)}">${esc(cname(key))}</a>`).join(' y ')}.</p></section>`;
}
function messageExample(a) {
 const scene=emotional.get(a.id);
 if(scene)return `<section class="scene-story" aria-labelledby="phrase-heading"><h2 id="phrase-heading">La frase de esta experiencia</h2><blockquote class="scene-quote"><p>${esc(scene.phrase)}</p></blockquote><p>${esc(EMOTIONAL_CONTEXT[a.id])}</p><dl class="scene-facts"><div><dt>Intención</dt><dd>${esc(scene.intention)}</dd></div><div><dt>Secuencia de referencia</dt><dd>Aproximadamente ${scene.duration} segundos con la velocidad original. La figura o las partículas siguen en movimiento al terminar.</dd></div></dl></section>`;
 return `<section class="scene-story"><h2>Un mensaje para probar</h2><blockquote class="scene-quote"><p>${esc(a.defaultMessage)}</p></blockquote><p>Es el mensaje de muestra de ${esc(a.title)}. Puedes reemplazarlo en el editor y comprobar cómo se lee durante la secuencia antes de compartir.</p></section>`;
}
const breadcrumb = entries => ({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:entries.map(([name,url],i)=>({'@type':'ListItem',position:i+1,name,item:origin+publicPath(url)}))});
function personalization(a) {
 if(a.emotional)return `<ul><li>Selecciona una de las experiencias de frases. La frase, la tipografía y el desenlace conservan su composición original.</li><li>Dos colores, brillo, velocidad y densidad de partículas con límites que protegen la lectura.</li><li>${a.allowName?'Nombre opcional de hasta 24 caracteres, formado con partículas al terminar la frase.':'Esta experiencia conserva únicamente la frase; no admite nombres ni mensajes libres.'}</li></ul>`;
 const items=[];
 if(a.collection==='autumn') {
  items.push('Nombre opcional de hasta 40 caracteres, dedicatoria de hasta 140 y firma. El texto acompaña la escena sin reemplazar su protagonista.');
  items.push('Sin texto oculta nombre, mensaje y firma. Los materiales y la dirección artística se conservan.');
 } else if(a.cinematic) {
  items.push('Nombre o título opcional de hasta 40 caracteres y mensaje de hasta 140, con tipografía integrada en la composición. Puedes editar la frase inicial o dejarla vacía.');
  items.push('Sin texto muestra solo la obra y oculta el nombre, la dedicatoria y la firma. La escena conserva sus materiales y efectos.');
 } else if(a.seasonalText) {
  items.push('Frase sugerida editable, texto propio de hasta 140 caracteres o Sin texto. Esta última opción oculta también el título y la firma.');
  items.push(a.turtleIndex!==undefined?'Nombre o título opcional de hasta 40 caracteres, integrado en la composición sin reemplazar su protagonista.':'Título opcional de hasta 40 caracteres: las partículas lo forman después de dispersarse. Sin título, reconstruyen la figura.');
 } else {
  items.push(particleNames.has(a.id)?`Nombre breve: la propia escena forma letras (hasta ${shortNames.has(a.id)?12:32} caracteres dentro de la figura).`:`Nombre y mensaje de hasta 40 y 140 caracteres en el formulario.${a.nameInScene?' La composición también utiliza el nombre; uno breve evita recortes.':''}`);
  if(a.id==='origami-amarillo')items.push('La frase se dibuja dentro de una tarjeta con un máximo de cinco líneas. Conviene probar un mensaje corto.');
 }
 items.push('Firma opcional y cinco tipografías para el texto normal. Las letras construidas con partículas conservan su forma.');
 if(a.ageField) items.push('Edad opcional de 1 a 999, construida con dulces. Sin edad se dibuja un motivo festivo de siete brazos.');
 if(a.photoField) items.push('Foto opcional preparada en el navegador y conservada dentro del enlace. Sin foto permanecen las escenas de memoria. No se usa reconocimiento facial.');
 if(a.letterFields) items.push(a.id==='jardin-de-lunas'?'Título y texto de la carta, siete recuerdos y una foto opcional. Los recuerdos acompañan el recorrido por las islas y la carta se abre en el corazón final.':'Título y texto de la carta, y recuerdos separados por el signo |. El destinatario abre la carta al terminar la secuencia.');
 if(a.colorControls) items.push('Colores editables para materiales, partículas, iluminación y texto según la escena, con restablecimiento de la paleta original.');
 else if(a.colorDefaults) items.push('Dos colores opcionales para los elementos de luz. Puedes desactivar la paleta personalizada para recuperar el diseño original; el fondo y algunos detalles mantienen sus colores.');
 return `<ul>${items.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`;
}
await mkdir('animaciones',{recursive:true}); await mkdir('categorias',{recursive:true});
const catalogBody=`<nav class="breadcrumbs" aria-label="Ruta"><a href="/">Inicio</a> / Animaciones</nav><h1>Elige una escena antes de dedicarla</h1><p class="lead">Prueba una animación, prepara tu mensaje y compártelo por enlace.</p><nav class="category-links catalog-category-strip" aria-label="Categorías; desliza para ver más">${orderHomeCategories(categories,animations).map(c=>`<a href="${curl(c.id)}">${esc(c.name)}</a>`).join('')}</nav>${controls}${grid(animations)}<section class="selection-guide"><h2>Cómo preparar una dedicatoria</h2><ol><li>Abre una ficha para probar la secuencia y conocer el gesto que necesita.</li><li>Entra en Personalizar. Las frases de partículas conservan sus palabras; las escenas con mensaje editable permiten escribir el tuyo.</li><li>Mira la vista previa hasta el final, crea el enlace y envíalo. El destinatario no necesita registrarse.</li></ol><p>Para contar una historia con varios recuerdos, busca Carta y recuerdos. Para un saludo inmediato, una escena automática empieza sin pedirle un gesto al destinatario.</p></section>`;
await writeFile('animaciones.html',layout({title:'Animaciones para personalizar y compartir | ViralCss',description:'Compara animaciones por interacción, cartas, recuerdos y colores. Prueba cada escena antes de crear y compartir tu dedicatoria.',path:'/animaciones.html',body:catalogBody,schema:breadcrumb([['Inicio','/'],['Animaciones','/animaciones.html']])}));
for(const c of categories) {
 if(onlyIds.size&&!animations.some(a=>onlyIds.has(a.id)&&a.category===c.id))continue;
 const guide=CATEGORY_GUIDES[c.id]; if(!guide) throw Error(`Falta guía ${c.id}`);
 const list=animations.filter(a=>a.category===c.id);
 const body=`<nav class="breadcrumbs" aria-label="Ruta"><a href="/">Inicio</a> / <a href="/animaciones.html">Animaciones</a> / ${esc(cname(c.id))}</nav><h1>${esc(cname(c.id))}: encuentra tu escena</h1><p class="lead">${esc(guide.intro)}</p><h2>${list.length===1?'Una experiencia para esta ocasión':'Escenas de esta categoría'}</h2>${list.length>3?controls:''}${grid(list)}${categoryHelp(c.id)}<section class="selection-guide"><h2>Qué distingue estas escenas</h2><ul>${guide.picks.map(([id,reason])=>{const a=animations.find(a=>a.id===id);if(!a)throw Error(id);return `<li><a href="${aurl(a)}">${esc(a.title)}</a>: ${esc(reason)}</li>`;}).join('')}</ul><p>${esc(guide.advice)}</p></section><p><a href="/animaciones.html">Explorar todas las categorías →</a></p>`;
 await writeFile(`categorias/${c.id}.html`,layout({title:`${cname(c.id)}: escenas, interacción y opciones | ViralCss`,description:guide.intro,path:curl(c.id),body,id:c.id==='expert-zone'?'expert-zone':'',schema:breadcrumb([['Inicio','/'],['Animaciones','/animaciones.html'],[cname(c.id),curl(c.id)]])}));
}
for(const a of animations) {
 if(onlyIds.size&&!onlyIds.has(a.id))continue;
 const g=guideFor(a); const interactive=g.mode!=='auto'&&!a.cinematic;
 const body=`<nav class="breadcrumbs" aria-label="Ruta"><a href="/">Inicio</a> / <a href="${curl(a.category)}">${esc(cname(a.category))}</a> / ${esc(a.title)}</nav><p class="eyebrow">${esc(cname(a.category))} · ${modeLabelFor(a)}</p><h1>${esc(a.title)}</h1><p class="lead">${esc(a.description)}</p><p><a class="btn btn-primary" href="${edit(a)}">Personalizar esta escena</a></p><div class="detail-layout"><section class="preview-panel"><h2>Prueba la escena</h2><div class="scene detail-scene"><canvas id="detail-canvas" aria-label="${esc(a.title)}: ${esc(g.interaction)}"${interactive?' tabindex="0" role="button"':''}></canvas><div class="overlay" id="detail-overlay"><span class="ov-to" id="ov-to"></span><p class="ov-msg" id="ov-msg"></p><span class="ov-from" id="ov-from"></span></div><button id="detail-play" class="btn btn-primary" type="button">Cargar vista previa</button></div><div class="preview-controls"><button class="btn btn-ghost" id="detail-pause" hidden type="button">Pausar</button><button class="btn btn-ghost" id="detail-replay" hidden type="button">Reiniciar</button></div><p id="detail-status" class="hint" role="status">La vista previa usa texto de ejemplo. Se carga cuando la solicitas.</p><p>${esc(g.interaction)}</p>${interactive?'<p class="hint">Puedes tocar la escena o usar Intro o Espacio con el lienzo enfocado. En una pulsación mantenida, conserva la tecla presionada.</p>':''}</section><div class="detail-copy"><section><h2>Qué ocurre en la escena</h2><p>${esc(g.scene)}</p></section><section><h2>Qué puedes personalizar</h2>${personalization(a)}</section><section><h2>Qué verá el destinatario</h2><p>${a.letterFields?'El enlace abre la escena y su recorrido con recuerdos. La carta queda disponible al final; el destinatario puede leerla en la misma pantalla.':a.seasonalText?'El enlace muestra la figura, la frase y los colores elegidos. Si seleccionas Sin texto, recibe la animación sin título, mensaje ni firma.':'El enlace abre esta misma animación con tu nombre, frase y firma. No necesita crear una cuenta ni instalar una aplicación.'}</p><p>${esc(g.use)}</p><p>El editor genera un enlace para copiar o compartir por WhatsApp. Quien tenga ese enlace puede abrirlo: evita incluir información privada.</p><a class="btn btn-primary" href="${edit(a)}">Crear con ${esc(a.title)}</a>${!a.noCode&&a.id!=='jardin-de-lunas'?` <a href="/codigo.html?a=${a.id}">Ver opción de código</a>`:''}</section></div></div><section><h2>Otras escenas para comparar</h2>${grid(relatedAnimations(a,animations))}<p><a href="${curl(a.category)}">Ver guía de ${esc(cname(a.category))} →</a></p></section>`;
 let detailBody=body.replace(`<p class="lead">${esc(a.description)}</p>`,`<p class="lead">${esc(g.use)}</p>`).replace(`<p>${esc(g.use)}</p>`,'').replace('<div class="detail-copy">',`<div class="detail-copy">${messageExample(a)}`).replace('<canvas id="detail-canvas"',`${posterImage(a,true)}<canvas id="detail-canvas"`);
 if(a.emotional)detailBody=detailBody.replace('El enlace abre esta misma animación con tu nombre, frase y firma. No necesita crear una cuenta ni instalar una aplicación.','El enlace reproduce la frase original con los colores, brillo, velocidad y densidad elegidos. No necesita crear una cuenta ni instalar una aplicación.');
 await writeFile(`animaciones/${a.id}.html`,layout({title:`${a.title}: vista previa y personalización | ViralCss`,description:g.scene,path:aurl(a),body:detailBody,id:a.id,image:origin+poster(a),script:'detail',schema:breadcrumb([['Inicio','/'],[cname(a.category),curl(a.category)],[a.title,aurl(a)]])}));
}
// Solo páginas públicas de descubrimiento. Editor, código y enlaces personales son utilidades sin indexación.
// Se omite lastmod: regenerar HTML no significa que la escena haya cambiado.
const paths=['/','/animaciones.html',...categories.map(c=>curl(c.id)),...animations.map(aurl),'/acerca.html','/privacidad.html','/sugerencias.html','/terminos.html'];
await writeFile('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p=>`\n  <url><loc>${origin}${publicPath(p)}</loc></url>`).join('')}\n</urlset>\n`);
// Static first page avoids late insertion shifting the footer and controls.
const recent=(await import('../js/turtle-catalog.js')).TURTLE_ANIMATIONS;
const seasonal=(await import('../js/seasonal-catalog.js')).SEASONAL_ANIMATIONS;
const ids=new Set([...EMOTIONAL_ANIMATIONS,...recent,...seasonal].map(a=>a.id));
const first=[...EMOTIONAL_ANIMATIONS,...animations.filter(a=>a.cinematic),...recent,...seasonal,...animations.filter(a=>!a.cinematic&&!ids.has(a.id))].slice(0,40);
let home=await (await import('node:fs/promises')).readFile('index.html','utf8');
home=home.replace(/(<div class="grid" id="grid">)[\s\S]*?(<\/div>\s*<p id="gallery-page-status")/, '$1'+first.map(card).join('\n')+'$2');
home=home.replace(/(<div class="chips" id="chips"[^>]*>)[\s\S]*?<\/div>/, '$1'+orderHomeCategories(CATEGORIES,animations).map(c=>'<button type="button" class="chip" aria-pressed="'+(c.id==='todas')+'" title="'+c.count+' animaciones">'+esc(c.name)+'</button>').join('')+'</div>');
home=home.replace(/<p id="categoryGuide">[\s\S]*?<\/p>/,'');
home=home.replace(/(<nav id="side-categories"[^>]*>)[\s\S]*?<\/nav>/,'$1'+orderHomeCategories(CATEGORIES,animations).map(c=>`<a class="side-category" href="${c.id==='todas'?'animaciones.html':`categorias/${c.id}.html`}"><span>${esc(c.name)}</span><small>${c.count}</small></a>`).join('')+'</nav>');
home=home.replace(/(<p id="gallery-page-status"[^>]*>)[\s\S]*?<\/p>/,'$1Mostrando 1–40 de '+animations.length+' animaciones</p>');
home=home.replace(/(<ul class="seo-category-list">)[\s\S]*?<\/ul>/,'$1'+categories.map(c=>`<li><a href="categorias/${c.id}.html">${esc(c.name)}</a></li>`).join('\n')+'</ul>');
home=home.replace(/(id="gallery-more"[^>]*?) hidden/,'$1');
await writeFile('index.html',home);
console.log(`Generadas ${animations.length} fichas y ${categories.length} guías de categorías; ${paths.length} URLs públicas.`);
