/**
 * Mulberry32 deterministic 32-bit pseudo-random number generator.
 * Produces identical floating-point sequences in [0, 1) across all platforms.
 *
 * @param {number} seed - Initial numeric seed
 * @returns {() => number} Generator returning uniform random float in [0, 1)
 */
export function createPRNG(seed = 42) {
  let s = (typeof seed === 'number' ? seed : 42) >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
