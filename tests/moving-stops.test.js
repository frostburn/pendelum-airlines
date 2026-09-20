import test from 'node:test';
import assert from 'node:assert/strict';
import { stopAt, deckAt } from '#game/moving-stops';
import { Sim } from '#game/physics';
import { DT } from '#game/constants';
import { levels, nextRoute, routeNumber, serviceRoutes } from '#game/levels';
import { parseSaved } from '#game/storage';
import { panelMarkup } from '#game/ui/panels';
import { createRenderer } from '#game/render/renderer';

test('moving-stop velocity is the derivative of its repeating path', () => {
  const p = {x: 12, y: 6, motion: {dx: 4, dy: 3, period: 20, phase: .17}};
  for (const time of [0, 3.7, 8.2, 15, 20, 80]) {
    const a = stopAt(p, time), before = stopAt(p, time - 1e-5), after = stopAt(p, time + 1e-5);
    const next = stopAt(p, time + p.motion.period);
    for (const axis of ['x', 'y']) {
      assert.ok(Math.abs((after[axis] - before[axis]) / 2e-5 - a['v' + axis]) < 1e-7);
      assert.ok(Math.abs(next[axis] - a[axis]) < 1e-12);
    }
  }
});

test('matched moving-deck velocity permits boarding above the world speed limit', () => {
  const s = new Sim(8), p = s.pads[1];
  assert.ok(Math.abs(p.vx) > .68);
  Object.assign(s.cabin, {x: p.x, y: p.y + .565, vx: p.vx, vy: p.vy, a: 0, w: 0});
  for (let i = 0; i < 160; i++) s.serviceStop();
  assert.equal(s.jobs[0].state, 'aboard');
  assert.equal(s.stats.pickups, 1);
  assert.equal(s.cabin.m, 3.55);
});

test('world-stationary cabin cannot board a passing deck', () => {
  const s = new Sim(8), p = s.pads[1];
  Object.assign(s.cabin, {x: p.x, y: p.y + .565, vx: 0, vy: 0, a: 0, w: 0});
  for (let i = 0; i < 160; i++) s.serviceStop();
  assert.equal(s.jobs[0].state, 'waiting');
  assert.equal(s.service, 0);
});

test('vertical boarding and interrupted approaches use relative velocity', () => {
  const s = new Sim(9);
  s.time = 5;
  s.updateStops();
  const p = s.pads[1];
  assert.ok(p.vy > .68);
  Object.assign(s.cabin, {x: p.x, y: p.y + .565, vx: 0, vy: p.vy, a: 0, w: 0});
  for (let i = 0; i < 100; i++) s.serviceStop();
  assert.ok(s.service > .4);
  s.cabin.vy = 0;
  s.serviceStop();
  assert.equal(s.service, 0);
  s.cabin.vy = p.vy;
  for (let i = 0; i < 140; i++) s.serviceStop();
  assert.equal(s.jobs[0].state, 'aboard');
});

test('impact speed measures motion into a rising deck', () => {
  const s = new Sim(9), p = s.pads[1], deck = s.platforms[0];
  deck.vy = 4;
  for (const [vy, impact] of [[4, 0], [0, 4]]) {
    Object.assign(s.cabin, {x: p.x, y: p.y + .56, a: 0, w: 0, vx: 0, vy, impact: 0, contacts: []});
    s.collideBody(s.cabin, true);
    assert.equal(s.cabin.impact, impact);
    assert.ok(s.cabin.contacts.some(c => c.surfaceVY === 4));
  }
});

test('a cabin already riding a ferry stays aboard through physical steps', () => {
  const s = new Sim(8), p = s.pads[1];
  const dx = p.x - s.cabin.x, dy = p.y + .565 - s.cabin.y;
  for (const b of s.bodies) {
    b.x += dx; b.ox += dx; b.y += dy; b.oy += dy;
    b.vx = p.vx;
  }
  for (let i = 0; i < 240; i++) s.step({x: s.pads[1].vx / 5});
  assert.equal(s.failed, false);
  assert.equal(s.hull, 100);
  assert.equal(s.jobs[0].state, 'aboard');
  assert.ok(Math.abs(s.cabin.x - s.pads[1].x) < .3);
});

test('decks collide with cable particles and midpoints as well as the cabin', () => {
  const s = new Sim(8), p = s.pads[1], node = s.nodes[5];
  Object.assign(node, {x: p.x, y: p.y + .01});
  s.collideBody(node, true);
  assert.ok(node.y >= p.y + .043 - 1e-9);
  const a = s.nodes[8], b = s.nodes[9];
  Object.assign(a, {x: p.x - .08, y: p.y + .01});
  Object.assign(b, {x: p.x + .08, y: p.y + .01});
  s.collideCable(9);
  assert.ok((a.y + b.y) / 2 >= p.y + .03 - 1e-9);
});

test('simulations own their platform poses and reset to the same schedule', () => {
  const before = JSON.stringify(levels), s = new Sim(11), other = new Sim(11);
  for (let i = 0; i < 240; i++) s.step({y: .2});
  assert.notDeepEqual(s.pads, other.pads);
  assert.deepEqual(new Sim(11).pads, other.pads);
  assert.equal(JSON.stringify(levels), before);
  for (const deck of s.platforms) {
    const p = s.pads[deck.pad];
    assert.equal(deck.vx, p.vx);
    assert.ok(Math.abs(deck.y + deck.h - p.y) < 1e-12);
  }
});

test('moving decks draw at interpolation time and stay frozen while paused', () => {
  const draws = [];
  const context = new Proxy({
    fillRect(x, y, w, h) { draws.push({x, y, w, h}); },
    measureText: text => ({width: text.length * 6}),
  }, {get: (target, key) => key in target ? target[key] : () => {}});
  for (let index = 8; index < levels.length; index++) {
    const s = new Sim(index), renderer = createRenderer({getContext: () => context});
    renderer.resize(390, 520);
    for (let i = 0; i < 5; i++) s.step();
    const before = JSON.stringify(s);
    for (const alpha of [0, .5, 1]) {
      for (const clock of [5, 500]) {
        draws.length = 0;
        renderer.render(s, {map: true, panel: true, alpha, clock});
        for (const p of s.level.pads.filter(p => p.motion)) {
          const expected = deckAt(stopAt(p, s.time - (1 - alpha) * DT));
          assert.ok(draws.some(d => ['x','y','w','h'].every(k => d[k] === expected[k])));
        }
        assert.ok(draws.every(d => Object.values(d).every(Number.isFinite)));
        assert.equal(JSON.stringify(s), before);
      }
    }
  }
});

test('legacy route IDs and saved ghosts survive the expansion', () => {
  assert.deepEqual(levels.slice(0, 8).map(l => l.name), [
    'First fare', 'We don’t stop at the roof', 'The chimney run', 'Basement service',
    'Two tickets, please', 'Crosswind connection', 'The last collection', 'Sunday service'
  ]);
  const saved = {last: 7, sound: true, ghost: true,
    best: {6: {time: 80, hull: 95, ghost: [Array(16).fill(123)]}}};
  assert.deepEqual(parseSaved(JSON.stringify(saved), levels.length), saved);
  assert.equal(nextRoute(6), 8);
  assert.equal(routeNumber(8), 8);
  assert.equal(nextRoute(13), 16);
  assert.equal(nextRoute(23), 24);
  assert.equal(serviceRoutes.length, 35);
  const markup = panelMarkup('routes', {sim: new Sim(8), saved});
  assert.equal((markup.match(/data-route=/g) || []).length, 12);
  assert.match(markup, /data-route="7"/);
  assert.match(panelMarkup('result', {sim: new Sim(6), saved}), /data-action="next"/);
  assert.doesNotMatch(panelMarkup('result', {sim: new Sim(35), saved}), /data-action="next"/);
});
