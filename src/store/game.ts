import { assign, setup, stateIn } from "xstate";
import { initialContext } from "./defaults.js";
import { Context } from "./types.js";
import { GameEvents } from "./events.js";
import {
  calculateCostForRepair,
  calculatePrice,
  calculateRepairForCost,
  calculateTravelTime,
  checkForEvent,
  generatePrices,
  getAvailableStorage,
} from "./utils.js";
import { goods, ports, PRICE_UPDATE_INTERVAL } from "./constants.js";
import { type Guard } from "xstate/guards";

export const gameMachine = setup({
  types: {
    context: {} as Context,
    events: {} as GameEvents,
  },
  actions: {
    displayMessages: assign((_, messages: string[]) => ({ messages })),
  },
}).createMachine({
  initial: "introScreen",
  context: initialContext(),
  states: {
    introScreen: {
      on: {
        START_GAME: { target: "gameScreen", actions: assign(({ event }) => initialContext(event.settings)) },
        SHOW_HELP: { target: "helpScreen" },
      },
    },
    gameScreen: {
      initial: "idle",
      states: {
        idle: {
          id: "idle",
          entry: assign({ messages: undefined }),
          on: {
            GO_TO_PORT: [
              {
                guard: ({ context }) => context.day < 100 || context.extendedGame,
                target: "at_port",
              },
              {
                actions: { type: "displayMessages", params: ["You've finished your 100 days voyage."] },
              },
            ],
            GO_TO_MARKET: {
              actions: assign(({ event }) => ({ marketAction: event.action })),
              target: "at_market",
            },
            GO_TO_SHIPYARD: { target: "at_shipyard" },
            GO_TO_RETIREMENT: { target: "at_retirement" },
          },
        },
        at_port: {
          entry: assign(({ context }) => ({ availablePorts: ports.filter((p) => p !== context.currentPort) })),
          initial: "pickDestination",
          states: {
            pickDestination: {
              on: {
                TRAVEL_TO: {
                  target: "checkEvent",
                  actions: assign(({ event, context }) => ({
                    destination: event.destination,
                    currentEvent: checkForEvent(context),
                  })),
                },
                CANCEL: { target: "#idle" },
              },
            },
            checkEvent: {
              always: [
                { guard: ({ context }) => !!context.currentEvent, target: "eventOccurred" },
                { target: "traveling" },
              ],
            },
            eventOccurred: {
              entry: [{ type: "displayMessages", params: ({ context }) => [context.currentEvent!.message] }],
              on: {
                MSG_ACK: { target: "traveling" },
              },
            },
            traveling: {
              entry: [
                // Adjust travel attributes
                assign(({ context }) => {
                  const travelTime = context.destination
                    ? calculateTravelTime(context.currentPort, context.destination, context.ship.speed)
                    : 1;
                  return {
                    day: Math.min(context.extendedGame ? Infinity : 100, context.day + travelTime),
                    nextPriceUpdate: Math.max(0, context.nextPriceUpdate - travelTime),
                  };
                }),
                // Update current port and apply effect, if applicable
                assign(({ context }) => context.currentEvent?.effect(context) ?? { currentPort: context.destination }),
                // Reset temporary context attributes
                assign({ destination: undefined, currentEvent: undefined }),
                {
                  type: "displayMessages",
                  params: ({ context }) => [`Arrived to ${context.currentPort}`],
                },
              ],
              on: {
                MSG_ACK: { target: "#idle" },
              },
            },
          },
        },
        at_market: {
          entry: assign({ availableGoods: goods }),
          initial: "chooseAction",
          states: {
            chooseAction: {
              always: [
                { guard: ({ context }) => context.marketAction === "buy", target: "buyAction" },
                { guard: ({ context }) => context.marketAction === "sell", target: "sellAction" },
                { target: "#idle" },
              ],
            },
            buyAction: {
              initial: "pickGood",
              states: {
                pickGood: {
                  on: {
                    PICK_GOOD: {
                      actions: assign(({ event }) => ({ good: event.good })),
                      target: "selectQuantity",
                    },
                  },
                },
                selectQuantity: {
                  on: {
                    SELECT_QUANTITY: {
                      actions: assign(({ event }) => ({ quantity: event.quantity })),
                      target: "commit",
                    },
                  },
                },
                commit: {
                  on: {
                    PURCHASE: [
                      {
                        // @ts-expect-error: `good` and `quantity` might be undefined, but in this state we know they're set already from previous states.
                        guard: ({ context }) => calculatePrice(context) > context.balance,
                        actions: { type: "displayMessages", params: ["You don't have enough money."] },
                        target: "pickGood",
                      },
                      {
                        guard: ({ context }) => getAvailableStorage(context.ship) < context.quantity!,
                        actions: { type: "displayMessages", params: ["You don't have enough storage room"] },
                        target: "pickGood",
                      },
                      {
                        actions: [
                          assign(({ context }) => ({
                            ship: {
                              ...context.ship,
                              hold: context.ship.hold.set(
                                context.good!,
                                (context.ship.hold.get(context.good!) ?? 0) + context.quantity!,
                              ),
                            },
                            // @ts-expect-error: see above
                            balance: context.balance - calculatePrice(context),
                          })),
                          assign({ good: undefined, quantity: undefined }),
                        ],
                        target: "#idle",
                      },
                    ],
                  },
                },
              },
            },
            sellAction: {
              initial: "pickGood",
              states: {
                pickGood: {
                  on: {
                    PICK_GOOD: {
                      actions: assign(({ event }) => ({ good: event.good })),
                      target: "selectQuantity",
                    },
                  },
                },
                selectQuantity: {
                  on: {
                    SELECT_QUANTITY: {
                      actions: assign(({ event }) => ({ quantity: event.quantity })),
                      target: "commit",
                    },
                  },
                },
                commit: {
                  on: {
                    SELL: [
                      {
                        // @ts-expect-error: `good` and `quantity` might be undefined, but in this state we know they're set already from previous states.
                        guard: ({ context }) => context.ship.hold.get(context.good) < context.quantity,
                        actions: {
                          type: "displayMessages",
                          params: ({ context }) => [
                            `You don't have enought ${context.good?.toLowerCase()} in your hold`,
                          ],
                        },
                        target: "pickGood",
                      },
                      {
                        actions: [
                          assign(({ context }) => ({
                            ship: {
                              ...context.ship,
                              hold: context.ship.hold.set(
                                context.good!,
                                (context.ship.hold.get(context.good!) ?? 0) - context.quantity!,
                              ),
                            },
                            // @ts-expect-error: see above
                            balance: context.balance + calculatePrice(context),
                          })),
                          assign({ good: undefined, quantity: undefined }),
                        ],
                        target: "#idle",
                      },
                    ],
                  },
                },
              },
            },
          },
          on: {
            CANCEL: { target: "#idle" },
          },
        },
        at_shipyard: {
          initial: "idle",
          states: {
            idle: {
              on: {
                REPAIR: [
                  {
                    guard: ({ context, event }) => context.balance < event.cash,
                    actions: { type: "displayMessages", params: ["You don't have enough cash"] },
                  },
                  {
                    actions: [
                      {
                        type: "displayMessages",
                        params: ({ context, event }) => {
                          const damageToRepair = Math.min(
                            /* ship's damage */ 100 - context.ship.health,
                            calculateRepairForCost(event.cash),
                          );
                          return [`Repaired ${damageToRepair} damage`];
                        },
                      },
                      assign(({ context, event }) => {
                        const damageToRepair = Math.min(
                          /* ship's damage */ 100 - context.ship.health,
                          calculateRepairForCost(event.cash),
                        );
                        const cost = calculateCostForRepair(damageToRepair);
                        return {
                          balance: context.balance - cost,
                          ship: {
                            ...context.ship,
                            health: context.ship.health + damageToRepair,
                          },
                        };
                      }),
                    ],
                    target: "repairsCompleted",
                  },
                ],
                CANCEL: { target: "#idle" },
              },
            },
            repairsCompleted: {
              on: {
                MSG_ACK: { target: "#idle" },
              },
            },
          },
        },
        at_retirement: {
          on: {
            CANCEL: { target: "#idle" },
          },
        },
      },
      on: {
        MESSAGE: { actions: assign(({ event }) => ({ messages: event.messages })) },
        MSG_ACK: { actions: assign({ messages: undefined }) },
        RETIRE: [
          {
            guard: ({ context }) => !context.canRetire || !stateIn({ gamescreen: "at_retirement" }),
            actions: { type: "displayMessages", params: ["You haven't finished your voyage yet"] },
            target: "#idle",
          },
          { target: "scoringScreen" },
        ],
      },
      always: [
        { guard: ({ context }) => !context.canRetire && context.day >= 100, actions: assign({ canRetire: true }) },
        {
          guard: ({ context }) => context.nextPriceUpdate <= 0,
          actions: [
            assign(({ context }) => ({
              messages: ["Prices updated!"],
              prices: generatePrices(context.trends),
              nextPriceUpdate: PRICE_UPDATE_INTERVAL,
            })),
          ],
        },
      ],
    },
    scoringScreen: {
      on: {
        RESTART_GAME: { target: "introScreen" },
      },
    },
    helpScreen: {
      on: {
        HIDE_HELP: { target: "introScreen" },
      },
    },
  },
});
