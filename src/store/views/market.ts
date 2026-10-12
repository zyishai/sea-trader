import { ports } from "../constants.js";
import { amountOf, fitsAboard, freeSpace, spaceUsed } from "../hold.js";
import { spendingPower } from "../treasury.js";
import { Context } from "../types.js";
import { getMerchantTip } from "../utils.js";

export const marketView = (context: Context) => {
  const { hold } = context.ship;
  const prices = context.prices[context.currentPort];

  return {
    goods: context.availableGoods.map((good) => {
      const affordable = Math.max(0, Math.floor(spendingPower(context) / prices[good]));
      return {
        good,
        price: prices[good],
        inHold: amountOf(hold, good),
        maxBuy: {
          withinCapacity: Math.min(affordable, fitsAboard(hold, good, { overload: false })),
          withOverload: Math.min(affordable, fitsAboard(hold, good, { overload: true })),
        },
        maxSell: amountOf(hold, good),
      };
    }),
    priceList: ports.map((port) => ({
      port,
      prices: context.availableGoods.map((good) => context.prices[port][good]),
    })),
    hold: { used: spaceUsed(hold), capacity: hold.capacity, free: freeSpace(hold) },
    merchantTip: getMerchantTip(context),
  };
};
