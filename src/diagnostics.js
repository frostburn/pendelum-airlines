import { DT, MIN, MAX } from '#game/constants';
import { levels } from '#game/levels';
import { Sim, circleRect } from '#game/physics';
/** The same deterministic checks run in Node and the browser console. */
export function physicsTests({ log = true } = {}) {
  const results = [];
  const check = (name, f) => {
    try {
      if (f() === false)
        throw Error('Assertion failed');
      results.push({ test: name, pass: true });
    }
    catch (e) {
      results.push({ test: name, pass: false, error: e.message });
    }
  };
  const step = (s, sec, u = {}) => {
    for (let i = 0; i < Math.round(sec / DT); i++)
      s.step(u);
    return s;
  };
  check('Eight valid, stable spawn configurations', () => levels.every((_, i) => {
    const s = step(new Sim(i), .5);
    return !s.failed && s.hull === 100 && Number.isFinite(s.engine.y);
  }));
  check('Rotor control never edits cabin velocity', () => {
    const s = new Sim();
    s.cabin.vx = 2.5;
    s.cabin.vy = -1;
    s.controls({ x: 1, y: 1 });
    return s.cabin.vx === 2.5 && s.cabin.vy === -1;
  });
  check('Lift raises both engine and suspended cabin', () => {
    const s = new Sim(), y = s.cabin.y;
    step(s, 1.5, { y: 1 });
    return s.cabin.y > y + 2;
  });
  check('Released engine control leaves a swinging cabin', () => {
    const s = step(new Sim(), 1.8, { y: 1 });
    step(s, .9, { x: 1 });
    step(s, .7, {});
    return Math.abs(s.cabin.vx) > .4 || Math.abs(s.cabin.x - s.engine.x) > .3;
  });
  check('Winch pays out and stays bounded', () => {
    const s = new Sim(7);
    step(s, 4, { winch: 1, y: .3 });
    return s.length <= MAX + 1e-10 && s.targetLength === MAX;
  });
  check('Winch reels in and stays bounded', () => {
    const s = new Sim(7);
    step(s, 3, { winch: -1, y: .3 });
    return s.length >= MIN - 1e-10 && s.targetLength === MIN;
  });
  check('Slack cable never pushes the endpoints apart', () => {
    const s = new Sim(), a = s.end(0), n = s.nodes[0];
    n.x = a.x;
    n.y = a.y - .01;
    const x = s.engine.x, y = s.engine.y;
    s.constrain(0);
    return s.engine.x === x && s.engine.y === y;
  });
  check('Rectangle top collision has an upward normal', () => {
    const c = circleRect(1, 2.05, .1, {
      x: 0,
      y: 0,
      w: 2,
      h: 2
    });
    return c && c.ny > .999 && Math.abs(c.depth - .05) < 1e-8;
  });
  check('Cable particles collide with solid scenery', () => {
    const s = new Sim(), n = s.nodes[5];
    n.x = 3;
    n.y = 1.51;
    s.collideBody(n, true);
    return n.y >= 1.5429;
  });
  check('Fast fly-bys do not board passengers', () => {
    const s = new Sim();
    const p = s.level.pads[1];
    Object.assign(s.cabin, {
      x: p.x,
      y: p.y + .565,
      vx: 1.5,
      vy: 0,
      a: 0,
      w: 0
    });
    for (let i = 0; i < 240; i++)
      s.serviceStop();
    return s.jobs[0].state === 'waiting';
  });
  check('Gentle landing boards exactly once and adds mass', () => {
    const s = new Sim(), p = s.level.pads[1];
    Object.assign(s.cabin, {
      x: p.x,
      y: p.y + .565,
      vx: 0,
      vy: 0,
      a: 0,
      w: 0
    });
    for (let i = 0; i < 240; i++)
      s.serviceStop();
    return s.jobs[0].state === 'aboard' && s.cabin.m === 3.55 && s.stats.pickups === 1;
  });
  check('Two different tickets fit the two-seat cabin', () => {
    const s = new Sim(4), p = s.level.pads[1];
    Object.assign(s.cabin, {
      x: p.x,
      y: p.y + .565,
      vx: 0,
      vy: 0,
      a: 0,
      w: 0
    });
    for (let i = 0; i < 240; i++)
      s.serviceStop();
    return s.onboard().length === 2 && Math.abs(s.cabin.m - 4.6) < 1e-9;
  });
  check('Wrong stops do not discharge a fare', () => {
    const s = new Sim();
    s.jobs[0].state = 'aboard';
    const p = s.level.pads[0];
    Object.assign(s.cabin, {
      x: p.x,
      y: p.y + .565,
      vx: 0,
      vy: 0,
      a: 0,
      w: 0
    });
    for (let i = 0; i < 240; i++)
      s.serviceStop();
    return !s.done && s.jobs[0].state === 'aboard';
  });
  check('Correct drop-off finishes and removes payload', () => {
    const s = new Sim();
    s.jobs[0].state = 'aboard';
    s.setPayload();
    const p = s.level.pads[2];
    Object.assign(s.cabin, {
      x: p.x,
      y: p.y + .565,
      vx: 0,
      vy: 0,
      a: 0,
      w: 0
    });
    for (let i = 0; i < 240; i++)
      s.serviceStop();
    return s.done && s.delivered === 1 && s.cabin.m === 2.5;
  });
  check('Repeated fixed-step inputs reproduce the same state', () => {
    const a = new Sim(), b = new Sim();
    for (let i = 0; i < 600; i++) {
      const u = { x: i > 300 ? .35 : 0, y: i < 300 ? .5 : 0, winch: i > 400 ? -1 : 0 };
      a.step(u);
      b.step(u);
    }
    return JSON.stringify(a.snapshot()) === JSON.stringify(b.snapshot());
  });
  check('Water is an actual failure condition', () => {
    const s = new Sim(5);
    s.cabin.y = -2;
    s.step();
    return s.failed;
  });
  if (log)
    console.table(results);
  return { passed: results.filter(r => r.pass).length, total: results.length, results };
}
