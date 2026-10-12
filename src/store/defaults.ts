import {
  BASE_BALANCE,
  BASE_SHIP_CAPACITY,
  BASE_SHIP_DEFENSE,
  BASE_SHIP_SPEED,
  goods,
  ports,
  PRICE_UPDATE_INTERVAL,
  SEASON_LENGTH,
  seasons,
} from "./constants.js";
import { Context, GameSettings, Good, Port, PriceHistory, Range } from "./types.js";
import { generatePrices, generateTrends } from "./utils.js";
import { Rng } from "./rng.js";
import { emptyHold } from "./hold.js";

export const initialContext = (rng: Rng, settings?: GameSettings) => {
  const { extendedGame = false, disableAnimations = false, controls = "keyboard" } = settings || {};
  const season = rng.pick(seasons)!;
  const trends = generateTrends(rng);
  const initialPrices = generatePrices(trends, season, rng);

  const emptyPriceHistory = {} as Record<Port, Record<Good, PriceHistory[]>>;
  const emptyTypicalRanges = {} as Record<Port, Record<Good, Range>>;

  ports.forEach((port) => {
    // @ts-expect-error temporary value
    emptyPriceHistory[port] = {};
    // @ts-expect-error temporary value
    emptyTypicalRanges[port] = {};
    goods.forEach((good) => {
      emptyPriceHistory[port][good] = [];
      emptyTypicalRanges[port][good] = {
        min: initialPrices[port][good],
        max: initialPrices[port][good],
        mean: initialPrices[port][good],
      };
    });
  });

  return {
    rng,
    currentPort: "Hong Kong",
    currentSeason: season,
    nextSeasonDay: SEASON_LENGTH,
    availablePorts: ports,
    availableGoods: goods,
    day: 1,
    balance: BASE_BALANCE,
    guardFleet: {
      ships: 0,
      quality: 1,
      lastMaintenanceDay: 1,
      damage: 0,
    },
    reputation: 50,
    ship: {
      health: 100,
      defense: BASE_SHIP_DEFENSE,
      speed: BASE_SHIP_SPEED, // 8 - 20 knots
      hold: emptyHold(BASE_SHIP_CAPACITY),
    },
    trends,
    prices: initialPrices,
    nextPriceUpdate: PRICE_UPDATE_INTERVAL,
    marketIntelligence: {
      level: 1,
      lastPurchase: 1,
      trendChanges: 0,
      seasonChanges: 0,
      priceUpdates: 0,
      analysis: {
        priceHistory: emptyPriceHistory,
        typicalRanges: emptyTypicalRanges,
      },
    },
    announcedOverdraft: false,
    lastInterestDay: 1,
    messages: [],
    canRetire: false,
    extendedGame,
    settings: {
      disableAnimations,
      controls,
    },
  } satisfies Context;
};
