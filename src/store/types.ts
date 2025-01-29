import { goods, goodsInfo, ports, seasons, TREND_DIRECTION, TREND_STRENGTH } from "./constants.js";

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
export type MarketSize = "Small" | "Medium" | "Large";
export type PortSpecialization = {
  producedGoods: Good[];
  tradingHub: boolean;
  marketSize: MarketSize;
  productionFactor: number;
};
export type Trend = (typeof TREND_DIRECTION)[number];
export type TrendStrength = (typeof TREND_STRENGTH)[number];
export type TrendInfo = {
  direction: Trend;
  strength: TrendStrength;
  duration: number; // How many updates this trend will last
  reliability: number; // 0-100, affects price prediction accuracy
};
export type Season = (typeof seasons)[number];
export type GoodInfo = (typeof goodsInfo)[number];
export type MarketInfoLevel = 1 | 2 | 3;
export type MerchantTip = {
  minRep: number;
  getMessage(context: Context): string | undefined;
};

// Context
export type PriceHistory = {
  price: number;
  day: number;
  season: Season;
};
export type Context = {
  // Game-wide context
  currentPort: Port;
  day: number;
  balance: number;
  currentSeason: Season;
  nextSeasonDay: number;

  // Port context
  availablePorts: readonly Port[];
  destination?: Port;
  currentEvent?: EventTemplate;

  // Market context
  availableGoods: readonly Good[];
  prices: Record<Port, Record<Good, number>>;
  trends: Record<Port, Record<Good, TrendInfo>>;
  marketIntelligence: {
    level: MarketInfoLevel;
    lastPurchase: number;
    trendChanges: number; // Number of trend changes since last purchase
    seasonChanges: number;
    priceUpdates: number;
    analysis: {
      priceHistory: Record<Port, Record<Good, PriceHistory[]>>;
      typicalRanges: Record<Port, Record<Good, { min: number; max: number }>>;
    };
  };
  nextPriceUpdate: number;

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
