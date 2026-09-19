import { clamp } from '#game/math';
import { validGhost } from '#game/ghost';
// Keep the original key: hosted upgrades preserve records on the same origin.
export const STORAGE_KEY = 'pendulum-airlines-v1';
export const defaultSaved = () => ({
  best: {},
  last: 0,
  sound: false,
  ghost: true
});
export function parseSaved(raw, routeCount) {
  const saved = defaultSaved();
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data))
      return saved;
    saved.last = clamp(Math.floor(Number(data.last) || 0), 0, routeCount - 1);
    saved.sound = data.sound === true;
    saved.ghost = data.ghost !== false;
    if (data.best && typeof data.best === 'object' && !Array.isArray(data.best)) {
      for (const [key, best] of Object.entries(data.best)) {
        const index = Number(key);
        if (!Number.isInteger(index) || index < 0 || index >= routeCount ||
          String(index) !== key || !best || !Number.isFinite(best.time) ||
          best.time <= 0 || best.time > 3600 || !validGhost(best.ghost))
          continue;
        saved.best[key] = {
          time: best.time,
          hull: Number.isFinite(best.hull) ? clamp(best.hull, 0, 100) : 100,
          ghost: best.ghost,
        };
      }
    }
  }
  catch {
    /* A blocked store or damaged save must never block play. */
  }
  return saved;
}
/** Access to localStorage itself can throw; keep that inside the try blocks. */
export function createStore(routeCount, onError = () => {
}, getStorage = () => globalThis.localStorage) {
  let saved = defaultSaved();
  try {
    saved = parseSaved(getStorage().getItem(STORAGE_KEY), routeCount);
  }
  catch {
    /* Session-only mode. */
  }
  return {
    saved,
    persist() {
      try {
        getStorage().setItem(STORAGE_KEY, JSON.stringify(saved));
        return true;
      }
      catch {
        onError();
        return false;
      }
    },
  };
}
