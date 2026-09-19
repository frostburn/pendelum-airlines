import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, parseSaved, defaultSaved, STORAGE_KEY } from '#game/storage';
const best = {time: 32.5, hull: 94, ghost: [Array(16).fill(0)]};

test('original v1 records and preferences survive a hosted upgrade', () => {
  const data = {best: {'0': best}, last: 3, sound: true, ghost: false};
  assert.deepEqual(parseSaved(JSON.stringify(data), 8), data);
  assert.equal(STORAGE_KEY, 'pendulum-airlines-v1');
});
test('invalid JSON falls back to playable defaults', () => {
  for (const raw of ['{', 'null', '[]', '42', null]) assert.deepEqual(parseSaved(raw, 8), defaultSaved());
});
test('last route is bounded and invalid records are discarded', () => {
  const saved = parseSaved(JSON.stringify({last: 200, best: {
    0: best, 1: {...best, time: -1}, 2: {...best, ghost: [[0]]},
    3: {...best, time: 3601}, 10: best, '__proto__': best,
  }}), 8);
  assert.equal(saved.last, 7);
  assert.deepEqual(Object.keys(saved.best), ['0']);
});
test('blocked storage still permits a full in-memory session', () => {
  let errors = 0;
  const store = createStore(8, () => errors++, () => {throw new Error('Blocked');});
  store.saved.best[0] = best;
  assert.equal(store.persist(), false);
  assert.equal(errors, 1);
  assert.equal(store.saved.best[0].time, best.time);
});
test('persistence uses the original key and survives reload', () => {
  const memory = new Map();
  const storage = {getItem: key => memory.get(key) ?? null, setItem: (key,value) => memory.set(key,value)};
  const first = createStore(8, undefined, () => storage);
  first.saved.best[0] = best;
  assert.equal(first.persist(), true);
  assert.deepEqual(createStore(8, undefined, () => storage).saved.best[0], best);
});
