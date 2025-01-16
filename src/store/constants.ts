import { EventTemplate, Good, Port } from "./types.js";
import { getNetCash } from "./utils.js";

export const goods = ["Wheat", "Tea", "Spices", "Opium", "Porcelain"] as const;
export const ports = ["Hong Kong", "Shanghai", "Nagasaki", "Singapore", "Manila"] as const;
export const eventTemplates: EventTemplate[] = [
  {
    type: "weather",
    severity: "minor",
    baseChance: 0.2,
    message: "A light breeze speeds up your journey",
    effect: (context) => ({
      day: Math.max(1, context.day - 1),
      currentPort: context.destination,
    }),
  },
  {
    type: "weather",
    severity: "moderate",
    baseChance: 0.1,
    message: "A storm damages your ship",
    effect: (context) => ({
      ship: { ...context.ship, health: Math.max(0, context.ship.health - 18) },
      currentPort: context.destination,
    }),
  },
  {
    type: "weather",
    severity: "major",
    baseChance: 0.05,
    message: "A hurricane forces you back to land and damages your ship severely",
    effect: (context) => ({ ship: { ...context.ship, health: Math.max(0, context.ship.health - 34) } }),
  },
  {
    type: "market",
    severity: "minor",
    baseChance: 0.15,
    message: "Local festival increases demand for tea",
    effect: (context) => ({
      prices: {
        ...context.prices,
        [context.destination!]: {
          ...context.prices[context.destination!],
          Tea: Math.round(context.prices[context.destination!].Tea * 1.3),
        },
      },
      currentPort: context.destination,
    }),
  },
  {
    type: "market",
    severity: "moderate",
    baseChance: 0.1,
    message: "Trade regulations change, affecting prices of goods",
    effect: (context) => {
      const newPrices = { ...context.prices };
      goods.forEach((good) => {
        if (Math.random() > 0.5) {
          const price = context.prices[context.destination!][good];
          const factor = Math.random() > 0.5 ? 1.4 : 0.6;
          newPrices[context.destination!][good] = Math.round(price * factor);
        }
      });

      return { prices: newPrices, currentPort: context.destination };
    },
  },
  {
    type: "discovery",
    severity: "minor",
    baseChance: 0.1,
    message: "You discover a small island with rare goods",
    effect: (context) => {
      const randomGood = goods[Math.floor(Math.random() * goods.length)] as Good;
      const baseAmount = 10;
      const wealthFactor = Math.max(1, Math.log10(getNetCash(context) / 1000));
      const amount = Math.round(baseAmount * wealthFactor);
      return {
        ship: {
          ...context.ship,
          hold: context.ship.hold.set(randomGood, (context.ship.hold.get(randomGood) || 0) + amount),
        },
        currentPort: context.destination,
      };
    },
  },
];
// Distances given in nautical miles (nmi)
export const distanceMatrix: Record<Port, Record<Port, number>> = {
  "Hong Kong": { "Hong Kong": 0, Shanghai: 819, Nagasaki: 1150, Singapore: 1460, Manila: 706 },
  Shanghai: { "Hong Kong": 819, Shanghai: 0, Nagasaki: 480, Singapore: 2279, Manila: 1307 },
  Nagasaki: { "Hong Kong": 1150, Shanghai: 480, Nagasaki: 0, Singapore: 2561, Manila: 1668 },
  Singapore: { "Hong Kong": 1460, Shanghai: 2279, Nagasaki: 2561, Singapore: 0, Manila: 1308 },
  Manila: { "Hong Kong": 706, Shanghai: 1307, Nagasaki: 1668, Singapore: 1308, Manila: 0 },
} as const;
export const goodsInfo: { name: Good; basePrice: number; volatility: number; bulkiness: number }[] = [
  { name: "Wheat", basePrice: 25, volatility: 0.1, bulkiness: 1.0 },
  { name: "Tea", basePrice: 80, volatility: 0.15, bulkiness: 1.4 },
  { name: "Spices", basePrice: 150, volatility: 0.2, bulkiness: 0.8 },
  { name: "Opium", basePrice: 300, volatility: 0.25, bulkiness: 0.6 },
  { name: "Porcelain", basePrice: 45, volatility: 0.05, bulkiness: 1.2 },
] as const;

// Gameplay
export const GOAL_DAYS = 200;
export const EXTENDED_GAME_PENALTY = 0.01;

// Player Vessel
export const BASE_SHIP_CAPACITY = 120; // In tons burden
export const _future_CAPACITY_UPGRADES = [
  { capacity: 180, cost: 2000 },
  { capacity: 240, cost: 3500 },
  { capacity: 320, cost: 5000 },
  { capacity: 400, cost: 8000 },
  { capacity: 500, cost: 12_000 },
  { capacity: 650, cost: 25_000 },
];
export const BASE_SHIP_SPEED = 8; // In knots
export const MAX_SHIP_SPEED = 20;
export const SPEED_UPGRADE_INCREMENT = 2;
export const DAMAGE_REPAIR_COST_PER_UNIT = 75;

// Market
export const PRICE_UPDATE_INTERVAL = 14;
export const TREND_UPDATE_INTERVAL = 21;

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
export const MAX_DAILY_OVERDRAFT = 50; // Maximum daily interest rate
export const BASE_INTEREST_RATE = 0.03; // 3% daily interest
