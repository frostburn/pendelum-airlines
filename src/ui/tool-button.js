// Keep simultaneous activation keys and pointers independent. Releasing a
// steering key must not cancel a Space/Enter hold on the focused tool button.
export function bindToolButton(button, canUse, onChange) {
  const keys = new Set(), pointers = new Set();
  const activationKey = code => code === 'Space' || code === 'Enter';
  const update = () => {
    const active = keys.size > 0 || pointers.size > 0;
    button.classList.toggle('pressed', active);
    onChange(active);
  };
  const clear = () => { keys.clear(); pointers.clear(); update(); };
  button.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!canUse()) return;
    button.setPointerCapture(e.pointerId);
    pointers.add(e.pointerId); update();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    button.addEventListener(type, e => { pointers.delete(e.pointerId); update(); });
  button.addEventListener('keydown', e => {
    if (!activationKey(e.code) || !canUse()) return;
    e.preventDefault();
    keys.add(e.code); update();
  });
  button.addEventListener('keyup', e => {
    if (!activationKey(e.code)) return;
    keys.delete(e.code); update();
  });
  button.addEventListener('blur', clear);
  return clear;
}
