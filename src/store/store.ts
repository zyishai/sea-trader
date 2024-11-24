import { assign, emit, setup } from "xstate";
import { type Guard } from "xstate/guards";

// ===== Constants =====
export const goods = ["Wheat", "Tea", "Spices", "Opium", "Clay"] as const;
export const ports = ["Hong Kong", "Shanghai", "Nagasaki", "Singapore", "Manila"] as const;
export const distanceMatrix: Record<Port, Record<Port, number>> = {
  "Hong Kong": { "Hong Kong": 0, Shanghai: 819, Nagasaki: 1150, Singapore: 1460, Manila: 706 },
  Shanghai: { "Hong Kong": 819, Shanghai: 0, Nagasaki: 480, Singapore: 2279, Manila: 1307 },
  Nagasaki: { "Hong Kong": 1150, Shanghai: 480, Nagasaki: 0, Singapore: 2561, Manila: 1668 },
  Singapore: { "Hong Kong": 1460, Shanghai: 2279, Nagasaki: 2561, Singapore: 0, Manila: 1308 },
  Manila: { "Hong Kong": 706, Shanghai: 1307, Nagasaki: 1668, Singapore: 1308, Manila: 0 },
} as const;
const goodsInfo: { name: Good; basePrice: number; volatility: number }[] = [
  { name: "Wheat", basePrice: 20, volatility: 0.1 },
  { name: "Tea", basePrice: 50, volatility: 0.15 },
  { name: "Spices", basePrice: 80, volatility: 0.2 },
  { name: "Opium", basePrice: 150, volatility: 0.25 },
  { name: "Clay", basePrice: 30, volatility: 0.05 },
] as const;
const eventTemplates: EventTemplate[] = [
  {
    type: "weather",
    severity: "minor",
    baseChance: 0.2,
    message: "A light breeze speeds up your journey",
    effect: (context) => ({
      day: Math.max(1, context.day - 1),
      currentPort: context.destination,
      destination: undefined,
      currentEvent: undefined,
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
      destination: undefined,
      currentEvent: undefined,
    }),
  },
  {
    type: "weather",
    severity: "major",
    baseChance: 0.05,
    message: "A hurricane forces you back to land and damages your ship severely",
    effect: (context) => ({
      ship: { ...context.ship, health: Math.max(0, context.ship.health - 23) },
      destination: undefined,
    }),
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
      destination: undefined,
      currentEvent: undefined,
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

      return { prices: newPrices, currentPort: context.destination, destination: undefined, currentEvent: undefined };
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
        destination: undefined,
        currentEvent: undefined,
      };
    },
  },
];
const GOAL_DAYS = 100;
const EXTENDED_GAME_PENALTY = 0.01;
const PRICE_UPDATE_INTERVAL = 14;

// ===== Types =====
export type Good = (typeof goods)[number];
export type Port = (typeof ports)[number];
type Trend = "increasing" | "decreasing" | "stable";
type ShipStatus = "Perfect" | "Minor damages" | "Major damages" | "Wreckage";
type EventType = "weather" | "market" | "encounter" | "discovery";
type EventSeverity = "minor" | "moderate" | "major";
export interface EventTemplate {
  type: EventType;
  severity: EventSeverity;
  baseChance: number;
  message: string;
  effect: (state: Context) => Partial<Context>;
}
type Context = {
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
  currentEvent?: EventTemplate;
  destination?: Port;
  messages: MessageBucket;
  canRetire: boolean;
  extendedGame: boolean;
};
export type MessageSpec = { message: string } | { delay: number } | { command: "clear" | "ack" };
class MessageBucket {
  public readonly messages: MessageSpec[] = [];

  append(msg: MessageSpec) {
    this.messages.push(msg);
    return this;
  }
}
type BuyEvent = { type: "BUY_GOOD"; good: Good; quantity: number };
type SellEvent = { type: "SELL_GOOD"; good: Good; quantity: number };
type RepairEvent = { type: "REPAIR_SHIP"; damage: number };

// ===== Utility Methods =====
export const calculateTravelTime = (from: Port, to: Port, shipSpeed: number) => {
  const distance = distanceMatrix[from][to];
  const baseTime = 3; // base time
  const speedFactor = 1000 / shipSpeed; // Adjust this value to balance the impact of ship speed
  return Math.max(baseTime, Math.ceil(baseTime + (distance / 500) * speedFactor));
};
const generateTrends = () =>
  ports.reduce(
    (accPorts, port) => ({
      ...accPorts,
      [port]: goods.reduce(
        (accGoods, good) => ({
          ...accGoods,
          [good]: ["increasing", "decreasing", "stable"][Math.floor(Math.random() / 0.4)],
        }),
        {},
      ),
    }),
    {} as Record<Port, Record<Good, Trend>>,
  );
const generatePrices = (trends: Record<Port, Record<Good, Trend>>) =>
  ports.reduce(
    (accPorts, port) => ({
      ...accPorts,
      [port]: goodsInfo.reduce((accGoods, good) => {
        const trend = trends[port][good.name];
        const trendFactor = trend === "increasing" ? 1.1 : trend === "decreasing" ? 0.9 : 1;
        const randomFactor = 1 + (Math.random() - 0.5) * 2 * good.volatility; // Opium: [0.75, 1.25)
        return { ...accGoods, [good.name]: Math.round(good.basePrice * trendFactor * randomFactor) };
      }, {}),
    }),
    {} as Record<Port, Record<Good, number>>,
  );
const calculatePrice = ({
  prices,
  currentPort,
  good,
  quantity,
}: {
  prices: Record<Port, Record<Good, number>>;
  currentPort: Port;
  good: Good;
  quantity: number;
}) => prices[currentPort][good] * quantity;
export const getAvailableStorage = (ship: Context["ship"]) =>
  ship.capacity - [...ship.hold.values()].reduce((sum, tons) => sum + tons);
export const getShipStatus = (health: number): ShipStatus =>
  health >= 90 ? "Perfect" : health >= 70 ? "Minor damages" : health >= 40 ? "Major damages" : "Wreckage";
export const calculateCostForRepair = (damageToRepair: number) => damageToRepair * 57; // How much it'll cost to repair `damageToRepair` damage.
export const calculateRepairForCost = (price: number) => Math.floor(price / 57); // How much damage can be repaired with `price`.
export const calculateEventChance = (template: EventTemplate, context: Context) => {
  let chance = template.baseChance;

  switch (template.type) {
    case "weather": {
      chance *= context.day / GOAL_DAYS; // Weather events become more likely as the game progresses
      break;
    }
    case "market": {
      chance *= context.balance / 10000; // Market events become more likely as the player gets richer
      break;
    }
    case "encounter": {
      chance *= 1 - context.ship.health / 100; // Encounters become more likely when the ship health is low
      break;
    }
    case "discovery": {
      chance *= context.day / GOAL_DAYS; // Discoveries become more likely as the game progresses
      break;
    }
  }

  return Math.min(chance, 1);
};
const checkForEvent = (context: Context) => {
  for (const template of eventTemplates) {
    const chance = calculateEventChance(template, context);
    if (Math.random() < chance) {
      return template;
    }
  }

  return;
};
export const getNetCash = (context: Context) =>
  context.balance +
  [...context.ship.hold.entries()].reduce(
    (sum, [good, quan]) => sum + context.prices[context.currentPort][good] * quan,
    0,
  );
export const calculateScore = (context: Context) => {
  let score = Math.round(getNetCash(context) / 100);

  // Add a logarithmic bonus for ship capacity
  // This provides diminishing returns for larger capacities
  const capacityBonus = Math.floor(800 * Math.log10(context.ship.capacity + 1));
  score += capacityBonus;

  // Add a logarithmic bonus for ship speed
  // This, too, provides diminishing returns for larger capacities
  const speedBonus = Math.floor(1200 * Math.log10(context.ship.speed + 1));
  score += speedBonus;

  // Calculate damage penalty
  // The penalty increases with ship size and is more severe for lower health
  const maxDamage = context.ship.capacity * 10;
  const actualDamage = maxDamage * (1 - context.ship.health / 100);
  const damagePenalty = Math.floor(actualDamage);
  score -= damagePenalty;

  if (context.extendedGame) {
    const extraDays = context.day - GOAL_DAYS;
    const penaltyFactor = 1 - extraDays * EXTENDED_GAME_PENALTY;
    return Math.floor(score * penaltyFactor);
  } else {
    return score;
  }
};

// ===== Default Values =====
const initialContext = (extendedGame = false) => {
  const trends = generateTrends();
  return {
    currentPort: "Hong Kong",
    day: 1,
    balance: 1000,
    ship: {
      health: 100,
      speed: 500,
      capacity: 50,
      hold: goods.reduce((map, good) => map.set(good, 0), new Map()),
    },
    trends,
    prices: generatePrices(trends),
    nextPriceUpdate: PRICE_UPDATE_INTERVAL,
    messages: new MessageBucket(),
    canRetire: false,
    extendedGame,
  } satisfies Context;
};

// ===== Game =====
// See bug: https://github.com/statelyai/xstate/pull/4516
// See workaround: https://github.com/statelyai/xstate/issues/5090#issuecomment-2388661190
export const gameMachine = setup({
  types: {
    context: {} as Context,
    events: {} as
      | { type: "START_GAME"; extended?: boolean }
      | { type: "TRAVEL_TO"; destination: Port }
      | BuyEvent
      | SellEvent
      | RepairEvent
      | { type: "RESOLVE_EVENT" }
      | { type: "MSG_ACK"; id?: string }
      | { type: "RETIRE" }
      | { type: "RESTART_GAME" }
      | { type: "SHOW_HELP" }
      | { type: "HIDE_HELP" },
    emitted: {} as { type: "messages"; messages: MessageSpec[] },
  },
}).createMachine({
  initial: "introScreen",
  context: initialContext(),
  states: {
    introScreen: {
      id: "introScreen",
      on: {
        START_GAME: { target: "gameScreen", actions: assign(({ event }) => initialContext(event.extended)) },
        SHOW_HELP: { target: "helpScreen" },
      },
    },
    gameScreen: {
      initial: "idle",
      states: {
        idle: {
          id: "idle",
          on: {
            TRAVEL_TO: {
              target: "travel",
              actions: [
                assign(({ context, event }) => ({
                  messages: new MessageBucket(),
                  currentEvent: checkForEvent(context),
                  destination: event.destination,
                })),
              ],
            },
            BUY_GOOD: [
              {
                target: "buy",
                actions: assign({ messages: new MessageBucket() }),
              },
            ],
            SELL_GOOD: [
              {
                target: "sell",
                actions: assign({ messages: new MessageBucket() }),
              },
            ],
            REPAIR_SHIP: [
              {
                target: "repair",
                actions: assign({ messages: new MessageBucket() }),
              },
            ],
          },
        },
        travel: {
          initial: "checkDays",
          states: {
            checkDays: {
              always: [
                {
                  guard: ({ context }) => !context.extendedGame && context.day >= 100,
                  actions: [
                    assign(({ context }) => ({
                      messages: context.messages
                        .append({ message: "You've finished your 100 days voyage." })
                        .append({ delay: 2000 })
                        .append({ command: "clear" }),
                    })),
                    emit(({ context }) => ({ type: "messages", messages: context.messages.messages })),
                  ],
                  target: "#idle",
                },
                { target: "checkingEvent" },
              ],
            },
            checkingEvent: {
              always: [
                { guard: ({ context }) => !!context.currentEvent, target: "eventOccurred" },
                { target: "traveling" },
              ],
            },
            eventOccurred: {
              entry: [
                assign(({ context }) => ({
                  messages: context.messages
                    .append({ message: context.currentEvent!.message })
                    .append({ delay: 1000 })
                    .append({ command: "clear" }),
                })),
              ],
              always: { target: "traveling" },
            },
            traveling: {
              entry: [
                assign(({ context }) => ({
                  messages: context.messages
                    .append({ message: `Arrived to ${context.destination}` })
                    .append({ delay: 1000 })
                    .append({ command: "clear" })
                    .append({ command: "ack" }),
                })),
                emit(({ context }) => ({ type: "messages", messages: context.messages.messages })),
              ],
              on: {
                MSG_ACK: {
                  target: "#idle",
                  actions: [
                    // Apply event, if applicable
                    assign(({ context }) => (context.currentEvent ? context.currentEvent.effect(context) : {})),

                    // Adjust travel attributes
                    assign(({ context }) => {
                      const travelTime = context.destination
                        ? calculateTravelTime(context.currentPort, context.destination, context.ship.speed)
                        : 1;
                      return {
                        currentPort: context.destination ?? context.currentPort,
                        day: Math.min(context.extendedGame ? Infinity : 100, context.day + travelTime),
                        nextPriceUpdate: Math.max(0, context.nextPriceUpdate - travelTime),
                      };
                    }),

                    // Clear plate
                    assign({ destination: undefined, currentEvent: undefined, messages: new MessageBucket() }),
                  ],
                },
              },
            },
          },
        },
        buy: {
          initial: "checkCashSuffice",
          states: {
            checkCashSuffice: {
              always: [
                {
                  guard: ({ context, event }) =>
                    context.balance >=
                    calculatePrice({
                      prices: context.prices,
                      currentPort: context.currentPort,
                      good: (event as BuyEvent).good,
                      quantity: (event as SellEvent).quantity,
                    }),
                  target: "checkStorageAvailable",
                },
                {
                  actions: [
                    assign(({ context }) => ({
                      messages: context.messages
                        .append({ message: "You don't have enough cash" })
                        .append({ delay: 1000 })
                        .append({ command: "clear" })
                        .append({ command: "ack" }),
                    })),
                    emit(({ context }) => ({ type: "messages", messages: context.messages.messages })),
                  ],
                  target: "fail",
                },
              ],
            },
            checkStorageAvailable: {
              always: [
                {
                  guard: ({ context, event }) => (event as BuyEvent).quantity <= getAvailableStorage(context.ship),
                  target: "buying",
                },
                {
                  actions: [
                    assign(({ context }) => ({
                      messages: context.messages
                        .append({ message: "You don't have enough storage room" })
                        .append({ delay: 1000 })
                        .append({ command: "clear" })
                        .append({ command: "ack" }),
                    })),
                    emit(({ context }) => ({ type: "messages", messages: context.messages.messages })),
                  ],
                  target: "fail",
                },
              ],
            },
            buying: {
              entry: [
                assign(({ context, event }) => ({
                  balance:
                    context.balance -
                    calculatePrice({
                      prices: context.prices,
                      currentPort: context.currentPort,
                      good: (event as BuyEvent).good,
                      quantity: (event as BuyEvent).quantity,
                    }),
                  hold: context.ship.hold.set(
                    (event as BuyEvent).good,
                    (context.ship.hold.get((event as BuyEvent).good) ?? 0) + (event as BuyEvent).quantity,
                  ),
                })),
              ],
              after: { 0: { target: "#idle" } },
            },
            fail: {
              on: {
                MSG_ACK: { target: "#idle" },
              },
            },
          },
          always: [
            {
              guard: ({ event }) => event.type !== "BUY_GOOD",
              target: "#idle",
            },
          ],
        },
        sell: {
          initial: "checkEnoughInHold",
          states: {
            checkEnoughInHold: {
              always: [
                {
                  guard: ({ context, event }) =>
                    (event as SellEvent).quantity > 0 &&
                    (context.ship.hold.get((event as SellEvent).good) || 0) >= (event as SellEvent).quantity,
                  target: "selling",
                },
                {
                  actions: [
                    assign(({ context, event }) => ({
                      messages: context.messages
                        .append({
                          message: `You don't have enough ${(event as SellEvent).good.toLowerCase()} to sell.`,
                        })
                        .append({ delay: 1000 })
                        .append({ command: "clear" })
                        .append({ command: "ack" }),
                    })),
                    emit(({ context }) => ({ type: "messages", messages: context.messages.messages })),
                  ],
                  target: "fail",
                },
              ],
            },
            selling: {
              entry: [
                assign(({ context, event }) => ({
                  balance:
                    context.balance +
                    calculatePrice({
                      prices: context.prices,
                      currentPort: context.currentPort,
                      good: (event as SellEvent).good,
                      quantity: (event as SellEvent).quantity,
                    }),
                  hold: context.ship.hold.set(
                    (event as SellEvent).good,
                    (context.ship.hold.get((event as SellEvent).good) ?? 0) - (event as SellEvent).quantity,
                  ),
                })),
              ],
              after: { 0: { target: "#idle" } },
            },
            fail: {
              on: {
                MSG_ACK: { target: "#idle" },
              },
            },
          },
          always: [
            {
              guard: ({ event }) => event.type !== "SELL_GOOD",
              target: "#idle",
            },
          ],
        },
        repair: {
          initial: "checkNoExcessRepair",
          states: {
            checkNoExcessRepair: {
              always: [
                {
                  guard: ({ context, event }) =>
                    (event as RepairEvent).damage >= 0 && 100 - context.ship.health >= (event as RepairEvent).damage,
                  target: "checkEnoughMoney",
                },
                {
                  actions: [
                    assign(({ context }) => ({
                      messages: context.messages
                        .append({
                          message: `You can't repair more than ${100 - context.ship.health} damage`,
                        })
                        .append({ delay: 1000 })
                        .append({ command: "clear" })
                        .append({ command: "ack" }),
                    })),
                    emit(({ context }) => ({ type: "messages", messages: context.messages.messages })),
                  ],
                  target: "fail",
                },
              ],
            },
            checkEnoughMoney: {
              always: [
                {
                  guard: ({ context, event }) =>
                    context.balance >= calculateCostForRepair((event as RepairEvent).damage),
                  target: "repairing",
                },
                {
                  actions: [
                    assign(({ context }) => ({
                      messages: context.messages
                        .append({ message: "You don't have enough money to repair your ship" })
                        .append({ delay: 1000 })
                        .append({ command: "clear" })
                        .append({ command: "ack" }),
                    })),
                    emit(({ context }) => ({ type: "messages", messages: context.messages.messages })),
                  ],
                  target: "fail",
                },
              ],
            },
            repairing: {
              entry: [
                assign(({ context, event }) => ({
                  ship: { ...context.ship, health: context.ship.health + (event as RepairEvent).damage },
                  balance: context.balance - calculateCostForRepair((event as RepairEvent).damage),
                  messages: context.messages
                    .append({ message: `Repaired ${(event as RepairEvent).damage} damage` })
                    .append({ delay: 1000 })
                    .append({ command: "clear" }),
                })),
                emit(({ context }) => ({ type: "messages", messages: context.messages.messages })),
              ],
              after: { 0: { target: "#idle" } },
            },
            fail: {
              on: {
                MSG_ACK: { target: "#idle" },
              },
            },
          },
          always: [
            {
              guard: ({ event }) => event.type !== "REPAIR_SHIP",
              target: "#idle",
            },
          ],
        },
      },
      on: {
        RETIRE: [{ guard: ({ context }) => !context.canRetire, target: "#idle" }, { target: "scoringScreen" }],
      },
      always: [
        { guard: ({ context }) => !context.canRetire && context.day >= 100, actions: assign({ canRetire: true }) },
        {
          guard: ({ context }) => context.nextPriceUpdate <= 0,
          actions: [
            assign(({ context }) => ({
              messages: new MessageBucket()
                .append({ message: "Prices updated!" })
                .append({ delay: 2000 })
                .append({ command: "clear" }),
              prices: generatePrices(context.trends),
              nextPriceUpdate: PRICE_UPDATE_INTERVAL,
            })),
            emit(({ context }) => ({ type: "messages", messages: context.messages.messages })),
          ],
        },
      ],
    },
    scoringScreen: {
      on: {
        RESTART_GAME: {
          target: "#introScreen",
        },
      },
    },
    helpScreen: {
      on: {
        HIDE_HELP: { target: "introScreen" },
      },
    },
  },
});
