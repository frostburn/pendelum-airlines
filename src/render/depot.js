import { pieceOutline } from '#game/industry/workpiece';

// World-anchored bays: camera movement only changes their screen position.
export function drawDepotBackground(ctx, cam, width, height, scene) {
  const street = scene === 'street', yard = scene === 'yard';
  ctx.fillStyle = street ? '#e5e8e0' : yard ? '#dbe5df' : '#e7e4d8';
  ctx.fillRect(0, 0, width, height);
  const scale = 20, ground = height / 2 + (cam.y - 1.5) * 18;
  const first = Math.floor((cam.x - width / 2 / scale) / 9) - 1;
  const count = Math.ceil(width / (9 * scale)) + 3;
  for (let j = 0; j < count; j++) {
    const id = first + j, x = (id * 9 - cam.x) * scale + width / 2;
    if (street) {
      const h = 145 + ((id % 4 + 4) % 4) * 19;
      ctx.fillStyle = ['#c8d2c7', '#d2d5c4', '#d5cebf'][(id % 3 + 3) % 3];
      ctx.fillRect(x, ground - h, 156, h);
      ctx.fillStyle = '#a9b9b0';
      for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) ctx.fillRect(x + 14 + col * 34, ground - h + 22 + row * 37, 18, 24);
      ctx.fillStyle = '#adb9ac'; ctx.fillRect(x - 5, ground - h - 6, 166, 8);
    } else {
      ctx.fillStyle = yard ? '#bdcfc5' : '#c9cec1';
      ctx.fillRect(x, ground - 250, 172, 250);
      ctx.fillStyle = '#aebfb4'; ctx.fillRect(x + 8, ground - 206, 152, 6);
      ctx.fillRect(x + 8, ground - 260, 152, 8);
      if (yard) {
        ctx.fillStyle = '#a3b7ad'; ctx.fillRect(x + 24, ground - 90, 125, 90);
        for (let n = 1; n < 8; n++) { ctx.fillStyle = '#b2c1b7'; ctx.fillRect(x + 26, ground - n * 11, 121, 2); }
      } else {
        for (let shelf = 0; shelf < 3; shelf++) {
          const y = ground - 36 - shelf * 52;
          ctx.fillStyle = '#bcb494';
          for (let b = 0; b < 4; b++) ctx.fillRect(x + 14 + b * 35, y - 34, 27, 34);
          ctx.fillStyle = '#96afa4'; ctx.fillRect(x + 8, y, 152, 5);
        }
        ctx.fillStyle = '#a1b6aa'; ctx.fillRect(x + 7, ground - 194, 5, 194); ctx.fillRect(x + 159, ground - 194, 5, 194);
      }
    }
  }
}

export function drawDepot(ctx, sim, draw, time) {
  const {box, poly, circle, line, text} = draw, depot = sim.industry;
  const ink = '#334a4b', steel = '#668379', cream = '#f1e8ce';
  for (const r of sim.level.terrain) if (r.style === 'metal') {
    box(r.x, r.y, r.w, r.h, '#adb5a3', ink);
    box(r.x, r.y + r.h - .12, r.w, .12, steel);
    if (r.y > 2.5 && r.h < .6) {
      text(r.x + r.w / 2, r.y + r.h + .45, 'LOADS ONLY · LOW CLEARANCE', .25, ink);
      for (let x = r.x + .2; x < r.x + r.w; x += .6) box(x, r.y + .06, .25, .12, '#dba858');
    }
  }
  for (const [i, w] of depot.workers.entries()) {
    const home = depot.manifest.workers[i], active = ['lifting', 'carrying'].includes(w.state);
    const color = w.kind === 'tug' ? '#5f8fa1' : w.kind === 'clerk' ? '#538a77' : '#dda74f';
    if (w.kind !== 'clerk') {
      line([[home.x - 2, .12], [home.dropX + 2, .12]], '#9baca0', .05);
      text(home.x, .45, 'LOAD HERE · HOLD J', .22, ink);
      text(home.dropX, home.dropY + 1.7, 'COLLECT HERE', .25, ink);
      box(w.x - 2.1, .44, 5.45, .56, color, ink);
      for (const x of [w.x - 1.45, w.x + 2.7]) {
        circle(x, .42, .36, ink); circle(x, .42, .17, '#abb8ae');
        line([[x - .13 * Math.cos(time * w.deck.vx * 3), .42 - .13 * Math.sin(time * w.deck.vx * 3)],
          [x + .13 * Math.cos(time * w.deck.vx * 3), .42 + .13 * Math.sin(time * w.deck.vx * 3)]], ink, .03);
      }
      box(w.body.x, w.body.y, w.body.w, w.body.h, color, ink);
      box(w.x + 2.33, 1.00, .78, .47, ink);
      // Headlights behave like eyes: the vehicle looks toward its job.
      const look = w.state === 'returning' ? -.06 : .06;
      for (const x of [w.x + 2.48, w.x + 2.91]) circle(x + look, 1.24, .07, active ? '#fcdf8d' : '#edf2d6');
      circle(w.x + 2.77, 1.83, .12, active && Math.sin(time * 7) > 0 ? '#f8db79' : '#b28346');
      if (w.kind === 'forklift') {
        box(w.x + 2, .8, .14, home.dropY + .6, ink);
        line([[w.x + 2.06, .95], [w.x + 2.06, w.y + .25]], '#e2c279', .04);
        box(w.x + 1.84, w.y - .25, .3, .5, color, ink);
      } else {
        line([[w.x + 2.04, .95], [w.x + 2.35, .95]], ink, .09);
        text(w.x - .4, .75, 'MUTT', .24, cream);
      }
    } else {
      box(w.x - 2, 0, 4, 1.05, steel, ink);
      box(w.x - 1.65, .2, 3.3, .6, '#8ca493');
      text(w.x, .50, 'SET PARCEL DOWN', .24, cream);
      const away = !depot.available(w, sim.time);
      const personX = w.x + 2.75 + (away ? 1.1 : 0);
      // A person with a scanner and a mug, never a combat target.
      circle(personX, 2.28, .23, '#d4a97f', ink);
      box(personX - .25, 1.05, .5, .99, color, ink);
      box(personX - .30, 2.42, .62, .10, color, ink);
      line([[personX - .14, 1.05], [personX - .20, .08]], ink, .09);
      line([[personX + .14, 1.05], [personX + .23, .08]], ink, .09);
      line([[personX - .2, 1.85], [personX - (away ? .4 : .8), 1.7]], ink, .08);
      box(personX - (away ? .55 : .97), 1.64, .22, .22, away ? '#f4dfb6' : '#354d53', ink);
      if (w.clock > 0) line([[w.x + 1.9, 1.65], [w.x + .5, 1.5]], '#dc8863', .025);
    }
    box(w.deck.x, w.deck.y, w.deck.w, w.deck.h, '#e0b25b', ink);
    for (let x = w.deck.x + .1; x < w.deck.x + w.deck.w; x += .4) box(x, w.deck.y + .03, .16, .06, ink);
    const signY = Math.max(w.y + 2.7, 6.9);
    text(w.x, signY, w.name, .34, ink);
    text(w.x, signY - .48, w.message, .23, active ? '#946036' : '#4c7868');
    if (w.queue) text(w.x, signY - .85, `QUEUE: ${w.queue.join(' → ')}`, .22, '#6c7060');
  }
  for (const p of depot.pieces) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
    poly(pieceOutline(p), p.delivered ? '#a7b394' : '#c59660', ink);
    box(-.13, -.39, .25, .78, '#e8ce8c');
    box(-.54, -.25, .52, .43, p.color, ink);
    box(.21, -.22, .34, .35, '#ede6ce');
    for (let b = 0; b < 5; b++) box(.24 + b * .055, -.18, b % 2 ? .016 : .03, .22, ink);
    box(-.34, .35, .7, .08, '#a7b9b1', ink);
    text(-.29, -.025, p.code, .18, '#fff6dc');
    const done = p.route.filter(id => p.receipts[id]).length;
    for (let j = 0; j < p.route.length; j++) circle(-.36 + j * .28, -.32, .06, j < done ? '#42806c' : '#efe1b5', ink);
    ctx.restore();
    if (!p.delivered) text(p.x, p.y - .88, `${p.code} · ${done}/${p.route.length}`, .22, ink);
  }
}
