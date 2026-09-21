import test from 'node:test';
import assert from 'node:assert/strict';
import { Sim, Body, point } from '#game/physics';
import { DT } from '#game/constants';
import { attract } from '#game/industry/magnet';
import { worldPoint } from '#game/industry/geometry';
import { gripVelocity } from '#game/industry/rigging';
import { foundryBuildings } from '#game/render/foundry';

const energy = bodies => bodies.reduce((sum, b) => sum + (b.m * (b.vx ** 2 + b.vy ** 2) + b.I * b.w ** 2) / 2, 0);
const momentum = bodies => bodies.reduce((p, b) => [p[0] + b.m * b.vx, p[1] + b.m * b.vy,
  p[2] + b.I * b.w + b.m * (b.x * b.vy - b.y * b.vx)], [0, 0, 0]);

test('magnetic attraction has equal opposite reactions and cannot turn repulsive when closing fast', () => {
  for (const speed of [-8, 0, 8]) {
    const a = new Body(1, 3, 2.5, .58), b = new Body(1.4, 2, 3.5, .95);
    b.vy = speed;
    const pa = point(a, .2, -.18), pb = point(b, -.1, .32), before = momentum([a, b]), oldVX = b.vx, oldVY = b.vy;
    attract(pa, pb, 180, 1.25, DT);
    const after = momentum([a, b]);
    after.forEach((v, i) => assert.ok(Math.abs(v - before[i]) < 1e-10, 'both linear and angular momentum must balance'));
    assert.ok((b.vx - oldVX) * (pa.x - pb.x) + (b.vy - oldVY) * (pa.y - pb.y) >= -1e-10);
    if (speed === 0) assert.ok(b.vy > 0 && a.vy < 0, 'both bodies must react');
  }
});

test('capture never snaps a tilted workpiece or creates kinetic energy, including repeated release and pickup', () => {
  for (const angle of [-2.6, -.8, 0, .9, 2.7]) {
    const s = new Sim(28), w = s.industry, p = w.pieces[0], c = s.cabin;
    Object.assign(p, {x: 10, y: 6, a: angle, vx: .8, vy: -.3, w: .2});
    Object.assign(c, {...worldPoint(p, -.2, .52), a: angle, vx: -.2, vy: .4, w: -.5});
    for (let i = 0; i < 30; i++) {
      const pose = [p.x, p.y, p.a, c.x, c.y, c.a], k = energy([p, c]), before = momentum([p, c]);
      w.action = false; w.pullPieces(s, 0);
      assert.equal(w.heldPiece, p);
      assert.deepEqual([p.x, p.y, p.a, c.x, c.y, c.a], pose);
      assert.ok(energy([p, c]) <= k + 1e-9);
      const after = momentum([p, c]);
      assert.ok(Math.abs(after[0] - before[0]) < 1e-10 && Math.abs(after[1] - before[1]) < 1e-10);
      const velocity = [p.vx, p.vy, p.w, c.vx, c.vy, c.w];
      w.beforeStep(s, {action: true}, DT);
      assert.deepEqual([p.vx, p.vy, p.w, c.vx, c.vy, c.w], velocity);
    }
  }
});

test('a magnetic grip shares an impulse without increasing the pair energy', () => {
  const s = new Sim(28), w = s.industry, p = w.pieces[0], c = s.cabin;
  Object.assign(c, {x: p.x, y: p.y + .5});
  w.pullPieces(s, 0); assert.equal(w.heldPiece, p);
  p.vx = 4; p.vy = -2; p.w = 3;
  const k = energy([p, c]), before = momentum([p, c]);
  for (let i = 0; i < 16; i++) gripVelocity(c, p);
  assert.ok(energy([p, c]) < k);
  assert.ok(Math.abs(c.vx) > .1 && Math.abs(c.w) > .1);
  const after = momentum([p, c]);
  after.forEach((v, i) => assert.ok(Math.abs(v - before[i]) < 1e-9));
});

test('unpowered magnet and loose pieces physically push each other, with no teleport impulse', () => {
  const s = new Sim(32), w = s.industry, p = w.pieces[0], c = s.cabin;
  Object.assign(p, {x: 10, y: 5, a: 0, vx: 0, vy: 0, w: 0});
  Object.assign(c, {x: 9.2, y: 5, a: 0, vx: 1, vy: 0, w: 0});
  const before = momentum([p, c]), k = energy([p, c]);
  w.action = true; w.collidePieces(s); w.finishContacts(s);
  assert.ok(p.vx > 0 && c.vx < 1, 'collision transfers momentum even with the magnet off');
  assert.ok(energy([p, c]) <= k + 1e-9);
  const after = momentum([p, c]);
  assert.ok(Math.abs(after[0] - before[0]) < 1e-9);
  assert.equal(w.heldPiece, null);
});

test('interpenetration repair does not launch a loose workpiece from a rack', () => {
  for (const angle of [-1.2, -.4, .4, 1.2]) {
    const s = new Sim(32), p = s.industry.pieces[0];
    p.a = angle; p.y -= .12;
    for (let i = 0; i < 240; i++) {
      s.step({action: true});
      assert.ok(Math.hypot(p.vx, p.vy) < 5 && Math.abs(p.w) < 8);
    }
  }
});

test('stationary overlap with the upper press frame is not a kill zone', () => {
  const s = new Sim(28), h = s.industry.hammers[0];
  const dx = h.x + 1.8 - s.engine.x, dy = 9.16 - s.engine.y;
  for (const b of s.bodies) { b.x += dx; b.y += dy; }
  s.step({action: true});
  assert.equal(s.failed, false); assert.equal(s.hull, 100);
});

test('press frame bumps share the usual harmless, damaging and lethal speed ranges', () => {
  for (const speed of [0, 2, 5, 20]) {
    const s = new Sim(28), h = s.industry.hammers[0];
    const dx = h.x + 1.8 - s.engine.x, dy = 8.85 - s.engine.y;
    for (const b of s.bodies) { b.x += dx; b.y += dy; b.vy = speed; }
    s.step({action: true});
    if (speed <= 2) assert.equal(s.hull, 100);
    if (speed === 5) assert.ok(s.hull > 75 && s.hull < 85);
    assert.equal(s.failed, speed === 20);
  }
});

test('factory silhouettes keep their identities across camera and viewport changes', () => {
  for (const layer of [0, 1]) for (const x of [-100, -.001, 0, .001, 50, 100]) {
    const a = foundryBuildings(x, 390, layer), b = foundryBuildings(x + .001, 1920, layer);
    for (const block of a) {
      const next = b.find(p => p.id === block.id);
      if (!next) continue;
      assert.equal(next.type, block.type); assert.equal(next.height, block.height);
      assert.ok(Math.abs(next.x - block.x + .001 * (layer ? 16 : 7)) < 1e-9);
    }
    assert.ok(b.length < 15, 'drawing stays bounded by viewport width');
  }
});
