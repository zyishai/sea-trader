import {
  EventTemplate,
  EventType,
  Good,
  MarketSize,
  Port,
  PortSpecialization,
  Season,
  TrendStrength,
} from "./types.js";
import { getNetCash } from "./utils.js";

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
// NOTE: The destination gets set in the `traveling` state, if an event changes the course
// of the travel, then update the `destination`. If an event returns the player back to its
// home port, then either update the `destination` to be the same as `currentPort`,
// or set `destination` to `undefined`.
export const eventTemplates: EventTemplate[] = [
  {
    type: "weather",
    severity: "major",
    baseChance: (context) => (context.currentSeason === "Winter" ? 0.25 : 0.1),
    message: "A freezing winter storm approaches! Your crew suggests finding shelter.",
    choices: [
      {
        label: "Push through",
        key: "P",
        effect: (context) => {
          const baseSuccess = context.currentSeason === "Winter" ? 0.3 : 0.5;
          const healthFactor = context.ship.health / 100;
          const success = Math.random() < baseSuccess * healthFactor;

          if (success) {
            return {
              reputation: Math.min(100, context.reputation + 8),
              messages: [...context.messages, ["Your crew's bravery in facing the storm has earned you respect!"]],
            };
          }

          const damage =
            context.currentSeason === "Winter"
              ? Math.floor(Math.random() * 25) + 15 // 15-40 damage
              : Math.floor(Math.random() * 15) + 10; // 10-25 damage
          const guardDamage = context.guardFleet.ships > 0 ? Math.floor(damage * 0.7) : 0;
          return {
            ship: {
              ...context.ship,
              health: Math.max(0, context.ship.health - damage),
            },
            guardFleet:
              guardDamage > 0
                ? {
                    ...context.guardFleet,
                    damage: context.guardFleet.damage + guardDamage,
                  }
                : context.guardFleet,
            messages: [
              ...context.messages,
              [
                `The harsh weather caused ${damage} damage to your ship${guardDamage ? ` and ${guardDamage} damage to your guard fleet` : ""}.`,
              ],
            ],
          };
        },
      },
      {
        label: "Seek shelter (costs $300)",
        key: "S",
        effect: (context) => ({
          balance: context.balance - 300,
          day: context.day + 2,
          messages: [...context.messages, ["You paid for safe harbor and waited out the storm."]],
        }),
      },
      {
        label: "Take a long detour",
        key: "D",
        effect: (context) => ({
          day: context.day + 4,
          messages: [...context.messages, ["You avoided the storm but lost significant time navigating around it."]],
        }),
      },
    ],
  },
  {
    type: "weather",
    severity: "minor",
    baseChance: (context) => Math.min(0.3, 0.2 + (context.ship.speed - BASE_SHIP_SPEED) * 0.02),
    message: "A light breeze speeds up your journey",
    effect: (context) => ({
      day: Math.max(1, context.day - 1),
    }),
  },
  {
    type: "weather",
    severity: "moderate",
    baseChance: (context) => Math.min(0.25, 0.15 + (context.ship.speed - BASE_SHIP_SPEED) * 0.015),
    message: "A storm approaches your vessel.\nWhat's your course of action?",
    choices: [
      {
        label: "Brave the storm",
        key: "B",
        effect: (context) => {
          const baseDamage = 20;
          const overloadMultiplier = context.ship.isOverloaded ? 1.5 : 1;
          const damage = Math.round(baseDamage * overloadMultiplier);

          return {
            ship: {
              ...context.ship,
              health: Math.max(0, context.ship.health - damage),
            },
            day: context.day + 1,
            messages: [...context.messages, ["You weathered the storm but took some damage."]],
          };
        },
      },
      {
        label: "Take a detour",
        key: "D",
        effect: (context) => ({
          day: context.day + 3,
          messages: [...context.messages, ["You avoided the storm but lost valuable time."]],
        }),
      },
    ],
  },
  {
    type: "weather",
    severity: "major",
    baseChance: 0.18,
    message: "A typhoon has been spotted ahead!\nSeeking shelter will cost 200 silver dollars in harbor fees.",
    choices: [
      {
        label: "Pay harbor fees (200 silver dollars)",
        key: "P",
        effect: (context) => ({
          day: context.day + 2,
          balance: context.balance - 200,
          messages: [...context.messages, ["You paid harbor fees and weathered the storm safely."]],
        }),
      },
      {
        label: "Risk sailing through",
        key: "R",
        effect: (context) => {
          const success = Math.random() < 0.4;
          if (success) {
            return {
              reputation: Math.min(100, context.reputation + 10),
              messages: [...context.messages, ["Your bold gamble paid off! Your reputation increases."]],
            };
          }
          const damage = Math.floor(Math.random() * 20) + 10;
          return {
            ship: {
              ...context.ship,
              health: Math.max(0, context.ship.health - damage),
            },
            messages: [...context.messages, [`The typhoon severly damaged your ship (${damage} damage).`]],
          };
        },
      },
    ],
  },
  {
    type: "weather",
    severity: "minor",
    baseChance: (context) => (context.ship.isOverloaded ? 0.35 : 0),
    message: "Heavy seas have damaged some cargo",
    effect: (context) => {
      const goodsInHold = [...context.ship.hold.entries()].filter(([_, quantity]) => quantity > 0);
      const pick = goodsInHold[Math.floor(Math.random() * goodsInHold.length)];
      if (!pick) return {};
      const [randomGood] = pick;
      const currentQuantity = context.ship.hold.get(randomGood) || 0;
      const lostAmount = Math.ceil(currentQuantity * 0.2); // Lose 20% of the goods

      const newHold = new Map(context.ship.hold);
      newHold.set(randomGood, currentQuantity - lostAmount);

      return {
        ship: {
          ...context.ship,
          hold: newHold,
        },
        messages: [...context.messages, [`Lost ${lostAmount} picul of ${randomGood} due to overloaded cargo.`]],
      };
    },
  },
  {
    type: "cargo",
    severity: "minor",
    baseChance: (context) => ([...context.ship.hold.values()].some((quantity) => quantity > 0) ? 0.15 : 0),
    message: "Your crew reports cargo stability issues\ndue to poor loading at port.",
    choices: [
      {
        label: "Take time to redistribute the load",
        key: "R",
        effect: (context) => ({
          day: context.day + 1,
          messages: [...context.messages, ["You spent a day rebalancing the cargo."]],
        }),
      },
      {
        label: "Continue as is",
        key: "C",
        effect: (context) => {
          const success = Math.random() < 0.6; // 60% chance to make it safely
          if (success) {
            return {
              messages: [...context.messages, ["Despite the stability issues, you managed to continue safely."]],
            };
          }

          const goodsInHold = [...context.ship.hold.entries()].filter(([_, quantity]) => quantity > 0);
          const [randomGood] = goodsInHold[Math.floor(Math.random() * goodsInHold.length)] || [];
          if (!randomGood) return {}; // Shouldn't happen, see baseChance for this event

          const currentQuantity = context.ship.hold.get(randomGood) || 0;
          const lostAmount = Math.ceil(currentQuantity * 0.25);
          const newHold = new Map(context.ship.hold);
          newHold.set(randomGood, currentQuantity - lostAmount);

          return {
            ship: {
              ...context.ship,
              hold: newHold,
            },
            messages: [
              ...context.messages,
              [`Lost ${lostAmount} picul of ${randomGood} due to poor cargo distribution.`],
            ],
          };
        },
      },
    ],
  },
  {
    type: "market",
    severity: "minor",
    baseChance: (context) =>
      (["Hong Kong", "Shanghai", "Nagasaki"] as Port[]).includes(context.destination ?? context.currentPort) ? 0.15 : 0,
    message: "Local festival increases demand for tea",
    effect: (context) => ({
      prices: {
        ...context.prices,
        [context.destination!]: {
          ...context.prices[context.destination!],
          Tea: Math.round(context.prices[context.destination!].Tea * 1.3),
        },
      },
    }),
  },
  {
    type: "discovery",
    severity: "minor",
    baseChance: 0.15,
    message: "You spot an uncharted island! Investigate?",
    choices: [
      {
        label: "Explore the island",
        key: "E",
        effect: (context) => {
          const outcome = Math.random();

          // 60% chance of finding goods
          if (outcome < 0.6) {
            const randomGood = goods[Math.floor(Math.random() * goods.length)] as Good;
            const baseAmount = 15;
            const wealthFactor = Math.max(1, Math.log10(getNetCash(context) / 1000));
            const amount = Math.round(baseAmount * wealthFactor);

            return {
              ship: {
                ...context.ship,
                hold: context.ship.hold.set(randomGood, (context.ship.hold.get(randomGood) || 0) + amount),
              },
              day: context.day + 1,
              messages: [...context.messages, [`Found ${amount} picul of ${randomGood} after a day of exploration!`]],
            };
          }

          // 25% of ship damage
          if (outcome < 0.85) {
            const damage = Math.floor(Math.random() * 15) + 5;
            return {
              ship: {
                ...context.ship,
                health: Math.max(0, context.ship.health - damage),
              },
              day: context.day + 1,
              messages: [...context.messages, [`Your ship struck a reef during exploration (${damage} damage).`]],
            };
          }

          // 15% chance of losing time and some crew morale (represented by reputation)
          return {
            day: context.day + 2,
            reputation: Math.max(0, context.reputation - 2),
            messages: [
              ...context.messages,
              ["The island exploration yielded nothing but wasted time.", "The crew's morale has suffered slightly."],
            ],
          };
        },
      },
      {
        label: "Continue journey",
        key: "C",
        effect: (context) => ({
          messages: [...context.messages, ["Better safe then sorry - you continue on your planned route."]],
        }),
      },
    ],
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
  { name: "Tea", basePrice: 80, volatility: 0.15, bulkiness: 1.0 },
  { name: "Spices", basePrice: 150, volatility: 0.2, bulkiness: 1.0 },
  { name: "Opium", basePrice: 300, volatility: 0.25, bulkiness: 1.0 },
  { name: "Porcelain", basePrice: 45, volatility: 0.05, bulkiness: 1.0 },
  // { name: "Wheat", basePrice: 25, volatility: 0.1, bulkiness: 1.0 },
  // { name: "Tea", basePrice: 80, volatility: 0.15, bulkiness: 1.4 },
  // { name: "Spices", basePrice: 150, volatility: 0.2, bulkiness: 0.8 },
  // { name: "Opium", basePrice: 300, volatility: 0.25, bulkiness: 0.6 },
  // { name: "Porcelain", basePrice: 45, volatility: 0.05, bulkiness: 1.2 },
] as const;

// Gameplay
export const GOAL_DAYS = 200;
export const EXTENDED_GAME_PENALTY = 0.01;
export const SEASON_LENGTH = 30; // days

// Player Vessel
export const BASE_SHIP_CAPACITY = 120; // In tons burden
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
export const DAMAGE_REPAIR_COST_PER_UNIT = 75;
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
  weak: { up: 1.05, down: 0.95 },
  moderate: { up: 1.15, down: 0.85 },
  strong: { up: 1.25, down: 0.75 },
};
export const SEASONAL_EFFECTS: Record<Season, Partial<Record<Good, number>>> = {
  Spring: { Tea: 1.15, Spices: 1.1, Wheat: 0.9 },
  Summer: { Porcelain: 1.2, Spices: 1.15, Tea: 0.9 },
  Autumn: { Opium: 1.1, Porcelain: 0.9 },
  Winter: { Tea: 1.2, Spices: 0.9 },
};
export const PORT_SPECIALIZATIONS: Record<Port, PortSpecialization> = {
  "Hong Kong": {
    producedGoods: [],
    tradingHub: true,
    marketSize: "Large",
    productionFactor: 0.95,
  },
  Shanghai: {
    producedGoods: ["Tea", "Opium"],
    tradingHub: false,
    marketSize: "Large",
    productionFactor: 0.85,
  },
  Nagasaki: {
    producedGoods: ["Porcelain"],
    tradingHub: false,
    marketSize: "Medium",
    productionFactor: 0.9,
  },
  Singapore: {
    producedGoods: [],
    tradingHub: true,
    marketSize: "Medium",
    productionFactor: 0.95,
  },
  Manila: {
    producedGoods: ["Spices"],
    tradingHub: false,
    marketSize: "Small",
    productionFactor: 0.9,
  },
};
export const MARKET_SIZE_FACTORS: Record<MarketSize, number> = {
  Small: 1.1, // Higher prices, more volatile
  Medium: 1,
  Large: 0.95, // Lower prices, more stable
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
export const MAX_DAILY_OVERDRAFT = 50; // Maximum daily interest rate
export const BASE_INTEREST_RATE = 0.03; // 3% daily interest
