import { clamp } from '#game/math';

export function localPoint(body, x, y) {
  const c = Math.cos(body.a), s = Math.sin(body.a), dx = x - body.x, dy = y - body.y;
  return {x: dx * c + dy * s, y: -dx * s + dy * c};
}

export function worldPoint(body, x, y) {
  const c = Math.cos(body.a), s = Math.sin(body.a);
  return {x: body.x + x * c - y * s, y: body.y + x * s + y * c};
}

export function circleBox(x, y, r, box) {
  if (x + r <= box.x || x - r >= box.x + box.w || y + r <= box.y || y - r >= box.y + box.h) return null;
  const dx = x - clamp(x, box.x, box.x + box.w), dy = y - clamp(y, box.y, box.y + box.h);
  if (dx || dy) {
    const d = Math.hypot(dx, dy);
    return d < r ? {nx: dx / d, ny: dy / d, depth: r - d} : null;
  }
  const faces = [[x - box.x, -1, 0], [box.x + box.w - x, 1, 0],
    [y - box.y, 0, -1], [box.y + box.h - y, 0, 1]];
  const [d, nx, ny] = faces.reduce((a, b) => a[0] < b[0] ? a : b);
  return {nx, ny, depth: r + d};
}

// Broad phase is shared by grains and liquid. Visit neighbouring cells once,
// instead of allocating nine lookup keys for every grain on every iteration.
export function nearbyPairs(particles, cellSize, visit) {
  const cells = new Map();
  for (const p of particles) {
    const gx = Math.floor(p.x / cellSize), gy = Math.floor(p.y / cellSize), key = `${gx},${gy}`;
    if (!cells.has(key)) cells.set(key, {gx, gy, points: []});
    cells.get(key).points.push(p);
  }
  let candidates = 0;
  for (const {gx, gy, points} of cells.values()) {
    for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
      candidates++; visit(points[i], points[j]);
    }
    for (const [dx, dy] of [[0, 1], [1, -1], [1, 0], [1, 1]]) {
      const next = cells.get(`${gx + dx},${gy + dy}`);
      if (!next) continue;
      for (const a of points) for (const b of next.points) { candidates++; visit(a, b); }
    }
  }
  return candidates;
}
