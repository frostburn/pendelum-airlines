/** World metres, +y up. Pads name their top surface. */
export const rect = (x, y, w, h, style = 'plaster') => ({x, y, w, h, style});
export const pad = (x, y, name, w = 3.6) => ({x, y, name, w});
export const block = (x, top, w, style = 'plaster', bottom = 0) =>
  rect(x - w / 2, bottom, w, top - bottom, style);
export const BASE = () => [rect(-12, -5, 80, 5, 'earth')];
