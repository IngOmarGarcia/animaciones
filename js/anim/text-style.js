// Only ordinary text uses this setting. Particle targets keep their own geometry.
export const FONT_OPTIONS = [
  { id: 'clear', label: 'Clara · fácil de leer', family: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
  { id: 'elegant', label: 'Elegante · manuscrita', family: '"Dancing Script", "Segoe Script", cursive' },
  { id: 'classic', label: 'Clásica · con serifas', family: 'Georgia, "Times New Roman", serif' },
  { id: 'rounded', label: 'Moderna · suave', family: '"Trebuchet MS", Arial, sans-serif' },
  { id: 'mono', label: 'Monoespaciada · estilo máquina', family: '"Courier New", ui-monospace, monospace' },
];
export function textFamily(id, fallback = '"Dancing Script", "Segoe Script", cursive') {
  return FONT_OPTIONS.find(option => option.id === id)?.family || fallback;
}
export function canvasTextFont(stage, prefix, fallback = 'system-ui, sans-serif') {
  return `${prefix} ${textFamily(stage?.card?.f, fallback)}`;
}
