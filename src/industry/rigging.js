import { clamp, wrap } from '#game/math';
import { point, eff, move, vel, impulse } from '#game/rigid-body';
import { localPoint, worldPoint } from '#game/industry/geometry';
import { pieceOutline } from '#game/industry/workpiece';

export function closestSurface(piece, x, y) {
  const q = localPoint(piece, x, y), poly = pieceOutline(piece);
  let best, distance = Infinity, inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j], [bx, by] = poly[i], dx = bx - ax, dy = by - ay;
    const t = clamp(((q.x - ax) * dx + (q.y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    const px = ax + t * dx, py = ay + t * dy, d = Math.hypot(q.x - px, q.y - py);
    if (d < distance) { distance = d; best = {x: px, y: py}; }
    if ((ay > q.y) !== (by > q.y) && q.x < (bx - ax) * (q.y - ay) / (by - ay) + ax) inside = !inside;
  }
  return {...best, distance, inside};
}

function splitMove(p, nx, ny, j) {
  const b = p.b, x = b.x, y = b.y, a = b.a;
  move(p, nx, ny, j);
  b.ox += b.x - x; b.oy += b.y - y; b.oa += b.a - a;
}

export function constrainGrip(cabin, piece) {
  if (!piece?.grip) return;
  const g = piece.grip;
  for (const [nx, ny] of [[1, 0], [0, 1]]) {
    const a = point(cabin, g.poleX ?? 0, g.poleY ?? -.18), b = point(piece, g.x, g.y);
    const error = (b.x - a.x) * nx + (b.y - a.y) * ny;
    const j = clamp(error, -.1, .1) / (eff(a, nx, ny) + eff(b, nx, ny));
    splitMove(a, nx, ny, j); splitMove(b, nx, ny, -j);
  }
  const j = clamp(wrap(piece.a - cabin.a - g.angle), -.1, .1) / (cabin.ii + piece.ii);
  cabin.a += j * cabin.ii; cabin.oa += j * cabin.ii;
  piece.a -= j * piece.ii; piece.oa -= j * piece.ii;
}

export function gripVelocity(cabin, piece) {
  if (!piece?.grip) return;
  const g = piece.grip;
  for (const [nx, ny] of [[1, 0], [0, 1]]) {
    const a = point(cabin, g.poleX ?? 0, g.poleY ?? -.18), b = point(piece, g.x, g.y), av = vel(a), bv = vel(b);
    const j = ((bv.x - av.x) * nx + (bv.y - av.y) * ny) / (eff(a, nx, ny) + eff(b, nx, ny));
    impulse(a, nx, ny, j); impulse(b, nx, ny, -j);
  }
  const j = (piece.w - cabin.w) / (cabin.ii + piece.ii);
  cabin.w += j * cabin.ii; piece.w -= j * piece.ii;
}

export function collidePair(piece, body, samples, contacts) {
  if (Math.hypot(piece.x - body.x, piece.y - body.y) > 2.7) return;
  for (let i = 0; i < samples.length; i++) {
    const [lx, ly, r] = samples[i], circle = point(body, lx, ly);
    const surface = closestSurface(piece, circle.x, circle.y);
    if (!surface.inside && surface.distance >= r) continue;
    const q = worldPoint(piece, surface.x, surface.y), d = Math.max(1e-8, surface.distance);
    const sign = surface.inside ? -1 : 1;
    const nx = sign * (circle.x - q.x) / d, ny = sign * (circle.y - q.y) / d;
    const a = point(piece, surface.x, surface.y), local = localPoint(body, q.x, q.y), b = point(body, local.x, local.y);
    const depth = r + sign * -surface.distance, j = Math.min(.08, depth) / (eff(a, nx, ny) + eff(b, nx, ny));
    splitMove(a, nx, ny, -j); splitMove(b, nx, ny, j);
    if (!contacts.some(c => c.piece === piece && c.body === body && c.sample === i))
      contacts.push({piece, body, sample: i, ax: surface.x, ay: surface.y, bx: local.x, by: local.y, nx, ny});
  }
}

export function pairVelocity(c) {
  const {nx, ny} = c, a = point(c.piece, c.ax, c.ay), b = point(c.body, c.bx, c.by), av = vel(a), bv = vel(b);
  const vn = (bv.x - av.x) * nx + (bv.y - av.y) * ny;
  const j = Math.max(0, -vn / (eff(a, nx, ny) + eff(b, nx, ny)));
  impulse(a, nx, ny, -j); impulse(b, nx, ny, j);
  const vt = (bv.x - av.x) * -ny + (bv.y - av.y) * nx;
  const friction = clamp(-vt / (eff(a, -ny, nx) + eff(b, -ny, nx)), -j * .4, j * .4);
  impulse(a, -ny, nx, -friction); impulse(b, -ny, nx, friction);
}
