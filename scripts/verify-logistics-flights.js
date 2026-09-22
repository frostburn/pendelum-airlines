import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { Sim } from '#game/physics';
import { DT } from '#game/constants';
import { steer } from './flight-controls.js';

// Full jobs driven only by the normal flight/winch/magnet inputs. NPCs use their
// own state machines; the pilot never moves a parcel or awards a receipt.
export function flyLogisticsRoute(id, observe = () => {}) {
  const sim = new Sim(id), depot = sim.industry;
  let elapsed = 0, trim = 0, peakSpeed = 0;
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
        if (w.kind !== 'clerk') {
          yield* move(sim.cabin.x, 9, true, 'clear worker');
          yield* move(home.dropX, 9, true, 'meet worker');
          yield {x: home.dropX, y: 9, action: true, name: 'wait for unloading', max: 65, until: () => p.receipts[id]};
        }
        yield* pickup(p);
      }
      const out = depot.manifest.outputs.find(o => o.id === p.destination);
      yield* put(p, out.x, out.y, () => p.delivered, 10);
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
  return {sim, milliseconds: performance.now() - started};
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  for (const id of process.argv[2] ? [Number(process.argv[2])] : Array.from({length: 12}, (_, i) => 36 + i)) {
    const {sim, milliseconds} = flyLogisticsRoute(id);
    console.log(`${sim.level.name}: ${sim.time.toFixed(2)} s, ${sim.hull}% integrity, ${sim.delivered} delivered; ${(milliseconds / sim.time / 60).toFixed(2)} ms physics / 60 Hz frame`);
  }
}
