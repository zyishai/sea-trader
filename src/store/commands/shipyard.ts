import { ShipStat } from "../catalog/vessels.js";
import { Context } from "../context.js";
import { MAX_GUARD_QUALITY, MAX_GUARD_SHIPS, calculateFleetUpgradeCost, calculateGuardShipCost } from "../fleet.js";
import { displayMonetaryValue } from "../format.js";
import { nextUpgrade, upgradeShip as applyUpgrade } from "../ship.js";
import { calculateCostForRepair, calculateRepairForCost } from "../shipyard.js";
import { canAfford } from "../treasury.js";
import { accept, isWholeAmount, reject } from "./index.js";

const notWhole = () => reject("invalidQuantity", ["Captain, that's not an amount we can work with."]);

export const repair = (context: Context, { cash }: { cash: number }) => {
  if (context.ship.health === 100) {
    return reject("perfectCondition", ["Captain, your ship is already in perfect condition"]);
  }
  if (!isWholeAmount(cash)) return notWhole();
  if (!canAfford(context, cash)) {
    return reject("notEnoughMoney", ["Captain, we don't have enough money to pay for this repair"]);
  }

  const damageToRepair = Math.min(100 - context.ship.health, calculateRepairForCost(cash, context));
  return accept(
    {
      ...context,
      balance: context.balance - calculateCostForRepair(damageToRepair, context),
      ship: { ...context.ship, health: context.ship.health + damageToRepair },
    },
    [`Captain, they repaired ${damageToRepair} damage to our ship.`],
  );
};

export const upgradeShip = (context: Context, { upgradeType }: { upgradeType: ShipStat }) => {
  const upgrade = nextUpgrade(context.ship, upgradeType);
  if (!upgrade) return reject("maxedOut", [`Captain, our ship's ${upgradeType} can't be improved any further.`]);
  if (!canAfford(context, upgrade.cost)) {
    return reject("notEnoughMoney", ["Captain, we don't have enough money for this upgrade."]);
  }

  return accept(
    {
      ...context,
      ship: applyUpgrade(context.ship, upgradeType),
      balance: context.balance - upgrade.cost,
      reputation: Math.min(100, context.reputation + (upgrade.reputation ?? 0)),
    },
    [
      `Captain, they've upgraded our ship's ${upgradeType}!`,
      ...(upgrade.reputation
        ? [`Your ship improvements have earned you ${upgrade.reputation} reputation points!`]
        : []),
    ],
  );
};

export const hireGuards = (context: Context, { amount }: { amount: number }) => {
  if (context.guardFleet.ships >= MAX_GUARD_SHIPS) {
    return reject("fleetFull", [`Captain, our fleet is at maximum capacity (${MAX_GUARD_SHIPS} ships)`]);
  }
  if (!isWholeAmount(amount)) return notWhole();
  if (context.guardFleet.ships + amount > MAX_GUARD_SHIPS) {
    return reject("fleetFull", [
      `Captain, we cannot hire that many ships. Maximum fleet size is ${MAX_GUARD_SHIPS} ships.`,
    ]);
  }

  const cost = calculateGuardShipCost(context, amount);
  if (!canAfford(context, cost)) {
    return reject("notEnoughMoney", [
      `Captain, we don't have enough money. Need ${displayMonetaryValue(cost)} to hire ${amount} ships.`,
    ]);
  }

  return accept(
    {
      ...context,
      guardFleet: { ...context.guardFleet, ships: context.guardFleet.ships + amount },
      balance: context.balance - cost,
      reputation: Math.min(100, context.reputation + amount),
    },
    [`Captain, we hired ${amount} permanent guard ships`],
  );
};

export const upgradeGuards = (context: Context) => {
  if (context.guardFleet.ships === 0) return reject("noFleet", ["Captain, we don't have any guard ships to upgrade."]);
  if (context.guardFleet.quality >= MAX_GUARD_QUALITY) {
    return reject("maxedOut", ["Captain, our fleet is already at maximum quality."]);
  }

  const cost = calculateFleetUpgradeCost(context);
  if (!canAfford(context, cost)) {
    return reject("notEnoughMoney", [
      `Captain, we don't have enough money. We need ${displayMonetaryValue(cost)} to upgrade our fleet.`,
    ]);
  }

  const quality = context.guardFleet.quality + 1;
  return accept({ ...context, guardFleet: { ...context.guardFleet, quality }, balance: context.balance - cost }, [
    `Captain, our fleet upgraded to quality level ${quality}!`,
  ]);
};

export const dismissGuards = (context: Context, { amount }: { amount: number }) => {
  if (context.guardFleet.ships === 0) return reject("noFleet", ["Captain, we don't have any guard ships to dismiss."]);
  if (!isWholeAmount(amount)) return notWhole();

  return accept(
    {
      ...context,
      guardFleet: { ...context.guardFleet, ships: Math.max(0, context.guardFleet.ships - amount) },
      reputation: Math.max(0, context.reputation - amount * 2),
    },
    [`We've dismissed ${amount} guard ships, Captain.`],
  );
};
