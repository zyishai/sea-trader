import { CargoOffer } from "./cargo-offer.js";
import { Good, goods } from "./catalog/goods.js";
import { Port, STARTING_PORT, ports } from "./catalog/ports.js";
import { STARTING_VESSEL_CLASS } from "./catalog/vessels.js";
import { Season, seasons } from "./clock.js";
import { EventTemplate } from "./events/templates.js";
import { TrendInfo, generatePrices, generateTrends } from "./market/prices.js";
import { PriceHistory, Range } from "./market/tips.js";
import { Rng } from "./rng.js";
import { Ship, newShip } from "./ship.js";
import { BASE_BALANCE } from "./treasury.js";

export type GameSettings = {
  extendedGame?: boolean;
  disableAnimations?: boolean;
  controls?: "keyboard" | "arrows";
};

export type VoyageEnd = "retired" | "bankrupt" | "declaredBankrupt" | "shipwrecked";

export type Context = {
  rng: Rng;

  // Game-wide context
  currentPort: Port;
  day: number;
  balance: number;
  startingSeason: Season;

  // Port context
  destination?: Port;
  currentEvent?: EventTemplate["id"];
  cargoOffer?: CargoOffer;
  delayDays?: number;
  voyageEnd?: VoyageEnd;

  // Market context
  prices: Record<Port, Record<Good, number>>;
  trends: Record<Port, Record<Good, TrendInfo>>;
  marketIntelligence: {
    priceHistory: Record<Port, Record<Good, PriceHistory[]>>;
    typicalRanges: Record<Port, Record<Good, Range>>;
  };

  // Shipyard context
  guardFleet: {
    ships: number;
    quality: number; // 1-3
    damage: number;
  };
  reputation: number; // 0-100
  ship: Ship;

  // Misc
  announcedOverdraft: boolean;
  notices: string[][];

  // Settings
  extendedGame: boolean;
  settings: Omit<Required<GameSettings>, "extendedGame">;
};

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
    notices: [],
    extendedGame,
    settings: {
      disableAnimations,
      controls,
    },
  } satisfies Context;
};
