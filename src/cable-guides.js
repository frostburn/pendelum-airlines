/** Contact against a fixed round fairlead. The pulley mounting is scenery;
 * the visible circular rim is solid to every part of the rig.
 */
export function circleGuide(x, y, radius, guide) {
  const dx = x - guide.x, dy = y - guide.y, reach = radius + guide.r;
  if (Math.abs(dx) >= reach || Math.abs(dy) >= reach) return null;
  const d = Math.hypot(dx, dy);
  if (d >= reach) return null;
  // A degenerate centre hit gets a deterministic normal rather than NaNs.
  return d > 1e-10 ? {nx: dx / d, ny: dy / d, depth: reach - d} :
    {nx: 0, ny: 1, depth: reach};
}
