import { goods, ports } from "./constants.js";

export type GameSettings = {
  extendedGame?: boolean;
  disableAnimations?: boolean;
};
export type EventType = "weather" | "market" | "encounter" | "discovery";
export type EventSeverity = "minor" | "moderate" | "major";
export type EventTemplate = {
  type: EventType;
  severity: EventSeverity;
  baseChance: number;
  message: string;
  effect: (state: Context) => Partial<Context>;
};
export type ShipStatus = "Perfect" | "Minor damages" | "Major damages" | "Wreckage";
export type BuyEvent = { type: "BUY_GOOD"; good: Good; quantity: number };
export type SellEvent = { type: "SELL_GOOD"; good: Good; quantity: number };
export type RepairEvent = { type: "REPAIR_SHIP"; damage: number };
export type Good = (typeof goods)[number];
export type Port = (typeof ports)[number];
export type Trend = "increasing" | "decreasing" | "stable";
export type Context = {
  // Game-wide context
  currentPort: Port;
  day: number;
  balance: number;
  ship: {
    health: number;
    speed: number;
    capacity: number;
    hold: Map<Good, number>;
  };
  prices: Record<Port, Record<Good, number>>;
  trends: Record<Port, Record<Good, Trend>>;
  nextPriceUpdate: number;
  nextTrendUpdate: number;

  // Port context
  availablePorts: readonly Port[];
  destination?: Port;
  guardShips: number;
  currentEvent?: EventTemplate;

  // Market context
  marketAction?: "buy" | "sell";
  availableGoods: readonly Good[];
  good?: Good;
  quantity?: number;

  // Misc
  messages: string[][];
  canRetire: boolean;

  // Settings
  extendedGame: boolean;
  settings: {
    disableAnimations: boolean;
  };
};
