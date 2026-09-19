import test from 'node:test';
import assert from 'node:assert/strict';
import { levels } from '#game/levels';
import { MIN, MAX } from '#game/constants';

test('all seven routes and the practice yard have valid geometry and tickets', () => {
  assert.equal(levels.length, 8);
  assert.equal(levels.filter(level => level.practice).length, 1);
  for (const level of levels) {
    assert.ok(level.name && level.width > 0 && level.height > 0);
    assert.ok(level.pads[level.start]);
    assert.ok(level.cable >= MIN && level.cable <= MAX);
    for (const rect of level.terrain) {
      assert.ok([rect.x, rect.y, rect.w, rect.h].every(Number.isFinite));
      assert.ok(rect.w > 0 && rect.h > 0);
    }
    for (const pad of level.pads) {
      assert.ok(pad.w > 0);
      assert.ok(level.terrain.some(rect => Math.abs(rect.y + rect.h - pad.y) < 1e-8 &&
        pad.x >= rect.x && pad.x <= rect.x + rect.w), `${pad.name} needs a solid landing surface`);
    }
    for (const job of level.jobs) {
      assert.ok(level.pads[job.from] && level.pads[job.to]);
      assert.notEqual(job.from, job.to);
    }
    if (!level.practice) assert.ok(level.gold > 0 && level.silver >= level.gold);
  }
});
