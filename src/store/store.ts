import { assign, emit, setup } from "xstate";

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

// ===== Types =====
type Good = (typeof goods)[number];
export type Port = (typeof ports)[number];
type Context = {
  currentPort: Port;
  day: number;
  balance: number;
  ship: {
    health: number;
    speed: number;
  };
};

// ===== Utility Methods =====
export const calculateTravelTime = (from: Port, to: Port, shipSpeed: number) => {
  const distance = distanceMatrix[from][to];
  return Math.ceil(distance / shipSpeed);
};

const initialContext = () =>
  ({
    currentPort: "Hong Kong",
    day: 1,
    balance: 1000,
    ship: {
      health: 100,
      speed: 500,
    },
  }) satisfies Context;

export const gameMachine = setup({
  types: {
    context: {} as Context,
    events: {} as { type: "START_GAME" } | { type: "TRAVEL_TO"; destination: Port },
    emitted: {} as { type: "message"; message: string },
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
                emit(({ context }) => ({ type: "message", message: `Arrived to ${context.currentPort}` })),
              ],
            },
          },
        },
      },
    },
    scoringScreen: {},
  },
});
