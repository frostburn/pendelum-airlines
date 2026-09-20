# Pendulum Airlines

A tiny flying taxi, a long cable, and a passenger cabin with its own plans.
Nineteen handmade routes, a practice yard, touch controls, synthesized sound,
personal bests, and interpolated best-run ghosts.

## Around the bend

Six new routes introduce **cable guides**: fixed brass fairleads that the cable
can bend and slide around. Pass the engine above a guide, then climb or reel in
gently to lift the cabin clear. The rim brightens while carrying the cable. It is
solid for the engine and cabin too; its pale supports sit behind the flight path.
There is no new button, latch, or automatic release.

| Route | Challenge |
| --- | --- |
| A little guidance | Learn to catch a guide and pull the cabin clear |
| An indirect approach | Redirect a longer cable between low and high offices |
| Two points of contact | Use two guides while delivering two different tickets |
| Reel around the chimney | Winch around a guide before clearing the brickwork |
| Guidance is not a timetable | Combine guides with a moving construction lift |
| A roundabout way home | Collect two fares and return their teacher past the guides |

The distant skyline also keeps stable building identities as the camera moves.
Crossing a parallax tile boundary no longer reshuffles their widths and heights.

## On the move

The six-route expansion introduces moving stops: ferries, construction lifts,
and shuttle wagons. Match the cabin's speed to the deck to board or deliver.
Near a moving stop, **DECK Δ** shows relative speed; aim below 0.7 m/s. The deck
arrows show motion, and the paused route map shows the full travel.

| Route | Challenge |
| --- | --- |
| The stop is leaving | Land on a slow ferry, then fly to the island |
| Third floor, occasionally | Follow a construction lift vertically |
| Mind the moving gap | Keep pace with a narrow shuttle wagon |
| Connections are approximate | Transfer between ferries with different schedules |
| Catch the next lift | Connect two lifts across a chimney |
| Last boat, first train | Collect two pupils from different moving stops and bring their teacher home |

Every platform repeats the same schedule on restart. Pause stops platform time
as well as flight time, keeping ghost races reproducible. All routes are unlocked.

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
npm run verify   # syntax, tests, twelve simulated flights, and a standalone build
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
- `src/moving-stops.js`: analytic platform motion and solid deck geometry.
- `src/cable-guides.js`: circular contact geometry for fixed cable guides.
- `src/routes/`: shared geometry helpers and the two expansion collections.
- `src/render/`: drawing and camera; stable city slots and viewport culling.
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

Moving stops declare `motion: {dx, dy, period, phase}` on a pad. `dx` and `dy`
are half-travel distances; `period` is seconds; `phase` is a fraction of a cycle.
`vehicle` selects ferry, lift, or train decoration. `hullDepth` sets the solid
depth below the deck (default 0.42 m); ferry hulls extend below the waterline.
Powered platforms follow smooth
sinusoidal paths and act as kinematic scenery. Contacts use surface-relative
velocity for normal response, friction, and impact damage. Boarding uses relative
speed too. Pads, collision decks, and rendered stations share the same motion
function; mutable poses belong to each simulation, not the route definitions.
Guide rails are background artwork; the moving deck is solid to both the rig and
its cable. Add static scenery below railways when a solid embankment is wanted.

Cable guides declare `guides: [{x, y, r}]` on a route. Their fixed circular rims
participate in the same body, cable-node, and cable-midpoint collision passes as
terrain. They redirect tension through physical contact, with no attachment
state. Keep radii at least 0.5 m so the cable's collision samples cover the curve
at maximum extension. Current routes use forgiving 0.8 m rims. The simulation
owns its guide data and exposes current contacts and cumulative visits in its
debug snapshot. These observations do not gate fares or change scoring.

Rendering interpolates between physics steps and must not mutate simulation
state. The visibility fix tests **the full building bounds**, including roof
trim. A base below the viewport is not grounds to hide a roof that is still visible.

### Saves and debugging

The original `pendulum-airlines-v1` storage key and 20 Hz ghost format are retained.
Route array indices are persistent save IDs: the original seven services stay at
0–6, Sunday service stays at 7, On the move occupies 8–13, and Around the bend
occupies 14–19. The picker lists
practice last, and Next route skips it. Append routes rather than inserting them.
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

City regressions cross the old wrap boundary in both directions and check the
real renderer. Guide tests cover contact geometry, both vehicle bodies, cable
nodes and midpoints, rendering, restarts, and preservation of earlier route IDs.

`npm run test:flights` completes all twelve expansion routes using normal analog
flight and winch inputs. It asserts every fare is delivered without damaging impacts;
it does not teleport the rig or bypass service logic. These are playability
witnesses, not claims about how easy the routes are for a human pilot. The check
also runs as part of `npm run verify`. Every new guide must carry the cable for
at least half a second and release before the finish. The flights also check
continuous cable segments for penetration between their collision samples.

CI has **one Ubuntu job, one Node version (22.16.0), and no matrix**. It runs
`npm run verify` and uploads `dist/index.html` as the `pendulum-airlines` artifact.
The workflow does not deploy or change repository settings.

For a visual smoke test, follow [tests/MANUAL.md](tests/MANUAL.md).

## License

MIT. The repository's existing copyright and license are preserved, and the
standalone build includes the license text.
