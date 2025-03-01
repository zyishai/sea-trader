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
const weatherEvents: EventTemplate[] = [
  {
    type: "weather",
    severity: "major",
    baseChance: (context) => (context.currentSeason === "Winter" ? 0.2 : 0.08),
    message: "Captain, a freezing winter storm approaches! Our crew suggests finding shelter.",
    choices: [
      {
        label: "Push through",
        key: "P",
        effect: (context) => {
          const baseSuccess = 0.4 + context.ship.health / 200;
          const success = Math.random() < baseSuccess;

          if (success) {
            const reputationGain = Math.round(5 + (context.day / GOAL_DAYS) * 5);
            return {
              reputation: Math.min(100, context.reputation + reputationGain),
              messages: [
                ...context.messages,
                ["Our crew's bravery has earned us respect!", `Gained ${reputationGain} reputation.`],
              ],
            };
          }

          const baseDamage = Math.floor(Math.random() * 20) + 15; // 15-35 damage
          const seasonMultiplier = context.currentSeason === "Winter" ? 1.3 : 1;
          const damage = Math.round(baseDamage * seasonMultiplier);
          return {
            ship: {
              ...context.ship,
              health: Math.max(0, context.ship.health - damage),
            },
            reputation: Math.max(0, context.reputation - 3),
            messages: [
              ...context.messages,
              [
                `The storm caused ${damage} damage to our ship, Captain.`,
                "The crew questions your judgment in challenging such weather..",
              ],
            ],
          };
        },
      },
      {
        label: "Seek shelter (costs $200-400)",
        key: "S",
        effect: (context) => {
          const harborFee = Math.round(200 * (1 + context.day / GOAL_DAYS));
          return {
            balance: context.balance - harborFee,
            day: context.day + 2,
            messages: [...context.messages, [`Paid $${harborFee} for safe harbor and waited out the storm.`]],
          };
        },
      },
      {
        label: "Take a long detour",
        key: "D",
        effect: (context) => ({
          day: context.day + 4,
          messages: [...context.messages, ["We avoided the storm but lost significant time navigating around it."]],
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
    message: "A storm approaches our vessel, Captain. What's your course of action?",
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
            messages: [...context.messages, ["We weathered the storm but took some damage."]],
          };
        },
      },
      {
        label: "Take a detour",
        key: "D",
        effect: (context) => ({
          day: context.day + 3,
          messages: [...context.messages, ["We avoided the storm but lost valuable time."]],
        }),
      },
    ],
  },
  {
    type: "weather",
    severity: "major",
    baseChance: 0.18,
    message: "A typhoon has been spotted ahead! Seeking shelter will cost us $200 in harbor fees.",
    choices: [
      {
        label: "Pay harbor fees ($200)",
        key: "P",
        effect: (context) => ({
          day: context.day + 2,
          balance: context.balance - 200,
          messages: [...context.messages, ["We paid harbor fees and weathered the storm safely."]],
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
              messages: [...context.messages, ["Captain, your bold gamble paid off! Our reputation increases."]],
            };
          }
          const damage = Math.floor(Math.random() * 20) + 10;
          return {
            ship: {
              ...context.ship,
              health: Math.max(0, context.ship.health - damage),
            },
            messages: [...context.messages, [`The typhoon severly damaged our ship, Captain (${damage} damage).`]],
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
        messages: [
          ...context.messages,
          [`Captain, we've lost ${lostAmount} picul of ${randomGood} due to overloaded cargo.`],
        ],
      };
    },
  },
];
const cargoEvents: EventTemplate[] = [
  {
    type: "cargo",
    severity: "minor",
    baseChance: (context) => {
      const cargoLoad = [...context.ship.hold.values()].reduce((sum, qty) => sum + qty, 0);
      const capacityRatio = cargoLoad / context.ship.capacity;
      return Math.min(0.25, 0.15 + capacityRatio * 0.2);
    },
    message: "Captain, we have cargo stability issues due to poor loading at port.",
    choices: [
      {
        label: "Take time to redistribute the load",
        key: "R",
        effect: (context) => {
          const success = Math.random() < 0.8;
          if (success) {
            return {
              day: context.day + 1,
              reputation: Math.min(100, context.reputation + 2),
              messages: [
                ...context.messages,
                [
                  "We spent a day rebalancing the cargo.",
                  "Our efficiency impressed local merchants, Captain (+2 reputation).",
                ],
              ],
            };
          }

          const lossRatio = 0.1 + Math.random() * 0.15; // 0.1-0.25
          const goodsInHold = [...context.ship.hold.entries()].filter(([_, qty]) => qty > 0);
          const newHold = new Map(context.ship.hold);

          goodsInHold.forEach(([good, quantity]) => {
            const loss = Math.ceil(quantity * lossRatio);
            newHold.set(good, quantity - loss);
          });

          return {
            ship: { ...context.ship, hold: newHold },
            day: context.day + 1,
            messages: [
              ...context.messages,
              ["Captain, we lost some cargo during redistribution despite our best efforts."],
            ],
          };
        },
      },
      {
        label: "Continue carefully",
        key: "C",
        effect: (context) => {
          const success = Math.random() < 0.6; // 60% chance to make it safely
          if (success) {
            return {
              messages: [...context.messages, ["Despite the stability issues, we managed to continue safely."]],
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
    type: "cargo",
    severity: "minor",
    baseChance: (context) => (context.ship.health > 80 ? 0.2 : 0),
    message: "Your well-maintained ship allows for efficient cargo storage!",
    effect: (context) => {
      const extraSpace = Math.floor(context.ship.capacity * 0.1);
      return {
        ship: {
          ...context.ship,
          capacity: context.ship.capacity + extraSpace,
        },
        messages: [
          ...context.messages,
          [`Expert maintenance has yielded ${extraSpace} additional cargo space, Captain!`],
        ],
      };
    },
  },
];
const marketEvents: EventTemplate[] = [
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
    type: "market",
    severity: "moderate",
    baseChance: (context) => (context.destination && context.destination === "Nagasaki" ? 0.15 : 0),
    message: "The Shogunate has announced new trade regulations in Nagasaki.",
    effect: (context) => ({
      prices: {
        ...context.prices,
        Nagasaki: {
          ...context.prices.Nagasaki,
          Porcelain: Math.round(context.prices.Nagasaki.Porcelain * 0.7),
          Opium: Math.round(context.prices.Nagasaki.Opium * 1.5),
        },
      },
      messages: [...context.messages, ["New regulations have shifted demand in the Japanese market."]],
    }),
  },
  {
    type: "market",
    severity: "major",
    baseChance: (context) =>
      context.destination === "Hong Kong" || context.destination === "Shanghai" ? 0.12 : context.destination ? 0.08 : 0,
    message: "Captain! A foreign trade delegation has arrived! Their presence could significantly impact the market.",
    choices: [
      {
        label: "Host a banquet ($500)",
        key: "H",
        effect: (context) => {
          const success = Math.random() < 0.8;
          if (success) {
            const targetGoods = ["Porcelain", "Tea"] as const;
            return {
              balance: context.balance - 500,
              reputation: Math.min(100, context.reputation + 5),
              prices: {
                ...context.prices,
                [context.destination!]: {
                  ...context.prices[context.destination!],
                  ...Object.fromEntries(
                    targetGoods.map((good) => [good, Math.round(context.prices[context.destination!][good] * 1.4)]),
                  ),
                },
              },
              messages: [
                ...context.messages,
                [
                  "The delegation was impressed by our hospitality!",
                  "Demand for Porcelain and Tea has increased significantly.",
                ],
              ],
            };
          }

          return {
            balance: context.balance - 500,
            reputation: Math.min(100, context.reputation + 2),
            messages: [...context.messages, ["The delegation was unimpressed by our efforts, Captain."]],
          };
        },
      },
      {
        label: "Observe from afar",
        key: "O",
        effect: (context) => {
          const success = Math.random() < 0.4;
          if (success) {
            return {
              prices: {
                ...context.prices,
                [context.destination!]: {
                  ...context.prices[context.destination!],
                  Tea: Math.round(context.prices[context.destination!].Tea * 1.2),
                },
              },
              messages: [
                ...context.messages,
                [
                  "We've gathered some useful market intelligence by watching the delegation's activities.",
                  "Tea prices are rising by 20%.",
                ],
              ],
            };
          }

          return {
            messages: [...context.messages, ["We've missed an opportunity to influence the market."]],
          };
        },
      },
    ],
  },
  {
    type: "market",
    severity: "moderate",
    baseChance: (context) => (context.destination ? 0.15 : 0),
    message: "Captain, our network of informants reports unusual merchant activity in nearby ports.",
    choices: [
      {
        label: "Investigate ($300)",
        key: "I",
        effect: (context) => {
          const success = Math.random() < 0.75;
          if (success) {
            const targetPort = [...ports]
              .sort(() => (Math.random() < 0.5 ? 1 : -1))
              .find((p) => p !== context.destination);
            if (!targetPort) return {};

            return {
              balance: context.balance - 300,
              prices: {
                ...context.prices,
                [targetPort]: {
                  ...context.prices[targetPort],
                  Opium: Math.round(context.prices[targetPort].Opium * 1.5),
                  Spices: Math.round(context.prices[targetPort].Spices * 1.4),
                },
              },
              messages: [
                ...context.messages,
                [`Our contacts reveal high demand for Opium and Spices in ${targetPort}!`],
              ],
            };
          }

          return {
            balance: context.balance - 300,
            messages: [...context.messages, ["Our sources proved unreliable."]],
          };
        },
      },
      {
        label: "Trade on rumors",
        key: "T",
        effect: (context) => {
          const success = Math.random() < 0.5;
          if (success) {
            return {
              reputation: Math.min(100, context.reputation + 3),
              prices: {
                ...context.prices,
                [context.destination!]: {
                  ...context.prices[context.destination!],
                  Spices: Math.round(context.prices[context.destination!].Spices * 1.25),
                },
              },
              messages: [...context.messages, ["Our market moves caused a surge in spice prices, Captain!"]],
            };
          }

          return {
            reputation: Math.max(0, context.reputation - 2),
            messages: [...context.messages, ["Our speculation backfired and hurt our reputation."]],
          };
        },
      },
    ],
  },
  {
    type: "market",
    severity: "major",
    baseChance: (context) => (context.destination ? 0.08 : 0),
    message: "A perfect trade opportunity presents itself!",
    effect: (context) => {
      const good = goods[Math.floor(Math.random() * goods.length)];
      const multiplier = 2 + Math.random();

      if (!good) return {};

      return {
        prices: {
          ...context.prices,
          [context.destination!]: {
            ...context.prices[context.destination!],
            [good]: Math.round(context.prices[context.destination!][good] * multiplier),
          },
        },
        messages: [
          ...context.messages,
          [`Extraordinary demand for ${good.toLocaleLowerCase()} has caused prices to skyrocket!`],
        ],
      };
    },
  },
  {
    type: "market",
    severity: "minor",
    baseChance: (context) => (context.destination === "Shanghai" ? 0.12 : 0),
    message: "Local merchants are stockpiling goods!",
    effect: (context) => ({
      prices: {
        ...context.prices,
        Shanghai: {
          ...context.prices.Shanghai,
          Tea: Math.round(context.prices.Shanghai.Tea * 0.8),
        },
      },
    }),
  },
];
const discoveryEvents: EventTemplate[] = [
  {
    type: "discovery",
    severity: "minor",
    baseChance: (context) => Math.min(0.15, 0.05 + (context.day / GOAL_DAYS) * 0.1),
    message: "Captain, we've spotted an uncharted island! Shall we investigate?",
    choices: [
      {
        label: "Explore the island",
        key: "E",
        effect: (context) => {
          const outcome = Math.random();
          const baseReward = Math.max(500, context.balance * 0.15);

          // 50% chance of finding goods
          if (outcome < 0.5) {
            const goodsFound = Math.floor(2 + Math.random() * 3); // 2-4
            const newHold = new Map(context.ship.hold);
            const discoveries = [];

            for (let i = 0; i < goodsFound; i++) {
              const good = goods[Math.floor(Math.random() * goods.length)] as Good;
              const amount = Math.round(10 * (1 + context.day / GOAL_DAYS));
              newHold.set(good, (newHold.get(good) || 0) + amount);
              discoveries.push(`${amount} picul of ${good}.`);
            }

            return {
              ship: {
                ...context.ship,
                hold: newHold,
              },
              day: context.day + 1,
              reputation: Math.min(100, context.reputation + 3),
              balance: context.balance + baseReward,
              messages: [
                ...context.messages,
                [
                  "A successful expedition, Captain!",
                  `Found $${baseReward} in a buried chest.`,
                  ...discoveries.map((d) => `Found ${d}`),
                ],
              ],
            };
          }

          // 30% of ship damage
          if (outcome < 0.8) {
            const damage = Math.floor(Math.random() * 15) + 10; // 10-24 damage
            return {
              ship: {
                ...context.ship,
                health: Math.max(0, context.ship.health - damage),
              },
              day: context.day + 1,
              messages: [...context.messages, [`Our ship struck a reef during exploration (${damage} damage).`]],
            };
          }

          // 20% chance of losing time and some crew morale (represented by reputation)
          return {
            day: context.day + 2,
            reputation: Math.max(0, context.reputation - 3),
            messages: [
              ...context.messages,
              ["The island exploration yielded nothing but wasted time.", "Our crew's morale has suffered slightly."],
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
  {
    type: "discovery",
    severity: "major",
    baseChance: (context) => (context.destination && context.reputation >= 75 ? 0.08 : 0),
    message: "A veteran sailor shares rumors of a secret trading route!",
    choices: [
      {
        label: "Follow the lead",
        key: "F",
        effect: (context) => {
          const success = Math.random() < 0.6;
          if (success) {
            return {
              reputation: Math.min(100, context.reputation + 5),
              prices: {
                ...context.prices,
                [context.destination!]: {
                  ...context.prices[context.destination!],
                  Spices: Math.round(context.prices[context.destination!].Spices * 1.8),
                  Tea: Math.round(context.prices[context.destination!].Tea * 1.6),
                },
              },
              messages: [
                ...context.messages,
                [
                  "We've discovered a lucrative trade route, Captain!",
                  "Knowledge of this route has increased our reputation.",
                  "Local merchants are offering premium prices for Tea and Spices.",
                ],
              ],
            };
          }

          return {
            day: context.day + 2,
            messages: [...context.messages, ["The lead turned out to be a dead end, Captain."]],
          };
        },
      },
      {
        label: "Share with merchants",
        key: "S",
        effect: (context) => {
          return {
            reputation: Math.min(100, context.reputation + 8),
            prices: {
              ...context.prices,
              [context.destination!]: {
                ...context.prices[context.destination!],
                Spices: Math.round(context.prices[context.destination!].Spices * 1.3),
                Tea: Math.round(context.prices[context.destination!].Tea * 1.3),
              },
            },
            messages: [
              ...context.messages,
              [
                "The merchants appreciate our openness, Captain!",
                "Our reputation has increased significantly.",
                "The shared route has moderately increased local prices.",
              ],
            ],
          };
        },
      },
    ],
  },
];
// NOTE: The destination gets set in the `traveling` state, if an event changes the course
// of the travel, then update the `destination`. If an event returns the player back to its
// home port, then either update the `destination` to be the same as `currentPort`,
// or set `destination` to `undefined`.
export const eventTemplates: EventTemplate[] = [...weatherEvents, ...cargoEvents, ...marketEvents, ...discoveryEvents];
// Distances given in nautical miles (nmi)
export const distanceMatrix: Record<Port, Record<Port, number>> = {
  "Hong Kong": { "Hong Kong": 0, Shanghai: 819, Nagasaki: 1150, Singapore: 1460, Manila: 706 },
  Shanghai: { "Hong Kong": 819, Shanghai: 0, Nagasaki: 480, Singapore: 2279, Manila: 1307 },
  Nagasaki: { "Hong Kong": 1150, Shanghai: 480, Nagasaki: 0, Singapore: 2561, Manila: 1668 },
  Singapore: { "Hong Kong": 1460, Shanghai: 2279, Nagasaki: 2561, Singapore: 0, Manila: 1308 },
  Manila: { "Hong Kong": 706, Shanghai: 1307, Nagasaki: 1668, Singapore: 1308, Manila: 0 },
} as const;
export const goodsInfo: { name: Good; basePrice: number; volatility: number; bulkiness: number }[] = [
  { name: "Wheat", basePrice: 100, volatility: 0.35, bulkiness: 1.0 },
  { name: "Tea", basePrice: 400, volatility: 0.45, bulkiness: 1.0 },
  { name: "Spices", basePrice: 800, volatility: 0.55, bulkiness: 1.0 },
  { name: "Opium", basePrice: 2000, volatility: 0.65, bulkiness: 1.0 },
  { name: "Porcelain", basePrice: 300, volatility: 0.4, bulkiness: 1.0 },
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
export const MAX_DAILY_OVERDRAFT = 50; // Maximum daily interest rate
export const BASE_INTEREST_RATE = 0.03; // 3% daily interest
