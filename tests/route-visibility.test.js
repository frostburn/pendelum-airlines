import test from 'node:test';
import assert from 'node:assert/strict';
import { levels, visibleRoutes, serviceRoutes, nextRoute, routeNumber, resumeRoute } from '#game/levels';
import { Sim } from '#game/physics';
import { parseSaved } from '#game/storage';
import { panelMarkup } from '#game/ui/panels';

test('guide routes remain loadable but are absent from the picker and normal progression', () => {
  const markup = panelMarkup('routes', {sim: new Sim(0), saved: {best: {}}});
  for (let i = 14; i < 20; i++) {
    assert.equal(new Sim(i).level.collection, 'Around the bend');
    assert.equal(levels[i].hidden, true);
    assert.equal(visibleRoutes.includes(i), false);
    assert.doesNotMatch(markup, new RegExp(`data-route="${i}"`));
    assert.equal(nextRoute(i), null);
  }
  assert.doesNotMatch(markup, /Around the bend/);
  assert.equal(nextRoute(13), 20);
  assert.equal(routeNumber(20), 14);
  assert.equal(nextRoute(23), null);
  assert.equal(serviceRoutes.length, 17);
  assert.equal((markup.match(/data-route=/g) || []).length, 18);
  assert.ok(markup.indexOf('data-route="23"') < markup.indexOf('data-route="7"'));
});

test('resuming a hidden route selects a visible service while preserving its best and ghost', () => {
  for (let last = 14; last < 20; last++) {
    const best = {time: 42, hull: 100, ghost: [Array(16).fill(123)]};
    const saved = parseSaved(JSON.stringify({last, best: {[last]: best}}), levels.length);
    assert.equal(resumeRoute(saved.last), 20);
    assert.deepEqual(saved.best[last], best);
  }
  for (const id of visibleRoutes) assert.equal(resumeRoute(id), id);
  assert.equal(resumeRoute(999), 0);
});
