import test from 'node:test';
import assert from 'node:assert/strict';

test('actual keyboard handlers rearm fire and demolition controls across held overview, pause and focus loss', async () => {
  // A minimal DOM event surface for the real main module. This exercises input
  // wiring and frame scheduling in Node; it makes no browser/layout claims.
  const noop = () => {}, nodes = new Map(), frames = [], storage = new Map();
  const ctx = new Proxy({measureText: text => ({width: text.length * 6}), createLinearGradient: () => ({addColorStop: noop})},
    {get: (target, key) => key in target ? target[key] : noop});
  class Element extends EventTarget {
    constructor() {
      super(); this.attributes = {}; this.style = {}; this.dataset = {}; this.value = ''; this.hidden = false;
      this.classList = {add: noop, remove: noop, toggle: noop};
    }
    matches() { return false; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name]; }
    setPointerCapture() {}
    getBoundingClientRect() { return {left: 0, top: 0, width: 390, height: 550}; }
    getContext() { return ctx; }
    querySelector(selector) { return node(selector); }
    querySelectorAll() { return []; }
    focus() { document.activeElement = this; }
  }
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, new Element());
    return nodes.get(selector);
  };
  const window = new Element(), document = new Element();
  window.devicePixelRatio = 1;
  document.querySelectorAll = selector => {
    if (selector === '[data-touch]') return ['in', 'out'].map(name => {
      const b = node(`[data-touch="${name}"]`); b.dataset.touch = name; return b;
    });
    if (selector === '[data-fire]') return ['aimUp', 'aimDown', 'flip', 'swap'].map(name => {
      const b = node(`[data-fire="${name}"]`); b.dataset.fire = name; return b;
    });
    return [];
  };
  const globals = {window, document, matchMedia: () => ({matches: false}),
    ResizeObserver: class {observe() {}}, requestAnimationFrame: fn => frames.push(fn),
    localStorage: {getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value)},
    setTimeout: () => 0, clearTimeout: noop};
  const previous = Object.fromEntries(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, {value, configurable: true, writable: true});
  try {
    await import('#game/main');
    let now = 100;
    const frame = () => { const queued = frames.splice(0); now += 1000 / 60; queued.forEach(fn => fn(now)); };
    const key = (code, down = true) => window.dispatchEvent(Object.assign(new Event(down ? 'keydown' : 'keyup', {cancelable: true}), {code, repeat: false}));
    const tap = code => { key(code); key(code, false); };
    const state = () => window.pendulum.state();
    const modes = {
      overview: {enter: () => key('KeyV'), leave: () => key('KeyV', false)},
      pause: {enter: () => tap('KeyP'), leave: () => tap('KeyP')},
      blur: {enter: () => window.dispatchEvent(new Event('blur')), leave: () => tap('KeyP')},
      hidden: {enter: () => { document.hidden = true; document.dispatchEvent(new Event('visibilitychange')); },
        leave: () => { document.hidden = false; document.dispatchEvent(new Event('visibilitychange')); tap('KeyP'); }}
    };
    for (const [name, mode] of Object.entries(modes)) for (const control of ['KeyL', 'KeyU']) {
      window.pendulum.load(48); frame();
      assert.equal(node('#fireControls').getAttribute('aria-label'), 'Fire appliance controls');
      assert.match(node('[data-fire="swap"]').getAttribute('aria-label'), /hose and bucket/);
      key(control); frame();
      assert.equal(control === 'KeyL' ? state().industry.facing : state().industry.tool, control === 'KeyL' ? -1 : 'ladle');
      mode.enter(); const stoppedAt = state().time;
      key(control, false); frame();
      assert.equal(state().time, stoppedAt, `${name} must freeze physics`);
      mode.leave(); key(control); frame();
      assert.equal(control === 'KeyL' ? state().industry.facing : state().industry.tool,
        control === 'KeyL' ? 1 : 'hose', `${name}: the first new press must work without an intervening release step`);
      key(control, false);
    }
    for (const [name, mode] of Object.entries(modes)) {
      window.pendulum.load(61); frame();
      assert.equal(node('#toolBtn').hidden, true);
      assert.equal(node('#fireControls').hidden, false);
      assert.equal(node('#fireControls').getAttribute('aria-label'), 'Demolition tool controls');
      assert.match(node('[data-fire="swap"]').getAttribute('aria-label'), /wrecking ball and magnet/);
      assert.equal(node('[data-fire="aimUp"]').hidden, true);
      assert.equal(node('[data-fire="swap"]').hidden, false);
      key('KeyU'); for (let i = 0; i < 7; i++) frame();
      assert.equal(state().industry.tool, 'hook');
      assert.equal(node('#toolBtn').hidden, false);
      mode.enter(); key('KeyU', false); frame(); mode.leave(); key('KeyU'); frame();
      assert.equal(state().industry.tool, 'ball', `${name}: demolition swap rearms`);
      key('KeyU', false); frame();
    }
    const swapButton = node('[data-fire="swap"]');
    swapButton.dispatchEvent(Object.assign(new Event('pointerdown', {cancelable: true}), {pointerId: 1})); frame();
    assert.equal(state().industry.tool, 'hook', 'the visible touch swap button operates demolition tools');
    swapButton.dispatchEvent(Object.assign(new Event('pointerup'), {pointerId: 1})); frame();

    window.pendulum.load(60); frame();
    assert.equal(node('#fireControls').hidden, true, 'ball-only jobs have no irrelevant tool controls');
    assert.equal(swapButton.hidden, true);
    key('KeyU'); frame();
    assert.equal(state().industry.tool, 'ball', 'ball-only jobs cannot exchange tools');
    key('KeyU', false);

  } finally {
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
