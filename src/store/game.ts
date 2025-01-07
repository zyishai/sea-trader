import { assign, enqueueActions, setup, stateIn } from "xstate";
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
  generateTrends,
  getAvailableStorage,
} from "./utils.js";
import { goods, GUARD_SHIP_COST, ports, PRICE_UPDATE_INTERVAL, TREND_UPDATE_INTERVAL } from "./constants.js";
import { type Guard } from "xstate/guards";

export const gameMachine = setup({
  types: {
    context: {} as Context,
    events: {} as GameEvents,
  },
  actions: {
    displayMessages: assign(({ context }, messages: string[]) => ({ messages: [...context.messages, messages] })),
    acknoledgeMessage: assign(({ context }) => ({ messages: context.messages.slice(1) })),
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
          // entry: assign({ messages: [] }),
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
                  target: "hireGuardShips",
                  actions: assign(({ event, context }) => ({
                    destination: event.destination,
                    currentEvent: checkForEvent(context),
                  })),
                },
                CANCEL: { target: "#idle" },
              },
            },
            hireGuardShips: {
              on: {
                HIRE_GUARD_SHIPS: [
                  {
                    guard: ({ event }) => event.ships > 5,
                    actions: { type: "displayMessages", params: ["You can't hire more than 5 guard ships"] },
                    target: "hireGuardShips",
                    reenter: true,
                  },
                  {
                    guard: ({ context, event }) => context.balance >= event.ships * GUARD_SHIP_COST,
                    actions: [
                      assign(({ context, event }) => ({
                        guardShips: event.ships,
                        balance: context.balance - event.ships * GUARD_SHIP_COST,
                      })),
                      { type: "displayMessages", params: ({ event }) => [`Hired ${event.ships} guard ships`] },
                    ],
                    target: "checkPiratesEncounter",
                  },
                  {
                    actions: { type: "displayMessages", params: ["You don't have enough money"] },
                    target: "hireGuardShips",
                    reenter: true,
                  },
                ],
              },
            },
            checkPiratesEncounter: {
              always: [
                {
                  guard: ({ context }) => {
                    const baseChance = 0.2;
                    const guardReduction = context.guardShips * 0.03;
                    const encounterChance = Math.max(0.05, baseChance - guardReduction);
                    return Math.random() < encounterChance;
                  },
                  target: "piratesEncountered",
                },
                { target: "checkEvent" },
              ],
            },
            piratesEncountered: {
              on: {
                PIRATES_ENCOUNTER_FIGHT: {
                  actions: enqueueActions(({ enqueue, context }) => {
                    const baseChance = 0.5;
                    const guardBonus = context.guardShips * 0.1;
                    const successChance = Math.min(0.9, baseChance + guardBonus);
                    const success = Math.random() < successChance;

                    const cargoValue = [...context.ship.hold.entries()].reduce(
                      (sum, [good, quantity]) => sum + context.prices[context.currentPort][good] * quantity,
                      0,
                    );
                    const baseLoot = Math.floor(Math.random() * 200) + 301; // [$200, $500]
                    const factor = Math.floor(50_000 / Math.max(1, context.balance + cargoValue));
                    const potentialLoot = Math.max(150, Math.floor(baseLoot * factor));
                    const actualLoot = success ? Math.min(6300, potentialLoot) : 0;
                    const damageTaken = success
                      ? context.ship.health <= 10
                        ? 0
                        : 10
                      : 20 + Math.floor(Math.random() * 10);

                    enqueue({
                      type: "displayMessages",
                      params: success
                        ? [
                            "You won!",
                            `You've captured $${actualLoot}${damageTaken ? ` but your ship has taken ${damageTaken} damage.` : "."}`,
                          ]
                        : ["You've lost...", `Your ship has taken ${damageTaken} damage.`],
                    });

                    enqueue.assign({
                      balance: context.balance + actualLoot,
                      ship: {
                        ...context.ship,
                        health: context.ship.health - damageTaken,
                      },
                    });
                  }),
                  target: "traveling",
                },
                PIRATES_ENCOUNTER_FLEE: {
                  actions: enqueueActions(({ enqueue, context }) => {
                    const baseChance = 0.6;
                    const guardBonus = context.guardShips * 0.05;
                    const successChance = Math.min(0.9, baseChance + guardBonus);
                    const success = Math.random() < successChance;

                    const damageTaken = success ? 5 : 15 + Math.floor(Math.random() * 10);

                    enqueue({
                      type: "displayMessages",
                      params: ["You've escaped", `Your ship has taken ${damageTaken} damage.`],
                    });

                    enqueue.assign({
                      ship: {
                        ...context.ship,
                        health: Math.max(0, context.ship.health - damageTaken),
                      },
                    });
                  }),
                  target: "traveling",
                },
                PIRATES_ENCOUNTER_OFFER: {
                  actions: enqueueActions(({ enqueue, context }) => {
                    const minOffer = Math.max(100, Math.floor(context.balance * 0.05));
                    const maxOffer = Math.floor(context.balance * 0.2);
                    const offerAmount = Math.min(maxOffer, Math.max(minOffer, Math.floor(context.balance * 0.1)));

                    enqueue({
                      type: "displayMessages",
                      params: ["The pirates let you go", `They've taken $${offerAmount} from you.`],
                    });

                    enqueue.assign({ balance: context.balance - offerAmount });
                  }),
                  target: "traveling",
                },
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
                MSG_ACK: { actions: { type: "acknoledgeMessage" }, target: "traveling" },
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
                    nextTrendUpdate: Math.max(0, context.nextTrendUpdate - travelTime),
                  };
                }),
                // Update current port and apply effect, if applicable
                assign(({ context }) => context.currentEvent?.effect(context) ?? { currentPort: context.destination }),
                // Reset temporary context attributes
                assign({ destination: undefined, currentEvent: undefined, guardShips: 0 }),
                {
                  type: "displayMessages",
                  params: ({ context }) => [`Arrived to ${context.currentPort}`],
                },
              ],
              always: [{ target: "#idle" }],
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
                    target: "#idle",
                  },
                ],
                CANCEL: { target: "#idle" },
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
        MSG_ACK: { actions: { type: "acknoledgeMessage" } },
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
            { type: "displayMessages", params: ["Prices updated!"] },
            assign(({ context }) => ({
              prices: generatePrices(context.trends),
              nextPriceUpdate: PRICE_UPDATE_INTERVAL,
            })),
          ],
        },
        {
          guard: ({ context }) => context.nextTrendUpdate <= 0,
          actions: [
            assign({
              trends: generateTrends(),
              nextTrendUpdate: TREND_UPDATE_INTERVAL,
            }),
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
