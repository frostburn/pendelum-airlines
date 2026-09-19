import { TAU } from '#game/constants';

/** Powered platforms repeat on simulation time, never wall time. A quarter
 * phase starts at the far end; dx/dy are half the full travel distance.
 * Position and velocity share the same analytic path, including at reversals.
 */
export function stopAt(pad, time) {
  if (!pad.motion) return {...pad, vx: 0, vy: 0};
  const {dx = 0, dy = 0, period, phase = 0} = pad.motion;
  const omega = TAU / period;
  const angle = omega * time + TAU * phase;
  return {...pad,
    x: pad.x + dx * Math.sin(angle),
    y: pad.y + dy * Math.sin(angle),
    vx: dx * omega * Math.cos(angle),
    vy: dy * omega * Math.cos(angle),
  };
}

/** The landing strip and the solid deck are generated from the same pose. */
export function deckAt(pad) {
  const h = .42;
  return {x: pad.x - pad.w / 2 - .25, y: pad.y - h,
    w: pad.w + .5, h, vx: pad.vx, vy: pad.vy, style: 'deck'};
}
