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
4. Check all three worlds and their twelve entries per page. Board and deliver on First fare;
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
   sufficiently fast impacts must still end the run. The double shift requires press order 1 → 2 → 1. Collect the bent
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
