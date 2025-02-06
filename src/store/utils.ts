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
  OVERLOAD_BUFFER,
  OVERLOAD_SPEED_PENALTY,
  PORT_SPECIALIZATIONS,
  ports,
  SEASON_LENGTH,
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
  MerchantTip,
  Port,
  PriceHistory,
  Range,
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

// ->> Intelligence <<-
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
  const ranges = {} as Record<Port, Record<Good, Range>>;

  Object.entries(history).forEach(([port, portHistory]) => {
    // @ts-expect-error temp
    ranges[port] = {} as Range;
    Object.entries(portHistory).forEach(([good, prices]) => {
      const values = prices.map((p) => p.price);
      ranges[port as Port][good as Good] = {
        min: Math.min(...values),
        max: Math.max(...values),
        mean: calculateMean(values),
      };
    });
  });

  return ranges;
};
export const isPriceUnusual = (price: number, range: Range) => {
  const deviation = (price - range.mean) / range.mean;
  if (Math.abs(deviation) >= 0.25) {
    return {
      deviation: Math.abs(deviation),
      trend: deviation >= 0.25 ? "high" : "low",
    } as { deviation: number; trend: "high" | "low" };
  }

  return;
};
export const isPriceExtreme = (price: number, range: Range) => {
  const position = (price - range.min) / (range.max - range.min);
  // Within 15% of min/max
  if (position <= 0.15 || position >= 0.85) {
    return position;
  }
  return;
};
export const findBestTrades = (
  currentPrices: Record<Port, Record<Good, number>>,
  typicalRanges: Record<Port, Record<Good, Range>>,
) => {
  return ports.flatMap((sourcePort) =>
    ports
      .filter((destPort) => sourcePort !== destPort)
      .map((destPort) => {
        const profits = goods.map((good) => {
          const buyPrice = currentPrices[sourcePort][good];
          const sellPrice = currentPrices[destPort][good];
          const typicalProfit = typicalRanges[destPort][good].mean - typicalRanges[sourcePort][good].mean;
          const currentProfit = sellPrice - buyPrice;
          const profitRatio = currentProfit / typicalProfit;
          return { good, currentProfit, profitRatio };
        });
        return { sourcePort, destPort, profits };
      })
      .filter((route) => route.profits.some((profit) => profit.profitRatio >= 1.5)),
  );
};
export const findProfitablePorts = (context: Context) => {
  return ports.map((port) => {
    const profitForHold = [...context.ship.hold.entries()]
      .filter(([, quantity]) => quantity > 0)
      .reduce((profit, [good, quantity]) => profit + context.prices[port][good] * quantity, 0);
    const profitableGoods = goods
      .map((good) => ({
        good,
        profitPerUnit: context.prices[port][good] - context.prices[context.currentPort][good],
      }))
      .filter((goodInfo) => goodInfo.profitPerUnit > 0);

    return {
      port,
      profitForHold,
      profitableGoods,
      averageProfit:
        profitableGoods.length > 0
          ? Math.round(
              profitableGoods.reduce((sum, goodInfo) => sum + goodInfo.profitPerUnit, 0) / profitableGoods.length,
            )
          : 0,
    };
  });
};
export const generateAllTips = (context: Context): MerchantTip[] => {
  const tips: MerchantTip[] = [];
  const currentPort = context.currentPort;
  const analysis = context.marketIntelligence.analysis;
  const currentPrices = context.prices;

  goods.forEach((good) => {
    if (context.marketIntelligence.priceUpdates > 3) {
      const price = currentPrices[currentPort][good];
      const range = analysis.typicalRanges[currentPort][good];

      // Check for ununsual prices at current port
      const unusualPrice = isPriceUnusual(price, range);
      if (unusualPrice) {
        tips.push({
          priority: unusualPrice.deviation * 100,
          message:
            unusualPrice.trend === "low"
              ? `${good} is selling ${Math.round(unusualPrice.deviation * 100)}% below normal price - good time to buy!`
              : `${good} is selling ${Math.round(unusualPrice.deviation * 100)}% above normal price - consider selling!`,
        });
      }

      // Check for extreme price at current port
      const position = isPriceExtreme(price, range);
      if (position) {
        tips.push({
          priority: 90 - (1 - Math.abs(0.5 - position)) * 10,
          message:
            position <= 0.15
              ? `${good} price is near historical lows - unlikely to drop further!`
              : `${good} price is near historical highs - consider selling soon!`,
        });
      }

      // Check for seasonal price effect
      const currentSeason = context.currentSeason;
      const seasonalEffect = SEASONAL_EFFECTS[currentSeason][good];
      const daysUntilSeasonEnd = context.nextSeasonDay;
      if (seasonalEffect) {
        tips.push({
          priority: Math.round(Math.abs(1 - seasonalEffect) * 15 + 85 + (1 - daysUntilSeasonEnd / SEASON_LENGTH) * 7),
          message:
            seasonalEffect > 1
              ? `${good} price is seasonally high for ${daysUntilSeasonEnd} more days - sell before the season ends!`
              : `${good} price is seasonally low for ${daysUntilSeasonEnd} more days - good time to stock up`,
        });
      }
    }

    // Check for strong price momentum
    const trendInfo = context.trends[currentPort][good];
    if (trendInfo.reliability >= 90 && trendInfo.direction !== "stable" && trendInfo.strength === "strong") {
      tips.push({
        priority: Math.round(trendInfo.reliability / 2) + 30 + Math.round(20 / trendInfo.duration),
        message:
          trendInfo.direction === "increasing"
            ? `${good} price is rising strongly here - good time to buy`
            : `${good} price is falling strongly here - might want to sell`,
      });
    }
  });

  // Check for the two best trading routes
  findBestTrades(currentPrices, analysis.typicalRanges).forEach((route) => {
    const bestGood = route.profits.reduce((a, b) => (a.profitRatio > b.profitRatio ? a : b));
    if (bestGood.profitRatio >= 1.5) {
      tips.push({
        priority: (bestGood.profitRatio - 1) * 80,
        message: `Unusually high profits selling ${bestGood.good} to ${route.destPort} - ${Math.round((bestGood.profitRatio - 1) * 100)}% above normal!`,
      });
    }
  });

  const profitablePorts = findProfitablePorts(context).filter((portInfo) => portInfo.port !== currentPort);
  if (profitablePorts.length > 0) {
    // Check for the best overall profitable port
    if (profitablePorts.some((portInfo) => portInfo.profitableGoods.length > 0)) {
      const bestPort = profitablePorts.sort(
        (a, b) => b.averageProfit * b.profitableGoods.length - a.averageProfit * a.profitableGoods.length,
      )[0]!;
      tips.push({
        priority: 65 + 35 * (bestPort.profitableGoods.length / goods.length),
        message: `${bestPort.port} has high prices for ${joinWords(bestPort.profitableGoods.map((goodInfo) => goodInfo.good))} - worth a visit!`,
      });
    }

    // Check for the port with the best worth for player's hold
    if ([...context.ship.hold.values()].some((quantity) => quantity > 0)) {
      const bestForHold = profitablePorts.reduce((a, b) => (b.profitForHold > a.profitForHold ? b : a));
      const sumProfits = profitablePorts.reduce((sum, portInfo) => sum + portInfo.profitForHold, 0);
      tips.push({
        priority: 75 + Math.round((bestForHold.profitForHold / sumProfits) * 25),
        message: `${bestForHold.port} offers the most value for your hold - worth a visit!`,
      });
    }
  }

  return tips;
};
export const getMerchantTip = (context: Context): MerchantTip => {
  const allTips = generateAllTips(context).sort((a, b) => b.priority - a.priority);
  const getAccessibleTipIndex = (reputation: number) => {
    if (reputation >= 90) return 0;
    if (reputation >= 60) return Math.floor(allTips.length * 0.25); // Top 25%
    if (reputation >= 30) return Math.floor(allTips.length * 0.5); // Top 50%
    return Math.floor(allTips.length * 0.75); // Bottom 25%
  };
  const tipIndex = getAccessibleTipIndex(context.reputation);
  return allTips[tipIndex]!;
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
export const displayMonetaryValue = (value: number) => `${value < 0 ? "-" : ""}$${Math.abs(value)}`;
export const calculateMean = (values: number[]) => values.reduce((a, b) => a + b) / values.length;
