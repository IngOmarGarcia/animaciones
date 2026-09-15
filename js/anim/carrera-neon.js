import { TAU, clamp, rand, lerp, easeOutBack, makeStars, drawStars } from './util.js';

const SPEED = 1.4;

export default function create(ctx, w, h) {
  const S = Math.min(w, h * 0.62);
  const hy = h * 0.52;
  const vx = w / 2;
  const roadHalf = w * 0.46;

  const sky = ctx.createLinearGradient(0, 0, 0, hy);
  sky.addColorStop(0, '#0b0221');
  sky.addColorStop(0.65, '#3b0a57');
  sky.addColorStop(1, '#b0245f');

  const sunR = S * 0.34;
  const sunY = hy - S * 0.1;
  const sunFill = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sunFill.addColorStop(0, '#ffe066');
  sunFill.addColorStop(0.5, '#ff8787');
  sunFill.addColorStop(1, '#f06595');
  const sunGlow = ctx.createRadialGradient(vx, sunY, sunR * 0.8, vx, sunY, sunR * 2);
  sunGlow.addColorStop(0, 'rgba(255, 120, 160, 0.35)');
  sunGlow.addColorStop(1, 'rgba(255, 120, 160, 0)');

  const stars = makeStars(w, hy * 0.8, Math.round((w * hy) / 5000));
  const mountains = [
    { color: '#2a0a3f', peaks: 9, height: 0.13 },
    { color: '#16052a', peaks: 13, height: 0.08 },
  ].map((layer) => ({
    color: layer.color,
    pts: Array.from({ length: layer.peaks + 1 }, (_, i) => ({
      x: (i / layer.peaks) * w,
      y: hy - (i % 2 ? rand(0.4, 1) : rand(0, 0.35)) * layer.height * h,
    })),
  }));
  const streaks = Array.from({ length: 24 }, () => ({
    z: Math.random(), side: Math.random() < 0.5 ? -1 : 1, lane: rand(1.15, 2.4), speed: rand(0.7, 1.3),
  }));

  // Altura en pantalla para una profundidad z (0 = horizonte, 1 = borde inferior)
  const depthY = (z) => hy + (h - hy) * z * z;

  return (t, dt) => {
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, hy);
    drawStars(ctx, stars, t);
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, w, hy);

    // Sol retro con franjas, recortado por el horizonte
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, hy);
    ctx.clip();
    ctx.beginPath();
    ctx.arc(vx, sunY, sunR, 0, TAU);
    ctx.fillStyle = sunFill;
    ctx.fill();
    ctx.fillStyle = sky;
    for (let k = 0; k < 6; k++) {
      ctx.fillRect(vx - sunR, sunY + sunR * (0.02 + k * 0.17), sunR * 2, sunR * 0.025 * (1 + k * 0.7));
    }
    ctx.restore();

    for (const m of mountains) {
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.moveTo(0, hy);
      for (const p of m.pts) ctx.lineTo(p.x, p.y);
      ctx.lineTo(w, hy);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#0d0118';
    ctx.fillRect(0, hy, w, h - hy);

    const travel = (t * SPEED) % 1;
    ctx.strokeStyle = 'rgba(247, 37, 133, 0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = -10; i <= 10; i++) {
      ctx.moveTo(vx + i * S * 0.02, hy);
      ctx.lineTo(vx + i * w * 0.24, h);
    }
    for (let k = 0; k < 14; k++) {
      const y = depthY((k + travel) / 14);
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Carretera con bordes neón y línea central
    ctx.fillStyle = '#12021f';
    ctx.beginPath();
    ctx.moveTo(vx - 3, hy);
    ctx.lineTo(vx + 3, hy);
    ctx.lineTo(vx + roadHalf, h);
    ctx.lineTo(vx - roadHalf, h);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(vx - 3, hy);
    ctx.lineTo(vx - roadHalf, h);
    ctx.moveTo(vx + 3, hy);
    ctx.lineTo(vx + roadHalf, h);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#fde047';
    const dashTravel = (t * SPEED * 2) % 1;
    for (let k = 0; k < 10; k++) {
      const z0 = (k + dashTravel) / 10;
      const z1 = Math.min(z0 + 0.04, 1);
      const w0 = S * 0.012 * z0 * z0 + 0.5;
      const w1 = S * 0.012 * z1 * z1 + 0.5;
      ctx.beginPath();
      ctx.moveTo(vx - w0, depthY(Math.min(z0, 1)));
      ctx.lineTo(vx + w0, depthY(Math.min(z0, 1)));
      ctx.lineTo(vx + w1, depthY(z1));
      ctx.lineTo(vx - w1, depthY(z1));
      ctx.closePath();
      ctx.fill();
    }

    ctx.lineWidth = 2;
    for (const s of streaks) {
      s.z += s.speed * dt * 0.8;
      if (s.z > 1.1) {
        s.z = 0;
        s.side = Math.random() < 0.5 ? -1 : 1;
        s.lane = rand(1.15, 2.4);
      }
      const z0 = Math.max(0, s.z - 0.08);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * Math.min(1, s.z)})`;
      ctx.beginPath();
      ctx.moveTo(vx + s.side * roadHalf * s.lane * z0 * z0, depthY(z0));
      ctx.lineTo(vx + s.side * roadHalf * s.lane * s.z * s.z, depthY(s.z));
      ctx.stroke();
    }

    const enter = easeOutBack(clamp(t / 1.1));
    drawCar(ctx, vx + Math.sin(t * 1.1) * S * 0.06, lerp(h + S * 0.4, h * 0.84, enter), S * 0.52, Math.sin(t * 1.1 + 0.6) * 0.035, t);
  };
}

// Auto deportivo visto desde atrás; (x, y) es el centro de la carrocería.
function drawCar(ctx, x, y, cw, tilt, t) {
  const ch = cw * 0.42;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.ellipse(0, ch * 0.52, cw * 0.58, ch * 0.12, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#050505';
  ctx.fillRect(-cw * 0.47, ch * 0.18, cw * 0.17, ch * 0.34);
  ctx.fillRect(cw * 0.3, ch * 0.18, cw * 0.17, ch * 0.34);

  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  ctx.moveTo(-cw * 0.3, -ch * 0.2);
  ctx.lineTo(-cw * 0.2, -ch * 0.62);
  ctx.lineTo(cw * 0.2, -ch * 0.62);
  ctx.lineTo(cw * 0.3, -ch * 0.2);
  ctx.closePath();
  ctx.fill();
  const glass = ctx.createLinearGradient(0, -ch * 0.56, 0, -ch * 0.24);
  glass.addColorStop(0, 'rgba(103, 232, 249, 0.7)');
  glass.addColorStop(1, '#312e81');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-cw * 0.25, -ch * 0.24);
  ctx.lineTo(-cw * 0.17, -ch * 0.56);
  ctx.lineTo(cw * 0.17, -ch * 0.56);
  ctx.lineTo(cw * 0.25, -ch * 0.24);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#7c3aed';
  ctx.beginPath();
  ctx.moveTo(-cw * 0.5, ch * 0.3);
  ctx.lineTo(-cw * 0.48, -ch * 0.12);
  ctx.quadraticCurveTo(-cw * 0.45, -ch * 0.25, -cw * 0.3, -ch * 0.25);
  ctx.lineTo(cw * 0.3, -ch * 0.25);
  ctx.quadraticCurveTo(cw * 0.45, -ch * 0.25, cw * 0.48, -ch * 0.12);
  ctx.lineTo(cw * 0.5, ch * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4c1d95';
  ctx.fillRect(-cw * 0.5, ch * 0.12, cw, ch * 0.18);

  // Brillo de las calaveras
  ctx.globalCompositeOperation = 'lighter';
  for (const side of [-1, 1]) {
    const lx = side * cw * 0.33;
    const glow = ctx.createRadialGradient(lx, -ch * 0.05, 0, lx, -ch * 0.05, cw * 0.28);
    glow.addColorStop(0, 'rgba(255, 40, 80, 0.55)');
    glow.addColorStop(1, 'rgba(255, 40, 80, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lx - cw * 0.3, -ch * 0.4, cw * 0.6, ch * 0.7);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#ff2d55';
  ctx.fillRect(-cw * 0.45, -ch * 0.1, cw * 0.24, ch * 0.1);
  ctx.fillRect(cw * 0.21, -ch * 0.1, cw * 0.24, ch * 0.1);
  ctx.fillStyle = '#f472b6';
  ctx.fillRect(-cw * 0.21, -ch * 0.07, cw * 0.42, ch * 0.035);

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-cw * 0.1, ch * 0.14, cw * 0.2, ch * 0.12);
  ctx.fillStyle = '#0f172a';
  ctx.font = `800 ${Math.round(ch * 0.09)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GG-2026', 0, ch * 0.2);

  // Fuego del escape
  const flame = 0.6 + 0.4 * Math.sin(t * 40);
  ctx.fillStyle = 'rgba(96, 165, 250, 0.85)';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * cw * 0.2, ch * 0.36, cw * 0.03, ch * (0.05 + 0.05 * flame), 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
