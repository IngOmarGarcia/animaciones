// Applies typography only to ordinary Canvas text, never glyph sampling for particles.
import { readFile, writeFile } from 'node:fs/promises';
for (const file of ['jardin-de-lunas', 'universo-flores', 'galaxia-flores', 'origami-amarillo']) {
  const path = `js/anim/${file}.js`;
  let source = await readFile(path, 'utf8');
  if (!source.includes("from './text-style.js'")) source = "import { canvasTextFont } from './text-style.js';\n" + source;
  source = source.replace(/ctx\.font = `([^`]*?px) ([^`]+)`;/g, (_, prefix, family) => `ctx.font = canvasTextFont(stage, \`${prefix}\`, ${JSON.stringify(family)});`);
  await writeFile(path, source);
}
