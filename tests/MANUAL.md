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
4. Check all eighteen entries in the route picker. Board and deliver on First fare;
   restart and check the best-run ghost. Debug-assisted runs must not save records.
5. At a phone-sized viewport with touch enabled, use the thumb stick and both
   winch buttons. Releasing or cancelling a touch should release its control.
   Check that the game, instruments, and dialog buttons do not overflow sideways.
6. Toggle sound after a gesture. Pause and resume; the engine tone should fade.
   Block browser storage and reload: the game should remain playable.

Fullscreen availability, browser storage policy, and audio output are controlled
by the browser. Test Firefox and Safari explicitly before claiming compatibility.

## On the move

1. In the route picker, confirm 17 numbered services and Sunday service last.
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
   route names, the DECK Δ readout, and both columns of the route picker at desktop
   width and the single-column layout on a phone.

## Heavy lifting, route visibility, and stable skyline

1. Fly left and right across a route. Distant buildings should translate smoothly
   and keep their shape. Reverse direction and open/close the map; buildings should
   retain their identities. Repeat after resizing the window.
2. Confirm all six Around the bend entries are absent. Finish Last boat, first
   train: Next route must open A piano is not hand luggage. Next route ends after
   The light way home. Use `pendulum.load(14)` to load a hidden experiment, then
   reload the page: it should resume a visible route without losing any old records.
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

The hidden guide experiments remain available through `pendulum.load(14)` to
`pendulum.load(19)`. Their old collision, winch, and release checks can still be
run with `npm run test:guides`; they are not part of the public route sequence.
