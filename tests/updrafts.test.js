import test from 'node:test';
import assert from 'node:assert/strict';
import { boilerPower, liftAt, liftArea } from '#game/updrafts';
import { Sim } from '#game/physics';
import { DT, G, MAX_THRUST } from '#game/constants';
import { createRenderer } from '#game/render/renderer';

test('boiler pressure repeats, has a real cold interval, and ramps continuously', () => {
  const source = {period: 26, phase: .4};
  assert.equal(boilerPower(source, 0), 0);
  assert.equal(boilerPower(source, 15.6), 1);
  for (const t of [0, 8, 9.4, 15, 23.6, 80]) {
    assert.ok(Math.abs(boilerPower(source, t) - boilerPower(source, t + 26)) < 1e-12);
    assert.ok(Math.abs(boilerPower(source, t + 1e-5) - boilerPower(source, t)) < 1e-4);
  }
  assert.equal(boilerPower({}, 1000), 1);
});

test('air force has soft spatial edges, finite height, and area rather than payload scaling', () => {
  const source = {x: 5, w: 8, bottom: 2.5, top: 23, force: 50};
  assert.equal(liftAt([source], 5, 10, 0), 50);
  for (const [x, y] of [[0, 10], [10, 10], [5, 2.5], [5, 23], [5, 30]])
    assert.equal(liftAt([source], x, y, 0), 0);
  assert.ok(liftAt([source], 1.001, 10, 0) < .05);
  assert.ok(liftAt([source], 5, 22.999, 0) < .05);
  const force = liftAt([source], 5, 10, 0) * liftArea('cabin');
  assert.ok(force / 2.5 > force / 17.5, 'a loaded cabin must accelerate less in the same air');
  assert.equal(liftAt(undefined, 0, 0, 0), 0);
});

test('every freight load exceeds rotor capacity and cannot lift off without updrafts', () => {
  for (let route = 20; route <= 23; route++) {
    const s = new Sim(route);
    // Controlled ablation: keep geometry, passengers, mass, and controls, and
    // remove only the source of lift. No body poses or velocities are edited.
    s.level = {...s.level, updrafts: []};
    let highest = s.cabin.y;
    for (let i = 0; i < 14 / DT; i++) {
      s.step(s.onboard().length ? {y: 1} : {});
      highest = Math.max(highest, s.cabin.y);
      assert.ok(s.thrust <= MAX_THRUST);
    }
    assert.equal(s.onboard().length, 1);
    assert.equal(s.cabin.m, 17.5);
    assert.ok(s.bodies.reduce((mass, b) => mass + b.m, 0) * G > MAX_THRUST);
    assert.ok(highest < s.pads[0].y + .7, `${s.level.name}: cannot clear the loading pad`);
    assert.equal(s.done, false);
    assert.equal(s.hull, 100);
  }
});

test('freight unloading and simultaneous boarding restore a normal two-person load', () => {
  const s = new Sim(23);
  for (let i = 0; i < 160; i++) s.step();
  assert.equal(s.cabin.m, 17.5);
  const p = s.pads[2];
  Object.assign(s.cabin, {x: p.x, y: p.y + .565, vx: 0, vy: 0, a: 0, w: 0});
  for (let i = 0; i < 160; i++) s.serviceStop();
  assert.equal(s.delivered, 1);
  assert.equal(s.onboard().length, 2);
  assert.equal(s.cabin.m, 4.6);
  assert.ok(s.bodies.reduce((mass, b) => mass + b.m, 0) * G < MAX_THRUST);
  assert.deepEqual(s.targetStops(), [0]);
});

test('freight rotor control still never edits cabin velocity', () => {
  const s = new Sim(20);
  for (let i = 0; i < 160; i++) s.step();
  const {vx, vy} = s.cabin;
  s.controls({x: 1, y: 1});
  assert.equal(s.cabin.vx, vx);
  assert.equal(s.cabin.vy, vy);
});

test('braking a buoyant rig does not convert downward demand into extra upward thrust', () => {
  const s = new Sim(20);
  s.tensionY = 30; // An upward cable reaction from a cabin floating above the engine.
  s.controls({y: -1});
  assert.equal(s.thrust, 10, 'reduce to idle when lift already exceeds the vertical demand');
});

test('the real renderer freezes boiler pressure at simulation time, including interpolation', () => {
  const rectangles = [];
  const context = new Proxy({
    fillRect(x, y, w, h) { rectangles.push({x, y, w, h}); },
    measureText: text => ({width: text.length * 6}),
  }, {get: (target, key) => key in target ? target[key] : () => {}});
  const sim = new Sim(22), renderer = createRenderer({getContext: () => context});
  renderer.resize(390, 520);
  sim.time = 9.4;
  const before = JSON.stringify(sim);
  for (const alpha of [0, .5, 1]) for (const clock of [0, 500]) {
    rectangles.length = 0;
    renderer.render(sim, {map: true, panel: true, alpha, clock});
    for (const source of sim.level.updrafts) {
      const width = 1.3 * boilerPower(source, sim.time - (1 - alpha) * DT);
      assert.ok(rectangles.some(r => r.x === source.x - .65 && r.y === source.bottom + .2 && r.w === width && r.h === .15));
    }
    assert.equal(JSON.stringify(sim), before);
  }
  assert.equal(boilerPower(new Sim(22).level.updrafts[1], 0), 0, 'restart resets the boiler schedule');
});
