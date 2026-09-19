import { pad, block, BASE } from '#game/routes/shapes';

const moving = (x, y, name, w, vehicle, dx, dy, period, phase = 0) =>
  ({...pad(x, y, name, w), vehicle, motion: {dx, dy, period, phase}});
const fare = (from, to, name, color = '#bf6f42') => ({from, to, name, color});

/** One mechanic, six variations. Every moving stop is also a solid platform.
 * Keep these AFTER the original eight entries: their indices are saved IDs.
 */
export const movingRoutes = [
  {
    name: 'The stop is leaving',
    sub: 'The ferry has its own timetable.',
    hint: 'Collect Lumi from the ferry, then deliver to Island Post. Match the deck’s sideways speed as you land.',
    width: 34, height: 19, gold: 45, silver: 80, theme: 2, water: true,
    pads: [pad(3, 3, 'Quay', 4.5),
      moving(16, 1.8, 'Little Ferry', 4.8, 'ferry', 5, 0, 28),
      pad(30, 4.2, 'Island Post', 4.5)],
    terrain: [block(3, 3, 5.5, 'teal', -5), block(30, 4.2, 6, 'plaster', -5)],
    jobs: [fare(1, 2, 'Lumi')], start: 0, cable: 3.2,
    tip: 'Fly alongside the ferry, then lower the cabin. Boarding speed is measured relative to the deck.'
  },
  {
    name: 'Third floor, occasionally',
    sub: 'Your customer is between appointments. And floors.',
    hint: 'Pick up Tuuli from the construction lift. Follow its vertical motion, or catch it near a turning point.',
    width: 32, height: 24, gold: 50, silver: 85, theme: 1,
    pads: [pad(3, 2.5, 'Yard', 4.2),
      moving(14.5, 5.5, 'Works Lift', 4.2, 'lift', 0, 3, 20, -.25),
      pad(28, 8.5, 'Roof Garden', 4.5)],
    terrain: [...BASE(), block(3, 2.5, 5, 'teal'), block(28, 8.5, 5.5, 'brick')],
    jobs: [fare(1, 2, 'Tuuli', '#467d79')], start: 0, cable: 3.2,
    tip: 'The lift slows at each end. A deck rising beneath you can turn a soft landing into a hard one.'
  },
  {
    name: 'Mind the moving gap',
    sub: 'The railway declines to add another station.',
    hint: 'Collect the conductor from the shuttle wagon and take her to Signal House. Land while travelling with the train.',
    width: 39, height: 21, gold: 50, silver: 90, theme: 0,
    pads: [pad(3, 2, 'Goods Yard', 4.2),
      moving(20, 2.3, 'Shuttle Wagon', 3.4, 'train', 8, 0, 28, -.25),
      pad(35, 6.5, 'Signal House', 4.2)],
    terrain: [...BASE(), block(3, 2, 5, 'teal'), block(35, 6.5, 5, 'plaster')],
    jobs: [fare(1, 2, 'Raili', '#c88f3b')], start: 0, cable: 3.0,
    tip: 'Space limits engine speed. Release it when you need to keep pace with the shuttle.'
  },
  {
    name: 'Connections are approximate',
    sub: 'Neither boat is waiting for the other.',
    hint: 'Carry Ahti from Harbour Ferry to Island Ferry, then bring Saima back to Quay. Both boats keep moving.',
    width: 37, height: 20, gold: 65, silver: 115, theme: 2, water: true,
    pads: [pad(3, 3, 'Quay', 4.5),
      moving(13, 1.9, 'Harbour Ferry', 4.2, 'ferry', 3.3, 0, 19),
      moving(27, 2.5, 'Island Ferry', 4.0, 'ferry', 3.5, 0, 25, .25)],
    terrain: [block(3, 3, 5.5, 'teal', -5)],
    jobs: [fare(1, 2, 'Ahti'), fare(2, 0, 'Saima', '#467d79')],
    start: 0, cable: 3.3,
    tip: 'Use the route map to read both schedules. Time pauses while the map is open.'
  },
  {
    name: 'Catch the next lift',
    sub: 'A connection measured in metres per second.',
    hint: 'Take Ilma from Lower Lift to Upper Lift, then deliver Otso to Penthouse. The lifts run at different speeds.',
    width: 39, height: 28, gold: 80, silver: 135, theme: 1,
    pads: [pad(3, 2, 'Yard', 4.2),
      moving(12, 5.5, 'Lower Lift', 3.8, 'lift', 0, 3, 20, -.25),
      moving(25, 9.5, 'Upper Lift', 3.6, 'lift', 0, 3.5, 24, .25),
      pad(35, 10, 'Penthouse', 4.2)],
    terrain: [...BASE(), block(3, 2, 5, 'teal'), block(18.5, 7.5, 2, 'brick'),
      block(35, 10, 5, 'plaster')],
    jobs: [fare(1, 2, 'Ilma', '#c88f3b'), fare(2, 3, 'Otso', '#467d79')],
    start: 0, cable: 3.2,
    tip: 'Clear the chimney with the cabin. Keep enough height to meet Upper Lift on its next pass.'
  },
  {
    name: 'Last boat, first train',
    sub: 'Two seats. Three timetables. One very long evening.',
    hint: 'Collect from the ferry and wagon, deliver both to Evening School, then return the teacher to Quay. Two seats reward a shared trip.',
    width: 47, height: 25, gold: 105, silver: 175, theme: 2, water: true,
    pads: [pad(3, 3, 'Quay', 4.5),
      moving(13, 2, 'Late Ferry', 4.0, 'ferry', 3.5, 0, 22),
      moving(28, 3.5, 'School Shuttle', 3.8, 'train', 5, 0, 24, .25),
      pad(42, 8, 'Evening School', 4.5)],
    terrain: [block(3, 3, 5.5, 'teal', -5), block(28, 2.55, 15, 'teal', -5),
      block(42, 8, 6, 'brick', -5)],
    jobs: [fare(1, 3, 'Vieno'), fare(2, 3, 'Kasper', '#c88f3b'), fare(3, 0, 'Helmi', '#467d79')],
    start: 0, cable: 3.2,
    tip: 'Take both pupils together for a shortcut. The boats and trains repeat the same schedule on every restart.'
  }
].map(route => ({...route, collection: 'On the move'}));
