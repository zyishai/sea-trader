import { Good } from "../catalog/goods.js";
import { Context } from "../context.js";
import { displayMonetaryValue } from "../format.js";
import { amountOf, fitsAboard, freeSpace, load, marginLeft, unload } from "../hold.js";
import { calculatePrice } from "../market/prices.js";
import { canAfford } from "../treasury.js";
import { accept, isWholeAmount, reject } from "./index.js";

export const OVERLOADED_NOTICE = [
  "Our ship is overloaded, Captain!",
  "This will reduce our speed and increase risk of damage to our ship.",
];

type Trade = { good: Good; quantity: number };

const notWhole = () => reject("invalidQuantity", ["Captain, we trade only in whole picul."]);

export const purchase = (context: Context, { good, quantity }: Trade) => {
  if (!isWholeAmount(quantity)) return notWhole();

  const cost = calculatePrice({ ...context, good, quantity });
  if (!canAfford(context, cost)) {
    return reject("notEnoughMoney", [
      `Captain, you don't have enough money. You need ${displayMonetaryValue(cost)} to purchase ${quantity} picul of ${good.toLowerCase()}`,
    ]);
  }
  if (fitsAboard(context.ship.hold, { overload: true }) < quantity) {
    return reject("noRoom", [
      `Captain, we don't have room in the hold for ${quantity} picul of ${good.toLowerCase()}.`,
      `We have room for ${freeSpace(context.ship.hold)} more picul (${marginLeft(context.ship.hold)} if we overload).`,
    ]);
  }

  const { hold, becameOverloaded } = load(context.ship.hold, good, quantity);
  return accept(
    { ...context, ship: { ...context.ship, hold }, balance: context.balance - cost },
    [
      `Purchased ${quantity} picul of ${good} for ${displayMonetaryValue(cost)}.`,
      `We have room for ${freeSpace(hold)} more picul, Captain.`,
    ],
    ...(becameOverloaded ? [OVERLOADED_NOTICE] : []),
  );
};

export const sell = (context: Context, { good, quantity }: Trade) => {
  if (!isWholeAmount(quantity)) return notWhole();
  if (amountOf(context.ship.hold, good) < quantity) {
    return reject("notEnoughCargo", [`Captain, we don't have enough ${good.toLowerCase()} in our hold.`]);
  }

  const income = calculatePrice({ ...context, good, quantity });
  const { hold } = unload(context.ship.hold, good, quantity);
  return accept({ ...context, ship: { ...context.ship, hold }, balance: context.balance + income }, [
    `Sold ${quantity} picul of ${good} for ${displayMonetaryValue(income)}.`,
    `We have room for ${freeSpace(hold)} more picul, Captain.`,
  ]);
};
