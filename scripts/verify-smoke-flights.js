import { flyMetalRoute } from './verify-metal-flights.js';
import { flyLogisticsRoute } from './verify-logistics-flights.js';
import { flyDemolitionRoute } from './verify-demolition-flights.js';
import { flyFireRoute } from './verify-fire-flights.js';

// Keep routine CI representative and bounded as worlds grow. These use the
// full witnesses and their assertions; only the route selection is smaller.
// Every route and the extra handling variants remain in npm run test:flights.
const flights = [
  () => flyMetalRoute(24), // Ore collection and active magnet.
  () => flyMetalRoute(26), // Liquid handling and casting.
  () => flyMetalRoute(28), // Free cargo, hammer deformation and delivery.
  () => flyMetalRoute(32), // Multiple pieces, welding and finished delivery.
  () => flyLogisticsRoute(37, undefined, {snatch: true}), // Rack/forklift checkpoint.
  () => flyLogisticsRoute(39, undefined, {snatch: true}), // Moving trailer checkpoint.
  () => flyFireRoute(51), // Basin-floor refill, water retention and pouring.
  () => flyFireRoute(59), // Hose, sprinklers, moving cargo, spread and refills.
  () => flyDemolitionRoute(63), // A fallen floor delivers cargo the rotor cannot lift.
  () => flyDemolitionRoute(71), // Welded collapse, cradles, separation and two salvage deliveries.
];

for (const fly of flights) {
  const {sim, milliseconds} = fly();
  console.log(`${sim.level.name}: ${sim.time.toFixed(2)} s, ${sim.hull}% integrity; ${(milliseconds / 1000).toFixed(2)} s verification`);
}
