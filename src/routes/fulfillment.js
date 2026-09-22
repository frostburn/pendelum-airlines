import { rect, pad, block } from '#game/routes/shapes';

const parcel = (code, x, route, destination = 'dispatch', color = '#cc8250') => ({code, x, y: 1.65, route, destination, color});
const desk = (id, name, x, extra = {}) => ({id, name, short: name, kind: 'clerk', x, y: 1.2, dwell: 2.2, ...extra});
const dog = (id, name, x, dropX, dropY = 4.6, extra = {}) => ({id, name, short: name, kind: 'forklift', x, y: 1.2, dropX, dropY, ...extra});
const tug = (id, name, x, dropX, extra = {}) => ({id, name, short: name, kind: 'tug', x, y: 1.2, dropX, dropY: 1.2, ...extra});
const out = (x, name = 'Dispatch', id = 'dispatch', y = 1.2) => ({x, y, w: 4.5, name, id});
const tunnel = (x, end) => [rect(x, 3.05, end - x, .45, 'metal')];
function depot(spec) {
  const outputs = spec.outputs || [out(spec.width - 4)], stocks = spec.parcels.map(p => ({x: p.x, y: p.y}));
  return {collection: 'Fulfillment', theme: 1, height: 21, cable: 3.6, start: 0, gold: 100, silver: 175, ...spec,
    logistics: {workers: spec.workers, parcels: spec.parcels, outputs, scene: spec.scene || 'warehouse'},
    industry: {tool: 'hook', goal: 'logistics', stocks, rack: {x: 3, y: 1.2, w: 3.8}, output: outputs[0]},
    terrain: [rect(-12, -40, spec.width + 24, 40, 'earth'), block(3, 1.2, 4, 'metal'),
      ...stocks.map(p => block(p.x, 1.2, 2.4, 'metal')), ...outputs.map(o => block(o.x, o.y, o.w, 'metal')), ...(spec.terrain || [])],
    pads: [pad(3, 1.2, 'Air desk', 3.8), ...outputs.map(o => pad(o.x, o.y, o.name, o.w))],
    jobs: spec.parcels.map(p => ({from: 0, to: 1 + outputs.findIndex(o => o.id === p.destination), name: p.code, cargo: true}))};
}
export const fulfillmentRoutes = [
  depot({name: 'Please put it down', sub: 'The scanner cannot read your enthusiasm.', width: 32,
    hint: 'Take A1 to Bea’s counter. Set it down and hold J while she scans it, then collect it for Dispatch.',
    tip: 'All parcels have a steel handling plate. The magnet is on by default. Clerks need the parcel resting on their counter, with the magnet released.',
    workers: [desk('scan', 'Bea · intake', 17)], parcels: [parcel('A1', 8, ['scan'])]}),
  depot({name: 'A place for everything', sub: 'Yard Dog has already chosen the place.', width: 39,
    hint: 'Set A2 on Yard Dog’s forks. Let it lift and carry the parcel to its high-bay handoff, then collect it for Dispatch.',
    tip: 'Yard Dog follows low-hanging parcels in its loading bay. Its load is unsecured: grabbing the parcel mid-trip interrupts the job. The high handoff is where its inventory receipt is issued.',
    workers: [dog('store', 'Yard Dog', 15, 25)], parcels: [parcel('A2', 8, ['store'])]}),
  depot({name: 'Priority is a colour', sub: 'Both departments consider themselves first.', width: 49,
    hint: 'Red goes through Bea’s counter to Red dispatch. Blue goes through Ivo’s counter to Blue dispatch.',
    tip: 'Read the parcel code and route in the objective. The wrong clerk refuses it; a wrong address does not complete a delivery.',
    workers: [desk('red', 'Bea · red', 21), desk('blue', 'Ivo · blue', 31)],
    parcels: [parcel('R1', 8, ['red'], 'red'), parcel('B1', 13, ['blue'], 'blue', '#638f9e')],
    outputs: [out(41, 'Red dispatch', 'red'), out(46, 'Blue dispatch', 'blue')], gold: 160, silver: 240}),
  depot({name: 'Please remain on the pallet', sub: 'The tunnel was not designed for aviation.', width: 44,
    hint: 'Leave T1 on Mutt’s trailer. Fly over the loading tunnel and collect it at the other end after unloading.',
    tip: 'The route tug only drives when it has an accepted parcel. Let the trailer support it through the tunnel; lifting it off early cancels the transfer.',
    workers: [tug('haul', 'Mutt · route tug', 15, 31)], parcels: [parcel('T1', 8, ['haul'])], terrain: tunnel(19, 27), scene: 'yard'}),
  depot({name: 'Return to sender', sub: 'It has been returned to inventory. Again.', width: 49,
    hint: 'Yard Dog must retrieve the return from its intake and put it away. Collect it at the far end, bring it back to Ivo for a return label, then dispatch.',
    tip: 'The returns clerk insists on the inventory receipt first. Yard Dog will not bring a completed parcel back for you.',
    workers: [dog('stock', 'Yard Dog', 24, 35), desk('return', 'Ivo · returns', 15)], parcels: [parcel('RET', 8, ['stock', 'return'])], gold: 145, silver: 225}),
  depot({name: 'Two orders, one dog', sub: 'It will be with you shortly. At length.', width: 45,
    hint: 'Put both parcels through Yard Dog, one at a time. Collect each at the high handoff and send it to its own address.',
    tip: 'The forklift returns to its loading bay after you take the load. Do not leave the second parcel on its lane while it is away.',
    workers: [dog('store', 'Yard Dog', 21, 31)], parcels: [parcel('R2', 8, ['store'], 'red'), parcel('B2', 13, ['store'], 'blue', '#638f9e')],
    outputs: [out(38, 'Red dispatch', 'red'), out(43, 'Blue dispatch', 'blue')], gold: 180, silver: 290}),
  depot({name: 'Cross-dock diplomacy', sub: 'Neither colleague handles the bit in between.', width: 62,
    hint: 'Yard Dog puts X1 on its high handoff. Transfer it to Mutt’s trailer, wait for the tunnel run, then collect it for the outbound dock.',
    tip: 'Each worker completes one physical leg. You handle the transfer between their platforms. Both receipts are required at Dispatch.',
    workers: [dog('pick', 'Yard Dog', 15, 25), tug('haul', 'Mutt · linehaul', 35, 49)], parcels: [parcel('X1', 8, ['pick', 'haul'])],
    terrain: tunnel(39, 45), scene: 'yard', gold: 180, silver: 280}),
  depot({name: 'Nobody at reception', sub: 'Back in a moment. Several moments.', width: 49,
    hint: 'Mutt carries S1 to the local depot. Bring it to Sal’s reception counter for a signature, then leave it on the delivery shelf.',
    tip: 'Sal takes regular breaks. Leave the parcel on the counter: work resumes when Sal returns. Hovering with it still attached does not count.',
    workers: [tug('haul', 'Mutt · local run', 15, 27), desk('sign', 'Sal · reception', 37, {breakPeriod: 18, breakLength: 8, dwell: 3})],
    parcels: [parcel('S1', 8, ['haul', 'sign'])], terrain: tunnel(19, 23), outputs: [out(45, 'Delivery shelf')], scene: 'street', gold: 155, silver: 240}),
  depot({name: 'The manifest says otherwise', sub: 'Express is a position in the queue.', width: 50,
    hint: 'Mutt accepts EXPRESS before ECONOMY. Send each through the tunnel and collect it at the depot before loading the next.',
    tip: 'The tug’s NEXT sign names the accepted parcel. An out-of-order load must be lifted off and replaced; the driver will wait indefinitely.',
    workers: [tug('haul', 'Mutt · scheduled', 22, 36, {queue: ['EXP', 'ECO']})],
    parcels: [parcel('EXP', 13, ['haul']), parcel('ECO', 8, ['haul'], 'dispatch', '#638f9e')], terrain: tunnel(26, 32), scene: 'yard', gold: 175, silver: 270}),
  depot({name: 'The wrong depot', sub: 'Correctly filed under the wrong building.', width: 55,
    hint: 'Bea validates D1 at the east counter. Yard Dog then takes it west to the transfer shelf. Collect it there and fly back east for dispatch.',
    tip: 'The staff follow their own routes. Your parcel needs their recorded handoffs even when those routes make the journey longer.',
    workers: [desk('scan', 'Bea · regional', 20), dog('transfer', 'Yard Dog · transfer', 39, 28, 3.8)],
    parcels: [parcel('D1', 8, ['scan', 'transfer'])], scene: 'yard', gold: 160, silver: 245}),
  depot({name: 'The last metre', sub: 'Two doorsteps. One very long receipt.', width: 63,
    hint: 'Take both parcels through Mutt’s neighbourhood run and Sal’s signature counter. Deliver each to the matching doorstep.',
    tip: 'A signature belongs to the parcel, not the drone. Set each parcel down for Sal, then collect it and check its address.',
    workers: [tug('haul', 'Mutt · neighbourhood', 22, 37), desk('sign', 'Sal · concierge', 47)],
    parcels: [parcel('12A', 8, ['haul', 'sign'], 'a'), parcel('12B', 13, ['haul', 'sign'], 'b', '#638f9e')],
    terrain: tunnel(26, 33), outputs: [out(56, 'Door 12A', 'a', 2.8), out(61, 'Door 12B', 'b', 1.2)], scene: 'street', gold: 260, silver: 390}),
  depot({name: 'Overnight guarantee', sub: 'Everyone did their part. You did the gaps.', width: 78,
    hint: 'Move two orders through Yard Dog’s high-bay pick, Mutt’s linehaul, and Sal’s signature counter. Finish at their separate customer shelves.',
    tip: 'Plan around staff routines: release to hand off, collect after sign-off, and keep the next parcel out of a returning vehicle’s path.',
    workers: [dog('pick', 'Yard Dog', 21, 31), tug('haul', 'Mutt · overnight', 41, 54), desk('sign', 'Sal · late desk', 64, {breakPeriod: 22, breakLength: 7})],
    parcels: [parcel('N1', 8, ['pick', 'haul', 'sign'], 'a'), parcel('N2', 13, ['pick', 'haul', 'sign'], 'b', '#638f9e')],
    terrain: tunnel(45, 50), outputs: [out(71, 'Customer A', 'a'), out(76, 'Customer B', 'b')], scene: 'street', gold: 350, silver: 500})
];
