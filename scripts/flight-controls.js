import { clamp } from '#game/math';

// Test pilot only. Feedback from both masses damps the swing; the returned
// controls still apply thrust exclusively to the engine through Sim.step().
export function steer(s, x, y, vx = 0, vy = 0, slow = false) {
  const e = s.engine, c = s.cabin;
  const tx = vx + 1.007 * (x - e.x) - .538 * (x - c.x) -
    .251 * (e.vx - vx) - .051 * (c.vx - vx);
  const ty = vy + 1.3 * (y + .92 + s.length - e.y);
  return {x: clamp(tx / 5, slow ? -.22 : -1, slow ? .22 : 1),
    y: clamp(ty / 3.8, slow ? -.35 : -1, slow ? .35 : 1)};
}
