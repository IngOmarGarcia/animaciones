// Arma un solo archivo HTML (sin módulos ni dependencias) con la escena real de js/anim/,
// para que la gente pueda copiarlo o descargarlo y abrirlo con doble clic.
import { SITE } from './config.js';
import { textFamily } from './anim/text-style.js';

const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*'\.\/util\.js';?\s*/m;
// Cualquier import de otro módulo local de js/anim/ (una sola sentencia, puede ocupar varias líneas).
const MODULE_IMPORT_RE = /^import\s*\{[^}]*\}\s*from\s*'\.\/([\w-]+)\.js';?[ \t]*$/gm;

async function fetchText(path) {
  const res = await fetch(new URL(path, import.meta.url));
  if (!res.ok) throw new Error(`No se pudo leer ${path} (${res.status})`);
  return res.text();
}

// Separa util.js en declaraciones, cada una con el comentario que tiene encima.
function splitDeclarations(source) {
  const decls = [];
  let comments = [];
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^export (?:const|function) (\w+)/);
    if (match) {
      decls.push({ name: match[1], lines: [...comments, line.slice('export '.length)] });
      comments = [];
    } else if (line.startsWith('//')) {
      comments.push(line);
    } else if (line.trim() && decls.length) {
      decls.at(-1).lines.push(line);
    }
  }
  return decls.map((d) => ({ name: d.name, code: d.lines.join('\n') }));
}

// Solo las funciones que usa la escena, más las que esas funciones usan.
function pickHelpers(decls, names) {
  const needed = new Set(names);
  let grew = true;
  while (grew) {
    grew = false;
    for (const decl of decls) {
      if (!needed.has(decl.name)) continue;
      for (const other of decls) {
        if (!needed.has(other.name) && new RegExp(`\\b${other.name}\\b`).test(decl.code)) {
          needed.add(other.name);
          grew = true;
        }
      }
    }
  }
  return decls.filter((d) => needed.has(d.name)).map((d) => d.code);
}

export async function buildSceneCode(anim, readText = fetchText) {
  if(anim.exportMode==='project')throw new Error(`${anim.title} se exporta como un proyecto ZIP completo mediante project-export.js.`);
  // Algunas escenas cargan archivos externos (por ejemplo una nube de puntos .bin) y no caben
  // en un solo HTML: se marcan con `noCode` en el catálogo.
  if (anim.noCode) throw new Error(`${anim.title} necesita archivos externos y no tiene código descargable.`);
  const [sceneSource, utilSource] = await Promise.all([readText(`./anim/${anim.file}.js`), readText('./anim/util.js')]);

  // Módulos locales que usa la escena, y los que esos módulos usan a su vez (util.js va aparte).
  const modules = new Map();
  const collect = async (source) => {
    for (const [, name] of [...source.matchAll(MODULE_IMPORT_RE)]) {
      if (name === 'util' || modules.has(name)) continue;
      const code = await readText(`./anim/${name}.js`);
      modules.set(name, code);
      await collect(code);
    }
  };
  await collect(sceneSource);

  const names = new Set();
  for (const source of [sceneSource, ...modules.values()]) {
    for (const name of (source.match(IMPORT_RE)?.[1] ?? '').split(',')) if (name.trim()) names.add(name.trim());
  }
  const strip = (code) => code
    .replace(MODULE_IMPORT_RE, '')
    .replace(/^export default function create/m, 'function create')
    .replace(/^export default (seasonal\([\s\S]*?\));?/m, 'const create = $1;')
    .replace(/^export /gm, '')
    .trim();
  return [...pickHelpers(splitDeclarations(utilSource), [...names]), ...[...modules.values()].map(strip), strip(sceneSource)]
    .filter(Boolean).join('\n\n');
}

// JSON.stringify ya da un literal válido de JS; se escapa "<" para que un mensaje no cierre el <script>.
const jsString = (value) => JSON.stringify(value || '').replace(/</g, '\\u003c');
const escapeHtml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function buildStandaloneHtml(anim, card = {}, readText = fetchText) {
  const code = await buildSceneCode(anim, readText);
  const host = new URL(SITE.url).host;
  return `<!doctype html>
<!-- Animación y código original: OGR/ViralCSS.
Uso permitido: descarga, ejecución, estudio y modificación únicamente para fines personales, educativos y experimentales.
Uso comercial, venta, redistribución del código original o modificado y republicación en otra colección/plataforma requieren autorización.
Un trabajo derivado mostrado públicamente debe atribuirse a ViralCSS; la atribución no sustituye los permisos necesarios.
Términos completos: https://viralcss.com/terminos | Contacto: viralcss11@gmail.com -->
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(anim.title)}</title>
<!--
  ${anim.title} · animación original de ViralCss
  Crea la tuya y mándala por WhatsApp con un enlace: ${SITE.url}

  Cómo abrirla: guarda este archivo como ${anim.id}.html y ábrelo con doble clic.
  ${anim.interactive ? 'Toca la pantalla para abrirla.' : 'Toca la pantalla para verla de nuevo.'}
  Para cambiar el nombre o el mensaje, edita PARA, MENSAJE y DE al inicio del <script>.
-->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap">
<style>
  html, body { height: 100%; margin: 0; overflow: hidden; background: #090716; }
  canvas { position: fixed; inset: 0; display: block; width: 100%; height: 100%; }
  .mensaje {
    position: fixed; inset: 0;
    display: flex; flex-direction: column; align-items: center;
    justify-content: ${anim.textPosition === 'top' ? 'flex-start' : 'center'};${anim.textPosition === 'below' ? ' top: 22%;' : ''}
    padding: clamp(24px, 9vw, 72px) 7vw; text-align: center; pointer-events: none;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    text-shadow: 0 2px 14px rgba(0, 0, 0, 0.7), 0 0 2px rgba(0, 0, 0, 0.8);
    opacity: 0; transform: translateY(12px); transition: opacity 1.2s ease, transform 1.2s ease;
  }
  .mensaje.visible { opacity: 1; transform: none; }
  .mensaje p { margin: 0; overflow-wrap: anywhere; }
  .para { color: #ffc300; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; font-size: clamp(0.8rem, 4vw, 1.3rem); }
  .texto { margin-block: 0.15em !important; color: #fff; font: 700 clamp(1.5rem, 9vw, 3.6rem)/1.15 "Dancing Script", "Segoe Script", cursive; text-wrap: balance; }
  .de { color: #ffe8a3; font: 700 clamp(1.05rem, 5.5vw, 2rem) "Dancing Script", "Segoe Script", cursive; }
  .mensaje .para, .mensaje .texto, .mensaje .de { font-family: ${textFamily(card.f)}; }
  ${anim.id === 'galaxia-de-flores' ? `.mensaje { gap: 8px; background: linear-gradient(to bottom, rgba(2,1,6,.72), transparent 48%); }
  .mensaje .texto { font-size: clamp(1.35rem, 6.4vw, 2.4rem); }
  .mensaje .texto.largo { font-size: clamp(1.1rem, 5vw, 1.8rem); }` : ''}
  .firma {
    position: fixed; left: 50%; bottom: 12px; transform: translateX(-50%);
    padding: 4px 12px; border-radius: 999px; background: rgba(0, 0, 0, 0.35);
    color: rgba(255, 255, 255, 0.6); font: 12px system-ui, sans-serif; text-decoration: none; white-space: nowrap;
  }
  .sr-only {position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);}
  .movimiento {position:fixed;top:12px;left:12px;z-index:2;padding:10px;background:#101324;color:white;border:1px solid #777;border-radius:12px;}
  @media(prefers-reduced-motion:reduce){.mensaje{transition:none;transform:none;}}
  .repetir { position: fixed; top: 12px; right: 12px; padding: 8px 14px; border: 1px solid #777; border-radius: 20px; background: #101324; color: white; cursor: pointer; }
</style>
</head>
<body>
<canvas tabindex="0" aria-label="${escapeHtml(anim.title)}"></canvas>
<button id="movimiento" class="movimiento" type="button" hidden>Reproducir con movimiento</button>
<div class="sr-only" id="textoAccesible" role="status" aria-live="polite" hidden></div>
${anim.turtleIndex !== undefined ? '<button class="repetir" id="repetir" type="button">Repetir</button>' : ''}
<div class="mensaje" id="mensaje">
  <p class="para" id="para"></p>
  <p class="texto" id="texto"></p>
  <p class="de" id="de"></p>
</div>
<a class="firma" href="${SITE.url}" target="_blank" rel="noopener">Hecho con 💛 en ${host}</a>

<script>
// ✏️ Cambia aquí el nombre y el mensaje (deja '' para no mostrarlo)
const PARA = ${jsString(anim.seasonalText && card.tm === 'none' ? '' : card.p)};
const MENSAJE = ${jsString(anim.seasonalText && card.tm === 'none' ? '' : anim.seasonalText && card.tm ? card.m : card.m || anim.defaultMessage)};
const DE = ${jsString(anim.seasonalText && card.tm === 'none' ? '' : card.d)};
const MODO_TEXTO = ${jsString(card.tm)};
const TIPOGRAFIA = ${jsString(card.f)};
const CARTA_TITULO = ${jsString(card.lt)};
const CARTA = ${jsString(card.l)};
const FRASES = ${jsString(card.mem)};
const COLOR_1 = ${jsString(card.c1)};
const COLOR_2 = ${jsString(card.c2)};
const TEXTO_APARECE = ${anim.textDelay}; // segundos antes de mostrar el mensaje

// ---------- Animación ----------

${code}

// ---------- Reproductor ----------

const lienzo = document.querySelector('canvas');
// Drag scenes retain both axes; tap/hold scenes allow natural vertical gestures.
lienzo.style.touchAction=${jsString(['catrina-encaje','retrato-historias','eclipse-corona','guitarra-resonancia'].includes(anim.id)?'none':'pan-y')};
const pincel = lienzo.getContext('2d');
const mensaje = document.getElementById('mensaje');
const textoAccesible=document.getElementById('textoAccesible');
textoAccesible.textContent=[PARA,MENSAJE,DE,CARTA_TITULO,CARTA,FRASES.split('|').join('. ').replaceAll('~',': ')].filter(Boolean).join('. ');
const movimientoReducido=matchMedia('(prefers-reduced-motion: reduce)');
let calm=movimientoReducido.matches, raf=0;
const motionButton=document.getElementById('movimiento');motionButton.hidden=!calm;
${anim.id === 'galaxia-de-flores' ? "if (MENSAJE.length > 80) document.getElementById('texto').classList.add('largo');" : ''}
const escena = { taps: [], pointer: { x: 0.5, y: 0.5 }, holding: false, revealed: false,
  card: { a: ${jsString(anim.id)}, p: PARA, m: MENSAJE, d: DE, tm: MODO_TEXTO, f: TIPOGRAFIA, lt: CARTA_TITULO, l: CARTA, mem: FRASES, c1: COLOR_1, c2: COLOR_2, age: ${jsString(card.age)}, img: ${jsString(card.img)} } };

for (const [id, texto] of [['para', ${anim.nameInScene ? "''" : "PARA && 'Para ' + PARA"}], ['texto', MENSAJE], ['de', ${anim.turtleIndex !== undefined ? "''" : anim.seasonalText ? 'DE' : "DE && 'Con cariño, ' + DE"}]]) {
  const nodo = document.getElementById(id);
  nodo.textContent = id === 'texto' && ${Boolean(anim.ownMessage)} ? '' : texto;
  nodo.hidden = !nodo.textContent;
}

let dibujar;
let ancho = 0;
let alto = 0;
let escala = 1;
let tiempo = 0;
let anterior = performance.now();

function preparar() {
  ancho = innerWidth;
  alto = innerHeight;
  escala = Math.min(devicePixelRatio || 1, 2);
  lienzo.width = Math.round(ancho * escala);
  lienzo.height = Math.round(alto * escala);
  pincel.setTransform(escala, 0, 0, escala, 0, 0);
  escena.taps.length = 0;
  escena.revealed = false;
  escena.onDispose?.();
  escena.onDispose = null;
  escena.onPointerDown = null;
  escena.forceMotion=!calm;
  dibujar = create(pincel, ancho, alto, escala, escena);
  if(calm){for(let i=0;i<24;i++){pincel.setTransform(escala,0,0,escala,0,0);pincel.globalAlpha=1;pincel.globalCompositeOperation='source-over';pincel.clearRect(0,0,ancho,alto);dibujar(i*.75,.1);}tiempo=18;escena.revealed=true;paintStill();}
}

function paintStill(){pincel.setTransform(escala,0,0,escala,0,0);pincel.globalAlpha=1;pincel.globalCompositeOperation='source-over';pincel.clearRect(0,0,ancho,alto);dibujar(tiempo,0);mensaje.classList.add('visible');textoAccesible.hidden=!textoAccesible.textContent;}
escena.requestRender=()=>{if(calm&&dibujar)paintStill();};
function cuadro(ahora) {
  if(calm||document.hidden)return;
  const dt = Math.min((ahora - anterior) / 1000, 0.1);
  anterior = ahora;
  tiempo += dt;
  pincel.setTransform(escala, 0, 0, escala, 0, 0);
  pincel.globalAlpha = 1;
  pincel.globalCompositeOperation = 'source-over';
  dibujar(tiempo, dt);
  mensaje.classList.toggle('visible', ${anim.interactive ? 'escena.revealed' : 'tiempo >= TEXTO_APARECE'});
  textoAccesible.hidden=!mensaje.classList.contains('visible')||!textoAccesible.textContent;
  raf=requestAnimationFrame(cuadro);
}

addEventListener('resize', () => {
  if (innerWidth !== ancho || innerHeight !== alto) preparar();
});
addEventListener('pointermove', (event) => {
  {
    escena.pointer.x = event.clientX / innerWidth;
    escena.pointer.y = event.clientY / innerHeight;
  }
});
${anim.interactive ? `addEventListener('pointerdown', (event) => {
  if (event.target.closest('a,button')) return;
  escena.holding = true;
  escena.pointer.x=event.clientX/innerWidth; escena.pointer.y=event.clientY/innerHeight;
  if(!escena.onPointerDown?.({ x:event.clientX,y:event.clientY,event })) escena.taps.push({ x: event.clientX, y: event.clientY });
});
for (const type of ['pointerup', 'pointercancel', 'pointerleave']) addEventListener(type, () => { escena.holding = false; });` : `addEventListener('click', (event) => {
  if (event.target.closest('a,button')) return;
  tiempo = 0;
  preparar();
});`}

preparar();
${anim.turtleIndex !== undefined ? `document.getElementById('repetir').addEventListener('click',()=>{tiempo=0;escena.holding=false;mensaje.classList.remove('visible');preparar();});` : ''}
if(!calm)raf=requestAnimationFrame(cuadro);
motionButton.addEventListener('click',()=>{calm=false;motionButton.hidden=true;tiempo=0;preparar();anterior=performance.now();raf=requestAnimationFrame(cuadro);});
movimientoReducido.addEventListener('change',()=>{cancelAnimationFrame(raf);calm=movimientoReducido.matches;motionButton.hidden=!calm;preparar();anterior=performance.now();if(!calm&&!document.hidden)raf=requestAnimationFrame(cuadro);});
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);anterior=performance.now();if(!calm&&!document.hidden)raf=requestAnimationFrame(cuadro);});
addEventListener('pagehide',e=>{cancelAnimationFrame(raf);if(!e.persisted)escena.onDispose?.();});
addEventListener('pageshow',e=>{if(e.persisted&&!calm&&!document.hidden){anterior=performance.now();raf=requestAnimationFrame(cuadro);}});
lienzo.addEventListener('keydown',e=>{if(!['Enter',' '].includes(e.key)||e.repeat)return;e.preventDefault();escena.holding=true;if(!escena.onPointerDown?.({x:ancho/2,y:alto/2,nx:.5,ny:.5,event:e}))escena.taps.push({x:ancho/2,y:alto/2});if(calm)paintStill();});
lienzo.addEventListener('keyup',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();escena.holding=false;}});
</script>
</body>
</html>
`;
}
