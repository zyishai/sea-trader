import { assign, emit, not, setup } from "xstate";
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
      currentPort: context.currentPort,
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
  currentEvent?: EventTemplate;
  destination?: Port;
};

// ===== Utility Methods =====
export const calculateTravelTime = (from: Port, to: Port, shipSpeed: number) => {
  const distance = distanceMatrix[from][to];
  return Math.ceil(distance / shipSpeed);
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
      chance *= context.day / 100; // Weather events become more likely as the game progresses
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
      chance *= context.day / 100; // Discoveries become more likely as the game progresses
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

const initialContext = () => {
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
  } satisfies Context;
};

// See bug: https://github.com/statelyai/xstate/pull/4516
// See workaround: https://github.com/statelyai/xstate/issues/5090#issuecomment-2388661190
export const gameMachine = setup({
  types: {
    context: {} as Context,
    events: {} as
      | { type: "START_GAME" }
      | { type: "TRAVEL_TO"; destination: Port }
      | { type: "BUY_GOOD"; good: Good; quantity: number }
      | { type: "SELL_GOOD"; good: Good; quantity: number }
      | { type: "RESOLVE_EVENT" }
      | { type: "REPAIR_SHIP"; damage: number },
    emitted: {} as { type: "message"; message: string; timeout?: number | "auto" } | { type: "clearMessages" },
  },
}).createMachine({
  initial: "introScreen",
  context: initialContext(),
  states: {
    introScreen: {
      on: {
        START_GAME: { target: "gameScreen", actions: assign(initialContext) },
      },
    },
    gameScreen: {
      initial: "idle",
      states: {
        idle: {
          on: {
            TRAVEL_TO: {
              target: "checkingEvent",
              actions: [
                emit({ type: "clearMessages" }),
                assign(({ context, event }) => ({
                  currentEvent: checkForEvent(context),
                  destination: event.destination,
                })),
              ],
            },
            BUY_GOOD: [
              {
                guard: not(
                  // Can afford to buy the goods
                  ({ context, event }) =>
                    context.balance >=
                    calculatePrice({
                      prices: context.prices,
                      currentPort: context.currentPort,
                      good: event.good,
                      quantity: event.quantity,
                    }),
                ),
                actions: [
                  emit({ type: "clearMessages" }),
                  emit({ type: "message", message: "You don't have enough cash", timeout: "auto" }),
                ],
              },
              {
                guard: not(
                  // Have enough storage room to store the goods
                  ({ context, event }) => event.quantity <= getAvailableStorage(context.ship),
                ),
                actions: [
                  emit({ type: "clearMessages" }),
                  emit({ type: "message", message: "You don't have enough storage room", timeout: "auto" }),
                ],
              },
              {
                actions: [
                  assign(({ context, event }) => ({
                    balance:
                      context.balance -
                      calculatePrice({
                        prices: context.prices,
                        currentPort: context.currentPort,
                        good: event.good,
                        quantity: event.quantity,
                      }),
                    hold: context.ship.hold.set(event.good, (context.ship.hold.get(event.good) ?? 0) + event.quantity),
                  })),
                ],
              },
            ],
            SELL_GOOD: [
              {
                // Have enough in hold of the good
                guard: ({ context, event }) =>
                  event.quantity > 0 && (context.ship.hold.get(event.good) || 0) >= event.quantity,
                actions: [
                  assign(({ context, event }) => ({
                    balance:
                      context.balance +
                      calculatePrice({
                        prices: context.prices,
                        currentPort: context.currentPort,
                        good: event.good,
                        quantity: event.quantity,
                      }),
                    hold: context.ship.hold.set(event.good, (context.ship.hold.get(event.good) ?? 0) - event.quantity),
                  })),
                ],
              },
              {
                actions: [
                  emit({ type: "clearMessages" }),
                  emit(({ event }) => ({
                    type: "message",
                    message: `You don't have enough ${event.good.toLowerCase()} to sell.`,
                  })),
                ],
              },
            ],
            REPAIR_SHIP: [
              {
                guard: not(
                  // Repair appropriate damage (<= 100 health total)
                  ({ context, event }) => event.damage >= 0 && 100 - context.ship.health >= event.damage,
                ),
                actions: [
                  emit({ type: "clearMessages" }),
                  emit(({ context }) => ({
                    type: "message",
                    message: `You can't repair more than ${100 - context.ship.health} damage`,
                    timeout: "auto",
                  })),
                ],
              },
              {
                guard: not(
                  // Have enough money to repair
                  ({ context, event }) => context.balance >= calculateCostForRepair(event.damage),
                ),
                actions: [
                  emit({ type: "clearMessages" }),
                  emit({
                    type: "message",
                    message: "You don't have enough money to repair your ship",
                    timeout: "auto",
                  }),
                ],
              },
              {
                actions: [
                  assign(({ context, event }) => ({
                    ship: { ...context.ship, health: context.ship.health + event.damage },
                    balance: context.balance - calculateCostForRepair(event.damage),
                  })),
                  emit({ type: "clearMessages" }),
                  emit(({ event }) => ({
                    type: "message",
                    message: `Repaired ${event.damage} damage`,
                    timeout: "auto",
                  })),
                ],
              },
            ],
          },
        },
        checkingEvent: {
          always: [
            { guard: ({ context }) => !!context.currentEvent, target: "eventOccurred" },
            { target: "traveling" },
          ],
        },
        eventOccurred: {
          entry: [emit(({ context }) => ({ type: "message", message: context.currentEvent!.message }))],
          after: {
            3000: { target: "traveling" },
          },
        },
        traveling: {
          entry: [
            assign(({ context }) =>
              context.currentEvent
                ? context.currentEvent.effect(context)
                : {
                    currentPort: context.destination,
                    day: Math.min(
                      100,
                      context.day + calculateTravelTime(context.currentPort, context.destination!, context.ship.speed),
                    ),
                  },
            ),
            emit({ type: "clearMessages" }),
            emit(({ context }) => ({ type: "message", message: `Arrived to ${context.currentPort}`, timeout: "auto" })),
          ],
          always: { target: "idle" },
          exit: assign({ destination: undefined, currentEvent: undefined }),
        },
      },
    },
    scoringScreen: {},
  },
});
