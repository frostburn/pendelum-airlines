import { DT, MIN, MAX, VERSION } from '#game/constants';
import { clamp, fmt } from '#game/math';
import { levels, worlds, worldIndex, nextRoute, resumeRoute } from '#game/levels';
import { Sim } from '#game/physics';
import { physicsTests } from '#game/diagnostics';
import { createRenderer } from '#game/render/renderer';
import { C } from '#game/ui/theme';
import { panelMarkup } from '#game/ui/panels';
import { createStore } from '#game/storage';
import { createAudio } from '#game/audio';
import { GHOST_INTERVAL, MAX_GHOST_FRAMES, encodePose, sampleGhost } from '#game/ghost';
import { boilerPower } from '#game/updrafts';
const { $, $$ } = { $: s => document.querySelector(s), $$: s => [...document.querySelectorAll(s)] };
const canvas = $('#game'), view = $('#viewport');
const { saved, persist } = createStore(levels.length, () => toast('Browser storage is full or unavailable. This session still works.'));
saved.last = resumeRoute(saved.last);
let sim = new Sim(saved.last), attempt = 1, keys = new Set(), touch = { x: 0, y: 0, winch: 0, action: false }, mapHold = false, mapLatched = false, showGhost = saved.ghost;
let selectedWorld = worldIndex(sim.index);
let panel = 'intro', returnPanel = null, overTime = 0, record = [], lastRecorded = -1, newRecord = false;
let last = 0, acc = 0, uiAccumulator = 0, toastTimer = 0;
let soundOn = saved.sound;
const renderer = createRenderer(canvas, { reduced: matchMedia('(prefers-reduced-motion: reduce)').matches });
renderer.reset(sim);
const audio = createAudio();
function toast(text) {
  $('#toast').textContent = text;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3200);
}
function clearInput() {
  keys.clear();
  touch.x = touch.y = touch.winch = 0;
  touch.action = false;
  $('#toolBtn').classList.remove('pressed');
  mapHold = false;
  $('#joystick i').style.transform = '';
  $$('.touch-winch button').forEach(b => b.classList.remove('pressed'));
}
function startAudio() {
  if (soundOn && !audio.start())
    soundOn = false;
}
function tone(notes, volume) {
  if (soundOn) {
    startAudio();
    audio.tone(notes, volume);
  }
}
function toggleSound() {
  soundOn = !soundOn;
  saved.sound = soundOn;
  persist();
  if (soundOn)
    startAudio();
  updateUI();
}
function loadRoute(i, go = true) {
  sim = new Sim(clamp(Math.floor(i), 0, levels.length - 1));
  selectedWorld = worldIndex(sim.index);
  attempt++;
  record = [];
  lastRecorded = -1;
  newRecord = false;
  overTime = 0;
  acc = 0;
  clearInput();
  mapHold = mapLatched = false;
  saved.last = sim.index;
  persist();
  renderer.reset(sim);
  $('#cableSlider').value = sim.targetLength;
  panel = go ? null : 'intro';
  returnPanel = null;
  $('#modal').hidden = go;
  if (go)
    canvas.focus({ preventScroll: true });
  else
    showPanel('intro', false);
  updateUI();
}
function toggleGhost() {
  showGhost = !showGhost;
  saved.ghost = showGhost;
  persist();
  toast(showGhost ? (saved.best[sim.index] ? 'Best-run ghost on.' : 'Ghost on. Complete a route to record one.') : 'Best-run ghost off.');
}
function modalClose() {
  if (returnPanel) {
    const p = returnPanel;
    returnPanel = null;
    showPanel(p, false);
  }
  else if (sim.failed)
    showPanel('crash', false);
  else if (sim.done)
    showPanel('result', false);
  else {
    panel = null;
    $('#modal').hidden = true;
    clearInput();
    canvas.focus({ preventScroll: true });
  }
}
function showPanel(kind, remember = true) {
  if (remember) {
    returnPanel = panel;
  }
  panel = kind;
  clearInput();
  mapLatched = false;
  $('#modal').hidden = false;
  const d = $('#dialog');
  d.classList.toggle('wide', kind === 'routes' || kind === 'help');
  d.classList.toggle('world-picker', kind === 'routes');
  d.innerHTML = panelMarkup(kind, {
    sim,
    saved,
    soundOn,
    showGhost,
    attempt,
    newRecord,
    selectedWorld
  });
  requestAnimationFrame(() => d.querySelector('.primary,button')?.focus({ preventScroll: true }));
  updateUI();
}
$('#dialog').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b)
    return;
  startAudio();
  if (b.dataset.world !== undefined) {
    selectedWorld = Number(b.dataset.world);
    showPanel('routes', false);
    requestAnimationFrame(() => $('#dialog').querySelector(`[data-world="${selectedWorld}"]`)?.focus({preventScroll: true}));
    return;
  }
  if (b.dataset.route !== undefined) {
    loadRoute(Number(b.dataset.route));
    return;
  }
  switch (b.dataset.action) {
    case 'begin':
      panel = null;
      returnPanel = null;
      $('#modal').hidden = true;
      canvas.focus();
      break;
    case 'close':
      modalClose();
      break;
    case 'restart':
      loadRoute(sim.index);
      break;
    case 'next':
      loadRoute(nextRoute(sim.index) ?? sim.index);
      break;
    case 'routes':
      showPanel('routes');
      break;
    case 'sound':
      toggleSound();
      showPanel('help', false);
      break;
    case 'ghost':
      toggleGhost();
      showPanel('help', false);
      break;
  }
});
$('#routesBtn').onclick = () => showPanel('routes');
$('#restartBtn').onclick = () => loadRoute(sim.index);
$('#helpBtn').onclick = () => showPanel('help');
$('#pauseBtn').onclick = () => panel === 'pause' ? modalClose() : showPanel('pause');
$('#soundBtn').onclick = toggleSound;
$('#mapBtn').onclick = () => {
  if (!panel) {
    mapLatched = !mapLatched;
    clearInput();
    updateUI();
  }
};
function fullScreen() {
  if (document.fullscreenElement)
    document.exitFullscreen?.().catch(() => {
    });
  else
    document.documentElement.requestFullscreen?.().catch(() => toast('Full screen is not available here.'));
}
$('#fullscreenBtn').onclick = fullScreen;
$('#cableSlider').addEventListener('input', e => {
  sim.targetLength = Number(e.target.value);
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (!panel && !mapHold && !mapLatched)
    sim.targetLength = clamp(sim.targetLength + Math.sign(e.deltaY) * .25, MIN, MAX);
}, { passive: false });
canvas.addEventListener('pointerdown', () => {
  canvas.focus({ preventScroll: true });
  startAudio();
});
window.addEventListener('keydown', e => {
  const key = e.code;
  if (key === 'Tab' && panel) {
    const f = [...$('#dialog').querySelectorAll('button,input,[tabindex="0"]')].filter(x => !x.disabled), first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    }
    else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
    return;
  }
  if (e.target.matches('input') && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(key))
    return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyJ'].includes(key))
    e.preventDefault();
  if (!e.repeat) {
    if (key === 'KeyR') {
      e.preventDefault();
      loadRoute(sim.index);
      startAudio();
      return;
    }
    if (key === 'KeyM') {
      toggleSound();
      return;
    }
    if (key === 'KeyG') {
      toggleGhost();
      return;
    }
    if (key === 'KeyF') {
      fullScreen();
      return;
    }
    if (key === 'KeyH') {
      panel === 'help' ? modalClose() : showPanel('help');
      return;
    }
    if (key === 'Escape' || key === 'KeyP') {
      if (panel === 'intro') {
        showPanel('help');
      }
      else if (panel)
        modalClose();
      else if (mapLatched) {
        mapLatched = false;
      }
      else
        showPanel('pause');
      return;
    }
  }
  if (panel)
    return;
  if (key === 'KeyV')
    mapHold = true;
  keys.add(key);
  startAudio();
});
window.addEventListener('keyup', e => {
  keys.delete(e.code);
  if (e.code === 'KeyV')
    mapHold = false;
});
window.addEventListener('blur', () => {
  clearInput();
  if (!panel)
    showPanel('pause');
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInput();
    if (!panel)
      showPanel('pause');
  }
});
let joyPointer = null;
const joy = $('#joystick');
function moveJoy(e) {
  const r = joy.getBoundingClientRect(), dx = (e.clientX - r.left - r.width / 2) / 45, dy = (e.clientY - r.top - r.height / 2) / 45, m = Math.max(1, Math.hypot(dx, dy));
  touch.x = clamp(dx / m, -1, 1);
  touch.y = clamp(-dy / m, -1, 1);
  if (Math.abs(touch.x) < .09)
    touch.x = 0;
  if (Math.abs(touch.y) < .09)
    touch.y = 0;
  $('#joystick i').style.transform = `translate(${touch.x * 34}px,${-touch.y * 34}px)`;
}
joy.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (panel)
    return;
  joyPointer = e.pointerId;
  joy.setPointerCapture(e.pointerId);
  moveJoy(e);
  startAudio();
});
joy.addEventListener('pointermove', e => {
  if (e.pointerId === joyPointer)
    moveJoy(e);
});
function endJoy(e) {
  if (e.pointerId !== joyPointer)
    return;
  joyPointer = null;
  touch.x = touch.y = 0;
  $('#joystick i').style.transform = '';
}
joy.addEventListener('pointerup', endJoy);
joy.addEventListener('pointercancel', endJoy);
joy.addEventListener('lostpointercapture', endJoy);
$$('[data-touch]').forEach(b => {
  const release = () => {
    touch.winch = 0;
    b.classList.remove('pressed');
  };
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (panel)
      return;
    b.setPointerCapture(e.pointerId);
    touch.winch = b.dataset.touch === 'in' ? -1 : 1;
    b.classList.add('pressed');
  });
  b.addEventListener('pointerup', release);
  b.addEventListener('pointercancel', release);
  b.addEventListener('lostpointercapture', release);
});
const toolButton = $('#toolBtn');
const releaseTool = () => { touch.action = false; toolButton.classList.remove('pressed'); };
toolButton.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (panel || mapHold || mapLatched) return;
  toolButton.setPointerCapture(e.pointerId);
  touch.action = true;
  toolButton.classList.add('pressed');
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) toolButton.addEventListener(event, releaseTool);
toolButton.addEventListener('keydown', e => {
  if (['Space', 'Enter'].includes(e.code) && !panel) { e.preventDefault(); touch.action = true; }
});
toolButton.addEventListener('keyup', releaseTool);
toolButton.addEventListener('blur', releaseTool);
function inputs() {
  return {
    x: clamp((keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + touch.x, -1, 1),
    y: clamp((keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + touch.y, -1, 1),
    winch: (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0) + touch.winch,
    precision: keys.has('Space'),
    action: keys.has('KeyJ') || touch.action
  };
}
function events() {
  while (sim.events.length) {
    const ev = sim.events.shift();
    if (ev.type === 'machine') {
      tone([220, 330], .025);
      toast(ev.message);
    }
    else if (ev.type === 'board') {
      tone([440, 660]);
      toast(`${ev.job.name} aboard → ${sim.level.pads[ev.job.to].name}.`);
    }
    else if (ev.type === 'drop') {
      tone([523, 659, 784]);
      toast(`${ev.job.name} delivered. Thank you for flying Pendulum.`);
    }
    else if (ev.type === 'hit') {
      if (sim.hull < 35)
        toast('Easy on the cabin. Integrity is getting low.');
      tone([90], .025);
    }
    else if (ev.type === 'complete') {
      const prior = saved.best[sim.index];
      newRecord = !sim.assisted && (!prior || sim.time < prior.time);
      if (newRecord) {
        saved.best[sim.index] = { time: sim.time, hull: sim.hull, ghost: record.slice() };
        persist();
      }
      overTime = .8;
      tone([523, 659, 784, 1046]);
    }
    else if (ev.type === 'fail') {
      overTime = .6;
      tone([130, 98], .035);
    }
  }
}
function updateUI() {
  const wi = worldIndex(sim.index), world = worlds[wi];
  $('#routeNumber').textContent = `WORLD ${wi + 1} · ${world.name} · ${world.routes.indexOf(sim.index) + 1} / ${world.routes.length}`;
  $('#routeName').textContent = sim.level.name;
  $('#routeSub').textContent = sim.level.sub;
  $('#flightTip').textContent = sim.level.tip;
  $('#fareCounter span').textContent = sim.industry ? 'WORK ORDERS' : 'FARES DELIVERED';
  $('#fareCount').textContent = sim.level.practice ? '∞' : `${sim.delivered} / ${sim.jobs.length}`;
  $('#clock').textContent = fmt(sim.time);
  $('#bestTime').textContent = saved.best[sim.index] ? fmt(saved.best[sim.index].time) : '—';
  $('#cableReadout').textContent = sim.length.toFixed(2) + ' m';
  if (document.activeElement !== $('#cableSlider'))
    $('#cableSlider').value = sim.targetLength;
  $('#integrity').textContent = sim.level.practice || sim.industry ? '∞' : Math.ceil(sim.hull) + '%';
  $('#integrityBar').style.width = sim.hull + '%';
  $('#integrityBar').style.background = sim.hull < 35 ? '#bf5843' : sim.hull < 70 ? '#c68b43' : C.teal;
  const near = sim.pads.reduce((best, p) => Math.hypot(p.x - sim.cabin.x, p.y + .565 - sim.cabin.y) <
    Math.hypot(best.x - sim.cabin.x, best.y + .565 - sim.cabin.y) ? p : best);
  const onApproach = near.motion && Math.abs(near.x - sim.cabin.x) < near.w / 2 + 2 &&
    Math.abs(near.y + .565 - sim.cabin.y) < 4;
  $('#cabinSpeed').textContent = onApproach
    ? 'DECK Δ ' + Math.hypot(sim.cabin.vx - near.vx, sim.cabin.vy - near.vy).toFixed(1) + ' m/s'
    : (sim.industry ? 'TOOL ' : 'CABIN ') + Math.hypot(sim.cabin.vx, sim.cabin.vy).toFixed(1) + ' m/s';
  $('#cabinSpeed').title = onApproach ? 'Cabin speed relative to ' + near.name + '. Land below 0.7 m/s.' : 'Cabin speed through the world.';
  const aboard = sim.onboard(), targets = sim.targetStops();
  $('#ticketLabel').textContent = sim.level.practice ? 'Free practice' : sim.done ? 'Service complete' : aboard.some(j => j.cargo) ? 'HEAVY FREIGHT · USE UPDRAFTS' : aboard.length ? `${aboard.length} / 2 SEATS · DROP-OFF` : 'NEXT FARE · PICKUP';
  const cycling = sim.level.updrafts?.find(s => s.period);
  if (cycling && aboard.some(j => j.cargo)) {
    const pressure = boilerPower(cycling, sim.time);
    const rising = boilerPower(cycling, sim.time + .5) > pressure;
    $('#ticketLabel').textContent = `FREIGHT · BOILER ${Math.round(pressure * 100)}% ${pressure === 0 ? 'COLD' : pressure === 1 ? 'HOT' : rising ? '↑' : '↓'}`;
  }
  $('#objective').textContent = sim.level.practice ? 'Make a little room for the swing.' : sim.done ? 'All fares delivered.' : targets.map(i => sim.level.pads[i].name).join(' / ');
  $('#ticketDetail').textContent = sim.level.practice ? 'No damage from bumps. R resets the rig.' : sim.servicing >= 0 ? 'Hold the landing… boarding / drop-off in progress.' : aboard.length ? aboard.map(j => j.name + ' → ' + sim.level.pads[j.to].name).join(' · ') : sim.jobs.filter(j => j.state === 'waiting').map(j => j.name + ' at ' + sim.level.pads[j.from].name).join(' · ');
  $('#serviceBar').style.width = clamp(sim.service / .55 * 100, 0, 100) + '%';
  const toolButton = $('#toolBtn');
  toolButton.hidden = !sim.industry;
  if (sim.industry) {
    const work = sim.industry, order = work.order(sim);
    $('#ticketLabel').textContent = `METAL WORKS · ${(work.tool === 'hook' ? 'magnet' : work.tool).toUpperCase()}`;
    $('#objective').textContent = order.title;
    $('#ticketDetail').textContent = order.detail;
    $('#serviceBar').style.width = clamp(order.progress * 100, 0, 100) + '%';
    $('#flightTip').textContent = order.detail;
    toolButton.textContent = work.tool === 'ladle' ? 'Hold J · pour right' : 'Hold J · magnet off';
    toolButton.classList.toggle('pressed', work.action);
    toolButton.setAttribute('aria-pressed', String(work.action));
  }
  $('#mapLabel').hidden = !(mapHold || mapLatched);
  $('#mapBtn').classList.toggle('active', mapHold || mapLatched);
  $('#pauseBtn').textContent = panel === 'pause' ? 'Resume' : 'Pause';
  $('#soundBtn').textContent = soundOn ? 'Sound on' : 'Sound off';
  $('#soundBtn').setAttribute('aria-pressed', String(soundOn));
}
function resize() {
  const r = view.getBoundingClientRect();
  renderer.resize(r.width, r.height, window.devicePixelRatio || 1);
}
new ResizeObserver(resize).observe(view);
resize();
function advance(u) {
  if (sim.failed || sim.done)
    return;
  const ri = Math.floor(sim.time / GHOST_INTERVAL + 1e-6);
  if (ri > lastRecorded && record.length < MAX_GHOST_FRAMES) {
    record.push(encodePose(sim.pose()));
    lastRecorded = ri;
  }
  sim.step(u);
  events();
}
function frame(now) {
  const elapsed = last ? Math.min(.08, (now - last) / 1000) : 1 / 60;
  last = now;
  if (!panel && !mapHold && !mapLatched) {
    if (sim.done || sim.failed) {
      if (overTime > 0) {
        overTime -= elapsed;
        if (overTime <= 0)
          showPanel(sim.done ? 'result' : 'crash', false);
      }
    }
    else {
      acc += elapsed;
      const u = inputs();
      let steps = 0;
      while (acc >= DT && steps < 20) {
        advance(u);
        acc -= DT;
        steps++;
        if (sim.failed || sim.done) {
          acc = 0;
          break;
        }
      }
      if (steps === 20)
        acc = 0;
    }
  }
  else
    acc = 0;
  uiAccumulator += elapsed;
  if (uiAccumulator > .09) {
    uiAccumulator = 0;
    updateUI();
  }
  const stopped = !!panel || mapHold || mapLatched || sim.failed || sim.done;
  audio.update(soundOn && !stopped, sim.thrust);
  renderer.render(sim, {
    alpha: stopped ? 1 : acc / DT,
    elapsed,
    clock: now / 1000,
    map: mapHold || mapLatched,
    panel: !!panel,
    ghost: showGhost ? sampleGhost(saved.best[sim.index]?.ghost, sim.time) : null
  });
  requestAnimationFrame(frame);
}
// A small, documented console surface. Debug actions mark runs as assisted so
// personal bests and ghosts cannot be overwritten by a teleported test run.
window.pendulum = {
  version: VERSION,
  routes: levels.map((l, i) => ({ id: i, name: l.name, hidden: !!l.hidden })),
  state: () => sim.snapshot(),
  restart: () => loadRoute(sim.index),
  load: i => loadRoute(i),
  ghost: toggleGhost,
  physicsTests,
  debug: {
    view: () => renderer.view(),
    get sim() {
      sim.assisted = true;
      return sim;
    },
    step(seconds, input = {}) {
      sim.assisted = true;
      for (let i = 0; i < Math.round(seconds / DT) && !sim.done && !sim.failed; i++)
        advance(input);
      updateUI();
    },
    pause() {
      if (!panel)
        showPanel('pause');
    },
    setCable(m) {
      sim.assisted = true;
      sim.targetLength = clamp(m, MIN, MAX);
    },
    createSimulation: i => new Sim(i)
  },
};
console.info('%cPendulum Airlines%c — hello, curious pilot!', 'color:#37796c;font-weight:bold', 'color:inherit', 'Inspect pendulum.state(), pendulum.routes, pendulum.physicsTests(), or pendulum.debug. Debug stepping disables record saving for that run.');
showPanel('intro', false);
updateUI();
requestAnimationFrame(frame);
