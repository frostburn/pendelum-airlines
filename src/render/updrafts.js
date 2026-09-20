import { boilerPower } from '#game/updrafts';

/** The tinted footprint is the force field, including its soft edges. Animated
 * chevrons and a pressure gauge make an inactive boiler distinct from active air.
 */
export function drawUpdraft(ctx, s, time, reduced, map) {
  const power = boilerPower(s, time), left = s.x - s.w / 2, height = s.top - s.bottom;
  ctx.save();
  // Fade the edges with the same profile as the force. Exact bounds are useful
  // on the map; the flight view keeps only the air and its directional marks.
  for (let band = 0; band < 12; band++) {
    const fraction = (band + .5) / 12;
    const edge = Math.min(1, (1 - Math.abs(fraction * 2 - 1)) * 3);
    ctx.fillStyle = `rgba(202,151,70,${(.015 + power * .065) * edge})`;
    ctx.fillRect(left + s.w * band / 12, s.bottom, s.w / 12, height);
  }
  ctx.strokeStyle = `rgba(173,126,55,${.16 + power * .18})`;
  ctx.lineWidth = .04;
  ctx.setLineDash([.15, .2]);
  if (map) ctx.strokeRect(left, s.bottom, s.w, height);
  ctx.setLineDash([]);
  const drift = reduced || power <= .1 ? 0 : time * 1.6;
  ctx.strokeStyle = power > .1 ? `rgba(168,117,42,${.18 + power * .4})` : '#7b8b7755';
  ctx.lineWidth = .045;
  for (const offset of [-s.w * .25, 0, s.w * .25]) {
    for (let i = 0; i < Math.floor(height / 2.8); i++) {
      const y = s.bottom + .8 + ((i * 2.8 + drift) % Math.max(1, height - 1.6));
      ctx.beginPath();
      ctx.moveTo(s.x + offset - .16, y - .13);
      ctx.lineTo(s.x + offset, y + .1);
      ctx.lineTo(s.x + offset + .16, y - .13);
      ctx.stroke();
    }
  }
  // The outlet is a flush grate, not another collision obstacle.
  ctx.fillStyle = '#6f7960';
  ctx.fillRect(s.x - 1.05, s.bottom - .46, 2.1, .12);
  ctx.strokeStyle = '#d6bd80'; ctx.lineWidth = .05;
  for (let x = s.x - .9; x <= s.x + .91; x += .3) {
    ctx.beginPath(); ctx.moveTo(x, s.bottom - .44); ctx.lineTo(x + .12, s.bottom - .36); ctx.stroke();
  }
  ctx.fillStyle = '#e5dec3'; ctx.fillRect(s.x - .65, s.bottom + .2, 1.3, .15);
  ctx.fillStyle = power > .1 ? '#b7843a' : '#889181'; ctx.fillRect(s.x - .65, s.bottom + .2, 1.3 * power, .15);
  ctx.strokeStyle = '#7b795a'; ctx.lineWidth = .025;
  ctx.strokeRect(s.x - .65, s.bottom + .2, 1.3, .15);
  ctx.restore();
}
