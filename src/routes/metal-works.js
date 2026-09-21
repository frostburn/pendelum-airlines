import { rect, pad, block } from '#game/routes/shapes';

function workshop(spec) {
  const width = spec.width || 36;
  const config = {tool: 'hook', rack: {x: 3, y: 1.2, w: 3.8}, output: {x: width - 4, y: 1.2, w: 4.4},
    goal: 'deliver', requires: {}, ...spec.work};
  const terrain = [rect(-12, -40, width + 24, 40, 'earth'), block(3, 1.2, 4.2, 'metal'),
    block(config.output.x, 1.2, 4.8, 'metal')];
  if (config.bin) {
    const b = config.bin;
    terrain.push(rect(b.x - b.w / 2, 0, b.w, b.y, 'metal'),
      rect(b.x - b.w / 2 - .18, b.y, .18, 1.1, 'metal'), rect(b.x + b.w / 2, b.y, .18, 1.1, 'metal'));
  }
  for (const m of config.molds || []) terrain.push(rect(m.x - m.w / 2, 0, m.w, m.y, 'metal'),
    rect(m.x - m.w / 2 - .14, m.y, .14, .65, 'metal'), rect(m.x + m.w / 2, m.y, .14, .65, 'metal'));
  for (const t of config.taps || []) terrain.push(rect(t.x - 2.75, 0, 1.7, 4.6, 'metal'), rect(t.x - 1.4, 4.2, 1.4, .2, 'metal'));
  for (const h of config.hammers || []) terrain.push(
    {...rect(h.x - 1.15, 0, 4.4, h.y, 'metal'), machine: 'anvil'},
    {...rect(h.x + 3.3, 0, .7, 9.3, 'metal'), hammerFrame: true}, {...rect(h.x + .65, 9.05, 3.35, .32, 'metal'), hammerFrame: true});
  for (const b of config.belts || []) terrain.push({...rect(b.x, b.y, .55, b.h, 'metal'), machine: 'belt', vy: -2.5});
  for (const p of config.stocks || []) terrain.push(block(p.x, p.y - .36, 2.3, 'metal'));
  if (config.jig) terrain.push(rect(config.jig.x - 2.4, 0, 4.8, config.jig.y, 'metal'));
  return {
    collection: 'Metal works', theme: 1, width, height: 19, cable: 3.6, start: 0,
    gold: spec.gold || 90, silver: spec.silver || 150,
    ...spec, industry: config, terrain: [...terrain, ...(spec.terrain || [])],
    pads: [pad(3, 1.2, 'Tool rack', 3.8), pad(config.output.x, 1.2, 'Dispatch', 4.4)],
    jobs: [{from: 0, to: 1, name: 'Work order', cargo: true}],
  };
}
const blank = {forge: 0, cut: 0, polish: 0};
const shaped = {forge: 3, cut: 1, polish: 0};
const finished = {forge: 3, cut: 1, polish: 1};
const mold = (x, capacity = 24) => ({x, y: 1.2, w: 2.4, capacity});
const hammer = (x, period = 5.2, phase = 0) => ({x, y: 1.2, period, phase});

export const metalRoutes = [
  workshop({
    name: 'A magnetic personality', sub: 'Sand is not on the purchase order.',
    hint: 'Drag the magnet through the ore bed. Carry black magnetite to the refinery hopper and hold J to drop it.',
    tip: 'The magnet is on by default. Hold J to switch it off and drop the load; release J to collect again. Only black grains count.',
    work: {tool: 'magnet', goal: 'ore', quota: 12, pits: [{x: 10, y: 0, w: 7, count: 108}], bin: {x: 23, y: .55, w: 4}},
    gold: 65, silver: 110
  }),
  workshop({
    name: 'Buried treasure, mostly sand', sub: 'A surprisingly lively pile of dirt.',
    hint: 'Sweep both ore beds and refine 36 grains. A full magnet carries 28; you will need more than one load.',
    tip: 'Pay out cable to rake a pile while the rotors stay clear. Sand pushes back; a loaded magnet swings with real extra mass.',
    width: 43, work: {tool: 'magnet', goal: 'ore', quota: 36,
      pits: [{x: 10, y: 0, w: 6, count: 84}, {x: 21, y: 0, w: 6, count: 84}], bin: {x: 33, y: .55, w: 4}},
    gold: 140, silver: 210
  }),
  workshop({
    name: 'Do not drink the orange', sub: 'One ladle. One mould. Several opportunities.',
    hint: 'Hold the upright ladle below the furnace tap to fill it. Move to the mould, then hold J to tip to the right.',
    tip: 'Collect at the glowing tap. Hold J to pour right; release to level the ladle. Spilled metal is lost, but the tap never runs out.',
    work: {tool: 'ladle', goal: 'cast', taps: [{x: 10, y: 4.1}], molds: [mold(23)]}, gold: 70, silver: 120
  }),
  workshop({
    name: 'Two moulds, one bad idea', sub: 'The second customer also wants metal.',
    hint: 'Cast two ingots. Pour only as much as each mould needs, return upright, and refill when necessary.',
    tip: 'Release J early to stop a pour. Each mould must fill and cool; splashing across its rim does not count.',
    width: 43, work: {tool: 'ladle', goal: 'cast', taps: [{x: 10, y: 4.1}], molds: [mold(23, 20), mold(33, 20)]},
    gold: 115, silver: 190
  }),
  workshop({
    name: 'The hammer has right of way', sub: 'Your workpiece is welcome. Your rotors are not.',
    hint: 'Bring the ingot under the hammer. Keep it on the magnet or hold J to leave it on the anvil. Three good hits will bend it into shape.',
    tip: 'The hammer knocks metal around, held or loose. Keep the flying bit clear, then collect the forged bar. Hold J at Dispatch.',
    work: {startPiece: blank, requires: {forge: 3}, hammers: [hammer(15)]}, gold: 65, silver: 110
  }),
  workshop({
    name: 'The double shift', sub: 'Left, right, left. Still only three blows.',
    hint: 'Take one hit at press 1, one at press 2, then return to press 1 for the final blow. Leave J released as you carry the bent bar.',
    tip: 'Red means the hammer is about to fall. Both held and loose workpieces count. Collect the bar after each hit, then fly over the frame to the next press.',
    width: 49, work: {startPiece: blank, requires: {forge: 3}, hammerOrder: [0, 1, 0], hammers: [hammer(14, 4.8), hammer(31, 4.2, .4)]},
    gold: 110, silver: 185
  }),
  workshop({
    name: 'A turn for the better', sub: 'The lathe would like to borrow your balance.',
    hint: 'Dangle the blank onto the spinning cutter. Maintain contact until its rough edges become a turned shaft, then deliver.',
    tip: 'The lathe pulls sideways while cutting. Counter the pull with the engine; a fly-by will only make a few chips.',
    work: {startPiece: {forge: 3, cut: 0, polish: 0}, requires: {cut: 1}, lathes: [{x: 16, y: 1.25, r: .8, spin: -3}]},
    gold: 60, silver: 105
  }),
  workshop({
    name: 'Against the grain', sub: 'Hold it there. No, there.',
    hint: 'Push the workpiece against the left side of the moving belt. Keep contact until it shines, then deliver it.',
    tip: 'The belt drags downward. Keep the rotors above the work and push sideways with the cable. The magnet stays on while you work. Hold J to release at Dispatch.',
    work: {startPiece: shaped, requires: {polish: 1}, belts: [{x: 18, y: 1.2, h: 3.7}]}, gold: 60, silver: 105
  }),
  workshop({
    name: 'Some assembly required', sub: 'The airline now ships in one piece.',
    hint: 'Pick up each part, set it on a free welding-jig mark, and hold J to drop it. Fetch the welded assembly and deliver.',
    tip: 'The magnet attracts and carries nearby parts automatically. Hold J to let go. The jig welds only after both separate pieces arrive.',
    width: 42, work: {stocks: [{x: 9, y: 1.56, ...finished}, {x: 17, y: 3.56, ...finished}],
      jig: {x: 28, y: 1.2, count: 2}, requires: {assembled: 2}}, gold: 100, silver: 165
  }),
  workshop({
    name: 'Three-part harmony', sub: 'The first two are waiting for the third.',
    hint: 'Polish three rough pieces, place each in the welding jig, then take the finished assembly to Dispatch.',
    tip: 'The jig rejects dull pieces on this order. Watch each part’s shine before releasing it onto a free mark.',
    width: 49, work: {stocks: [{x: 8, y: 1.56, ...shaped}, {x: 14, y: 3.56, ...shaped}, {x: 21, y: 1.56, ...shaped}],
      belts: [{x: 28, y: 1.2, h: 3.7}], jig: {x: 37, y: 1.2, count: 3, requires: {polish: 1}}, requires: {assembled: 3}},
    gold: 170, silver: 260
  }),
  workshop({
    name: 'From orange to shiny', sub: 'Please keep the entire factory attached.',
    hint: 'Cast an ingot. Return the empty ladle to the tool rack to exchange it for a workpiece magnet, then forge, turn, polish and deliver.',
    tip: 'Follow the work order. Return to the Tool rack after casting; the empty ladle changes there. The cast ingot is a real pickup.',
    width: 57, work: {tool: 'ladle', taps: [{x: 9, y: 4.1}], molds: [mold(17)],
      hammers: [hammer(27)], lathes: [{x: 38, y: 1.25, r: .8, spin: -3}], belts: [{x: 46, y: 1.2, h: 3.7}],
      requires: {forge: 3, cut: 1, polish: 1}}, gold: 160, silver: 250
  }),
  workshop({
    name: 'The complete works', sub: 'A flywheel, a bracket, and a very long day.',
    hint: 'Cast and machine a flywheel, polish it, and weld it to the waiting bracket. Deliver the assembly with your dignity intact.',
    tip: 'The jig needs one fully worked casting and the ready-made bracket. Mould → tool rack → forge → lathe → belt → welding jig.',
    width: 68, work: {tool: 'ladle', taps: [{x: 9, y: 4.1}], molds: [mold(17)], hammers: [hammer(27, 4.8)],
      lathes: [{x: 38, y: 1.25, r: .8, spin: -3}], belts: [{x: 46, y: 1.2, h: 3.7}],
      stocks: [{x: 52, y: 2.56, ...finished}], jig: {x: 58, y: 1.2, count: 2, requires: {forge: 3, cut: 1, polish: 1}},
      requires: {assembled: 2}}, gold: 215, silver: 330
  })
];
