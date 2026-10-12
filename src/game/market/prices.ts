import { Good, goodCatalog, goods, seasonalPriceFactor } from "../catalog/goods.js";
import { MARKET_SIZE_FACTORS, Port, portRecord, ports } from "../catalog/ports.js";
import { Season } from "../clock.js";
import { Rng } from "../rng.js";

export type Trend = (typeof TREND_DIRECTION)[number];

export type TrendStrength = (typeof TREND_STRENGTH)[number];

export type TrendInfo = {
  direction: Trend;
  strength: TrendStrength;
  duration: number; // How many updates this trend will last
  reliability: number; // 0-100, affects price prediction accuracy
};

export const TREND_DIRECTION = ["increasing", "decreasing", "stable"] as const;
export const TREND_STRENGTH = ["weak", "moderate", "strong"] as const;

export const generateTrendInfo = (rng: Rng): TrendInfo => {
  const direction: Trend = rng.pick(TREND_DIRECTION)!;
  const strength: TrendStrength = rng.pick(TREND_STRENGTH)!;

  const durationRanges: Record<TrendStrength, { min: number; max: number }> = {
    weak: { min: 1, max: 3 },
    moderate: { min: 2, max: 4 },
    strong: { min: 3, max: 5 },
  };

  const range = durationRanges[strength];
  const duration = rng.int(range.min, range.max);

  return {
    direction,
    strength,
    duration,
    reliability: rng.int(70, 99),
  };
};

export const generateTrends = (rng: Rng) =>
  ports.reduce(
    (accPorts, port) => ({
      ...accPorts,
      [port]: goods.reduce(
        (accGoods, good) => ({
          ...accGoods,
          [good]: generateTrendInfo(rng),
        }),
        {},
      ),
    }),
    {} as Record<Port, Record<Good, TrendInfo>>,
  );

export const updateTrends = (trends: Record<Port, Record<Good, TrendInfo>>, rng: Rng) => {
  return ports.reduce(
    (accPorts, port) => ({
      ...accPorts,
      [port]: goods.reduce((accGoods, good) => {
        const currentTrend = trends[port][good];
        if (currentTrend.duration <= 1) {
          return { ...accGoods, [good]: generateTrendInfo(rng) };
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

export const getTrendFactor = (trendInfo: TrendInfo, rng: Rng) => {
  const baseFactor =
    trendInfo.direction === "stable"
      ? 1
      : TREND_STRENGTH_FACTORS[trendInfo.strength][trendInfo.direction === "increasing" ? "up" : "down"];
  // Add randomization based on reliability
  const maxVariation = (100 - trendInfo.reliability) / 200; // Less reliable = more variation
  return baseFactor * (1 + (rng.float() - 0.5) * maxVariation);
};

export const getSeasonalFactor = (season: Season, good: Good, rng: Rng) => {
  const baseFactor = seasonalPriceFactor(good, season);
  return baseFactor * (1 + (rng.float() - 0.5) * 0.1); // ±5% variation
};

export const getSpecialtyFactor = (port: Port, good: Good) => {
  const { marketSize, produces, productionFactor: localFactor, tradingHub } = portRecord(port);
  const marketSizeFactor = MARKET_SIZE_FACTORS[marketSize];
  const productionFactor = produces.includes(good) ? localFactor : 1;
  const tradingHubFactor = tradingHub ? 0.95 : 1;

  return marketSizeFactor * productionFactor * tradingHubFactor;
};

export const generatePrices = (trends: Record<Port, Record<Good, TrendInfo>>, season: Season, rng: Rng) =>
  ports.reduce(
    (accPorts, port) => ({
      ...accPorts,
      [port]: goods.reduce((accGoods, good) => {
        const { basePrice, volatility } = goodCatalog[good];
        const trendFactor = getTrendFactor(trends[port][good], rng);
        const seasonalFactor = getSeasonalFactor(season, good, rng);
        const specialtyFactor = getSpecialtyFactor(port, good);
        const randomFactor = 1 + (rng.float() - 0.5) * 2 * volatility;

        return {
          ...accGoods,
          [good]: Math.round(basePrice * trendFactor * specialtyFactor * seasonalFactor * randomFactor),
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

export const TREND_STRENGTH_FACTORS: Record<TrendStrength, { up: number; down: number }> = {
  weak: { up: 1.15, down: 0.85 },
  moderate: { up: 1.35, down: 0.65 },
  strong: { up: 1.6, down: 0.4 },
};
