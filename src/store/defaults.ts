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
import { Context, GameSettings } from "./types.js";
import { generatePrices, generateTrends } from "./utils.js";

export const initialContext = (settings?: GameSettings) => {
  const season = seasons[Math.floor(Math.random() * seasons.length)]!;
  const trends = generateTrends();
  const { extendedGame = false, disableAnimations = false, controls = "keyboard" } = settings || {};
  return {
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
      capacity: BASE_SHIP_CAPACITY,
      hold: goods.reduce((map, good) => map.set(good, 0), new Map()),
      isOverloaded: false,
    },
    trends,
    prices: generatePrices(trends, season),
    nextPriceUpdate: PRICE_UPDATE_INTERVAL,
    marketIntelligence: {
      level: 1,
      lastPurchase: 1,
    },
    inOverdraft: false,
    lastOverdraftChargeDay: 1,
    messages: [],
    canRetire: false,
    extendedGame,
    settings: {
      disableAnimations,
      controls,
    },
  } satisfies Context;
};
