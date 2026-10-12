export type Rng = {
  float(): number;
  int(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(list: readonly T[]): T | undefined;
};

const createRng = (next: () => number): Rng => ({
  float: next,
  int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
  chance: (probability) => next() < probability,
  pick: (list) => list[Math.floor(next() * list.length)],
});

export const mathRandomRng = createRng(Math.random);

// mulberry32: small, fast and good enough for game rolls
export const seededRng = (seed: number) => {
  let state = seed >>> 0;
  return createRng(() => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  });
};
