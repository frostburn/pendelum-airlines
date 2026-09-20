import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { Sim } from '#game/physics';
import { DT, N } from '#game/constants';
import { clamp } from '#game/math';
import { steer } from './flight-controls.js';

export const itineraries = [
  {route: 14, stops: [1, 2], guides: [0, null], cruise: 8},
  {route: 15, stops: [1, 2], guides: [0, null], cruise: 12},
  {route: 16, stops: [1, 2, 3], guides: [0, 1, null], cruise: 10},
  {route: 17, stops: [1, 2], guides: [null, 0], cruise: 12},
  {route: 18, stops: [1, 2], guides: [0, 1], cruise: 12},
  {route: 19, stops: [1, 2, 3, 0], guides: [0, 1, null, null], cruise: 12},
];

// Complete each fare via ordinary inputs, including sustained contact with
// every guide and a winch release. No teleporting or edits to simulation state.
export function flyGuideRoute(plan, observe = () => {}) {
  const s = new Sim(plan.route), contacts = s.guides.map(() => 0);
  let leg = 0, phase = plan.guides[0] !== null ? 'guide-up' : 'up';
  let holdX = s.cabin.x, contactTime = 0, shortest = s.length;
  for (let step = 0; step < 170 / DT && !s.done && !s.failed; step++) {
    const p = s.pads[plan.stops[leg]], g = s.guides[plan.guides[leg]];
    const altitude = Math.max(plan.cruise, p.y + 4);
    let u;
    if (phase === 'guide-up') {
      u = steer(s, holdX, g.y - 2.5, 0, 0, true);
      u.winch = s.targetLength < s.level.cable - .01 ? 1 : 0;
      if (s.cabin.y > g.y - 2.75 && Math.abs(s.length - s.level.cable) < .02)
        phase = 'approach';
    } else if (phase === 'approach') {
      u = steer(s, g.x - 2.2, g.y - 2.5, 0, 0, true);
      if (Math.abs(s.cabin.x - (g.x - 2.2)) < .25 && Math.abs(s.cabin.vx) < .25)
        phase = 'catch';
    } else if (phase === 'catch') {
      u = steer(s, g.x + 3, g.y - 2.5, 0, 0, true);
      if (contactTime > .5) phase = 'release';
    } else if (phase === 'release') {
      const e = s.engine;
      u = {x: clamp((1.2 * (g.x + 1.9 - e.x) - .3 * e.vx) / 5, -.16, .16),
        y: clamp(1.2 * (g.y + 2.8 - e.y) / 3.8, -.25, .25),
        winch: s.targetLength > 1.8 ? -.4 : 0};
      if (s.cabin.x > g.x + g.r + .9 && !s.guideContacts[plan.guides[leg]])
        phase = 'clear';
    } else if (phase === 'clear') {
      u = steer(s, g.x + 5, g.y + 2, 0, 0, true);
      if (s.cabin.x > g.x + 3) { phase = 'up'; holdX = s.cabin.x; }
    } else {
      if (phase === 'up' && s.cabin.y > altitude - .25) phase = 'across';
      if (phase === 'across' && Math.abs(s.cabin.x - p.x) < .7 &&
        Math.abs(s.cabin.vx - p.vx) < .7) phase = 'down';
      u = phase === 'up' ? steer(s, holdX, altitude) : phase === 'across' ?
        steer(s, p.x, altitude, p.vx) : steer(s, p.x, p.y + .5, p.vx, p.vy);
    }
    s.step(u);
    shortest = Math.min(shortest, s.length);
    if (g && s.guideContacts[plan.guides[leg]]) contactTime += DT;
    s.guideContacts.forEach((active, i) => { if (active) contacts[i] += DT; });
    // Check continuous link geometry, including between collision samples.
    // A small tolerance allows for the iterative solver's residual error.
    if (step % 12 === 0) for (const guide of s.guides) {
      for (let i = 0; i < N; i++) {
        const a = s.end(i), b = s.end(i + 1), dx = b.x - a.x, dy = b.y - a.y;
        const length2 = dx * dx + dy * dy;
        const t = length2 ? clamp(((guide.x - a.x) * dx + (guide.y - a.y) * dy) / length2, 0, 1) : 0;
        assert.ok(Math.hypot(a.x + t * dx - guide.x, a.y + t * dy - guide.y) >= guide.r - .025,
          `${s.level.name}: cable cut through a guide`);
      }
    }
    observe(s, phase);
    const served = s.events.some(e => e.type === 'board' || e.type === 'drop');
    s.events.length = 0;
    if (served && !s.done) {
      leg++; phase = plan.guides[leg] !== null ? 'guide-up' : 'up';
      holdX = s.cabin.x; contactTime = 0;
    }
  }
  assert.ok(s.done, `${s.level.name}: ${s.reason || 'did not finish within 170 seconds'}`);
  assert.equal(s.hull, 100, `${s.level.name}: expected a flight without damaging impacts`);
  assert.equal(s.delivered, s.jobs.length);
  assert.ok(contacts.every(seconds => seconds > .5), `${s.level.name}: every guide must carry the cable`);
  assert.ok(shortest < s.level.cable - 1, `${s.level.name}: the flight must exercise the winch`);
  assert.ok(s.guideContacts.every(active => !active), 'all guides must release before finishing');
  return s;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  for (const plan of itineraries) {
    const s = flyGuideRoute(plan);
    console.log(`${s.level.name}: ${s.time.toFixed(2)} s, ${s.hull}% integrity, ${s.delivered} delivered, all guides used`);
  }
}
