export class Body {
  constructor(x, y, m, I = 0, kind = 'node') {
    Object.assign(this, {
      x,
      y,
      m,
      I,
      im: 1 / m,
      ii: I ? 1 / I : 0,
      a: 0,
      vx: 0,
      vy: 0,
      w: 0,
      kind,
      ox: x,
      oy: y,
      oa: 0,
      contacts: [],
      impact: 0
    });
  }
  setMass(m) {
    this.I *= m / this.m;
    this.m = m;
    this.im = 1 / m;
    this.ii = this.I ? 1 / this.I : 0;
  }
}
export function point(b, lx = 0, ly = 0) {
  const c = Math.cos(b.a), s = Math.sin(b.a), rx = lx * c - ly * s, ry = lx * s + ly * c;
  return {
    x: b.x + rx,
    y: b.y + ry,
    rx,
    ry,
    b
  };
}
export function eff(p, nx, ny) {
  const r = p.rx * ny - p.ry * nx;
  return p.b.im + r * r * p.b.ii;
}
export function move(p, nx, ny, j) {
  p.b.x += nx * j * p.b.im;
  p.b.y += ny * j * p.b.im;
  p.b.a += (p.rx * ny - p.ry * nx) * j * p.b.ii;
}
export function vel(p) {
  return { x: p.b.vx - p.b.w * p.ry, y: p.b.vy + p.b.w * p.rx };
}
export function impulse(p, nx, ny, j) {
  p.b.vx += nx * j * p.b.im;
  p.b.vy += ny * j * p.b.im;
  p.b.w += (p.rx * ny - p.ry * nx) * j * p.b.ii;
}
