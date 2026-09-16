// Renderizador de puntos CON PROFUNDIDAD, solo para el retrato de partículas.
//
// El renderizador compartido de util.js crea su contexto con `depth: false` y dibuja todo en
// aditivo puro (blendFunc ONE, ONE): ninguna partícula puede tapar a otra. Eso funciona muy
// bien para corazones, estelas y explosiones, pero impide leer una cara: los puntos de la nuca
// suman luz sobre los del rostro y ningún rasgo llega a tener un borde limpio.
//
// Aquí la cabeza se dibuja como materia sólida (test de profundidad, sin mezcla) y el brillo
// se añade después en una segunda pasada aditiva que respeta esa profundidad. Cuando la cabeza
// estalla deja de ser materia y se dibuja todo en aditivo, como el resto de escenas.
//
// Se mantiene aparte a propósito: las animaciones ya publicadas siguen con el motor compartido.

const VS = `
attribute vec4 aPos;   // xyz + intensidad
attribute vec4 aCol;   // rgb + tamaño en unidades de mundo
uniform mat4 uVP;
uniform float uPx;     // píxeles por unidad a distancia 1
uniform float uMaxSize;
uniform float uEscala; // multiplicador de tamaño (la pasada de brillo usa puntos mayores)
varying vec3 vCol;
varying float vI;
void main() {
  vec4 clip = uVP * vec4(aPos.xyz, 1.0);
  if (clip.w < 0.12 || aPos.w <= 0.004) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }
  gl_Position = clip;
  gl_PointSize = clamp(aCol.w * uEscala * uPx / clip.w, 1.0, uMaxSize);
  vCol = aCol.rgb;
  vI = aPos.w;
}`;

// Pasada sólida: disco con borde recortado. Escribe profundidad, así que lo que está delante
// tapa lo que está detrás y la cara deja de competir con la nuca.
const FS_SOLIDO = `
precision mediump float;
varying vec3 vCol;
varying float vI;
void main() {
  vec2 d = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  float borde = smoothstep(1.0, 0.55, r2);       // relieve suave dentro del propio punto
  // En aditivo el brillo salía de acumular puntos superpuestos; aquí cada píxel lo pinta uno
  // solo, así que el color debe valer por sí mismo. Medido: sin esto el pico se queda en 0.4.
  vec3 c = vCol * (0.3 + 1.5 * vI) * (0.62 + 0.38 * borde);
  gl_FragColor = vec4(min(c, vec3(1.0)), 1.0);
}`;

// Pasada de brillo: aditiva, sin escribir profundidad, pero comparándola. Da el halo de energía
// sin permitir que el fondo se cuele por delante de la cabeza.
const FS_BRILLO = `
precision mediump float;
varying vec3 vCol;
varying float vI;
uniform float uFuerza;
void main() {
  vec2 d = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  float halo = exp(-r2 * 3.2);
  gl_FragColor = vec4(vCol * vI * halo * uFuerza, 1.0);
}`;

// Cuadro completo para limpiar o desvanecer (estelas) sin borrar la profundidad.
const VS_QUAD = `
attribute vec2 aXY;
void main() { gl_Position = vec4(aXY, 0.0, 1.0); }`;
const FS_QUAD = `
precision mediump float;
uniform vec4 uColor;
void main() { gl_FragColor = uColor; }`;

function compilar(gl, tipo, fuente) {
  const sh = gl.createShader(tipo);
  gl.shaderSource(sh, fuente);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error('Shader: ' + gl.getShaderInfoLog(sh));
  }
  return sh;
}

function programa(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compilar(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compilar(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error('Programa: ' + gl.getProgramInfoLog(p));
  }
  return p;
}

export function createPortraitRenderer() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', {
    alpha: false, antialias: false, depth: true, stencil: false,
    premultipliedAlpha: false, powerPreference: 'high-performance',
  });
  if (!gl) return null;

  const progSolido = programa(gl, VS, FS_SOLIDO);
  const progBrillo = programa(gl, VS, FS_BRILLO);
  const progQuad = programa(gl, VS_QUAD, FS_QUAD);

  const bufPos = gl.createBuffer();
  const bufCol = gl.createBuffer();
  const bufQuad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufQuad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const loc = (p) => ({
    aPos: gl.getAttribLocation(p, 'aPos'),
    aCol: gl.getAttribLocation(p, 'aCol'),
    uVP: gl.getUniformLocation(p, 'uVP'),
    uPx: gl.getUniformLocation(p, 'uPx'),
    uMaxSize: gl.getUniformLocation(p, 'uMaxSize'),
    uEscala: gl.getUniformLocation(p, 'uEscala'),
    uFuerza: gl.getUniformLocation(p, 'uFuerza'),
  });
  const lSolido = loc(progSolido);
  const lBrillo = loc(progBrillo);
  const lQuadXY = gl.getAttribLocation(progQuad, 'aXY');
  const lQuadColor = gl.getUniformLocation(progQuad, 'uColor');

  let ancho = 0;
  let alto = 0;

  // Medición por pasada. Las llamadas de WebGL son asíncronas: sin gl.finish() los tiempos
  // salen todos a cero y la culpa parece estar en la CPU. Solo se activa al perfilar.
  let perfil = false;
  const tiempos = { subida: 0, solido: 0, brillo: 0, energia: 0, total: 0, muestras: 0 };
  const marca = () => {
    if (perfil) gl.finish();
    return performance.now();
  };

  function atributos(l) {
    gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
    gl.enableVertexAttribArray(l.aPos);
    gl.vertexAttribPointer(l.aPos, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufCol);
    gl.enableVertexAttribArray(l.aCol);
    gl.vertexAttribPointer(l.aCol, 4, gl.FLOAT, false, 0, 0);
  }

  function cuadro(r, g, b, a) {
    gl.useProgram(progQuad);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufQuad);
    gl.enableVertexAttribArray(lQuadXY);
    gl.vertexAttribPointer(lQuadXY, 2, gl.FLOAT, false, 0, 0);
    gl.uniform4f(lQuadColor, r, g, b, a);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(lQuadXY);
  }

  /**
   * Opciones: width, height, vp, pos, col, count, px, maxSize,
   * solid (cabeza como materia), solidCount (cuántas partículas del principio son materia),
   * glow (0..1), trail (0..1), flash (0..1), bg [r,g,b].
   *
   * El polvo ambiental y el anillo son energía, no materia: si entran en el pase sólido, los
   * que pasan cerca de la cámara se dibujan como discos enormes que escriben profundidad y
   * tapan la cara. Por eso solo las primeras `solidCount` partículas van al pase con
   * profundidad; el resto siempre en aditivo.
   */
  function render(o) {
    if (gl.isContextLost()) return;
    if (o.width !== ancho || o.height !== alto) {
      ancho = canvas.width = o.width;
      alto = canvas.height = o.height;
    }
    gl.viewport(0, 0, ancho, alto);
    const bg = o.bg || [0.004, 0.008, 0.02];

    // Profundidad siempre limpia; el color puede arrastrar estela.
    // OJO: glClear(DEPTH_BUFFER_BIT) NO hace nada si la escritura de profundidad está
    // desactivada, y el pase de brillo del cuadro anterior la deja en false. Sin esto el búfer
    // conserva la profundidad del cuadro previo y casi todos los puntos fallan el test LEQUAL.
    gl.depthMask(true);
    gl.clearDepth(1.0);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    const estela = Math.max(0, Math.min(0.95, o.trail || 0));
    if (estela > 0) cuadro(bg[0], bg[1], bg[2], 1 - estela);
    else {
      gl.clearColor(bg[0], bg[1], bg[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    const tSubida = marca();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, o.pos, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufCol);
    gl.bufferData(gl.ARRAY_BUFFER, o.col, gl.DYNAMIC_DRAW);
    const tTrasSubida = marca();

    const n = Math.min(o.count, o.pos.length / 4);

    if (o.solid) {
      const materia = Math.min(o.solidCount ?? n, n);

      // 1) Materia (solo la cabeza): test y escritura de profundidad, sin mezcla.
      gl.useProgram(progSolido);
      atributos(lSolido);
      gl.uniformMatrix4fv(lSolido.uVP, false, o.vp);
      gl.uniform1f(lSolido.uPx, o.px);
      gl.uniform1f(lSolido.uMaxSize, o.maxSize);
      gl.uniform1f(lSolido.uEscala, 1);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.drawArrays(gl.POINTS, 0, materia);
      const tTrasSolido = marca();

      // 2) Brillo de la cabeza: aditivo, respeta la profundidad pero no la escribe.
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      if ((o.glow ?? 1) > 0) {
        gl.useProgram(progBrillo);
        atributos(lBrillo);
        gl.uniformMatrix4fv(lBrillo.uVP, false, o.vp);
        gl.uniform1f(lBrillo.uPx, o.px);
        gl.uniform1f(lBrillo.uMaxSize, o.maxSize * 2.2);
        gl.uniform1f(lBrillo.uEscala, 2.0);
        gl.uniform1f(lBrillo.uFuerza, o.glow ?? 0.5);
        gl.drawArrays(gl.POINTS, 0, materia);
      }
      const tTrasBrillo = marca();

      // 3) Anillo y polvo: energía pura, aditiva y sin escribir profundidad, pero ocluida
      //    por la cabeza gracias al test que sigue activo.
      if (materia < n) {
        gl.useProgram(progBrillo);
        atributos(lBrillo);
        gl.uniformMatrix4fv(lBrillo.uVP, false, o.vp);
        gl.uniform1f(lBrillo.uPx, o.px);
        gl.uniform1f(lBrillo.uMaxSize, o.maxSize * 1.2);
        gl.uniform1f(lBrillo.uEscala, 1.2);
        gl.uniform1f(lBrillo.uFuerza, 1.0);
        gl.drawArrays(gl.POINTS, materia, n - materia);
      }
      if (perfil) {
        const tFin = marca();
        tiempos.subida += tTrasSubida - tSubida;
        tiempos.solido += tTrasSolido - tTrasSubida;
        tiempos.brillo += tTrasBrillo - tTrasSolido;
        tiempos.energia += tFin - tTrasBrillo;
        tiempos.total += tFin - tSubida;
        tiempos.muestras++;
      }
    } else {
      // Ya no hay materia: energía suelta, todo aditivo como el resto de escenas.
      gl.useProgram(progBrillo);
      atributos(lBrillo);
      gl.uniformMatrix4fv(lBrillo.uVP, false, o.vp);
      gl.uniform1f(lBrillo.uPx, o.px);
      gl.uniform1f(lBrillo.uMaxSize, o.maxSize * 1.6);
      gl.uniform1f(lBrillo.uEscala, 1.35);
      gl.uniform1f(lBrillo.uFuerza, 1.0);
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.drawArrays(gl.POINTS, 0, n);
      if (perfil) {
        const tFin = marca();
        tiempos.subida += tTrasSubida - tSubida;
        tiempos.energia += tFin - tTrasSubida;   // en esta rama todo va en una sola pasada
        tiempos.total += tFin - tSubida;
        tiempos.muestras++;
      }
    }

    if (o.flash > 0.001) cuadro(1, 1, 1, Math.min(0.85, o.flash));
    gl.disable(gl.DEPTH_TEST);
  }

  return {
    canvas,
    gl,
    render,
    get perfil() { return perfil; },
    set perfil(v) { perfil = !!v; },
    tiempos,
    resetPerfil() {
      tiempos.subida = 0; tiempos.solido = 0; tiempos.brillo = 0;
      tiempos.energia = 0; tiempos.total = 0; tiempos.muestras = 0;
    },
    // Medias por cuadro en milisegundos, que es lo que se puede comparar con los 16.7 ms
    // de presupuesto a 60 fps.
    medias() {
      const m = Math.max(1, tiempos.muestras);
      return {
        muestras: tiempos.muestras,
        subida: +(tiempos.subida / m).toFixed(3),
        solido: +(tiempos.solido / m).toFixed(3),
        brillo: +(tiempos.brillo / m).toFixed(3),
        energia: +(tiempos.energia / m).toFixed(3),
        total_gpu: +(tiempos.total / m).toFixed(3),
      };
    },
  };
}

export function getPortraitRenderer() {
  const self = getPortraitRenderer;
  if (self.cache === undefined) {
    try {
      self.cache = createPortraitRenderer();
    } catch (err) {
      console.warn('Retrato: WebGL con profundidad no disponible', err);
      self.cache = null;
    }
  }
  return self.cache && !self.cache.gl.isContextLost() ? self.cache : null;
}
