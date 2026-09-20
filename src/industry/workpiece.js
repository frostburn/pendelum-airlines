import { clamp } from '#game/math';

// Five cross-sections are enough for a visible permanent bend without adding a
// second particle solver. Rendering and both held/free collisions use this mesh.
export function blankSections(assembled = false) {
  return (assembled ? [-.55, -.275, 0, .275, .55] : [-.55, -.20, .15, .50, .85])
    .map(x => ({x, lo: -.35, hi: .32}));
}

export function machinedSections(piece) {
  return piece.sections.map((s, i) => {
    const trim = !piece.assembled && i > 0 && i < piece.sections.length - 1 ?
      Math.min(.085 * piece.cut, (s.hi - s.lo - .20) / 2) : 0;
    return {...s, lo: s.lo + trim, hi: s.hi - trim};
  });
}

export function pieceOutline(piece) {
  const s = machinedSections(piece);
  return [[s[0].x - .1, s[0].lo + .08], ...s.map(v => [v.x, v.lo]),
    [s.at(-1).x + .1, s.at(-1).lo + .08], [s.at(-1).x + .1, s.at(-1).hi - .08],
    ...s.slice().reverse().map(v => [v.x, v.hi]), [s[0].x - .1, s[0].hi - .08]];
}

export function pieceSamples(piece) {
  const sections = machinedSections(piece);
  const samples = sections.flatMap(s => [[s.x, s.lo + .10, .10], [s.x, s.hi - .10, .10]]);
  for (const s of [sections[0], sections.at(-1)])
    samples.push([s.x, (s.lo + s.hi) / 2, Math.min(.15, (s.hi - s.lo) / 2)]);
  return samples;
}

export function pieceBottom(piece) {
  const c = Math.cos(piece.a), s = Math.sin(piece.a);
  return piece.y + Math.min(...pieceSamples(piece).map(([x, y, r]) => x * s + y * c - r));
}

export function deformPiece(piece, contact, angle) {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const nx = ca * contact.nx + sa * contact.ny, ny = -sa * contact.nx + ca * contact.ny;
  // The struck end bends in the impact direction and gets thinner. Keep the
  // centre under the magnet intact; the projecting end takes most of the blow.
  const x = contact.lx - .20;
  for (const section of piece.sections) {
    const weight = Math.exp(-Math.pow((section.x - x) / .46, 2));
    const bend = .14 * weight;
    const middle = (section.lo + section.hi) / 2;
    const half = Math.max(.115, (section.hi - section.lo) / 2 - .055 * weight);
    const shift = clamp(middle + ny * bend, -.40, .35);
    section.x = clamp(section.x + nx * bend * .25, -.68, .98);
    section.lo = shift - half; section.hi = shift + half;
  }
  piece.colliders = pieceSamples(piece);
}
