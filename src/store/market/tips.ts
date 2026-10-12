import { Good, goods, seasonalPriceFactor } from "../catalog/goods.js";
import { Port, ports } from "../catalog/ports.js";
import { SEASON_LENGTH, Season, currentSeason, daysUntilNextSeason } from "../clock.js";
import { Context } from "../context.js";
import { joinWords } from "../format.js";
import { goodsAboard, value } from "../hold.js";

export type PriceHistory = {
  price: number;
  day: number;
  season: Season;
};

export type Range = {
  min: number;
  max: number;
  mean: number;
};

export type MerchantTip = {
  priority: number;
  message: string;
};

export const updatePriceHistory = (
  history: Record<Port, Record<Good, PriceHistory[]>>,
  prices: Record<Port, Record<Good, number>>,
  day: number,
  season: Season,
) => {
  const priceHistory = Object.fromEntries(
    ports.map((port) => [
      port,
      Object.fromEntries(
        goods.map((good) => [good, [...history[port][good], { price: prices[port][good], day, season }].slice(-5)]),
      ),
    ]),
  ) as Record<Port, Record<Good, PriceHistory[]>>;

  return { priceHistory, typicalRanges: calculateTypicalRanges(priceHistory) };
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
    const profitForHold = value(context.ship.hold, context.prices[port]);
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
  const analysis = context.marketIntelligence;
  const currentPrices = context.prices;

  goods.forEach((good) => {
    if (analysis.priceHistory[currentPort][good].length > 3) {
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
      const seasonalEffect = seasonalPriceFactor(good, currentSeason(context));
      const daysUntilSeasonEnd = daysUntilNextSeason(context.day);
      if (seasonalEffect !== 1) {
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
            ? `${good} price is booming here - good time to sell`
            : `${good} price is in a deep slump here - good time to buy`,
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
    if (goodsAboard(context.ship.hold).length > 0) {
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

export const calculateMean = (values: number[]) => values.reduce((a, b) => a + b) / values.length;
