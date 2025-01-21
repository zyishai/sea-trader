import {
  BASE_GUARD_COST,
  BASE_SHIP_CAPACITY,
  CAPACITY_UPGRADES,
  DAMAGE_PER_GUARD_SHIP,
  DAMAGE_REPAIR_COST_PER_UNIT,
  DEFENSE_UPGRADES,
  distanceMatrix,
  eventTemplates,
  EXTENDED_GAME_PENALTY,
  GOAL_DAYS,
  goods,
  goodsInfo,
  MAINTENANCE_COST_PER_SHIP,
  MAX_SHIP_DEFENSE,
  OVERLOAD_BUFFER,
  OVERLOAD_SPEED_PENALTY,
  ports,
  SPEED_UPGRADES,
} from "./constants.js";
import {
  BulkinessCategory,
  Context,
  EventTemplate,
  FleetQuality,
  Good,
  Port,
  ShipStatus,
  Trend,
  UpgradeType,
} from "./types.js";

// ~~ PORT ~~
export const calculatePirateEncounterChance = (context: Context) => {
  const baseChance = 0.2;
  const wealthFactor = Math.min(1.5, getNetCash(context) / 10_000);
  const reputationFactor = Math.max(0.5, (100 - context.reputation) / 100);
  const guardFactor = context.guardFleet.ships * 0.01 * context.guardFleet.quality;
  const defenseFactor = Math.min(0.2, context.ship.defense / MAX_SHIP_DEFENSE);
  return Math.max(0.05, Math.min(0.3, baseChance * reputationFactor * wealthFactor - guardFactor - defenseFactor)); // 5%-30% chance
};
export const calculateGuardEffectiveness = (context: Context) => {
  const baseEffectiveness = 0.4;
  const qualityBonus = (context.guardFleet.quality - 1) * 0.1;
  const fleetBonus = Math.min(0.3, context.guardFleet.ships * 0.05);
  const defenseBonus = Math.min(0.2, context.ship.defense / MAX_SHIP_DEFENSE);
  const overdraftPenalty = context.inOverdraft ? 0.5 : 1; // Apply penalty if in overdraft
  return Math.min(0.9, (baseEffectiveness + qualityBonus + fleetBonus + defenseBonus) * overdraftPenalty);
};
export const calculateEventChance = (template: EventTemplate, context: Context) => {
  let chance = typeof template.baseChance === "number" ? template.baseChance : template.baseChance(context);
  const speedFactor = Math.max(1, 1 - (context.ship.speed - 8) / 24);

  switch (template.type) {
    case "weather": {
      chance *= context.day / GOAL_DAYS; // Weather events become more likely as the game progresses
      chance *= speedFactor; // Faster ships are less likely to encounter weather events
      break;
    }
    case "market": {
      chance *= Math.min(2, context.balance / 5000); // Market events become more likely as the player gets richer
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

  const totalBuffer = getBufferStorage(context.ship);
  const availableBuffer = getAvailableBufferStorage(context.ship);
  const overloadPenalty = context.ship.isOverloaded
    ? 1 + ((totalBuffer - availableBuffer) / totalBuffer) * OVERLOAD_SPEED_PENALTY
    : 1;

  return Math.max(1, Math.ceil(daysAtSea * healthPenalty * overloadPenalty));
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
export const distributeFleetDamage = (damage: number, context: Context) => {
  if (context.guardFleet.ships === 0) {
    const defenseFactor = Math.max(0.5, 1 - context.ship.defense / MAX_SHIP_DEFENSE);
    const reducedDamage = Math.round(damage * defenseFactor);
    return {
      shipDamage: reducedDamage,
      fleetDamage: 0,
      shipsLost: 0,
      remainingFleetDamage: 0,
    };
  }

  // Guards take 70% of the damage, ship takes 30%
  const defenseFactor = Math.max(0.6, 1 - context.ship.defense / MAX_SHIP_DEFENSE);
  const fleetDamage = Math.floor(damage * 0.7);
  const shipDamage = Math.ceil(damage * 0.3 * defenseFactor);

  // Calculate total accumulated damage
  const totalFleetDamage = context.guardFleet.damage + fleetDamage;

  // Calculate how many ships are lost
  const shipsLost = Math.floor(totalFleetDamage / DAMAGE_PER_GUARD_SHIP);

  // Calculate remaining damage after ships are lost
  const remainingFleetDamage = totalFleetDamage % DAMAGE_PER_GUARD_SHIP;

  return { shipDamage, fleetDamage, shipsLost, remainingFleetDamage };
};
export const getFleetQuality = (quality: number): FleetQuality => {
  switch (quality) {
    case 1:
      return "Basic";
    case 2:
      return "Trained";
    case 3:
      return "Elite";
    default:
      return "Basic";
  }
};

// -* INVENTORY *-
export const calculateInventoryValue = (context: Context) =>
  [...context.ship.hold.entries()].reduce((acc, [good, quantity]) => {
    return acc + calculatePrice({ ...context, good, quantity });
  }, 0);
export const getStorageUsed = (ship: Context["ship"]) =>
  [...ship.hold.entries()].reduce((sum, [good, quantity]) => sum + getStorageUnitsForGood(good, quantity), 0);
export const getAvailableStorage = (ship: Context["ship"], options?: { withBuffer?: boolean }) => {
  const usedStorage = getStorageUsed(ship);

  if (options?.withBuffer) {
    return getMaxStorageWithBuffer(ship) - usedStorage;
  }

  return Math.max(0, ship.capacity - usedStorage);
};
export const getAvailableBufferStorage = (ship: Context["ship"]) =>
  Math.min(getMaxStorageWithBuffer(ship) - getStorageUsed(ship), getBufferStorage(ship));
export const getMaxStorageWithBuffer = (ship: Context["ship"]) => Math.floor(ship.capacity * (1 + OVERLOAD_BUFFER));
export const getBufferStorage = (ship: Context["ship"]) => Math.floor(ship.capacity * OVERLOAD_BUFFER);
export const getStorageUnitsForGood = (good: Good, quantity: number) => {
  const goodInfo = goodsInfo.find((item) => item.name === good);
  if (!goodInfo) {
    return 0;
  }
  return Math.ceil(quantity * goodInfo.bulkiness);
};
export const canStoreCargo = (context: Context, good: Good, quantity: number) => {
  const storageNeeded = getStorageUnitsForGood(good, quantity);
  return getAvailableStorage(context.ship, { withBuffer: true }) >= storageNeeded;
};
export const getBulkinessCategory = (bulkiness: number): BulkinessCategory => {
  if (bulkiness <= 0.8) return "Compact";
  if (bulkiness >= 1.2) return "Bulky";
  return "Standard";
};
export const getBulkinessDescription = (good: Good) => {
  const goodInfo = goodsInfo.find((item) => item.name === good);
  if (!goodInfo) return "";
  switch (getBulkinessCategory(goodInfo.bulkiness)) {
    case "Compact":
      return "Dense cargo that stores efficiently";
    case "Standard":
      return "Takes standard storage space";
    case "Bulky":
      return "Requires extra storage space due to careful packing";
  }
};

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

// ** SHIPYARD **
export const getShipStatus = (health: number): ShipStatus =>
  health >= 90 ? "Perfect" : health >= 70 ? "Minor damages" : health >= 40 ? "Major damages" : "Wreckage";
export const calculateCostForRepair = (damageToRepair: number, context: Context) => {
  const capacityFactor = Math.max(1, Math.sqrt(context.ship.capacity / BASE_SHIP_CAPACITY));
  return Math.floor(damageToRepair * DAMAGE_REPAIR_COST_PER_UNIT * capacityFactor); // How much it'll cost to repair `damageToRepair` damage.
};
export const calculateRepairForCost = (price: number, context: Context) => {
  const capacityFactor = Math.max(1, Math.sqrt(context.ship.capacity / BASE_SHIP_CAPACITY));
  return Math.floor(price / (DAMAGE_REPAIR_COST_PER_UNIT * capacityFactor)); // How much damage can be repaired with `price`.
};

// >- UPGRADES -<
export const getNextSpeedUpgrade = (currentSpeed: number) =>
  SPEED_UPGRADES.find((upgrade) => upgrade.speed > currentSpeed);
export const getNextDefenseUpgrade = (currentDefense: number) =>
  DEFENSE_UPGRADES.find((upgrade) => upgrade.defense > currentDefense);
export const getNextCapacityUpgrade = (currentCapacity: number) =>
  CAPACITY_UPGRADES.find((upgrade) => upgrade.capacity > currentCapacity);
export const getNextUpgrade = (type: UpgradeType, context: Context) => {
  switch (type) {
    case "capacity": {
      return getNextCapacityUpgrade(context.ship.capacity);
    }
    case "speed": {
      return getNextSpeedUpgrade(context.ship.speed);
    }
    case "defense": {
      return getNextDefenseUpgrade(context.ship.defense);
    }
    default: {
      return;
    }
  }
};
export const canAffordUpgrade = (type: UpgradeType, context: Context) => {
  const nextUpgrade = getNextUpgrade(type, context);

  return !!nextUpgrade && context.balance >= nextUpgrade.cost;
};

// !! SCORE !!
export const getNetCash = (context: Context) =>
  context.balance +
  [...context.ship.hold.entries()].reduce(
    (sum, [good, quan]) => sum + context.prices[context.currentPort][good] * quan,
    0,
  );
export const calculateScore = (context: Context) => {
  let score = Math.round(getNetCash(context) / 50);

  // Add a logarithmic bonus for ship capacity
  // This provides diminishing returns for larger capacities
  const capacityBonus = Math.floor(1000 * Math.log10(context.ship.capacity + 1));
  score += capacityBonus;

  // Add a logarithmic bonus for ship speed
  // This, too, provides diminishing returns for larger speeds
  const speedBonus = Math.floor(500 * Math.log2((context.ship.speed - 7) * 2));
  score += speedBonus;

  // Calculate damage penalty
  // The penalty increases with ship size and is more severe for lower health
  const maxDamage = context.ship.capacity * 20;
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
