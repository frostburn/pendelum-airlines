import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { Sim } from '#game/physics';
import { DT } from '#game/constants';
import { steer } from './flight-controls.js';

// Full jobs driven only by the normal flight/winch/magnet inputs. NPCs use their
// own state machines; the pilot never moves a parcel or awards a receipt.
export function flyLogisticsRoute(id, observe = () => {}, {snatch = false} = {}) {
  const sim = new Sim(id), depot = sim.industry;
  let elapsed = 0, trim = 0, peakSpeed = 0, earlySnatches = 0;
  function* move(x, y, action = false, name = 'position') {
    yield {x, y, action, name, max: 30, until: () => Math.abs(sim.cabin.x - x) < .25 &&
      Math.abs(sim.cabin.y - y) < .20 && Math.hypot(sim.cabin.vx, sim.cabin.vy) < .4};
  }
  function* travel(x, y, action = false) {
    yield* move(sim.cabin.x, 9, action, 'climb');
    yield* move(x, 9, action, 'cross');
    yield* move(x, y, action, 'descend');
  }
  function* pickup(p) {
    yield* travel(p.x, p.y + 2.6, true);
    yield {x: () => p.x - .1, y: () => p.y + .5, name: 'pickup', max: 20, until: () => depot.heldPiece === p};
  }
  function* put(p, x, y, until, timeout = 30) {
    yield* travel(x, y + 3);
    yield {x: () => x + sim.cabin.x - p.x, y: () => y + 1.2 + sim.cabin.y - p.y,
      until: () => Math.abs(p.x - x) < .15 && Math.abs(p.y - y - 1.2) < .25 && Math.hypot(p.vx, p.vy) < .35,
      max: 30, name: 'align'};
    yield {x: sim.cabin.x, y: sim.cabin.y, action: true, until, max: timeout, name: 'handoff'};
  }
  function* run() {
    for (const p of depot.pieces) {
      yield* pickup(p);
      for (const id of p.route) {
        const w = depot.workers.find(w => w.id === id), home = depot.manifest.workers.find(w => w.id === id);
        if (w.state !== 'waiting') {
          yield* travel(home.x, 7);
          yield {x: home.x, y: 7, name: 'wait for staff', max: 65, until: () => w.state === 'waiting'};
        }
        yield* put(p, home.x, home.y, () => p.receipts[id] || w.cargo === p, 35);
        if (w.kind !== 'clerk' && snatch) {
          const g = w.passage, exit = g.direction > 0 ? g.end : g.x;
          yield* move(sim.cabin.x, g.roof + .8, true, 'clear guard');
          yield* move(exit + g.direction * 1.3, g.roof + .8, true, 'meet exit');
          yield {x: () => depot.canPickup(p) ? p.x + g.direction * .15 : exit + g.direction * 1.3,
            y: home.dropY + 1.1, name: 'snatch', max: 20,
            until: () => depot.heldPiece === p};
          assert.ok(p.receipts[id], 'the internal scanner must already have qualified the parcel');
          assert.equal(w.state, 'carrying', 'snatch must happen before the worker parks');
          earlySnatches++;
        } else {
          if (w.kind !== 'clerk') {
            yield* move(sim.cabin.x, 9, true, 'clear worker');
            yield* move(home.dropX, 9, true, 'meet worker');
            yield {x: home.dropX, y: 9, action: true, name: 'wait for parking', max: 65, until: () => w.state === 'unloading'};
          }
          if (depot.marshal && w.kind === 'clerk') {
            // Stay over the counter and reclaim the signed parcel promptly;
            // a long overhead circuit gives Pip time to sweep it away.
            yield {x: () => p.x - .1, y: () => p.y + .5, name: 'reclaim signature',
              max: 20, until: () => depot.heldPiece === p};
          } else yield* pickup(p);
        }
      }
      if (depot.marshal) {
        const m = depot.marshal;
        // Bait the active pusher west with a parcel above blade height, then
        // leave overhead. It cannot chase cargo above its visible reach.
        yield* travel(m.home + 1.3, 5.1);
        yield {x: m.home + 1.3, y: 5.1, name: 'lure marshal', max: 35, until: () => m.x < m.home + 2};
      }
      const out = depot.manifest.outputs.find(o => o.id === p.destination);
      if (depot.marshal) {
        yield* travel(out.x, Math.max(7, out.y + 4));
        yield {x: () => out.x + sim.cabin.x - p.x, y: Math.max(7, out.y + 4),
          name: 'aim high drop', max: 25, until: () => Math.abs(p.x - out.x) < .12 && Math.abs(p.vx) < .15};
        yield {x: () => out.x + sim.cabin.x - p.x, y: () => out.y + 1.1 + sim.cabin.y - p.y,
          name: 'lower past marshal', max: 20, until: () => Math.abs(p.x - out.x) < .25 &&
            Math.abs(p.y - out.y - 1.1) < .15 && Math.hypot(p.vx, p.vy) < .45};
        yield {x: sim.cabin.x, y: sim.cabin.y, action: true, name: 'drop past marshal', max: 10, until: () => p.delivered};
      } else yield* put(p, out.x, out.y, () => p.delivered, 10);
    }
  }
  const plan = run(); let command = plan.next().value;
  const started = performance.now();
  for (let frame = 0; frame < 1200 / DT && command && !sim.failed && !sim.done; frame++) {
    const x = typeof command.x === 'function' ? command.x() : command.x, y = typeof command.y === 'function' ? command.y() : command.y;
    if (Math.abs(x - sim.cabin.x) < 1.5) trim = Math.max(-.8, Math.min(.8, trim + (x - sim.cabin.x) * DT * .16));
    const input = steer(sim, x + trim, y); input.y = Math.max(-.28, input.y); input.action = !!command.action;
    sim.step(input); elapsed += DT;
    peakSpeed = Math.max(peakSpeed, Math.hypot(sim.cabin.vx, sim.cabin.vy));
    observe(sim, command.name); sim.events.length = 0;
    if (command.until() || elapsed >= command.max) {
      assert.ok(elapsed < command.max, `${sim.level.name}: timeout ${command.name} (${sim.time.toFixed(1)} s); ${JSON.stringify(depot.snapshot())}`);
      command = plan.next().value; elapsed = 0; trim = 0;
    }
  }
  assert.ok(sim.done, `${sim.level.name}: ${sim.reason || 'unfinished manifest'}`);
  assert.equal(sim.hull, 100, 'the flight should avoid hard drone collisions');
  assert.ok(peakSpeed < 12, 'handoffs must not launch the rig');
  assert.ok(depot.pieces.every(p => p.delivered && !p.attached && p.route.every(id => p.receipts[id])));
  assert.equal(sim.delivered, depot.pieces.length);
  if (snatch) assert.ok(earlySnatches > 0);
  return {sim, earlySnatches, milliseconds: performance.now() - started};
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  for (const id of process.argv[2] ? [Number(process.argv[2])] : Array.from({length: 12}, (_, i) => 36 + i)) {
    const {sim, milliseconds} = flyLogisticsRoute(id);
    console.log(`${sim.level.name}: ${sim.time.toFixed(2)} s, ${sim.hull}% integrity, ${sim.delivered} delivered; ${(milliseconds / sim.time / 60).toFixed(2)} ms physics / 60 Hz frame`);
  }
  if (!process.argv[2]) for (const id of [37, 39]) {
    const {sim} = flyLogisticsRoute(id, () => {}, {snatch: true});
    console.log(`${sim.level.name}: early snatch, ${sim.time.toFixed(2)} s, ${sim.hull}% integrity`);
  }
}
