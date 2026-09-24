import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { Sim } from '#game/physics';
import { DT } from '#game/constants';
import { jointPoints, bounds, STRUCTURE_LIMIT } from '#game/demolition/structure';
import { steer } from './flight-controls.js';

// Inputs only: these flights never move bodies, fabricate contacts, cut joints,
// or assign task counters. Each collapse and lift is performed by Sim.step().
export function flyDemolitionRoute(id, observe = () => {}) {
  const sim = new Sim(id), site = sim.industry;
  let stageName, peakSpeed = 0, hoverTrim = 0;
  const now = performance.now();
  function* move(x, y, extra = {}) {
    yield {x, y, max: 35, name: 'position', until: () => Math.abs(sim.cabin.x - x) < .35 &&
      Math.abs(sim.cabin.y - y) < .24 && Math.hypot(sim.cabin.vx, sim.cabin.vy) < .65, ...extra};
  }
  function* cable(length) {
    yield {x: sim.cabin.x, y: sim.cabin.y, cable: length, max: 6, until: () => Math.abs(sim.length - length) < .03, name: 'winch'};
  }
  function* travel(x, y) {
    if ((id === 69 || id === 67) && sim.cabin.x > 13 && sim.cabin.x < 30 && sim.cabin.y < 9) {
      const exit = 8;
      const height = Math.max(3.5, Math.min(sim.cabin.y, 5));
      yield* move(sim.cabin.x, height);
      yield* move(exit, height, {name: 'leave facade'});
      if (site.heldPiece?.width > 3) yield* cable(3.8);
    }
    let high = id === 67 || id === 69 ? 12 : 11;
    if (site.heldPiece) {
      const p = site.heldPiece, roof = Math.max(...sim.level.terrain.map(r => r.y + r.h));
      // A slab picked up while leaning can hang vertically. Clear the roof
      // with the whole load, including its possible rotation during travel.
      high = Math.max(high, roof + 1.2 + p.radius + Math.abs(sim.cabin.y - p.y));
    }
    yield* move(sim.cabin.x, high, {name: 'climb'});
    yield* move(x, high, {name: 'cross'});
    yield* move(x, y, {name: 'descend'});
  }
  function* swap() {
    const r = site.site.racks.reduce((a, b) => Math.abs(a.x - sim.cabin.x) < Math.abs(b.x - sim.cabin.x) ? a : b);
    yield* travel(r.x, r.y + .85);
    const tool = site.tool;
    yield {x: r.x, y: r.y + .85, swap: true, max: 2, until: () => site.tool !== tool, name: 'exchange tool'};
  }
  function* strike(j) {
    if (j.broken) return;
    if (id === 67 && j.id === 'shutter-brace') {
      yield* move(3, 4);
      yield* cable(7.5);
      yield* move(5, 4);
      yield* move(5, 2.3);
      const vertical = () => Math.max(-1, Math.min(1, (10.2 - sim.engine.y) * 1.3 / 3.8));
      yield {name: 'build the swing', max: 12, x: 5, y: 2.3, until: () => sim.engine.x > 20.5 || j.broken,
        raw: () => ({x: 1, y: vertical()})};
      yield {name: 'swing under the canopy', max: 5, x: 14, y: 2.3, until: () => j.broken,
        raw: () => ({x: Math.max(-1, Math.min(1, ((20.5 - sim.engine.x) * 2 - sim.engine.vx * .8) / 5)), y: vertical()})};
      yield* move(11, 3.5, {name: 'back out'});
      yield* cable(1.65);
      return;
    }
    if (site.tool !== 'ball') yield* swap();
    for (let attempt = 0; attempt < 4 && !j.broken; attempt++) {
      const p = jointPoints(j)[0], direction = p.y < 1.2 && Math.abs(Math.sin(j.a.a + (j.a.height > j.a.width ? Math.PI / 2 : 0))) < .5 ? 0 : j.approach ?? -1;
      if (!direction) {
        // Aim onto the shutter's upper face, just inside its foot. A drop onto
        // the outside corner glances off rather than delivering a direct blow.
        const x = p.x + (id === 67 ? .65 : 0);
        if (id === 67) { yield* travel(11, 3.5); yield* move(x, 3.5); }
        else yield* travel(x, p.y + 4.5);
        yield {x, y: p.y - 1.5, max: 7, name: 'drop on splice', allowTimeout: true, until: () => j.broken};
      } else {
        const x = p.x + direction * 4.7, y = Math.max(1.05, p.y + .15);
        if (id === 67 || id === 69) {
          yield* travel(direction > 0 ? 33 : 11, y);
          yield* move(x, y, {name: 'under eaves'});
        } else yield* travel(x, y);
        yield {x: p.x - direction * 3, y, max: 6, name: `strike ${j.id}`, allowTimeout: true, until: () => j.broken};
      }
    }
    assert.ok(j.broken, `could not strike ${j.id}`);
    if (id === 69 || id === 67) yield* move((j.approach || -1) > 0 ? 33 : 11, sim.cabin.y, {name: 'leave facade'});
    yield* move(sim.cabin.x, Math.max(sim.cabin.y + 2, 8), {name: 'stand clear'});
  }
  function* pick(p) {
    if (site.tool !== 'hook') yield* swap();
    if ((id === 69 || id === 67) && p.x > 14 && p.x < 29) {
      yield* travel(11, bounds(p).top + 1.4);
      yield* move(p.x, bounds(p).top + 1.4);
    } else yield* travel(p.x, bounds(p).top + 2);
    // A heavier strike can leave a slab leaning into its building. Descend to
    // the actual surface above its centre, not the top of its bounding box.
    const surfaceY = () => p.y + Math.min(p.width / (2 * Math.max(1e-6, Math.abs(Math.sin(p.a)))),
      p.height / (2 * Math.max(1e-6, Math.abs(Math.cos(p.a)))));
    yield {x: () => p.x, y: () => surfaceY() + .20,
      max: 25, until: () => site.heldPiece === p, name: `collect ${p.id}`};
  }
  function* deliver(g) {
    const p = site.pieces.find(p => p.id === g.piece);
    if (!site.heldPiece) yield* pick(p);
    yield* travel(g.x, g.y + 3);
    yield {x: () => g.x + sim.cabin.x - p.x, y: () => g.y + .8 + sim.cabin.y - bounds(p).bottom,
      max: 30, name: 'align salvage', until: () => Math.abs(p.x - g.x) < .25 &&
        Math.abs(bounds(p).bottom - g.y - .8) < .25 && Math.hypot(p.vx, p.vy) < .4};
    yield {x: sim.cabin.x, y: sim.cabin.y, action: true, max: 12, until: () => g.complete, name: 'release salvage'};
  }
  function* orders() {
    if (id === 69) yield* cable(1.65);
    for (const g of site.goals) {
      if (g.complete) continue;
      if (g.type === 'release') for (const id of g.joints) yield* strike(site.joints.find(j => j.id === id));
      else if (g.type === 'deliver') yield* deliver(g);
      else yield {x: sim.cabin.x, y: Math.max(8, sim.cabin.y), max: 35, until: () => g.complete, name: `settle ${g.id}`};
    }
    yield {x: sim.cabin.x, y: sim.cabin.y, max: 2, until: () => sim.done, name: 'sign off'};
  }
  const plan = orders();
  for (let item = plan.next(); !item.done && !sim.done; item = plan.next()) {
    const stage = item.value; stageName = stage.name; let clock = 0, trimX = 0; hoverTrim = 0;
    while (!sim.done && !sim.failed && !stage.until() && clock < stage.max) {
      const x = typeof stage.x === 'function' ? stage.x() : stage.x, y = typeof stage.y === 'function' ? stage.y() : stage.y;
      hoverTrim += Math.max(-.7, Math.min(.7, y - sim.cabin.y)) * DT * .045;
      hoverTrim = Math.max(-.6, Math.min(.6, hoverTrim));
      if (['position', 'climb', 'cross', 'descend', 'leave facade', 'under eaves', 'align salvage', 'drop on splice'].includes(stage.name) && Math.abs(x - sim.cabin.x) < 1.5)
        trimX = Math.max(-.8, Math.min(.8, trimX + (x - sim.cabin.x) * DT * .16));
      const u = {...(stage.raw ? stage.raw() : steer(sim, x + trimX, y + hoverTrim)), action: !!stage.action, swap: !!stage.swap};
      if (stage.cable) u.winch = Math.sign(stage.cable - sim.targetLength);
      if (site.tool === 'hook' || stage.name === 'descend') u.y = Math.max(-.28, u.y);
      sim.step(u); clock += DT;
      peakSpeed = Math.max(peakSpeed, ...sim.bodies.map(b => Math.hypot(b.vx, b.vy)));
      observe(sim, stage.name);
    }
    assert.ok(!sim.failed, `${sim.level.name}: ${sim.reason} during ${stageName}`);
    assert.ok(sim.done || stage.allowTimeout || stage.until(), `${sim.level.name}: timed out ${stageName} at (${sim.cabin.x.toFixed(2)}, ${sim.cabin.y.toFixed(2)}) ${JSON.stringify(site.snapshot())}`);
  }
  assert.ok(sim.done, `${sim.level.name}: unfinished`);
  assert.equal(sim.hull, 100, `${sim.level.name}: safe flight must preserve the aircraft`);
  assert.ok(site.pieces.length <= STRUCTURE_LIMIT);
  assert.ok(peakSpeed < 18, `unstable demolition speed ${peakSpeed}`);
  return {sim, milliseconds: performance.now() - now, peakSpeed};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ids = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : Array.from({length: 12}, (_, i) => 60 + i);
  for (const id of ids) {
    const {sim, milliseconds} = flyDemolitionRoute(id);
    console.log(`${sim.level.name}: ${sim.time.toFixed(2)} s, ${sim.hull}% integrity; ${(milliseconds / 1000).toFixed(2)} s verification`);
  }
}
