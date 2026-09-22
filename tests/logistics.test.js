import test from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '#game/physics';
import { DT } from '#game/constants';
import { createRenderer } from '#game/render/renderer';

function advance(s, seconds, until = () => false) {
  for (let i = 0; i < seconds / DT && !s.failed && !s.done && !until(); i++) s.step({action: true});
  assert.equal(s.failed, false, s.reason);
}
function onDeck(p, w) { Object.assign(p, {x: w.x, y: w.y + .43, a: 0, vx: 0, vy: 0, w: 0, attached: false, contacts: []}); }

test('clerks require released, supported cargo, not an attached parcel or a fly-by', () => {
  const s = new Sim(36), d = s.industry, w = d.workers[0], p = d.pieces[0];
  Object.assign(p, {x: w.x, y: w.y + 2});
  d.afterStep(s, 5);
  assert.deepEqual(p.receipts, {});
  onDeck(p, w); advance(s, 1);
  p.attached = true; d.afterStep(s, 5); p.attached = false;
  assert.deepEqual(p.receipts, {});
  advance(s, 4);
  assert.deepEqual(p.receipts, {scan: true});
  advance(s, 4); assert.deepEqual(w.completed, ['A1'], 'one receipt per parcel');
});

test('Yard Dog noses under low cargo without snapping it or accepting an attached load', () => {
  const s = new Sim(37), d = s.industry, w = d.workers[0], p = d.pieces[0];
  Object.assign(p, {x: w.x + 2, y: w.y + 1.6, attached: true});
  for (let i = 0; i < 240; i++) { d.beforeStep(s, {}, DT); d.afterStep(s, DT); }
  assert.ok(w.x > 15.2 && w.x < p.x);
  assert.equal(p.x, 17); assert.deepEqual(p.receipts, {});
  assert.equal(w.state, 'waiting'); assert.match(w.message, /LET ME/);
});

test('forklift lifts and transports a free body before issuing its receipt', () => {
  const s = new Sim(37), d = s.industry, w = d.workers[0], p = d.pieces[0];
  onDeck(p, w); advance(s, 4);
  assert.ok(w.state === 'lifting'); assert.deepEqual(p.receipts, {});
  advance(s, 35, () => p.receipts.store);
  assert.equal(p.receipts.store, true);
  assert.ok(Math.abs(p.x - 25) < .6 && p.y > 4.8);
  assert.equal(p.attached, false); assert.equal(p.grip, undefined);
  assert.deepEqual(w.completed, ['A2']);
});

test('removing a load during transport cancels credit and sends the worker home', () => {
  const s = new Sim(39), d = s.industry, w = d.workers[0], p = d.pieces[0];
  onDeck(p, w); advance(s, 6);
  assert.equal(w.state, 'carrying');
  p.x -= 8;
  advance(s, 2); assert.deepEqual(p.receipts, {});
  advance(s, 30, () => w.state === 'waiting');
  assert.equal(w.state, 'waiting'); assert.ok(Math.abs(w.x - 15) < .01);
});

test('staff reject the wrong route and priority queue without deleting cargo', () => {
  const s = new Sim(44), d = s.industry, w = d.workers[0], [express, economy] = d.pieces;
  onDeck(economy, w); advance(s, 5);
  assert.equal(w.state, 'waiting'); assert.match(w.message, /CHECK/); assert.deepEqual(economy.receipts, {});
  economy.x = 8; onDeck(express, w); advance(s, 35, () => express.receipts.haul);
  assert.equal(express.receipts.haul, true); assert.equal(d.pieces.length, 2);
  assert.equal(d.ready(w, economy), true);
  const returns = new Sim(40), clerk = returns.industry.workers[1];
  assert.equal(returns.industry.ready(clerk, returns.industry.pieces[0]), false, 'return label needs the inventory handoff');
});

test('a clerk on break resumes work on the parcel left on the counter', () => {
  const s = new Sim(43), d = s.industry, w = d.workers[1], p = d.pieces[0];
  p.receipts.haul = true; onDeck(p, w);
  advance(s, 6); assert.equal(p.receipts.sign, undefined); assert.match(w.message, /BREAK/);
  advance(s, 7); assert.equal(p.receipts.sign, true);
});

test('dispatch needs every receipt and the correct address, with separate parcel progress', () => {
  const s = new Sim(38), d = s.industry, p = d.pieces[0], wrong = d.manifest.outputs[1], right = d.manifest.outputs[0];
  onDeck(p, right); advance(s, 2); assert.equal(s.delivered, 0);
  p.receipts.red = true; onDeck(p, wrong); advance(s, 2); assert.equal(s.delivered, 0);
  onDeck(p, right); advance(s, 2); assert.equal(s.delivered, 1); assert.equal(s.done, false);
  assert.equal(s.jobs[0].state, 'delivered'); assert.equal(s.jobs[1].state, 'waiting');
});

test('all logistics routes are bounded, deterministic and render without advancing NPCs', () => {
  const ctx = new Proxy({createLinearGradient: () => ({addColorStop() {}}), measureText: () => ({width: 1})},
    {get: (t, k) => t[k] ?? (() => {})});
  const renderer = createRenderer({getContext: () => ctx}); renderer.resize(800, 550);
  for (let id = 36; id < 48; id++) {
    const s = new Sim(id), other = new Sim(id);
    advance(s, .2); advance(other, .2);
    assert.deepEqual(s.industry.snapshot(), other.industry.snapshot());
    assert.ok(s.industry.pieces.length <= 2 && s.industry.workers.length <= 3);
    const before = structuredClone(s.industry.snapshot());
    renderer.render(s, {alpha: 1, panel: true}); renderer.render(s, {alpha: .5, map: true});
    assert.deepEqual(s.industry.snapshot(), before);
  }
});

test('a narrow handoff view contains the drone and the nearby route tug', () => {
  const ctx = new Proxy({measureText: () => ({width: 1})}, {get: (t, k) => t[k] ?? (() => {})});
  const renderer = createRenderer({getContext: () => ctx}, {reduced: true});
  const s = new Sim(39), w = s.industry.workers[0];
  Object.assign(s.engine, {x: 31, y: 13.5}); Object.assign(s.cabin, {x: 31, y: 9});
  w.x = 23; w.cargo = s.industry.pieces[0]; w.state = 'carrying';
  renderer.resize(390, 550); renderer.render(s, {alpha: 1});
  const {camera} = renderer.view();
  for (const [x, y] of [[31, 13.5], [31, 9], [20.8, .1], [26.5, 1.9]]) {
    const sx = (x - camera.x) * camera.scale + 195, sy = 275 - (y - camera.y) * camera.scale;
    assert.ok(sx > 0 && sx < 390 && sy > 0 && sy < 550, `handoff clipped at ${sx}, ${sy}`);
  }
});
