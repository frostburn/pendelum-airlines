import { levels, worlds, worldIndex, nextRoute } from '#game/levels';
import { fmt } from '#game/math';
const closeButton = '<button class="icon close" data-action="close" aria-label="Close"><svg viewBox="0 0 20 20"><path d="m5 5 10 10M15 5 5 15"/></svg></button>';
const introArt = `<svg class="intro-art" viewBox="0 0 145 175" aria-hidden="true"><path d="M10 19h103M35 15v12m55-12v12" stroke="#253f41" stroke-width="3" stroke-linecap="round"/><path d="M25 29h75l-8 15H34Z" fill="#37796c" stroke="#253f41" stroke-width="2.5"/><rect x="50" y="27" width="26" height="25" rx="7" fill="#ce7046" stroke="#253f41" stroke-width="2.5"/><path d="M64 51q13 40 45 71" fill="none" stroke="#253f41" stroke-width="2"/><path d="M103 108 86 133l40-14Z" fill="none" stroke="#253f41" stroke-width="2"/><g transform="translate(106 139) rotate(-20)"><path d="M-24-17v34h48v-34" fill="#eebc65" stroke="#253f41" stroke-width="2.5" stroke-linejoin="round"/><path d="M-28 21h56M-24 1h48" stroke="#253f41" stroke-width="2.5" stroke-linecap="round"/><circle cy="-16" r="8" fill="#edcda5"/><path d="M-9 0v-7q9-7 18 0v7" fill="#37796c"/><path d="M-11-18h22l-4-6H-7Z" fill="#253f41"/></g><path d="M21 111q-2 36 34 44" stroke="#8eaaa0" stroke-width="1.5" stroke-dasharray="4 5" fill="none"/></svg>`;
export function panelMarkup(kind, { sim, saved, soundOn, showGhost, attempt, newRecord, selectedWorld = worldIndex(sim.index) }) {
  if (kind === 'intro' && sim.level.logistics) return `<h1 id="dialogTitle">Welcome to<br>fulfillment.</h1>
<p class="lead">Helpful colleagues. Very specific routines.</p><p>${sim.level.hint}</p>
<div class="note">Magnets stay on. Hold J to release a parcel onto a counter, fork or trailer. Staff work on resting cargo; collect it after their sign-off and follow its route to the matching address.</div>
<div class="actions"><button class="primary" data-action="close">Start shift</button><button data-action="help">Controls</button><button data-action="routes">Worlds</button></div>`;
  if (kind === 'intro' && sim.industry) return `<h1 id="dialogTitle">Welcome to<br>the works.</h1>
<p class="lead">${sim.level.name} · ${sim.level.sub}</p><p>${sim.level.hint}</p>
<div class="manual"><strong>WASD / arrows</strong><span>Fly the engine.</span><strong>Q / E</strong><span>Reel in / pay out cable.</span>
<strong>HOLD J</strong><span>Switch magnet off to drop metal / tip ladle right. Release J to restore the magnet or level the ladle. The on-screen tool button works too.</span>
<strong>SPACE / R</strong><span>Precision flight / restart.</span></div>
<div class="note">${sim.level.tip}</div><div class="actions"><button class="primary" data-action="begin">Start the work order</button><button data-action="routes">Choose a world</button></div>`;
  if (kind === 'intro')
    return `<div class="intro-header">
<div>
<h1 id="dialogTitle">Your cabin<br>will follow.<br>Eventually.</h1>
</div>${introArt}</div>
<p class="lead">A tiny flying taxi. A very long cable.<br>Pick people up, put them down, and make the bit in between look intentional.</p>
<div class="manual">
<strong>WASD / arrows</strong>
<span>Fly the engine. Release to steady it.</span>
<strong>Q / E</strong>
<span>Reel the cabin in / lower it.</span>
<strong>SPACE</strong>
<span>Slower, precise flight.</span>
<strong>R</strong>
<span>Restart this route, instantly.</span>
</div>
<div class="note">
<b>Land the cabin on a highlighted stop.</b> Boarding and drop-off are automatic. The engine can hover elsewhere.</div>
<div class="actions">
<button class="primary" data-action="begin">${sim.index === 0 ? 'Start the first fare' : 'Start this route'}</button>
<button data-action="routes">Choose a route</button>
</div>`;
  else if (kind === 'routes') {
    const world = worlds[selectedWorld] || worlds[0];
    return `${closeButton}<div class="world-heading"><span class="eyeline">PENDULUM AIRLINES · ROUTE BOOK</span><h2 id="dialogTitle">Choose your next bad idea.</h2></div>
<nav class="world-tabs" aria-label="Worlds">${worlds.map((w, i) => `<button data-world="${i}" aria-pressed="${i === selectedWorld}"><span>WORLD ${i + 1}</span><strong>${w.name}</strong></button>`).join('')}</nav>
<div class="route-list" aria-label="${world.name}">${world.routes.map((id, n) => {
      const l = levels[id], best = saved.best[id];
      return `<button class="route-button ${id === sim.index ? 'current' : ''}" data-route="${id}" title="${l.sub}">
<span class="number">${l.practice ? '∞' : String(n + 1).padStart(2, '0')}</span><strong>${l.name}</strong>
<small>${l.practice ? 'PRACTICE' : best ? '✓ ' + fmt(best.time) : l.industry ? 'WORK ORDER' : l.collection || 'LOCAL SERVICE'}</small></button>`;
    }).join('')}</div><div class="world-footer"><span>${world.sub}</span><b>${world.routes.filter(i => saved.best[i] && !levels[i].practice).length} / ${world.routes.filter(i => !levels[i].practice).length} complete · All open</b></div>`;
  }
  else if (kind === 'help')
    return `${closeButton}<h2 id="dialogTitle">A brief flight manual.</h2>
<p class="lead">You fly the engine. You negotiate with the cabin.</p>
<div class="help-grid">
<div>
<h3>The controls</h3>
<p>
<b>WASD / arrows:</b> fly up, down, left and right. Releasing them brakes the engine using rotor thrust—not the cabin.</p>
<p>
<b>Q / E:</b> reel in / pay out. The mouse wheel and cable slider work too. <b>Space:</b> slower precision flight. <b>R:</b> restart. <b>V:</b> hold for a paused route overview. <b>P / Escape:</b> pause. <b>G:</b> ghost. <b>M:</b> sound. <b>F:</b> full screen.</p>
<h3>Touch screens</h3>
<p>Use the left thumb stick to fly and the two right buttons to wind the cable. Smaller stick movements give finer control.</p>
</div>
<div>
<h3>Collecting fares</h3>
<p>Bring the cabin onto the highlighted landing strip, reasonably upright and below 0.7 m/s <b>relative to the landing strip</b>. A short progress bar shows boarding. After a little over half a second, people get on or off. No extra button.</p>
<p>The cabin carries two people. Each adds mass. A freight crate takes one place and is much heavier. Different tickets can have different destinations; consult the bottom instrument panel.</p>
<h3>On the move</h3>
<p>Ferries, lifts and shuttle wagons follow repeating schedules. Match the deck’s direction and speed as you land. Near a moving stop, <b>DECK Δ</b> shows your speed relative to it; aim below 0.7 m/s. Arrow length shows how fast the deck is moving. The route map shows its full travel.</p>
<p>Stops slow down at each end of their travel. Pause freezes them, and restarting resets their schedules along with your ghost. Space can be too slow to keep up with a train.</p>
<h3>Fulfillment</h3>
<p>Each parcel has a route and an address. Hold J to set it on a worker’s counter, forks or trailer. Yard Dog lifts and puts it away; Mutt transports it; clerks scan or sign. Let moving staff finish their trip before collecting. Loads are unsecured. Check the NEXT sign for queues. Staff on break resume automatically if you leave the parcel on their counter. Only the correct address accepts a fully processed parcel.</p>
<h3>Metal works</h3>
<p><b>Hold J, or hold the tool button:</b> switch the normally-on magnet off and drop its load, or tip a ladle to the right. Release J to restore the magnet or level the ladle again. The magnet collects black ore; yellow sand stays behind. Drop ore inside the refinery hopper.</p>
<p>Fill a ladle under the furnace tap, then pour through a mould’s open top. Droplets spill and cool into slag; return to the tap for more. On a production-line job, land at the Tool rack after casting to fit the workpiece magnet.</p>
<p>Put the ingot under the hammer, either on the magnet or loose on the anvil. Hold J to leave it there. Good impacts permanently bend and flatten the metal. Most jobs need three; The double shift needs two at each press, in either order. There is no anvil clamp: the metal moves under each blow. Keep the flying engine out of the hammer lane. Drone impacts use normal collision damage, including the hammer’s speed. The workpiece absorbs the forging blow. A lathe must touch the blank to cut it; the belt must touch it to polish. Both pull on the workpiece. Bring separate parts to free welding-jig marks and hold J to drop them. Fetch the welded assembly, then release it on Dispatch.</p>
<h3>Make the swing work for you</h3>
<p><b>Heavy freight</b> exceeds the rotor’s lifting capacity. Amber boiler plumes provide the missing lift: climb inside them, then spend height crossing the cold gaps. Keep the cabin in the column too. Reel in to keep the rig together before crossing. Pressure bars and the ticket readout show cycling boilers; wait for the next one to warm before leaving steady lift. Brake early for a heavy landing.</p>
<p>Unloading restores ordinary flight in cold air. Hot air can carry a light cabin upward, so leave the plume before descending. On the return job, use the unheated end of Depot.</p>
<p>Start braking before the cabin reaches its destination. To catch a swing, move the engine in the direction the cabin is travelling, then ease both to a stop. A shorter cable fits through tighter routes; a longer one reaches under eaves and into shafts.</p>
</div>
</div>
<h3>What is actually simulated?</h3>
<p>The engine and cabin are separate rotating bodies. Twenty-four tension-only cable links can go slack and contact the scenery, including at their midpoints. Rotor forces act on the engine alone. A powered winch changes cable length; modest air drag acts on everything. Contact and cable constraints use a fixed 240 Hz numerical approximation. There is no direct “cancel swing” force on the cabin.</p>
<div class="note">Gentle bumps are fine. Hard impacts cost integrity; water or leaving the service area ends the run. Practice mode ignores impact damage. In Metal works, the workpiece can take a beating, while the drone takes normal impact damage. Routes are short, and restarts are unlimited.</div>
<div class="actions">
<button class="primary" data-action="close">Back to the rig</button>
<button data-action="sound">${soundOn ? 'Turn sound off' : 'Turn sound on'}</button>
<button data-action="ghost">${showGhost ? 'Hide ghost' : 'Show ghost'}</button>
</div>`;
  else if (kind === 'pause')
    return `${closeButton}<h2 id="dialogTitle">Service suspended.</h2>
<p class="lead">${sim.level.logistics ? 'The whole shift is taking the same break you are.' : sim.industry ? 'The hammer is taking the same break you are.' : 'The passengers appreciate this unusually steady moment.'}</p>
<p>${sim.level.name} · ${fmt(sim.time)} · ${sim.delivered} / ${sim.jobs.length} delivered</p>
<div class="actions">
<button class="primary" data-action="close">Resume flight</button>
<button data-action="restart">Restart route</button>
<button data-action="routes">Choose a route</button>
</div>`;
  else if (kind === 'crash')
    return `<h2 id="dialogTitle">An unscheduled stop.</h2>
<p class="lead">${sim.reason || 'The taxi needs a fresh start.'}</p>
<p>${sim.level.tip}</p>
<div class="result-stats">
<div>
<strong>${fmt(sim.time)}</strong>
<span>Route time</span>
</div>
<div>
<strong>${sim.delivered}/${sim.jobs.length}</strong>
<span>Delivered</span>
</div>
<div>
<strong>${attempt}</strong>
<span>Attempt</span>
</div>
</div>
<div class="actions">
<button class="primary" data-action="restart">Try again · R</button>
<button data-action="routes">Other routes</button>
</div>`;
  else if (kind === 'result') {
    const grade = sim.industry ? 'Work order complete' : sim.time <= sim.level.gold ? 'Express service' : sim.time <= sim.level.silver ? 'Right on schedule' : 'Everyone arrived';
    return `<h2 id="dialogTitle">${grade}.</h2>
<p class="lead">${sim.level.logistics ? 'Every parcel reached its address. The staff consider this entirely their achievement.' : sim.industry ? 'Useful metal. Unlikely methods. Dispatch accepts the result.' : 'All fares delivered. Nobody had to finish the journey on foot.'}</p>
<div class="result-clock">${fmt(sim.time)}</div>
<div class="result-caption">${newRecord ? 'NEW PERSONAL BEST · GHOST SAVED' : sim.assisted ? 'PRACTICE / ASSISTED RUN' : `PERSONAL BEST ${fmt(saved.best[sim.index]?.time || sim.time)}`}</div>
<div class="result-stats">
<div>
<strong>${Math.ceil(sim.hull)}%</strong>
<span>Integrity</span>
</div>
<div>
<strong>${sim.stats.bumps}</strong>
<span>Hard bumps</span>
</div>
<div>
<strong>${sim.delivered}</strong>
<span>${sim.level.logistics ? 'Parcels delivered' : sim.industry ? 'Finished orders' : 'Happy fares'}</span>
</div>
</div>
<p>Express target: ${fmt(sim.level.gold)}. Your best run is available as a ghost on the next attempt.</p>
<div class="actions">
<button class="primary" data-action="${nextRoute(sim.index) !== null ? 'next' : 'routes'}">${nextRoute(sim.index) !== null ? 'Next route' : 'Choose a route'}</button>
<button data-action="restart">Chase the ghost · R</button>
</div>`;
  }
  throw new Error(`Unknown panel: ${kind}`);
}
