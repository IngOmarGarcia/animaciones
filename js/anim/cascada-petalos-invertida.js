import { TAU, clamp, ease, progress, mix, seeded, quality, backdrop, point,
  textTargets, recipient, consumeTap } from './flower-premium-core.js';

export default function create(ctx, w, h, dpr = 1, stage) {
  const rand = seeded(50081), floor = h * .67;
  const count = Math.max(stage?.preview ? 220 : 400, Math.round(quality(stage, w, h) * .6));
  const petals = Array.from({ length: count }, () => ({
    x: rand(), y: rand(), speed: .45 + rand() * .8, z: rand(), phase: rand() * TAU,
    size: 2 + rand() * 3.2,
  }));
  let reverseAt = null, cached = '', targets = [];
  const sprite = document.createElement('canvas'); sprite.width = 24; sprite.height = 48;
  const sg = sprite.getContext('2d');
  const tint = sg.createLinearGradient(0, 0, 24, 48);
  tint.addColorStop(0, '#fff3b6'); tint.addColorStop(.5, '#e7aa38'); tint.addColorStop(1, '#8c4515');
  sg.fillStyle = tint; sg.beginPath(); sg.ellipse(12, 24, 6, 21, .25, 0, TAU); sg.fill();
  function fragment(x, y, s, angle, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, -s, -s * 2, s * 2, s * 4);
    ctx.restore();
  }
  return (t) => {
    backdrop(ctx, w, h, '#090712', '#28180c', t);
    const name = recipient(stage);
    if (name !== cached) { cached = name; targets = textTargets(name, w * .78, stage?.preview ? 5 : 3); }
    if (consumeTap(stage) && t > 2.2 && reverseAt === null) reverseAt = t;
    if (reverseAt === null && t > 6) reverseAt = t;
    const age = reverseAt === null ? -1 : t - reverseAt;
    const freeze = age < 0 ? 0 : progress(age, 0, .5) * (1 - progress(age, .8, .4));
    const invert = age < 0 ? 0 : progress(age, 1, 1.2);
    const letters = age < 0 ? 0 : progress(age, 2, 2.1);
    if (stage && age > 4) stage.revealed = true;
    // Cascada iluminada desde un corte alto; la superficie inferior recibe y refleja.
    const beam = ctx.createLinearGradient(w * .22, 0, w * .78, floor);
    beam.addColorStop(0, 'rgba(255,216,99,.09)'); beam.addColorStop(1, 'rgba(255,182,65,0)');
    ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(w * .3, 0); ctx.lineTo(w * .7, 0);
    ctx.lineTo(w * .94, floor); ctx.lineTo(w * .06, floor); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#05070e'; ctx.fillRect(0, floor, w, h - floor);
    const reflection = ctx.createLinearGradient(0, floor, 0, h);
    reflection.addColorStop(0, 'rgba(232,160,58,.25)'); reflection.addColorStop(1, 'rgba(232,160,58,0)');
    ctx.fillStyle = reflection; ctx.fillRect(0, floor, w, h - floor);
    ctx.strokeStyle = 'rgba(255,210,113,.55)'; ctx.beginPath(); ctx.moveTo(0, floor); ctx.lineTo(w, floor); ctx.stroke();
    if (age >= 0) for (let i = 0; i < 4; i++) {
      const p = clamp((age - i * .23) / 2.2);
      ctx.strokeStyle = `rgba(255,220,143,${(1 - p) * .5})`; ctx.lineWidth = 1 + (1 - p) * 2;
      ctx.beginPath(); ctx.ellipse(w / 2, floor, w * .48 * p, h * .07 * p, 0, Math.PI, TAU); ctx.stroke();
    }
    for (let i = 0; i < petals.length; i++) {
      const p = petals[i], x = w * (.1 + p.x * .8) + Math.sin(t * 1.1 + p.phase) * 8 * (1 - letters);
      const fallY = ((p.y + t * p.speed * .16) % 1) * floor;
      const riseY = floor - ((p.y + Math.max(0, age - 1) * p.speed * .2) % 1) * floor;
      let y = mix(fallY, riseY, invert);
      if (freeze > 0) y = mix(y, floor * p.y, freeze);
      const target = targets[i % Math.max(1, targets.length)] || [0, 0];
      const tx = w / 2 + target[0], ty = h * .38 + target[1];
      const px = mix(x, tx, letters), py = mix(y, ty, letters);
      const s = mix(p.size * (0.7 + p.z), 1.2, letters);
      fragment(px, py, s, t * p.speed + p.phase + invert * Math.PI, .18 + .75 * progress(t, .7, 1.8));
      if (i % 4 === 0 && letters < .8) fragment(px, floor + (floor - py) * .35, s * .8, -t + p.phase, .08 * (1 - letters));
    }
    if (letters > .85) {
      ctx.textAlign = 'center'; ctx.font = `italic ${Math.max(12, w * .045)}px Georgia, serif`;
      ctx.fillStyle = `rgba(255,232,188,${letters * .85})`;
      ctx.fillText('el tiempo vuelve hacia ti', w / 2, h * .53);
    }
  };
}
