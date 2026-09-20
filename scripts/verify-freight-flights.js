import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { Sim } from '#game/physics';
import { DT, G, MAX_THRUST } from '#game/constants';
import { boilerPower, liftAt } from '#game/updrafts';
import { steer } from './flight-controls.js';

export const itineraries = [
  {route: 20, heights: [17, 17, 18], cable: 3.2},
  {route: 21, heights: [22, 17.5, 20], cable: 1.8},
  {route: 22, heights: [19, 19, 20], cable: 3.2},
  {route: 23, heights: [22, 22, 23], cable: 2.2, returnX: .3},
];

// Ordinary flight/winch inputs throughout. Each crossing spends height; each
// plume supplies a measurable climb. The timed route waits for visible pressure
// to rise before departing, rather than relying on an unseen early trigger.
export function flyFreightRoute(plan, observe = () => {}) {
  const s = new Sim(plan.route), sources = s.level.updrafts;
  const climb = sources.map(() => 0);
  let source = 0, phase = 'load', coldSeconds = 0, waited = 0, heavy = false, lightReturn = false;
  for (let i = 0; i < 150 / DT && !s.done && !s.failed; i++) {
    const b = sources[source], destination = s.pads[2];
    let input = {};
    if (phase === 'load') {
      if (s.onboard().length) phase = 'climb';
    } else if (phase === 'climb') {
      input = steer(s, b.x, plan.heights[source]);
      input.winch = s.targetLength > plan.cable + .01 ? -1 : 0;
      if (s.cabin.y > plan.heights[source] - .25 && Math.abs(s.cabin.x - b.x) < 1.2) {
        if (source === 2) phase = 'land';
        else {
          const next = sources[source + 1];
          if (boilerPower(next, s.time) > .35 && boilerPower(next, s.time + 4) > .95) {
            source++; phase = 'cross';
          } else waited += DT;
        }
      }
    } else if (phase === 'cross') {
      input = steer(s, b.x, plan.heights[source]);
      if (Math.abs(s.cabin.x - b.x) < 1.2) phase = 'climb';
    } else if (phase === 'land') {
      input = steer(s, destination.x, destination.y + .5);
      // Brake early: a heavy crate has little spare lift near the outlet.
      input.y = Math.max(input.y, -.2);
      if (s.delivered > 0 && !s.done) phase = 'return-up';
    } else if (phase === 'return-up') {
      input = steer(s, destination.x, 22);
      if (s.cabin.y > 21.75) phase = 'return';
    } else if (phase === 'return') {
      input = steer(s, plan.returnX, 22);
      if (Math.abs(s.cabin.x - plan.returnX) < .8 && Math.abs(s.cabin.vx) < .8) phase = 'return-down';
    } else if (phase === 'return-down') {
      // Land on the unheated end of the wide depot, outside the buoyant air.
      input = steer(s, plan.returnX, s.pads[0].y + .5);
    }
    const beforeY = s.cabin.y, loaded = s.onboard().some(j => j.cargo);
    s.step(input);
    assert.ok(s.thrust <= MAX_THRUST);
    if (loaded) {
      heavy ||= s.bodies.reduce((mass, body) => mass + body.m, 0) * G > MAX_THRUST;
      if (s.cabin.vy < -.5 && liftAt(sources, s.cabin.x, s.cabin.y, s.time) < 1) coldSeconds += DT;
      sources.forEach((source, index) => {
        if (liftAt([source], s.cabin.x, s.cabin.y, s.time) > source.force * .5)
          climb[index] += Math.max(0, s.cabin.y - beforeY);
      });
    }
    if (s.delivered && s.onboard().length === 2 && !loaded)
      lightReturn ||= s.bodies.reduce((mass, body) => mass + body.m, 0) * G < MAX_THRUST;
    observe(s, phase);
    s.events.length = 0;
  }
  assert.ok(s.done, `${s.level.name}: ${s.reason || 'did not finish within 150 seconds'}`);
  assert.equal(s.hull, 100, `${s.level.name}: expected a flight without damaging impacts`);
  assert.equal(s.delivered, s.jobs.length);
  assert.ok(heavy, 'freight must exceed the rotor force ceiling');
  assert.ok(coldSeconds > .2, 'crossings must include sinking through cold air');
  assert.ok(climb.every(height => height > 1.5), 'every plume must supply a loaded climb');
  if (sources.some(source => source.period)) assert.ok(waited > 1, 'the flight must wait for boiler pressure');
  if (plan.returnX !== undefined) {
    assert.ok(lightReturn, 'both mechanics must travel together after the heavy delivery');
    assert.equal(liftAt(sources, s.cabin.x, s.cabin.y, s.time), 0, 'return landing must use cold air');
  }
  return s;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  for (const plan of itineraries) {
    const s = flyFreightRoute(plan);
    console.log(`${s.level.name}: ${s.time.toFixed(2)} s, ${s.hull}% integrity, ${s.delivered} delivered, lift required`);
  }
}
