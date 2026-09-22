import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { Sim } from '#game/physics';
import { DT } from '#game/constants';
import { MATERIAL_LIMITS } from '#game/industry/materials';
import { pieceOutline } from '#game/industry/workpiece';
import { worldPoint } from '#game/industry/geometry';
import { meetsOrder } from '#game/industry/workshop';
import { steer } from './flight-controls.js';

// These witnesses only supply flight, winch and tool-button inputs. The pilot
// reads the same visible workpieces, grains and machine cycles as the player.
// No teleports, fabricated contacts, material counters or completion overrides.
export function flyMetalRoute(id, observe = () => {}, {looseForge = false} = {}) {
  const sim = new Sim(id), work = sim.industry, config = work.config;
  let elapsed = 0, collected = 0, maximumSpeed = 0, looseHits = 0, hoverTrim = 0;
  function* move(x, y, extra = {}) {
    yield {x, y, max: 25, name: 'position', until: () => Math.abs(sim.cabin.x - x) < .25 &&
      Math.abs(sim.cabin.y - y) < .17 && Math.hypot(sim.cabin.vx, sim.cabin.vy) < .4, ...extra};
  }
  function* travel(x, y) {
    const high = work.hammers.length ? 11 : config.goal === 'ore' ? 6 : 8;
    yield* move(sim.cabin.x, high, {name: 'climb'});
    yield* move(x, high, {name: 'cross'});
    yield* move(x, y, {name: 'descend'});
  }
  function* pick(part) {
    assert.ok(part, 'a recoverable workpiece must exist');
    yield* move(sim.cabin.x, work.hammers.length ? 11 : 8, {name: 'climb'});
    if (work.heldPiece) return;
    yield* move(part.x - .2, work.hammers.length ? 11 : 8, {name: 'cross'});
    yield {x: part.x - .2, y: part.y + .5, until: () => work.heldPiece, max: 25, name: 'pick up'};
  }
  function* place(x, y, until, name) {
    const piece = work.heldPiece;
    yield* travel(x, y + 3);
    // Capture keeps the real pose; read the visible load instead of assuming a
    // fixed offset under the head. Centre it above the mark before releasing.
    yield {x: () => x + sim.cabin.x - piece.x, y: () => y + 1.2 + sim.cabin.y - piece.y,
      until: () => Math.abs(piece.x - x) < .15 && Math.abs(piece.y - y - 1.2) < .25 &&
        Math.hypot(piece.vx, piece.vy) < .35, max: 25, name: 'align load'};
    yield {x: sim.cabin.x, y: sim.cabin.y, action: true, until, max: 12, name};
  }
  function* machines() {
    if (work.hammers.length) yield {x: sim.cabin.x, y: sim.cabin.y + 1, cable: 7.2,
      until: () => sim.length > 7.15, max: 8, name: 'pay out'};
    while (work.hammers.length && work.nextHammer(work.heldPiece) !== undefined) {
      const hammer = work.hammers[work.nextHammer(work.heldPiece)], count = work.heldPiece.forge;
      yield* travel(hammer.x - 1.6, hammer.y + 2.4);
      if (looseForge) {
        const piece = work.heldPiece;
        yield* move(hammer.x + .25, hammer.y + 1.8, {until: () =>
          piece.x > hammer.x - .05 && piece.y < hammer.y + 1.6 && Math.abs(piece.vx) < 1.5});
        yield {x: hammer.x + .25, y: hammer.y + 1.8, action: true,
          until: () => !work.heldPiece, max: 1, name: 'leave on anvil'};
        yield {x: hammer.x - 1.6, y: hammer.y + 2.4, action: true,
          until: () => work.nextHammer(piece) === undefined || work.hammers[work.nextHammer(piece)] !== hammer,
          max: hammer.period * 5, name: 'forge loose'};
        yield* pick(piece);
      } else {
        yield {x: hammer.x - .12, y: hammer.y + 2.1,
          until: () => work.heldPiece.forge > count, max: hammer.period * 4, name: 'forge'};
      }
    }
    if (work.lathes.length) {
      const lathe = work.lathes[0];
      yield* travel(lathe.x - .3, lathe.y + 1.8);
      yield {x: lathe.x - .5, y: lathe.y + 1.05, until: () => work.heldPiece.cut >= 1, max: 30, name: 'turn'};
    }
    if (config.belts?.length) {
      const belt = config.belts[0];
      yield* travel(belt.x - 2, belt.y + belt.h + 2);
      yield {x: () => belt.x + .4 + sim.cabin.x - Math.max(...pieceOutline(work.heldPiece).map(([x, y]) => worldPoint(work.heldPiece, x, y).x)),
        y: belt.y + belt.h + .55, until: () => work.heldPiece.polish >= 1, max: 30, name: 'polish'};
    }
  }
  function* orders() {
    if (work.tool === 'magnet') {
      const ores = () => work.material.rocks.filter(p => p.iron && !p.held && p.x < config.bin.x - config.bin.w / 2 - 1)
        .sort((a, b) => Math.abs(a.x - sim.cabin.x) - Math.abs(b.x - sim.cabin.x));
      for (let run = 0; run < 5 && work.material.deposited < config.quota; run++) {
        const targetCount = Math.min(MATERIAL_LIMITS.held, config.quota - work.material.deposited);
        assert.ok(ores().length, 'the field needs recoverable ore');
        yield* travel(ores()[0].x, .95);
        for (let pass = 0; pass < 30 && work.material.held().length < targetCount; pass++) {
          const ore = ores()[0];
          if (!ore) break;
          yield {x: ore.x, y: .85, until: () => ore.held || work.material.held().length >= targetCount,
            max: 12, allowTimeout: true, name: 'rake'};
        }
        const bin = config.bin;
        yield* travel(bin.x, bin.y + 1.7);
        yield {x: bin.x, y: bin.y + 1.7, action: true, until: () => work.material.deposited >= config.quota,
          max: 3, allowTimeout: true, name: 'release ore'};
      }
      return;
    }
    if (work.tool === 'ladle') {
      for (const mold of work.molds) for (let run = 0; run < 5 && !mold.ready; run++) {
        const tap = config.taps[0];
        yield* travel(tap.x + 1.65, 2.7);
        yield {x: tap.x + .1, y: 2.7, until: () => work.material.contained(sim.cabin).length >= 40, max: 20, name: 'fill'};
        // Back out from under the solid tap before climbing with the full cup.
        yield* move(tap.x + 2.1, 2.7);
        yield* travel(mold.x - .10, mold.y + 2);
        yield {x: mold.x + .35, y: mold.y + 2, action: true,
          until: () => mold.ready || work.material.contained(sim.cabin).length <= 2,
          max: 12, allowTimeout: true, name: 'pour'};
        yield {x: mold.x + .35, y: mold.y + 2, until: () => mold.ready, max: 3, allowTimeout: true, name: 'cool'};
      }
      if (config.goal === 'cast') return;
      yield* travel(3, 1.77);
      yield {x: 3, y: 1.77, until: () => work.tool === 'hook', max: 5, name: 'exchange tool'};
    }
    if (!work.heldPiece) yield* pick(work.pieces.find(p => p.cast) || work.pieces[0]);
    if (work.jig) {
      const jig = work.jig;
      for (let slot = 0; slot < jig.count; slot++) {
        if (!work.heldPiece) yield* pick(work.pieces.find(p => p.jigSlot === undefined));
        if (!work.heldPiece.cut || !work.heldPiece.polish || !work.heldPiece.forge) yield* machines();
        const x = work.slotX(slot);
        yield* place(x, jig.y, () => jig.slots[slot] !== undefined, 'place in jig');
      }
      yield {x: jig.x - .2, y: jig.y + 1, action: true, until: () => jig.complete, max: 5, name: 'weld'};
      yield {x: jig.x - .2, y: jig.y + .84, until: () => work.heldPiece?.assembled, max: 10, name: 'collect assembly'};
    } else yield* machines();
    const out = config.output;
    yield* place(out.x, out.y, () => sim.done, 'dispatch');
  }
  const plan = orders();
  let command = plan.next().value;
  const started = performance.now();
  for (let frame = 0; frame < 600 / DT && command && !sim.failed && !sim.done; frame++) {
    const targetX = typeof command.x === 'function' ? command.x() : command.x;
    const targetY = typeof command.y === 'function' ? command.y() : command.y;
    if (config.goal !== 'ore' && ['climb', 'cross', 'descend', 'position', 'align load'].includes(command.name) && Math.abs(targetX - sim.cabin.x) < 1.5)
      hoverTrim = Math.max(-.8, Math.min(.8, hoverTrim + (targetX - sim.cabin.x) * DT * .16));
    const input = steer(sim, targetX + hoverTrim, targetY);
    input.y = Math.max(-.28, input.y);
    input.action = !!command.action;
    if (command.cable) input.winch = sim.targetLength < command.cable ? 1 : 0;
    const loose = looseForge ? work.pieces.filter(p => !p.attached).map(p => ({p, forge: p.forge})) : [];
    sim.step(input);
    for (const {p, forge} of loose) if (!p.attached) looseHits += p.forge - forge;
    elapsed += DT;
    collected = Math.max(collected, work.material.held().length);
    maximumSpeed = Math.max(maximumSpeed, Math.hypot(sim.cabin.vx, sim.cabin.vy));
    observe(sim, command.name);
    sim.events.length = 0;
    if (command.until() || elapsed >= command.max) {
      assert.ok(elapsed < command.max || command.allowTimeout,
        `${sim.level.name}: timed out during ${command.name} at ${sim.time.toFixed(2)} s`);
      command = plan.next().value; elapsed = 0; hoverTrim = 0;
    }
  }
  assert.ok(sim.done, `${sim.level.name}: ${sim.reason || 'work order unfinished'}`);
  if (config.hammerHits) assert.ok(work.pieces.some(p => config.hammerHits.every((hits, i) => p.stamps[i] === hits)),
    'delivery requires the exact quota at each press');
  if (looseForge) assert.equal(looseHits, 3, 'the anvil flight must forge entirely through hits on released metal');
  assert.equal(sim.hull, 100, `${sim.level.name}: the flight must keep the drone clear of the hammer`);
  assert.ok(maximumSpeed < 12, 'contacts or changes in payload must not launch the rig');
  assert.ok(work.material.metrics.peakLiquid <= MATERIAL_LIMITS.liquid);
  if (config.goal === 'ore') {
    assert.ok(collected > 0 && work.material.deposited >= config.quota);
    assert.ok(work.material.rocks.length + work.material.deposited <= MATERIAL_LIMITS.rocks);
  } else if (config.goal === 'cast') {
    assert.ok(work.molds.every(m => m.ready && m.fill === m.capacity));
  } else {
    assert.ok(work.pieces.some(p => p.delivered && !p.attached && meetsOrder(p, config.requires)));
    if (work.jig) assert.equal(new Set(work.jig.slots).size, work.jig.count);
  }
  return {sim, milliseconds: performance.now() - started};
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const ids = process.argv[2] ? [Number(process.argv[2])] : Array.from({length: 12}, (_, i) => i + 24);
  for (const id of ids) {
    const {sim, milliseconds} = flyMetalRoute(id);
    console.log(`${sim.level.name}: ${sim.time.toFixed(2)} s, ${sim.hull}% integrity; ${(milliseconds / sim.time / 60).toFixed(2)} ms physics / 60 Hz frame`);
  }
  if (!process.argv[2]) {
    const {sim} = flyMetalRoute(28, () => {}, {looseForge: true});
    console.log(`Loose-anvil delivery: ${sim.time.toFixed(2)} s; released, forged, collected and delivered using flight controls.`);
  }
}
