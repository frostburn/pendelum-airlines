/** Fixed fairleads: the outer brass rim is the collision boundary. The pale
 * supports sit behind the flight plane, like the moving lifts' guide rails.
 */
export function drawCableGuide(ctx, guide, active) {
  const {x, y, r} = guide;
  ctx.save();
  ctx.strokeStyle = '#83998d66';
  ctx.lineWidth = .08;
  ctx.beginPath();
  ctx.moveTo(x - r * .7, 0); ctx.lineTo(x, y);
  ctx.lineTo(x + r * .7, 0); ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = active ? '#ebc46d' : '#c5a160';
  ctx.fill();
  ctx.strokeStyle = '#405c4e'; ctx.lineWidth = .055; ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * .73, 0, Math.PI * 2);
  ctx.fillStyle = '#f0e2b4'; ctx.fill();
  ctx.strokeStyle = active ? '#af7335' : '#8c875d'; ctx.lineWidth = .04; ctx.stroke();
  ctx.strokeStyle = '#9b8f60'; ctx.lineWidth = .065;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r * .61, y + Math.sin(a) * r * .61); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(x, y, .13, 0, Math.PI * 2);
  ctx.fillStyle = '#405c4e'; ctx.fill();
  ctx.restore();
}
