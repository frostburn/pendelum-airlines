import { clamp, wrap } from '#game/math';
import { MaterialField, CUP_WALLS } from '#game/industry/materials';
import { circleBox, worldPoint } from '#game/industry/geometry';

export const PIECE_LIMIT = 8;
const pieceSamples = [[-.43, -.43, .135], [.85, -.43, .135], [-.43, .10, .15], [.85, .10, .15], [0, .06, .32], [0, .46, .14]];
const cupSamples = CUP_WALLS.flatMap(w => [[w.x + .08, w.y + .08, .08], [w.x + w.w - .08, w.y + w.h - .08, .08]]);
const magnetSamples = [[-.45, 0, .18], [.45, 0, .18], [0, .40, .19]];
export const meetsOrder = (piece, requires = {}) => Object.entries(requires).every(([key, value]) => (piece[key] || 0) >= value - .0001);

export function hammerPose(hammer, time) {
  const phase = ((time / hammer.period + (hammer.phase || 0)) % 1 + 1) % 1;
  // A long raised dwell, a warning, a fast downstroke, then a slow return.
  const travel = phase < .50 ? 1 : phase < .65 ? 1 - (phase - .50) / .15 : phase < .74 ? 0 : (phase - .74) / .26;
  return {bottom: hammer.y + .43 + travel * 6.2, cycle: phase, warning: phase >= .38 && phase < .65};
}

export class Workshop {
  constructor(sim) {
    this.config = sim.level.industry;
    this.tool = this.config.tool;
    this.action = false; this.tick = 0; this.pieces = []; this.serial = 0;
    this.heldPiece = null; this.pin = null; this.sparks = []; this.dockTime = 0;
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
      this.heldPiece = this.addPiece({x: sim.cabin.x, y: sim.cabin.y, ...this.config.startPiece});
      this.heldPiece.attached = true;
    }
    this.updateMass(sim);
  }
  addPiece(spec) {
    if (this.pieces.length >= PIECE_LIMIT) return null;
    const p = {id: this.serial++, x: 0, y: 0, a: 0, vx: 0, vy: 0, w: 0,
      forge: 0, cut: 0, polish: 0, assembled: 0, stamps: {}, attached: false, settle: 0, ...spec};
    this.pieces.push(p); return p;
  }
  samples() {
    if (this.tool === 'ladle') return cupSamples;
    if (this.heldPiece) return pieceSamples;
    return magnetSamples;
  }
  updateMass(sim) {
    const mass = 2.5 + (this.heldPiece ? 3.5 + this.heldPiece.assembled * .8 : 0) +
      this.material.held().length * .14 + (this.tool === 'ladle' ? this.material.contained(sim.cabin).length * .065 : 0);
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
    const c = sim.cabin;
    if (this.tool === 'ladle') {
      // Powered trunnion: torque turns the vessel; liquid still moves in world
      // space and must cross its rotating rim to leave it.
      const target = this.action ? -2.05 : 0;
      c.w += clamp(wrap(target - c.a) * 100 - c.w * 18, -80, 80) * dt;
    } else if (this.action && !this.pin) {
      this.material.release(c);
      if (this.heldPiece) {
        const p = this.heldPiece;
        p.attached = false; p.vx = c.vx; p.vy = c.vy; p.w = c.w;
        this.heldPiece = null;
      }
    }
    this.hammers.forEach((h, i) => {
      const previous = h.collider.y, pose = hammerPose(h, sim.time);
      Object.assign(h, pose);
      Object.assign(h.collider, {y: pose.bottom, vy: (pose.bottom - previous) / dt});
      if (this.pin?.hammer === i && this.heldPiece) {
        const p = this.heldPiece;
        // Powered jaws centre the blank gradually, without teleporting a rig
        // through a constraint and turning overlap correction into velocity.
        this.pin.x += clamp(h.x - this.pin.x, -dt * 1.2, dt * 1.2);
        if (previous > h.y + .86 && pose.bottom <= h.y + .86 && Math.abs(this.pin.x - h.x) < .08) {
          p.stamps[i] = Math.min(3, (p.stamps[i] || 0) + 1);
          p.forge = Object.values(p.stamps).reduce((sum, n) => sum + n, 0);
          this.burst(h.x + .85, h.y + .6, '#ffb449', 18);
          sim.events.push({type: 'machine', message: `Hammer ${p.stamps[i]} / 3. Keep the engine clear.`});
        }
        if (p.stamps[i] >= 3 && pose.bottom > h.y + 1.5) {
          this.pin = null;
          sim.events.push({type: 'machine', message: 'Anvil jaws released. Lift the workpiece out.'});
        }
      }
    });
  }
  constrain(sim) {
    if (this.pin) Object.assign(sim.cabin, {x: this.pin.x, y: this.pin.y, a: 0});
  }
  skipCollision(body, terrain) {
    // The press deforms the clamped bar. Its face still collides with the engine
    // and cable; only the blank held by this anvil is exempt from rigid overlap.
    return body.kind === 'cabin' && this.pin && terrain.hammer === this.pin.hammer;
  }
  afterStep(sim, dt) {
    this.tick++;
    const c = sim.cabin, config = this.config;
    if (this.pin) { c.vx = c.vy = c.w = 0; }
    if (this.heldPiece) {
      const q = worldPoint(c, .20, -.18);
      Object.assign(this.heldPiece, q, {a: c.a, vx: c.vx, vy: c.vy, w: c.w});
    }
    if (this.tick % 2 === 0) {
      this.material.step(sim, this, dt * 2);
      this.movePieces(sim, dt * 2);
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
      if (Math.abs(c.x - r.x) < 1 && Math.abs(c.y - r.y - .565) < .22 && Math.abs(c.a) < .3 && Math.hypot(c.vx, c.vy) < .7) {
        this.dockTime += dt;
        if (this.dockTime > .65) {
          this.tool = 'hook';
          sim.events.push({type: 'machine', message: 'Magnetic clamp fitted. Pick up the cooled casting.'});
        }
      } else this.dockTime = 0;
    }
    if (this.tool === 'hook' && !this.action && !this.heldPiece) {
      const p = this.pieces.find(p => !p.attached && p.jigSlot === undefined && !p.delivered &&
        Math.abs(c.x + .20 - p.x) < .55 && c.y > p.y + .36 && c.y < p.y + .94 &&
        Math.hypot(c.vx - p.vx, c.vy - p.vy) < 1.6);
      if (p) {
        p.attached = true; this.heldPiece = p;
        sim.stats.pickups++; this.updateMass(sim);
        sim.events.push({type: 'machine', message: p.assembled ? 'Assembly attached. Take it to Dispatch.' : 'Workpiece attached. Hold X to release.'});
      }
    }
    const p = this.heldPiece;
    if (p && !p.assembled) {
      if (!this.pin && p.forge < this.hammers.length * 3) this.hammers.some((h, i) => {
        if ((p.stamps[i] || 0) >= 3 || Math.abs(c.x - h.x) > .48 || Math.abs(c.y - .565 - h.y) > .22 ||
            Math.abs(c.a) > .35 || Math.hypot(c.vx, c.vy) > 1.6) return false;
        this.pin = {hammer: i, x: c.x, y: h.y + .565};
        sim.events.push({type: 'machine', message: 'Anvil clamped. Cable remains attached. Keep left of the hammer!'});
        return true;
      });
      const contacts = c.contacts.filter(contact => contact.ly < .25).map(contact => sim.terrain[contact.terrain]);
      if (contacts.some(t => t?.machine === 'lathe') && (!this.hammers.length || p.forge >= this.hammers.length * 3) && p.cut < 1) {
        p.cut = Math.min(1, p.cut + dt / 3.5);
        if (this.tick % 18 === 0) this.burst(c.x + .5, c.y - .4, '#ddbd7f', 3);
        if (p.cut === 1) sim.events.push({type: 'machine', message: 'Turning complete. The blank is now a shaped shaft.'});
      }
      if (contacts.some(t => t?.machine === 'belt') && (!this.lathes.length || p.cut >= 1) && p.polish < 1) {
        p.polish = Math.min(1, p.polish + dt / 3.5);
        if (this.tick % 18 === 0) this.burst(c.x + .85, c.y, '#ffe4a8', 3);
        if (p.polish === 1) sim.events.push({type: 'machine', message: 'Polished. You can almost see the poor decisions in it.'});
      }
    }
    this.weld(sim, dt);
    if (config.goal === 'deliver') for (const part of this.pieces) {
      const out = config.output;
      if (!part.attached && part.jigSlot === undefined && meetsOrder(part, config.requires) &&
          Math.abs(part.x - out.x) < out.w / 2 - .8 && Math.abs(part.y - .36 - out.y) < .16 &&
          Math.hypot(part.vx, part.vy) < .65) {
        part.settle += dt;
        if (part.settle > .55) { part.delivered = true; this.complete(sim); }
      } else part.settle = 0;
    }
  }
  movePieces(sim, dt) {
    for (const p of this.pieces) {
      if (p.attached || p.jigSlot !== undefined || p.delivered) continue;
      p.vy -= 9.81 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.w * dt;
      for (const t of sim.terrain) {
        if (!t.w || t.hammer !== undefined) continue;
        for (const [lx, ly] of [[-.56, -.28], [.56, -.28], [-.56, .28], [.56, .28]]) {
          const q = worldPoint(p, lx, ly), hit = circleBox(q.x, q.y, .08, t);
          if (!hit) continue;
          p.x += hit.nx * hit.depth; p.y += hit.ny * hit.depth;
          const vn = p.vx * hit.nx + p.vy * hit.ny;
          if (vn < 0) { p.vx -= hit.nx * vn; p.vy -= hit.ny * vn; }
          if (hit.ny > .5) { p.vx *= .94; p.w *= .88; p.a *= .96; }
        }
      }
      // Every required part remains recoverable; the shop floor spans the map.
      p.x = clamp(p.x, -.5, sim.level.width + .5);
    }
  }
  weld(sim, dt) {
    const j = this.jig;
    if (!j || j.complete) return;
    for (const p of this.pieces) {
      if (p.attached || p.jigSlot !== undefined || p.assembled || !meetsOrder(p, j.requires)) continue;
      for (let slot = 0; slot < j.count; slot++) {
        const x = this.slotX(slot);
        if (j.slots[slot] !== undefined || Math.abs(p.x - x) > .64 || Math.abs(p.y - j.y - .36) > .20 || Math.hypot(p.vx, p.vy) > 1.2) continue;
        Object.assign(p, {x, y: j.y + .36, a: 0, vx: 0, vy: 0, w: 0, jigSlot: slot});
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
      return target(held ? 'Refinery hopper · hold X to release' : 'Rake magnetite from the sand',
        `${this.material.deposited} / ${c.quota} refined · ${held} / 28 on magnet · hold X: magnet OFF`, destination.x, destination.y + 1, this.material.deposited / c.quota, held ? 'Refinery' : 'Ore bed');
    }
    if (this.tool === 'ladle') {
      if (this.molds.every(m => m.ready)) return target('Return to Tool rack', 'Land upright to exchange the ladle for a magnetic clamp.', c.rack.x, c.rack.y, this.dockTime / .65, 'Tool rack');
      const m = this.molds.find(m => !m.ready), amount = this.material.contained(sim.cabin).length;
      const pouring = amount >= 12 || this.action || m.fill >= m.capacity;
      const dest = pouring ? m : c.taps[0];
      return target(m.fill >= m.capacity ? 'Let the ingot cool' : pouring ? 'Mould · hold X to pour right' : 'Collect below the furnace tap',
        `${amount} in ladle · mould ${m.fill} / ${m.capacity} · ${this.material.spilled} spilled`, dest.x, dest.y, m.fill / m.capacity, pouring ? 'Mould' : 'Furnace tap');
    }
    if (!p) {
      if (this.jig && !this.jig.complete && this.jig.weld) return target('Welding in progress', 'The jig releases the assembly when the arc stops.', this.jig.x, this.jig.y, this.jig.weld / 2.4, 'Welding jig');
      const stock = this.pieces.find(p => p.jigSlot === undefined && !p.delivered);
      return target(stock?.assembled ? 'Collect the welded assembly' : 'Pick up a workpiece', 'Lower the magnetic clamp onto the part. Release X to grip.', stock?.x ?? c.rack.x, stock?.y ?? c.rack.y);
    }
    if (!p.assembled) {
      const h = p.forge < this.hammers.length * 3 && this.hammers.find((_, i) => (p.stamps[i] || 0) < 3);
      if (h) return target(this.pin ? 'Anvil locked · keep engine clear' : 'Set the ingot on the anvil mark',
        `${p.forge} / ${this.hammers.length * 3} hammer blows · the cable stays attached`, h.x, h.y, p.forge / (this.hammers.length * 3), 'Anvil');
      if (this.lathes.length && p.cut < 1) return target('Hold the workpiece on the lathe', 'The rotating cutter pulls sideways. Keep the blank in contact.', this.lathes[0].x, this.lathes[0].y + 1, p.cut, 'Lathe');
      if (c.belts?.length && p.polish < 1) return target('Push the workpiece into the belt', 'Use the left face. Counter its downward pull until polished.', c.belts[0].x, c.belts[0].y + 1.5, p.polish, 'Polishing belt');
      if (this.jig) {
        const slot = Array.from({length: this.jig.count}, (_, i) => i).find(i => this.jig.slots[i] === undefined) ?? 0;
        return target('Welding jig · release on a free mark', 'Hold X while placing this part, then bring the next one.', this.slotX(slot), this.jig.y, 0, 'Welding jig');
      }
    }
    return target('Dispatch · set down and hold X', 'Release the finished work onto the shipping platform.', c.output.x, c.output.y, 1, 'Dispatch');
  }
  snapshot() {
    return {tool: this.tool, ore: this.material.deposited, heldOre: this.material.held().length,
      liquid: this.material.liquid.length, spilled: this.material.spilled,
      molds: this.molds.map(({fill, capacity, ready}) => ({fill, capacity, ready})),
      heldPiece: this.heldPiece?.id ?? null, pin: this.pin ? {...this.pin} : null,
      pieces: this.pieces.map(p => ({id: p.id, x: p.x, y: p.y, attached: p.attached, forge: p.forge, cut: p.cut, polish: p.polish, assembled: p.assembled, jigSlot: p.jigSlot})),
      metrics: {...this.material.metrics}};
  }
}
