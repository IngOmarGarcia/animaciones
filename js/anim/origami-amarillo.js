import { TAU, clamp, progress, mix, backdrop, recipient, message,
  consumeTap } from './flower-premium-core.js';

export default function create(ctx, w, h, dpr = 1, stage) {
  let unfoldAt = null;
  const cx = w / 2, cy = h * .48, size = Math.min(w * .34, h * .23);
  function triangle(points, light, dark) {
    const g = ctx.createLinearGradient(points[0][0], points[0][1], points[2][0], points[2][1]);
    g.addColorStop(0, light); g.addColorStop(1, dark);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(...points[0]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(105,73,18,.32)'; ctx.lineWidth = .8; ctx.stroke();
  }
  function foldedPetal(a, open, radius) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    const tip = -radius * (0.58 + open * .5), wing = radius * (.1 + open * .2);
    triangle([[0, 0], [-wing, -radius * .38], [0, tip]], '#fff1b5', '#d79a37');
    triangle([[0, 0], [0, tip], [wing, -radius * .38]], '#ffe58a', '#a95e19');
    ctx.strokeStyle = 'rgba(255,255,225,.75)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, tip); ctx.stroke();
    ctx.restore();
  }
  return (t) => {
    backdrop(ctx, w, h, '#101a1b', '#372413', t);
    if (consumeTap(stage) && t > 3 && unfoldAt === null) unfoldAt = t;
    if (unfoldAt === null && t > 7) unfoldAt = t;
    const age = unfoldAt === null ? -1 : t - unfoldAt;
    const fold = progress(t, 1, 3.5), card = age < 0 ? 0 : progress(age, .5, 2);
    if (stage && age > 2.7) stage.revealed = true;
    // Sombra de papel elevada sobre un tablero; las líneas visibles son pliegues reales.
    const shadow = ctx.createRadialGradient(cx, cy + size * 1.6, 0, cx, cy + size * 1.6, size * 1.2);
    shadow.addColorStop(0, 'rgba(0,0,0,.42)'); shadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadow; ctx.fillRect(cx - size * 2, cy + size, size * 4, size * 2);
    const float = Math.sin(t * .7) * size * .035;
    ctx.save(); ctx.translate(0, float);
    if (fold < 1) {
      const half = size * (1 - fold * .35), rise = fold * size * .25;
      triangle([[cx, cy - half - rise], [cx - half, cy], [cx, cy]], '#fff5ca', '#e9af4b');
      triangle([[cx, cy - half - rise], [cx, cy], [cx + half, cy]], '#ffe68c', '#b97921');
      triangle([[cx - half, cy], [cx, cy], [cx, cy + half - rise]], '#f8cd62', '#9b5b18');
      triangle([[cx + half, cy], [cx, cy + half - rise], [cx, cy]], '#fff0ad', '#cb8c2b');
      ctx.strokeStyle = `rgba(255,255,219,${.4 + fold * .3})`;
      ctx.beginPath(); ctx.moveTo(cx, cy - half - rise); ctx.lineTo(cx, cy + half - rise);
      ctx.moveTo(cx - half, cy); ctx.lineTo(cx + half, cy); ctx.stroke();
    }
    for (let i = 0; i < 10; i++) {
      const appear = progress(t, 3.2 + i * .11, 1.2) * (1 - card);
      ctx.globalAlpha = appear;
      foldedPetal(i * TAU / 10 + t * .02, fold, size);
    }
    ctx.globalAlpha = 1;
    if (fold > .7 && card < 1) {
      triangle([[cx - size * .19, cy], [cx, cy - size * .2], [cx + size * .19, cy]], '#8c4e1c', '#3b2715');
      triangle([[cx - size * .19, cy], [cx + size * .19, cy], [cx, cy + size * .2]], '#b77620', '#4a2c13');
    }
    ctx.restore();
    if (card > 0) {
      const width = mix(size * .3, Math.min(w * .82, 360), card);
      const height = mix(size * .4, Math.min(h * .42, 350), card);
      const x = cx - width / 2, y = cy - height / 2;
      ctx.shadowColor = 'rgba(255,206,104,.4)'; ctx.shadowBlur = 22 * card;
      const g = ctx.createLinearGradient(x, y, x + width, y + height);
      g.addColorStop(0, '#fff8d7'); g.addColorStop(.5, '#f4db98'); g.addColorStop(1, '#dbaa50');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, width, height, 3); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(100,65,24,.38)'; ctx.strokeRect(x + 12, y + 12, width - 24, height - 24);
      // Esquinas triangulares se abren como solapas, conservando el origen de papel.
      const flap = (1 - card) * width * .35;
      triangle([[x, y], [x + flap, y + height * .3], [x, y + height * .6]], '#fff9df', '#c99843');
      triangle([[x + width, y], [x + width - flap, y + height * .3], [x + width, y + height * .6]], '#fff5c7', '#b17d2f');
      if (card > .6) {
        ctx.save(); ctx.globalAlpha = progress(card, .6, .4); ctx.textAlign = 'center';
        ctx.fillStyle = '#69421d'; ctx.font = `700 ${Math.max(17, w * .065)}px Georgia, serif`;
        ctx.fillText(`Para ${recipient(stage)}`, cx, y + height * .32, width - 38);
        ctx.font = `italic ${Math.max(12, w * .04)}px Georgia, serif`;
        const words = message(stage, 'Una flor hecha sólo para ti').split(' ');
        let line = '', rows = [], max = width - 45;
        for (const word of words) {
          const next = line ? `${line} ${word}` : word;
          if (line && ctx.measureText(next).width > max) { rows.push(line); line = word; } else line = next;
        }
        if (line) rows.push(line);
        rows.slice(0, 5).forEach((text, i) => ctx.fillText(text, cx, y + height * .55 + i * 21, max));
        ctx.restore();
      }
    }
  };
}
