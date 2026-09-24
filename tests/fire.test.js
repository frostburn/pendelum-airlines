import test from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '#game/physics';
import { DT } from '#game/constants';
import { WATER, sweepWater } from '#game/fire/water';
import { createRenderer } from '#game/render/renderer';
import { panelMarkup } from '#game/ui/panels';
import { steer } from '../scripts/flight-controls.js';

const advance = (s, seconds, input = {}) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) s.step(input);
};

test('a hose jet spends finite water and has equal opposite linear and angular recoil', () => {
  for (const facing of [-1, 1]) {
    const s = new Sim(48), w = s.industry, c = s.cabin;
    w.facing = facing;
    const mass = c.m;
    w.beforeStep(s, {action: true}, 1 / WATER.rate + 1e-6);
    const p = w.water.drops[0];
    assert.equal(w.tank, WATER.tank - 1);
    assert.ok(Math.abs(c.m - mass + WATER.mass) < 1e-10);
    assert.ok(Math.abs(c.m * c.vx + WATER.mass * p.vx) < 1e-10);
    assert.ok(Math.abs(c.m * c.vy + WATER.mass * p.vy) < 1e-10);
    assert.ok(Math.abs(c.I * c.w + WATER.mass * ((p.x - c.x) * p.vy - (p.y - c.y) * p.vx)) < 1e-10);
    assert.ok(c.vx * facing < 0);
  }
});

test('full particle capacity cannot consume tank or header water without emitting it', () => {
  const s = new Sim(59), w = s.industry;
  for (let i = 0; i < WATER.limit + 20; i++) w.water.emit(10, 10, 0, 0);
  assert.equal(w.water.drops.length, WATER.limit);
  w.beforeStep(s, {action: true}, .1);
  assert.equal(w.tank, WATER.tank);
  w.headers[0].fill = 12;
  w.afterStep(s, .1);
  assert.equal(w.headers[0].fill, 12);
  assert.equal(w.headers[0].emitted, 0);
});

test('a translating and spinning hose balances the nozzle momentum on every shot', () => {
  for (const facing of [-1, 1]) for (const spin of [-1.7, 1.7]) {
    const s = new Sim(48), w = s.industry, c = s.cabin;
    w.facing = facing;
    Object.assign(c, {vx: 4, vy: -2, w: spin, a: .45});
    for (let shot = 0; shot < 12; shot++) {
      const before = {vx: c.vx, vy: c.vy, px: c.m * c.vx, py: c.m * c.vy, angular: c.I * c.w};
      w.beforeStep(s, {action: true}, 1 / WATER.rate + 1e-6);
      const p = w.water.drops.at(-1);
      assert.ok(Math.abs(c.m * c.vx + WATER.mass * p.vx - before.px) < 1e-10);
      assert.ok(Math.abs(c.m * c.vy + WATER.mass * p.vy - before.py) < 1e-10);
      // Intrinsic angular momentum in the tank's pre-emission moving frame.
      const carried = WATER.mass * ((p.x - c.x) * (p.vy - before.vy) - (p.y - c.y) * (p.vx - before.vx));
      assert.ok(Math.abs(c.I * c.w + carried - before.angular) < 1e-10);
    }
  }
});

test('thin walls stop fast water and sheltered fires need an open line of entry', () => {
  assert.deepEqual(sweepWater(0, 1, 10, 1, .1, {x: 4, y: 0, w: .05, h: 2}), {t: .39, nx: -1, ny: -0});
  const s = new Sim(49), w = s.industry, f = w.fires[0];
  w.water.emit(f.x + .9, 6, 0, -200);
  w.water.step(s, w, 1 / 120);
  assert.equal(f.heat, 1, 'the roof intercepts a descending jet');
  assert.ok(w.water.drops[0].y > 5.7);
  w.water.drops.length = 0;
  w.water.emit(24, 2.6, 180, 0);
  w.water.step(s, w, 1 / 120);
  assert.ok(f.heat < 1, 'a side jet through the opening reaches the stock');
  assert.equal(w.water.metrics.hits, 1);
});

test('a header accepts only water crossing its open top and conserves its supply', () => {
  const s = new Sim(56), w = s.industry, h = w.headers[0];
  w.water.emit(h.x, h.y + .2, 0, -30);
  w.water.step(s, w, 1 / 120);
  assert.equal(h.fill, 1); assert.equal(h.received, 1);
  w.water.emit(h.x - h.w, h.y - .3, 300, 0);
  w.water.step(s, w, 1 / 120);
  assert.equal(h.received, 1, 'water hitting the solid side cannot feed the pipe');
  for (let i = 0; i < 120; i++) w.afterStep(s, 1 / 120);
  assert.equal(h.fill + h.emitted, h.received);
  assert.equal(h.emitted, 1, 'empty sprinklers cannot invent water');
  assert.ok(w.fires[0].heat < 1 || w.fires[1].heat < 1);
});

test('water transfers momentum to a freely rotating burning crate', () => {
  const s = new Sim(54), w = s.industry, p = w.pieces[0];
  w.water.emit(p.x - 1.2, p.y + .2, 50, 0);
  w.water.step(s, w, 1 / 120);
  assert.ok(p.vx > 0); assert.ok(p.w < 0);
  assert.ok(w.fires[0].heat < 1);
  assert.equal(p.attached, false);
  assert.equal(w.water.drops.length, 0);
});

test('water running off cooled cargo does not transfer its tangential momentum twice', () => {
  const s = new Sim(54), w = s.industry, p = w.pieces[0];
  w.fires[0].heat = 0; w.fires[0].wet = 1;
  w.water.emit(p.x - 1.2, p.y, 50, 4);
  w.water.step(s, w, 1 / 120);
  assert.equal(w.water.drops.length, 1);
  assert.equal(p.vy, 0, 'a side contact only transfers the normal impulse');
  assert.ok(p.vx > 0);
  const drop = w.water.drops[0];
  const after = p.m * (p.vx ** 2 + p.vy ** 2) + p.I * p.w ** 2 + WATER.mass * (drop.vx ** 2 + drop.vy ** 2);
  assert.ok(after <= WATER.mass * (50 ** 2 + 4 ** 2), 'passive contact must dissipate energy');
});

test('a header cannot siphon water through a closed bucket wall', () => {
  const s = new Sim(56), w = s.industry, h = w.headers[0];
  Object.assign(s.cabin, {x: h.x, y: h.y + .2, a: 0});
  w.water.emit(h.x, h.y + .05, 0, -12, 'bucket');
  w.water.step(s, w, 1 / 120);
  assert.equal(h.received, 0);
  assert.equal(w.water.contained(s.cabin).length, 1);
});

test('bucket scooping requires an immersed upright vessel and leaves water free to spill', () => {
  const s = new Sim(51), w = s.industry, c = s.cabin;
  Object.assign(c, {x: 8, y: 3, a: 0});
  for (let i = 0; i < 240; i++) w.water.step(s, w, 1 / 120);
  assert.equal(w.water.metrics.scooped, 0);
  c.y = 1.4;
  for (let i = 0; i < 240; i++) { c.vx = c.vy = c.w = 0; w.water.step(s, w, 1 / 120); }
  assert.equal(w.water.contained(c).length, WATER.bucket);
  assert.equal(c.m, 3, 'liquid weight is carried through contact, not counted twice');
  for (let i = 0; i < 960; i++) { c.vx = c.vy = c.w = 0; w.water.step(s, w, 1 / 120); }
  c.a = -2.05;
  w.water.step(s, w, 1 / 120);
  assert.equal(w.water.drops.length, WATER.bucket, 'old bucket water must survive its first airborne frame');
  for (let i = 0; i < 360; i++) { c.vx = c.vy = c.w = 0; w.water.step(s, w, 1 / 120); }
  assert.ok(w.water.metrics.poured > 20);
  assert.ok(w.water.contained(c).length < 5);
});

test('stationary refill shares water momentum and stops while spraying', () => {
  const s = new Sim(48), w = s.industry, c = s.cabin;
  w.tank = 10; w.updateMass(s);
  Object.assign(c, {x: 8, y: 1.5, vx: 2, vy: -1, w: .5});
  const before = [c.m * c.vx, c.m * c.vy, c.I * c.w];
  w.afterStep(s, 1 / 42 + 1e-6);
  assert.equal(w.tank, 11);
  [c.m * c.vx, c.m * c.vy, c.I * c.w].forEach((p, i) => assert.ok(Math.abs(p - before[i]) < 1e-10));
  w.action = true; w.afterStep(s, .5);
  assert.equal(w.tank, 11);
});

test('landing normally on the basin floor fills a bucket and still permits a loaded takeoff', () => {
  const s = new Sim(51), w = s.industry, pool = w.incident.pools[0];
  let stage = 0, settled = 0;
  for (let i = 0; i < 35 / DT && stage < 4; i++) {
    const [x, y] = [[3, 6], [pool.x, 6], [pool.x, pool.bottom + .50], [pool.x, 5]][stage];
    const input = steer(s, x, y); input.y = Math.max(-.28, input.y);
    s.step(input);
    if (stage === 2) {
      if (s.cabin.y < pool.bottom + .57) settled += DT;
      if (settled > 2) {
        assert.equal(w.water.contained(s.cabin).length, WATER.bucket, 'refilling must continue after touching the floor');
        stage++;
      }
    } else if (Math.abs(s.cabin.x - x) < .2 && Math.abs(s.cabin.y - y) < .2 && Math.hypot(s.cabin.vx, s.cabin.vy) < .45) stage++;
  }
  assert.equal(stage, 4, 'the loaded bucket must leave the basin using ordinary flight controls');
  assert.ok(w.water.contained(s.cabin).length >= WATER.bucket - 2);
  assert.equal(s.hull, 100);
});

test('a tilted submerged opening can scoop, but a closed side or an inverted cup cannot', () => {
  const s = new Sim(51), w = s.industry, c = s.cabin;
  for (const pose of [{x: 8, y: 2, a: 0}, {x: 8, y: 1.3, a: Math.PI}, {x: 5.7, y: 1.2, a: .45}]) {
    Object.assign(c, pose);
    w.water.step(s, w, .05);
    assert.equal(w.water.metrics.scooped, 0);
  }
  Object.assign(c, {x: 8, y: 2, a: .55, vx: 1.3, vy: -.8});
  w.water.step(s, w, .05);
  assert.ok(w.water.metrics.scooped > 0, 'ordinary tilt and movement must not disable an immersed opening');
  assert.ok(w.water.drops.every(p => p.y < w.incident.pools[0].y), 'a partial dip cannot create water above the surface');
});

test('dense fuel takes a sustained stream and the finale requires more than one tank', () => {
  const s = new Sim(59), w = s.industry, f = w.fires[3];
  for (let i = 0; i < 8; i++) w.wetFire(f.id);
  assert.ok(f.heat > .6, 'an incidental eight-drop burst must not clear dense stock');
  for (let i = 8; i < f.soak; i++) w.wetFire(f.id);
  assert.ok(f.heat < 1e-10, 'a direct, sustained stream still cools the fuel');
  assert.ok(w.fires.reduce((sum, fire) => sum + fire.soak, 0) > WATER.tank * 2);
});

test('heat spreads to dry neighbours, wet fuel resists it, and all-cold completion waits two seconds', () => {
  const s = new Sim(57), w = s.industry;
  w.fires[1].heat = 0; w.fires[2].heat = 0;
  for (let i = 0; i < 300; i++) w.afterStep(s, .1);
  assert.ok(w.fires[1].heat > .4, 'a dry neighbour must ignite');
  w.fires[1].heat = 0; w.fires[1].wet = 1;
  for (let i = 0; i < 150; i++) w.afterStep(s, .1);
  assert.equal(w.fires[1].heat, 0);
  for (let i = 0; i < 450; i++) w.afterStep(s, .1);
  assert.ok(w.fires[1].heat > .4, 'protection must eventually dry away beside a still-burning stack');
  for (const f of w.fires) { f.heat = 0; f.wet = 1; }
  w.clearTime = 0;
  w.afterStep(s, 1.9); assert.equal(s.done, false);
  w.afterStep(s, .2); assert.equal(s.done, true);
  assert.equal(s.delivered, w.fires.length);
});

test('flip and docked tool swap are press edges, never held-key oscillators', () => {
  const s = new Sim(48), w = s.industry;
  advance(s, .2);
  assert.ok(w.canSwap(s));
  w.beforeStep(s, {swap: true, flip: true}, DT);
  assert.equal(w.tool, 'ladle'); assert.equal(w.facing, -1);
  w.beforeStep(s, {swap: true, flip: true}, DT);
  assert.equal(w.tool, 'ladle'); assert.equal(w.facing, -1);
  w.beforeStep(s, {}, DT);
  s.cabin.x = 18;
  w.beforeStep(s, {swap: true, flip: true}, DT);
  assert.equal(w.tool, 'ladle', 'there is no airborne tool replacement');
  assert.equal(w.facing, 1);
});

test('clearing paused input rearms turn and swap before another physics step', () => {
  const s = new Sim(48), w = s.industry;
  advance(s, .2);
  w.beforeStep(s, {swap: true, flip: true}, DT);
  assert.equal(w.tool, 'ladle'); assert.equal(w.facing, -1);
  // Help/blur can stop simulation before a released input is ever sampled.
  w.clearInput();
  w.beforeStep(s, {swap: true, flip: true}, DT);
  assert.equal(w.tool, 'hose'); assert.equal(w.facing, 1);
  w.beforeStep(s, {action: true}, .1);
  w.clearInput();
  assert.equal(w.action, false); assert.equal(w.emitter, 0);
});

test('fire routes restart deterministically and drawing cannot change water, heat or clocks', () => {
  const noop = () => {};
  const ctx = new Proxy({measureText: text => ({width: text.length * 6}), createLinearGradient: () => ({addColorStop: noop})},
    {get: (target, key) => key in target ? target[key] : noop});
  const renderer = createRenderer({getContext: () => ctx}, {reduced: true});
  renderer.resize(390, 550);
  for (let id = 48; id < 60; id++) {
    const a = new Sim(id), b = new Sim(id);
    advance(a, .2, {action: true}); advance(b, .2, {action: true});
    assert.deepEqual(a.snapshot(), b.snapshot());
    const before = structuredClone(a.snapshot());
    renderer.reset(a); renderer.render(a, {alpha: 1, clock: 3}); renderer.render(a, {alpha: 1, clock: 9});
    assert.deepEqual(a.snapshot(), before);
    assert.match(panelMarkup('intro', {sim: a}), /I \/ K · L/);
    const view = renderer.view(), e = a.engine;
    assert.ok(Math.abs(e.x - view.camera.x) < view.width / view.camera.scale / 2);
  }
});

test('a phone camera includes the rig and the whole hose target on level, high and low approaches', () => {
  const noop = () => {};
  const ctx = new Proxy({measureText: text => ({width: text.length * 6}), createLinearGradient: () => ({addColorStop: noop})},
    {get: (target, key) => key in target ? target[key] : noop});
  const renderer = createRenderer({getContext: () => ctx}, {reduced: true});
  renderer.resize(390, 550);
  for (const [id, gap] of [[49, .9], [49, 5.9], [53, -3.4]]) {
    const s = new Sim(id), f = s.industry.fires[0];
    const dx = f.x - 3 - s.cabin.x, dy = f.y + f.h + gap - s.cabin.y;
    for (const b of s.bodies) { b.x += dx; b.ox = b.x; b.y += dy; b.oy = b.y; }
    renderer.reset(s); renderer.render(s, {alpha: 1});
    const {camera} = renderer.view();
    const stock = id === 49 ? s.industry.fires : [f];
    for (const b of [s.engine, s.cabin, ...stock.flatMap(f => [{x: f.x, y: f.y}, {x: f.x + f.w, y: f.y + f.h}])]) {
      assert.ok(Math.abs(b.x - camera.x) < 390 / camera.scale / 2 - .4, `horizontal approach ${gap}`);
      assert.ok(Math.abs(b.y - camera.y) < 550 / camera.scale / 2 - .4, `vertical approach ${gap}`);
    }
  }
});
