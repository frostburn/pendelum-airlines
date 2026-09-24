import { Body, point, eff, move, vel, impulse } from '#game/rigid-body';
import { Fireground } from '#game/fire/fireground';
export { Body, point } from '#game/rigid-body';
import { DT, G, N, MIN, MAX, MAX_THRUST } from '#game/constants';
import { clamp, wrap } from '#game/math';
import { levels } from '#game/levels';
import { stopAt, deckAt } from '#game/moving-stops';
import { circleGuide } from '#game/cable-guides';
import { liftAt, liftArea } from '#game/updrafts';
import { Workshop } from '#game/industry/workshop';
import { Depot } from '#game/logistics/depot';
/**
 * DOM-free, fixed-step simulation. Massive, freely hinged, tension-only cable
 * links use positional constraints. Winching does work; the rotor applies
 * external thrust to the engine only. Air and terrain exchange momentum.
 * This is a numerical game approximation, not an engineering solver.
 */
export function circleRect(x, y, r, t) {
  if (x + r < t.x || x - r > t.x + t.w || y + r < t.y || y - r > t.y + t.h)
    return null;
  const qx = clamp(x, t.x, t.x + t.w), qy = clamp(y, t.y, t.y + t.h), dx = x - qx, dy = y - qy;
  if (dx || dy) {
    const d = Math.hypot(dx, dy);
    return d < r ? { nx: dx / d, ny: dy / d, depth: r - d } : null;
  }
  let d = x - t.x, nx = -1, ny = 0;
  if (t.x + t.w - x < d) {
    d = t.x + t.w - x;
    nx = 1;
    ny = 0;
  }
  if (y - t.y < d) {
    d = y - t.y;
    nx = 0;
    ny = -1;
  }
  if (t.y + t.h - y < d) {
    d = t.y + t.h - y;
    nx = 0;
    ny = 1;
  }
  return { nx, ny, depth: r + d };
}
const CAB_SAMPLES = [[-.48, -.45, .115], [.48, -.45, .115], [-.48, .29, .14], [.48, .29, .14], [0, 0, .43]];
const ENG_SAMPLES = [[-.54, 0, .27], [.54, 0, .27], [0, -.02, .29], [-.83, .23, .13], [.83, .23, .13], [0, .29, .13]];
export class Sim {
  constructor(index = 0) {
    this.index = index;
    this.level = levels[index];
    this.pads = this.level.pads.map(p => stopAt(p, 0));
    this.platforms = this.level.pads.flatMap((p, i) => p.motion ? [{pad: i, ...deckAt(this.pads[i])}] : []);
    this.guides = (this.level.guides || []).map((guide, index) => ({...guide, guide: index}));
    this.guideContacts = this.guides.map(() => false);
    this.guideVisits = this.guides.map(() => false);
    this.terrain = [...this.level.terrain, ...this.platforms, ...this.guides];
    const p = this.pads[this.level.start];
    const launchY = p.y + .565 + (this.level.industry?.startPiece ? .65 : 0);
    this.engine = new Body(p.x, launchY + .60 + this.level.cable + .32, 3.6, .78, 'engine');
    this.cabin = new Body(p.x, launchY, 2.5, .58, 'cabin');
    this.length = this.level.cable;
    this.targetLength = this.length;
    this.nodes = [];
    const a = point(this.engine, 0, -.32), b = point(this.cabin, 0, .60);
    for (let i = 1; i < N; i++) {
      const t = i / N;
      this.nodes.push(new Body(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, .075, 0));
    }
    this.bodies = [this.engine, ...this.nodes, this.cabin];
    this.time = 0;
    this.hull = 100;
    this.hitCooldown = 0;
    this.lastImpact = 0;
    this.jobs = this.level.jobs.map((j, i) => ({ ...j, id: i, state: 'waiting' }));
    this.servicing = -1;
    this.service = 0;
    this.events = [];
    this.done = false;
    this.failed = false;
    this.delivered = 0;
    this.tensionX = 0;
    this.tensionY = 0;
    this.thrust = 0;
    this.wind = 0;
    this.maxSwing = 0;
    this.distance = 0;
    this._prevCab = { x: this.cabin.x, y: this.cabin.y };
    this.stats = { bumps: 0, pickups: 0 };
    this.assisted = false;
    this.industry = this.level.fire ? new Fireground(this) : this.level.logistics ? new Depot(this) : this.level.industry ? new Workshop(this) : null;
  }
  updateStops() {
    for (const platform of this.platforms) {
      const i = platform.pad;
      Object.assign(this.pads[i], stopAt(this.level.pads[i], this.time));
      Object.assign(platform, deckAt(this.pads[i]));
    }
  }
  end(i) {
    return i === 0 ? point(this.engine, 0, -.32) : i === N ? point(this.cabin, 0, .60) : point(this.nodes[i - 1]);
  }
  onboard() {
    return this.jobs.filter(j => j.state === 'aboard');
  }
  setPayload() {
    this.cabin.setMass(2.5 + this.onboard().reduce((mass, job) => mass + (job.mass ?? 1.05), 0));
  }
  windAt(x, y) {
    if (!this.level.wind)
      return 0;
    const envelope = clamp((x - 11) / 4, 0, 1) * clamp((31 - x) / 4, 0, 1);
    return envelope * (1.0 + .65 * Math.sin(this.time * .85 + y * .13) + .25 * Math.sin(this.time * 2.1));
  }
  constrain(i) {
    const a = this.end(i), b = this.end(i + 1), dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), C = d - this.length / N;
    if (C <= 0 || d < 1e-7)
      return;
    const nx = dx / d, ny = dy / d, j = C / (eff(a, nx, ny) + eff(b, nx, ny) + .025);
    move(a, nx, ny, j);
    move(b, nx, ny, -j);
    if (i === 0) {
      this._tx += nx * j / (DT * DT);
      this._ty += ny * j / (DT * DT);
    }
  }
  collideBody(b, first) {
    if (b.jigSlot !== undefined || b.delivered) return;
    const samples = b.kind === 'engine' ? ENG_SAMPLES : b.kind === 'cabin' ? this.industry?.samples() || CAB_SAMPLES : b.kind === 'piece' ? b.colliders : [[0, 0, .043]];
    for (let s = 0; s < samples.length; s++) {
      const [lx, ly, r] = samples[s], p = point(b, lx, ly);
      for (let k = 0; k < this.terrain.length; k++) {
        const t = this.terrain[k];
        // Cargo travels in the rear lane behind a closed front guard. The
        // aircraft, tool and cable stay in the foreground and cannot enter it.
        if (t.freightGuard && b.kind === 'piece') continue;
        const c = t.guide === undefined && !t.circle ? circleRect(p.x, p.y, r, t) : circleGuide(p.x, p.y, r, t);
        if (!c)
          continue;
        if (b.kind === 'node' && t.guide !== undefined) {
          this.guideContacts[t.guide] = true;
          this.guideVisits[t.guide] = true;
        }
        const j = c.depth / eff(p, c.nx, c.ny);
        const oldX = b.x, oldY = b.y, oldA = b.a;
        move(p, c.nx, c.ny, j);
        // Industrial contacts use split position correction. Depenetration is
        // geometric repair, not an impulse proportional to depth / timestep.
        if (this.industry) {
          b.ox += b.x - oldX; b.oy += b.y - oldY; b.oa += b.a - oldA;
        }
        // Keep one contact per sample / terrain pair, from the earliest collision.
        const key = s * this.terrain.length + k;
        if (!b.contacts.some(z => z.key === key)) {
          const v = vel(p), surfaceVX = (t.vx || 0) - (t.spin || 0) * (t.r || 0) * c.ny,
            surfaceVY = (t.vy || 0) + (t.spin || 0) * (t.r || 0) * c.nx;
          const incoming = -((v.x - surfaceVX) * c.nx + (v.y - surfaceVY) * c.ny);
          const ca = Math.cos(b.a), sa = Math.sin(b.a);
          b.contacts.push({
            key,
            terrain: k,
            ...(samples[s][3] ? {part: samples[s][3]} : {}),
            lx: lx - (ca * c.nx + sa * c.ny) * r,
            ly: ly - (-sa * c.nx + ca * c.ny) * r,
            nx: c.nx,
            ny: c.ny,
            incoming,
            surfaceVX: b.kind === 'piece' && t.hammer !== undefined ? 0 : surfaceVX,
            surfaceVY: b.kind === 'piece' && t.hammer !== undefined ? clamp(surfaceVY, -.7, 1.5) : surfaceVY,
            depth: c.depth
          });
          if (b.kind !== 'node')
            b.impact = Math.max(b.impact, incoming);
        }
      }
    }
  }
  collideCable(i) {
    // Mid-link collision samples stop the visible cable cutting through corners.
    const a = this.end(i), b = this.end(i + 1), x = (a.x + b.x) * .5, y = (a.y + b.y) * .5;
    for (const t of this.terrain) {
      const c = t.guide === undefined && !t.circle ? circleRect(x, y, .03, t) : circleGuide(x, y, .03, t);
      if (!c)
        continue;
      if (t.guide !== undefined) {
        this.guideContacts[t.guide] = true;
        this.guideVisits[t.guide] = true;
      }
      const j = c.depth / (.25 * (eff(a, c.nx, c.ny) + eff(b, c.nx, c.ny)));
      move(a, c.nx, c.ny, j * .5);
      move(b, c.nx, c.ny, j * .5);
    }
  }
  controls(u) {
    const e = this.engine, precision = !!u.precision, tx = clamp(u.x || 0, -1, 1) * (precision ? 1.7 : 5), ty = clamp(u.y || 0, -1, 1) * (precision ? 1.4 : 3.8);
    const ax = clamp((tx - e.vx) * 3.7, -7, 7), ay = clamp((ty - e.vy) * 4.3, -7, 8);
    // The autopilot pushes ONLY the engine, using finite rotor thrust and torque.
    // Last step's cable reaction is feed-forward, not a cabin velocity correction.
    const reactionLimit = Math.max(120, this.cabin.m * G * 1.5);
    let fx = e.m * ax - clamp(this.tensionX, -90, 90), fy = e.m * (G + ay) - clamp(this.tensionY, -reactionLimit, 30);
    // Compensate air acting on the engine only. Freight still needs external
    // lift on the whole rig; the rotor retains its finite force ceiling.
    const airLift = liftAt(this.level.updrafts, e.x, e.y, this.time) * liftArea('engine');
    // The rotor cannot thrust downward. Do not let hypot() turn a negative
    // request into extra upward thrust when a light rig is carried by hot air.
    if (airLift) fy = Math.max(0, fy - airLift);
    const target = clamp(Math.atan2(-fx, Math.max(8, fy)), -.65, .65);
    const aa = clamp(wrap(target - e.a) * 70 - e.w * 15, -85, 85);
    e.w += aa * DT;
    const thrust = clamp(Math.hypot(fx, fy), 10, MAX_THRUST);
    this.thrust = thrust;
    e.vx += (-Math.sin(e.a) * thrust / e.m) * DT;
    e.vy += (Math.cos(e.a) * thrust / e.m) * DT;
    if (u.winch)
      this.targetLength = clamp(this.targetLength + u.winch * 2.1 * DT, MIN, MAX);
    this.length += clamp(this.targetLength - this.length, -1.65 * DT, 1.65 * DT);
  }
  step(u = {}) {
    if (this.failed || this.done)
      return;
    this.time += DT;
    this.updateStops();
    this.guideContacts.fill(false);
    this.hitCooldown = Math.max(0, this.hitCooldown - DT);
    if (this.industry) this.bodies = [this.engine, ...this.nodes, this.cabin,
      ...this.industry.pieces.filter(p => p.jigSlot === undefined && !p.delivered)];
    this.controls(u);
    this.industry?.beforeStep(this, u, DT);
    this.wind = this.windAt(this.engine.x, this.engine.y);
    this._tx = 0;
    this._ty = 0;
    for (const b of this.bodies) {
      b.ox = b.x;
      b.oy = b.y;
      b.oa = b.a;
      b.contacts = [];
      b.impact = 0;
      b.vy -= G * DT;
      b.vy += liftAt(this.level.updrafts, b.x, b.y, this.time) * liftArea(b.kind) / b.m * DT;
      const air = this.windAt(b.x, b.y), drag = b.kind === 'node' ? .065 : b.kind === 'cabin' ? .055 : .055;
      b.vx += (air - b.vx * drag) * DT;
      b.vy -= b.vy * drag * .4 * DT;
      b.w *= 1 - DT * (b.kind === 'cabin' ? .11 : .03);
      b.x += b.vx * DT;
      b.y += b.vy * DT;
      b.a += b.w * DT;
    }
    for (let it = 0; it < 26; it++) {
      if (it % 2 === 0)
        for (let i = 0; i < N; i++)
          this.constrain(i);
      else
        for (let i = N - 1; i >= 0; i--)
          this.constrain(i);
      this.industry?.constrainGrip(this);
      // Rope circles and midpoint samples collide as well as both vehicle bodies.
      if (it % 3 === 0 || it === 25) {
        for (const b of this.bodies)
          this.collideBody(b, it === 0);
        for (let i = 0; i < N; i++)
          this.collideCable(i);
        this.industry?.collidePieces(this);
      }
      const e = this.engine, c = this.cabin, dx = c.x - e.x, dy = c.y - e.y, d = Math.hypot(dx, dy);
      if (d < .89 && d > 1e-6) {
        const j = (.89 - d) / (e.im + c.im);
        e.x -= dx / d * j * e.im;
        e.y -= dy / d * j * e.im;
        c.x += dx / d * j * c.im;
        c.y += dy / d * j * c.im;
      }
    }
    for (const b of this.bodies) {
      b.vx = (b.x - b.ox) / DT;
      b.vy = (b.y - b.oy) / DT;
      b.w = (b.a - b.oa) / DT;
      for (const c of b.contacts) {
        const p = point(b, c.lx, c.ly), v = vel(p);
        v.x -= c.surfaceVX;
        v.y -= c.surfaceVY;
        const vn = v.x * c.nx + v.y * c.ny;
        const normal = Math.max(0, -vn / eff(p, c.nx, c.ny));
        if (normal)
          impulse(p, c.nx, c.ny, normal);
        const vt = v.x * (-c.ny) + v.y * c.nx, friction = b.friction ?? (b.kind === 'node' ? .02 : .55);
        const maxJ = friction * (normal + b.m * G * DT / Math.max(1, b.contacts.length));
        const j = clamp(-vt / eff(p, -c.ny, c.nx), -maxJ, maxJ);
        impulse(p, -c.ny, c.nx, j);
      }
    }
    this.industry?.finishContacts(this);
    const blend = 1 - Math.exp(-DT * 16);
    this.tensionX += (this._tx - this.tensionX) * blend;
    this.tensionY += (this._ty - this.tensionY) * blend;
    // Metalworking tools absorb their working impacts. Other worlds use
    // ordinary rig damage, including fast magnet collisions with guards/staff.
    const hit = this.industry && !this.level.logistics && !this.level.fire ? this.engine.impact : Math.max(this.engine.impact, this.cabin.impact);
    if (hit > 2.6 && this.hitCooldown <= 0) {
      this.hitCooldown = .32;
      this.lastImpact = hit;
      if (!this.level.practice)
        this.hull = Math.max(0, this.hull - (hit - 2.6) * 9);
      this.stats.bumps++;
      this.events.push({ type: 'hit', severity: hit });
    }
    const c = this.cabin;
    this.distance += Math.hypot(c.x - this._prevCab.x, c.y - this._prevCab.y);
    this._prevCab = { x: c.x, y: c.y };
    const a = this.end(0), b = this.end(N);
    this.maxSwing = Math.max(this.maxSwing, Math.abs(Math.atan2(b.x - a.x, a.y - b.y)));
    if (!this.bodies.every(b => Number.isFinite(b.x + b.y + b.a + b.vx + b.vy + b.w))) {
      this.fail('The rig needs a reset.');
      return;
    }
    if (this.hull <= 0)
      this.fail('That landing exceeded the terms of carriage.');
    else if (c.y < -.6 || this.engine.y < -.6)
      this.fail(this.level.water ? 'This is not the ferry service.' : 'A little too close to sea level.');
    else if (c.x < -6 || c.x > this.level.width + 6 || c.y > this.level.height + 12 || this.engine.y > this.level.height + 14)
      this.fail('You have left the service area.');
    if (!this.failed) {
      if (this.industry) this.industry.afterStep(this, DT);
      else this.serviceStop();
    }
  }
  serviceStop() {
    if (this.level.practice)
      return;
    const c = this.cabin;
    let found = -1;
    for (let i = 0; i < this.pads.length; i++) {
      const p = this.pads[i];
      if (Math.abs(c.x - p.x) < Math.max(.2, p.w / 2 - .50) && Math.abs(c.y - .565 - p.y) < .20 && Math.abs(wrap(c.a)) < .25 && Math.hypot(c.vx - p.vx, c.vy - p.vy) < .68 && Math.abs(c.w) < .8) {
        found = i;
        break;
      }
    }
    if (found < 0) {
      this.servicing = -1;
      this.service = 0;
      return;
    }
    const drops = this.jobs.filter(j => j.state === 'aboard' && j.to === found), room = 2 - this.onboard().length + drops.length;
    const boards = this.jobs.filter(j => j.state === 'waiting' && j.from === found).slice(0, room);
    if (!drops.length && !boards.length) {
      this.servicing = -1;
      this.service = 0;
      return;
    }
    if (this.servicing !== found) {
      this.servicing = found;
      this.service = 0;
    }
    this.service += DT;
    if (this.service < .55)
      return;
    for (const j of drops) {
      j.state = 'delivered';
      this.delivered++;
      this.events.push({ type: 'drop', job: j, pad: found });
    }
    for (const j of boards) {
      j.state = 'aboard';
      this.stats.pickups++;
      this.events.push({ type: 'board', job: j, pad: found });
    }
    this.setPayload();
    this.service = 0;
    this.servicing = -1;
    if (this.jobs.every(j => j.state === 'delivered')) {
      this.done = true;
      this.events.push({ type: 'complete' });
    }
  }
  fail(reason) {
    if (this.failed)
      return;
    this.failed = true;
    this.reason = reason;
    this.events.push({ type: 'fail', reason });
  }
  targetStops() {
    if (this.industry) return [];
    const onboard = this.onboard();
    return [...new Set((onboard.length ? onboard.map(j => j.to) : this.jobs.filter(j => j.state === 'waiting').map(j => j.from)))];
  }
  pose() {
    const e = this.engine, c = this.cabin;
    return [e.x, e.y, e.a, c.x, c.y, c.a, ...[4, 8, 12, 16, 20].flatMap(i => {
        const p = this.end(i);
        return [p.x, p.y];
      })];
  }
  snapshot() {
    return {
      route: this.index,
      time: this.time,
      engine: {
        x: this.engine.x,
        y: this.engine.y,
        vx: this.engine.vx,
        vy: this.engine.vy,
        a: this.engine.a
      },
      cabin: {
        x: this.cabin.x,
        y: this.cabin.y,
        vx: this.cabin.vx,
        vy: this.cabin.vy,
        a: this.cabin.a
      },
      cable: this.length,
      targetCable: this.targetLength,
      hull: this.hull,
      done: this.done,
      failed: this.failed,
      jobs: this.jobs.map(j => ({ ...j })),
      service: this.service,
      stops: this.pads.map(({x, y, vx, vy, name}) => ({x, y, vx, vy, name})),
      guides: this.guides.map((g, i) => ({x: g.x, y: g.y, r: g.r,
        contact: this.guideContacts[i], visited: this.guideVisits[i]})),
      tension: [this.tensionX, this.tensionY],
      ...(this.industry ? {industry: this.industry.snapshot()} : {})
    };
  }
}
