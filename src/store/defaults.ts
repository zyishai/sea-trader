import { goods, ports, PRICE_UPDATE_INTERVAL, TREND_UPDATE_INTERVAL } from "./constants.js";
import { Context, GameSettings } from "./types.js";
import { generatePrices, generateTrends } from "./utils.js";

export const initialContext = (settings?: GameSettings) => {
  const trends = generateTrends();
  const { extendedGame = false, disableAnimations = false, controls = "keyboard" } = settings || {};
  return {
    currentPort: "Hong Kong",
    availablePorts: ports,
    availableGoods: goods,
    day: 1,
    balance: -900,
    guardFleet: {
      ships: 0,
      quality: 1,
      lastMaintenanceDay: 1,
    },
    reputation: 50,
    ship: {
      health: 100,
      speed: 500,
      capacity: 50,
      hold: goods.reduce((map, good) => map.set(good, 0), new Map()),
    },
    trends,
    prices: generatePrices(trends),
    nextPriceUpdate: PRICE_UPDATE_INTERVAL,
    nextTrendUpdate: TREND_UPDATE_INTERVAL,
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
