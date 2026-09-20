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
4. Check all twenty entries in the route picker. Board and deliver on First fare;
   restart and check the best-run ghost. Debug-assisted runs must not save records.
5. At a phone-sized viewport with touch enabled, use the thumb stick and both
   winch buttons. Releasing or cancelling a touch should release its control.
   Check that the game, instruments, and dialog buttons do not overflow sideways.
6. Toggle sound after a gesture. Pause and resume; the engine tone should fade.
   Block browser storage and reload: the game should remain playable.

Fullscreen availability, browser storage policy, and audio output are controlled
by the browser. Test Firefox and Safari explicitly before claiming compatibility.

## On the move

1. In the route picker, confirm 19 numbered services and Sunday service last.
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

## Around the bend and stable skyline

1. Fly left and right across a route. Distant buildings should translate smoothly
   and keep their shape. Reverse direction and open/close the map; buildings should
   retain their identities. Repeat after resizing the window.
2. On A little guidance, fly gently toward the brass rim with the engine above it
   and cabin below. Watch the cable bend around the rim and its colour brighten.
   Climb or reel in gradually to pull the cabin clear, then continue to Workshop.
   The cable should release freely, with no extra button. Check the rim is solid
   to both bodies and the pale mounting supports can be flown through.
3. On An indirect approach, use the long cable and Q/E to try the same crossing.
   Reverse across a guide, pay out to make slack, and lift clear again. Pause and
   restart while touching it; neither action should leave a phantom attachment.
4. Complete Two points of contact with both passengers and try the chimney's
   guide in Reel around the chimney. Check that clearance includes the cabin.
5. On Guidance is not a timetable, release from the guide before settling on the
   moving lift. Complete A roundabout way home with a shared outward trip and a
   return fare. Check that Next route ends here; previous bests retain their IDs.
6. At phone and desktop sizes, inspect all six maps, guide labels, the route picker,
   and the help text. Repeat a completed guide route with its saved ghost.
