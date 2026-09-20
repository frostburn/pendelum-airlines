import test from 'node:test';
import assert from 'node:assert/strict';
import { bindToolButton } from '#game/ui/tool-button';

function fixture() {
  const button = new EventTarget(), state = {active: false, pressed: false, allowed: true};
  button.classList = {toggle: (_, value) => { state.pressed = value; }};
  button.setPointerCapture = () => {};
  const clear = bindToolButton(button, () => state.allowed, active => { state.active = active; });
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
