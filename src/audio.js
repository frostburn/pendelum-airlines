/** Optional, gesture-started synthesis. No assets, network, or simulation input. */
export function createAudio() {
  let audio = null;
  function start() {
    try {
      if (!audio) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext)
          return false;
        const context = new AudioContext();
        const gain = context.createGain();
        gain.gain.value = 0;
        gain.connect(context.destination);
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 260;
        filter.Q.value = 0.65;
        filter.connect(gain);
        const oscillator = context.createOscillator();
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 70;
        oscillator.connect(filter);
        oscillator.start();
        audio = { context, gain, oscillator };
      }
      audio.context.resume().catch(() => {
      });
      return true;
    }
    catch {
      return false;
    }
  }
  function tone(notes, volume = 0.045) {
    if (!audio)
      return;
    const { context } = audio;
    notes.forEach((frequency, i) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime + i * 0.09;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(context.destination);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      oscillator.start(now);
      oscillator.stop(now + 0.25);
    });
  }
  function update(playing, thrust) {
    if (!audio)
      return;
    const { context, gain, oscillator } = audio;
    gain.gain.setTargetAtTime(playing ? 0.019 : 0, context.currentTime, 0.1);
    oscillator.frequency.setTargetAtTime(63 + thrust * 0.2, context.currentTime, 0.1);
  }
  return { start, tone, update };
}
