import { clamp } from '#game/math';
import { CUP_WALLS } from '#game/industry/materials';

const steel = '#526971', edge = '#293f46', light = '#a2b7b5', rust = '#bf744c', yellow = '#e8b459';

function workpiece(ctx, p, {box, poly, circle, line}) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
  if (p.assembled) {
    poly([[-.64, -.3], [.63, -.3], [.63, -.08], [-.38, .02], [-.38, .32], [-.64, .32]], light, edge);
    circle(.15, .01, .37, p.polish ? '#cad5cd' : steel, edge);
    circle(.15, .01, .17, steel, edge);
    for (let n = 0; n < 6; n++) {
      const a = n * Math.PI / 3;
      circle(.15 + Math.cos(a) * .26, Math.sin(a) * .26, .037, edge);
    }
    line([[-.3, -.20], [.0, -.12]], '#eff2cb', .07);
  } else {
    const flat = Math.min(1, p.forge / 3), cut = p.cut || 0;
    const color = p.polish > .8 ? '#d7e4db' : p.polish > .2 ? '#9bb4b5' : flat ? '#788c91' : '#a87551';
    const top = .32 - flat * .05, waist = top - cut * .15;
    poly([[-.65, -.28], [-.54, -.35], [.54, -.35], [.65, -.26], [.65, top], [.40, top],
      [.31, waist], [-.31, waist], [-.40, top], [-.65, top]], color, edge, .045);
    box(-.49, -.26, .95, .06, p.polish ? '#f7f2ce' : '#556b70');
    if (cut > .02) for (const x of [-.39, .37]) line([[x, -.30], [x, top]], light, .035);
    if (p.polish > .1) line([[-.38, .01], [.32, .01]], `rgba(247,250,221,${p.polish})`, .035);
  }
  ctx.restore();
}

export function drawWorkshop(ctx, sim, draw, time) {
  const {box, poly, circle, line, text} = draw, w = sim.industry, config = w.config;
  function stripes(x, y, width, height = .16) {
    box(x, y, width, height, yellow);
    for (let n = 0; n < width / .36; n++) {
      const left = x + n * .36;
      poly([[left, y], [Math.min(left + .16, x + width), y],
        [Math.min(left + .30, x + width), y + height], [Math.min(left + .14, x + width), y + height]], edge);
    }
  }
  for (const r of sim.level.terrain.filter(r => r.style === 'metal')) {
    box(r.x, r.y, r.w, r.h, steel, edge);
    box(r.x, r.y + r.h - .10, r.w, .10, light);
    if (r.w > 1) for (let x = r.x + .3; x < r.x + r.w - .1; x += .8) circle(x, r.y + r.h - .25, .035, light);
  }
  for (const pit of config.pits || []) {
    box(pit.x - pit.w / 2, .01, pit.w, .07, '#b6a278');
    text(pit.x, 2.5, 'MAGNETITE + SAND', .29, '#746653');
  }
  if (config.bin) {
    const b = config.bin, fill = Math.min(1, w.material.deposited / config.quota);
    box(b.x - b.w / 2 + .05, b.y, b.w - .10, fill * .75, '#34484b');
    stripes(b.x - b.w / 2, b.y - .15, b.w);
    text(b.x, b.y + 1.75, `REFINERY · ${w.material.deposited} / ${config.quota}`, .32, edge);
    text(b.x, b.y + 1.3, 'HOLD X TO RELEASE', .20, '#7d7157');
  }
  for (const tap of config.taps || []) {
    box(tap.x - 2.75, 0, 1.7, 4.6, '#8e6860', edge);
    box(tap.x - 2.50, 2.05, 1.2, 1.35, '#392f33', edge);
    poly([[tap.x - 2.40, 2.12], [tap.x - 2.15, 2.85], [tap.x - 1.9, 2.5], [tap.x - 1.55, 3], [tap.x - 1.38, 2.12]], '#ef9848');
    line([[tap.x - 1.4, 4.3], [tap.x, 4.3], [tap.x, tap.y]], edge, .22);
    circle(tap.x - .8, 4.3, .24, rust, edge);
    line([[tap.x - .98, 4.3], [tap.x - .62, 4.3]], edge, .04);
    circle(tap.x, tap.y, .13, '#ffc06c');
    text(tap.x, tap.y + 1.2, 'FURNACE TAP', .30, edge);
    text(tap.x + .25, 1.7, 'FILL HERE ↑', .24, '#975f43');
  }
  w.molds.forEach((m, i) => {
    const hot = !m.ready;
    box(m.x - m.w / 2, m.y, m.w, .44 * m.fill / m.capacity, hot ? '#f7a34c' : '#657c81');
    if (m.fill && hot) line([[m.x - m.w / 2 + .1, m.y + .44 * m.fill / m.capacity], [m.x + m.w / 2 - .1, m.y + .44 * m.fill / m.capacity]], '#ffe0a0', .055);
    stripes(m.x - m.w / 2, m.y - .15, m.w);
    text(m.x, m.y + 1.55, `MOULD ${i + 1} · ${m.ready ? 'COOLED' : m.fill + '/' + m.capacity}`, .28, edge);
    if (m.fill === m.capacity && !m.ready) text(m.x, m.y + 1.13, 'COOLING…', .21, '#975f43');
  });
  w.hammers.forEach((h, i) => {
    if (h.warning) box(h.x + .7, h.y + .4, 2.2, 7.5, '#cf694227');
    box(h.x + .65, 9.05, 3.35, .32, steel, edge);
    box(h.x + 1.58, h.y + .43, .43, 8.4 - h.y, '#768c8e');
    const y = h.collider.y;
    box(h.x + .7, y, 2.2, .9, rust, edge);
    box(h.x + .64, y, 2.32, .18, '#a6b7b1', edge);
    stripes(h.x + .77, y + .49, 2.05, .25);
    circle(h.x + 3.63, 8.4, .14, h.warning ? '#f79257' : '#94b69a', edge);
    stripes(h.x - 1.1, h.y - .14, 1.65);
    const clamped = w.pin?.hammer === i;
    for (const dx of [-.64, .49]) box(h.x + dx, h.y, .16, clamped ? .38 : .12, yellow, edge);
    text(h.x - .08, h.y + 1.45, 'SET BAR HERE ↓', .22, edge);
    text(h.x + 1.8, 10.0, `PRESS ${i + 1} · ${h.warning ? 'STAND CLEAR' : 'CYCLING'}`, .30, edge);
    if (clamped) text(h.x - .2, h.y + 2.05, `${w.heldPiece?.stamps[i] || 0} / 3`, .35, '#a45736');
  });
  for (const lathe of w.lathes) {
    box(lathe.x - 1.25, 0, 2.5, .4, steel, edge);
    circle(lathe.x, lathe.y, lathe.r, '#697f82', edge, .06);
    circle(lathe.x, lathe.y, lathe.r * .63, '#b0b9a7', edge);
    for (let i = 0; i < 8; i++) {
      const a = time * lathe.spin + i * Math.PI / 4;
      line([[lathe.x + Math.cos(a) * .3, lathe.y + Math.sin(a) * .3],
        [lathe.x + Math.cos(a) * lathe.r, lathe.y + Math.sin(a) * lathe.r]], '#dfbd76', .07);
    }
    circle(lathe.x, lathe.y, .18, edge);
    text(lathe.x, lathe.y + 2, 'LATHE · MAINTAIN CONTACT', .28, edge);
  }
  for (const b of config.belts || []) {
    box(b.x, b.y, .55, b.h, '#35454a', edge);
    const shift = time * 2.5 % .44;
    for (let y = b.y + shift; y < b.y + b.h; y += .44) line([[b.x + .04, y], [b.x + .50, Math.min(y + .21, b.y + b.h)]], '#bb9970', .06);
    circle(b.x + .275, b.y + .28, .20, steel, edge);
    circle(b.x + .275, b.y + b.h - .28, .20, steel, edge);
    text(b.x, b.y + b.h + .8, 'POLISHING BELT', .30, edge);
    text(b.x - 1.35, b.y + b.h / 2, 'PUSH →', .25, '#8a6249');
  }
  if (w.jig) {
    const j = w.jig;
    stripes(j.x - 2.35, j.y - .15, 4.7);
    for (let slot = 0; slot < j.count; slot++) {
      const x = w.slotX(slot), filled = j.slots[slot] !== undefined;
      line([[x - .5, j.y + .05], [x + .5, j.y + .05]], filled ? '#d8e8c2' : '#e1b565', .08);
      for (const dx of [-.60, .47]) box(x + dx, j.y, .12, filled ? .33 : .12, yellow, edge);
      if (!filled && !j.complete) text(x, j.y + .7, `${slot + 1} ↓`, .29, '#836547');
    }
    text(j.x, j.y + 1.8, j.complete ? 'ASSEMBLY READY' : j.weld ? 'WELDING…' : `WELDING JIG · ${j.slots.filter(x => x !== undefined).length}/${j.count}`, .3, edge);
    if (j.weld && !j.complete) {
      circle(j.x, j.y + .5, .26 + .08 * Math.sin(time * 71), '#e1f7ff');
      line([[j.x - 1, j.y + .5], [j.x - .35, j.y + .7], [j.x, j.y + .45], [j.x + .9, j.y + .55]], '#bfeeff', .065);
    }
  }
  for (const s of w.material.slag) circle(s.x, s.y, s.r, '#777d72');
  for (const p of w.material.rocks) {
    const color = p.iron ? '#36494c' : p.shade > .5 ? '#c5a575' : '#debf87';
    poly([[p.x - p.r, p.y], [p.x - p.r * .4, p.y + p.r], [p.x + p.r * .7, p.y + p.r * .65],
      [p.x + p.r, p.y - p.r * .4], [p.x - p.r * .3, p.y - p.r]], color, p.iron ? '#253c43' : null, .015);
    if (p.iron) line([[p.x - p.r * .5, p.y + p.r * .3], [p.x + p.r * .1, p.y + p.r * .5]], '#84988e', .02);
  }
  // Connected, round strokes merge neighbouring drops into viscous lobes.
  for (const [a, b] of w.material.links) line([[a.x, a.y], [b.x, b.y]], '#e88737', .18);
  for (const p of w.material.liquid) circle(p.x, p.y, p.r * 1.12, '#ffb650');
  for (const p of w.material.liquid) circle(p.x - .022, p.y + .025, p.r * .46, '#ffe3a0');
  for (const p of w.pieces) if (!p.attached) workpiece(ctx, p, draw);
  for (const s of w.sparks) {
    ctx.globalAlpha = clamp(s.life / .25, 0, 1);
    line([[s.x, s.y], [s.x - s.vx * .035, s.y - s.vy * .035]], s.color, .045);
  }
  ctx.globalAlpha = 1;
}

export function drawTool(ctx, sim, body, draw, ghost = false) {
  const {line, box, circle, text} = draw, w = sim.industry;
  ctx.save(); ctx.translate(body.x, body.y); ctx.rotate(body.a);
  if (w.tool === 'ladle') {
    for (const wall of CUP_WALLS) box(wall.x, wall.y, wall.w, wall.h, '#6c7776', edge);
    line([[-.81, .58], [-.98, .58], [-.98, .85], [0, .60], [.98, .85], [.98, .58], [.81, .58]], edge, .05);
    circle(0, .60, .13, rust, edge);
    box(-.6, -.56, 1.2, .1, '#9da49b');
    text(0, -.47, 'HOT', .15, '#efc98a');
  } else {
    line([[0, .60], [0, .23]], edge, .07);
    box(-.55, -.13, 1.1, .34, steel, edge);
    box(-.42, -.18, .84, .10, yellow, edge);
    for (const x of [-.30, 0, .30]) line([[x, -.11], [x + .10, .18]], rust, .065);
    circle(0, .32, .09, w.action ? '#96745c' : '#bde7aa', edge);
    if (w.heldPiece && !ghost) workpiece(ctx, {...w.heldPiece, x: .20, y: -.18, a: 0}, draw);
    if (!w.action && w.tool === 'magnet') {
      ctx.setLineDash([.09, .14]);
      ctx.beginPath(); ctx.ellipse(0, -.20, .9, .65, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = '#719fa778'; ctx.lineWidth = .03; ctx.stroke(); ctx.setLineDash([]);
    }
  }
  circle(0, .60, .06, '#c3c9aa', edge);
  ctx.restore();
}
