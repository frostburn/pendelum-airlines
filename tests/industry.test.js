import test from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '#game/physics';
import { DT } from '#game/constants';
import { hammerPose, meetsOrder } from '#game/industry/workshop';
import { MaterialField, MATERIAL_LIMITS } from '#game/industry/materials';
import { nearbyPairs } from '#game/industry/geometry';
import { pieceOutline, pieceSamples } from '#game/industry/workpiece';
import { createRenderer } from '#game/render/renderer';

function advance(s, seconds, input = {}) {
  for (let i = 0; i < Math.round(seconds / DT); i++) s.step(input);
}

test('grain broad phase finds every nearby pair exactly once, across negative cell boundaries', () => {
  const points = Array.from({length: 180}, (_, id) => ({id, x: Math.sin(id * 19.3) * 5, y: Math.cos(id * 11.7) * 3}));
  const seen = new Set();
  const candidates = nearbyPairs(points, .4, (a, b) => {
    const key = [a.id, b.id].sort((a, b) => a - b).join(',');
    assert.ok(!seen.has(key)); seen.add(key);
  });
  for (const a of points) for (const b of points) if (a.id < b.id && Math.hypot(a.x - b.x, a.y - b.y) < .4)
    assert.ok(seen.has(`${a.id},${b.id}`));
  assert.ok(candidates < points.length * (points.length - 1) / 8, 'sparse grains must not use an all-pairs pass');
});

test('seeded grain beds and their simulation are deterministic and capped', () => {
  const a = new Sim(25), b = new Sim(25);
  assert.equal(a.industry.material.rocks.length, MATERIAL_LIMITS.rocks);
  advance(a, 1); advance(b, 1);
  assert.deepEqual(a.industry.material.rocks, b.industry.material.rocks);
  assert.ok(a.industry.material.metrics.peakCandidates < 5000);
  assert.equal(a.hull, 100);
});

test('magnet selects iron, releasing it removes payload mass, and sand cannot fulfil the order', () => {
  const s = new Sim(24), w = s.industry;
  w.material.rocks = [true, false].map((iron, id) => ({id, iron, x: s.cabin.x + id * .15, y: s.cabin.y - .30, r: .12, vx: 0, vy: 0}));
  const mass = s.cabin.m;
  advance(s, .06, {action: true});
  assert.equal(w.material.held().length, 1);
  assert.ok(w.material.held()[0].iron);
  assert.ok(s.cabin.m > mass);
  advance(s, .06);
  assert.equal(w.material.held().length, 0);
  assert.equal(s.cabin.m, mass);
  assert.equal(w.material.deposited, 0);
  assert.ok(!s.done);
});

test('workpiece magnet starts off, actively attracts a loose ingot, and releases with its momentum', () => {
  const s = new Sim(28), w = s.industry, p = w.pieces[0], c = s.cabin;
  assert.equal(w.heldPiece, null);
  Object.assign(c, {x: p.x - .20, y: p.y + 1.05, a: 0});
  for (let i = 0; i < 30; i++) { w.beforeStep(s, {}, DT); w.afterStep(s, DT); }
  assert.equal(w.heldPiece, null, 'proximity alone cannot energise a magnet');
  const floorY = p.y;
  for (let i = 0; i < 180 && !w.heldPiece; i++) {
    // This fixture holds the magnet in place, like the rotor holding altitude.
    c.vx = c.vy = 0;
    w.beforeStep(s, {action: true}, DT); w.afterStep(s, DT);
  }
  assert.ok(p.y > floorY + .03, 'the free ingot must move upward before capture');
  assert.equal(w.heldPiece, p);
  assert.equal(c.m, 6);
  w.afterStep(s, DT);
  Object.assign(c, {vx: 1.2, vy: .5, w: .8});
  const expected = {vx: c.vx - c.w * (p.y - c.y), vy: c.vy + c.w * (p.x - c.x)};
  w.beforeStep(s, {}, DT);
  assert.equal(w.heldPiece, null); assert.equal(p.attached, false);
  assert.equal(p.vx, expected.vx); assert.equal(p.vy, expected.vy); assert.equal(p.w, c.w);
  w.updateMass(s); assert.equal(c.m, 2.5);
});

test('three physical hammer strikes bend the free rig and change held and loose collision geometry', () => {
  const s = new Sim(28), w = s.industry, p = w.pieces[0], h = w.hammers[0];
  const rest = new Sim(28).bodies.map(b => ({x: b.x, y: b.y}));
  const restCabin = rest.at(-1);
  w.heldPiece = p; p.attached = true; w.updateMass(s);
  const original = structuredClone(pieceOutline(p));
  for (let stroke = 0; stroke < 3; stroke++) {
    s.bodies.forEach((b, i) => Object.assign(b, {
      x: rest[i].x - restCabin.x + h.x - .12, y: rest[i].y - restCabin.y + h.y + 2.1,
      vx: 0, vy: 0, w: 0, a: 0, contacts: []
    }));
    s.time = h.period * (stroke + .60);
    h.collider.y = hammerPose(h, s.time).bottom;
    const shape = structuredClone(p.colliders), startY = s.cabin.y;
    for (let i = 0; i < 80 && p.forge === stroke; i++) s.step({action: true});
    assert.equal(p.forge, stroke + 1);
    assert.notDeepEqual(p.colliders, shape);
    assert.deepEqual(p.colliders, pieceSamples(p));
    assert.ok(Math.abs(s.cabin.w) > .2 || Math.abs(s.cabin.vy) > .5, 'impact must transfer momentum');
    assert.notEqual(s.cabin.y, startY, 'cargo must not be pinned to an anvil');
    const forged = structuredClone(p.sections);
    w.forge(s); w.forge(s);
    assert.equal(p.forge, stroke + 1, 'persistent contacts in one stroke count only once');
    assert.deepEqual(p.sections, forged);
    assert.equal(s.hull, 100);
    assert.ok(h.rebound, 'hammer must rebound from a real impact');
    assert.equal(s.failed, false);
  }
  assert.notDeepEqual(pieceOutline(p), original);
  assert.ok(p.sections.at(-1).hi < .10, 'the projecting end must visibly bend');
  const held = w.samples().filter(sample => sample[3] === 'piece');
  p.colliders.forEach(([x, y, r], i) => assert.deepEqual(held[i], [x + .20, y - .18, r, 'piece']));
  const permanent = structuredClone(p.sections);
  w.beforeStep(s, {}, DT); w.movePieces(s, DT);
  assert.deepEqual(p.sections, permanent, 'dropping the piece must preserve its dents');
});

test('upright ladle holds fluid, tipping spills it through the rim, and waste stays bounded', () => {
  const body = {x: 0, y: 3, a: 0, vx: 0, vy: 0, w: 0, m: 1000, I: 1000};
  const field = new MaterialField({}, 7);
  const sim = {cabin: body, level: {width: 20}, terrain: [{x: -12, y: -10, w: 40, h: 10}]};
  const work = {config: {}, tool: 'ladle', molds: []};
  for (let i = 0; i < 30; i++) field.emit((i % 6 - 2.5) * .18, 2.72 + Math.floor(i / 6) * .18);
  for (let i = 0; i < 120; i++) field.step(sim, work, 1 / 120);
  assert.ok(field.contained(body).length >= 28);
  const held = field.contained(body).length;
  body.a = -2.05;
  for (let i = 0; i < 600; i++) field.step(sim, work, 1 / 120);
  assert.ok(field.contained(body).length < held / 2);
  assert.ok(field.spilled > 0);
  assert.ok(field.slag.length <= MATERIAL_LIMITS.slag);
  assert.ok(field.links.length <= 256);
  for (let i = 0; i < 200; i++) field.emit(2, 5);
  assert.equal(field.liquid.length, MATERIAL_LIMITS.liquid);
});

test('moulds count only droplets outside the ladle and stop accepting metal when full', () => {
  const field = new MaterialField({}, 9), mold = {x: 0, y: 1, w: 3, capacity: 1, fill: 0};
  const body = {x: 0, y: 1.8, a: 0, vx: 0, vy: 0, w: 0, m: 1000, I: 1000};
  const sim = {cabin: body, level: {width: 20}, terrain: [{x: -12, y: -10, w: 40, h: 10}]};
  const work = {config: {}, tool: 'ladle', molds: [mold]};
  field.emit(0, 1.46);
  field.step(sim, work, 1 / 120);
  assert.equal(mold.fill, 0, 'putting the whole cup inside a mould is not pouring');
  body.x = 8;
  for (let i = 0; i < 30; i++) field.step(sim, work, 1 / 120);
  assert.equal(mold.fill, 1);
  field.emit(0, 1.4);
  field.step(sim, work, 1 / 120);
  assert.equal(field.liquid.length, 1, 'an overfull mould must leave real overflow');
});

test('hammer motion repeats without mutating its anvil height or phase offset', () => {
  const s = new Sim(29), before = structuredClone(s.level.industry.hammers);
  for (const config of before) for (const t of [0, .3, 2, 7, 80]) {
    const a = hammerPose(config, t), b = hammerPose(config, t + config.period);
    assert.ok(Math.abs(a.bottom - b.bottom) < 1e-10);
    assert.ok(a.bottom >= config.y + .43 - 1e-9 && a.bottom <= config.y + 6.63 + 1e-9);
  }
  advance(s, 3);
  assert.deepEqual(s.level.industry.hammers, before);
  s.industry.hammers.forEach((h, i) => {
    assert.equal(h.y, before[i].y); assert.equal(h.phase, before[i].phase);
    assert.ok(h.collider.y >= h.y + .43 && h.collider.y <= h.y + 6.63);
  });
  assert.equal(s.industry.pieces[0].forge, 0, 'cycling a press does not forge a distant blank');
});

test('the falling hammer really hits the engine; its warning lane is not just decoration', () => {
  const s = new Sim(28), w = s.industry, h = w.hammers[0];
  s.time = h.period * .53;
  const previous = hammerPose(h, s.time - DT);
  h.collider.y = previous.bottom;
  w.beforeStep(s, {}, DT);
  Object.assign(s.engine, {x: h.collider.x + 1, y: h.collider.y - .15, vx: 0, vy: 0, a: 0, w: 0, contacts: [], impact: 0});
  s.collideBody(s.engine, true);
  assert.ok(s.engine.impact > 7);
  w.forge(s);
  assert.equal(w.pieces[0].forge, 0, 'hitting an empty rig cannot forge a workpiece');
  s.step({});
  assert.equal(s.hull, 100, 'industrial engine collisions must not subtract integrity');
});

test('slow touches, upstrokes and the wrong press cannot substitute for a good forging hit', () => {
  for (const [index, velocity] of [[0, 0], [0, -.5], [0, 4], [1, -8]]) {
    const s = new Sim(29), w = s.industry, p = w.pieces[0], h = w.hammers[index];
    w.heldPiece = p; p.attached = true; w.updateMass(s);
    Object.assign(h.collider, {y: 3.5, vy: velocity});
    Object.assign(s.cabin, {x: h.x - .12, y: 3.38, a: 0, vx: 0, vy: 0, w: 0, contacts: []});
    s.collideBody(s.cabin, true);
    assert.ok(s.cabin.contacts.some(c => c.part === 'piece' && s.terrain[c.terrain] === h.collider));
    w.forge(s);
    assert.equal(p.forge, 0);
  }
});

test('lathe and belt need workpiece contacts; proximity cannot advance either process', () => {
  for (const [id, machine, property] of [[30, 'lathe', 'cut'], [31, 'belt', 'polish']]) {
    const s = new Sim(id), w = s.industry, piece = w.pieces[0];
    w.heldPiece = piece; piece.attached = true;
    const t = s.terrain.find(t => t.machine === machine);
    Object.assign(s.cabin, {x: t.x - 2, y: t.y + 3, a: 0, contacts: []});
    w.afterStep(s, DT);
    assert.equal(piece[property], 0);
    Object.assign(s.cabin, machine === 'lathe' ? {x: t.x, y: t.y + t.r + .45} : {x: t.x - .9, y: t.y + 1});
    s.collideBody(s.cabin, true);
    assert.ok(s.cabin.contacts.some(c => s.terrain[c.terrain] === t));
    w.afterStep(s, DT);
    assert.ok(piece[property] > 0);
  }
});

test('welding consumes distinct qualified pieces and releases one collectible assembly', () => {
  const s = new Sim(33), w = s.industry, j = w.jig;
  const p = w.pieces[0];
  Object.assign(p, {x: w.slotX(0), y: j.y + .36});
  w.weld(s, 1);
  assert.equal(j.slots.length, 0, 'dull parts are rejected');
  p.polish = 1; w.weld(s, 1);
  assert.equal(j.slots.filter(x => x !== undefined).length, 1);
  for (let i = 0; i < 5; i++) w.weld(s, 1);
  assert.equal(j.slots.filter(x => x !== undefined).length, 1, 'one part cannot occupy several slots');
  for (let slot = 1; slot < 3; slot++) Object.assign(w.pieces[slot], {x: w.slotX(slot), y: j.y + .36, polish: 1});
  w.weld(s, 1); w.weld(s, 1); w.weld(s, 1);
  assert.equal(w.pieces.length, 1); assert.equal(w.pieces[0].assembled, 3);
  assert.equal(w.pieces[0].jigSlot, undefined);
  assert.ok(meetsOrder(w.pieces[0], s.level.industry.requires));
  assert.equal(s.done, false, 'assembly still has to reach Dispatch');
});

test('drawing industrial machines and fluid never advances simulation or changes a paused hammer', () => {
  const context = new Proxy({measureText: text => ({width: text.length * 6})}, {get: (o, k) => k in o ? o[k] : () => {}});
  const renderer = createRenderer({getContext: () => context}); renderer.resize(390, 520);
  for (const id of [24, 26, 28, 31, 35]) {
    const s = new Sim(id); advance(s, .3);
    const before = JSON.stringify(s.snapshot());
    renderer.render(s, {clock: 200, alpha: .5, panel: true});
    renderer.render(s, {clock: 400, alpha: .5, panel: true, map: true});
    assert.equal(JSON.stringify(s.snapshot()), before);
  }
});
