import test from 'node:test';
import assert from 'node:assert/strict';
import { circleGuide } from '#game/cable-guides';
import { Sim, Body } from '#game/physics';
import { levels, routeNumber } from '#game/levels';
import { parseSaved } from '#game/storage';
import { createRenderer } from '#game/render/renderer';

test('round guide contact has radial normals, finite centre recovery, and no far-away collisions', () => {
  const g = {x: 10, y: 5, r: .8};
  for (const [nx, ny] of [[1, 0], [-1, 0], [0, 1], [0, -1], [.6, .8]]) {
    const c = circleGuide(g.x + nx * .85, g.y + ny * .85, .1, g);
    assert.ok(Math.abs(c.nx - nx) < 1e-10 && Math.abs(c.ny - ny) < 1e-10);
    assert.ok(Math.abs(c.depth - .05) < 1e-10);
  }
  assert.deepEqual(circleGuide(10, 5, .1, g), {nx: 0, ny: 1, depth: .9});
  assert.equal(circleGuide(11, 5, .1, g), null);
  assert.equal(circleGuide(10.8, 5.8, .1, g), null);
});

test('guide collisions redirect cable nodes and link midpoints outside the rim', () => {
  const s = new Sim(14), g = s.guides[0], node = s.nodes[5];
  Object.assign(node, {x: g.x - g.r, y: g.y});
  s.collideBody(node, true);
  assert.ok(node.x <= g.x - g.r - .043 + 1e-9);
  assert.equal(s.guideContacts[0], true);
  assert.equal(s.guideVisits[0], true);
  const a = s.nodes[8], b = s.nodes[9];
  Object.assign(a, {x: g.x - .09, y: g.y + g.r});
  Object.assign(b, {x: g.x + .09, y: g.y + g.r});
  s.collideCable(9);
  assert.ok((a.y + b.y) / 2 >= g.y + g.r + .03 - 1e-9);
});

test('engine and cabin also hit guides; a body hit alone does not claim cable contact', () => {
  for (const kind of ['engine', 'cabin']) {
    const s = new Sim(14), g = s.guides[0];
    const body = new Body(g.x, g.y + g.r + .2, 3, .7, kind);
    body.vy = -4;
    s.collideBody(body, true);
    assert.ok(body.contacts.length > 0);
    assert.ok(body.y > g.y + g.r + .2);
    assert.ok(body.impact > 3);
    assert.equal(s.guideContacts[0], false);
  }
});

test('contact clears after release; a restart clears visits without changing route data', () => {
  const before = JSON.stringify(levels), s = new Sim(14), other = new Sim(14);
  const probe = new Body(s.guides[0].x, s.guides[0].y, .075);
  s.collideBody(probe, true);
  s.step();
  assert.equal(s.guideContacts[0], false);
  assert.equal(s.guideVisits[0], true);
  assert.equal(other.guideVisits[0], false);
  assert.deepEqual(new Sim(14).guides, other.guides);
  assert.equal(JSON.stringify(levels), before);
});

test('guide artwork uses the collision centres and radii without changing the simulation', () => {
  const circles = [];
  const context = new Proxy({
    arc(x, y, r) { circles.push({x, y, r}); },
    measureText: text => ({width: text.length * 6}),
  }, {get: (target, key) => key in target ? target[key] : () => {}});
  for (let i = 14; i < levels.length; i++) {
    const s = new Sim(i), before = JSON.stringify(s);
    const renderer = createRenderer({getContext: () => context});
    for (const map of [false, true]) {
      renderer.resize(390, 520);
      circles.length = 0;
      renderer.render(s, {map, alpha: .5, panel: true});
      for (const {x, y, r} of s.guides)
        assert.ok(circles.some(c => c.x === x && c.y === y && c.r === r));
      assert.equal(JSON.stringify(s), before);
    }
  }
});

test('On the move IDs and ghosts keep their meaning when guide routes are appended', () => {
  assert.deepEqual(levels.slice(8, 14).map(l => l.name), [
    'The stop is leaving', 'Third floor, occasionally', 'Mind the moving gap',
    'Connections are approximate', 'Catch the next lift', 'Last boat, first train'
  ]);
  assert.equal(routeNumber(14), 0);
  assert.equal(levels[14].name, 'A little guidance');
  const saved = {last: 13, sound: false, ghost: true,
    best: {13: {time: 90, hull: 100, ghost: [Array(16).fill(123)]}}};
  assert.deepEqual(parseSaved(JSON.stringify(saved), levels.length), saved);
});
