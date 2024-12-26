import { EventTemplate, Good, Port } from "./types.js";

export const goods = ["Wheat", "Tea", "Spices", "Opium", "Porcelain"] as const;
export const ports = ["Hong Kong", "Shanghai", "Nagasaki", "Singapore", "Manila"] as const;
export const GOAL_DAYS = 100;
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
      ship: { ...context.ship, health: Math.max(0, context.ship.health - 12) },
      currentPort: context.destination,
    }),
  },
  {
    type: "weather",
    severity: "major",
    baseChance: 0.05,
    message: "A hurricane forces you back to land and damages your ship severely",
    effect: (context) => ({ ship: { ...context.ship, health: Math.max(0, context.ship.health - 23) } }),
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
          Tea: Math.round(context.prices[context.destination!].Tea * 1.2),
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
          const factor = Math.random() > 0.5 ? 1.3 : 0.7;
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
      return {
        ship: {
          ...context.ship,
          hold: context.ship.hold.set(randomGood, (context.ship.hold.get(randomGood) || 0) + 10),
        },
        currentPort: context.destination,
      };
    },
  },
];
export const distanceMatrix: Record<Port, Record<Port, number>> = {
  "Hong Kong": { "Hong Kong": 0, Shanghai: 819, Nagasaki: 1150, Singapore: 1460, Manila: 706 },
  Shanghai: { "Hong Kong": 819, Shanghai: 0, Nagasaki: 480, Singapore: 2279, Manila: 1307 },
  Nagasaki: { "Hong Kong": 1150, Shanghai: 480, Nagasaki: 0, Singapore: 2561, Manila: 1668 },
  Singapore: { "Hong Kong": 1460, Shanghai: 2279, Nagasaki: 2561, Singapore: 0, Manila: 1308 },
  Manila: { "Hong Kong": 706, Shanghai: 1307, Nagasaki: 1668, Singapore: 1308, Manila: 0 },
} as const;
export const goodsInfo: { name: Good; basePrice: number; volatility: number }[] = [
  { name: "Wheat", basePrice: 20, volatility: 0.1 },
  { name: "Tea", basePrice: 50, volatility: 0.15 },
  { name: "Spices", basePrice: 80, volatility: 0.2 },
  { name: "Opium", basePrice: 150, volatility: 0.25 },
  { name: "Porcelain", basePrice: 30, volatility: 0.05 },
] as const;
export const EXTENDED_GAME_PENALTY = 0.01;
export const PRICE_UPDATE_INTERVAL = 14;
export const TREND_UPDATE_INTERVAL = 21;
export const GUARD_SHIP_COST = 125;
