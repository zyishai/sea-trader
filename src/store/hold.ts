import { OVERLOAD_BUFFER } from "./constants.js";
import { Good } from "./types.js";

export type Hold = {
  cargo: Partial<Record<Good, number>>;
  capacity: number; // In picul
};

const overloadLimit = (hold: Hold) => Math.floor(hold.capacity * (1 + OVERLOAD_BUFFER));
const withAmount = (hold: Hold, good: Good, picul: number): Hold => {
  const { [good]: _, ...rest } = hold.cargo;
  return { ...hold, cargo: picul > 0 ? { ...rest, [good]: picul } : rest };
};

export const emptyHold = (capacity: number): Hold => ({ cargo: {}, capacity });
export const withCapacity = (hold: Hold, capacity: number): Hold => ({ ...hold, capacity });

export const amountOf = (hold: Hold, good: Good) => hold.cargo[good] ?? 0;
export const goodsAboard = (hold: Hold) =>
  (Object.entries(hold.cargo) as [Good, number][]).filter(([, picul]) => picul > 0);
export const spaceUsed = (hold: Hold) => goodsAboard(hold).reduce((sum, [, picul]) => sum + picul, 0);
export const freeSpace = (hold: Hold) => Math.max(0, hold.capacity - spaceUsed(hold));
export const marginLeft = (hold: Hold) => Math.max(0, overloadLimit(hold) - spaceUsed(hold));
export const isOverloaded = (hold: Hold) => spaceUsed(hold) > hold.capacity;
export const overloadLevel = (hold: Hold) =>
  Math.min(1, Math.max(0, spaceUsed(hold) - hold.capacity) / (overloadLimit(hold) - hold.capacity));
export const fitsAboard = (hold: Hold, { overload }: { overload: boolean }) =>
  overload ? marginLeft(hold) : freeSpace(hold);
export const value = (hold: Hold, prices: Record<Good, number>) =>
  goodsAboard(hold).reduce((sum, [good, picul]) => sum + prices[good] * picul, 0);

export const load = (hold: Hold, good: Good, picul: number, { overload } = { overload: true }) => {
  const loaded = Math.min(picul, fitsAboard(hold, { overload }));
  const newHold = withAmount(hold, good, amountOf(hold, good) + loaded);
  return {
    hold: newHold,
    loaded,
    leftBehind: picul - loaded,
    becameOverloaded: !isOverloaded(hold) && isOverloaded(newHold),
  };
};

export const unload = (hold: Hold, good: Good, picul: number) => {
  const unloaded = Math.min(picul, amountOf(hold, good));
  return { hold: withAmount(hold, good, amountOf(hold, good) - unloaded), unloaded };
};

export const unloadWhere = (hold: Hold, amountToUnload: (good: Good, picul: number) => number) =>
  goodsAboard(hold).reduce(
    (result, [good, picul]) => {
      const { hold, unloaded } = unload(result.hold, good, amountToUnload(good, picul));
      return unloaded > 0 ? { hold, unloaded: { ...result.unloaded, [good]: unloaded } } : result;
    },
    { hold, unloaded: {} as Partial<Record<Good, number>> },
  );
