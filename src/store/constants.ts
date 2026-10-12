import { EventType, Good, MarketSize, Port, PortSpecialization, Season, TrendStrength } from "./types.js";

export const goods = ["Wheat", "Tea", "Spices", "Opium", "Porcelain"] as const;
export const ports = ["Hong Kong", "Shanghai", "Nagasaki", "Singapore", "Manila"] as const;
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
// Distances given in nautical miles (nmi)
export const distanceMatrix: Record<Port, Record<Port, number>> = {
  "Hong Kong": { "Hong Kong": 0, Shanghai: 819, Nagasaki: 1150, Singapore: 1460, Manila: 706 },
  Shanghai: { "Hong Kong": 819, Shanghai: 0, Nagasaki: 480, Singapore: 2279, Manila: 1307 },
  Nagasaki: { "Hong Kong": 1150, Shanghai: 480, Nagasaki: 0, Singapore: 2561, Manila: 1668 },
  Singapore: { "Hong Kong": 1460, Shanghai: 2279, Nagasaki: 2561, Singapore: 0, Manila: 1308 },
  Manila: { "Hong Kong": 706, Shanghai: 1307, Nagasaki: 1668, Singapore: 1308, Manila: 0 },
} as const;
export const goodsInfo: { name: Good; basePrice: number; volatility: number }[] = [
  { name: "Wheat", basePrice: 100, volatility: 0.35 },
  { name: "Tea", basePrice: 400, volatility: 0.45 },
  { name: "Spices", basePrice: 800, volatility: 0.55 },
  { name: "Opium", basePrice: 2000, volatility: 0.65 },
  { name: "Porcelain", basePrice: 300, volatility: 0.4 },
] as const;

// Gameplay
export const GOAL_DAYS = 200;
export const EXTENDED_GAME_PENALTY = 0.01;
export const SEASON_LENGTH = 30; // days

// Player Vessel
export const BASE_SHIP_CAPACITY = 120; // In picul
export const CAPACITY_UPGRADES = [
  { capacity: 180, cost: 2000 },
  { capacity: 240, cost: 3500 },
  { capacity: 320, cost: 5000, reputation: 5 },
  { capacity: 400, cost: 8000 },
  { capacity: 500, cost: 12_000, reputation: 8 },
  { capacity: 650, cost: 25_000, reputation: 10 },
] as const;
export const BASE_SHIP_SPEED = 8; // In knots
export const SPEED_UPGRADES = [
  { speed: 10, cost: 1500 },
  { speed: 12, cost: 2500 },
  { speed: 14, cost: 4000, reputation: 5 },
  { speed: 16, cost: 6000 },
  { speed: 18, cost: 9000 },
  { speed: 20, cost: 15_000, reputation: 10 },
] as const;
export const BASE_SHIP_DEFENSE = 5;
export const DEFENSE_UPGRADES = [
  { defense: 20, cost: 1200 },
  { defense: 35, cost: 3000, reputation: 5 },
  { defense: 55, cost: 6000, reputation: 8 },
  { defense: 80, cost: 12_000, reputation: 10 },
] as const;
export const MAX_SHIP_DEFENSE = DEFENSE_UPGRADES[DEFENSE_UPGRADES.length - 1]!.defense;
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
export const SEASONAL_EFFECTS: Record<Season, Partial<Record<Good, number>>> = {
  Spring: { Tea: 1.4, Spices: 1.25, Wheat: 0.7 },
  Summer: { Porcelain: 1.5, Spices: 1.3, Tea: 0.7 },
  Autumn: { Opium: 1.35, Porcelain: 0.7 },
  Winter: { Tea: 1.45, Spices: 0.65 },
};
export const PORT_SPECIALIZATIONS: Record<Port, PortSpecialization> = {
  "Hong Kong": {
    producedGoods: [],
    tradingHub: true,
    marketSize: "Large",
    productionFactor: 0.8,
  },
  Shanghai: {
    producedGoods: ["Tea", "Opium"],
    tradingHub: false,
    marketSize: "Large",
    productionFactor: 0.7,
  },
  Nagasaki: {
    producedGoods: ["Porcelain"],
    tradingHub: false,
    marketSize: "Medium",
    productionFactor: 0.75,
  },
  Singapore: {
    producedGoods: [],
    tradingHub: true,
    marketSize: "Medium",
    productionFactor: 0.8,
  },
  Manila: {
    producedGoods: ["Spices"],
    tradingHub: false,
    marketSize: "Small",
    productionFactor: 0.75,
  },
};
export const MARKET_SIZE_FACTORS: Record<MarketSize, number> = {
  Small: 1.25, // Higher prices, more volatile
  Medium: 1,
  Large: 0.85, // Lower prices, more stable
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
