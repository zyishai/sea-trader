import { EventType, Season, TrendStrength } from "./types.js";

export const seasons = ["Spring", "Summer", "Autumn", "Winter"] as const;
export const seasonEventEffects: Record<Season, Partial<Record<EventType, number>>> = {
  Spring: {
    weather: 1.2,
    discovery: 1.3,
  },
  Summer: {
    weather: 0.8,
    market: 1.2,
  },
  Autumn: {
    weather: 1.4,
    cargo: 1.2,
  },
  Winter: {
    weather: 1.3,
    discovery: 0.7,
    cargo: 1.3,
  },
};

// Gameplay
export const GOAL_DAYS = 200;
export const EXTENDED_GAME_PENALTY = 0.01;
export const SEASON_LENGTH = 30; // days

// Ship
export const DAMAGE_REPAIR_COST_PER_UNIT = 37;
export const OVERLOAD_BUFFER = 0.2;
export const OVERLOAD_SPEED_PENALTY = 0.3;
export const OVERLOAD_DAMAGE_PENALTY = 0.5;

// Market
export const PRICE_UPDATE_INTERVAL = 14;
export const TREND_DIRECTION = ["increasing", "decreasing", "stable"] as const;
export const TREND_STRENGTH = ["weak", "moderate", "strong"] as const;
export const TREND_SYMBOLS = {
  UP: "▲",
  DOWN: "▽",
  SAME: "―",
} as const;
export const TREND_STRENGTH_FACTORS: Record<TrendStrength, { up: number; down: number }> = {
  weak: { up: 1.15, down: 0.85 },
  moderate: { up: 1.35, down: 0.65 },
  strong: { up: 1.6, down: 0.4 },
};

// Guard Ships
export const MAX_GUARD_SHIPS = 10;
export const MAX_GUARD_QUALITY = 3;
export const BASE_GUARD_COST = 800;
export const DAMAGE_PER_GUARD_SHIP = 75; // Damage needed to destroy one guard ship
export const MAINTENANCE_COST_PER_SHIP = 25;

// Finance
export const BASE_BALANCE = 1500;
export const BANKRUPTCY_THRESHOLD = -4000; // When debt exceeds this, player goes bankrupt
export const OVERDRAFT_TRADING_LIMIT = 2000; // How much additional debt allowed for trading (if debt exceeds this - take desperate measures)
export const MAX_DAILY_OVERDRAFT = 50; // Most interest charged in one day
export const BASE_INTEREST_RATE = 0.03; // 3% daily interest
