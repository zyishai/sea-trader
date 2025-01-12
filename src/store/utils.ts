import {
  BASE_GUARD_COST,
  distanceMatrix,
  eventTemplates,
  EXTENDED_GAME_PENALTY,
  GOAL_DAYS,
  goods,
  goodsInfo,
  MAINTENANCE_COST_PER_SHIP,
  ports,
} from "./constants.js";
import { Context, EventTemplate, Good, Port, ShipStatus, Trend } from "./types.js";

// ~~ PORT ~~
export const calculatePirateEncounterChance = (context: Context) => {
  const baseChance = 0.2;
  const reputationFactor = Math.max(0.5, (100 - context.reputation) / 100);
  const guardFactor = context.guardFleet.ships * 0.01 * context.guardFleet.quality;
  return Math.max(0.05, Math.min(0.3, baseChance * reputationFactor - guardFactor)); // 5%-30% chance
};
export const calculateGuardEffectiveness = (context: Context) => {
  const baseEffectiveness = 0.4;
  const qualityBonus = (context.guardFleet.quality - 1) * 0.1;
  const fleetBonus = Math.min(0.3, context.guardFleet.ships * 0.05);
  const overdraftPenalty = context.inOverdraft ? 0.5 : 0; // Apply penalty if in overdraft
  return Math.min(0.9, (baseEffectiveness + qualityBonus + fleetBonus) * overdraftPenalty);
};
export const calculateEventChance = (template: EventTemplate, context: Context) => {
  let chance = template.baseChance;
  const speedFactor = Math.max(1, 1 - (context.ship.speed - 8) / 24);

  switch (template.type) {
    case "weather": {
      chance *= context.day / GOAL_DAYS; // Weather events become more likely as the game progresses
      chance *= speedFactor; // Faster ships are less likely to encounter weather events
      break;
    }
    case "market": {
      chance *= context.balance / 10000; // Market events become more likely as the player gets richer
      break;
    }
    case "encounter": {
      chance *= 1 - context.ship.health / 100; // Encounters become more likely when the ship health is low
      chance *= speedFactor; // Faster ships are less likely to encounter events
      break;
    }
    case "discovery": {
      chance *= context.day / GOAL_DAYS; // Discoveries become more likely as the game progresses
      break;
    }
  }

  return Math.min(chance, 1);
};
export const checkForEvent = (context: Context) => {
  for (const template of eventTemplates) {
    const chance = calculateEventChance(template, context);
    if (Math.random() < chance) {
      return template;
    }
  }

  return;
};
export const calculateTravelTime = (to: Port, context: Context) => {
  const from = context.currentPort;
  const distance = distanceMatrix[from][to];

  // At 8 knots, a ship travels ~192nmi per day
  // Adding 20% for port operations, weather delays, etc.
  const daysAtSea = Math.ceil((distance / (context.ship.speed * 24)) * 1.2);

  const shipCondition = getShipStatus(context.ship.health);
  const healthPenalty = shipCondition === "Wreckage" ? 2 : shipCondition === "Major damages" ? 1.5 : 1;

  return Math.max(1, daysAtSea * healthPenalty);
};

// -~ GUARD FLEET ~-
export const calculateGuardShipCost = (context: Context, amount: number) => {
  const basePrice = BASE_GUARD_COST;
  const fleetSizeFactor = 1 + context.guardFleet.ships * 0.15;
  const qualityFactor = 1 + (context.guardFleet.quality - 1) * 0.25;
  return Math.round(basePrice * fleetSizeFactor * qualityFactor * amount);
};
export const calculateFleetUpgradeCost = (context: Context) => {
  const baseUpgradeCost = BASE_GUARD_COST * 2;
  const fleetSizeFactor = 1 + context.guardFleet.ships * 0.2;
  const qualityFactor = 1 + context.guardFleet.quality * 0.5;
  return Math.round(baseUpgradeCost * fleetSizeFactor * qualityFactor);
};
export const calculateDailyMaintenanceCost = (context: Context) =>
  context.guardFleet.ships * MAINTENANCE_COST_PER_SHIP * context.guardFleet.quality;

// +- MARKET +-
export const generateTrends = () =>
  ports.reduce(
    (accPorts, port) => ({
      ...accPorts,
      [port]: goods.reduce(
        (accGoods, good) => ({
          ...accGoods,
          [good]: ["increasing", "decreasing", "stable"][Math.floor(Math.random() / 0.4)],
        }),
        {},
      ),
    }),
    {} as Record<Port, Record<Good, Trend>>,
  );
export const generatePrices = (trends: Record<Port, Record<Good, Trend>>) =>
  ports.reduce(
    (accPorts, port) => ({
      ...accPorts,
      [port]: goodsInfo.reduce((accGoods, good) => {
        const trend = trends[port][good.name];
        const trendFactor = trend === "increasing" ? 1.1 : trend === "decreasing" ? 0.9 : 1;
        const randomFactor = 1 + (Math.random() - 0.5) * 2 * good.volatility; // Opium: [0.75, 1.25)
        return { ...accGoods, [good.name]: Math.round(good.basePrice * trendFactor * randomFactor) };
      }, {}),
    }),
    {} as Record<Port, Record<Good, number>>,
  );
export const calculatePrice = ({
  prices,
  currentPort,
  good,
  quantity,
}: {
  prices: Record<Port, Record<Good, number>>;
  currentPort: Port;
  good: Good;
  quantity: number;
}) => prices[currentPort][good] * quantity;
export const getAvailableStorage = (ship: Context["ship"]) =>
  ship.capacity - [...ship.hold.values()].reduce((sum, tons) => sum + tons);

// ** SHIPYARD **
export const getShipStatus = (health: number): ShipStatus =>
  health >= 90 ? "Perfect" : health >= 70 ? "Minor damages" : health >= 40 ? "Major damages" : "Wreckage";
export const calculateCostForRepair = (damageToRepair: number) => damageToRepair * 57; // How much it'll cost to repair `damageToRepair` damage.
export const calculateRepairForCost = (price: number) => Math.floor(price / 57); // How much damage can be repaired with `price`.

// !! SCORE !!
export const getNetCash = (context: Context) =>
  context.balance +
  [...context.ship.hold.entries()].reduce(
    (sum, [good, quan]) => sum + context.prices[context.currentPort][good] * quan,
    0,
  );
export const calculateScore = (context: Context) => {
  let score = Math.round(getNetCash(context) / 100);

  // Add a logarithmic bonus for ship capacity
  // This provides diminishing returns for larger capacities
  const capacityBonus = Math.floor(800 * Math.log10(context.ship.capacity + 1));
  score += capacityBonus;

  // Add a logarithmic bonus for ship speed
  // This, too, provides diminishing returns for larger speeds
  const speedBonus = Math.floor(500 * Math.log2((context.ship.speed - 7) * 2));
  score += speedBonus;

  // Calculate damage penalty
  // The penalty increases with ship size and is more severe for lower health
  const maxDamage = context.ship.capacity * 10;
  const actualDamage = maxDamage * (1 - context.ship.health / 100);
  const damagePenalty = Math.floor(actualDamage);
  score -= damagePenalty;

  if (context.extendedGame) {
    const extraDays = context.day - GOAL_DAYS;
    const penaltyFactor = 1 - extraDays * EXTENDED_GAME_PENALTY;
    return Math.floor(score * penaltyFactor);
  }

  return score;
};
