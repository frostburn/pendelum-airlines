import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { Sim } from '#game/physics';
import { DT } from '#game/constants';
import { clamp, wrap } from '#game/math';
import { WATER } from '#game/fire/water';
import { vel } from '#game/rigid-body';
import { steer } from './flight-controls.js';

// No teleporting, water injection, damage overrides or completion shortcuts:
// this pilot uses exactly the flight, winch and tool inputs offered to players.
export function flyFireRoute(id, observe = () => {}) {
  const sim = new Sim(id), work = sim.industry;
  let elapsed = 0, trim = 0, peakSpeed = 0;
  const value = v => typeof v === 'function' ? v() : v;
  function* move(x, y, name = 'position') {
    yield {x, y, name, max: 40, until: () => Math.abs(sim.cabin.x - value(x)) < .3 &&
      Math.abs(sim.cabin.y - value(y)) < .22 && Math.hypot(sim.cabin.vx, sim.cabin.vy) < .45};
  }
  function* travel(x, y) {
    yield* move(sim.cabin.x, 11, 'climb');
    yield* move(x, 11, 'cross');
    yield* move(x, y, 'descend');
  }
  function* refill() {
    const pool = work.incident.pools.reduce((a, b) => Math.abs(a.x - sim.cabin.x) < Math.abs(b.x - sim.cabin.x) ? a : b);
    yield* travel(pool.x, 1.4);
    yield {x: pool.x, y: 1.4, name: 'refill', max: 15,
      until: () => work.tool === 'hose' ? work.tank === WATER.tank : work.water.contained(sim.cabin).length >= 28};
  }
  function* hose(f, x, y, face = 1) {
    while (f.heat > .02 && !sim.done) {
      if (work.tank < 25) yield* refill();
      yield* travel(x, y);
      yield {x, y, name: 'spray', max: 20, fire: f, face,
        until: () => f.heat <= .02 || work.tank === 0};
    }
  }
  function* pour(x, y, until, name = 'pour') {
    yield* travel(x - .8, y + 2.8);
    yield {x: x - .8, y: y + 2.8, name, action: true, max: 6,
      until: () => elapsed > 2.7 || until()};
  }
  function* bucket(f) {
    for (let trip = 0; f.heat > .02 && trip < 8; trip++) {
      yield* refill();
      yield* pour(f.x + f.w / 2, f.y + f.h, () => f.heat <= .02);
    }
    assert.ok(f.heat <= .02, 'bucket must reach its fire');
  }
  function* run() {
    if (id === 56) {
      const h = work.headers[0];
      for (let trip = 0; work.fires[0].heat > .02 || work.fires[1].heat > .02; trip++) {
        assert.ok(trip < 8, 'header must reach both enclosed fires');
        yield* refill();
        yield* pour(h.x, h.y, () => false, 'fill header');
      }
      yield* bucket(work.fires[2]);
    } else if (work.tool === 'ladle') {
      for (const f of work.fires) yield* bucket(f);
    } else {
      if (id === 59) {
        // The tank may also supply a header: aim downward through its open mouth.
        const h = work.headers[0];
        yield* travel(h.x - 3, h.y + 3);
        yield {x: h.x - 3, y: h.y + 3, name: 'spray header', max: 20, target: {x: h.x, y: h.y}, face: 1,
          until: () => work.fires[0].heat <= .02 && work.fires[1].heat <= .02};
      }
      for (let pass = 0; pass < 5 && !sim.done; pass++) for (const f of work.fires) {
        if (f.heat <= .02) continue;
        let x = () => work.fireBox(f).x - 5, y = f.y + 3, face = 1;
        if (id === 49) { x = 17; y = 3.8; }
        if (id === 50 && f.id === 0) { x = 16; y = 6.5; }
        if (id === 52) { x = f.id ? 27 : 18.5; y = 3; face = f.id ? 1 : -1; }
        if (id === 55) { x = f.id ? 24 : 16; y = f.y + 1.8; }
        if (id === 59 && f.id === 4) { x = 49; y = 3; }
        yield* hose(f, x, y, face);
      }
    }
    yield {x: sim.cabin.x, y: sim.cabin.y, name: 'embers', max: 8, until: () => sim.done};
  }
  const plan = run(); let command = plan.next().value;
  const started = performance.now();
  for (let frame = 0; frame < 900 / DT && command && !sim.failed && !sim.done; frame++) {
    const x = value(command.x), y = value(command.y);
    if (Math.abs(x - sim.cabin.x) < 3) trim = clamp(trim + (x - sim.cabin.x) * DT * .5, -4, 4);
    const input = steer(sim, x + trim, y); input.y = Math.max(-.28, input.y);
    input.action = !!command.action;
    if (command.fire || command.target) {
      const b = command.fire && work.fireBox(command.fire);
      const target = command.target || {x: b.x + b.w / 2, y: b.y + b.h * .6};
      const {pole} = work.nozzle(sim.cabin), dx = Math.abs(target.x - pole.x), dy = target.y - pole.y, v = vel(pole);
      // The nozzle's own motion is part of the emitted water velocity.
      let low = -1.45, high = 1.2;
      for (let i = 0; i < 20; i++) {
        const a = (low + high) / 2, t = dx / (WATER.speed * Math.cos(a) + command.face * v.x);
        const height = (v.y + WATER.speed * Math.sin(a)) * t - 4.905 * t * t;
        if (height < dy) low = a; else high = a;
      }
      const angle = (low + high) / 2;
      const pitch = clamp(angle - command.face * sim.cabin.a, -1.35, 1.15);
      input.aim = clamp(wrap(pitch - work.pitch) * 8, -1, 1);
      input.flip = work.facing !== command.face;
      input.action = Math.abs(wrap(pitch - work.pitch)) < .025 && work.facing === command.face;
    }
    sim.step(input); elapsed += DT;
    peakSpeed = Math.max(peakSpeed, Math.hypot(sim.cabin.vx, sim.cabin.vy));
    observe(sim, command.name); sim.events.length = 0;
    if (command.until() || elapsed >= command.max) {
      assert.ok(elapsed < command.max, `${sim.level.name}: timeout ${command.name} (${sim.time.toFixed(1)} s); position ${sim.cabin.x.toFixed(2)}, ${sim.cabin.y.toFixed(2)}, heat ${work.fires.map(f => f.heat.toFixed(2))}; tank ${work.tank}; water ${work.water.contained(sim.cabin).length}; header ${JSON.stringify(work.headers)}`);
      command = plan.next().value; elapsed = 0; trim = 0;
    }
  }
  assert.ok(sim.done, `${sim.level.name}: ${sim.reason || 'unfinished incident'}`);
  assert.equal(sim.hull, 100, 'the flight should avoid hard collisions');
  assert.ok(peakSpeed < 12, 'water handling must not launch the rig');
  assert.ok(work.water.metrics.peak <= WATER.limit);
  assert.equal(sim.delivered, work.fires.length);
  return {sim, milliseconds: performance.now() - started};
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  for (const id of process.argv[2] ? [Number(process.argv[2])] : Array.from({length: 12}, (_, i) => 48 + i)) {
    const {sim, milliseconds} = flyFireRoute(id);
    console.log(`${sim.level.name}: ${sim.time.toFixed(2)} s, ${sim.hull}% integrity, ${sim.delivered} cooled; ${(milliseconds / sim.time / 60).toFixed(2)} ms physics / 60 Hz frame`);
  }
}
