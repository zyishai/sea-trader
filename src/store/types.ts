import { seasons, TREND_DIRECTION, TREND_STRENGTH } from "./constants.js";
import type { MarketSize, Port } from "./catalog/ports.js";
import type { Ship } from "./ship.js";
import type { Good } from "./catalog/goods.js";
import { Rng } from "./rng.js";
import { Hold } from "./hold.js";
import { CargoOffer } from "./cargo-offer.js";
import { EventResult } from "./outcomes.js";

export type GameSettings = {
  extendedGame?: boolean;
  disableAnimations?: boolean;
  controls?: "keyboard" | "arrows";
};

// Events
export type EventType = "weather" | "cargo" | "market" | "encounter" | "discovery" | "special";
export type EventSeverity = "minor" | "moderate" | "major";
export type EventChoice = {
  label: string;
  key: string;
  effect: (context: Context) => EventResult;
};
export type EventTemplate = {
  id: string;
  type: EventType;
  severity: EventSeverity;
  baseChance: number | ((context: Context) => number);
  message: string;
  effect?: (context: Context) => EventResult;
  choices?: EventChoice[];
};

// Shipyard
export type ShipStatus = "Perfect" | "Minor damages" | "Major damages" | "Wreckage";
export type FleetQuality = "Basic" | "Trained" | "Elite";

// Inventory & Market
export type { Good };
export type { MarketSize, Port };
export type Trend = (typeof TREND_DIRECTION)[number];
export type TrendStrength = (typeof TREND_STRENGTH)[number];
export type TrendInfo = {
  direction: Trend;
  strength: TrendStrength;
  duration: number; // How many updates this trend will last
  reliability: number; // 0-100, affects price prediction accuracy
};
export type Season = (typeof seasons)[number];

// Intelligence
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

export type VoyageEnd = "retired" | "bankrupt" | "declaredBankrupt" | "shipwrecked";

// Context
export type Context = {
  rng: Rng;

  // Game-wide context
  currentPort: Port;
  day: number;
  balance: number;
  startingSeason: Season;

  // Port context
  availablePorts: readonly Port[];
  destination?: Port;
  currentEvent?: EventTemplate["id"];
  cargoOffer?: CargoOffer;
  delayDays?: number;
  voyageEnd?: VoyageEnd;

  // Market context
  availableGoods: readonly Good[];
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
  messages: string[][];

  // Settings
  extendedGame: boolean;
  settings: Omit<Required<GameSettings>, "extendedGame">;
};

// Upgrades
