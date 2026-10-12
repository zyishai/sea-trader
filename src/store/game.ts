import { assign, enqueueActions, setup } from "xstate";
import { initialContext } from "./defaults.js";
import { Context } from "./types.js";
import { GameEvents } from "./events.js";
import { Rng } from "./rng.js";
import { applyEventResult } from "./outcomes.js";
import { bribePirates, fightPirates, fleePirates } from "./pirates.js";
import { advanceDays, canRetire } from "./clock.js";
import { canAfford, fleetSaleValue, isBankrupt, isInOverdraft, netWorth } from "./treasury.js";
import { needsCaptainsChoice, takeCargoOffer } from "./cargo-offer.js";
import { amountOf, fitsAboard, freeSpace, isOverloaded, load, marginLeft, unload, withCapacity } from "./hold.js";
import {
  calculateCostForRepair,
  calculateGuardShipCost,
  calculatePirateEncounterChance,
  calculatePrice,
  calculateRepairForCost,
  calculateTravelTime,
  calculateFleetUpgradeCost,
  checkForEvent,
  getShipStatus,
  canAffordUpgrade,
  getNextUpgrade,
  joinWords,
  eventById,
  displayMonetaryValue,
} from "./utils.js";
import {
  BANKRUPTCY_THRESHOLD,
  GOAL_DAYS,
  MAX_DAILY_OVERDRAFT,
  goods,
  MAX_GUARD_QUALITY,
  MAX_GUARD_SHIPS,
  OVERDRAFT_TRADING_LIMIT,
  ports,
} from "./constants.js";
// Lets tsc name xstate's guard types when emitting declarations for the machines
import { type Guard } from "xstate/guards";

const currentEventOf = (context: Context) => (context.currentEvent ? eventById(context.currentEvent) : undefined);

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
                      currentEvent: checkForEvent(context)?.id,
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
                  actions: assign(({ context }) => applyEventResult(context, fightPirates(context))),
                  target: "traveling",
                },
                PIRATES_ENCOUNTER_FLEE: {
                  actions: assign(({ context }) => applyEventResult(context, fleePirates(context))),
                  target: "traveling",
                },
                PIRATES_ENCOUNTER_OFFER: {
                  actions: assign(({ context }) => applyEventResult(context, bribePirates(context))),
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
                      guard: ({ context }) => !!currentEventOf(context)?.choices,
                      target: "multi_choice",
                    },
                    {
                      guard: ({ context }) => !!currentEventOf(context)?.effect,
                      target: "no_choice",
                    },
                  ],
                },
                no_choice: {
                  entry: [{ type: "displayMessages", params: ({ context }) => [currentEventOf(context)!.message] }],
                  on: {
                    MSG_ACK: {
                      actions: [
                        { type: "acknoledgeMessage" },
                        assign(({ context }) => {
                          const effect = currentEventOf(context)!.effect;
                          return effect ? applyEventResult(context, effect(context)) : {};
                        }),
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
                          const choice = currentEventOf(context)!.choices?.find(
                            (choice) => choice.key === event.choice,
                          );
                          return choice ? applyEventResult(context, choice.effect(context)) : {};
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
              entry: assign(({ context }) => {
                const destination = context.destination ?? context.currentPort;
                const travelTime = context.destination ? calculateTravelTime(context.destination, context) : 1;
                const { context: arrived, notices } = advanceDays(
                  context,
                  Math.max(1, travelTime + (context.delayDays ?? 0)),
                );
                return {
                  ...arrived,
                  currentPort: destination,
                  destination: undefined,
                  currentEvent: undefined,
                  delayDays: undefined,
                  messages: [...arrived.messages, [`Arrived at ${destination}`, ...notices]],
                };
              }),
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
                guard: ({ context, event }) => !canAfford(context, calculatePrice({ ...context, ...event })),
                actions: {
                  type: "displayMessages",
                  params: ({ context, event }) => [
                    `Captain, you don't have enough money. You need ${displayMonetaryValue(calculatePrice({ ...context, ...event }))} to purchase ${event.quantity} picul of ${event.good.toLowerCase()}`,
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
                      `Purchased ${event.quantity} picul of ${event.good} for ${displayMonetaryValue(cost)}.`,
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
                      `Sold ${event.quantity} picul of ${event.good} for ${displayMonetaryValue(
                        calculatePrice({
                          ...context,
                          ...event,
                        }),
                      )}.`,
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
                guard: ({ context, event }) => !canAfford(context, event.cash),
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
                  return !canAfford(context, cost);
                },
                actions: {
                  type: "displayMessages",
                  params: ({ context, event }) => {
                    const cost = calculateGuardShipCost(context, event.amount);
                    return [
                      `Captain, we don't have enough money. Need ${displayMonetaryValue(cost)} to hire ${event.amount} ships.`,
                    ];
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
                  return !canAfford(context, cost);
                },
                actions: {
                  type: "displayMessages",
                  params: ({ context }) => {
                    const cost = calculateFleetUpgradeCost(context);
                    return [
                      `Captain, we don't have enough money. We need ${displayMonetaryValue(cost)} to upgrade our fleet.`,
                    ];
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
            guard: ({ context }) => !isInOverdraft(context),
            actions: { type: "displayMessages", params: ["You're not bankrupt!"] },
            target: "#mainMenu",
          },
          { actions: assign({ voyageEnd: "declaredBankrupt" }), target: "scoringScreen" },
        ],
        RETIRE: [
          {
            meta: {
              description: "Make sure the player can retire",
            },
            guard: ({ context }) => !canRetire(context),
            actions: { type: "displayMessages", params: ["You haven't finished your voyage yet!"] },
            target: "#mainMenu",
          },
          { actions: assign({ voyageEnd: "retired" }), target: "scoringScreen" },
        ],
      },
      always: [
        // Check if the ship is in wreckage condition and the player does not have enough money to repair it, game over
        {
          guard: ({ context }) =>
            getShipStatus(context.ship.health) === "Wreckage" &&
            context.day < GOAL_DAYS && // Make sure the player can't retire yet
            getShipStatus(calculateRepairForCost(netWorth(context), context) + context.ship.health) === "Wreckage",
          actions: [
            assign({ voyageEnd: "shipwrecked" }),
            {
              type: "displayMessages",
              params: [
                "Captain, our ship is in wreckage condition and we don't have enough money to repair it.",
                "You've lost the game.",
              ],
            },
          ],
          target: "scoringScreen",
        },
        // Check if the player is bankrupt
        {
          guard: ({ context }) => isBankrupt(context),
          actions: [
            assign({ voyageEnd: "bankrupt" }),
            {
              type: "displayMessages",
              params: ["Captain, we have gone bankrupt! The creditors have seized our assets."],
            },
          ],
          target: "scoringScreen",
        },
        // If the player is in overdraft and his debt is greater than -$1000, sell his fleet
        {
          guard: ({ context }) => context.balance < -OVERDRAFT_TRADING_LIMIT && context.guardFleet.ships > 0,
          actions: [
            assign(({ context }) => ({
              balance: context.balance + fleetSaleValue(context),
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
        // Notify the player if they're in overdraft
        {
          guard: ({ context }) => isInOverdraft(context) && !context.announcedOverdraft,
          actions: [
            assign({ announcedOverdraft: true }),
            {
              type: "displayMessages",
              params: ({ context }) =>
                [
                  "Captain, we're in debt with the moneylenders.",
                  `They're charging 3% interest a day, up to ${displayMonetaryValue(MAX_DAILY_OVERDRAFT)} a day.`,
                  context.guardFleet.ships > 0
                    ? `Since we can't pay fleet maintenance fee, our fleet effectiveness is reduced.`
                    : "",
                  `If our debt passes ${displayMonetaryValue(BANKRUPTCY_THRESHOLD)}, we'll go bankrupt!`,
                ].filter(Boolean),
            },
          ],
        },
        // Notify the player if they're no longer in overdraft
        {
          guard: ({ context }) => !isInOverdraft(context) && context.announcedOverdraft,
          actions: [
            assign({ announcedOverdraft: false }),
            { type: "displayMessages", params: ["We're no longer in overdraft, Captain!"] },
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
