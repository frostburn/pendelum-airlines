/** Existing v1 saves use 20 Hz samples in integer millimetres/milliradians. */
export const GHOST_INTERVAL = 0.05;
export const MAX_GHOST_FRAMES = 24000;
export const POSE_SIZE = 16;
const QUANTIZATION = 1000;
export function encodePose(pose) {
  return pose.map(value => Math.round(value * QUANTIZATION));
}
export function validGhost(frames) {
  return Array.isArray(frames) && frames.length <= MAX_GHOST_FRAMES &&
    frames.every(frame => Array.isArray(frame) && frame.length === POSE_SIZE &&
      frame.every(Number.isFinite));
}
/** Angles stay unwrapped, so rotations interpolate continuously across turns. */
export function sampleGhost(frames, time) {
  if (!frames?.length || !Number.isFinite(time) || time < 0 ||
    time > frames.length * GHOST_INTERVAL)
    return null;
  const frame = time / GHOST_INTERVAL;
  const index = Math.min(frames.length - 1, Math.floor(frame));
  const fraction = Math.min(1, frame - index);
  const next = frames[Math.min(index + 1, frames.length - 1)];
  return frames[index].map((value, i) => (value + (next[i] - value) * fraction) / QUANTIZATION);
}
