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
  MARKET_SIZE_FACTORS,
  MAX_SHIP_DEFENSE,
  merchantTipTemplate,
  OVERLOAD_BUFFER,
  OVERLOAD_SPEED_PENALTY,
  PORT_SPECIALIZATIONS,
  ports,
  SEASONAL_EFFECTS,
  seasons,
  SPEED_UPGRADES,
  TREND_DIRECTION,
  TREND_STRENGTH,
  TREND_STRENGTH_FACTORS,
} from "./constants.js";
import {
  BulkinessCategory,
  Context,
  EventTemplate,
  FleetQuality,
  Good,
  MarketInfoLevel,
  Port,
  PriceHistory,
  Season,
  ShipStatus,
  Trend,
  TrendInfo,
  TrendStrength,
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
export const getNextSeason = (season: Season) => {
  const currentIndex = seasons.indexOf(season);
  return seasons[(currentIndex + 1) % seasons.length]!;
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
export const generateTrendInfo = (): TrendInfo => {
  const direction: Trend = TREND_DIRECTION[Math.floor(Math.random() * TREND_DIRECTION.length)]!;
  const strength: TrendStrength = TREND_STRENGTH[Math.floor(Math.random() * TREND_STRENGTH.length)]!;

  const durationRanges: Record<TrendStrength, { min: number; max: number }> = {
    weak: { min: 1, max: 3 },
    moderate: { min: 2, max: 4 },
    strong: { min: 3, max: 5 },
  };

  const range = durationRanges[strength];
  const duration = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

  return {
    direction,
    strength,
    duration,
    reliability: Math.floor(Math.random() * 30) + 70, // 70%-100%
  };
};
export const generateTrends = () =>
  ports.reduce(
    (accPorts, port) => ({
      ...accPorts,
      [port]: goods.reduce(
        (accGoods, good) => ({
          ...accGoods,
          [good]: generateTrendInfo(),
        }),
        {},
      ),
    }),
    {} as Record<Port, Record<Good, TrendInfo>>,
  );
export const updateTrends = (trends: Record<Port, Record<Good, TrendInfo>>) => {
  return ports.reduce(
    (accPorts, port) => ({
      ...accPorts,
      [port]: goods.reduce((accGoods, good) => {
        const currentTrend = trends[port][good];
        if (currentTrend.duration <= 1) {
          return { ...accGoods, [good]: generateTrendInfo() };
        }

        return {
          ...accGoods,
          [good]: { ...currentTrend, duration: currentTrend.duration - 1 },
        };
      }, {}),
    }),
    {} as Record<Port, Record<Good, TrendInfo>>,
  );
};
export const getTrendFactor = (trendInfo: TrendInfo) => {
  const baseFactor =
    trendInfo.direction === "stable"
      ? 1
      : TREND_STRENGTH_FACTORS[trendInfo.strength][trendInfo.direction === "increasing" ? "up" : "down"];
  // Add randomization based on reliability
  const maxVariation = (100 - trendInfo.reliability) / 200; // Less reliable = more variation
  return baseFactor * (1 + (Math.random() - 0.5) * maxVariation);
};
export const getSeasonalFactor = (season: Season, good: Good) => {
  const baseFactor = SEASONAL_EFFECTS[season][good] ?? 1;
  return baseFactor * (1 + (Math.random() - 0.5) * 0.1); // ±5% variation
};
export const getSpecialtyFactor = (port: Port, good: Good) => {
  const portSpec = PORT_SPECIALIZATIONS[port];
  const marketSizeFactor = MARKET_SIZE_FACTORS[portSpec.marketSize];
  const productionFactor = portSpec.producedGoods.includes(good) ? portSpec.productionFactor : 1;
  const tradingHubFactor = portSpec.tradingHub ? 0.95 : 1;

  return marketSizeFactor * productionFactor * tradingHubFactor;
};
export const generatePrices = (trends: Record<Port, Record<Good, TrendInfo>>, season: Season) =>
  ports.reduce(
    (accPorts, port) => ({
      ...accPorts,
      [port]: goodsInfo.reduce((accGoods, good) => {
        const trendFactor = getTrendFactor(trends[port][good.name]);
        const seasonalFactor = getSeasonalFactor(season, good.name);
        const specialtyFactor = getSpecialtyFactor(port, good.name);
        const randomFactor = 1 + (Math.random() - 0.5) * 2 * good.volatility;

        return {
          ...accGoods,
          [good.name]: Math.round(good.basePrice * trendFactor * specialtyFactor * seasonalFactor * randomFactor),
        };
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
export const getIntelligenceCost = (level: MarketInfoLevel, context: Context) => {
  const basePrice = {
    1: 0,
    2: 200,
    3: 500,
  }[level];

  const wealthFactor = Math.min(3, Math.max(1, Math.sqrt(context.balance / 5000)));
  return Math.round(basePrice * wealthFactor);
};
export const calculateIntelligenceReliability = (context: Context) => {
  const intel = context.marketIntelligence;

  const trendPenalty = intel.trendChanges * 15; // -15% per trend change
  const seasonPenalty = intel.seasonChanges * 20;
  const pricePenalty = intel.priceUpdates * 10;

  const reliability = Math.max(0, 100 - trendPenalty - seasonPenalty - pricePenalty);
  return reliability;
};
export const getMerchantTip = (context: Context) => {
  if (context.reputation < 30) return null;

  const availableTips = merchantTipTemplate
    .filter((tip) => context.reputation >= tip.minRep)
    .map((tip) => tip.getMessage(context))
    .filter(Boolean);
  return availableTips[availableTips.length - 1] ?? null;
};
export const updatePriceHistory = (context: Context) => {
  const { prices, currentSeason, day } = context;
  const history = context.marketIntelligence.analysis.priceHistory;

  // Add new price update
  Object.entries(prices).forEach(([port, portPrices]) => {
    Object.entries(portPrices).forEach(([good, price]) => {
      const goodHistory = history[port as Port][good as Good];
      goodHistory.push({ price, day, season: currentSeason });

      // Keep only last 5 updates
      if (goodHistory.length > 5) goodHistory.shift();
    });
  });

  // Update typical ranges
  const typicalRanges = calculateTypicalRanges(history);

  return {
    priceHistory: history,
    typicalRanges,
  };
};
export const calculateTypicalRanges = (history: Record<Port, Record<Good, PriceHistory[]>>) => {
  const ranges = {} as Record<Port, Record<Good, { min: number; max: number }>>;

  Object.entries(history).forEach(([port, portHistory]) => {
    // @ts-expect-error temp
    ranges[port] = {};
    Object.entries(portHistory).forEach(([good, prices]) => {
      const values = prices.map((p) => p.price);
      ranges[port as Port][good as Good] = {
        min: Math.min(...values),
        max: Math.max(...values),
      };
    });
  });

  return ranges;
};
export const isPriceUnusual = (price: number, ranges: { min: number; max: number }) => {
  const range = ranges.max - ranges.min;
  if (price < ranges.min + range * 0.2) return "low";
  if (price > ranges.max - range * 0.2) return "high";
  return;
};

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

// % MISC %
export const joinWords = (words: string[]) =>
  words.length <= 2 ? words.join(" and ") : `${words.slice(0, -1).join(", ")}, and ${words[words.length - 1]}`;
