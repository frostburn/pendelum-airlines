import { TAU } from '#game/constants';
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const wrap = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
export const fmt = t => {
  t = Math.max(0, t || 0);
  const cs = Math.floor(t * 100 + 1e-5);
  return Math.floor(cs / 6000) + ':' + String(Math.floor(cs / 100) % 60).padStart(2, '0') + '.' + String(cs % 100).padStart(2, '0');
};
