# Pendulum Airlines

A tiny flying taxi, a long cable, and a passenger cabin with its own plans.
Four worlds, 47 handmade jobs, a practice yard, touch controls, synthesized sound,
personal bests, and interpolated best-run ghosts. Each world fits twelve level
tiles onto one screen; switch worlds instead of scrolling. All jobs are open.

## Fulfillment

World four follows parcels from a fulfillment center through loading yards,
regional depots and customer doorsteps. Twelve jobs use neutral, often
inconvenient staff routines:

- **Yard Dog** is a putaway forklift that noses under low-hanging cargo in
  its loading bay. Release a parcel onto its forks, let it lift
  and carry the load to its high handoff, then collect it. It returns empty for
  the next parcel. Inventory is recorded at the handoff, not on initial pickup.
- **Mutt** drives an unsecured trailer through loading tunnels. Loads ride on
  its physical deck. Some runs insist on the manifest's priority order.
- **Bea, Ivo and Sal** scan, relabel or sign at counters. They need released,
  supported cargo. A parcel left on a counter waits through the clerk's break.

Parcels are solid magnetic loads with their own route, address, and receipts.
Hold J to hand one off, collect after sign-off, and set it at the matching
address. Wrong clerks, incomplete routes and wrong addresses do not consume a
parcel. Taking a vehicle's load mid-trip cancels that transfer; the worker
returns so it can be retried. No worker attacks the drone or applies special
damage. Moving vehicles use normal collision speed damage.

The jobs cover intake, high-bay putaway, colour sorting, linehaul tunnels,
returns, shared forklifts, cross-docking, reception breaks, priority queues,
misrouted depots, separate doorsteps, and a complete overnight chain. Indoor
racking gives way to loading bays and street frontages, with stable background
geometry. Each route has at most two parcels and three staff members; moving
platforms use acceleration-limited powered motion and ordinary friction. There
are no cargo teleports, attachment overrides, or growing NPC/particle pools.

## Metal works

The third world replaces the passenger cabin with industrial tools. Both magnets
are **on by default**: fly the head above a workpiece or rake it through ore to
collect metal. **Hold J** with your right hand, or hold the on-screen tool button,
to turn the magnet off and drop the load. Release J to turn it back on. The ladle
uses J to pour right; release it to level the vessel.

| Jobs | Work |
| --- | --- |
| A magnetic personality / Buried treasure, mostly sand | Rake black magnetite out of loose sand, carry it to the refinery hopper, and release it inside. The second order exceeds one magnet load. |
| Do not drink the orange / Two moulds, one bad idea | Fill below a furnace tap, back out from under it, and pour into one or two moulds. Missed droplets cool into slag; the tap provides refills. |
| The hammer has right of way / The double shift | Put a bar under real downstroke impacts (three in the first forging job), either held by the magnet or loose on the anvil. The hammer knocks, bends and flattens the free load. On The double shift, take two hits at each press, in either order. Keep the engine clear. |
| A turn for the better / Against the grain | Maintain contact with the spinning lathe or moving belt. The surfaces pull on the workpiece as it is shaped and polished. |
| Some assembly required / Three-part harmony | Bring separate parts to free jig marks and release them. The three-part order requires every part to be polished before welding. Pick up the assembly and deliver it. |
| From orange to shiny / The complete works | Cast, exchange the ladle at the Tool rack, collect the casting, forge, turn, polish, and deliver. The final order also needs a ready-made bracket and welding. |

Workpieces remain independent rigid bodies on the same 240 Hz solver as the rig,
including while held. Capture makes a contact joint at the existing pose, shares
momentum, and never snaps the piece into the magnet. Release removes only that
joint. Metal collides with scenery, the tool, drone, and other loose pieces.
Magnetic forces are attractive and central, with equal opposite impulses and
torque on the head. Contact position repair is separated from velocity so an
overlap does not become a launch. Forging absorbs most of the kick at impact
and rebounds the hammer while permanently deforming the metal. Released parts fall and
settle on the scenery. Dispatch accepts a released, settled product only when
its processing requirements are met. Proximity to a machine does not do work:
forging needs actual downward hammer contacts with the metal; turning and
polishing need workpiece contact with moving surfaces. The welding jig consumes
distinct qualified pieces and releases one collectible assembly. There is no
anvil clamp or forge position override; released pieces collide with the hammer
and qualify for the same hit requirements as suspended pieces. Five deforming
cross-sections drive both the ingot silhouette and its held/free collision shapes. A stroke counts once,
requires an incoming contact speed above 2 m/s, and must hit the workpiece rather
than just the magnet or engine. Industrial collisions still shove and spin the
rig. Drone collisions use the ordinary impact-speed damage threshold, scaling and cooldown, including against the moving hammer and stationary press frame. Slow touches and overlap alone do not cause damage. Working the metal itself does not cost integrity.

Grains and liquid run at 120 Hz alongside the 240 Hz rig and workpieces. Particle contacts react on the tool; liquid weight comes from its contact forces instead of being counted again in the ladle mass. Limits are
168 grains, 96 molten droplets, 28 magnet-held grains, 8 workpieces, 24 slag marks,
48 sparks, and 256 rendered fluid links. Neighbour-cell contact pairs avoid an
all-pairs grain solver. Liquid uses local repulsion, viscosity and weak cohesion,
with collisions against the rotating ladle walls; it must cross the rim to pour.
Mould volume is counted in droplets and cools into an ingot. This is a bounded
toy approximation, not a metallurgy or fluid-engineering model. Everything uses
simulation time, including machine cycles, cooling and welding.

## Heavy lifting

Four freight jobs require **boiler updrafts**. A loaded rig weighs about 224 N;
the rotor can supply at most 190 N. Climb inside the warm columns, then spend that
height crossing cold air. This is a force budget, not a requirement to visit
checkpoints. Without the plumes, the loaded taxi cannot lift off its loading pad.

The amber air and rising arrows show the lift area. Pressure bars, map labels,
and the ticket readout expose cycling boilers. Keep the cabin inside the column,
reel in before a long crossing, and brake early for a heavy landing. Unloading
changes the flight again: a light cabin can rise in hot air, so descend outside it.

| Route | Challenge |
| --- | --- |
| A piano is not hand luggage | Learn to gain height in lift and cross a cold gap |
| The cold stretch | Shorten the cable and bank altitude for longer gaps |
| Steam takes a break | Wait for the next boiler to warm before leaving steady lift |
| The light way home | Deliver a heavy pump, return two mechanics, and land on a cold part of the depot |

The six **Around the bend** guide routes now fill out the first two worlds.
Their original save IDs, bests and ghosts are retained.

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
npm run verify   # syntax, tests, 35 simulated flights, and a standalone build
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
| Hold J / tool button | Switch the normally-on magnet off to drop metal, or tip the ladle right |
| R | Restart the current route |
| Hold V | Paused route overview |
| P / Escape | Pause / resume |
| H / G / M / F | Help / ghost / sound / full screen |

Touch screens have a thumb stick, two winch buttons, and an industrial tool button. Land the cabin gently
on a highlighted stop; boarding and drop-off are automatic. Each passenger adds
mass, and the two seats can hold passengers with different destinations.

## Code map

- `src/physics.js`: DOM-free simulation, contacts, cable, rotor, and fares.
- `src/constants.js`, `src/math.js`, `src/levels.js`: units, helpers, and route data.
- `src/moving-stops.js`: analytic platform motion and solid deck geometry.
- `src/cable-guides.js`: circular contact geometry for fixed cable guides.
- `src/updrafts.js`: spatial lift fields, body area factors, and boiler schedules.
- `src/industry/`: bounded materials, tool state, free parts, and machine processing.
- `src/routes/`: shared geometry helpers and all route collections.
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

Freight tickets add `cargo: true, mass: 15`; ordinary passengers retain their
1.05 kg mass. Boarding changes the cabin's mass and inertia, and unloading restores
them. A crate uses one of the two places. The rotor compensates for cable tension
within its unchanged 190 N ceiling and never directly edits cabin velocity.

Updrafts declare `{x, w, bottom, top, force}` and optional `{period, phase}`.
`force` is the upward force on a cabin-sized area, in newtons. The engine and cable
nodes have smaller area factors; force does not scale up with payload mass.
Horizontal and vertical edges fade smoothly. This is a simplified pressure field,
not a fluid simulation. Boiler schedules and animation use simulation time, so
pause freezes them and restart reproduces them for ghost races.

Rendering interpolates between physics steps and must not mutate simulation
state. The visibility fix tests **the full building bounds**, including roof
trim. A base below the viewport is not grounds to hide a roof that is still visible.

### Saves and debugging

The original `pendulum-airlines-v1` storage key and 20 Hz ghost format are retained.
Route array indices are persistent save IDs: the original seven services stay at
0–6, Sunday service stays at 7, On the move occupies 8–13, Around the bend occupies
14–19, Heavy lifting occupies 20–23, Metal works occupies 24–35, and Fulfillment is appended at 36–47.
`worlds` declares picker order separately from those IDs. Next route follows world
order and skips free practice. Every earlier route remains directly resumable;
reopening the guide routes does not remap their records. Append definitions rather
than inserting them.
Invalid saves are ignored; blocked or full storage falls back to session-only play.
Browsers scope storage to the origin, so moving from a downloaded file to a hosted
URL does not automatically transfer records.

```js
pendulum.state()                 // read-only snapshot
pendulum.routes                 // route IDs, names, and hidden flags
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

The foundry backdrop uses world-anchored sheds, silos, chimney stacks and gantry cranes. Its silhouettes remain stable across camera travel and viewport changes.

City regressions cross the old wrap boundary in both directions and check the
real renderer. Guide tests cover contact geometry, both vehicle bodies, cable
nodes and midpoints, rendering, restarts, and preservation of earlier route IDs.

`npm run test:flights` completes 23 moving-stop, freight, and foundry jobs using normal analog
flight, winch and tool-button inputs. Every job must complete at full integrity.
Passenger jobs must avoid damaging impacts; industrial jobs must keep the drone clear of the hammer and its frame. The witnesses never teleport the rig or bypass service logic. These are playability
witnesses, not claims about how easy the routes are for a human pilot. The check
also runs as part of `npm run verify`. Freight flights must gain height in every
plume and sink through cold gaps; the cycling route must wait for pressure, and
the return must carry both mechanics and land outside hot air. An ablation test
removes only the updrafts and confirms full throttle cannot lift any loaded route
off the ground. This checks that the new mechanic supplies necessary work.

Foundry witnesses fill real moulds, count real hammer strokes and machine contacts,
release separate pieces into welding jigs, and set the qualified product down at
Dispatch. An additional anvil flight leaves the ingot loose, forges it, picks it
up again, and delivers it. They also check material caps and guard against
contact-driven launches. Focused tests cover capture energy, repeated pickup/release, equal opposite magnetic reactions and torque, solid-body contact, press damage and normally-on magnets, release momentum,
loose-piece forging, permanent collision-mesh deformation, exactly three distinct downstroke contacts, rejected near-misses,
fluid retention/spills, magnet selectivity, bounded neighbour search, machine
timing, processing requirements, and renderer immutability.

`npm run test:guides` separately exercises the six guide routes, including
contact, release, winching, and continuous cable clearance around their rims.

CI has **one Ubuntu job, one Node version (22.16.0), and no matrix**. It runs
`npm run verify` and uploads `dist/index.html` as the `pendulum-airlines` artifact.
The workflow does not deploy or change repository settings.

For a visual smoke test, follow [tests/MANUAL.md](tests/MANUAL.md).

## License

MIT. The repository's existing copyright and license are preserved, and the
standalone build includes the license text.
