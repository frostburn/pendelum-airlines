import test from 'node:test';
import assert from 'node:assert/strict';
import { isBuildingVisible } from '#game/render/viewport';
import { createRenderer } from '#game/render/renderer';
import { Sim } from '#game/physics';

const view = {width: 800, height: 600};
const camera = {x: 10, y: 15, scale: 40};
const visible = rect => isBuildingVisible(rect, camera, view);

test('a tall building stays visible after its base moves far below the screen', () => {
  const chimney = {x: 8, y: 0, w: 3, h: 11.5};
  const oldBaseScreenY = view.height / 2 - (chimney.y - camera.y) * camera.scale;
  assert.ok(oldBaseScreenY > view.height + 200, 'reproduces the original early-cull condition');
  assert.equal(visible(chimney), true);
});
test('a facade spanning both vertical edges stays visible', () => {
  assert.equal(visible({x: 8, y: -50, w: 3, h: 100}), true);
});
test('a building wholly below the viewport is culled', () => {
  assert.equal(visible({x: 8, y: 0, w: 3, h: 5}), false);
});
test('a building wholly above the viewport is culled', () => {
  assert.equal(visible({x: 8, y: 24, w: 3, h: 5}), false);
});
test('horizontal culling rejects only wholly off-screen buildings', () => {
  assert.equal(visible({x: -10, y: 10, w: 5, h: 4}), false);
  assert.equal(visible({x: 21, y: 10, w: 5, h: 4}), false);
  assert.equal(visible({x: -1, y: 10, w: 3, h: 4}), true);
});
test('cornices and roof tiles remain visible at the screen edge', () => {
  assert.equal(visible({x: 8, y: 0, w: 3, h: 7.3}), true);
  assert.equal(visible({x: 8, y: 0, w: 3, h: 7.0}), false);
});
test('culling behaves at phone, desktop and overview scales', () => {
  for (const scale of [12.5, 29, 40, 52]) {
    for (const viewport of [{width: 390, height: 520}, view, {width: 1920, height: 900}]) {
      const cam = {x: 10, y: 15, scale};
      assert.equal(isBuildingVisible({x: 9, y: 0, w: 2, h: 16}, cam, viewport), true);
      assert.equal(isBuildingVisible({x: 200, y: 0, w: 2, h: 16}, cam, viewport), false);
    }
  }
});
test('the real renderer draws the chimney facade while flying high', () => {
  const draws = [];
  const context = new Proxy({
    fillRect(x, y, w, h) { draws.push({x, y, w, h}); },
    measureText: text => ({width: text.length * 6}),
  }, {get: (target, key) => key in target ? target[key] : () => {}});
  const renderer = createRenderer({getContext: () => context}, {reduced: true});
  renderer.resize(view.width, view.height);
  const sim = new Sim(2);
  Object.assign(sim.engine, {x: 16, y: 18.5, ox: 16, oy: 18.5});
  Object.assign(sim.cabin, {x: 16, y: 14.5, ox: 16, oy: 14.5});
  const before = JSON.stringify(sim);
  renderer.render(sim, {alpha: 1, panel: true});
  const chimney = sim.level.terrain.find(rect => rect.h === 11.5);
  assert.ok(draws.some(rect => ['x','y','w','h'].every(key => rect[key] === chimney[key])));
  assert.equal(JSON.stringify(sim), before, 'rendering cannot change the simulation');
});
test('the first render frames the initial aircraft on a phone-sized viewport', () => {
  const context = new Proxy({
    measureText: text => ({width: text.length * 6}),
  }, {get: (target, key) => key in target ? target[key] : () => {}});
  const renderer = createRenderer({getContext: () => context}, {reduced: true});
  const sim = new Sim(0);
  const width = 390;
  renderer.resize(width, 520);
  renderer.render(sim, {alpha: 1, panel: true});
  const {camera} = renderer.view();
  const engineScreenX = (sim.engine.x - camera.x) * camera.scale + width / 2;
  assert.ok(engineScreenX >= 0 && engineScreenX <= width,
    `initial engine should be visible, got screen x=${engineScreenX}`);
});
