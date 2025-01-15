import { goods, ports } from "./constants.js";

export type GameSettings = {
  extendedGame?: boolean;
  disableAnimations?: boolean;
  controls?: "keyboard" | "arrows";
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
export type FleetQuality = "Basic" | "Trained" | "Elite";
export type Good = (typeof goods)[number];
export type Port = (typeof ports)[number];
export type Trend = "increasing" | "decreasing" | "stable";
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
  marketAction?: "buy" | "sell";
  availableGoods: readonly Good[];
  prices: Record<Port, Record<Good, number>>;
  trends: Record<Port, Record<Good, Trend>>;
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
    speed: number;
    capacity: number;
    hold: Map<Good, number>;
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
