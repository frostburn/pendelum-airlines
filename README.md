# Pendulum Airlines

A tiny flying taxi, a long cable, and a passenger cabin with its own plans.
Seven handmade routes, a practice yard, touch controls, synthesized sound,
personal bests, and interpolated best-run ghosts.

## Run and build

Use **Node 22.16.0** (also recorded in `.nvmrc`). There are no npm dependencies.

```sh
nvm use
npm ci
npm run dev
```

Open `http://127.0.0.1:4173`. Edit a source file and reload the page. The development
server binds to loopback only; `npm run dev -- --port 3000` changes its port.

```sh
npm run verify   # syntax checks, all tests, and a standalone build
npm run build   # produces dist/index.html
npm run preview # serves the built document on the same local port
```

Stop the development server before starting preview on the same port.
`dist/index.html` is self-contained: open it directly or put it on any static
host, including a subdirectory. No CDN, network requests, or runtime packages
are needed. `index.html` at the repository root is the development template;
use the dev server or build it rather than opening that template directly.

## Controls

| Control | Action |
| --- | --- |
| WASD / arrows | Fly the engine; release to steady it |
| Q / E | Reel in / lower the cabin |
| Mouse wheel / cable slider | Set the winch target |
| Space | Precision flight |
| R | Restart the current route |
| Hold V | Paused route overview |
| P / Escape | Pause / resume |
| H / G / M / F | Help / ghost / sound / full screen |

Touch screens have a thumb stick and two winch buttons. Land the cabin gently
on a highlighted stop; boarding and drop-off are automatic. Each passenger adds
mass, and the two seats can hold passengers with different destinations.

## Code map

- `src/physics.js`: DOM-free simulation, contacts, cable, rotor, and fares.
- `src/constants.js`, `src/math.js`, `src/levels.js`: units, helpers, and route data.
- `src/render/`: drawing and camera; viewport culling is independently testable.
- `src/ui/`: dialog templates and shared drawing colors/fonts.
- `src/main.js`: lifecycle, controls, HUD, event dispatch, and the frame loop.
- `src/audio.js`, `src/ghost.js`, `src/storage.js`: optional sound, replay, and saves.
- `src/styles.css`: interface styling and responsive layouts.
- `scripts/`: dependency-free development server, syntax checks, and build.
- `tests/`: physics, rendering regression, routes, replay, saves, and build tests.

Source files are native ES modules. Use imports such as `#game/physics` or
`#game/render/viewport`, without `.js`. Node resolves these through `package.json`;
the development server generates the matching browser import map. The build
embeds **the same module bytes** as data URLs in that map and inlines the CSS.
It does not concatenate, rewrite, or reimplement the JavaScript module system.
New `.js` files under `src/` are discovered automatically; keep game imports under
`#game/` so the single-file export remains independent of a server and file paths.

### Physics and routes

World coordinates use metres, kilograms, seconds, radians, and **+y up**.
Terrain rectangles have a bottom-left origin. A pad's `y` is its top landing
surface. Route factories in `levels.js` keep the geometry explicit.

Simulation runs at a fixed 240 Hz. Engine and cabin are rotating rigid bodies;
24 massive, tension-only cable links may go slack and collide with terrain.
Only the engine receives rotor thrust. The powered winch does work, and air drag
and terrain contacts exchange momentum with the environment. Constraint solving
is a numerical game approximation, not an engineering solver.

Rendering interpolates between physics steps and must not mutate simulation
state. The visibility fix tests **the full building bounds**, including roof
trim. A base below the viewport is not grounds to hide a roof that is still visible.

### Saves and debugging

The original `pendulum-airlines-v1` storage key and 20 Hz ghost format are retained.
Invalid saves are ignored; blocked or full storage falls back to session-only play.
Browsers scope storage to the origin, so moving from a downloaded file to a hosted
URL does not automatically transfer records.

```js
pendulum.state()                 // read-only snapshot
pendulum.routes                 // route IDs and names
pendulum.physicsTests()          // the 16 original physics diagnostics
pendulum.load(2)                 // load The chimney run
pendulum.debug.view()            // renderer camera and viewport dimensions
pendulum.debug.step(1, {y: 1})   // advance one simulated second
```

`pendulum.debug.sim`, `debug.step`, and `debug.setCable` mark the current run as
assisted, preventing it from replacing a legitimate personal best or ghost.

## Verification and CI

`npm test` uses Node's built-in test runner. It includes a regression that puts
a chimney's base far below the screen while its facade still intersects the
viewport, plus a test that calls the actual renderer and checks it draws that
facade without changing simulation state.

CI has **one Ubuntu job, one Node version (22.16.0), and no matrix**. It runs
`npm run verify` and uploads `dist/index.html` as the `pendulum-airlines` artifact.
The workflow does not deploy or change repository settings.

For a visual smoke test, follow [tests/MANUAL.md](tests/MANUAL.md).

## License

MIT. The repository's existing copyright and license are preserved, and the
standalone build includes the license text.
