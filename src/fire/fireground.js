import { Workshop } from '#game/industry/workshop';
import { pieceSamples } from '#game/industry/workpiece';
import { clamp, wrap } from '#game/math';
import { point, vel, impulse } from '#game/rigid-body';
import { WaterField, WATER } from '#game/fire/water';

export class Fireground extends Workshop {
  constructor(sim) {
    super(sim);
    this.incident = sim.level.fire;
    this.water = new WaterField(); this.tank = WATER.tank; this.pitch = -.18; this.facing = 1;
    this.emitter = 0; this.refillClock = 0; this.clearTime = 0; this.previousFlip = false; this.previousSwap = false;
    this.fires = this.incident.fires.map((f, i) => {
      const fire = {soak: 16, ...f, heat: f.heat ?? 1, wet: 0, id: i};
      if (f.mobile) {
        const p = this.addPiece({x: f.x + .9, y: f.y + .45, fire: i, friction: .035});
        p.sections = [-.9, -.45, 0, .45, .9].map(x => ({x, lo: -.45, hi: .45}));
        p.colliders = pieceSamples(p); p.setMass(7); p.I = 2.36; p.ii = 1 / p.I;
        fire.body = p;
      }
      return fire;
    });
    this.headers = (this.incident.headers || []).map(h => ({capacity: 60, ...h, fill: 0, received: 0, clock: 0, emitted: 0}));
    this.updateMass(sim);
  }
  updateMass(sim) {
    const mass = 3 + (this.tool === 'hose' ? (this.tank ?? WATER.tank) * WATER.mass : 0);
    if (Math.abs(sim.cabin.m - mass) > .00001) sim.cabin.setMass(mass);
  }
  samples() {
    if (this.tool === 'ladle') return super.samples();
    const a = this.facing === -1 ? Math.PI - (this.pitch || 0) : this.pitch || 0;
    return [[-.32, -.30, .24], [.32, -.30, .24], [-.32, .14, .24], [.32, .14, .24], [0, .40, .12], [.88 * Math.cos(a), -.12 + .88 * Math.sin(a), .12]];
  }
  nozzle(cabin) {
    const a = this.facing > 0 ? this.pitch : Math.PI - this.pitch, dx = Math.cos(a), dy = Math.sin(a);
    const pole = point(cabin, dx * .91, -.12 + dy * .91), angle = a + cabin.a;
    return {pole, dx: Math.cos(angle), dy: Math.sin(angle)};
  }
  canSwap(sim) {
    const r = this.config.rack, c = sim.cabin;
    return Math.abs(c.x - r.x) < 1.4 && c.y - r.y > .53 && c.y - r.y < .82 &&
      Math.abs(wrap(c.a)) < .3 && Math.hypot(c.vx, c.vy) < .8;
  }
  clearInput() {
    this.previousFlip = this.previousSwap = this.action = false;
    this.emitter = 0;
  }
  beforeStep(sim, input, dt) {
    super.beforeStep(sim, input, dt);
    const c = sim.cabin;
    if (input.swap && !this.previousSwap && this.canSwap(sim)) {
      this.tool = this.tool === 'hose' ? 'ladle' : 'hose'; this.emitter = 0;
      this.updateMass(sim);
      sim.events.push({type: 'machine', message: this.tool === 'hose' ? 'Hose fitted. I/K aim, L turns it, hold J to spray.' : 'Bucket fitted. Dip in blue water; hold J to pour right.'});
    }
    this.previousSwap = !!input.swap;
    if (input.flip && !this.previousFlip) this.facing *= -1;
    this.previousFlip = !!input.flip;
    this.pitch = clamp(this.pitch + clamp(input.aim || 0, -1, 1) * 1.25 * dt, -1.35, 1.15);
    if (this.tool === 'hose' && this.action && this.tank > 0) {
      this.emitter += dt * WATER.rate;
      while (this.emitter >= 1 && this.tank > 0) {
        this.emitter--; const {pole, dx, dy} = this.nozzle(c), v = vel(pole);
        if (!this.water.emit(pole.x, pole.y, v.x + dx * WATER.speed, v.y + dy * WATER.speed)) break;
        // The tank loses water moving with its centre. The jet also carries the
        // nozzle's tangential motion, so that component needs an opposite reaction.
        const rx = v.x - c.vx + dx * WATER.speed, ry = v.y - c.vy + dy * WATER.speed;
        const speed = Math.hypot(rx, ry), angular = c.I * c.w;
        this.tank--; this.updateMass(sim); c.w = angular / c.I;
        if (speed) impulse(pole, -rx / speed, -ry / speed, WATER.mass * speed);
        this.water.metrics.fired++;
      }
    } else this.emitter = 0;
    // Fire-driven air acts on each rig body, then fades as the source cools.
    for (const f of this.fires) if (f.plume && f.heat > .15) {
      const b = this.fireBox(f);
      for (const body of [sim.engine, sim.cabin, ...sim.nodes]) {
        const height = body.y - b.y - b.h, horizontal = Math.abs(body.x - b.x - b.w / 2);
        if (height > 0 && height < 9 && horizontal < 2.5)
          body.vy += dt * f.plume * f.heat * (1 - horizontal / 2.5) * (1 - height / 9) *
            (body.kind === 'node' ? .035 : 1) / body.m;
      }
    }
  }
  fireBox(f) { return f.body ? {x: f.body.x - .9, y: f.body.y - .45, w: 1.8, h: .9} : f; }
  wetFire(id) {
    const f = this.fires[id];
    // Soak is the number of direct drops needed for a fully burning stack.
    f.heat = Math.max(0, f.heat - 1 / f.soak); f.wet = Math.min(1, f.wet + .10);
  }
  afterStep(sim, dt) {
    this.tick++;
    const c = sim.cabin;
    if (this.tool === 'hose' && !this.action && this.tank < WATER.tank && this.incident.pools.some(p =>
      Math.abs(c.x - p.x) < p.w / 2 - .65 && c.y > p.bottom + .45 && c.y < p.y + .75)) {
      this.refillClock += dt * 42;
      while (this.refillClock >= 1 && this.tank < WATER.tank) {
        this.refillClock--; const oldMass = c.m;
        this.tank++; this.updateMass(sim);
        c.vx *= oldMass / c.m; c.vy *= oldMass / c.m; c.w *= oldMass / c.m;
      }
    } else this.refillClock = 0;
    for (const h of this.headers) {
      if (h.fill <= 0) { h.clock = 0; continue; }
      h.clock += dt * 12;
      while (h.clock >= 1 && h.fill > 0) {
        h.clock--;
        const outlet = h.outlets[h.emitted % h.outlets.length];
        if (!this.water.emit(outlet.x, outlet.y, Math.sin(h.emitted * 2.4) * .9, -1.5, 'sprinkler')) break;
        h.fill--; h.emitted++;
      }
    }
    if (this.tick % 2 === 0) this.water.step(sim, this, dt * 2);
    // Every fire has finite heat. Wet neighbours resist radiant spread;
    // completely cold isolated fuel cannot reignite on its own.
    const previous = this.fires.map(f => f.heat);
    for (const f of this.fires) {
      f.wet = Math.max(0, f.wet - dt * .012);
      if (f.heat > .12 && f.wet < .35) f.heat = Math.min(1, f.heat + dt * .060);
      for (const from of f.spreadFrom || []) if (previous[from] > .4 && f.wet < .45)
        f.heat = Math.min(1, f.heat + dt * .10 * previous[from]);
      if (f.heat > 0 && f.heat <= .12) f.heat = Math.max(0, f.heat - dt * .020);
      sim.jobs[f.id].state = f.heat <= .08 ? 'delivered' : 'waiting';
    }
    sim.delivered = this.fires.filter(f => f.heat <= .08).length;
    this.clearTime = sim.delivered === this.fires.length ? this.clearTime + dt : 0;
    if (this.clearTime > 2) { sim.done = true; sim.events.push({type: 'complete'}); }
  }
  order(sim) {
    const remaining = this.fires.filter(f => f.heat > .08), nearest = remaining.sort((a, b) => {
      const aa = this.fireBox(a), bb = this.fireBox(b);
      return Math.hypot(aa.x - sim.cabin.x, aa.y - sim.cabin.y) - Math.hypot(bb.x - sim.cabin.x, bb.y - sim.cabin.y);
    })[0], b = nearest ? this.fireBox(nearest) : this.config.rack;
    const amount = this.tool === 'hose' ? `${this.tank}/${WATER.tank}` : `${this.water.contained(sim.cabin).length}/${WATER.bucket}`;
    const empty = this.tool === 'hose' && this.tank === 0;
    const pool = this.incident.pools.reduce((a, b) => Math.abs(a.x - sim.cabin.x) < Math.abs(b.x - sim.cabin.x) ? a : b);
    return {title: !remaining.length ? 'Watch for embers…' : empty ? 'Tank empty · return to blue water' : `${remaining.length} burning · ${nearest.name}`,
      detail: `${this.tool === 'hose' ? 'Tank' : 'Bucket'} ${amount} · ${this.tool === 'hose' ? 'I/K aim · L turn · hold J to spray' : 'Dip to refill · hold J to pour right'} · U swaps at Tool rack`,
      x: empty ? pool.x : b.x + (b.w || 0) / 2, y: empty ? pool.y : b.y + (b.h || 0),
      progress: this.fires.reduce((v, f) => v + 1 - f.heat, 0) / this.fires.length,
      name: empty ? 'Refill basin' : nearest?.name || 'Cooling'};
  }
  snapshot() {
    return {tool: this.tool, tank: this.tank, pitch: this.pitch, facing: this.facing, active: this.action,
      clearTime: this.clearTime, fires: this.fires.map(f => ({id: f.id, heat: f.heat, wet: f.wet, ...this.fireBox(f), body: undefined})),
      headers: this.headers.map(h => ({fill: h.fill, received: h.received, emitted: h.emitted})),
      water: this.water.drops.map(p => ({x: p.x, y: p.y, vx: p.vx, vy: p.vy, source: p.source})), metrics: {...this.water.metrics}};
  }
}
