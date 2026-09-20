import assert from 'node:assert/strict';
import { Sim } from '#game/physics';
import { DT } from '#game/constants';
import { clamp } from '#game/math';

// Playability witnesses, not a player aid. This controller only sends ordinary
// flight inputs. It never edits a body, the clock, cargo, damage, or a platform.
// The last itinerary exercises both seats and a drop-off/pickup at one stop.
const itineraries = [
  {route: 8, stops: [1, 2], cruise: 10},
  {route: 9, stops: [1, 2], cruise: 14},
  {route: 10, stops: [1, 2], cruise: 11},
  {route: 11, stops: [1, 2, 0], cruise: 10},
  {route: 12, stops: [1, 2, 3], cruise: 18},
  {route: 13, stops: [1, 2, 3, 0], cruise: 14},
];

function steer(s, x, y, vx = 0, vy = 0) {
  const e = s.engine, c = s.cabin;
  // Feedback from both masses damps the swing while following the stop.
  const tx = vx + 1.007 * (x - e.x) - .538 * (x - c.x) -
    .251 * (e.vx - vx) - .051 * (c.vx - vx);
  const ty = vy + 1.3 * (y + .92 + s.length - e.y);
  return {x: clamp(tx / 5, -1, 1), y: clamp(ty / 3.8, -1, 1)};
}

for (const {route, stops, cruise} of itineraries) {
  const s = new Sim(route);
  let leg = 0, phase = 'up', holdX = s.cabin.x;
  for (let step = 0; step < 120 / DT && !s.done && !s.failed; step++) {
    const p = s.pads[stops[leg]], altitude = Math.max(cruise, p.y + 4);
    if (phase === 'up' && s.cabin.y > altitude - .25) phase = 'across';
    if (phase === 'across' && Math.abs(s.cabin.x - p.x) < .7 &&
      Math.abs(s.cabin.vx - p.vx) < .7) phase = 'down';
    const input = phase === 'up' ? steer(s, holdX, altitude) :
      phase === 'across' ? steer(s, p.x, altitude, p.vx) : steer(s, p.x, p.y + .5, p.vx, p.vy);
    s.step(input);
    const served = s.events.some(e => e.type === 'board' || e.type === 'drop');
    s.events.length = 0;
    if (served && !s.done) {
      leg++;
      phase = 'up';
      holdX = s.cabin.x;
    }
  }
  assert.ok(s.done, `${s.level.name}: ${s.reason || 'did not finish within 120 seconds'}`);
  assert.equal(s.hull, 100, `${s.level.name}: expected a flight without damaging impacts`);
  assert.equal(s.delivered, s.jobs.length);
  console.log(`${s.level.name}: ${s.time.toFixed(2)} s, ${s.hull}% integrity, ${s.delivered} delivered`);
}
