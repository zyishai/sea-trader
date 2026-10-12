import { goods } from "../catalog/goods.js";
import { ports } from "../catalog/ports.js";
import { amountOf, fitsAboard, freeSpace, spaceUsed } from "../hold.js";
import { affordableUnits } from "../treasury.js";
import { Context } from "../types.js";
import { getMerchantTip } from "../utils.js";

export const marketView = (context: Context) => {
  const { hold } = context.ship;
  const prices = context.prices[context.currentPort];

  return {
    goods: goods.map((good) => {
      const affordable = affordableUnits(context, prices[good]);
      return {
        good,
        price: prices[good],
        inHold: amountOf(hold, good),
        maxBuy: {
          withinCapacity: Math.min(affordable, fitsAboard(hold, { overload: false })),
          withOverload: Math.min(affordable, fitsAboard(hold, { overload: true })),
        },
        maxSell: amountOf(hold, good),
      };
    }),
    priceList: ports.map((port) => ({
      port,
      prices: goods.map((good) => context.prices[port][good]),
    })),
    hold: { used: spaceUsed(hold), capacity: hold.capacity, free: freeSpace(hold) },
    merchantTip: getMerchantTip(context),
  };
};
