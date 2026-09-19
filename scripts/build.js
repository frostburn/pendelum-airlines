import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, join } from 'node:path';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
const MODULE_MARKER = '<!-- GAME_MODULES -->';
const STYLE_LINK = '<link rel="stylesheet" href="./src/styles.css">';

export async function sourceFiles(dir = join(ROOT, 'src')) {
  const files = [];
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (entry.name.endsWith('.js')) files.push(path);
  }
  return files.sort();
}

/**
 * Native ES modules, not a source-code transformer. In development the import
 * map points at files; the offline build maps the same names to data URLs.
 * All game imports use #game/ aliases (also resolved by Node's package imports).
 */
export async function renderHTML({offline = false} = {}) {
  let html = await readFile(join(ROOT, 'index.html'), 'utf8');
  if (!html.includes(MODULE_MARKER) || !html.includes(STYLE_LINK)) {
    throw new Error('index.html is missing its module marker or stylesheet link.');
  }
  const imports = {};
  for (const file of await sourceFiles()) {
    const path = relative(join(ROOT, 'src'), file).replaceAll('\\', '/');
    imports[`#game/${path.slice(0, -3)}`] = offline
      ? `data:text/javascript;base64,${(await readFile(file)).toString('base64')}`
      : `./src/${path}`;
  }
  html = html.replace(MODULE_MARKER, `<script type="importmap">${JSON.stringify({imports})}</script>`);
  if (offline) {
    const css = await readFile(join(ROOT, 'src/styles.css'), 'utf8');
    html = html.replace(STYLE_LINK, () => `<style>\n${css}\n</style>`);
    const license = await readFile(join(ROOT, 'LICENSE'), 'utf8');
    html = html.replace('<!doctype html>', () => `<!doctype html>\n<!--\n${license}-->`);
  }
  return html;
}

export async function build(outDir = join(ROOT, 'dist')) {
  const html = await renderHTML({offline: true});
  await mkdir(outDir, {recursive: true});
  const file = join(outDir, 'index.html');
  await writeFile(file, html);
  return file;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Built ${await build()}`);
}
