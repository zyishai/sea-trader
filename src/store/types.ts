import { goods, goodsInfo, ports } from "./constants.js";

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
  effect: (context: Context) => Partial<Context>;
};
export type EventTemplate = {
  type: EventType;
  severity: EventSeverity;
  baseChance: number | ((context: Context) => number);
  message: string;
  effect?: (context: Context) => Partial<Context>;
  choices?: EventChoice[];
};

// Shipyard
export type ShipStatus = "Perfect" | "Minor damages" | "Major damages" | "Wreckage";
export type FleetQuality = "Basic" | "Trained" | "Elite";

// Inventory & Market
export type BulkinessCategory = "Compact" | "Standard" | "Bulky";
export type Good = (typeof goods)[number];
export type Port = (typeof ports)[number];
export type Trend = "increasing" | "decreasing" | "stable";
export type GoodInfo = (typeof goodsInfo)[number];
export type MarketInfoLevel = 1 | 2 | 3;

// Context
export type Context = {
  // Game-wide context
  currentPort: Port;
  day: number;
  balance: number;

  // Port context
  availablePorts: readonly Port[];
  destination?: Port;
  currentEvent?: EventTemplate;

  // Market context
  availableGoods: readonly Good[];
  prices: Record<Port, Record<Good, number>>;
  trends: Record<Port, Record<Good, Trend>>;
  marketIntelligence: {
    level: MarketInfoLevel;
    lastPurchase: number;
  };
  nextPriceUpdate: number;
  nextTrendUpdate: number;

  // Shipyard context
  guardFleet: {
    ships: number;
    quality: number; // 1-3
    lastMaintenanceDay: number;
    damage: number;
  };
  reputation: number; // 0-100
  ship: {
    health: number;
    defense: number;
    speed: number;
    capacity: number; // In tons burden
    hold: Map<Good, number>; // Quantity in picul
    isOverloaded: boolean;
  };

  // Misc
  inOverdraft: boolean;
  lastOverdraftChargeDay: number;
  messages: string[][];
  canRetire: boolean;

  // Settings
  extendedGame: boolean;
  settings: Omit<Required<GameSettings>, "extendedGame">;
};

// Upgrades
export type UpgradeType = "speed" | "defense" | "capacity";
export type ShipClass = "Coastal Junk" | "Brig" | "Clipper";
