import { assign, enqueueActions, setup } from "xstate";
import { initialContext } from "./defaults.js";
import { Context, Good } from "./types.js";
import { GameEvents } from "./events.js";
import { Rng } from "./rng.js";
import { spendingPower } from "./treasury.js";
import { needsCaptainsChoice, takeCargoOffer } from "./cargo-offer.js";
import {
  amountOf,
  fitsAboard,
  freeSpace,
  goodsAboard,
  isOverloaded,
  load,
  marginLeft,
  overloadLevel,
  unload,
  value,
  withCapacity,
} from "./hold.js";
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
  getNetCash,
  getShipStatus,
  distributeFleetDamage,
  canAffordUpgrade,
  getNextUpgrade,
  updateTrends,
  getNextSeason,
  updatePriceHistory,
  joinWords,
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
  SEASON_LENGTH,
} from "./constants.js";
import { type Guard } from "xstate/guards";

const OVERLOADED_MESSAGES = [
  "Our ship is overloaded, Captain!",
  "This will reduce our speed and increase risk of damage to our ship.",
];

export const gameMachine = setup({
  types: {
    context: {} as Context,
    events: {} as GameEvents,
    input: {} as { rng: Rng },
  },
  actions: {
    displayMessages: assign(({ context }, messages: string[]) => ({
      messages: [...context.messages, messages].filter((msgs) => msgs.length > 0),
    })),
    acknoledgeMessage: assign(({ context }) => ({ messages: context.messages.slice(1) })),
    takeCargoOffer: enqueueActions(({ context, enqueue }, { overload }: { overload: boolean }) => {
      const { hold, taken, leftBehind } = takeCargoOffer(
        context.ship.hold,
        context.cargoOffer ?? {},
        context.prices[context.currentPort],
        { overload },
      );
      const loadedMessage = `We loaded ${joinWords(taken.map(([good, picul]) => `${picul} picul of ${good}`))} into the hold.`;

      const outcomeMessages = [
        taken.length > 0 ? loadedMessage : "",
        leftBehind > 0
          ? taken.length > 0
            ? `We left ${leftBehind} picul behind.`
            : "There was no room in the hold, so we left it all behind."
          : "",
      ].filter(Boolean);
      const becameOverloaded = !isOverloaded(context.ship.hold) && isOverloaded(hold);

      enqueue.assign({
        ship: { ...context.ship, hold },
        cargoOffer: undefined,
        messages: [...context.messages, outcomeMessages, becameOverloaded ? OVERLOADED_MESSAGES : []].filter(
          (messages) => messages.length > 0,
        ),
      });
    }),
  },
}).createMachine({
  initial: "introScreen",
  context: ({ input }) => initialContext(input.rng),
  states: {
    introScreen: {
      on: {
        START_GAME: {
          target: "gameScreen",
          actions: assign(({ context, event }) => initialContext(context.rng, event.settings)),
        },
        SHOW_HELP: { target: "helpScreen" },
      },
    },
    gameScreen: {
      initial: "menu",
      states: {
        menu: {
          id: "mainMenu",
          on: {
            GO_TO_PORT: [
              {
                meta: {
                  description: "Check the player can travel (or explore)",
                },
                guard: ({ context }) => context.day >= GOAL_DAYS && !context.extendedGame,
                actions: {
                  type: "displayMessages",
                  params: [`You've finished your ${GOAL_DAYS} days voyage.`],
                },
              },
              { target: "at_port" },
            ],
            GO_TO_MARKET: { target: "at_market" },
            GO_TO_SHIPYARD: { target: "at_shipyard" },
          },
        },
        at_port: {
          entry: assign(({ context }) => ({ availablePorts: ports.filter((p) => p !== context.currentPort) })),
          initial: "menu",
          states: {
            menu: {
              on: {
                TRAVEL_TO: [
                  {
                    guard: ({ context }) => getShipStatus(context.ship.health) === "Wreckage",
                    actions: {
                      type: "displayMessages",
                      params: ["Our ship is a wreckage, Captain.", "We can't travel until we repair it."],
                    },
                  },
                  {
                    target: "checkPiratesEncounter",
                    actions: assign(({ event, context }) => ({
                      destination: event.destination,
                      currentEvent: checkForEvent(context),
                    })),
                  },
                ],
                CANCEL: { target: "#mainMenu" },
              },
            },
            checkPiratesEncounter: {
              always: [
                {
                  guard: ({ context }) => context.rng.chance(calculatePirateEncounterChance(context)),
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
                    const success = context.rng.chance(successChance);

                    if (success) {
                      // Even when winning, ship might take some damage
                      const takeDamage = context.rng.chance(0.7); // 70% chance to take damage
                      const damage = takeDamage ? context.rng.int(5, 14) : 0;
                      const { shipDamage, shipsLost, remainingFleetDamage } = distributeFleetDamage(damage, context);

                      // Loot from pirates
                      const cargoValue = value(context.ship.hold, context.prices[context.currentPort]);
                      const baseLoot = context.rng.int(801, 1300);
                      const factor = Math.floor(100_000 / Math.max(1, context.balance + cargoValue));
                      const potentialLoot = Math.max(500, Math.floor(baseLoot * factor));
                      const actualLoot = Math.min(15_000, potentialLoot);

                      const messages = ["We drove them off, Captain!", `Found $${actualLoot} in their hold.`];

                      if (shipDamage > 0) {
                        messages.push(`Captain, our ship took ${shipDamage} damage in the battle!`);
                        if (shipsLost > 0) {
                          messages.push(
                            `We lost ${Math.min(shipsLost, context.guardFleet.ships)} guard ship${
                              Math.min(shipsLost, context.guardFleet.ships) > 1 ? "s" : ""
                            }.`,
                          );
                        }
                      }

                      messages.push(`Gained 5 reputation points for your bravery.`);

                      enqueue({ type: "displayMessages", params: messages });
                      enqueue.assign({
                        ship: {
                          ...context.ship,
                          health: Math.max(0, context.ship.health - shipDamage),
                        },
                        guardFleet: {
                          ...context.guardFleet,
                          ships: Math.max(0, context.guardFleet.ships - shipsLost),
                          damage: remainingFleetDamage,
                        },
                        balance: context.balance + actualLoot,
                        reputation: Math.min(100, context.reputation + 5),
                      });
                    } else {
                      // Lost the fight - more severe consequences
                      const damage = context.rng.int(15, 34);
                      const { shipDamage, shipsLost, remainingFleetDamage } = distributeFleetDamage(damage, context);

                      const stolenGoods = context.rng.int(5, 14);
                      const [randomGood] = context.rng.pick(goodsAboard(context.ship.hold)) ?? [];
                      const { hold: newHold, unloaded: stolen } = randomGood
                        ? unload(context.ship.hold, randomGood, stolenGoods)
                        : { hold: context.ship.hold, unloaded: 0 };

                      enqueue({
                        type: "displayMessages",
                        params: [
                          "Despite our guard fleet's efforts, the pirates prevailed!",
                          `We took ${Math.min(shipDamage, context.ship.health)} damage in the battle.`,
                          randomGood ? `The pirates stole ${stolen} ${randomGood} from our hold.` : "",
                          shipsLost > 0
                            ? `We lost ${Math.min(shipsLost, context.guardFleet.ships)} guard ship${
                                Math.min(shipsLost, context.guardFleet.ships) > 1 ? "s" : ""
                              } in the battle.`
                            : "",
                          `Lost ${Math.min(shipsLost * 2 + 1, context.reputation)} reputation points.`,
                        ].filter(Boolean),
                      });
                      enqueue.assign({
                        ship: {
                          ...context.ship,
                          health: Math.max(0, context.ship.health - shipDamage),
                          hold: newHold,
                        },
                        guardFleet: {
                          ...context.guardFleet,
                          ships: Math.max(0, context.guardFleet.ships - shipsLost),
                          damage: remainingFleetDamage,
                        },
                        reputation: Math.max(0, context.reputation - (shipsLost * 2 + 1)),
                      });
                    }
                  }),
                  target: "traveling",
                },
                PIRATES_ENCOUNTER_FLEE: {
                  actions: enqueueActions(({ enqueue, context }) => {
                    const baseFleeChance = 0.6 + calculateGuardEffectiveness(context) * 0.2;

                    const overloadPenalty = overloadLevel(context.ship.hold) * 0.4;

                    const fleeChance = Math.max(0.1, baseFleeChance - overloadPenalty);
                    const success = context.rng.chance(fleeChance);

                    if (success) {
                      const noDamage = context.rng.chance(0.3); // 30% chance to escape without any damage
                      if (noDamage) {
                        enqueue({
                          type: "displayMessages",
                          params: ["Captain, you managed to maneuver away from the pirates without a scratch!"],
                        });
                      } else {
                        const damage = context.rng.int(3, 10);
                        const { shipDamage, shipsLost, remainingFleetDamage } = distributeFleetDamage(damage, context);

                        const messages = [
                          "Captain, we've successfully escaped from the pirates!",
                          `Our ship took ${shipDamage} damage while fleeing.`,
                        ];

                        if (shipsLost > 0) {
                          messages.push(
                            `We've lost ${Math.min(shipsLost, context.guardFleet.ships)} guard ship${
                              Math.min(shipsLost, context.guardFleet.ships) > 1 ? "s" : ""
                            } covering our escape.`,
                          );
                        }

                        enqueue({
                          type: "displayMessages",
                          params: messages,
                        });
                        enqueue.assign({
                          ship: {
                            ...context.ship,
                            health: Math.max(0, context.ship.health - shipDamage),
                          },
                          guardFleet: {
                            ...context.guardFleet,
                            ships: Math.max(0, context.guardFleet.ships - shipsLost),
                            damage: remainingFleetDamage,
                          },
                        });
                      }
                    } else {
                      const damage = context.rng.int(10, 24);
                      const { shipDamage, shipsLost, remainingFleetDamage } = distributeFleetDamage(damage, context);

                      const messages = [
                        "Failed to escape from the pirates, Captain!",
                        `Our ship took ${shipDamage} damage while attempting to flee.`,
                        shipsLost > 0
                          ? `We've lost ${Math.min(shipsLost, context.guardFleet.ships)} guard ship${
                              Math.min(shipsLost, context.guardFleet.ships) > 1 ? "s" : ""
                            } to the pirates.`
                          : "",
                        `Lost ${Math.min(2, context.reputation)} reputation points.`,
                      ].filter(Boolean);

                      enqueue({
                        type: "displayMessages",
                        params: messages,
                      });
                      enqueue.assign({
                        ship: {
                          ...context.ship,
                          health: Math.max(0, context.ship.health - shipDamage),
                        },
                        guardFleet: {
                          ...context.guardFleet,
                          ships: Math.max(0, context.guardFleet.ships - shipsLost),
                          damage: remainingFleetDamage,
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
                    const actualBribe = context.rng.int(0, context.balance);
                    const success = actualBribe >= bribeCost;

                    if (success) {
                      enqueue({
                        type: "displayMessages",
                        params: [
                          `Captain, we paid the pirates $${bribeCost} to let us pass freely.`,
                          `Lost 1 reputation point.`,
                        ],
                      });
                      enqueue.assign({
                        balance: context.balance - bribeCost,
                        reputation: Math.max(0, context.reputation - 1),
                      });
                    } else {
                      const damage = context.rng.int(15, 39);
                      const { shipDamage, shipsLost, remainingFleetDamage } = distributeFleetDamage(damage, context);

                      const messages = [
                        "Captain, we couldn't afford to bribe the pirates!",
                        "They attacked us in anger!",
                        `We took ${shipDamage} damage.`,
                        `Lost ${Math.min(5, context.reputation)} reputation points.`,
                      ];

                      enqueue({
                        type: "displayMessages",
                        params: messages,
                      });
                      enqueue.assign({
                        ship: {
                          ...context.ship,
                          health: Math.max(0, context.ship.health - shipDamage),
                        },
                        guardFleet: {
                          ...context.guardFleet,
                          ships: Math.max(0, context.guardFleet.ships - shipsLost),
                          damage: remainingFleetDamage,
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
              initial: "determine_type",
              states: {
                determine_type: {
                  always: [
                    {
                      guard: ({ context }) => !!context.currentEvent?.choices,
                      target: "multi_choice",
                    },
                    {
                      guard: ({ context }) => !!context.currentEvent?.effect,
                      target: "no_choice",
                    },
                  ],
                },
                no_choice: {
                  entry: [{ type: "displayMessages", params: ({ context }) => [context.currentEvent!.message] }],
                  on: {
                    MSG_ACK: {
                      actions: [
                        { type: "acknoledgeMessage" },
                        assign(
                          ({ context }) =>
                            context.currentEvent!.effect?.(context) ?? { currentPort: context.destination },
                        ),
                      ],
                      target: "#checkCargoOffer",
                    },
                  },
                },
                multi_choice: {
                  on: {
                    RESOLVE_EVENT: {
                      actions: [
                        assign(({ context, event }) => {
                          const choice = context.currentEvent!.choices?.find((choice) => choice.key === event.choice);
                          return choice?.effect(context) ?? { currentPort: context.destination };
                        }),
                      ],
                      target: "#checkCargoOffer",
                    },
                  },
                },
              },
            },
            checkCargoOffer: {
              id: "checkCargoOffer",
              always: [
                { guard: ({ context }) => !context.cargoOffer, target: "traveling" },
                {
                  guard: ({ context }) =>
                    needsCaptainsChoice(context.ship.hold, context.cargoOffer!, context.prices[context.currentPort]),
                  target: "cargoOffer",
                },
                { actions: { type: "takeCargoOffer", params: { overload: false } }, target: "traveling" },
              ],
            },
            cargoOffer: {
              on: {
                TAKE_CARGO: {
                  actions: { type: "takeCargoOffer", params: ({ event }) => ({ overload: event.overload }) },
                  target: "traveling",
                },
              },
            },
            traveling: {
              id: "traveling",
              entry: [
                // Adjust travel attributes
                assign(({ context }) => {
                  const travelTime = context.destination ? calculateTravelTime(context.destination, context) : 1;
                  return {
                    day: Math.min(context.extendedGame ? Infinity : GOAL_DAYS, context.day + travelTime),
                    currentPort: context.destination,
                    nextPriceUpdate: Math.max(0, context.nextPriceUpdate - travelTime),
                    nextSeasonDay: Math.max(0, context.nextSeasonDay - travelTime),
                  };
                }),
                // Reset temporary context attributes
                assign({ destination: undefined, currentEvent: undefined }),
                {
                  type: "displayMessages",
                  params: ({ context }) => [`Arrived to ${context.currentPort}`],
                },
              ],
              always: [{ target: "#mainMenu" }],
            },
          },
        },
        at_market: {
          entry: assign({ availableGoods: goods }),
          on: {
            PURCHASE: [
              {
                meta: {
                  description: "Check that player has enough cash",
                },
                guard: ({ context, event }) => calculatePrice({ ...context, ...event }) > spendingPower(context),
                actions: {
                  type: "displayMessages",
                  params: ({ context, event }) => [
                    `Captain, you don't have enough money. You need $${calculatePrice({ ...context, ...event })} to purchase ${event.quantity} picul of ${event.good.toLowerCase()}`,
                  ],
                },
              },
              {
                meta: {
                  description: "Check that player has enough cargo space",
                },
                guard: ({ context, event }) =>
                  fitsAboard(context.ship.hold, event.good, { overload: true }) < event.quantity,
                actions: {
                  type: "displayMessages",
                  params: ({ context, event }) => [
                    `Captain, we don't have room in the hold for ${event.quantity} picul of ${event.good.toLowerCase()}.`,
                    `We have room for ${freeSpace(context.ship.hold)} more picul (${marginLeft(context.ship.hold)} if we overload).`,
                  ],
                },
              },
              {
                actions: enqueueActions(({ enqueue, context, event }) => {
                  const cost = calculatePrice({ ...context, ...event });
                  const { hold, becameOverloaded } = load(context.ship.hold, event.good, event.quantity);

                  enqueue.assign({ ship: { ...context.ship, hold }, balance: context.balance - cost });
                  enqueue({
                    type: "displayMessages",
                    params: [
                      `Purchased ${event.quantity} picul of ${event.good} for $${cost}.`,
                      `We have room for ${freeSpace(hold)} more picul, Captain.`,
                    ],
                  });
                  if (becameOverloaded) {
                    enqueue({ type: "displayMessages", params: OVERLOADED_MESSAGES });
                  }
                }),
              },
            ],
            SELL: [
              {
                meta: {
                  description: "Check that player has enough to sell",
                },
                guard: ({ context, event }) => amountOf(context.ship.hold, event.good) < event.quantity,
                actions: {
                  type: "displayMessages",
                  params: ({ event }) => [`Captain, we don't have enough ${event.good.toLowerCase()} in our hold.`],
                },
              },
              {
                actions: [
                  assign(({ context, event }) => ({
                    ship: { ...context.ship, hold: unload(context.ship.hold, event.good, event.quantity).hold },
                    balance: context.balance + calculatePrice({ ...context, ...event }),
                  })),
                  {
                    type: "displayMessages",
                    params: ({ context, event }) => [
                      `Sold ${event.quantity} picul of ${event.good} for $${calculatePrice({
                        ...context,
                        ...event,
                      })}.`,
                      `We have room for ${freeSpace(context.ship.hold)} more picul, Captain.`,
                    ],
                  },
                ],
              },
            ],
            CANCEL: { target: "#mainMenu" },
          },
        },
        at_shipyard: {
          on: {
            REPAIR: [
              {
                meta: {
                  description: "Check that player's ship is damaged",
                },
                guard: ({ context }) => context.ship.health === 100,
                actions: { type: "displayMessages", params: ["Captain, your ship is already in perfect condition"] },
              },
              {
                meta: {
                  description: "Check the player has enough cash",
                },
                guard: ({ context, event }) => spendingPower(context) < event.cash,
                actions: {
                  type: "displayMessages",
                  params: ["Captain, we don't have enough cash to pay for this repair"],
                },
              },
              {
                actions: [
                  {
                    type: "displayMessages",
                    params: ({ context, event }) => {
                      const damageToRepair = Math.min(
                        /* ship's damage */ 100 - context.ship.health,
                        calculateRepairForCost(event.cash, context),
                      );
                      return [`Captain, they repaired ${damageToRepair} damage to our ship.`];
                    },
                  },
                  assign(({ context, event }) => {
                    const damageToRepair = Math.min(
                      /* ship's damage */ 100 - context.ship.health,
                      calculateRepairForCost(event.cash, context),
                    );
                    const cost = calculateCostForRepair(damageToRepair, context);
                    return {
                      balance: context.balance - cost,
                      ship: {
                        ...context.ship,
                        health: context.ship.health + damageToRepair,
                      },
                    };
                  }),
                ],
              },
            ],
            UPGRADE_SHIP: [
              {
                meta: {
                  description: "Check the player has enough cash",
                },
                guard: ({ context, event }) => !canAffordUpgrade(event.upgradeType, context),
                actions: [
                  { type: "displayMessages", params: ["Captain, we don't have enough cash for this upgrade."] },
                ],
              },
              {
                actions: [
                  assign(({ context, event }) => {
                    const upgrade = getNextUpgrade(event.upgradeType, context);

                    if (!upgrade) return context;

                    const messages = [`Captain, they've upgraded our ship's ${event.upgradeType}!`];

                    if ("reputation" in upgrade) {
                      messages.push(`Your ship improvements have earned you ${upgrade.reputation} reputation points!`);
                    }

                    return {
                      ship:
                        "capacity" in upgrade
                          ? { ...context.ship, hold: withCapacity(context.ship.hold, upgrade.capacity) }
                          : "speed" in upgrade
                            ? { ...context.ship, speed: upgrade.speed }
                            : { ...context.ship, defense: upgrade.defense },
                      balance: context.balance - upgrade.cost,
                      messages: [...context.messages, messages],
                      reputation: Math.min(
                        100,
                        context.reputation + ("reputation" in upgrade ? upgrade.reputation : 0),
                      ),
                    };
                  }),
                ],
              },
            ],
            HIRE_PERMANENT_GUARDS: [
              {
                meta: {
                  description: "Check the player's fleet is not at maximum capacity",
                },
                guard: ({ context }) => context.guardFleet.ships >= MAX_GUARD_SHIPS,
                actions: {
                  type: "displayMessages",
                  params: [`Captain, our fleet is at maximum capacity (${MAX_GUARD_SHIPS} ships)`],
                },
              },
              {
                meta: {
                  description: "Check the player doesn't hire more guards than his maximum fleet capacity",
                },
                guard: ({ context, event }) => {
                  const totalShips = context.guardFleet.ships + event.amount;
                  return totalShips > MAX_GUARD_SHIPS;
                },
                actions: {
                  type: "displayMessages",
                  params: [`Captain, we cannot hire that many ships. Maximum fleet size is ${MAX_GUARD_SHIPS} ships.`],
                },
              },
              {
                meta: {
                  description: "Check the player has enough cash",
                },
                guard: ({ context, event }) => {
                  const cost = calculateGuardShipCost(context, event.amount);
                  return spendingPower(context) < cost;
                },
                actions: {
                  type: "displayMessages",
                  params: ({ context, event }) => {
                    const cost = calculateGuardShipCost(context, event.amount);
                    return [`Captain, we don't have enough cash. Need $${cost} to hire ${event.amount} ships.`];
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
                    params: ({ event }) => [`Captain, we hired ${event.amount} permanent guard ships`],
                  },
                ],
              },
            ],
            UPGRADE_GUARDS: [
              {
                meta: {
                  description: "Check the player has guard ships",
                },
                guard: ({ context }) => context.guardFleet.ships === 0,
                actions: {
                  type: "displayMessages",
                  params: ["Captain, we don't have any guard ships to upgrade."],
                },
              },
              {
                meta: {
                  description: "Check the fleet can upgrade",
                },
                guard: ({ context }) => context.guardFleet.quality >= MAX_GUARD_QUALITY,
                actions: {
                  type: "displayMessages",
                  params: ["Captain, our fleet is already at maximum quality."],
                },
              },
              {
                meta: {
                  description: "Check the player has enough cash",
                },
                guard: ({ context }) => {
                  const cost = calculateFleetUpgradeCost(context);
                  return context.balance < cost;
                },
                actions: {
                  type: "displayMessages",
                  params: ({ context }) => {
                    const cost = calculateFleetUpgradeCost(context);
                    return [`Captain, we don't have enough cash. We need $${cost} to upgrade our fleet.`];
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
                    params: ({ context }) => [
                      `Captain, our fleet upgraded to quality level ${context.guardFleet.quality}!`,
                    ],
                  },
                ],
              },
            ],
            DISMISS_GUARDS: [
              {
                meta: {
                  description: "Check the player has guard ships",
                },
                guard: ({ context }) => context.guardFleet.ships === 0,
                actions: {
                  type: "displayMessages",
                  params: ["Captain, we don't have any guard ships to dismiss."],
                },
              },
              {
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
                    params: ({ event }) => [`We've dismissed ${event.amount} guard ships, Captain.`],
                  },
                ],
              },
            ],
            CANCEL: { target: "#mainMenu" },
          },
        },
      },
      on: {
        MSG_ACK: { actions: { type: "acknoledgeMessage" } },
        DECLARE_BANKRUPTCY: [
          {
            meta: {
              description: "Check if the player is actually bankrupt",
            },
            guard: ({ context }) => context.balance > 0,
            actions: { type: "displayMessages", params: ["You're not bankrupt!"] },
            target: "#mainMenu",
          },
          { target: "scoringScreen" },
        ],
        RETIRE: [
          {
            meta: {
              description: "Make sure the player can retire",
            },
            guard: ({ context }) => !context.canRetire,
            actions: { type: "displayMessages", params: ["You haven't finished your voyage yet!"] },
            target: "#mainMenu",
          },
          { target: "scoringScreen" },
        ],
      },
      always: [
        // Check if the ship is in wreckage condition and the player does not have enough money to repair it, game over
        {
          guard: ({ context }) =>
            getShipStatus(context.ship.health) === "Wreckage" &&
            context.day < GOAL_DAYS && // Make sure the player can't retire yet
            getShipStatus(calculateRepairForCost(getNetCash(context), context) + context.ship.health) === "Wreckage",
          actions: {
            type: "displayMessages",
            params: [
              "Captain, our ship is in wreckage condition and we don't have enough money to repair it.",
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
            params: ["Captain, we have gone bankrupt! The creditors have seized our assets."],
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
                  "Captain, we're in debt with the moneylenders.",
                  "They're charging 3% daily interest.",
                  context.guardFleet.ships > 0
                    ? `Since we can't pay fleet maintenance fee, our fleet effectiveness is reduced.`
                    : "",
                  `If our debt exceed -$${Math.abs(BANKRUPTCY_THRESHOLD)} - we'll go bankrupt!`,
                ].filter(Boolean),
            },
          ],
        },
        // Notify the player if they're no longer in overdraft
        {
          guard: ({ context }) => context.inOverdraft && context.balance >= 0,
          actions: [
            assign({ inOverdraft: false }),
            { type: "displayMessages", params: ["We're no longer in overdraft, Captain!"] },
          ],
        },
        // Set canRetire to true if the player has finished the game
        {
          guard: ({ context }) => !context.canRetire && context.day >= GOAL_DAYS,
          actions: assign({ canRetire: true }),
        },
        // Update prices (and due trends) if the next price update is due
        {
          guard: ({ context }) => context.nextPriceUpdate <= 0,
          actions: [
            { type: "displayMessages", params: ["Prices have updated!"] },
            assign(({ context }) => {
              const newTrends = updateTrends(context.trends, context.rng);
              const newPrices = generatePrices(newTrends, context.currentSeason, context.rng);
              const shouldIncreaseTrendChanges = Object.values(context.trends).some((rec) =>
                Object.values(rec).some((trend) => trend.duration <= 1),
              );
              const newIntelligence = {
                ...context.marketIntelligence,
                priceUpdates: context.marketIntelligence.priceUpdates + 1,
                trendChanges: context.marketIntelligence.trendChanges + Number(shouldIncreaseTrendChanges),
                analysis: updatePriceHistory({ ...context, prices: newPrices }),
              };

              return {
                prices: newPrices,
                trends: newTrends,
                nextPriceUpdate: PRICE_UPDATE_INTERVAL,
                marketIntelligence: newIntelligence,
              };
            }),
          ],
        },
        // Update season if the next season day is due
        {
          guard: ({ context }) => context.nextSeasonDay <= 0,
          actions: [
            {
              type: "displayMessages",
              params: ({ context }) => [`Season changes to ${getNextSeason(context.currentSeason)}.`],
            },
            assign(({ context }) => ({
              currentSeason: getNextSeason(context.currentSeason),
              nextSeasonDay: SEASON_LENGTH,
              marketIntelligence: {
                ...context.marketIntelligence,
                seasonChanges: context.marketIntelligence.seasonChanges + 1,
              },
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
