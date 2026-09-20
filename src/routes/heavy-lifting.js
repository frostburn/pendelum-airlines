import { pad, block, BASE } from '#game/routes/shapes';

const freight = (from, to, name) => ({from, to, name, cargo: true, mass: 15, color: '#a97949'});
const boiler = (x, w, bottom, top, force = 50, cycle = {}) => ({x, w, bottom, top, force, ...cycle});

/** Freight weighs more than the rotor can support. These routes supply actual
 * lift, not just obstacles: gain height in the plumes and glide between them.
 */
export const freightRoutes = [
  {
    name: 'A piano is not hand luggage',
    sub: 'The music school has misunderstood the word portable.',
    hint: 'Load the piano at Depot. It is too heavy for the rotor alone. Climb inside the warm columns, then cross to Music School.',
    width: 33, height: 27, gold: 55, silver: 100, theme: 0,
    pads: [pad(5, 2, 'Depot', 5), pad(17, 2, 'Boiler Yard', 5), pad(27, 11, 'Music School', 5)],
    terrain: [...BASE(), block(5, 2, 6, 'teal'), block(17, 2, 6, 'brick'), block(27, 11, 6, 'plaster')],
    updrafts: [boiler(5, 8, 2.5, 23), boiler(17, 9, 2.5, 22), boiler(27, 8, 11.5, 25)],
    jobs: [freight(0, 2, 'Piano crate')], start: 0, cable: 3.2,
    tip: 'Wait for loading, then climb in the amber air. Outside it, a loaded rig sinks even at full throttle. Build height before crossing.'
  },
  {
    name: 'The cold stretch',
    sub: 'There is no boiler in the bit where you would like one.',
    hint: 'Deliver the printing press across two cold gaps. Use the tall first plume to bank height; the middle boiler cannot lift you as high.',
    width: 43, height: 30, gold: 75, silver: 120, theme: 2,
    pads: [pad(5, 3, 'Print Works', 5), pad(21, 2, 'Rest Roof', 5), pad(37, 8, 'Newspaper', 5)],
    terrain: [...BASE(), block(5, 3, 6, 'brick'), block(21, 2, 6, 'teal'), block(37, 8, 6, 'plaster')],
    updrafts: [boiler(5, 8, 3.5, 27), boiler(21, 8, 2.5, 22), boiler(37, 8, 8.5, 25)],
    jobs: [freight(0, 2, 'Printing press')], start: 0, cable: 4.8,
    tip: 'Reel in before the crossing so the cabin stays near the engine. A cold gap spends altitude; the next warm column lets you recover it.'
  },
  {
    name: 'Steam takes a break',
    sub: 'The boiler union insists on a cooling period.',
    hint: 'Carry the clock mechanism to Clock House. The middle boiler cycles on and off. Watch its pressure and leave the first plume when the next one is warming.',
    width: 40, height: 28, gold: 75, silver: 130, theme: 1,
    pads: [pad(5, 2, 'Workshop', 5), pad(19, 3, 'Boiler Yard', 5), pad(34, 10, 'Clock House', 5)],
    terrain: [...BASE(), block(5, 2, 6, 'teal'), block(19, 3, 6, 'brick'), block(34, 10, 6, 'plaster')],
    updrafts: [boiler(5, 8, 2.5, 25), boiler(19, 9, 3.5, 25, 55, {period: 26, phase: .4}), boiler(34, 8, 10.5, 27)],
    jobs: [freight(0, 2, 'Clock mechanism')], start: 0, cable: 3.2,
    tip: 'The pressure bars and rising arrows show the cycle. Wait in steady lift for the next boiler to warm. Pause freezes the boilers too.'
  },
  {
    name: 'The light way home',
    sub: 'Deliver the boiler part. Bring back the people who ordered it.',
    hint: 'Use the plumes to carry the replacement pump to Hill Works, then return both mechanics to Depot. Once the crate is unloaded, the rotor can support the taxi again.',
    width: 45, height: 29, gold: 95, silver: 150, theme: 0,
    pads: [pad(3, 2, 'Depot', 8), pad(21, 4, 'Foundry Roof', 5), pad(38, 12, 'Hill Works', 5)],
    terrain: [...BASE(), block(3, 2, 9, 'teal'), block(21, 4, 6, 'brick'), block(38, 12, 6, 'plaster')],
    updrafts: [boiler(6, 9, 2.5, 27), boiler(21, 9, 4.5, 27), boiler(38, 8, 12.5, 28)],
    jobs: [freight(0, 2, 'Replacement pump'), {from: 2, to: 0, name: 'Ilona', color: '#467d79'},
      {from: 2, to: 0, name: 'Sakari', color: '#c88f3b'}], start: 0, cable: 3.8,
    tip: 'Bring both mechanics home together. Hot air can carry the light cabin upward: descend in cold air and land at the unheated left end of Depot.'
  }
].map(route => ({...route, collection: 'Heavy lifting'}));
