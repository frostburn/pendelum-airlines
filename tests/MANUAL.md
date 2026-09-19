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
4. Check all eight entries in the route picker. Board and deliver on First fare;
   restart and check the best-run ghost. Debug-assisted runs must not save records.
5. At a phone-sized viewport with touch enabled, use the thumb stick and both
   winch buttons. Releasing or cancelling a touch should release its control.
   Check that the game, instruments, and dialog buttons do not overflow sideways.
6. Toggle sound after a gesture. Pause and resume; the engine tone should fade.
   Block browser storage and reload: the game should remain playable.

Fullscreen availability, browser storage policy, and audio output are controlled
by the browser. Test Firefox and Safari explicitly before claiming compatibility.
