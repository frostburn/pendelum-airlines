const SPACING = 91;
const PARALLAX = 12;

/** Buildings have world-slot identities. Wrapping only their screen positions
 * while deriving shapes from screen slots makes the skyline jump at each wrap.
 */
export function cityBuildings(cameraX, width) {
  const offset = cameraX * PARALLAX;
  const first = Math.floor(offset / SPACING) - 2;
  const last = Math.ceil((offset + width) / SPACING) + 1;
  const buildings = [];
  for (let id = first; id <= last; id++) {
    buildings.push({id, x: id * SPACING - offset,
      h: 22 + (Math.sin(id * 8.2) + 1) * 34,
      w: 46 + (Math.cos(id * 7) + 1) * 12});
  }
  return buildings;
}
