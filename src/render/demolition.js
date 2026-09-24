import { clamp } from '#game/math';
import { jointPoints } from '#game/demolition/structure';

const ink = '#35494b', orange = '#d18242', steel = '#799497', cream = '#f4dfad';
export function drawDemolition(ctx, sim, draw) {
  const {box, line, circle, text} = draw, site = sim.industry;
  for (const r of sim.level.terrain.filter(r => r.style === 'metal')) {
    box(r.x, r.y, r.w, r.h, '#687e7d', ink);
    box(r.x, r.y + r.h - .1, r.w, .1, '#b7bda2');
    for (let x = r.x + .3; x < r.x + r.w; x += .8) circle(x, r.y + r.h - .22, .035, '#b7bda2');
  }
  // The scaffold is behind the working members. Fixed bays are world-space;
  // neither camera travel nor a broken support rerolls the industrial scenery.
  for (const j of site.joints) if (!j.broken && j.b.im === 0 && j.y > 1) {
    line([[j.x, .05], [j.x, j.y + .4]], '#87978d55', .10);
    for (let y = .3; y < j.y; y += 1.1) line([[j.x - .35, y], [j.x + .35, Math.min(j.y, y + .8)]], '#87978d55', .05);
    box(j.x - .4, 0, .8, .12, '#81948b');
  }
  for (const g of site.goals.filter(g => g.type === 'place' || g.type === 'deliver')) {
    const x = g.x - g.w / 2, color = g.complete ? '#608d75' : '#c1904d';
    line([[x, g.y + .06], [x + g.w, g.y + .06]], color, .13);
    for (let i = 0; i < g.w; i += .5) line([[x + i, g.y + .03], [x + i + .16, g.y + .18]], ink, .06);
    line([[x, g.y + .7], [x, g.y + .15], [x + .4, g.y + .15]], color, .06);
    line([[x + g.w, g.y + .7], [x + g.w, g.y + .15], [x + g.w - .4, g.y + .15]], color, .06);
    text(g.x, g.y - .38, `${g.complete ? '✓ ' : ''}${g.type === 'deliver' ? 'SALVAGE' : 'CATCH BAY'} · ${g.piece.toUpperCase()}`, .23, ink);
  }
  for (const r of site.site.racks) {
    text(r.x, r.y + 2.2, 'BALL ↔ MAGNET', .27, ink);
    text(r.x, r.y + 1.8, 'REST HERE · U', .21, '#8d6542');
  }
  for (const p of site.pieces) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
    const w = p.width, h = p.height;
    const fill = p.material === 'brick' ? '#b77c59' : p.material === 'crate' ? '#bda06a' : p.material === 'concrete' ? '#9b9989' : steel;
    box(-w / 2, -h / 2, w, h, fill, ink);
    if (p.material === 'brick') {
      for (let y = -h / 2 + .4, row = 0; y < h / 2; y += .4, row++) {
        line([[-w / 2, y], [w / 2, y]], '#e4c59c', .025);
        line([[row % 2 ? 0 : -w / 4, y - .35], [row % 2 ? 0 : -w / 4, y]], '#e4c59c', .025);
      }
    } else if (p.material === 'crate') {
      line([[-w / 2 + .1, -h / 2 + .1], [w / 2 - .1, h / 2 - .1]], '#7e6f4a', .08);
      text(0, 0, 'HEAVY', .17, ink);
    } else if (p.material === 'machine') {
      circle(0, 0, .36, '#c4c6aa', ink); circle(0, 0, .16, ink);
      box(-w / 2, -h / 2, w, .12, '#d9b16a');
    } else if (w > h) {
      line([[-w / 2 + .1, 0], [w / 2 - .1, 0]], '#bdd0c5', .08);
      for (let x = -w / 2 + .3; x < w / 2; x += .7) circle(x, h * .28, .035, ink);
      if (p.label) { box(-Math.min(1.5, w / 2 - .1), -.15, Math.min(3, w - .2), .30, cream); text(0, -.07, p.label, .19, ink); }
    } else {
      line([[0, -h / 2 + .1], [0, h / 2 - .1]], '#bdd0c5', .09);
      for (let y = -h / 2 + .3; y < h / 2; y += .6) circle(0, y, .035, ink);
    }
    ctx.restore();
  }
  for (const j of site.joints) {
    const [a, b] = jointPoints(j);
    if (!j.broken && Math.abs(j.la.y) > j.a.height / 2) {
      const k = Math.min(1, j.a.height / 2 / Math.abs(j.la.y));
      line([[j.a.x + (a.x - j.a.x) * k, j.a.y + (a.y - j.a.y) * k], [a.x, a.y]], ink, .14);
    }
    if (j.broken) {
      for (const q of [a, b]) { circle(q.x, q.y, .095, '#39494a'); line([[q.x - .1, q.y - .1], [q.x + .1, q.y + .1]], orange, .035); }
      continue;
    }
    if (Math.hypot(a.x - b.x, a.y - b.y) > .05) line([[a.x, a.y], [b.x, b.y]], ink, .10);
    circle(a.x, a.y, j.permanent ? .16 : .23, j.permanent ? '#729caa' : orange, ink, .035);
    circle(a.x, a.y, .075, cream, ink);
    if (!j.permanent) {
      if (site.goals.some(g => g.joined === j.id && !g.complete)) text(a.x, a.y + .6, 'KEEP JOINED', .23, '#965d32');
      const pulse = .32 + Math.sin(sim.time * 4) * .025;
      ctx.globalAlpha = .45; circle(a.x, a.y, pulse, null, orange, .025); ctx.globalAlpha = 1;
    }
  }
  for (const s of site.sparks) {
    ctx.globalAlpha = clamp(s.life / .35, 0, 1);
    circle(s.x, s.y, .045 + (.45 - s.life) * .12, s.color);
  }
  ctx.globalAlpha = 1;
}
