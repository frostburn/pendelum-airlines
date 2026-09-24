import { Workshop } from '#game/industry/workshop';
import { point, vel, eff, impulse } from '#game/rigid-body';
import { gripVelocity } from '#game/industry/rigging';
import { wrap } from '#game/math';
import { STRUCTURE_LIMIT, JOINT_LIMIT, BALL_RADIUS, BALL_MASS, member, joint, jointPoints, solveJoint,
  circleMember, collideMembers, contactVelocity, bounds } from '#game/demolition/structure';

export class DemolitionSite extends Workshop {
  constructor(sim) {
    super(sim);
    this.site = sim.level.demolition;
    this.magnetStrength = 55;
    if (this.site.members.length > STRUCTURE_LIMIT || this.site.joints.length > JOINT_LIMIT)
      throw new Error('Demolition site exceeds its physics budget');
    this.pieces = this.site.members.map(spec => member(spec, spec.id));
    this.joints = this.site.joints.map(spec => joint(spec, this.pieces));
    this.goals = this.site.goals.map(g => ({...g, complete: false, clock: 0}));
    this.previousSwap = false; this.swapRequest = 0; this.breakCount = 0; this.cooldown = 0;
  }
  updateMass(sim) {
    const mass = this.tool === 'ball' ? BALL_MASS : 2.5;
    if (sim.cabin.m !== mass) {
      sim.cabin.setMass(mass);
      sim.cabin.I = this.tool === 'ball' ? .4 * mass * BALL_RADIUS ** 2 : .58;
      sim.cabin.ii = 1 / sim.cabin.I;
    }
  }
  samples() { return this.tool === 'ball' ? [[0, 0, BALL_RADIUS]] : super.samples(); }
  // The wide salvage head can meet a tilted slab at either end of its face.
  // Keep that actual contact point in the grip instead of snapping to centre.
  magnetPoles() { return [[0, -.18], [-.4, -.18], [.4, -.18]]; }
  clearInput() { this.previousSwap = this.action = false; this.swapRequest = 0; }
  activeJoints(p) { return this.joints.filter(j => !j.broken && (j.a === p || j.b === p)); }
  requiredJoints(g) { return g.joined ? Array.isArray(g.joined) ? g.joined : [g.joined] : []; }
  cutBlocker(j) { return this.goals.find(g => !g.complete && this.requiredJoints(g).includes(j.id)); }
  canPickup(p) { return p.metal && !this.activeJoints(p).length; }
  rackAt(sim) {
    const c = sim.cabin;
    // A sphere has no wrong way up. Small rolls and a crooked magnet are normal
    // at a rack; a fast fly-by or a falling tool is still not a tool exchange.
    return this.site.racks.find(r => Math.abs(c.x - r.x) < 1.65 && c.y > r.y + .1 &&
      c.y < r.y + 1.5 && Math.abs(c.vx) < 1.8 && Math.abs(c.vy) < 1.1);
  }
  beforeStep(sim, input, dt) {
    if (input.swap && !this.previousSwap) this.swapRequest = .65;
    if (this.swapRequest > 0 && !this.heldPiece && this.rackAt(sim)) {
      this.tool = this.tool === 'ball' ? 'hook' : 'ball';
      this.swapRequest = 0;
      this.updateMass(sim);
      sim.events.push({type: 'machine', message: this.tool === 'ball' ? 'Wrecking ball fitted. Swing into an orange connection.' : 'Salvage magnet fitted. Hold J to release recovered steel.'});
    }
    this.previousSwap = !!input.swap;
    this.swapRequest = Math.max(0, this.swapRequest - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    super.beforeStep(sim, input, dt);
  }
  constrainGrip(sim) {
    super.constrainGrip(sim);
    for (const j of this.joints) solveJoint(j);
  }
  collidePieces(sim) {
    const free = this.pieces.filter(p => !p.delivered);
    for (let i = 0; i < free.length; i++) {
      const p = free[i];
      if (!p.attached) circleMember(p, sim.cabin, this.samples(), this.pairContacts);
      circleMember(p, sim.engine, [[-.54, 0, .27], [.54, 0, .27], [0, 0, .29], [-.83, .23, .13], [.83, .23, .13]], this.pairContacts);
      for (const n of sim.nodes) circleMember(p, n, [[0, 0, .043]], this.pairContacts);
      for (let k = i + 1; k < free.length; k++) {
        const b = free[k];
        // Adjacent members sharing a real pin meet at that pin. Their designed
        // joint overlap is not a collision; they collide once disconnected.
        if (!this.joints.some(j => !j.broken && (j.a === p && j.b === b || j.a === b && j.b === p)))
          collideMembers(p, b, this.pairContacts);
      }
    }
  }
  finishContacts(sim) {
    // Read approach velocity before dissipative contacts stop the ball. One
    // approach breaks at most one connection, never a whole building at once.
    if (this.tool === 'ball' && this.cooldown === 0) {
      const hits = this.pairContacts.filter(c => c.b === sim.cabin && c.incoming > 3.4)
        .sort((a, b) => b.incoming - a.incoming);
      for (const hit of hits) {
        const q = point(hit.a, hit.al.x, hit.al.y);
        const target = this.activeJoints(hit.a).filter(j => !j.permanent).map(j => ({j,
          distance: Math.hypot(jointPoints(j)[0].x - q.x, jointPoints(j)[0].y - q.y)}))
          .filter(v => v.distance < .9).sort((a, b) => a.distance - b.distance)[0];
        if (!target) continue;
        const j = target.j, [p] = jointPoints(j);
        j.broken = true; this.breakCount++; this.cooldown = .28;
        // A premature cut still breaks physically. Report the lost contract
        // immediately instead of leaving impossible catch tasks on the HUD.
        const blocked = this.cutBlocker(j);
        if (blocked) sim.fail(`Complete “${blocked.name}” before cutting ${j.name || 'this connection'}. Keep the marked joints intact until that task is signed off.`);
        this.burst(p.x, p.y, '#dfb582', 14);
        sim.events.push({type: 'machine', message: `${j.name || 'Connection'} released. Stand clear of the swing.`});
        break;
      }
    }
    for (let iteration = 0; iteration < 10; iteration++) {
      gripVelocity(sim.cabin, this.heldPiece);
      for (const c of this.pairContacts) contactVelocity(c);
      for (const p of this.pieces) for (const c of p.contacts) {
        const q = point(p, c.lx, c.ly), v = vel(q), vn = v.x * c.nx + v.y * c.ny;
        impulse(q, c.nx, c.ny, Math.max(0, -vn / eff(q, c.nx, c.ny)));
      }
      for (const j of this.joints) solveJoint(j, true);
    }
  }
  goalReady(g) { return (g.after || []).every(id => this.goals.find(other => other.id === id)?.complete); }
  goalMet(g) {
    if (!this.goalReady(g) || this.requiredJoints(g).some(id => this.joints.find(j => j.id === id).broken)) return false;
    if (g.type === 'release') return g.joints.every(id => this.joints.find(j => j.id === id).broken);
    const p = this.pieces.find(p => p.id === g.piece);
    if (g.type === 'rotate') return Math.abs(wrap(p.a - g.angle)) < (g.tolerance || .2);
    const b = bounds(p);
    return !p.attached && b.left > g.x - g.w / 2 && b.right < g.x + g.w / 2 &&
      Math.abs(b.bottom - g.y) < .22 && Math.hypot(p.vx, p.vy) < .65 && Math.abs(p.w) < .45 &&
      (g.angle === undefined || Math.abs(wrap(p.a - g.angle)) < .2);
  }
  afterStep(sim, dt) {
    this.tick++;
    for (const s of this.sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy -= 6 * dt; s.life -= dt; }
    this.sparks = this.sparks.filter(s => s.life > 0);
    for (const [i, g] of this.goals.entries()) {
      if (g.complete) continue;
      g.clock = this.goalMet(g) ? g.clock + dt : 0;
      if (g.clock > .6) {
        g.complete = true; sim.jobs[i].state = 'delivered'; sim.delivered++;
        if (g.type === 'deliver') this.pieces.find(p => p.id === g.piece).delivered = true;
        sim.events.push({type: 'machine', message: `${g.name} — signed off.`});
      }
    }
    if (this.goals.every(g => g.complete)) { sim.done = true; sim.events.push({type: 'complete'}); }
    else if (this.pieces.some(p => this.goals.some(g => !g.complete && g.piece === p.id) &&
      (p.y < -4 || p.x < -5 || p.x > sim.level.width + 5))) sim.fail('The salvage has left the contract area.');
  }
  order(sim) {
    const g = this.goals.find(g => !g.complete && this.goalReady(g)) || this.goals.at(-1);
    let x = g.x, y = g.y, name = g.name;
    if (g.type === 'release') {
      const j = this.joints.find(j => g.joints.includes(j.id) && !j.broken);
      const p = j && jointPoints(j)[0]; x = p?.x ?? sim.cabin.x; y = p?.y ?? sim.cabin.y;
    } else if (g.type === 'rotate' || g.type === 'deliver' && !this.heldPiece && this.tool === 'hook') {
      const p = this.pieces.find(p => p.id === g.piece); x = p.x; y = p.y;
    }
    const needsMagnet = g.type === 'deliver' && this.tool === 'ball';
    if (needsMagnet) {
      const r = this.site.racks.reduce((a, b) => Math.abs(a.x - sim.cabin.x) < Math.abs(b.x - sim.cabin.x) ? a : b);
      x = r.x; y = r.y; name = 'Tool rack';
    }
    const keepJoined = this.goals.find(g => g.joined && !g.complete);
    return {title: needsMagnet ? 'Tool rack · U fits the salvage magnet' : g.name,
      detail: `${sim.delivered}/${this.goals.length} signed off · ${keepJoined ? 'Keep marked joints intact: ' + keepJoined.name : this.tool === 'ball' ? 'Fast, direct hits on orange bolts · blue pins stay' : 'Magnet ON · hold J to release'}${this.site.racks.length ? ' · U swaps low and slow at the rack' : ''}`,
      x, y, name, progress: sim.delivered / this.goals.length};
  }
  snapshot() {
    return {tool: this.tool, held: this.heldPiece?.id ?? null, breaks: this.breakCount,
      joints: this.joints.map(j => ({id: j.id, broken: j.broken})),
      goals: this.goals.map(g => ({id: g.id, complete: g.complete})),
      pieces: this.pieces.map(p => ({id: p.id, x: p.x, y: p.y, a: p.a, vx: p.vx, vy: p.vy, attached: p.attached, delivered: !!p.delivered}))};
  }
}
