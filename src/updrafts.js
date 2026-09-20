import { clamp } from '#game/math';

/** A boiler's repeatable pressure cycle. A missing period means continuous heat. */
export function boilerPower(source, time) {
  if (!source.period) return 1;
  return clamp(Math.cos(2 * Math.PI * (time / source.period + (source.phase || 0))) * 2 + .2, 0, 1);
}

/** Vertical force on a cabin-sized surface, in newtons. Soft edges avoid force
 * discontinuities. Force depends on area, not payload mass: freight stays heavy.
 */
export function liftAt(sources, x, y, time) {
  let force = 0;
  for (const s of sources || []) {
    const across = clamp((1 - Math.abs(x - s.x) / (s.w / 2)) * 3, 0, 1);
    const height = clamp((y - s.bottom) / 1.2, 0, 1) * clamp((s.top - y) / 1.8, 0, 1);
    if (across && height) force += s.force * across * height * boilerPower(s, time);
  }
  return force;
}

export const liftArea = kind => kind === 'cabin' ? 1 : kind === 'engine' ? .45 : .025;
