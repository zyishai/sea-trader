import { Good } from "./catalog/goods.js";
import { Hold, load } from "./hold.js";

export type CargoOffer = Partial<Record<Good, number>>;

export const offeredPicul = (offer: CargoOffer) => Object.values(offer).reduce((sum, picul) => sum + picul, 0);

export const takeCargoOffer = (
  hold: Hold,
  offer: CargoOffer,
  prices: Record<Good, number>,
  { overload }: { overload: boolean },
) =>
  (Object.entries(offer) as [Good, number][])
    .sort(([a], [b]) => prices[b] - prices[a])
    .reduce(
      (result, [good, picul]) => {
        const { hold, loaded, leftBehind } = load(result.hold, good, picul, { overload });
        return {
          hold,
          taken: loaded > 0 ? [...result.taken, [good, loaded] as [Good, number]] : result.taken,
          takenPicul: result.takenPicul + loaded,
          leftBehind: result.leftBehind + leftBehind,
        };
      },
      { hold, taken: [] as [Good, number][], takenPicul: 0, leftBehind: 0 },
    );

export const needsCaptainsChoice = (hold: Hold, offer: CargoOffer, prices: Record<Good, number>) => {
  const fitting = takeCargoOffer(hold, offer, prices, { overload: false });
  const all = takeCargoOffer(hold, offer, prices, { overload: true });
  return fitting.leftBehind > 0 && all.takenPicul > fitting.takenPicul;
};
