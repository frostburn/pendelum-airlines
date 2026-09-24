import { localPoint, worldPoint, nearbyPairs } from '#game/industry/geometry';
import { CUP_WALLS, vesselCollision } from '#game/industry/materials';
import { point, vel, eff, impulse } from '#game/rigid-body';

export const WATER = Object.freeze({limit: 192, bucket: 30, tank: 90, mass: .04, rate: 28, speed: 23});

// Swept circles against expanded boxes: even a thin wall stops a fast jet.
export function sweepWater(ax, ay, bx, by, r, box) {
  let enter = 0, leave = 1, nx = 0, ny = 0;
  for (const [a, d, low, high, x, y] of [
    [ax, bx - ax, box.x - r, box.x + box.w + r, 1, 0],
    [ay, by - ay, box.y - r, box.y + box.h + r, 0, 1]
  ]) {
    if (Math.abs(d) < 1e-10) { if (a < low || a > high) return null; continue; }
    let near = (low - a) / d, far = (high - a) / d;
    const sign = d > 0 ? -1 : 1;
    if (near > far) [near, far] = [far, near];
    if (near >= enter) { enter = near; nx = x * sign; ny = y * sign; }
    leave = Math.min(leave, far);
    if (enter > leave) return null;
  }
  if (leave < 0 || enter > 1) return null;
  if (!nx && !ny) return null; // Already resting in the tolerance at a surface.
  return {t: enter, nx, ny};
}

export class WaterField {
  constructor() {
    this.drops = []; this.serial = 0; this.fillClock = 0;
    this.metrics = {peak: 0, fired: 0, scooped: 0, poured: 0, hits: 0, runoff: 0};
  }
  emit(x, y, vx, vy, source = 'hose') {
    if (this.drops.length >= WATER.limit) return false;
    this.drops.push({id: this.serial++, x, y, ox: x, oy: y, vx, vy, r: source === 'bucket' ? .10 : .075,
      mass: WATER.mass, age: 0, source, held: source === 'bucket'});
    this.metrics.peak = Math.max(this.metrics.peak, this.drops.length);
    return true;
  }
  contained(cabin) {
    return this.drops.filter(p => { const q = localPoint(cabin, p.x, p.y);
      return Math.abs(q.x) < .74 && q.y > -.49 && q.y < .64; });
  }
  firstHit(p, sim, work) {
    let best = null;
    const consider = hit => { if (hit && (!best || hit.t < best.t)) best = hit; };
    for (const terrain of sim.terrain) {
      const h = sweepWater(p.ox, p.oy, p.x, p.y, p.r, terrain);
      if (h) consider({...h, terrain});
    }
    for (const body of work.pieces) {
      const a = localPoint(body, p.ox, p.oy), b = localPoint(body, p.x, p.y);
      const h = sweepWater(a.x, a.y, b.x, b.y, p.r, {x: -.9, y: -.45, w: 1.8, h: .9});
      if (h) {
        const c = Math.cos(body.a), s = Math.sin(body.a);
        consider({...h, nx: h.nx * c - h.ny * s, ny: h.nx * s + h.ny * c, body});
      }
    }
    const q = work.tool === 'ladle' && localPoint(sim.cabin, p.x, p.y);
    const carried = q && Math.abs(q.x) < .74 && q.y > -.49 && q.y < .64;
    for (const header of work.headers) if (!carried && header.fill < header.capacity && p.y < p.oy && p.oy >= header.y && p.y <= header.y) {
      const t = (header.y - p.oy) / (p.y - p.oy), x = p.ox + (p.x - p.ox) * t;
      if (Math.abs(x - header.x) < header.w / 2 - .12) consider({t, nx: 0, ny: 1, header});
    }
    return best;
  }
  step(sim, work, dt) {
    const cabin = sim.cabin, bucket = work.tool === 'ladle';
    let inside = bucket ? this.contained(cabin) : [];
    const pool = work.incident.pools.find(p => Math.abs(cabin.x - p.x) < p.w / 2 - .9 &&
      cabin.y > p.bottom + .58 && worldPoint(cabin, 0, .59).y < p.y);
    if (bucket && pool && Math.abs(cabin.a) < .35 && Math.hypot(cabin.vx, cabin.vy) < 1.1) {
      this.fillClock += dt * 26;
      while (this.fillClock >= 1 && inside.length < WATER.bucket) {
        this.fillClock--;
        const q = worldPoint(cabin, ((inside.length % 6) - 2.5) * .18, -.28 + Math.floor(inside.length / 6) * .15);
        if (!this.emit(q.x, q.y, 0, 0, 'bucket')) break;
        inside.push(this.drops.at(-1)); this.metrics.scooped++;
      }
      this.fillClock = Math.min(1, this.fillClock);
    } else this.fillClock = 0;

    const keep = [];
    for (const p of this.drops) {
      p.ox = p.x; p.oy = p.y; p.age += dt;
      p.vy -= 9.81 * dt;
      p.vx += (sim.windAt(p.x, p.y) - p.vx * .035) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const hit = this.firstHit(p, sim, work);
      if (hit) {
        p.x = p.ox + (p.x - p.ox) * hit.t + hit.nx * .001;
        p.y = p.oy + (p.y - p.oy) * hit.t + hit.ny * .001;
        if (hit.header) { hit.header.fill++; hit.header.received++; continue; }
        const fire = hit.body?.fire ?? hit.terrain?.fire;
        const absorbed = fire !== undefined && (work.fires[fire].heat > 0 || work.fires[fire].wet < .8);
        if (hit.body) {
          const q = localPoint(hit.body, p.x, p.y), contact = point(hit.body, q.x, q.y), v = vel(contact);
          const dx = p.vx - v.x, dy = p.vy - v.y, speed = Math.hypot(dx, dy);
          if (absorbed) {
            if (speed) impulse(contact, dx / speed, dy / speed, WATER.mass * speed);
          } else {
            // Surviving runoff gives up only its collision impulse. Transferring
            // the full incoming momentum while retaining the drop would count it twice.
            const vn = dx * hit.nx + dy * hit.ny;
            if (vn < 0) {
              const j = -1.05 * vn / (1 / WATER.mass + eff(contact, hit.nx, hit.ny));
              p.vx += hit.nx * j / WATER.mass; p.vy += hit.ny * j / WATER.mass;
              impulse(contact, -hit.nx, -hit.ny, j);
            }
          }
        }
        if (absorbed) {
          work.wetFire(fire); this.metrics.hits++; continue;
        }
        const vn = p.vx * hit.nx + p.vy * hit.ny;
        if (!hit.body && vn < 0) { p.vx -= 1.05 * vn * hit.nx; p.vy -= 1.05 * vn * hit.ny; }
        p.vx *= .985; p.vy *= .985;
        if (!p.ranOff) { this.metrics.runoff++; p.ranOff = true; }
      }
      const local = localPoint(cabin, p.x, p.y);
      const inCup = bucket && Math.abs(local.x) < .76 && local.y > -.5 && local.y < .66;
      if (inCup) p.age = 0; // Carrying water must not use up its airborne lifetime.
      if (p.held && !inCup) { p.held = false; this.metrics.poured++; }
      if (inCup || (p.age < 6 && p.y > -.8 && p.x > -8 && p.x < sim.level.width + 8)) keep.push(p);
    }
    this.drops = keep;
    if (bucket) {
      // Reuse the metal ladle's walls and two-way collision impulses. Only
      // neighbouring water inside the bucket needs the liquid pressure solve.
      inside = this.contained(cabin);
      for (let iteration = 0; iteration < 2; iteration++) {
        nearbyPairs(inside, .30, (a, b) => {
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .0001;
          if (d >= .17) return;
          const nx = dx / d, ny = dy / d, push = (.17 - d) * .47;
          a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
          const vn = Math.min(0, (b.vx - a.vx) * nx + (b.vy - a.vy) * ny) * .25;
          a.vx += nx * vn; a.vy += ny * vn; b.vx -= nx * vn; b.vy -= ny * vn;
        });
        for (const p of this.drops) vesselCollision(p, cabin, CUP_WALLS);
      }
    }
  }
}
