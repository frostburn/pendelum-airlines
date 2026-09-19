import test from 'node:test';
import assert from 'node:assert/strict';
import { encodePose, sampleGhost, validGhost, POSE_SIZE, MAX_GHOST_FRAMES } from '#game/ghost';
const pose = value => Array(POSE_SIZE).fill(value);

test('recorded poses use the original millimetre format', () => {
  assert.deepEqual(encodePose(pose(1.23456)), pose(1235));
});
test('ghosts interpolate between 20 Hz samples', () => {
  const frames = [pose(1000), pose(3000)];
  assert.deepEqual(sampleGhost(frames, 0), pose(1));
  assert.deepEqual(sampleGhost(frames, 0.025), pose(2));
  assert.deepEqual(sampleGhost(frames, 0.05), pose(3));
});
test('unwrapped angular values interpolate without a spurious reverse turn', () => {
  const a = pose(0), b = pose(0);
  a[2] = 6200; b[2] = 6400;
  assert.equal(sampleGhost([a,b], 0.025)[2], 6.3);
});
test('the last sample holds briefly without extrapolation', () => {
  assert.deepEqual(sampleGhost([pose(1000)], 0.049), pose(1));
  assert.equal(sampleGhost([pose(1000)], 0.051), null);
});
test('absent ghosts and invalid times are harmless', () => {
  for (const time of [-1, NaN, Infinity]) assert.equal(sampleGhost([pose(0)], time), null);
  assert.equal(sampleGhost([], 0), null);
  assert.equal(sampleGhost(undefined, 0), null);
});
test('corrupt and oversized ghosts are rejected', () => {
  assert.equal(validGhost([pose(1)]), true);
  assert.equal(validGhost([[0]]), false);
  assert.equal(validGhost([pose(NaN)]), false);
  assert.equal(validGhost(Array(MAX_GHOST_FRAMES + 1).fill(pose(0))), false);
});
