import test from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '#game/physics';
import { DT } from '#game/constants';
import { hammerPose, meetsOrder } from '#game/industry/workshop';
import { MaterialField, MATERIAL_LIMITS } from '#game/industry/materials';
import { point } from '#game/rigid-body';
import { worldPoint } from '#game/industry/geometry';
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
  advance(s, .06);
  assert.equal(w.material.held().length, 1);
  assert.ok(w.material.held()[0].iron);
  assert.ok(s.cabin.m > mass);
  advance(s, .06, {action: true});
  assert.equal(w.material.held().length, 0);
  assert.equal(s.cabin.m, mass);
  assert.equal(w.material.deposited, 0);
  assert.ok(!s.done);
});

test('workpiece magnet attracts by default and release preserves independent body momentum', () => {
  const s = new Sim(28), w = s.industry, p = w.pieces[0], c = s.cabin;
  const floorY = p.y;
  advance(s, .1, {action: true});
  assert.equal(w.heldPiece, null);
  advance(s, 1);
  assert.equal(w.heldPiece, p);
  assert.ok(p.y > floorY + .01);
  assert.equal(c.m, 2.5, 'the workpiece retains its own mass and inertia');
  assert.equal(p.m, 3.5);
  const velocity = [p.vx, p.vy, p.w], pose = [p.x, p.y, p.a];
  w.beforeStep(s, {action: true}, DT);
  assert.equal(w.heldPiece, null); assert.equal(p.attached, false);
  assert.deepEqual([p.vx, p.vy, p.w], velocity);
  assert.deepEqual([p.x, p.y, p.a], pose);
});

test('three real held strikes deform solid cargo while absorbing the hammer kick', () => {
  const s = new Sim(28), w = s.industry, p = w.pieces[0], h = w.hammers[0];
  advance(s, 1);
  assert.equal(w.heldPiece, p);
  s.length = s.targetLength = 7.2;
  s.engine.y = s.cabin.y + 8.12;
  const top = point(s.engine, 0, -.32), bottom = point(s.cabin, 0, .60);
  s.nodes.forEach((b, i) => { const t = (i + 1) / 24; b.x = top.x + (bottom.x - top.x) * t; b.y = top.y + (bottom.y - top.y) * t; });
  const rest = s.bodies.map(b => ({x: b.x, y: b.y, a: b.a})), restCabin = {...s.cabin};
  const original = structuredClone(pieceOutline(p));
  for (let stroke = 0; stroke < 3; stroke++) {
    s.bodies.forEach((b, i) => Object.assign(b, {
      x: rest[i].x - restCabin.x + h.x - .12, y: rest[i].y - restCabin.y + h.y + 2.1,
      vx: 0, vy: 0, w: 0, a: rest[i].a, contacts: []
    }));
    s.time = h.period * (stroke + .56);
    h.collider.y = hammerPose(h, s.time).bottom;
    for (let i = 0; i < 180 && p.forge === stroke && !s.failed; i++) s.step({});
    assert.equal(p.forge, stroke + 1);
    assert.deepEqual(p.colliders, pieceSamples(p));
    assert.ok(Math.hypot(p.vx, p.vy) < 3 && Math.abs(p.w) < 3, 'plastic impact must not launch the metal');
    const forged = structuredClone(p.sections);
    w.forge(s); w.forge(s);
    assert.equal(p.forge, stroke + 1);
    assert.deepEqual(p.sections, forged);
    assert.equal(s.hull, 100, 'forging the metal must not damage a clear drone');
    assert.ok(h.rebound);
  }
  assert.notDeepEqual(pieceOutline(p), original);
  const permanent = structuredClone(p.sections);
  w.beforeStep(s, {action: true}, DT);
  assert.deepEqual(p.sections, permanent);
});

test('a loose ingot on the anvil receives three real blows, deforms and remains collectible', () => {
  const s = new Sim(28), w = s.industry, p = w.pieces[0], h = w.hammers[0];
  Object.assign(p, {x: h.x + 1.65, y: h.y + .36});
  const original = structuredClone(p.sections), hits = [];
  assert.match(w.order(s).title, /loose workpiece/);
  for (let i = 0; i < h.period * 3 / DT; i++) {
    const previous = p.forge;
    s.step({action: true});
    assert.equal(w.heldPiece, null);
    if (p.forge > previous) {
      hits.push(s.time);
      assert.ok(Math.hypot(p.vx, p.vy) < 2 && Math.abs(p.w) < 2, 'plastic impact should leave loose metal recoverable');
    }
  }
  assert.equal(p.forge, 3);
  assert.equal(hits.length, 3);
  assert.ok(hits[1] - hits[0] > h.period * .8 && hits[2] - hits[1] > h.period * .8);
  assert.notDeepEqual(p.sections, original);
  assert.deepEqual(p.colliders, pieceSamples(p));
  assert.ok(meetsOrder(p, w.config.requires));
  const above = worldPoint(p, p.sections[1].x, p.sections[1].hi + .20);
  Object.assign(s.cabin, {...above, a: p.a, vx: p.vx, vy: p.vy, w: 0});
  w.action = false; w.pullPieces(s, DT);
  assert.equal(w.heldPiece, p, 'the forged loose ingot can be picked up again');
  assert.equal(p.forge, 3);
  assert.equal(s.hull, 100);
});

test('changing between held and loose during a stroke cannot count the same blow twice', () => {
  const s = new Sim(28), w = s.industry, p = w.pieces[0], h = w.hammers[0];
  Object.assign(p, {x: h.x + 1.65, y: h.y + .36});
  while (!p.forge && s.time < h.period) s.step({action: true});
  assert.equal(p.forge, 1);
  const shape = structuredClone(p.sections);
  const contact = {lx: .8, ly: .32, nx: 0, ny: -1, incoming: 8};
  p.attached = true; w.heldPiece = p;
  w.strike(s, p, 0, contact, 0);
  p.attached = false; w.heldPiece = null;
  w.strike(s, p, 0, contact, 0);
  assert.equal(p.forge, 1);
  assert.deepEqual(p.sections, shape);
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

test('an upright ladle docks after complete turns, while a genuinely tilted ladle is rejected', () => {
  for (const id of [34, 35]) for (const angle of [0, 2 * Math.PI, -4 * Math.PI, 2 * Math.PI + .5]) {
    const s = new Sim(id), w = s.industry, r = w.config.rack;
    for (const mold of w.molds) { mold.fill = mold.capacity; mold.ready = true; }
    Object.assign(s.cabin, {x: r.x, y: r.y + .565, a: angle, vx: 0, vy: 0, w: 0});
    for (let i = 0; i < 180; i++) w.afterStep(s, DT);
    assert.equal(w.tool, angle === 2 * Math.PI + .5 ? 'ladle' : 'hook');
  }
});

test('hammer motion repeats without mutating its anvil height or phase offset', () => {
  const s = new Sim(29), before = structuredClone(s.level.industry.hammers);
  for (const config of before) for (const t of [0, .3, 2, 7, 80]) {
    const a = hammerPose(config, t), b = hammerPose(config, t + config.period);
    assert.ok(Math.abs(a.bottom - b.bottom) < 1e-10);
    assert.ok(a.bottom >= config.y + .18 - 1e-9 && a.bottom <= config.y + 6.63 + 1e-9);
  }
  advance(s, 3);
  assert.deepEqual(s.level.industry.hammers, before);
  s.industry.hammers.forEach((h, i) => {
    assert.equal(h.y, before[i].y); assert.equal(h.phase, before[i].phase);
    assert.ok(h.collider.y >= h.y + .18 && h.collider.y <= h.y + 6.63);
  });
  assert.equal(s.industry.pieces[0].forge, 0, 'cycling a press does not forge a distant blank');
});

test('hammer damage uses ordinary relative impact speed and cooldown', () => {
  const s = new Sim(28), h = s.industry.hammers[0];
  s.time = h.period * .53;
  h.collider.y = hammerPose(h, s.time).bottom;
  const dx = h.collider.x + 1 - s.engine.x, dy = h.collider.y - .15 - s.engine.y;
  for (const body of s.bodies) { body.x += dx; body.y += dy; }
  s.step({action: true});
  assert.ok(s.engine.impact > 7, 'moving surface contributes its closing speed');
  assert.equal(s.hull, Math.max(0, 100 - (s.engine.impact - 2.6) * 9));
  assert.ok(s.hull > 0 && s.hull < 100, 'one moderate strike is survivable');
  assert.equal(s.failed, false);
  assert.equal(s.industry.pieces[0].forge, 0, 'hitting an empty rig cannot forge a workpiece');
  const hull = s.hull;
  s.step({action: true});
  assert.equal(s.hull, hull, 'continued contact respects the ordinary hit cooldown');
});

test('slow touches, upstrokes and the wrong press cannot substitute for a good forging hit', () => {
  for (const [index, velocity] of [[0, 0], [0, -.5], [0, 4], [1, -8]]) {
    const s = new Sim(29), w = s.industry, p = w.pieces[0], h = w.hammers[index];
    w.heldPiece = p; p.attached = true; w.updateMass(s);
    Object.assign(h.collider, {y: 3.5, vy: velocity});
    Object.assign(p, {x: h.x + .1, y: 3.2, a: 0, vx: 0, vy: 0, w: 0, contacts: []});
    s.collideBody(p, true);
    assert.ok(p.contacts.some(c => s.terrain[c.terrain] === h.collider));
    w.forge(s);
    assert.equal(p.forge, 0);
  }
});

test('lathe and belt need workpiece contacts; proximity cannot advance either process', () => {
  for (const [id, machine, property] of [[30, 'lathe', 'cut'], [31, 'belt', 'polish']]) {
    const s = new Sim(id), w = s.industry, piece = w.pieces[0];
    w.heldPiece = piece; piece.attached = true;
    const t = s.terrain.find(t => t.machine === machine);
    Object.assign(piece, {x: t.x - 2, y: t.y + 3, a: 0, contacts: []});
    w.afterStep(s, DT);
    assert.equal(piece[property], 0);
    Object.assign(piece, machine === 'lathe' ? {x: t.x, y: t.y + t.r + .25} : {x: t.x - .8, y: t.y + 1});
    s.collideBody(piece, true);
    assert.ok(piece.contacts.some(c => s.terrain[c.terrain] === t));
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
  const context = new Proxy({createLinearGradient: () => ({addColorStop() {}}), measureText: text => ({width: text.length * 6})}, {get: (o, k) => k in o ? o[k] : () => {}});
  const renderer = createRenderer({getContext: () => context}); renderer.resize(390, 520);
  for (const id of [24, 26, 28, 31, 35]) {
    const s = new Sim(id); advance(s, .3);
    const before = JSON.stringify(s.snapshot());
    renderer.render(s, {clock: 200, alpha: .5, panel: true});
    renderer.render(s, {clock: 400, alpha: .5, panel: true, map: true});
    assert.equal(JSON.stringify(s.snapshot()), before);
  }
});
