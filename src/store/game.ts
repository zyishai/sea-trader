import { assign, enqueueActions, setup, stateIn } from "xstate";
import { initialContext } from "./defaults.js";
import { Context } from "./types.js";
import { GameEvents } from "./events.js";
import {
  calculateCostForRepair,
  calculateDailyMaintenanceCost,
  calculateGuardEffectiveness,
  calculateGuardShipCost,
  calculatePirateEncounterChance,
  calculatePrice,
  calculateRepairForCost,
  calculateTravelTime,
  calculateFleetUpgradeCost,
  checkForEvent,
  generatePrices,
  generateTrends,
  getAvailableStorage,
  getNetCash,
  getShipStatus,
} from "./utils.js";
import {
  BANKRUPTCY_THRESHOLD,
  BASE_GUARD_COST,
  BASE_INTEREST_RATE,
  GOAL_DAYS,
  goods,
  MAX_DAILY_OVERDRAFT,
  MAX_GUARD_QUALITY,
  MAX_GUARD_SHIPS,
  OVERDRAFT_TRADING_LIMIT,
  ports,
  PRICE_UPDATE_INTERVAL,
  TREND_UPDATE_INTERVAL,
} from "./constants.js";
import { type Guard } from "xstate/guards";

export const gameMachine = setup({
  types: {
    context: {} as Context,
    events: {} as GameEvents,
  },
  actions: {
    displayMessages: assign(({ context }, messages: string[]) => ({
      messages: [...context.messages, messages].filter((msgs) => msgs.length > 0),
    })),
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
          on: {
            GO_TO_PORT: [
              {
                guard: ({ context }) => getShipStatus(context.ship.health) === "Wreckage",
                actions: {
                  type: "displayMessages",
                  params: ["Your ship is in wreckage condition.", "You can't travel until you repair it."],
                },
              },
              {
                guard: ({ context }) => context.day < GOAL_DAYS || context.extendedGame,
                target: "at_port",
              },
              {
                actions: {
                  type: "displayMessages",
                  params: [`You've finished your ${GOAL_DAYS} days voyage.`],
                },
              },
            ],
            GO_TO_INVENTORY: { target: "viewing_inventory" },
            GO_TO_SHIPYARD: { target: "at_shipyard" },
            GO_TO_RETIREMENT: { target: "at_retirement" },
            GO_TO_BANKRUPTCY: { target: "at_bankruptcy" },
            MANAGE_FLEET: { target: "managing_fleet" },
            EXIT: { target: "at_exit" },
          },
        },
        at_port: {
          entry: assign(({ context }) => ({ availablePorts: ports.filter((p) => p !== context.currentPort) })),
          initial: "pickDestination",
          states: {
            pickDestination: {
              on: {
                TRAVEL_TO: {
                  target: "checkPiratesEncounter",
                  actions: assign(({ event, context }) => ({
                    destination: event.destination,
                    currentEvent: checkForEvent(context),
                  })),
                },
                CANCEL: { target: "#idle" },
              },
            },
            checkPiratesEncounter: {
              always: [
                {
                  guard: ({ context }) => Math.random() < calculatePirateEncounterChance(context),
                  target: "piratesEncountered",
                },
                { target: "checkEvent" },
              ],
            },
            piratesEncountered: {
              on: {
                PIRATES_ENCOUNTER_FIGHT: {
                  actions: enqueueActions(({ enqueue, context }) => {
                    const successChance = calculateGuardEffectiveness(context);
                    const success = Math.random() < successChance;

                    if (success) {
                      // Even when winning, ship might take some damage
                      const takeDamage = Math.random() < 0.7; // 70% chance to take damage
                      const damage = takeDamage ? Math.floor(Math.random() * 10) + 5 : 0;

                      // Chance to lose guard ships
                      const loseGuards = Math.random() < 0.15; // 15% chance to lose guards
                      const guardsLost = loseGuards ? Math.floor(Math.random() * 2) + 1 : 0;

                      // Loot from pirates
                      const cargoValue = [...context.ship.hold.entries()].reduce(
                        (sum, [good, quantity]) => sum + context.prices[context.currentPort][good] * quantity,
                        0,
                      );
                      const baseLoot = Math.floor(Math.random() * 200) + 301; // [$200, $500]
                      const factor = Math.floor(50_000 / Math.max(1, context.balance + cargoValue));
                      const potentialLoot = Math.max(150, Math.floor(baseLoot * factor));
                      const actualLoot = Math.min(6300, potentialLoot);

                      const messages = [
                        "Your guard fleet successfully fought off the pirates!",
                        `You looted $${actualLoot} from the pirates' ship.`,
                      ];

                      if (damage > 0) {
                        messages.push(`Your ship took ${damage} damage in the battle.`);
                      }

                      if (loseGuards && guardsLost > 0) {
                        messages.push(
                          `Lost ${Math.min(guardsLost, context.guardFleet.ships)} guard ship${
                            Math.min(guardsLost, context.guardFleet.ships) > 1 ? "s" : ""
                          } in the battle.`,
                        );
                      }

                      messages.push(`Gained 5 reputation points for your bravery.`);

                      enqueue({ type: "displayMessages", params: messages });
                      enqueue.assign({
                        ship: {
                          ...context.ship,
                          health: Math.max(0, context.ship.health - damage),
                        },
                        guardFleet: {
                          ...context.guardFleet,
                          ships: Math.max(0, context.guardFleet.ships - guardsLost),
                        },
                        balance: context.balance + actualLoot,
                        reputation: Math.min(100, context.reputation + 5),
                      });
                    } else {
                      // Lost the fight - more severe consequences
                      const damage = Math.floor(Math.random() * 20) + 15;
                      const stolenGoods = Math.floor(Math.random() * 10) + 5;
                      const guardsLost = Math.floor(Math.random() * 3) + 1;

                      const randomGood = [...context.ship.hold.entries()]
                        .filter(([_, amount]) => amount > 0)
                        .map(([good]) => good)[Math.floor(Math.random() * context.ship.hold.size)];

                      const newHold = new Map(context.ship.hold);
                      if (randomGood) {
                        const currentAmount = newHold.get(randomGood) || 0;
                        newHold.set(randomGood, Math.max(0, currentAmount - stolenGoods));
                      }

                      enqueue({
                        type: "displayMessages",
                        params: [
                          "Despite your guard fleet's efforts, the pirates prevailed!",
                          `Your ship took ${Math.min(damage, context.ship.health)} damage.`,
                          randomGood
                            ? `Pirates stole ${Math.min(stolenGoods, context.ship.hold.get(randomGood)!)} ${randomGood}`
                            : "",
                          `Lost ${Math.min(guardsLost, context.guardFleet.ships)} guard ship${
                            Math.min(guardsLost, context.guardFleet.ships) > 1 ? "s" : ""
                          } in the battle.`,
                          `Lost ${guardsLost * 2} reputation points.`,
                        ],
                      });
                      enqueue.assign({
                        ship: {
                          ...context.ship,
                          health: Math.max(0, context.ship.health - damage),
                          hold: newHold,
                        },
                        guardFleet: {
                          ...context.guardFleet,
                          ships: Math.max(0, context.guardFleet.ships - guardsLost),
                        },
                        reputation: Math.max(0, context.reputation - guardsLost * 2),
                      });
                    }
                  }),
                  target: "traveling",
                },
                PIRATES_ENCOUNTER_FLEE: {
                  actions: enqueueActions(({ enqueue, context }) => {
                    const fleeChance = 0.6 + calculateGuardEffectiveness(context) * 0.2;
                    const success = Math.random() < fleeChance;

                    if (success) {
                      const noDamage = Math.random() < 0.3; // 30% chance to escape without any damage
                      if (noDamage) {
                        enqueue({
                          type: "displayMessages",
                          params: ["You masterfully maneuvered away from the pirates without a scratch!"],
                        });
                      } else {
                        const damage = Math.floor(Math.random() * 8) + 3; // Less damage when successfully fleeing
                        enqueue({
                          type: "displayMessages",
                          params: [
                            "You've successfully escaped from the pirates!",
                            `Your ship took ${damage} damage while fleeing.`,
                          ],
                        });
                        enqueue.assign({
                          ship: {
                            ...context.ship,
                            health: Math.max(0, context.ship.health - damage),
                          },
                        });
                      }
                    } else {
                      const damage = Math.floor(Math.random() * 15) + 10; // More damage then successful flee, less than losing a fight
                      enqueue({
                        type: "displayMessages",
                        params: [
                          "Failed to escape from the pirates!",
                          `Your ship took ${damage} damage while attempting to flee.`,
                          `Lost 2 reputation points.`,
                        ],
                      });
                      enqueue.assign({
                        ship: {
                          ...context.ship,
                          health: Math.max(0, context.ship.health - damage),
                        },
                        reputation: Math.max(0, context.reputation - 2),
                      });
                    }
                  }),
                  target: "traveling",
                },
                PIRATES_ENCOUNTER_OFFER: {
                  actions: enqueueActions(({ enqueue, context }) => {
                    const bribeCost = Math.round(context.balance * 0.15);
                    const actualBribe = Math.floor(Math.random() * (context.balance + 1));
                    const success = actualBribe >= bribeCost;

                    if (success) {
                      enqueue({
                        type: "displayMessages",
                        params: [
                          `You paid the pirates $${bribeCost} to let you go your merry way.`,
                          `Lost 1 reputation point.`,
                        ],
                      });
                      enqueue.assign({
                        balance: context.balance - bribeCost,
                        reputation: Math.max(0, context.reputation - 1),
                      });
                    } else {
                      const damage = Math.floor(Math.random() * 25) + 15;
                      enqueue({
                        type: "displayMessages",
                        params: [
                          "You couldn't afford to bribe the pirates!",
                          "They attacked in anger!",
                          `Your ship took ${damage} damage.`,
                          `Lost 5 reputation points.`,
                        ],
                      });
                      enqueue.assign({
                        ship: {
                          ...context.ship,
                          health: Math.max(0, context.ship.health - damage),
                        },
                        reputation: Math.max(0, context.reputation - 5),
                      });
                    }
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
                  const travelTime = context.destination ? calculateTravelTime(context.destination, context) : 1;
                  return {
                    day: Math.min(context.extendedGame ? Infinity : GOAL_DAYS, context.day + travelTime),
                    nextPriceUpdate: Math.max(0, context.nextPriceUpdate - travelTime),
                    nextTrendUpdate: Math.max(0, context.nextTrendUpdate - travelTime),
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
              always: [{ target: "#idle" }],
            },
          },
        },
        at_market: {
          id: "market",
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
              on: {
                PURCHASE: [
                  {
                    guard: ({ context, event }) =>
                      calculatePrice({ ...context, ...event }) >
                      context.balance + (context.inOverdraft ? OVERDRAFT_TRADING_LIMIT : 0),
                    actions: { type: "displayMessages", params: ["You don't have enough money."] },
                    target: "buyAction",
                  },
                  {
                    guard: ({ context, event }) => getAvailableStorage(context.ship) < event.quantity,
                    actions: { type: "displayMessages", params: ["You don't have enough storage room."] },
                    target: "buyAction",
                  },
                  {
                    actions: [
                      assign(({ context, event }) => ({
                        ship: {
                          ...context.ship,
                          hold: context.ship.hold.set(
                            event.good,
                            (context.ship.hold.get(event.good) ?? 0) + event.quantity,
                          ),
                        },
                        balance: context.balance - calculatePrice({ ...context, ...event }),
                      })),
                      {
                        type: "displayMessages",
                        params: ({ context, event }) => [
                          `Purchased ${event.quantity} ${event.good} for $${calculatePrice({
                            ...context,
                            ...event,
                          })}.`,
                        ],
                      },
                    ],
                    target: "#idle",
                  },
                ],
              },
            },
            sellAction: {
              on: {
                SELL: [
                  {
                    guard: ({ context, event }) => (context.ship.hold.get(event.good) ?? 0) < event.quantity,
                    actions: {
                      type: "displayMessages",
                      params: ({ event }) => [`You don't have enought ${event.good.toLowerCase()} in your hold.`],
                    },
                    target: "sellAction",
                  },
                  {
                    actions: [
                      assign(({ context, event }) => ({
                        ship: {
                          ...context.ship,
                          hold: context.ship.hold.set(
                            event.good,
                            (context.ship.hold.get(event.good) ?? 0) - event.quantity,
                          ),
                        },
                        balance: context.balance + calculatePrice({ ...context, ...event }),
                      })),
                      {
                        type: "displayMessages",
                        params: ({ context, event }) => [
                          `Sold ${event.quantity} ${event.good} for $${calculatePrice({
                            ...context,
                            ...event,
                          })}.`,
                        ],
                      },
                    ],
                    target: "#idle",
                  },
                ],
              },
            },
          },
          on: {
            CANCEL: { target: "#idle" },
          },
          exit: assign({ marketAction: undefined }),
        },
        at_shipyard: {
          initial: "menu",
          states: {
            menu: {
              on: {
                GO_TO_SHIPYARD_REPAIR: { target: "repairing" },
                CANCEL: { target: "#idle" },
              },
            },
            repairing: {
              on: {
                REPAIR: [
                  {
                    guard: ({ context }) => context.ship.health === 100,
                    actions: { type: "displayMessages", params: ["Your ship is already in perfect condition"] },
                  },
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
                CANCEL: { target: "menu" },
              },
            },
          },
        },
        at_retirement: {
          on: {
            CANCEL: { target: "#idle" },
          },
        },
        at_bankruptcy: {
          on: {
            CANCEL: { target: "#idle" },
          },
        },
        viewing_inventory: {
          on: {
            CANCEL: { target: "#idle" },
          },
        },
        managing_fleet: {
          initial: "menu",
          states: {
            menu: {
              on: {
                GO_TO_GUARD_HALL_HIRE: [
                  {
                    guard: ({ context }) => context.guardFleet.ships >= MAX_GUARD_SHIPS,
                    actions: {
                      type: "displayMessages",
                      params: [`Your fleet is at maximum capacity (${MAX_GUARD_SHIPS} ships)`],
                    },
                  },
                  { target: "hireShips" },
                ],
                GO_TO_GUARD_HALL_UPGRADE: [
                  {
                    guard: ({ context }) => context.guardFleet.quality >= MAX_GUARD_QUALITY,
                    actions: {
                      type: "displayMessages",
                      params: ["Your fleet is already at maximum quality"],
                    },
                  },
                  {
                    guard: ({ context }) => context.guardFleet.ships === 0,
                    actions: {
                      type: "displayMessages",
                      params: ["You don't have any guard ships to upgrade"],
                    },
                  },
                  { target: "upgradeFleet" },
                ],
                GO_TO_GUARD_HALL_DISMISS: [
                  {
                    guard: ({ context }) => context.guardFleet.ships === 0,
                    actions: {
                      type: "displayMessages",
                      params: ["You don't have any guard ships to dismiss"],
                    },
                  },
                  { target: "dismissShips" },
                ],
                CANCEL: { target: "#idle" },
              },
            },
            hireShips: {
              on: {
                HIRE_PERMANENT_GUARDS: [
                  {
                    guard: ({ context }) => context.guardFleet.ships >= MAX_GUARD_SHIPS,
                    actions: {
                      type: "displayMessages",
                      params: [`Your fleet is at maximum capacity (${MAX_GUARD_SHIPS} ships)`],
                    },
                    target: "menu",
                  },
                  {
                    guard: ({ context, event }) => {
                      const totalShips = context.guardFleet.ships + event.amount;
                      return totalShips > MAX_GUARD_SHIPS;
                    },
                    actions: {
                      type: "displayMessages",
                      params: [`Cannot hire that many ships. Maximum fleet size is ${MAX_GUARD_SHIPS} ships`],
                    },
                  },
                  {
                    guard: ({ context, event }) => {
                      const cost = calculateGuardShipCost(context, event.amount);
                      return context.balance < cost;
                    },
                    actions: {
                      type: "displayMessages",
                      params: ({ context, event }) => {
                        const cost = calculateGuardShipCost(context, event.amount);
                        return [`Not enough money. Need $${cost} to hire ${event.amount} ships`];
                      },
                    },
                  },
                  {
                    actions: [
                      assign(({ context, event }) => {
                        const cost = calculateGuardShipCost(context, event.amount);
                        return {
                          guardFleet: {
                            ...context.guardFleet,
                            ships: context.guardFleet.ships + event.amount,
                            lastMaintenanceDay: context.day,
                          },
                          balance: context.balance - cost,
                          reputation: Math.min(100, context.reputation + event.amount),
                        };
                      }),
                      {
                        type: "displayMessages",
                        params: ({ event }) => [`Hired ${event.amount} permanent guard ships`],
                      },
                    ],
                    target: "#idle",
                  },
                ],
                CANCEL: { target: "menu" },
              },
            },
            upgradeFleet: {
              on: {
                UPGRADE_GUARDS: [
                  {
                    guard: ({ context }) => {
                      const cost = calculateFleetUpgradeCost(context);
                      return context.balance < cost;
                    },
                    actions: {
                      type: "displayMessages",
                      params: ({ context }) => {
                        const cost = calculateFleetUpgradeCost(context);
                        return [`Not enough money. Need $${cost} to upgrade fleet`];
                      },
                    },
                    target: "menu",
                  },
                  {
                    actions: [
                      assign(({ context }) => {
                        const cost = calculateFleetUpgradeCost(context);
                        return {
                          guardFleet: {
                            ...context.guardFleet,
                            quality: context.guardFleet.quality + 1,
                          },
                          balance: context.balance - cost,
                        };
                      }),
                      {
                        type: "displayMessages",
                        params: ({ context }) => [`Fleet upgraded to quality level ${context.guardFleet.quality}`],
                      },
                    ],
                    target: "#idle",
                  },
                ],
                CANCEL: { target: "menu" },
              },
            },
            dismissShips: {
              on: {
                DISMISS_GUARDS: {
                  actions: [
                    assign(({ context, event }) => ({
                      guardFleet: {
                        ...context.guardFleet,
                        ships: Math.max(0, context.guardFleet.ships - event.amount),
                      },
                      reputation: Math.max(0, context.reputation - event.amount * 2),
                    })),
                    {
                      type: "displayMessages",
                      params: ({ event }) => [`Dismissed ${event.amount} guard ships`],
                    },
                  ],
                  target: "#idle",
                },
                CANCEL: { target: "menu" },
              },
            },
          },
        },
        at_exit: {
          on: {
            CANCEL: { target: "#idle" },
          },
        },
      },
      on: {
        MSG_ACK: { actions: { type: "acknoledgeMessage" } },
        GO_TO_MARKET: [
          {
            guard: () => !stateIn({ gamescreen: "viewing_inventory" }) && !stateIn({ gamescreen: "idle" }),
            actions: {
              type: "displayMessages",
              params: ["You're not in a position to go to the market"],
            },
          },
          {
            guard: ({ context, event }) =>
              event.action === "buy" &&
              context.availableGoods.every(
                (good) =>
                  context.prices[context.currentPort][good] >
                  context.balance + (context.inOverdraft ? OVERDRAFT_TRADING_LIMIT : 0),
              ),
            actions: {
              type: "displayMessages",
              params: ["You don't have enough money to buy any goods."],
            },
          },
          {
            guard: ({ context, event }) =>
              event.action === "sell" && [...context.ship.hold.values()].every((value) => value === 0),
            actions: {
              type: "displayMessages",
              params: ["You don't have any goods to sell."],
            },
          },
          {
            actions: [assign(({ event }) => ({ marketAction: event.action }))],
            target: "#market",
          },
        ],
        DECLARE_BANKRUPTCY: [
          {
            guard: ({ context }) => context.balance > 0,
            actions: { type: "displayMessages", params: ["You're not bankrupt!"] },
            target: "#idle",
          },
          { target: "scoringScreen" },
        ],
        RETIRE: [
          {
            guard: ({ context }) => !context.canRetire || !stateIn({ gamescreen: "at_retirement" }),
            actions: { type: "displayMessages", params: ["You haven't finished your voyage yet"] },
            target: "#idle",
          },
          { target: "scoringScreen" },
        ],
      },
      /**NOTE
       * Time-based opportunities:
       * - When an opportunity is accepted - every trip, reduce the trip duration from the `timeLimit` and if the result is <= 0
       * and the player has not fullfilled the opportunity, the opportunity is failed.
       */
      always: [
        // Check if the ship is in wreckage condition and the player does not have enough money to repair it, game over
        {
          guard: ({ context }) =>
            getShipStatus(context.ship.health) === "Wreckage" &&
            context.day < GOAL_DAYS &&
            getShipStatus(calculateRepairForCost(getNetCash(context)) + context.ship.health) === "Wreckage",
          actions: {
            type: "displayMessages",
            params: [
              "Your ship is in wreckage condition and you don't have enough money to repair it.",
              "You've lost the game.",
            ],
          },
          target: "scoringScreen",
        },
        // Pay for fleet maintenance if the player has any guard ships and it's time to do so and the player is not in debt
        {
          guard: ({ context }) =>
            context.guardFleet.ships > 0 && context.day > context.guardFleet.lastMaintenanceDay && !context.inOverdraft,
          actions: [
            {
              type: "displayMessages",
              params: ({ context }) => {
                const daysPassed = context.day - context.guardFleet.lastMaintenanceDay;
                const dailyCost = calculateDailyMaintenanceCost(context);
                const totalCost = daysPassed * dailyCost;
                return [`Paid $${totalCost} for fleet maintenance`];
              },
            },
            assign(({ context }) => {
              const daysPassed = context.day - context.guardFleet.lastMaintenanceDay;
              const dailyCost = calculateDailyMaintenanceCost(context);
              const totalCost = daysPassed * dailyCost;

              return {
                balance: context.balance - totalCost,
                guardFleet: {
                  ...context.guardFleet,
                  lastMaintenanceDay: context.day,
                },
              };
            }),
          ],
        },
        // Check if the player is bankrupt
        {
          guard: ({ context }) => context.balance < BANKRUPTCY_THRESHOLD,
          actions: {
            type: "displayMessages",
            params: ["You have gone bankrupt! Your creditors have seized your assets."],
          },
          target: "scoringScreen",
        },
        // If the player is in overdraft and his debt is greater than -$1000, sell his fleet
        {
          guard: ({ context }) => context.balance < -OVERDRAFT_TRADING_LIMIT && context.guardFleet.ships > 0,
          actions: [
            assign(({ context }) => ({
              balance: context.balance + context.guardFleet.ships * BASE_GUARD_COST * 1.5,
              guardFleet: {
                ...context.guardFleet,
                ships: 0,
              },
              reputation: Math.max(0, context.reputation - 10),
            })),
            {
              type: "displayMessages",
              params: [
                "In a desperate attempt to pay your debts, you've sold your entire fleet.",
                "Your reputation has suffered significantly.",
              ],
            },
          ],
        },
        // Charge interest if the player is in overdraft
        {
          guard: ({ context }) => context.inOverdraft && context.day > context.lastOverdraftChargeDay,
          actions: [
            assign(({ context }) => ({
              // 3% daily interest or $25 per day, whichever is less
              balance: Math.max(
                Math.floor(
                  context.balance * Math.pow(1 + BASE_INTEREST_RATE, context.day - context.lastOverdraftChargeDay),
                ),
                context.balance - MAX_DAILY_OVERDRAFT,
              ),
              lastOverdraftChargeDay: context.day,
            })),
          ],
        },
        // Notify the player if they're in overdraft
        {
          guard: ({ context }) => context.balance < 0 && !context.inOverdraft,
          actions: [
            assign({ inOverdraft: true }),
            {
              type: "displayMessages",
              params: ({ context }) =>
                [
                  "You're in overdraft.",
                  "Interest will be charged at 3% per day.",
                  context.guardFleet.ships > 0
                    ? "Since you can't pay fleet maintenance fee, you fleet effectiveness is reduced."
                    : "",
                  `Be carefull your debt won't exceed -$${Math.abs(BANKRUPTCY_THRESHOLD)}, otherwise you'll go bankrupt!`,
                ].filter(Boolean),
            },
          ],
        },
        // Notify the player if they're no longer in overdraft
        {
          guard: ({ context }) => context.inOverdraft && context.balance >= 0,
          actions: [
            assign({ inOverdraft: false }),
            { type: "displayMessages", params: ["You're no longer in overdraft!"] },
          ],
        },
        // Set canRetire to true if the player has finished the game
        {
          guard: ({ context }) => !context.canRetire && context.day >= GOAL_DAYS,
          actions: assign({ canRetire: true }),
        },
        // Update prices if the next price update is due
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
        // Update trends if the next trend update is due
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
