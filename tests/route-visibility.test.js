import test from 'node:test';
import assert from 'node:assert/strict';
import { levels, worlds, worldIndex, visibleRoutes, serviceRoutes, nextRoute, resumeRoute } from '#game/levels';
import { Sim } from '#game/physics';
import { parseSaved } from '#game/storage';
import { panelMarkup } from '#game/ui/panels';

test('four world pages cover each persistent route exactly once, twelve tiles at a time', () => {
  assert.deepEqual(worlds.map(w => w.routes.length), [12, 12, 12, 12]);
  assert.equal(new Set(visibleRoutes).size, levels.length);
  assert.equal(serviceRoutes.length, 47);
  worlds.forEach((world, selectedWorld) => {
    const markup = panelMarkup('routes', {sim: new Sim(0), saved: {best: {}}, selectedWorld});
    const ids = [...markup.matchAll(/data-route="(\d+)"/g)].map(m => Number(m[1]));
    assert.deepEqual(ids, world.routes);
    assert.equal((markup.match(/data-world=/g) || []).length, 4);
    assert.match(markup, new RegExp(`data-world="${selectedWorld}" aria-pressed="true"`));
    world.routes.forEach(id => assert.equal(worldIndex(id), selectedWorld));
  });
  assert.equal(nextRoute(15), 10);
  assert.equal(nextRoute(23), 24);
  assert.equal(nextRoute(35), 36);
  assert.equal(nextRoute(47), null);
  assert.equal(nextRoute(7), null);
});

test('reopened guide routes retain their IDs, bests, ghosts, and resume state', () => {
  for (let last = 14; last < 20; last++) {
    const best = {time: 42, hull: 100, ghost: [Array(16).fill(123)]};
    const saved = parseSaved(JSON.stringify({last, best: {[last]: best}}), levels.length);
    assert.equal(levels[last].collection, 'Around the bend');
    assert.ok(!levels[last].hidden);
    assert.equal(resumeRoute(saved.last), last);
    assert.deepEqual(saved.best[last], best);
  }
  for (const id of visibleRoutes) assert.equal(resumeRoute(id), id);
  assert.equal(resumeRoute(999), 0);
});
