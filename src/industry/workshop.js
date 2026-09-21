import { clamp, wrap } from '#game/math';
import { MaterialField, CUP_WALLS } from '#game/industry/materials';
import { worldPoint, localPoint } from '#game/industry/geometry';
import { Body, point, vel, eff, impulse } from '#game/rigid-body';
import { attract } from '#game/industry/magnet';
import { closestSurface, constrainGrip, gripVelocity, collidePair, pairVelocity } from '#game/industry/rigging';
import { blankSections, pieceSamples, pieceBottom, deformPiece } from '#game/industry/workpiece';

export const PIECE_LIMIT = 8;
const cupSamples = CUP_WALLS.flatMap(w => [[w.x + .08, w.y + .08, .08], [w.x + w.w - .08, w.y + w.h - .08, .08]]);
const magnetSamples = [[-.4, .01, .18], [0, .01, .18], [.4, .01, .18], [0, .40, .12]];
export const meetsOrder = (piece, requires = {}) => Object.entries(requires).every(([key, value]) => (piece[key] || 0) >= value - .0001);

export function hammerPose(hammer, time) {
  const phase = ((time / hammer.period + (hammer.phase || 0)) % 1 + 1) % 1;
  // A long raised dwell, a warning, a fast downstroke, then a slow return.
  const travel = phase < .50 ? 1 : phase < .65 ? 1 - (phase - .50) / .15 : phase < .74 ? 0 : (phase - .74) / .26;
  // Reach below the minimum forged thickness so a dented bar on the anvil still gets hit.
  return {bottom: hammer.y + .18 + travel * 6.45, cycle: phase, warning: phase >= .38 && phase < .65};
}

export class Workshop {
  constructor(sim) {
    this.config = sim.level.industry;
    this.tool = this.config.tool;
    this.action = false; this.tick = 0; this.pieces = []; this.serial = 0;
    this.heldPiece = null; this.pairContacts = []; this.crushTime = 0; this.sparks = []; this.dockTime = 0;
    this.material = new MaterialField(this.config, sim.index);
    this.molds = (this.config.molds || []).map(m => ({...m, fill: 0, cool: 0, ready: false}));
    this.hammers = (this.config.hammers || []).map((h, i) => {
      const collider = {x: h.x + .70, y: hammerPose(h, 0).bottom, w: 2.2, h: .9, hammer: i, style: 'metal', vy: 0};
      sim.terrain.push(collider);
      return {...h, collider, ...hammerPose(h, 0)};
    });
    this.lathes = (this.config.lathes || []).map(l => ({...l, circle: true, machine: 'lathe'}));
    sim.terrain.push(...this.lathes);
    this.jig = this.config.jig ? {...this.config.jig, slots: [], weld: 0, complete: false} : null;
    for (const stock of this.config.stocks || []) this.addPiece(stock);
    if (this.config.startPiece) {
      this.addPiece({x: sim.cabin.x + .20, y: this.config.rack.y + .36, ...this.config.startPiece});
    }
    this.updateMass(sim);
  }
  addPiece(spec) {
    if (this.pieces.length >= PIECE_LIMIT) return null;
    const mass = 3.5 + (spec.assembled || 0) * .8;
    const p = Object.assign(new Body(spec.x || 0, spec.y || 0, mass, mass * .95 / 3.5, 'piece'), {id: this.serial++,
      forge: 0, cut: 0, polish: 0, assembled: 0, stamps: {}, lastStroke: {}, sections: blankSections(spec.assembled), attached: false, settle: 0, ...spec});
    p.colliders = pieceSamples(p);
    this.pieces.push(p); return p;
  }
  samples() {
    if (this.tool === 'ladle') return cupSamples;
    return magnetSamples;
  }
  updateMass(sim) {
    const mass = 2.5 + this.material.held().length * .14;
    if (Math.abs(sim.cabin.m - mass) > .001) sim.cabin.setMass(mass);
  }
  burst(x, y, color = '#ffc86c', count = 9) {
    for (let i = 0; i < count; i++) {
      if (this.sparks.length >= 48) this.sparks.shift();
      const a = i * 2.399 + this.tick;
      this.sparks.push({x, y, vx: Math.cos(a) * (1 + i % 3), vy: 1.5 + Math.abs(Math.sin(a)) * 2, life: .45, color});
    }
  }
  beforeStep(sim, input, dt) {
    this.action = !!input.action;
    this.pairContacts = [];
    const c = sim.cabin;
    if (this.tool === 'ladle') {
      // Powered trunnion: torque turns the vessel; liquid still moves in world
      // space and must cross its rotating rim to leave it.
      const target = this.action ? -2.05 : 0;
      c.w += clamp(wrap(target - c.a) * 100 - c.w * 18, -80, 80) * dt;
    } else if (this.action) {
      this.material.release(c);
      if (this.heldPiece) {
        const p = this.heldPiece;
        p.attached = false; p.grip = null;
        this.heldPiece = null;
      }
    }
    if (this.tool === 'hook' && !this.action && !this.heldPiece) this.pullPieces(sim, dt);
    this.hammers.forEach(h => {
      const previous = h.collider.y, pose = hammerPose(h, sim.time);
      const stroke = Math.floor(sim.time / h.period + (h.phase || 0));
      if (h.rebound?.stroke === stroke) {
        // A power hammer rebounds after impact instead of driving an impossible
        // rigid overlap all the way into the anvil. The cargo stays unconstrained.
        pose.bottom = Math.max(pose.bottom, Math.min(h.y + 6.63,
          h.rebound.bottom + (sim.time - h.rebound.time) * 5));
        pose.warning = false;
      }
      Object.assign(h, pose);
      Object.assign(h.collider, {y: pose.bottom, vy: (pose.bottom - previous) / dt});
    });
  }
  nextHammer(piece) {
    return piece.forge >= 3 ? undefined : (this.config.hammerOrder || [0, 0, 0])[piece.forge];
  }
  pieceAtHammer(index) {
    const h = this.hammers[index];
    return this.pieces.find(p => !p.attached && !p.delivered && !p.assembled && p.jigSlot === undefined &&
      this.nextHammer(p) === index && p.x > h.collider.x - .95 && p.x < h.collider.x + h.collider.w + .65 &&
      p.y > h.y && p.y < h.y + 6.6);
  }
  forge(sim) {
    for (const p of this.pieces) for (const contact of p.contacts.slice().sort((a, b) => b.incoming - a.incoming)) {
      const index = sim.terrain[contact.terrain]?.hammer;
      if (index === undefined) continue;
      this.strike(sim, p, index, contact, p.a);
      if (contact.ny < -.35 && contact.incoming > 2 && this.hammers[index].collider.vy < -1)
        this.rebound(sim, this.hammers[index]);
    }
  }
  strike(sim, p, index, hit, angle) {
    if (p.assembled || p.forge >= 3 || index !== this.nextHammer(p)) return;
    const h = this.hammers[index];
    if (!h || h.collider.vy >= -1) return;
    const stroke = Math.floor(sim.time / h.period + (h.phase || 0));
    if (p.lastStroke[index] === stroke) return;
    if (hit.ny >= -.35 || hit.incoming <= 2) return;
    // Held and loose pieces use the same contact criteria and stroke identity.
    // Attaching or releasing during a stroke cannot count that stroke twice.
    p.lastStroke[index] = stroke;
    p.stamps[index] = (p.stamps[index] || 0) + 1;
    p.forge++;
    deformPiece(p, hit, angle);
    // Plastic deformation absorbs the blow. This local, dissipative concession
    // applies only at the instant of a qualifying strike, never during pickup.
    p.vx *= .35; p.vy = clamp(p.vy * .35, -.7, .7); p.w *= .15;
    if (p.grip) {
      // Keep the captured material point on the newly bent surface.
      const q = worldPoint(p, p.grip.x, p.grip.y), surface = closestSurface(p, q.x, q.y);
      p.grip.x = surface.x; p.grip.y = surface.y;
    }
    const q = worldPoint(p, hit.lx, hit.ly);
    this.burst(q.x, q.y, '#ffb449', 18);
    sim.events.push({type: 'machine', message: `Clang. ${p.forge} / 3 good hits. ${p.forge === 3 ? 'Collect the forged workpiece.' : 'Keep the metal under the next stroke.'}`});
  }
  rebound(sim, h) {
    h.rebound = {stroke: Math.floor(sim.time / h.period + (h.phase || 0)),
      time: sim.time, bottom: h.collider.y};
  }
  reboundHammers(sim) {
    for (const h of this.hammers) {
      if (h.collider.vy >= -1) continue;
      const hit = [sim.cabin, sim.engine].some(body => body.contacts.some(c =>
        sim.terrain[c.terrain] === h.collider && c.ny < -.35 && c.incoming > 2));
      if (hit) this.rebound(sim, h);
    }
  }
  afterStep(sim, dt) {
    this.tick++;
    const c = sim.cabin, config = this.config;
    this.forge(sim);
    this.reboundHammers(sim);
    if (this.tick % 2 === 0) {
      this.material.step(sim, this, dt * 2);
      this.updateMass(sim);
    }
    for (const s of this.sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy -= 6 * dt; s.life -= dt; }
    this.sparks = this.sparks.filter(s => s.life > 0);
    for (const m of this.molds) if (m.fill >= m.capacity && !m.ready) {
      m.cool += dt;
      if (m.cool >= 2) {
        m.ready = true;
        this.addPiece({x: m.x, y: m.y + .36, cast: true});
        sim.events.push({type: 'machine', message: 'Ingot cast. Two tonnes of confidence in a small mould.'});
      }
    }
    if (config.goal === 'ore' && this.material.deposited >= config.quota) this.complete(sim);
    if (config.goal === 'cast' && this.molds.every(m => m.ready)) this.complete(sim);
    if (this.tool === 'ladle' && config.goal !== 'cast' && this.molds.every(m => m.ready)) {
      const r = config.rack;
      if (Math.abs(c.x - r.x) < 1 && Math.abs(c.y - r.y - .565) < .22 && Math.abs(wrap(c.a)) < .3 && Math.hypot(c.vx, c.vy) < .7) {
        this.dockTime += dt;
        if (this.dockTime > .65) {
          this.tool = 'hook';
          sim.events.push({type: 'machine', message: 'Workpiece magnet fitted. Pick up the cooled casting.'});
        }
      } else this.dockTime = 0;
    }
    const p = this.heldPiece;
    if (p && !p.assembled) {
      const contacts = p.contacts.map(contact => sim.terrain[contact.terrain]);
      if (contacts.some(t => t?.machine === 'lathe') && (!this.hammers.length || p.forge >= 3) && p.cut < 1) {
        p.cut = Math.min(1, p.cut + dt / 3.5);
        p.colliders = pieceSamples(p);
        if (this.tick % 18 === 0) {
          const hit = p.contacts.find(hit => sim.terrain[hit.terrain]?.machine === 'lathe'), q = worldPoint(p, hit.lx, hit.ly);
          this.burst(q.x, q.y, '#ddbd7f', 3);
        }
        if (p.cut === 1) sim.events.push({type: 'machine', message: 'Turning complete. The blank is now a shaped shaft.'});
      }
      if (contacts.some(t => t?.machine === 'belt') && (!this.lathes.length || p.cut >= 1) && p.polish < 1) {
        p.polish = Math.min(1, p.polish + dt / 3.5);
        if (this.tick % 18 === 0) {
          const hit = p.contacts.find(hit => sim.terrain[hit.terrain]?.machine === 'belt'), q = worldPoint(p, hit.lx, hit.ly);
          this.burst(q.x, q.y, '#ffe4a8', 3);
        }
        if (p.polish === 1) sim.events.push({type: 'machine', message: 'Polished. You can almost see the poor decisions in it.'});
      }
    }
    this.weld(sim, dt);
    if (config.goal === 'deliver') for (const part of this.pieces) {
      const out = config.output;
      if (!part.attached && part.jigSlot === undefined && meetsOrder(part, config.requires) &&
          Math.abs(part.x - out.x) < out.w / 2 - .8 && Math.abs(pieceBottom(part) - out.y) < .16 &&
          Math.hypot(part.vx, part.vy) < .65) {
        part.settle += dt;
        if (part.settle > .55) { part.delivered = true; this.complete(sim); }
      } else part.settle = 0;
    }
  }
  pullPieces(sim, dt) {
    const c = sim.cabin, pole = point(c, 0, -.18);
    for (const p of this.pieces) {
      if (p.attached || p.jigSlot !== undefined || p.delivered) continue;
      const local = localPoint(c, p.x, p.y);
      if (local.y >= -.18 || Math.abs(local.x) > 1.7) continue;
      const surface = closestSurface(p, pole.x, pole.y), q = point(p, surface.x, surface.y);
      if (surface.inside) continue;
      // Approximate the field integrated over the bar by a central resultant.
      // Pulling only its nearest corner spins a level ingot onto its edge before
      // contact, and gives the head an implausible lever on the whole load.
      attract(pole, point(p), 190, 1.65, dt);
      const av = vel(pole), bv = vel(q);
      if (surface.distance < .055 && Math.hypot(av.x - bv.x, av.y - bv.y) < 2.5) {
        // Capture exactly where contact happened. Neither body is repositioned
        // or reoriented; a dissipative joint shares their existing momentum.
        p.grip = {x: surface.x, y: surface.y, angle: wrap(p.a - c.a)};
        p.attached = true; this.heldPiece = p;
        for (let i = 0; i < 8; i++) gripVelocity(c, p);
        sim.stats.pickups++;
        sim.events.push({type: 'machine', message: p.assembled ? 'Assembly attached. Take it to Dispatch.' : 'Magnet holding. Hold J to switch it off and drop the load.'});
        break;
      }
    }
  }
  constrainGrip(sim) { constrainGrip(sim.cabin, this.heldPiece); }
  collidePieces(sim) {
    const free = this.pieces.filter(p => p.jigSlot === undefined && !p.delivered);
    for (let i = 0; i < free.length; i++) {
      const p = free[i];
      if (!p.attached) collidePair(p, sim.cabin, this.samples(), this.pairContacts);
      collidePair(p, sim.engine, [[-.54, 0, .27], [.54, 0, .27], [0, 0, .29]], this.pairContacts);
      for (let j = i + 1; j < free.length; j++) collidePair(p, free[j], free[j].colliders, this.pairContacts);
    }
  }
  finishContacts(sim) {
    // Alternating contact and grip impulses shares support forces with the
    // magnet without changing either body's mass or discarding angular inertia.
    for (let i = 0; i < 10; i++) {
      gripVelocity(sim.cabin, this.heldPiece);
      for (const c of this.pairContacts) pairVelocity(c);
      for (const p of this.pieces) for (const c of p.contacts) {
        const q = point(p, c.lx, c.ly), v = vel(q);
        const vn = (v.x - c.surfaceVX) * c.nx + (v.y - c.surfaceVY) * c.ny;
        const j = Math.max(0, -vn / eff(q, c.nx, c.ny));
        impulse(q, c.nx, c.ny, j);
      }
    }
  }
  damageDrone(sim, dt) {
    const contacts = sim.engine.contacts.filter(c => {
      const t = sim.terrain[c.terrain];
      return t.hammer !== undefined || t.hammerFrame;
    });
    const impact = Math.max(0, ...contacts.map(c => c.incoming));
    const embedded = contacts.some(c => c.depth > .12);
    this.crushTime = contacts.length ? this.crushTime + dt : 0;
    if (impact > 6 || embedded || this.crushTime > .18) {
      sim.hull = 0; sim.fail('The power hammer has retired your rotors.');
    } else if (impact > 2.6) sim.hull = Math.max(0, sim.hull - (impact - 2.6) * 12);
  }
  weld(sim, dt) {
    const j = this.jig;
    if (!j || j.complete) return;
    for (const p of this.pieces) {
      if (p.attached || p.jigSlot !== undefined || p.assembled || !meetsOrder(p, j.requires)) continue;
      for (let slot = 0; slot < j.count; slot++) {
        const x = this.slotX(slot);
        if (j.slots[slot] !== undefined || Math.abs(p.x - x) > .64 || Math.abs(pieceBottom(p) - j.y) > .20 || Math.hypot(p.vx, p.vy) > 1.2) continue;
        Object.assign(p, {x, y: j.y - Math.min(...p.colliders.map(([, y, r]) => y - r)), a: 0, vx: 0, vy: 0, w: 0, jigSlot: slot});
        j.slots[slot] = p.id;
        sim.events.push({type: 'machine', message: `Jig clamped part ${j.slots.filter(id => id !== undefined).length} / ${j.count}.`});
        break;
      }
    }
    if (j.slots.filter(id => id !== undefined).length !== j.count) return;
    j.weld += dt;
    if (this.tick % 20 === 0) this.burst(j.x, j.y + .6, '#b8e9ff', 8);
    if (j.weld >= 2.4) {
      this.pieces = this.pieces.filter(p => !j.slots.includes(p.id));
      this.addPiece({x: j.x, y: j.y + .36, assembled: j.count, forge: 3, cut: 1, polish: 1});
      j.complete = true;
      sim.events.push({type: 'machine', message: 'Weld complete. Collect the finished assembly from the jig.'});
    }
  }
  slotX(slot) { return this.jig.x + (slot - (this.jig.count - 1) / 2) * 1.35; }
  complete(sim) {
    if (sim.done) return;
    sim.done = true; sim.delivered = 1; sim.jobs[0].state = 'delivered';
    sim.events.push({type: 'complete'});
  }
  order(sim) {
    const c = this.config, p = this.heldPiece;
    const target = (title, detail, x, y, progress = 0, name = 'Workpiece') => ({title, detail, x, y, progress, name});
    if (sim.done) return target('Work order complete', 'Dispatch sends its reluctant compliments.', c.output.x, c.output.y, 1, 'Dispatch');
    if (c.goal === 'ore') {
      const held = this.material.held().length;
      const destination = held ? c.bin : c.pits.find(pit => this.material.rocks.some(r => r.iron && !r.held && Math.abs(r.x - pit.x) < pit.w / 2 + 1)) || c.pits[0];
      return target(held ? 'Refinery hopper · hold J to drop' : 'Rake magnetite from the sand',
        `${this.material.deposited} / ${c.quota} refined · ${held} / 28 on magnet · hold J: magnet OFF`, destination.x, destination.y + 1, this.material.deposited / c.quota, held ? 'Refinery' : 'Ore bed');
    }
    if (this.tool === 'ladle') {
      if (this.molds.every(m => m.ready)) return target('Return to Tool rack', 'Land upright to exchange the ladle for a workpiece magnet.', c.rack.x, c.rack.y, this.dockTime / .65, 'Tool rack');
      const m = this.molds.find(m => !m.ready), amount = this.material.contained(sim.cabin).length;
      const pouring = amount >= 12 || this.action || m.fill >= m.capacity;
      const dest = pouring ? m : c.taps[0];
      return target(m.fill >= m.capacity ? 'Let the ingot cool' : pouring ? 'Mould · hold J to pour right' : 'Collect below the furnace tap',
        `${amount} in ladle · mould ${m.fill} / ${m.capacity} · ${this.material.spilled} spilled`, dest.x, dest.y, m.fill / m.capacity, pouring ? 'Mould' : 'Furnace tap');
    }
    if (!p) {
      if (this.jig && !this.jig.complete && this.jig.weld) return target('Welding in progress', 'The jig releases the assembly when the arc stops.', this.jig.x, this.jig.y, this.jig.weld / 2.4, 'Welding jig');
      const stock = this.hammers.map((_, i) => this.pieceAtHammer(i)).find(Boolean) ||
        this.pieces.find(p => p.jigSlot === undefined && !p.delivered);
      const h = stock && this.hammers[this.nextHammer(stock)];
      if (h && stock.x > h.collider.x - .95 && stock.x < h.collider.x + h.collider.w + .65 &&
          stock.y > h.y && stock.y < h.y + 6.6)
        return target('Hammer · loose workpiece', `${stock.forge} / 3 good hits · keep clear, then collect the forged metal`,
          stock.x, stock.y, stock.forge / 3, 'Hammer');
      return target(stock?.assembled ? 'Collect the welded assembly' : 'Pick up a workpiece', 'Lower the magnet above the part. It grips automatically; hold J to release.', stock?.x ?? c.rack.x, stock?.y ?? c.rack.y);
    }
    if (!p.assembled) {
      const h = this.hammers[this.nextHammer(p)];
      if (h) return target('Put the ingot under the hammer',
        `${p.forge} / 3 good hits · held or loose · press ${this.nextHammer(p) + 1}`,
        h.x, h.y + 2, p.forge / 3, 'Hammer');
      if (this.lathes.length && p.cut < 1) return target('Hold the workpiece on the lathe', 'The rotating cutter pulls sideways. Keep the blank in contact.', this.lathes[0].x, this.lathes[0].y + 1, p.cut, 'Lathe');
      if (c.belts?.length && p.polish < 1) return target('Push the workpiece into the belt', 'Use the left face. Counter its downward pull until polished.', c.belts[0].x, c.belts[0].y + 1.5, p.polish, 'Polishing belt');
      if (this.jig) {
        const slot = Array.from({length: this.jig.count}, (_, i) => i).find(i => this.jig.slots[i] === undefined) ?? 0;
        return target('Welding jig · release on a free mark', 'Hold J to place this part, then bring the next one.', this.slotX(slot), this.jig.y, 0, 'Welding jig');
      }
    }
    return target('Dispatch · set down and hold J', 'Release the finished work onto the shipping platform.', c.output.x, c.output.y, 1, 'Dispatch');
  }
  snapshot() {
    return {tool: this.tool, ore: this.material.deposited, heldOre: this.material.held().length,
      liquid: this.material.liquid.length, spilled: this.material.spilled,
      molds: this.molds.map(({fill, capacity, ready}) => ({fill, capacity, ready})),
      heldPiece: this.heldPiece?.id ?? null, active: this.tool === 'ladle' ? this.action : !this.action,
      pieces: this.pieces.map(p => ({id: p.id, x: p.x, y: p.y, a: p.a, vx: p.vx, vy: p.vy, w: p.w, attached: p.attached, forge: p.forge, sections: p.sections.map(s => ({...s})), cut: p.cut, polish: p.polish, assembled: p.assembled, jigSlot: p.jigSlot})),
      metrics: {...this.material.metrics}};
  }
}
