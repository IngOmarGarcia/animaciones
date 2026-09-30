import { writeFile } from 'node:fs/promises';
import { SEASONAL_ANIMATIONS } from '../js/seasonal-catalog.js';
for (const a of SEASONAL_ANIMATIONS) {
  const palette = a.category === 'muertos' ? ['255,156,52', '#28101f', '#ffe5a0'] : a.kind === 'ghost' ? ['255,133,212', '#24102f', '#ffd3ed'] : ['176,119,255', '#190d2d', '#e2caff'];
  await writeFile(`js/anim/${a.file}.js`, `import { seasonal } from './seasonal-core.js';\nexport default seasonal(${JSON.stringify(a.kind)}, ${JSON.stringify(palette)}, ${JSON.stringify(a.category === 'muertos' ? 'El cariño ilumina el recuerdo' : 'Un poquito de magia para ti')});\n`);
}
