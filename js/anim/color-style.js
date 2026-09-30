export function validHex(value) { return /^#[0-9a-f]{6}$/i.test(value || ''); }
export function colorRGB(value, fallback) {
  if (!validHex(value)) return fallback;
  const n = parseInt(value.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
export function customPalette(stage, fallback) {
  if (!validHex(stage?.card?.c1) || !validHex(stage?.card?.c2)) return fallback;
  const a = colorRGB(stage.card.c1), b = colorRGB(stage.card.c2);
  return [a, b, a.map((v,i) => Math.round(v*.6+b[i]*.4)), b.map(v => Math.round(v*.6+255*.4))];
}
