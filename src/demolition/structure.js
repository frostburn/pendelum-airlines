import { Body, point, eff, move, vel, impulse } from '#game/rigid-body';
import { clamp } from '#game/math';

export const STRUCTURE_LIMIT = 16;
export const JOINT_LIMIT = 24;
export const BALL_RADIUS = .66;

export function member(spec, id) {
  const m = spec.mass ?? 5, w = spec.width, h = spec.height;
  const b = Object.assign(new Body(spec.x, spec.y, m, m * (w * w + h * h) / 12, 'piece'),
    {id, cut: 0, attached: false, settle: 0, metal: true, ...spec});
  b.radius = Math.hypot(w, h) / 2;
  b.sections = [-w / 2 + .08, 0, w / 2 - .08].map(x => ({x, lo: -h / 2, hi: h / 2}));
  // Bounded perimeter samples for static terrain; dynamic members use SAT.
  b.colliders = [];
  const r = Math.min(.12, w / 4, h / 4);
  const nx = Math.max(1, Math.ceil(w / .65)), ny = Math.max(1, Math.ceil(h / .65));
  for (let i = 0; i <= nx; i++) for (const sign of [-1, 1])
    b.colliders.push([(-w / 2 + r) * (1 - 2 * i / nx), sign * (h / 2 - r), r]);
  for (let i = 1; i < ny; i++) for (const sign of [-1, 1])
    b.colliders.push([sign * (w / 2 - r), (-h / 2 + r) * (1 - 2 * i / ny), r]);
  return b;
}
export function corners(b) {
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => point(b, x * b.width / 2, y * b.height / 2));
}
export function bounds(b) {
  const q = corners(b);
  return {left: Math.min(...q.map(p => p.x)), right: Math.max(...q.map(p => p.x)),
    bottom: Math.min(...q.map(p => p.y)), top: Math.max(...q.map(p => p.y))};
}
export function local(b, x, y) {
  const c = Math.cos(b.a), s = Math.sin(b.a), dx = x - b.x, dy = y - b.y;
  return {x: c * dx + s * dy, y: -s * dx + c * dy};
}
function split(p, nx, ny, j) {
  const b = p.b, x = b.x, y = b.y, a = b.a;
  move(p, nx, ny, j);
  b.ox += b.x - x; b.oy += b.y - y; b.oa += b.a - a;
}
export function joint(spec, bodies) {
  const a = bodies.find(b => b.id === spec.a), b = bodies.find(b => b.id === spec.b);
  if (!a || (spec.b && !b)) throw new Error('Unknown structural connection');
  const ground = new Body(spec.x, spec.y, 1); ground.im = 0;
  return {...spec, broken: false, angle: (b?.a || 0) - a.a, a, b: b || ground,
    la: local(a, spec.x, spec.y), lb: b ? local(b, spec.x, spec.y) : {x: 0, y: 0}};
}
export function jointPoints(j) { return [point(j.a, j.la.x, j.la.y), point(j.b, j.lb.x, j.lb.y)]; }
export function solveJoint(j, velocity = false) {
  if (j.broken) return;
  const [a, b] = jointPoints(j), av = velocity ? vel(a) : a, bv = velocity ? vel(b) : b;
  let dx = bv.x - av.x, dy = bv.y - av.y;
  if (!velocity) { const scale = Math.min(1, .15 / Math.max(1e-8, Math.hypot(dx, dy))); dx *= scale; dy *= scale; }
  const mass = a.b.im + b.b.im;
  const xx = mass + a.ry * a.ry * a.b.ii + b.ry * b.ry * b.b.ii;
  const yy = mass + a.rx * a.rx * a.b.ii + b.rx * b.rx * b.b.ii;
  const xy = -a.rx * a.ry * a.b.ii - b.rx * b.ry * b.b.ii, det = xx * yy - xy * xy;
  const jx = (yy * dx - xy * dy) / det, jy = (xx * dy - xy * dx) / det;
  const apply = velocity ? impulse : split;
  apply(a, 1, 0, jx); apply(a, 0, 1, jy); apply(b, 1, 0, -jx); apply(b, 0, 1, -jy);
  if (j.weld) {
    const error = velocity ? j.b.w - j.a.w : j.b.a - j.a.a - j.angle;
    const torque = error / (j.a.ii + j.b.ii);
    if (velocity) { j.a.w += torque * j.a.ii; j.b.w -= torque * j.b.ii; }
    else { j.a.a += torque * j.a.ii; j.a.oa += torque * j.a.ii; j.b.a -= torque * j.b.ii; j.b.oa -= torque * j.b.ii; }
  }
}
function contact(a, b, x, y, nx, ny, depth, contacts, key) {
  const al = local(a, x, y), bl = local(b, x, y), ap = point(a, al.x, al.y), bp = point(b, bl.x, bl.y);
  const j = Math.min(.10, depth) / (eff(ap, nx, ny) + eff(bp, nx, ny));
  split(ap, nx, ny, -j); split(bp, nx, ny, j);
  if (contacts.some(c => c.a === a && c.b === b && c.key === key)) return;
  const av = vel(ap), bv = vel(bp), incoming = -((bv.x - av.x) * nx + (bv.y - av.y) * ny);
  contacts.push({a, b, al, bl, nx, ny, incoming, key});
  if (b.kind === 'engine' || b.kind === 'cabin') b.impact = Math.max(b.impact, incoming);
}
export function circleMember(a, b, samples, contacts) {
  if (Math.hypot(a.x - b.x, a.y - b.y) > a.radius + 1.1) return;
  for (let i = 0; i < samples.length; i++) {
    const [lx, ly, r] = samples[i], p = point(b, lx, ly), q = local(a, p.x, p.y);
    const hx = a.width / 2, hy = a.height / 2;
    if (Math.abs(q.x) > hx + r || Math.abs(q.y) > hy + r) continue;
    let dx = q.x - clamp(q.x, -hx, hx), dy = q.y - clamp(q.y, -hy, hy), d = Math.hypot(dx, dy), depth;
    if (d > r) continue;
    if (d > 1e-8) { dx /= d; dy /= d; depth = r - d; }
    else if (hx - Math.abs(q.x) < hy - Math.abs(q.y)) { dx = Math.sign(q.x) || 1; dy = 0; depth = r + hx - Math.abs(q.x); }
    else { dx = 0; dy = Math.sign(q.y) || 1; depth = r + hy - Math.abs(q.y); }
    const c = Math.cos(a.a), s = Math.sin(a.a), nx = dx * c - dy * s, ny = dx * s + dy * c;
    contact(a, b, p.x - nx * r, p.y - ny * r, nx, ny, depth, contacts, i);
  }
}
export function collideMembers(a, b, contacts) {
  if (Math.hypot(a.x - b.x, a.y - b.y) > a.radius + b.radius) return;
  const aa = corners(a), bb = corners(b);
  let depth = Infinity, nx, ny;
  for (const angle of [a.a, a.a + Math.PI / 2, b.a, b.a + Math.PI / 2]) {
    const x = Math.cos(angle), y = Math.sin(angle);
    const ap = aa.map(p => p.x * x + p.y * y), bp = bb.map(p => p.x * x + p.y * y);
    const overlap = Math.min(Math.max(...ap), Math.max(...bp)) - Math.max(Math.min(...ap), Math.min(...bp));
    if (overlap <= 0) return;
    if (overlap < depth) {
      depth = overlap; const sign = (b.x - a.x) * x + (b.y - a.y) * y >= 0 ? 1 : -1;
      nx = x * sign; ny = y * sign;
    }
  }
  // Contact at the midpoint of the overlapping support faces, not an arbitrary
  // corner: resting long beams must not acquire a spurious torque.
  const planeA = Math.max(...aa.map(p => p.x * nx + p.y * ny));
  const planeB = Math.min(...bb.map(p => p.x * nx + p.y * ny));
  const af = aa.filter(p => planeA - p.x * nx - p.y * ny < .02);
  const bf = bb.filter(p => p.x * nx + p.y * ny - planeB < .02);
  const tangent = p => -p.x * ny + p.y * nx;
  const lo = Math.max(Math.min(...af.map(tangent)), Math.min(...bf.map(tangent)));
  const hi = Math.min(Math.max(...af.map(tangent)), Math.max(...bf.map(tangent)));
  const t = (lo + hi) / 2, n = (planeA + planeB) / 2;
  contact(a, b, nx * n - ny * t, ny * n + nx * t, nx, ny, depth, contacts, 'sat');
}
export function contactVelocity(c) {
  const {a, b, al, bl, nx, ny} = c, qa = point(a, al.x, al.y), qb = point(b, bl.x, bl.y);
  // Position repair separates the saved material points. Apply both impulses
  // at one shared world point so friction conserves angular momentum too.
  const x = (qa.x + qb.x) / 2, y = (qa.y + qb.y) / 2;
  const ap = {b: a, x, y, rx: x - a.x, ry: y - a.y}, bp = {b, x, y, rx: x - b.x, ry: y - b.y};
  const av = vel(ap), bv = vel(bp), vn = (bv.x - av.x) * nx + (bv.y - av.y) * ny;
  const j = Math.max(0, -vn / (eff(ap, nx, ny) + eff(bp, nx, ny)));
  impulse(ap, nx, ny, -j); impulse(bp, nx, ny, j);
  const vt = (bv.x - av.x) * -ny + (bv.y - av.y) * nx;
  const friction = Math.min(a.friction ?? .4, b.friction ?? .4);
  const f = clamp(-vt / (eff(ap, -ny, nx) + eff(bp, -ny, nx)), -j * friction, j * friction);
  impulse(ap, -ny, nx, -f); impulse(bp, -ny, nx, f);
}
