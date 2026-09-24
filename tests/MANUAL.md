# Browser smoke test

Run `npm run dev`, then repeat against `npm run preview` and a downloaded copy
of `dist/index.html`. Check the console for errors throughout.

1. Start the first fare. Hold W to lift; Q/E and the slider should change cable
   length. Fly with A/D, release to brake, and confirm the cabin still swings.
2. Hold V: the overview should appear and simulation time should stop. Release
   it to resume. Repeat with P, Help, and the route picker. R should reset the run.
3. Choose **The chimney run**, ascend, and move over the first tall chimney.
   Continue up until its base is below the viewport. The roof and upper facade
   should remain visible until their complete visual bounds leave the screen.
   Descend and repeat at another window size; there should be no pop-out/pop-in.
4. Check all six worlds and their twelve entries per page. Board and deliver on First fare;
   restart and check the best-run ghost. Debug-assisted runs must not save records.
5. At a phone-sized viewport with touch enabled, use the thumb stick and both
   winch buttons. Releasing or cancelling a touch should release its control.
   Check that the game, instruments, and dialog buttons do not overflow sideways.
6. Toggle sound after a gesture. Pause and resume; the engine tone should fade.
   Block browser storage and reload: the game should remain playable.

Fullscreen availability, browser storage policy, and audio output are controlled
by the browser. Test Firefox and Safari explicitly before claiming compatibility.

## On the move

1. In the route picker, confirm the first two worlds contain the original services, guides and practice yard.
   Finish The last collection: Next route should open The stop is leaving.
   Existing best times and ghosts should still belong to the same original routes.
2. On The stop is leaving, follow Little Ferry sideways and descend. DECK Δ should
   approach zero even when the cabin has substantial world speed. The rider, stop
   label, strip, and progress bar must move with the deck. Try landing while the
   cabin is stationary in the world; a passing deck must not count as a settled stop.
3. On Third floor, occasionally, board on a rising lift. Inspect contact from
   underneath and from the side as well. The solid deck should contact the cable.
4. On Mind the moving gap, check the wagon's wheels, rail, and reversal arrow.
   It should remain possible to keep pace with the train using ordinary controls.
5. On Connections are approximate, transfer a passenger onto Island Ferry and
   collect the return passenger in the same landing. On Last boat, first train,
   pick up both pupils before visiting Evening School, then return the teacher.
6. Open the map, pause, and Help for several seconds each. Moving decks must
   freeze with the rig, then resume at the same position. Restart and check that
   the deck starts at exactly the same point relative to a saved ghost.
7. At 390px width, reload into an expansion route, start immediately, and restart.
   Both the cabin and the rotor must be fully visible on the first frame. Check
   route names, the DECK Δ readout, and all twelve route tiles on each world screen, without scrolling.

## Heavy lifting, route visibility, and stable skyline

1. Fly left and right across a route. Distant buildings should translate smoothly
   and keep their shape. Reverse direction and open/close the map; buildings should
   retain their identities. Repeat after resizing the window.
2. Confirm Around the bend entries appear in the first two worlds. Next route
   crosses world boundaries and skips Sunday service. Finishing The light way home
   should lead into Metal works. Load an old guide best and ghost, then reload:
   the same saved route should resume without losing its record.
3. On A piano is not hand luggage, wait for the crate to load. It should render as
   a crate both on the platform and in the cabin, and the ticket label should show
   heavy freight. Climb in the amber air, cross into the next column, and brake
   early for delivery. Observe the loss of altitude in a cold gap despite throttle.
4. On The cold stretch, reel in and climb high before crossing. Both the engine
   and cabin must fit inside the warm air to get its full benefit. Inspect the
   plume limits in the route map; their art should match where the lift acts.
5. On Steam takes a break, wait in the steady first plume. The middle boiler starts
   cold, then warms. Confirm the ticket pressure readout, pressure bar, map label,
   and arrow colour agree. Pause and open the map: pressure and air animation
   must freeze. Restart and check the cycle repeats relative to the ghost.
6. On The light way home, deliver the pump and collect both mechanics in the same
   landing. The cabin should regain normal flight in cold air but float in hot
   air. Descend outside the first plume and land at the unheated left end of Depot.
7. At phone and desktop sizes, inspect all four maps, the freight/pressure ticket
   label, route picker, and help. Repeat a completed freight job with its ghost.

## Metal works and world pages

1. Check world selection at 390×844, 320×568, 844×390 and a desktop viewport.
   Every world has twelve selectable tiles on one screen, with no scrolling.
   Switch worlds by pointer and keyboard, and verify focus remains on the chosen
   world button. Best times and the current-route highlight stay with their IDs.
2. Without holding J, drag the magnet through each ore bed. Black grains collect; sand moves aside.
   Observe the mass and swing change. Hold J or the tool button over the hopper:
   grains should detach and fall, and only grains entering it should count.
3. Fill the ladle below the tap, then back out before climbing. Fly abruptly to
   slosh or spill. Hold J to tip over a mould; release to level the vessel. Inspect
   the connected liquid lobes, overflow, cooling, and the resulting physical ingot.
   Refill after a spill. Both moulds must be complete on the two-mould job.
4. Start a forging job: the magnet picks up without a tool key. Hold J and
   confirm the ingot falls; release J to pick it up again. X must do nothing.
   Use WASD with the left hand and J with the right, then try the on-screen button.
   Forge the ingot both while suspended and after leaving it loose on the anvil.
   There must be no anvil jaws or fixed cargo position. Each downstroke makes a
   permanent bend/dent, including in its collision outline, with a small recoil
   instead of flinging the metal. Pick up tilted pieces and toggle J repeatedly:
   neither object should snap or launch. With J held, the head should still push
   the metal; with J released, attraction should pull back on the head.
   Three good hits finish forging in either state; releasing or reattaching during
   one stroke must not count it twice. Misses, slow touches and blows to the bare
   magnet/engine alone must not count. The loose-piece counter must remain visible.
   Deliberately put the engine in the lane: damage must follow relative impact speed
   with the normal cooldown. Gentle frame bumps and overlap alone must not hurt;
   sufficiently fast impacts must still end the run. The double shift requires two hits at each press, in either order. Collect the bent
   ingot, finish any processing, and hold J to deliver it at Dispatch.
5. Maintain contact with the lathe and the left face of the belt. Confirm the
   moving surfaces pull the payload; shaping/polishing stops when contact ends.
   The workpiece changes profile and shine. An unfinished part cannot be dispatched.
6. Release each part onto a free welding-jig mark. A single part cannot fill two
   slots. On Three-part harmony, a dull part must be rejected and remain recoverable.
   After welding, pick up the assembly and release it on Dispatch to finish.
7. Finish each production-line job. After casting, land upright at the Tool rack
   to exchange the ladle. Pick up the casting from its mould. On The complete works,
   the waiting finished bracket should go straight to the jig after the casting.
8. Pause, map, restart, ghost, and save/reload should work on industrial jobs too.
   Machine cycles, liquids, cooling and welding freeze while paused. Hold and then
   cancel a tool-button touch; it must release, including after pausing or tabbing
   away. No industrial tool button should remain visible on passenger routes.

Guide contact, winch and release witnesses remain available via `npm run test:guides`.

9. Metal works has factory sheds, silos, pipe bridges, chimney stacks and gantry
   cranes instead of the town and hills. Fly both directions and change viewport
   size: silhouettes must not jump or change shape. Passenger worlds keep their town.

## Fulfillment staff and parcels

1. Open world four on desktop, portrait mobile and short landscape viewports.
   All twelve jobs and six world buttons fit; keyboard focus remains usable.
2. In Please put it down, hover with the parcel at Bea’s counter: no scan. Hold
   J to set it down; wait for the receipt and collect it. Try dispatching before
   scanning, then retry correctly. The parcel must remain recoverable.
3. Let Yard Dog lift and carry its load. Confirm the crate rests freely on its
   forks, and grabbing it before the internal scanner earns no credit. Let the dog return and
   retry. The scan must happen inside the rack. Snatch it beyond the guard while the dog is still moving; the receipt must survive. Check its load stays in view.
4. Let Mutt carry a parcel through the low tunnel while flying over it. Watch
   the trailer physically support the load; snatch it as soon as the whole parcel clears the guard. Parking is optional.
5. In Priority is a colour, try the wrong clerk and wrong address. Try flying through the guarded rack with the shortest cable: the front mesh blocks the drone, tool and cable. Flying a parcel over the rack must not grant a scan. In The
   manifest says otherwise, present ECO before EXP: the NEXT sign must explain
   the refusal. Put both parcels on the same deck: only the accepted one earns
   a scan. Complete a separate accepted trip for the other parcel.
6. Leave a parcel for Sal during a break; work must resume automatically.
   Complete returns and cross-dock jobs, checking each parcel’s receipt trail.
7. Complete The last metre and Overnight guarantee with both parcels. The
   delivery count advances separately and completion requires every address.
8. Pause while a worker is driving or scanning; motion and timers freeze.
   Restart resets workers, receipts, cargo, and queue order. View the map,
   resize, and pan between indoor racks and street frontages: geometry is stable.

9. In the final four jobs, bring a qualified parcel low near dispatch. Pip must
   pursue it and shove it through physical contact. Receipts survive and the
   parcel remains recoverable. Lure Pip west, fly high, then drop at the address.
   It must stop pursuing high cargo and ignore delivered or unprocessed parcels.
10. Tap a guard slowly with the magnet, then hit it fast while keeping the engine
    clear. Only the fast hit damages integrity, using the usual impact cooldown.


## Fire service

1. Open world five at desktop, 390×844, 320×568 and short landscape sizes.
   All twelve calls and six world buttons fit. Select a call and check its
   fire-specific briefing, counters, completion copy and controls.
2. Fly with WASD while aiming with I/K, turning with L and spraying with J.
   Turning reverses both jet and recoil; holding L must turn only once. Release
   J, refill above a blue basin, and check that the tank mass changes gradually.
   Rest on Tool rack, press U and test both directions of the tool exchange.
3. Use the on-screen aim, turn, swap and spray buttons together with the thumb
   stick. Cancel a pointer, lose focus, open Help and pause: no held tool input
   may survive. Use Space/Enter on a focused button, and release steering keys
   without interrupting the tool hold.
4. Land the bucket on the basin floor and verify it fills to 30/30. Try an angled
   dip and a moving scoop; a dry opening, an inverted bucket and a bucket outside
   the pool must not fill. Carry a full bucket for at least ten seconds. Pour and verify water remains
   airborne, can miss the target, and continues to fall. Dip for another load.
   Water left inside the bucket must not feed a header through its closed walls.
5. Shoot at a sheltered fire through its roof, then through the opening. Only
   the clear entry succeeds. Fill the rooftop header and watch its blue pipes
   supply actual sprinkler drops inside the sealed room. Empty headers stop.
6. Push the wheeled crate with the jet, follow it, and extinguish it. The crate
   remains solid to the rig. Fly into terrain gently and quickly: damage follows
   ordinary impact speed, with no invisible kill zone around fire.
7. On The warm way up, hover in rising air and extinguish its source; the lift
   fades. On The neighbour’s shed, wait for spread along all five stacks, wet a
   neighbouring stack, then finish the row. Its blue protection bar dries away
   and a still-burning neighbour can restart it. Completion requires all heat
   bars cold for two seconds. The finale needs multiple water loads.
8. Pause while spraying or pouring. Water, heat, sprinklers and fire animation
   must freeze. Restart twice and repeat inputs to check consistent behavior.
   Check old world records and ghosts still refer to the same routes.
9. Fly Both ends of the street using flight, J and L without I/K. Fly Under the
   eaves around the roofs to reach its opposing openings. Reach both shelves in
   Window of opportunity and check both fires remain visible on a phone.

Automated witnesses in `scripts/verify-fire-flights.js` fly all twelve calls using
normal controls, including bucket trips from the basin floor, sprinkler supply,
left-facing shots, water-driven cargo motion and refills. The street witness
never uses I/K. Unit tests cover momentum, finite supply, a normal basin landing
and loaded takeoff, tilted dipping, wall occlusion, liquid retention, spread,
input edges and render immutability.
These checks supplement the interactive browser checks above.


## Controlled demolition (world six)

1. At desktop, 390×844, 320×568 and short landscape sizes, check the six world
   tabs and twelve contract tiles fit without scrolling. Old bests and ghosts
   retain their route IDs.
2. Read the orange/blue connection legend, the current task and catch-bay marks.
   Swing at the wall brace; slow pushing and rotor collisions must not cut it.
   Its blue foot stays pinned as the wall falls. Falling steel can hurt the drone.
3. At a rack, press U or the on-screen swap control. Repeat after pause, overview
   and focus loss. The magnet is normally on; hold J to release. No swap while
   carrying a member or away from the rack.
4. In The roof is the door, detach both bolts, lift the roof onto its marked slab,
   then recover the motor through the opening. Pickup should not launch the rig.
5. Release the chutes in Gravity forwarding and Downstream consequences. Observe
   the heavy cargo sliding on the actual fallen beams, then settling in its bay.
6. Fold The frame remains before cutting its crossbar connections. Check that
   the crossbar can be lifted clear of the fallen legs.
7. In Under new management, pay out cable for the canopy swing; reel in and
   back out left with the recovered shutter. In Leave the facade, use a short
   cable to fit below the roof and raise the load before taking it out sideways.
8. In the finale, lower the connected bridge onto the two cradles, cut the middle
   splice with a downward ball strike, and deliver both numbered sections.
   Merely breaking the bearings must not finish the contract. Cut the splice
   before the catches in a separate attempt: the contract should fail immediately
   with an explanation, and the cut should still happen physically.
9. Watch on a phone during an approach: the rig and nearby target should stay
   visible. Pan the overview and fly back: scaffold and backdrop positions stay
   fixed. Restart resets every member, connection and delivery.
