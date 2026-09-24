/** Handmade routes. All positions are in world metres, +y up.
 * Pads name their TOP surface; rectangles use their bottom-left corner.
 */
import { rect, pad, block, BASE } from '#game/routes/shapes';
import { movingRoutes } from '#game/routes/on-the-move';
import { guideRoutes } from '#game/routes/around-the-bend';
import { freightRoutes } from '#game/routes/heavy-lifting';
import { metalRoutes } from '#game/routes/metal-works';
import { fulfillmentRoutes } from '#game/routes/fulfillment';
import { fireRoutes } from '#game/routes/fire-service';
import { demolitionRoutes } from '#game/routes/controlled-demolition';
export const levels = [
  {
    name: 'First fare',
    sub: 'A small service between very small places.',
    hint: 'Land the cabin on Pine Stop, then carry your passenger to the Bell Tower.',
    width: 30,
    height: 16,
    gold: 36,
    silver: 60,
    theme: 0,
    pads: [pad(3, 1.5, 'Depot', 3.6), pad(12, 2.4, 'Pine Stop', 4.2), pad(25, 4, 'Bell Tower', 4.5)],
    terrain: [...BASE(), block(3, 1.5, 4.3, 'teal'), block(12, 2.4, 5, 'plaster'), block(25, 4, 5.5, 'brick')],
    jobs: [{
        from: 1,
        to: 2,
        name: 'Mara',
        color: '#bf6f42'
      }],
    start: 0,
    cable: 3.2,
    tip: 'Release the flight keys to steady the engine. The cabin keeps swinging.'
  },
  {
    name: 'We don’t stop at the roof',
    sub: 'The customer is under the eaves. Naturally.',
    hint: 'Keep the engine outside the canopy and swing or lower the cabin onto Balcony.',
    width: 34,
    height: 20,
    gold: 55,
    silver: 85,
    theme: 1,
    pads: [pad(3, 2, 'Depot'), pad(14.2, 4, 'Balcony', 5.4), pad(29, 5, 'Roof Garden', 4)],
    terrain: [...BASE(), block(3, 2, 4.3, 'teal'), block(14.6, 4, 7.2, 'brick'), rect(11.7, 7, 7, .6, 'roof'), rect(17.4, 4, 1.3, 3.05, 'brick'), block(29, 5, 5, 'teal')],
    jobs: [{
        from: 1,
        to: 2,
        name: 'Olli',
        color: '#467d79'
      }],
    start: 0,
    cable: 3.4,
    tip: 'E pays out cable. With the engine left of the eaves, let the cabin swing inward.'
  },
  {
    name: 'The chimney run',
    sub: 'A short cable is a very different machine.',
    hint: 'Pick up at Laundry, retract the cable, and take the high route past the chimneys.',
    width: 36,
    height: 23,
    gold: 60,
    silver: 95,
    theme: 0,
    pads: [pad(3, 2, 'Depot'), pad(8, 3, 'Laundry', 3.6), pad(31, 4, 'Observatory', 4.5)],
    terrain: [...BASE(), block(3, 2, 4, 'teal'), block(8, 3, 4.3, 'plaster'), block(15, 11.5, 3, 'brick'), block(22, 9, 2.8, 'brick'), block(31, 4, 5.5, 'teal')],
    jobs: [{
        from: 1,
        to: 2,
        name: 'Aino',
        color: '#c88f3b'
      }],
    start: 0,
    cable: 4.2,
    tip: 'Q reels in. Clear a chimney with the cabin, not just the rotors.'
  },
  {
    name: 'Basement service',
    sub: 'A helicopter is not a lift. This one disagrees.',
    hint: 'Lower the cabin into the narrow shaft. Your engine is wider than the opening.',
    width: 33,
    height: 23,
    gold: 75,
    silver: 115,
    theme: 1,
    pads: [pad(3.5, 2, 'Depot'), pad(15, 3.2, 'Lower Office', 1.75), pad(28, 5, 'Upper Office', 4)],
    terrain: [...BASE(), block(3.5, 2, 4.4, 'teal'), rect(10, 0, 4.075, 9.3, 'plaster'), rect(15.925, 0, 4.075, 9.3, 'plaster'), rect(14.075, 0, 1.85, 3.2, 'teal'), block(28, 5, 5, 'brick')],
    jobs: [{
        from: 1,
        to: 2,
        name: 'Eero',
        color: '#bf6f42'
      }],
    start: 0,
    cable: 3.2,
    tip: 'Hold Space for slower, more precise flight. Centre the engine over the shaft before lowering.'
  },
  {
    name: 'Two tickets, please',
    sub: 'Same bench. Twice the opinions.',
    hint: 'Two passengers board at Market. Drop each at the stop matching their ticket.',
    width: 40,
    height: 21,
    gold: 70,
    silver: 105,
    theme: 0,
    pads: [pad(3, 2, 'Depot'), pad(11, 3.5, 'Market', 4.5), pad(25, 6, 'Library', 4.4), pad(35, 3, 'Home', 4)],
    terrain: [...BASE(), block(3, 2, 4, 'teal'), block(11, 3.5, 5.5, 'brick'), block(18, 7.5, 2, 'plaster'), block(25, 6, 5.5, 'teal'), block(35, 3, 5, 'plaster')],
    jobs: [{
        from: 1,
        to: 2,
        name: 'Leena',
        color: '#467d79'
      }, {
        from: 1,
        to: 3,
        name: 'Niko',
        color: '#bf6f42'
      }],
    start: 0,
    cable: 3.5,
    tip: 'Each passenger adds real mass. The rotor compensates, but the swing still changes.'
  },
  {
    name: 'Crosswind connection',
    sub: 'The flags are not being dramatic.',
    hint: 'Carry your passenger across the open water. Watch the windsocks between the islands.',
    width: 42,
    height: 24,
    gold: 65,
    silver: 100,
    theme: 2,
    wind: true,
    water: true,
    pads: [pad(4, 3, 'Quay', 4), pad(9, 5, 'Lighthouse', 3.8), pad(35, 4, 'Island Post', 4.8)],
    terrain: [block(4, 3, 6, 'teal', -5), block(9, 5, 4.4, 'plaster', -5), block(22, 7, 2.4, 'brick', -5), block(35, 4, 7, 'teal', -5)],
    jobs: [{
        from: 1,
        to: 2,
        name: 'Sisu',
        color: '#c88f3b'
      }],
    start: 0,
    cable: 3.6,
    tip: 'Air acts on the engine, cable and cabin separately. Shortening the cable makes the crossing easier.'
  },
  {
    name: 'The last collection',
    sub: 'One more fare. Then one more.',
    hint: 'Collect at Arcade, deliver to Hill House, then bring the last passenger home to Depot.',
    width: 43,
    height: 23,
    gold: 110,
    silver: 170,
    theme: 1,
    pads: [pad(4, 2, 'Depot', 4), pad(15, 3.6, 'Arcade', 5.4), pad(35, 7, 'Hill House', 4.5)],
    terrain: [...BASE(), block(4, 2, 5, 'teal'), block(15, 3.6, 7, 'brick'), rect(12.2, 6.6, 6.4, .55, 'roof'), rect(17.6, 3.6, 1, 3.05, 'brick'), block(25, 11, 3.4, 'plaster'), block(35, 7, 6, 'teal')],
    jobs: [{
        from: 1,
        to: 2,
        name: 'Mira',
        color: '#bf6f42'
      }, {
        from: 2,
        to: 0,
        name: 'Vesa',
        color: '#467d79'
      }],
    start: 0,
    cable: 3.4,
    tip: 'Passengers board and leave automatically after a brief, gentle landing. Capacity: two.'
  },
  {
    name: 'Sunday service',
    sub: 'No timetable. No customers. No consequences.',
    hint: 'Practise landing, winding the cable, and catching a swing. There is no finish line.',
    width: 39,
    height: 23,
    gold: 0,
    silver: 0,
    theme: 0,
    practice: true,
    pads: [pad(4, 2, 'Hangar', 4.5), pad(15, 4, 'Awning', 3.2), pad(31, 8, 'High Stop', 5)],
    terrain: [...BASE(), block(4, 2, 6, 'teal'), block(15, 4, 6, 'brick'), rect(12.2, 7, 5.8, .5, 'roof'), rect(17.1, 4, .9, 3, 'brick'), block(24, 6, 2.5, 'plaster'), block(31, 8, 6.5, 'teal')],
    jobs: [],
    start: 0,
    cable: 3.4,
    tip: 'A good catch: move the engine toward the incoming cabin, then ease both to a stop.'
  },
  ...movingRoutes,
  ...guideRoutes,
  ...freightRoutes,
  ...metalRoutes,
  ...fulfillmentRoutes,
  ...fireRoutes,
  ...demolitionRoutes
];

// Array indices are persistent save IDs; never insert before an existing route.
export const worlds = [
  {name: 'Local service', short: 'Local', sub: 'First fares, moving stops, and a little guidance.', routes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 14, 15]},
  {name: 'Further afield', short: 'Away', sub: 'Trickier connections, cable guides, and heavy lifting.', routes: [10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 22, 23]},
  {name: 'Metal works', short: 'Metal', sub: 'Mine it. Melt it. Hit it. Make something useful.', routes: metalRoutes.map((_, i) => 24 + i)},
  {name: 'Fulfillment', short: 'Cargo', sub: 'Helpful staff. Inconvenient routines. Every parcel has a journey.', routes: fulfillmentRoutes.map((_, i) => 36 + i)},
  {name: 'Fire service', short: 'Fire', sub: 'A powerful hose. A familiar bucket. An entirely unsuitable aircraft.', routes: fireRoutes.map((_, i) => 48 + i)},
  {name: 'Controlled demolition', short: 'Demo', sub: 'Knock it down. Keep the useful bits. Mind the rebound.', routes: demolitionRoutes.map((_, i) => 60 + i)}
];
export const worldIndex = index => Math.max(0, worlds.findIndex(w => w.routes.includes(index)));
export const visibleRoutes = worlds.flatMap(w => w.routes);
export const serviceRoutes = visibleRoutes.filter(i => !levels[i].practice);
export const routeNumber = index => serviceRoutes.indexOf(index) + 1;
export const nextRoute = index => serviceRoutes.includes(index) ? serviceRoutes[serviceRoutes.indexOf(index) + 1] ?? null : null;
export const resumeRoute = index => visibleRoutes.includes(index) ? index : serviceRoutes[0];
