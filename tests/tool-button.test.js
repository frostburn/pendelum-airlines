import test from 'node:test';
import assert from 'node:assert/strict';
import { bindToolButton } from '#game/ui/tool-button';

function fixture() {
  const button = new EventTarget(), state = {active: false, pressed: false, allowed: true, flightKeys: new Set()};
  button.classList = {toggle: (_, value) => { state.pressed = value; }};
  button.setPointerCapture = () => {};
  const clear = bindToolButton(button, () => state.allowed, active => { state.active = active; });
  // Model the window listener receiving only events which can bubble past the button.
  for (const type of ['keydown', 'keyup']) button.addEventListener(type, e => {
    if (!e.cancelBubble) type === 'keydown' ? state.flightKeys.add(e.code) : state.flightKeys.delete(e.code);
  });
  const send = (type, properties = {}) => button.dispatchEvent(Object.assign(new Event(type, {cancelable: true}), properties));
  return {state, clear, send};
}

test('focused tool holds survive steering key releases and track Space and Enter separately', () => {
  const {state, send} = fixture();
  send('keydown', {code: 'Space'});
  send('keydown', {code: 'ArrowRight'}); send('keyup', {code: 'ArrowRight'});
  send('keyup', {code: 'KeyW'});
  assert.equal(state.active, true); assert.equal(state.pressed, true);
  send('keydown', {code: 'Enter'}); send('keyup', {code: 'Space'});
  assert.equal(state.active, true, 'Enter is still held');
  send('keyup', {code: 'Enter'});
  assert.equal(state.active, false); assert.equal(state.pressed, false);
});

test('pointer and keyboard holds do not release each other', () => {
  const {state, send} = fixture();
  send('keydown', {code: 'Space'}); send('pointerdown', {pointerId: 1});
  send('pointercancel', {pointerId: 1});
  assert.equal(state.active, true);
  send('pointerdown', {pointerId: 2}); send('keyup', {code: 'Space'});
  assert.equal(state.active, true);
  send('lostpointercapture', {pointerId: 2});
  assert.equal(state.active, false);
});

test('blur and reset clear every input, and paused controls cannot acquire a hold', () => {
  const {state, clear, send} = fixture();
  send('keydown', {code: 'Enter'}); send('pointerdown', {pointerId: 1});
  send('blur'); assert.equal(state.active, false);
  send('keydown', {code: 'Space'}); clear();
  send('pointerdown', {pointerId: 2}); send('pointerup', {pointerId: 2});
  assert.equal(state.active, false, 'reset must not resurrect a stale keyboard hold');
  state.allowed = false;
  send('keydown', {code: 'Space'}); send('pointerdown', {pointerId: 3});
  assert.equal(state.active, false);
});

test('button activation does not enable flight precision, while steering and key releases still reach the window', () => {
  const {state, send} = fixture();
  send('keydown', {code: 'Space'});
  assert.equal(state.active, true);
  assert.equal(state.flightKeys.has('Space'), false);
  send('keydown', {code: 'KeyW'});
  assert.equal(state.flightKeys.has('KeyW'), true);
  send('keyup', {code: 'KeyW'});
  assert.equal(state.flightKeys.has('KeyW'), false);
  assert.equal(state.active, true);
  // A key pressed before focus moved to the button must still be cleared.
  state.flightKeys.add('Space');
  send('keyup', {code: 'Space'});
  assert.equal(state.flightKeys.has('Space'), false);
  assert.equal(state.active, false);
});
