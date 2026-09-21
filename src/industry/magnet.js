import { clamp } from '#game/math';
import { eff, impulse, vel } from '#game/rigid-body';

// An attractive, central force: damping may weaken it, but cannot reverse it.
// Applying the same impulse at both ends conserves linear and angular momentum.
export function attract(a, b, strength, range, dt) {
  const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
  if (d < 1e-6 || d >= range) return;
  const nx = dx / d, ny = dy / d, av = vel(a), bv = vel(b);
  const closing = (bv.x - av.x) * nx + (bv.y - av.y) * ny;
  const inverseMass = eff(a, nx, ny) + eff(b, nx, ny);
  const damping = 1.3 * Math.sqrt(strength / range / inverseMass);
  const force = clamp(strength * (1 - d / range) - closing * damping, 0, strength);
  // Do not step through the equilibrium in one substep.
  const j = Math.min(force * dt, Math.max(0, d / dt - closing) / (eff(a, nx, ny) + eff(b, nx, ny)));
  impulse(a, nx, ny, -j); impulse(b, nx, ny, j);
}
