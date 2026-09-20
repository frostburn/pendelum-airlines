import test from 'node:test';
import assert from 'node:assert/strict';
import { levels } from '#game/levels';
import { stopAt, deckAt } from '#game/moving-stops';
import { MIN, MAX } from '#game/constants';

test('all routes and the practice yard have valid geometry and tickets', () => {
  assert.equal(levels.length, 36);
  assert.equal(levels.filter(level => level.practice).length, 1);
  for (const level of levels) {
    assert.ok(level.name && level.width > 0 && level.height > 0);
    assert.ok(level.pads[level.start]);
    assert.ok(level.cable >= MIN && level.cable <= MAX);
    for (const source of level.updrafts || []) {
      assert.ok([source.x, source.w, source.bottom, source.top, source.force].every(Number.isFinite));
      assert.ok(source.w > 0 && source.top > source.bottom && source.force > 0);
      if (source.period) assert.ok(source.period > 0 && Number.isFinite(source.phase || 0));
    }
    for (const guide of level.guides || []) {
      assert.ok([guide.x, guide.y, guide.r].every(Number.isFinite));
      assert.ok(guide.r >= .5 && guide.y > guide.r);
      assert.ok(guide.x > guide.r && guide.x + guide.r < level.width);
    }
    for (const rect of level.terrain) {
      assert.ok([rect.x, rect.y, rect.w, rect.h].every(Number.isFinite));
      assert.ok(rect.w > 0 && rect.h > 0);
    }
    for (const pad of level.pads) {
      assert.ok(pad.w > 0);
      if (pad.motion) {
        const {dx, dy, period, phase} = pad.motion;
        assert.ok([dx, dy, period, phase].every(Number.isFinite));
        assert.ok(period > 0 && (dx || dy));
        for (const time of [0, period / 4, period / 2, period * 3 / 4]) {
          const p = stopAt(pad, time), deck = deckAt(p);
          assert.ok(Math.abs(deck.y + deck.h - p.y) < 1e-8);
          assert.ok(p.y > 0 && deck.x > -6 && deck.x + deck.w < level.width + 6);
          assert.ok(!level.terrain.some(r => deck.x < r.x + r.w && deck.x + deck.w > r.x &&
            deck.y < r.y + r.h && deck.y + deck.h > r.y), `${pad.name} must clear the scenery`);
        }
        continue;
      }
      assert.ok(level.terrain.some(rect => Math.abs(rect.y + rect.h - pad.y) < 1e-8 &&
        pad.x >= rect.x && pad.x <= rect.x + rect.w), `${pad.name} needs a solid landing surface`);
    }
    for (const job of level.jobs) {
      assert.ok(level.pads[job.from] && level.pads[job.to]);
      assert.notEqual(job.from, job.to);
      if (job.mass !== undefined) assert.ok(Number.isFinite(job.mass) && job.mass > 0);
    }
    if (!level.practice) assert.ok(level.gold > 0 && level.silver >= level.gold);
  }
});
