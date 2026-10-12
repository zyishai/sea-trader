import { offeredPicul, takeCargoOffer } from "../cargo-offer.js";
import { isOverloaded } from "../hold.js";
import { Context } from "../types.js";

export const cargoOfferView = (context: Context) => {
  const offer = context.cargoOffer ?? {};
  const prices = context.prices[context.currentPort];
  const all = takeCargoOffer(context.ship.hold, offer, prices, { overload: true });
  const fitting = takeCargoOffer(context.ship.hold, offer, prices, { overload: false });

  return {
    offered: offeredPicul(offer),
    takeAll: { picul: all.takenPicul, overloads: isOverloaded(all.hold) },
    takeFitting: { picul: fitting.takenPicul },
  };
};
