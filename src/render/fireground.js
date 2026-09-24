import { foundryBuildings } from '#game/render/foundry';
import { WATER } from '#game/fire/water';

const ink = '#344b52', steel = '#66868b', blue = '#79cbe1', pale = '#d3f4ef';

// Buildings keep their world-slot identity as the camera moves.
export function drawFireBackground(ctx, camera, width, height) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#acbdc2'); sky.addColorStop(1, '#e7d8ba');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#f4dfa8'; ctx.beginPath();
  ctx.arc(width * .78 - camera.x * 2, height * .23 + (camera.y - 8) * 2, 30, 0, Math.PI * 2); ctx.fill();
  for (let layer = 0; layer < 2; layer++) {
    const base = height * (.65 + layer * .2) + (camera.y - 8) * (7 + layer * 5);
    ctx.fillStyle = layer ? '#93a4a0' : '#b0bbb3';
    ctx.fillRect(0, base, width, Math.max(0, height - base));
    for (const b of foundryBuildings(camera.x, width, layer)) {
      ctx.fillStyle = layer ? '#93a4a0' : '#b0bbb3';
      ctx.fillRect(b.x, base - b.height, 190, b.height);
      ctx.beginPath(); ctx.moveTo(b.x - 6, base - b.height);
      ctx.lineTo(b.x + 94, base - b.height - 27); ctx.lineTo(b.x + 196, base - b.height); ctx.fill();
      ctx.fillRect(b.x + 21, base - b.height - 47, 13, 43);
      ctx.fillStyle = layer ? '#c1c7b9' : '#cbd0c1';
      for (let n = 0; n < 6; n++) ctx.fillRect(b.x + 12 + n * 29, base - b.height + 14, 16, 21);
      if (b.type === 2) {
        ctx.strokeStyle = '#92a5a2'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(b.x + 130, base); ctx.lineTo(b.x + 145, base - b.height - 45);
        ctx.lineTo(b.x + 169, base - b.height - 45); ctx.lineTo(b.x + 184, base); ctx.stroke();
        ctx.fillStyle = '#9cacaa'; ctx.fillRect(b.x + 136, base - b.height - 78, 41, 40);
      }
    }
  }
}

export function drawFireground(ctx, sim, draw, time, reduced) {
  const {box, poly, circle, line, text} = draw, work = sim.industry;
  for (const r of sim.level.terrain.filter(r => r.style === 'metal')) {
    box(r.x, r.y, r.w, r.h, steel, ink);
    box(r.x, r.y + r.h - .07, r.w, .07, '#c9dad0');
  }
  // A parked tender and hose reel at the depot; scenery stays behind the rig.
  box(.5, .03, 4.7, .72, '#b96647', ink); box(1, .75, 1.15, .36, '#bd7754', ink);
  for (const x of [1.1, 4.55]) { circle(x, .08, .29, ink); circle(x, .08, .11, '#b1c3b7'); }
  circle(4.6, .45, .27, '#dcc59d', ink); circle(4.6, .45, .18, steel, ink);
  text(2.9, .39, 'FIRE SERVICE', .20, '#ffedc6');
  for (const p of work.incident.pools) {
    box(p.x - p.w / 2 + .16, p.bottom, p.w - .32, p.y - p.bottom, '#67b5cb68');
    const surface = [];
    for (let i = 0; i <= 18; i++) surface.push([p.x - p.w / 2 + .16 + (p.w - .32) * i / 18,
      p.y + (reduced ? 0 : Math.sin(i * .8 + time * 2) * .025)]);
    line(surface, pale, .045);
    text(p.x, p.y + .62, 'REFILL ↓', .27, ink);
  }
  for (const h of work.headers) {
    for (const outlet of h.outlets) {
      line([[h.x, h.y - .8], [h.x, outlet.y + .2], [outlet.x, outlet.y + .2], [outlet.x, outlet.y]], ink, .13);
      line([[h.x, h.y - .8], [h.x, outlet.y + .2], [outlet.x, outlet.y + .2], [outlet.x, outlet.y]], blue, .065);
      poly([[outlet.x - .16, outlet.y - .06], [outlet.x + .16, outlet.y - .06], [outlet.x, outlet.y + .08]], steel, ink);
    }
    box(h.x - h.w / 2 + .12, h.y - .67, h.w - .24, .63 * h.fill / h.capacity, blue);
    text(h.x, h.y + .50, 'SPRINKLER HEADER ↓', .26, ink);
    text(h.x, h.y - .50, `${h.fill} / ${h.capacity}`, .20, ink);
  }
  for (const f of work.fires) {
    const b = work.fireBox(f);
    ctx.save();
    if (f.body) { ctx.translate(f.body.x, f.body.y); ctx.rotate(f.body.a); ctx.translate(-b.w / 2, -b.h / 2); }
    else ctx.translate(b.x, b.y);
    box(0, 0, b.w, b.h, f.wet > .2 ? '#6e7163' : '#9e7955', ink);
    for (const y of [.18, .43, .68]) line([[.05, y], [b.w - .05, y]], '#423e34', .035);
    for (const x of [.21, b.w - .34]) box(x, 0, .12, b.h, '#534e44');
    if (f.body) for (const x of [.32, b.w - .32]) circle(x, .07, .13, ink);
    if (f.heat > .08) for (let n = 0; n < 5; n++) {
      const x = .12 + n * .35, sway = reduced ? 0 : Math.sin(time * 6 + n * 2 + f.id) * .15;
      const top = b.h + f.heat * (1 + .3 * Math.sin(n * 3 + (reduced ? 0 : time * 4)));
      poly([[x - .12, .38], [x - .17, b.h + .1], [x + sway, top], [x + .14, b.h + .23], [x + .28, .38]], '#d7703a');
      poly([[x, .4], [x + sway * .4, top - .25], [x + .16, .4]], '#f6c86b');
    }
    ctx.restore();
    // Bounded procedural smoke, tied to simulation time so pause is still.
    if (f.heat > .08) for (let n = 0; n < 4; n++) {
      const rise = (n + (reduced ? 0 : time * .45 % 1)) * .72;
      circle(b.x + b.w / 2 + rise * .2, b.y + b.h + 1.4 + rise, .25 + rise * .13, '#59666825');
    }
    const top = b.y + b.h + 3.25;
    box(b.x, top, b.w, .11, '#52656555');
    box(b.x, top, b.w * f.heat, .11, f.heat > .08 ? '#b85d3e' : '#438d8e');
    text(b.x + b.w / 2, top + .3, f.heat > .08 ? f.name : 'COOLED ✓', .23, ink);
    if (f.plume && f.heat > .15) for (const dx of [-.5, .5])
      line([[b.x + b.w / 2 + dx, top + .75], [b.x + b.w / 2 + dx, top + 1.2],
        [b.x + b.w / 2 + dx - .09, top + 1.08]], '#b9774960', .03);
  }
  for (const p of work.water.drops) {
    const speed = Math.hypot(p.vx, p.vy), trail = Math.min(.018, .35 / (speed || 1));
    line([[p.x - p.vx * trail, p.y - p.vy * trail], [p.x, p.y]], '#3987a8', p.r * 2.2);
    circle(p.x, p.y, p.r * .7, '#c7f4f1');
  }
  if (work.tool === 'hose') {
    box(sim.cabin.x - .5, sim.cabin.y + 1.05, 1, .08, '#52656555');
    box(sim.cabin.x - .5, sim.cabin.y + 1.05, work.tank / WATER.tank, .08, '#3f92ad');
  }
}
