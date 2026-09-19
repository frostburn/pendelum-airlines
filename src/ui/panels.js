import { levels } from '#game/levels';
import { fmt } from '#game/math';
const closeButton = '<button class="icon close" data-action="close" aria-label="Close"><svg viewBox="0 0 20 20"><path d="m5 5 10 10M15 5 5 15"/></svg></button>';
const introArt = `<svg class="intro-art" viewBox="0 0 145 175" aria-hidden="true"><path d="M10 19h103M35 15v12m55-12v12" stroke="#253f41" stroke-width="3" stroke-linecap="round"/><path d="M25 29h75l-8 15H34Z" fill="#37796c" stroke="#253f41" stroke-width="2.5"/><rect x="50" y="27" width="26" height="25" rx="7" fill="#ce7046" stroke="#253f41" stroke-width="2.5"/><path d="M64 51q13 40 45 71" fill="none" stroke="#253f41" stroke-width="2"/><path d="M103 108 86 133l40-14Z" fill="none" stroke="#253f41" stroke-width="2"/><g transform="translate(106 139) rotate(-20)"><path d="M-24-17v34h48v-34" fill="#eebc65" stroke="#253f41" stroke-width="2.5" stroke-linejoin="round"/><path d="M-28 21h56M-24 1h48" stroke="#253f41" stroke-width="2.5" stroke-linecap="round"/><circle cy="-16" r="8" fill="#edcda5"/><path d="M-9 0v-7q9-7 18 0v7" fill="#37796c"/><path d="M-11-18h22l-4-6H-7Z" fill="#253f41"/></g><path d="M21 111q-2 36 34 44" stroke="#8eaaa0" stroke-width="1.5" stroke-dasharray="4 5" fill="none"/></svg>`;
export function panelMarkup(kind, { sim, saved, soundOn, showGhost, attempt, newRecord }) {
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
  else if (kind === 'routes')
    return `${closeButton}<h2 id="dialogTitle">Local routes.<br>Questionable connections.</h2>
<p>Seven fares and a practice yard. Every route is open from the start.</p>
<div class="route-list">${levels.map((l, i) => `<button class="route-button ${i === sim.index ? 'current' : ''}" data-route="${i}">
<span class="number">${l.practice ? '∞' : String(i + 1).padStart(2, '0')}</span>
<strong>${l.name}</strong>
<p>${l.sub}</p>
<small>${l.practice ? 'FREE PRACTICE' : saved.best[i] ? 'BEST ' + fmt(saved.best[i].time) : 'NO COMPLETED SERVICE'}</small>
</button>`).join('')}</div>
<div class="note">Personal bests and ghosts stay in this browser when storage is available. No accounts. No network.</div>`;
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
<p>Bring the cabin onto the highlighted landing strip, reasonably upright and below 0.7 m/s. A short progress bar shows boarding. After a little over half a second, people get on or off. No extra button.</p>
<p>The cabin carries two people. Each adds mass. Different tickets can have different destinations; consult the bottom instrument panel.</p>
<h3>Make the swing work for you</h3>
<p>Start braking before the cabin reaches its destination. To catch a swing, move the engine in the direction the cabin is travelling, then ease both to a stop. A shorter cable fits through tighter routes; a longer one reaches under eaves and into shafts.</p>
</div>
</div>
<h3>What is actually simulated?</h3>
<p>The engine and cabin are separate rotating bodies. Twenty-four tension-only cable links can go slack and contact the scenery, including at their midpoints. Rotor forces act on the engine alone. A powered winch changes cable length; modest air drag acts on everything. Contact and cable constraints use a fixed 240 Hz numerical approximation. There is no direct “cancel swing” force on the cabin.</p>
<div class="note">Gentle bumps are fine. Hard impacts cost integrity; water or leaving the service area ends the run. Practice mode ignores impact damage. Routes are short, and restarts are unlimited.</div>
<div class="actions">
<button class="primary" data-action="close">Back to the rig</button>
<button data-action="sound">${soundOn ? 'Turn sound off' : 'Turn sound on'}</button>
<button data-action="ghost">${showGhost ? 'Hide ghost' : 'Show ghost'}</button>
</div>`;
  else if (kind === 'pause')
    return `${closeButton}<h2 id="dialogTitle">Service suspended.</h2>
<p class="lead">The passengers appreciate this unusually steady moment.</p>
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
    const grade = sim.time <= sim.level.gold ? 'Express service' : sim.time <= sim.level.silver ? 'Right on schedule' : 'Everyone arrived';
    return `<h2 id="dialogTitle">${grade}.</h2>
<p class="lead">All fares delivered. Nobody had to finish the journey on foot.</p>
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
<span>Happy fares</span>
</div>
</div>
<p>Express target: ${fmt(sim.level.gold)}. Your best run is available as a ghost on the next attempt.</p>
<div class="actions">
<button class="primary" data-action="${sim.index < 6 ? 'next' : 'routes'}">${sim.index < 6 ? 'Next route' : 'Choose a route'}</button>
<button data-action="restart">Chase the ghost · R</button>
</div>`;
  }
  throw new Error(`Unknown panel: ${kind}`);
}
