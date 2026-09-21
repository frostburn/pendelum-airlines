import { point } from '#game/rigid-body';
import { attract } from '#game/industry/magnet';
import { clamp } from '#game/math';
import { circleBox, localPoint, worldPoint, nearbyPairs } from '#game/industry/geometry';

export const MATERIAL_LIMITS = Object.freeze({rocks: 168, liquid: 96, slag: 24, held: 28});
export const CUP_WALLS = Object.freeze([
  {x: -.83, y: -.56, w: 1.66, h: .16},
  {x: -.83, y: -.40, w: .16, h: .99},
  {x: .67, y: -.40, w: .16, h: .99}
]);
const MAGNET = {x: -.58, y: -.18, w: 1.16, h: .34};

function random(seed) {
  let n = seed >>> 0;
  return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
}

function collide(p, box, vx = 0, vy = 0) {
  const hit = circleBox(p.x, p.y, p.r, box);
  if (!hit) return false;
  p.x += hit.nx * hit.depth; p.y += hit.ny * hit.depth;
  const vn = (p.vx - vx) * hit.nx + (p.vy - vy) * hit.ny;
  if (vn < 0) {
    p.vx -= hit.nx * vn * 1.12; p.vy -= hit.ny * vn * 1.12;
    const tangent = (p.vx - vx) * -hit.ny + (p.vy - vy) * hit.nx;
    p.vx += hit.ny * tangent * .08; p.vy -= hit.nx * tangent * .08;
  }
  return true;
}

function vesselCollision(p, body, walls, react = true) {
  const q = localPoint(body, p.x, p.y), c = Math.cos(body.a), s = Math.sin(body.a);
  for (const wall of walls) {
    const h = circleBox(q.x, q.y, p.r, wall);
    if (!h) continue;
    const nx = h.nx * c - h.ny * s, ny = h.nx * s + h.ny * c;
    p.x += nx * h.depth; p.y += ny * h.depth;
    q.x += h.nx * h.depth; q.y += h.ny * h.depth;
    const rx = p.x - body.x, ry = p.y - body.y;
    const bvx = body.vx - body.w * ry, bvy = body.vy + body.w * rx;
    const vn = (p.vx - bvx) * nx + (p.vy - bvy) * ny;
    if (vn < 0) {
      const mass = p.age === undefined ? .14 : .065, arm = rx * ny - ry * nx;
      const j = -vn / (1 / mass + (react ? 1 / body.m + arm * arm / body.I : 0));
      p.vx += j * nx / mass; p.vy += j * ny / mass;
      if (react) {
        body.vx -= j * nx / body.m; body.vy -= j * ny / body.m;
        body.w -= arm * j / body.I;
      }
    }
  }
}

export class MaterialField {
  constructor(config, seed) {
    this.rocks = []; this.liquid = []; this.slag = []; this.links = [];
    this.serial = 0; this.emitter = 0; this.deposited = 0; this.spilled = 0;
    this.metrics = {peakLiquid: 0, pairCandidates: 0, peakCandidates: 0};
    this.rng = random(seed + 3191);
    for (const pit of config.pits || []) {
      const count = Math.min(pit.count, MATERIAL_LIMITS.rocks - this.rocks.length);
      const columns = Math.floor(pit.w / .34);
      for (let i = 0; i < count; i++) this.rocks.push({
        id: this.serial++, x: pit.x - pit.w / 2 + .2 + (i % columns) * .34 + this.rng() * .06,
        y: pit.y + .16 + Math.floor(i / columns) * .31, r: .10 + this.rng() * .055,
        vx: 0, vy: 0, iron: i % 3 === 0, held: false, shade: this.rng()
      });
    }
  }
  held() { return this.rocks.filter(p => p.held); }
  contained(body) {
    return this.liquid.filter(p => { const q = localPoint(body, p.x, p.y); return Math.abs(q.x) < .71 && q.y > -.47 && q.y < .60; });
  }
  release(body) {
    for (const p of this.held()) {
      p.held = false; p.vx = body.vx - body.w * (p.y - body.y); p.vy = body.vy + body.w * (p.x - body.x);
    }
  }
  emit(x, y) {
    if (this.liquid.length >= MATERIAL_LIMITS.liquid) return;
    this.liquid.push({id: this.serial++, x, y, r: .105, vx: (this.rng() - .5) * .2, vy: -.7, age: 0, iron: false});
    this.metrics.peakLiquid = Math.max(this.metrics.peakLiquid, this.liquid.length);
  }
  step(sim, work, dt) {
    const c = sim.cabin, config = work.config;
    if (work.tool === 'ladle') {
      const tap = config.taps?.find(t => Math.abs(c.x - t.x) < 1.2 && c.y < t.y && c.y > t.y - 3);
      if (tap) {
        this.emitter += dt * 26;
        while (this.emitter >= 1) { this.emitter--; this.emit(tap.x, tap.y); }
      } else this.emitter = 0;
    }
    let held = this.held().length;
    for (const p of this.rocks) {
      if (!p.held && p.iron && work.tool === 'magnet' && !work.action && held < MATERIAL_LIMITS.held) {
        const face = worldPoint(c, 0, -.27), dx = face.x - p.x, dy = face.y - p.y, d = Math.hypot(dx, dy);
        const local = localPoint(c, p.x, p.y);
        if (d < .35 || circleBox(local.x, local.y, p.r + .025, MAGNET)) {
          // Inelastic collection shares incoming momentum before adding weight.
          const mass = .14, total = c.m + mass;
          c.vx = (c.vx * c.m + p.vx * mass) / total;
          c.vy = (c.vy * c.m + p.vy * mass) / total;
          c.setMass(total);
          p.held = true; held++;
        } else if (d < 1.45) {
          Object.assign(p, {a: 0, w: 0, im: 1 / .14, ii: 0});
          attract(point(c, 0, -.27), point(p), 7, 1.45, dt);
        }
      }
    }
    let slot = 0;
    for (const p of this.rocks.filter(p => p.held)) {
      // Pack captured grains around the coil, inside the tool's existing rigid
      // envelope. Growing its collider while scraping the floor injects energy.
      const q = worldPoint(c, (slot % 7 - 3) * .16, .02 + Math.floor(slot / 7) * .15);
      Object.assign(p, q); slot++;
    }
    const free = [...this.rocks.filter(p => !p.held), ...this.liquid];
    for (const p of free) {
      p.vy = Math.max(-14, p.vy - 9.81 * dt);
      p.vx *= 1 - dt * .13;
      p.x += clamp(p.vx, -14, 14) * dt; p.y += p.vy * dt;
      if (p.age !== undefined) p.age += dt;
    }
    this.links = [];
    let candidates = 0;
    for (let iteration = 0; iteration < 2; iteration++) {
      candidates += nearbyPairs(free, .40, (a, b) => {
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .0001;
        const liquid = a.age !== undefined && b.age !== undefined;
        const rest = (a.r + b.r) * (liquid ? .80 : 1);
        if (d < rest) {
          const push = (rest - d) * .48, nx = dx / d, ny = dy / d;
          a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
          const approaching = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (approaching < 0) {
            const j = approaching * (liquid ? .28 : .44);
            a.vx += nx * j; a.vy += ny * j; b.vx -= nx * j; b.vy -= ny * j;
          }
        }
        if (liquid && d < .32) {
          // Local viscosity and weak cohesion make blobs, not independent sparks.
          const mix = .07, vx = (b.vx - a.vx) * mix, vy = (b.vy - a.vy) * mix;
          a.vx += vx; a.vy += vy; b.vx -= vx; b.vy -= vy;
          if (d > rest) {
            const pull = (d - rest) * dt * 7;
            a.vx += dx / d * pull; a.vy += dy / d * pull; b.vx -= dx / d * pull; b.vy -= dy / d * pull;
          }
          if (iteration === 1 && this.links.length < 256) this.links.push([a, b]);
        }
      });
      for (const p of free) {
        for (const t of sim.terrain) if (t.w && t.hammer === undefined) collide(p, t, t.vx || 0, t.vy || 0);
        if (work.tool === 'ladle') vesselCollision(p, c, CUP_WALLS);
        else vesselCollision(p, c, [MAGNET]);
      }
    }
    this.metrics.pairCandidates = candidates;
    this.metrics.peakCandidates = Math.max(this.metrics.peakCandidates, candidates);
    const bin = config.bin;
    if (bin) this.rocks = this.rocks.filter(p => {
      if (!p.held && p.iron && Math.abs(p.x - bin.x) < bin.w / 2 - .15 && p.y < bin.y + .8) {
        this.deposited++; return false;
      }
      return true;
    });
    this.liquid = this.liquid.filter(p => {
      const q = localPoint(c, p.x, p.y), inCup = work.tool === 'ladle' && Math.abs(q.x) < .75 && q.y > -.5 && q.y < .65;
      const mold = !inCup && work.molds.find(m => m.fill < m.capacity && Math.abs(p.x - m.x) < m.w / 2 - .12 && p.y < m.y + .5 && p.y > m.y);
      if (mold && work.tool === 'ladle') { mold.fill = Math.min(mold.capacity, mold.fill + 1); return false; }
      if ((!inCup && p.age > 1.2 && Math.abs(p.vy) < .22 && p.y < 1) || (!inCup && p.age > 28) || p.y < -2 || p.x < -6 || p.x > sim.level.width + 6) {
        this.spilled++;
        if (this.slag.length >= MATERIAL_LIMITS.slag) this.slag.shift();
        this.slag.push({x: p.x, y: Math.max(.08, p.y), r: .08 + this.rng() * .08});
        return false;
      }
      return true;
    });
  }
}
