import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { ROOT, renderHTML, build, sourceFiles } from '../scripts/build.js';
import { createAppServer } from '../scripts/serve.js';

const importMap = html => JSON.parse(html.match(/<script type="importmap">(.*?)<\/script>/s)[1]).imports;

test('development import map and Node imports resolve every game module', async () => {
  const map = importMap(await renderHTML());
  assert.equal(map['#game/main'], './src/main.js');
  for (const file of await sourceFiles()) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
      assert.ok(map[match[1]], `${relative(ROOT, file)}: unresolved game import ${match[1]}`);
    }
  }
});
test('offline build embeds byte-identical modules, CSS and the existing license', async () => {
  const html = await renderHTML({offline: true});
  const map = importMap(html);
  for (const file of await sourceFiles()) {
    const alias = '#game/' + relative(join(ROOT, 'src'), file).replaceAll('\\', '/').slice(0, -3);
    assert.ok(map[alias].startsWith('data:text/javascript;base64,'));
    assert.equal(Buffer.from(map[alias].split(',')[1], 'base64').toString(), await readFile(file, 'utf8'));
  }
  assert.ok(html.includes(await readFile(join(ROOT, 'src/styles.css'), 'utf8')));
  assert.ok(html.includes(await readFile(join(ROOT, 'LICENSE'), 'utf8')));
  assert.ok(!html.includes('<!-- GAME_MODULES -->'));
  assert.ok(!/<(?:script|link)[^>]+(?:src|href)="(?:\.\/src|https?:)/.test(html));
});
test('build is reproducible and contains only the standalone document', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pendulum-build-'));
  try {
    const path = await build(dir);
    assert.equal(await readFile(path, 'utf8'), await renderHTML({offline: true}));
  } finally { await rm(dir, {recursive: true, force: true}); }
});
test('local development server serves the game but not repository internals', async () => {
  const server = createAppServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const entry = await fetch(base);
    assert.equal(entry.status, 200);
    assert.ok((await entry.text()).includes('type="importmap"'));
    const module = await fetch(base + '/src/main.js');
    assert.equal(module.status, 200);
    assert.match(module.headers.get('content-type'), /text\/javascript/);
    for (const path of ['/.git/config', '/package.json', '/src/../../LICENSE']) {
      assert.equal((await fetch(base + path)).status, 404);
    }
    assert.equal((await fetch(base, {method: 'POST'})).status, 405);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
