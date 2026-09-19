import test from 'node:test';
import assert from 'node:assert/strict';
import { physicsTests } from '#game/diagnostics';

for (const result of physicsTests({log: false}).results) {
  test(result.test, () => assert.equal(result.pass, true, result.error));
}
