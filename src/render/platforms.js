import { deckAt } from '#game/moving-stops';

/** World-space decoration for driven decks. Landing strips and passengers
 * are drawn by the station painter at the very same interpolated pose.
 */
export function drawMovingStop(ctx, p, origin, map) {
  const {dx = 0, dy = 0} = p.motion;
  const deck = deckAt(p);
  const line = (points, color, width = .045) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  ctx.save();
  if (p.vehicle === 'lift') {
    // Guide rails sit behind the flight plane, outside the landing strip.
    for (const side of [-1, 1]) {
      const x = origin.x + side * (p.w / 2 + .7);
      line([[x, origin.y - dy - .8], [x, origin.y + dy + .6]], '#82988b', .07);
      for (let y = origin.y - dy; y <= origin.y + dy; y += 1)
        line([[x - .14, y], [x + .14, y]], '#82988b');
      line([[p.x + side * (p.w / 2 + .25), p.y - .2], [x, p.y - .2]], '#4f7363', .08);
    }
  }
  if (p.vehicle === 'train') {
    const y = origin.y - .83;
    line([[origin.x - dx - p.w / 2 - .7, y], [origin.x + dx + p.w / 2 + .7, y]], '#516c60', .075);
    for (let x = origin.x - dx - p.w / 2; x <= origin.x + dx + p.w / 2; x += .65)
      line([[x, y - .14], [x, y + .05]], '#718778', .08);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(p.x + side * (p.w / 2 - .35), p.y - .59, .22, 0, Math.PI * 2);
      ctx.fillStyle = '#365647';
      ctx.fill();
      const angle = (p.x - origin.x) / .22;
      const x = p.x + side * (p.w / 2 - .35), y = p.y - .59;
      line([[x, y], [x + .17 * Math.cos(angle), y + .17 * Math.sin(angle)]], '#d5d8b9', .04);
    }
  }
  if (map || p.vehicle === 'ferry') {
    ctx.setLineDash([.11, .26]);
    line([[origin.x - dx, origin.y - dy - .2], [origin.x + dx, origin.y + dy - .2]], '#597e6a77', .035);
    ctx.setLineDash([]);
    for (const sign of [-1, 1]) {
      const x = origin.x + sign * dx, y = origin.y + sign * dy - .2;
      line([[x - .12, y], [x + .12, y]], '#597e6a88');
    }
  }
  ctx.fillStyle = p.vehicle === 'ferry' ? '#487c72' : p.vehicle === 'train' ? '#b57951' : '#bc9652';
  ctx.fillRect(deck.x, deck.y, deck.w, deck.h);
  ctx.strokeStyle = '#345648';
  ctx.lineWidth = .04;
  ctx.strokeRect(deck.x, deck.y, deck.w, deck.h);
  line([[deck.x + .06, p.y - .14], [deck.x + deck.w - .06, p.y - .14]], '#e2d4a6', .07);
  if (p.vehicle === 'ferry') {
    line([[deck.x + .03, .08], [deck.x + deck.w - .03, .08]], '#a9c9bc', .12);
    for (let x = deck.x + .65; x < deck.x + deck.w - .35; x += .9) {
      ctx.beginPath();
      ctx.arc(x, p.y - .65, .10, 0, Math.PI * 2);
      ctx.fillStyle = '#c3d6c1'; ctx.fill();
    }
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(p.x + side * (p.w / 2 - .16), p.y - .26, .12, 0, Math.PI * 2);
      ctx.strokeStyle = '#233f39'; ctx.lineWidth = .075; ctx.stroke();
    }
  }
  // A velocity arrow shows the approaching reversal without hiding a timer.
  const speed = Math.hypot(p.vx, p.vy);
  if (speed > .08) {
    const color = p.vehicle === 'ferry' ? '#e9dbc0' : '#355b4d';
    const ux = p.vx / speed, uy = p.vy / speed;
    const x = p.x, y = p.y - .98, length = .3 + speed * .28;
    const tipX = x + ux * length, tipY = y + uy * length;
    line([[x - ux * length, y - uy * length], [tipX, tipY]], color, .05);
    line([[tipX - ux * .17 - uy * .12, tipY - uy * .17 + ux * .12],
      [tipX, tipY], [tipX - ux * .17 + uy * .12, tipY - uy * .17 - ux * .12]], color, .05);
  }
  ctx.restore();
}
