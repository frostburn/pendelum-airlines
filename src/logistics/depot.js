import { Workshop } from '#game/industry/workshop';
import { pieceBottom, pieceSamples } from '#game/industry/workpiece';
import { clamp } from '#game/math';

// NPCs are powered machines on fixed lanes. Their decks exchange ordinary
// contact/friction impulses with cargo; no cargo pose or velocity is assigned.
export class Depot extends Workshop {
  constructor(sim) {
    super(sim);
    this.manifest = sim.level.logistics;
    this.workers = this.manifest.workers.map((spec, i) => {
      const deck = {x: spec.x - 2, y: spec.y - .18, w: 4, h: .18, style: 'metal', worker: i, vx: 0, vy: 0};
      const body = {x: spec.x + 2.2, y: 0, w: 1.1, h: spec.kind === 'clerk' ? 1.1 : 1.65, style: 'metal', vx: 0};
      const mast = spec.kind === 'forklift' ? {x: spec.x + 2, y: .8, w: .14, h: spec.dropY + .6, style: 'metal', vx: 0} : null;
      sim.terrain.push(deck, body, ...(mast ? [mast] : []));
      return {speed: 1.35, liftSpeed: .75, dwell: 1.2, ...spec, deck, body, mast,
        state: 'waiting', clock: 0, lost: 0, cargo: null, completed: [], vx: 0, vy: 0, message: 'READY FOR PARCEL'};
    });
    this.pieces.forEach((p, i) => {
      Object.assign(p, this.manifest.parcels[i], {receipts: {}, settle: 0});
      p.sections = [-.65, -.325, 0, .325, .65].map(x => ({x, lo: -.43, hi: .43}));
      p.colliders = pieceSamples(p);
    });
  }
  supported(p, worker) {
    return !p.delivered && !p.attached && Math.abs(p.x - worker.x) < 1.35 &&
      Math.abs(pieceBottom(p) - worker.y) < .18 &&
      p.contacts.some(c => c.ny > .4 && c.terrain === worker.deckIndex);
  }
  ready(worker, p) {
    return p.route.includes(worker.id) && !p.receipts[worker.id] &&
      p.route.slice(0, p.route.indexOf(worker.id)).every(id => p.receipts[id]) &&
      (!worker.queue || worker.queue[worker.completed.length] === p.code);
  }
  available(w, time) {
    return !w.breakPeriod || time % w.breakPeriod >= w.breakLength;
  }
  moveWorker(w, x, y, dt) {
    // Acceleration-limited motion lets friction accelerate an unsecured parcel.
    const drive = (position, target, speed, velocity) => {
      const delta = target - position, desired = Math.sign(delta) * Math.min(speed, Math.sqrt(1.6 * Math.abs(delta)));
      const v = velocity + clamp(desired - velocity, -.8 * dt, .8 * dt);
      return Math.abs(delta) < Math.abs(v * dt) ? [target, 0] : [position + v * dt, v];
    };
    const oldX = w.x, oldY = w.y;
    [w.x, w.vx] = drive(w.x, x, w.speed, w.vx);
    [w.y, w.vy] = drive(w.y, y, w.liftSpeed, w.vy);
    Object.assign(w.deck, {x: w.x - 2, y: w.y - .18, vx: (w.x - oldX) / dt, vy: (w.y - oldY) / dt});
    Object.assign(w.body, {x: w.x + 2.2, vx: w.deck.vx});
    if (w.mast) Object.assign(w.mast, {x: w.x + 2, vx: w.deck.vx});
    return Math.abs(w.x - x) < .01 && Math.abs(w.y - y) < .01 && Math.abs(w.vx) + Math.abs(w.vy) < .02;
  }
  beforeStep(sim, input, dt) {
    super.beforeStep(sim, input, dt);
    for (const [i, w] of this.workers.entries()) {
      w.deckIndex ??= sim.terrain.indexOf(w.deck);
      const home = this.manifest.workers[i];
      let x = w.x, y = w.y;
      w.seeking = false;
      if (w.state === 'waiting' && w.kind === 'forklift') {
        // An overhelpful dog noses under low-hanging cargo in its loading bay.
        // It can follow the magnet, but only a released load starts the job.
        const nearby = this.pieces.find(p => !p.delivered && this.ready(w, p) && !this.supported(p, w) &&
          Math.abs(p.x - home.x) < 3.5 && pieceBottom(p) > home.y + .1 && pieceBottom(p) < home.y + 2.3);
        if (nearby) { x = nearby.x; w.seeking = Math.abs(x - w.x) > .15; }
      }
      if (w.state === 'lifting') y = home.dropY;
      if (w.state === 'carrying') { x = home.dropX; y = home.dropY; }
      if (w.state === 'returning') { x = home.x; y = home.dropY; }
      if (w.state === 'lowering') { x = home.x; y = home.y; }
      w.arrived = this.moveWorker(w, x, y, dt);
    }
  }
  afterStep(sim, dt) {
    this.tick++;
    for (const w of this.workers) {
      if (w.state === 'waiting') {
        const p = this.pieces.find(p => this.supported(p, w));
        w.message = !this.available(w, sim.time) ? 'ON BREAK · LEAVE IT HERE' : w.queue ? `NEXT: ${w.queue[w.completed.length] || 'ALL DONE'}` : w.seeking ? 'LET ME GET THAT' : 'READY FOR PARCEL';
        if (!p || !this.ready(w, p) || !this.available(w, sim.time) || Math.hypot(p.vx, p.vy) > .5) {
          w.clock = 0;
          if (p && !p.receipts[w.id] && !this.ready(w, p)) w.message = 'CHECK ROUTE / QUEUE';
          continue;
        }
        w.clock += dt; w.message = w.kind === 'clerk' ? 'READING THE LABEL…' : 'COUNTING THE LOAD…';
        if (w.clock < w.dwell) continue;
        w.cargo = p; w.clock = 0;
        if (w.kind === 'clerk') this.receipt(sim, w);
        else { w.state = 'lifting'; w.message = 'PUTTING IT AWAY'; }
      } else if (w.state === 'lifting' || w.state === 'carrying') {
        w.message = w.state === 'lifting' ? 'GOING UP' : w.kind === 'tug' ? 'KEEPING TO THE ROUTE' : 'PUTTING IT AWAY';
        w.lost = w.cargo && this.supported(w.cargo, w) ? 0 : w.lost + dt;
        if (w.lost > .65) { w.state = 'returning'; w.cargo = null; w.message = 'WHERE DID IT GO?'; continue; }
        if (w.arrived) { w.state = w.state === 'lifting' ? 'carrying' : 'unloading'; w.clock = 0; }
      } else if (w.state === 'unloading') {
        w.message = 'COLLECT AT THIS END';
        if (w.cargo && this.supported(w.cargo, w)) {
          w.clock += dt;
          if (w.clock > .65 && !w.cargo.receipts[w.id]) this.receipt(sim, w);
        } else {
          w.state = 'returning'; w.cargo = null; w.clock = 0;
        }
      } else if (w.state === 'returning' && w.arrived) w.state = 'lowering';
      else if (w.state === 'lowering' && w.arrived) { w.state = 'waiting'; w.lost = 0; w.clock = 0; }
    }
    for (const p of this.pieces) {
      if (p.delivered) continue;
      const out = this.manifest.outputs.find(o => o.id === p.destination);
      const ready = p.route.every(id => p.receipts[id]);
      if (!p.attached && ready && Math.abs(p.x - out.x) < out.w / 2 - .65 &&
          Math.abs(pieceBottom(p) - out.y) < .15 && Math.hypot(p.vx, p.vy) < .5) {
        p.settle += dt;
        if (p.settle > .65) {
          p.delivered = true; sim.delivered++;
          sim.jobs[p.id].state = 'delivered';
          sim.events.push({type: 'machine', message: `${p.code} delivered to ${out.name}.`});
        }
      } else p.settle = 0;
    }
    if (this.pieces.every(p => p.delivered)) { sim.done = true; sim.events.push({type: 'complete'}); }
  }
  receipt(sim, w) {
    const p = w.cargo;
    p.receipts[w.id] = true; w.completed.push(p.code);
    w.message = 'DONE · YOUR TURN';
    sim.events.push({type: 'machine', message: `${w.name}: ${p.code} ${w.kind === 'clerk' ? 'signed off' : 'unloaded'}. Please collect it.`});
    if (w.kind === 'clerk') { w.cargo = null; w.clock = 0; }
  }
  nextWorker(p) { return this.workers.find(w => w.id === p.route.find(id => !p.receipts[id])); }
  order(sim) {
    const p = this.heldPiece || this.pieces.find(p => !p.delivered), finished = this.pieces.filter(p => p.delivered).length;
    const output = this.manifest.outputs[0];
    if (!p) return {title: 'Manifest complete', detail: 'Every parcel has reached its address.', x: output.x, y: output.y, progress: 1, name: 'Delivered'};
    const worker = this.nextWorker(p), out = this.manifest.outputs.find(o => o.id === p.destination);
    const aboard = this.workers.find(w => w.cargo === p && w.state !== 'waiting');
    const target = aboard || worker || out;
    const instruction = aboard ? `${aboard.name}: ${aboard.message.toLowerCase()}` : worker ?
      `${worker.name} · ${this.heldPiece ? 'set down & hold J' : 'bring ' + p.code}` : `${out.name} · release parcel`;
    return {title: `${p.code} → ${instruction}`, detail: `${finished} / ${this.pieces.length} delivered · ${p.route.map(id => `${p.receipts[id] ? '✓' : '○'} ${this.workers.find(w => w.id === id).short}`).join(' · ')}`,
      x: target.x, y: target.y + .6, progress: (finished + p.route.filter(id => p.receipts[id]).length / (p.route.length + 1)) / this.pieces.length, name: target.name};
  }
  snapshot() {
    return {...super.snapshot(), parcels: this.pieces.map(p => ({id: p.id, code: p.code, receipts: {...p.receipts}, delivered: !!p.delivered})),
      workers: this.workers.map(w => ({id: w.id, x: w.x, y: w.y, state: w.state, cargo: w.cargo?.id ?? null, completed: [...w.completed]}))};
  }
}
