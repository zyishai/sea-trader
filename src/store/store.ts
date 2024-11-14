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

// ===== Types =====
export type Good = (typeof goods)[number];
export type Port = (typeof ports)[number];
type Trend = "increasing" | "decreasing" | "stable";
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
      | { type: "SELL_GOOD"; good: Good; quantity: number },
    emitted: {} as { type: "message"; message: string; timeout?: number | "auto" } | { type: "clearMessages" },
  },
  guards: {
    canAfford: ({ context }, { good, quantity }: { good: Good; quantity: number }) =>
      context.balance >= calculatePrice({ prices: context.prices, currentPort: context.currentPort, good, quantity }),
    canStore: ({ context }, { quantity }: { quantity: number }) => quantity <= getAvailableStorage(context.ship),
    enoughInHold: ({ context }, params: { good: Good; quantity: number }) =>
      params.quantity > 0 && (context.ship.hold.get(params.good) || 0) >= params.quantity,
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
              actions: [
                assign(({ context, event }) => ({
                  currentPort: event.destination,
                  day: Math.min(
                    100,
                    context.day + calculateTravelTime(context.currentPort, event.destination, context.ship.speed),
                  ),
                })),
                emit({ type: "clearMessages" }),
                emit(({ context }) => ({
                  type: "message",
                  message: `Arrived to ${context.currentPort}`,
                  timeout: "auto",
                })),
              ],
            },
            BUY_GOOD: [
              {
                guard: not({
                  // @ts-expect-error - xstate
                  type: "canAfford",
                  // @ts-expect-error - xstate
                  params: ({ event }) => ({ good: event.good, quantity: event.quantity }),
                }),
                actions: [emit({ type: "message", message: "You don't have enough cash", timeout: "auto" })],
              },
              {
                guard: not({
                  // @ts-expect-error - xstate
                  type: "canStore",
                  // @ts-expect-error - xstate
                  params: ({ event }) => ({ quantity: event.quantity }),
                }),
                actions: [emit({ type: "message", message: "You don't have enough storage room", timeout: "auto" })],
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
                guard: {
                  type: "enoughInHold",
                  params: ({ event }) => ({ good: event.good, quantity: event.quantity }),
                },
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
                  emit(({ event }) => ({
                    type: "message",
                    message: `You don't have enough ${event.good.toLowerCase()} to sell.`,
                  })),
                ],
              },
            ],
          },
        },
      },
    },
    scoringScreen: {},
  },
});
