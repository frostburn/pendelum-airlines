import test from 'node:test';
import assert from 'node:assert/strict';
import { cityBuildings } from '#game/render/city';
import { createRenderer } from '#game/render/renderer';
import { Sim } from '#game/physics';

test('city buildings retain their shapes across parallax wrap boundaries in both directions', () => {
  for (const width of [390, 800, 1920]) for (const slot of [-7, -1, 0, 1, 7]) {
    const left = slot * 91 / 12 - .001, right = left + .002;
    const a = cityBuildings(left, width), b = cityBuildings(right, width);
    const shared = a.filter(p => p.x + p.w >= 0 && p.x <= width);
    assert.ok(shared.length > 3);
    for (const building of shared) {
      const next = b.find(p => p.id === building.id);
      assert.ok(next, 'visible buildings cannot disappear at a wrap boundary');
      assert.equal(next.w, building.w);
      assert.equal(next.h, building.h);
      assert.ok(Math.abs(next.x - building.x + .024) < 1e-9);
    }
  }
});

test('city shapes are independent of viewport size and previous camera travel', () => {
  const original = cityBuildings(14, 390);
  const wide = cityBuildings(14, 1920);
  for (const building of original) assert.deepEqual(wide.find(p => p.id === building.id), building);
  cityBuildings(-1000, 800);
  cityBuildings(1000, 800);
  assert.deepEqual(cityBuildings(14, 390), original);
});

test('the real renderer uses the stable city on either side of the old wrap', () => {
  const draws = [];
  const context = new Proxy({
    fillRect(x, y, w, h) { if (this.fillStyle === '#99b8ae') draws.push({x, y, w, h}); },
    measureText: text => ({width: text.length * 6}),
  }, {get: (target, key) => key in target ? target[key] : () => {}});
  const renderer = createRenderer({getContext: () => context}, {reduced: true});
  renderer.resize(390, 520);
  const sim = new Sim(0);
  for (const cameraX of [91 / 12 - .001, 91 / 12 + .001]) {
    for (const body of [sim.engine, sim.cabin]) body.x = body.ox = cameraX;
    draws.length = 0;
    renderer.render(sim, {alpha: 1, panel: true});
    const {camera} = renderer.view();
    assert.ok(Math.abs(camera.x - cameraX) < 1e-10);
    const base = 520 * .8 + (camera.y - 8) * 12;
    assert.deepEqual(draws, cityBuildings(camera.x, 390).map(({x, w, h}) => ({x, y: base - h, w, h: h + 70})));
  }
});
