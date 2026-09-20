import { pad, block, BASE } from '#game/routes/shapes';

const guide = (x, y, r = .8) => ({x, y, r});
const fare = (from, to, name, color = '#bf6f42') => ({from, to, name, color});

/** Append-only saved IDs. Brass fairleads redirect the same physical cable;
 * every route also leaves room for a slower flight above the fittings.
 */
export const guideRoutes = [
  {
    name: 'A little guidance',
    sub: 'The council has installed a suggestion.',
    hint: 'Collect Alva at Workshop, then continue to Garden Post. Let the cable slide around the brass guide as the engine passes above it.',
    width: 35, height: 20, gold: 48, silver: 85, theme: 0,
    pads: [pad(3, 2, 'Depot', 4.2), pad(17, 2.5, 'Workshop', 4.5), pad(30, 4, 'Garden Post', 4.5)],
    terrain: [...BASE(), block(3, 2, 5, 'teal'), block(17, 2.5, 5.5, 'brick'), block(30, 4, 5.5, 'plaster')],
    guides: [guide(10, 5.5)], jobs: [fare(1, 2, 'Alva')], start: 0, cable: 3.2,
    tip: 'The brass rim is solid. Pass the engine above it; the cable can bend around it. Reel in gently or climb to lift the cabin clear.'
  },
  {
    name: 'An indirect approach',
    sub: 'A longer cable. A shorter argument.',
    hint: 'Collect from Low Office and deliver to High Office. With a long cable, the guide can support a bend while the engine continues across.',
    width: 36, height: 24, gold: 55, silver: 95, theme: 1,
    pads: [pad(3, 2, 'Yard', 4.2), pad(18, 2.2, 'Low Office', 4.4), pad(31, 8, 'High Office', 4.5)],
    terrain: [...BASE(), block(3, 2, 5, 'teal'), block(18, 2.2, 5.4, 'plaster'), block(31, 8, 5.5, 'brick')],
    guides: [guide(11, 7, .8)], jobs: [fare(1, 2, 'Eliel', '#467d79')], start: 0, cable: 5.4,
    tip: 'Q reels in and lifts the cabin around a guide. Leave space for the cabin itself to pass the rim.'
  },
  {
    name: 'Two points of contact',
    sub: 'One helpful fitting was apparently insufficient.',
    hint: 'Take both passengers from Junction to their separate stops. Two guides make this a lesson in letting go as well as catching.',
    width: 43, height: 24, gold: 80, silver: 125, theme: 0,
    pads: [pad(3, 2, 'Depot', 4.2), pad(16, 3, 'Junction', 4.5), pad(29, 4, 'Library', 4.4), pad(38, 6, 'Home', 4.2)],
    terrain: [...BASE(), block(3, 2, 5, 'teal'), block(16, 3, 5.5, 'brick'), block(29, 4, 5.5, 'teal'), block(38, 6, 5.2, 'plaster')],
    guides: [guide(9, 6.2), guide(23, 7.5, .8)],
    jobs: [fare(1, 2, 'Inari', '#c88f3b'), fare(1, 3, 'Kaarlo', '#467d79')], start: 0, cable: 4.2,
    tip: 'A guide redirects tension; it does not latch the cable. Lift the whole cabin above a rim to release it cleanly.'
  },
  {
    name: 'Reel around the chimney',
    sub: 'The maintenance department has left you a handle.',
    hint: 'Collect from Laundry, then take the cabin past the chimney to Clock House. Reel in at the brass guide for clearance.',
    width: 37, height: 25, gold: 65, silver: 105, theme: 1,
    pads: [pad(3, 2, 'Depot', 4.2), pad(10, 3, 'Laundry', 4.4), pad(32, 5, 'Clock House', 4.5)],
    terrain: [...BASE(), block(3, 2, 5, 'teal'), block(10, 3, 5.4, 'plaster'), block(21, 9, 2.2, 'brick'), block(32, 5, 5.5, 'teal')],
    guides: [guide(18.5, 10, .8)], jobs: [fare(1, 2, 'Taimi')], start: 0, cable: 5.8,
    tip: 'The guide gives the cable a smooth corner before the chimney. Reel in with Q and gain height before the cabin reaches the brickwork.'
  },
  {
    name: 'Guidance is not a timetable',
    sub: 'The fitting stays put. Your customer does not.',
    hint: 'Collect Vilho from Works Lift and deliver to Roof Garden. Clear the guide, then match the lift’s vertical speed.',
    width: 38, height: 25, gold: 65, silver: 110, theme: 1,
    pads: [pad(3, 2, 'Yard', 4.2), {...pad(18, 5, 'Works Lift', 4.2), vehicle: 'lift', hullDepth: .42,
      motion: {dx: 0, dy: 2.5, period: 22, phase: -.25}}, pad(33, 7, 'Roof Garden', 4.5)],
    terrain: [...BASE(), block(3, 2, 5, 'teal'), block(33, 7, 5.5, 'brick')],
    guides: [guide(10, 6.5, .8), guide(26, 10, .8)], jobs: [fare(1, 2, 'Vilho', '#c88f3b')], start: 0, cable: 4.2,
    tip: 'Finish sliding off the guide before descending to the lift. Its rails are behind the flight path; its deck is solid.'
  },
  {
    name: 'A roundabout way home',
    sub: 'Three fares. Two guides. The depot is still behind you.',
    hint: 'Take the passengers at Market and Reading Room to Evening School, then bring the teacher back to Depot. The guides work in both directions.',
    width: 48, height: 25, gold: 105, silver: 170, theme: 2,
    pads: [pad(3, 2.5, 'Depot', 4.5), pad(17, 3, 'Market', 4.5), pad(33, 4, 'Reading Room', 4.5), pad(43, 7, 'Evening School', 4.5)],
    terrain: [...BASE(), block(3, 2.5, 5.5, 'teal'), block(17, 3, 5.5, 'brick'), block(33, 4, 5.5, 'plaster'), block(43, 7, 5.5, 'teal')],
    guides: [guide(10, 6.5, .8), guide(25, 8, .8)],
    jobs: [fare(1, 3, 'Elsa'), fare(2, 3, 'Armas', '#c88f3b'), fare(3, 0, 'Aila', '#467d79')], start: 0, cable: 4.2,
    tip: 'Two seats save a trip. On the way home, try catching a guide from its other side—or climb above both for a clear run.'
  }
].map(route => ({...route, collection: 'Around the bend', hidden: true}));
