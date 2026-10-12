import { Port } from "./catalog/ports.js";
import { distanceBetween } from "./catalog/sea-routes.js";
import { MAX_SHIP_DEFENSE } from "./catalog/vessels.js";
import { Context } from "./context.js";
import { overloadLevel } from "./hold.js";
import { getShipStatus, shipStats } from "./ship.js";
import { netWorth } from "./treasury.js";

export const OVERLOAD_SPEED_PENALTY = 0.3;

export const calculatePirateEncounterChance = (context: Context) => {
  const baseChance = 0.2;
  const wealthFactor = Math.min(1.5, netWorth(context) / 10_000);
  const reputationFactor = Math.max(0.5, (100 - context.reputation) / 100);
  const guardFactor = context.guardFleet.ships * 0.01 * context.guardFleet.quality;
  const defenseFactor = Math.min(0.2, shipStats(context.ship).defense / MAX_SHIP_DEFENSE);
  return Math.max(0.05, Math.min(0.3, baseChance * reputationFactor * wealthFactor - guardFactor - defenseFactor)); // 5%-30% chance
};

export const calculateTravelTime = (to: Port, context: Context) => {
  const from = context.currentPort;
  const distance = distanceBetween(from, to);

  // At 8 knots, a ship travels ~192nmi per day
  // Adding 20% for port operations, weather delays, etc.
  const daysAtSea = Math.ceil((distance / (shipStats(context.ship).speed * 24)) * 1.2);

  const shipCondition = getShipStatus(context.ship.health);
  const healthPenalty = shipCondition === "Wreckage" ? 2 : shipCondition === "Major damages" ? 1.5 : 1;

  const overloadPenalty = 1 + overloadLevel(context.ship.hold) * OVERLOAD_SPEED_PENALTY;

  return Math.max(1, Math.ceil(daysAtSea * healthPenalty * overloadPenalty));
};
