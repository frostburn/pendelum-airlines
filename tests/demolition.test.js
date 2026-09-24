import test from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '#game/physics';
import { Body } from '#game/rigid-body';
import { DT } from '#game/constants';
import { levels } from '#game/levels';
import { member, circleMember, collideMembers, contactVelocity, jointPoints, STRUCTURE_LIMIT, JOINT_LIMIT } from '#game/demolition/structure';
import { createRenderer } from '#game/render/renderer';

const step = (sim, seconds, input = {}) => { for (let n = 0; n < seconds / DT; n++) sim.step(input); };
const energy = bodies => bodies.reduce((v, b) => v + .5 * b.m * (b.vx ** 2 + b.vy ** 2) + .5 * b.I * b.w ** 2, 0);
const momentum = bodies => bodies.reduce((v, b) => [v[0] + b.m * b.vx, v[1] + b.m * b.vy,
  v[2] + b.I * b.w + b.m * (b.x * b.vy - b.y * b.vx)], [0, 0, 0]);

test('pinned frames, counterweights and welded bridge sections stay put before demolition', () => {
  for (const id of [60, 65, 66, 71]) {
    const sim = new Sim(id), site = sim.industry, initial = site.pieces.map(p => ({x: p.x, y: p.y}));
    step(sim, 2);
    assert.equal(site.breakCount, 0);
    site.pieces.forEach((p, i) => {
      assert.ok(Math.hypot(p.x - initial[i].x, p.y - initial[i].y) < .08, `${id}: ${p.id} drifts at rest`);
      assert.ok(Math.hypot(p.vx, p.vy) < .1, `${id}: ${p.id} gains energy at rest`);
    });
    for (const j of site.joints) {
      const [a, b] = jointPoints(j);
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < .002);
    }
  }
});

test('dynamic beam and ball contact conserves momentum and dissipates energy', () => {
  const a = member({x: 0, y: 0, width: 5, height: .6, mass: 6}, 'beam');
  const b = new Body(1.2, .85, 5.5, 1, 'cabin'); b.vx = 2; b.vy = -5;
  const contacts = []; circleMember(a, b, [[0, 0, .66]], contacts);
  assert.ok(contacts.length);
  const before = momentum([a, b]), ke = energy([a, b]);
  for (let i = 0; i < 10; i++) for (const c of contacts) contactVelocity(c);
  momentum([a, b]).forEach((v, i) => assert.ok(Math.abs(v - before[i]) < 1e-8));
  assert.ok(energy([a, b]) <= ke);
  assert.ok(a.w !== 0, 'an off-centre collision must rotate the beam');
  const crate = member({x: 0, y: .5, width: 1, height: 1, mass: 30}, 'crate');
  const pairs = []; collideMembers(a, crate, pairs);
  assert.ok(pairs.length, 'large members must physically support cargo');
});

test('only a fast ball contact close to a breakable connection releases it', () => {
  function impact(speed, y, tool = 'ball') {
    const sim = new Sim(60), site = sim.industry, wall = site.pieces[0];
    site.tool = tool;
    Object.assign(sim.cabin, {x: wall.x - .94, y, vx: speed, vy: 0});
    site.pairContacts = []; circleMember(wall, sim.cabin, [[0, 0, .66]], site.pairContacts);
    site.finishContacts(sim); return site;
  }
  assert.equal(impact(1, 3.8).breakCount, 0, 'slow pushing is not demolition');
  assert.equal(impact(4, 1.8).breakCount, 0, 'a hit far from a bolt cannot remotely sever it');
  assert.equal(impact(4, 3.8, 'hook').breakCount, 0, 'the magnet is not a second wrecking ball');
  const site = impact(4, 3.8);
  assert.equal(site.breakCount, 1);
  assert.equal(site.joints[0].broken, false, 'the blue foot remains a hinge');
  assert.equal(site.joints[1].broken, true);
  site.finishContacts(new Sim(60));
  assert.equal(site.breakCount, 1, 'the same contact is not counted twice');
});

test('a structural collision damages the drone through ordinary speed-based collisions', () => {
  const sim = new Sim(61), wall = sim.industry.pieces[0];
  const dx = wall.x - 2.8 - sim.engine.x, dy = 6 - sim.engine.y;
  for (const b of sim.bodies) { b.x += dx; b.ox += dx; b.y += dy; b.oy += dy; b.vx = 5; }
  sim.step();
  assert.ok(sim.hull < 100 && sim.hull > 0, 'ordinary impact damage, not an instant kill zone');
  assert.equal(sim.industry.breakCount, 0, 'the engine cannot cut structural bolts');
});

test('magnet pickup is restricted to detached steel; tool swaps require a rack', () => {
  const sim = new Sim(62), site = sim.industry;
  assert.equal(site.canPickup(site.pieces[0]), false);
  for (const j of site.joints) j.broken = true;
  assert.equal(site.canPickup(site.pieces[0]), true);
  sim.step({swap: true}); assert.equal(site.tool, 'hook');
  sim.step({swap: true}); assert.equal(site.tool, 'hook', 'held U cannot swap repeatedly');
  site.clearInput(); sim.step({swap: true}); assert.equal(site.tool, 'ball');
  sim.cabin.x = 8; site.clearInput(); sim.step({swap: true}); assert.equal(site.tool, 'ball');
  assert.equal(new Sim(63).industry.canPickup(new Sim(63).industry.pieces[1]), false, 'heavy wooden freight needs its chute');
});

test('catch and delivery goals need settled, released cargo at the actual destination', () => {
  const sim = new Sim(71), site = sim.industry, p = site.pieces[0], g = site.goals.find(g => g.id === 'one');
  for (const id of g.after) site.goals.find(g => g.id === id).complete = true;
  assert.equal(site.goalMet(g), false);
  Object.assign(p, {x: g.x, y: g.y + .3, a: 0, vx: 0, vy: 0, w: 0});
  assert.equal(site.goalMet(g), true);
  p.attached = true; assert.equal(site.goalMet(g), false);
  p.attached = false; p.vy = -3; assert.equal(site.goalMet(g), false);
  p.vy = 0; p.y += 2; assert.equal(site.goalMet(g), false);
});

test('all demolition contracts stay within fixed body and joint budgets and render without mutation', () => {
  const noop = () => {}, ctx = new Proxy({measureText: t => ({width: t.length * 6}),
    createLinearGradient: () => ({addColorStop: noop})}, {get: (o, k) => k in o ? o[k] : noop});
  const renderer = createRenderer({getContext: () => ctx}, {reduced: true});
  for (let id = 60; id < 72; id++) {
    const sim = new Sim(id), site = sim.industry;
    assert.ok(site.pieces.length <= STRUCTURE_LIMIT && site.joints.length <= JOINT_LIMIT);
    assert.equal(new Set(site.pieces.map(p => p.id)).size, site.pieces.length);
    assert.equal(new Set(site.joints.map(j => j.id)).size, site.joints.length);
    for (const g of site.goals) {
      if (g.piece) assert.ok(site.pieces.some(p => p.id === g.piece));
      for (const j of g.joints || []) assert.ok(site.joints.some(q => q.id === j && !q.permanent));
      for (const dependency of g.after || []) assert.ok(site.goals.some(q => q.id === dependency));
    }
    const before = JSON.stringify(sim.snapshot());
    for (const [w, h] of [[1200, 680], [390, 550]]) {
      renderer.resize(w, h); renderer.render(sim, {alpha: 1, panel: true});
    }
    assert.equal(JSON.stringify(sim.snapshot()), before);
  }
  assert.equal(levels[60].collection, 'Controlled demolition');
});

test('moving chute contacts respect the cargo friction coefficient', () => {
  const slide = friction => {
    const chute = member({x: 0, y: 0, width: 6, height: .5, mass: 5}, 'chute');
    const crate = member({x: 0, y: .7, width: 1, height: 1, mass: 30, friction}, 'crate');
    crate.vx = 3; crate.vy = -1;
    const pairs = []; collideMembers(chute, crate, pairs);
    assert.ok(pairs.length); contactVelocity(pairs[0]);
    return {crate, chute};
  };
  const smooth = slide(0), wheels = slide(.04), rough = slide(.4);
  assert.equal(smooth.crate.vx, 3, 'zero friction cannot apply a tangential impulse');
  assert.ok(wheels.crate.vx > rough.crate.vx && wheels.crate.vx < 3);
  assert.ok(wheels.chute.vx < rough.chute.vx, 'the chute receives the opposite friction impulse');
});

test('the finale requires a joined landing and reports an early splice cut immediately', () => {
  const strike = caught => {
    const sim = new Sim(71), site = sim.industry, beam = site.pieces[0];
    const split = site.goals.find(g => g.id === 'split');
    assert.deepEqual(split.after, ['catch-west', 'catch-east']);
    if (caught) for (const id of split.after) site.goals.find(g => g.id === id).complete = true;
    assert.equal(site.goalReady(split), caught);
    Object.assign(sim.cabin, {x: 19.8, y: 7.87, vx: 0, vy: -4});
    site.pairContacts = []; circleMember(beam, sim.cabin, [[0, 0, .66]], site.pairContacts);
    site.finishContacts(sim);
    assert.equal(site.joints.find(j => j.id === 'middle-splice').broken, true, 'an early cut is still a physical cut');
    return sim;
  };
  const early = strike(false);
  assert.equal(early.failed, true); assert.match(early.reason, /both cradles/);
  assert.equal(early.industry.goalMet(early.industry.goals.find(g => g.id === 'catch-west')), false);
  assert.equal(strike(true).failed, false);
});
