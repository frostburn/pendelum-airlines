import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT, sourceFiles } from './build.js';

const files = [...await sourceFiles(), ...await sourceFiles(join(ROOT, 'scripts')),
  ...await sourceFiles(join(ROOT, 'tests'))];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
const version = (await readFile(join(ROOT, '.nvmrc'), 'utf8')).trim();
if (process.versions.node !== version) {
  console.warn(`Note: CI uses Node ${version}; this process uses ${process.versions.node}.`);
}
console.log(`Syntax checked ${files.length} JavaScript files.`);
