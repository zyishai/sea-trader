import { BASE_BALANCE, seasons } from "./constants.js";
import { Context, GameSettings, Good, Port, PriceHistory, Range } from "./types.js";
import { generatePrices, generateTrends } from "./utils.js";
import { Rng } from "./rng.js";
import { newShip } from "./ship.js";
import { STARTING_VESSEL_CLASS } from "./catalog/vessels.js";
import { goods } from "./catalog/goods.js";
import { ports, STARTING_PORT } from "./catalog/ports.js";

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
    currentPort: STARTING_PORT,
    startingSeason: season,
    availablePorts: ports,
    availableGoods: goods,
    day: 1,
    balance: BASE_BALANCE,
    guardFleet: {
      ships: 0,
      quality: 1,
      damage: 0,
    },
    reputation: 50,
    ship: newShip(STARTING_VESSEL_CLASS),
    trends,
    prices: initialPrices,
    marketIntelligence: {
      priceHistory: emptyPriceHistory,
      typicalRanges: emptyTypicalRanges,
    },
    announcedOverdraft: false,
    messages: [],
    extendedGame,
    settings: {
      disableAnimations,
      controls,
    },
  } satisfies Context;
};
