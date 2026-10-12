import { assign, enqueueActions, setup } from "xstate";

// Lets tsc name xstate's guard types when emitting declarations for the machines
import { type Guard } from "xstate/guards";
import { needsCaptainsChoice, takeCargoOffer } from "./cargo-offer.js";
import { GOAL_DAYS, advanceDays, canRetire } from "./clock.js";
import { GameEvents } from "./commands.js";
import { Context, initialContext } from "./context.js";
import { checkForEvent, eventById } from "./events/chance.js";
import { EventResult, applyEventResult, result } from "./events/outcomes.js";
import { bribePirates, fightPirates, fleePirates } from "./events/pirates.js";
import { MAX_GUARD_QUALITY, MAX_GUARD_SHIPS, calculateFleetUpgradeCost, calculateGuardShipCost } from "./fleet.js";
import { displayMonetaryValue, joinWords } from "./format.js";
import { amountOf, fitsAboard, freeSpace, isOverloaded, load, marginLeft, unload } from "./hold.js";
import { calculatePrice } from "./market/prices.js";
import { Rng } from "./rng.js";
import { getShipStatus, nextUpgrade, upgradeShip } from "./ship.js";
import { calculateCostForRepair, calculateRepairForCost, canAffordUpgrade } from "./shipyard.js";
import { calculatePirateEncounterChance, calculateTravelTime } from "./travel.js";
import {
  BANKRUPTCY_THRESHOLD,
  MAX_DAILY_OVERDRAFT,
  FLEET_SALE_DEBT_LIMIT,
  canAfford,
  fleetSaleValue,
  isBankrupt,
  isInOverdraft,
  netWorth,
} from "./treasury.js";

const currentEventOf = (context: Context) => (context.currentEvent ? eventById(context.currentEvent) : undefined);

const OVERLOADED_NOTICE = [
  "Our ship is overloaded, Captain!",
  "This will reduce our speed and increase risk of damage to our ship.",
];

export const gameMachine = setup({
  types: {
    context: {} as Context,
    events: {} as GameEvents,
    emitted: {} as { type: "notice"; lines: string[] },
    input: {} as { rng: Rng },
  },
  actions: {
    notify: enqueueActions(({ context, enqueue }, lines: string[]) => {
      if (lines.length === 0) return;
      enqueue.assign({ notices: [...context.notices, lines] });
      enqueue.emit({ type: "notice", lines });
    }),
    applyResult: enqueueActions(({ context, enqueue }, eventResult: EventResult) => {
      const { context: next, notice } = applyEventResult(context, eventResult);
      enqueue.assign(notice.length > 0 ? { ...next, notices: [...next.notices, notice] } : next);
      if (notice.length > 0) enqueue.emit({ type: "notice", lines: notice });
    }),
    takeCargoOffer: enqueueActions(({ context, enqueue }, { overload }: { overload: boolean }) => {
      const { hold, taken, leftBehind } = takeCargoOffer(
        context.ship.hold,
        context.cargoOffer ?? {},
        context.prices[context.currentPort],
        { overload },
      );
      const loadedLine = `We loaded ${joinWords(taken.map(([good, picul]) => `${picul} picul of ${good}`))} into the hold.`;

      const outcomeLines = [
        taken.length > 0 ? loadedLine : "",
        leftBehind > 0
          ? taken.length > 0
            ? `We left ${leftBehind} picul behind.`
            : "There was no room in the hold, so we left it all behind."
          : "",
      ].filter(Boolean);
      const becameOverloaded = !isOverloaded(context.ship.hold) && isOverloaded(hold);

      const notices = [outcomeLines, becameOverloaded ? OVERLOADED_NOTICE : []].filter((lines) => lines.length > 0);
      enqueue.assign({
        ship: { ...context.ship, hold },
        cargoOffer: undefined,
        notices: [...context.notices, ...notices],
      });
      notices.forEach((lines) => enqueue.emit({ type: "notice", lines }));
    }),
  },
}).createMachine({
  initial: "idle",
  context: ({ input }) => initialContext(input.rng),
  states: {
    idle: {
      on: {
        START_GAME: {
          target: "inPort",
          actions: assign(({ context, event }) => initialContext(context.rng, event.settings)),
        },
      },
    },
    inPort: {
      id: "inPort",
      on: {
        PURCHASE: [
          {
            meta: {
              description: "Check that player has enough cash",
            },
            guard: ({ context, event }) => !canAfford(context, calculatePrice({ ...context, ...event })),
            actions: {
              type: "notify",
              params: ({ context, event }) => [
                `Captain, you don't have enough money. You need ${displayMonetaryValue(calculatePrice({ ...context, ...event }))} to purchase ${event.quantity} picul of ${event.good.toLowerCase()}`,
              ],
            },
          },
          {
            meta: {
              description: "Check that player has enough cargo space",
            },
            guard: ({ context, event }) => fitsAboard(context.ship.hold, { overload: true }) < event.quantity,
            actions: {
              type: "notify",
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
                type: "notify",
                params: [
                  `Purchased ${event.quantity} picul of ${event.good} for ${displayMonetaryValue(cost)}.`,
                  `We have room for ${freeSpace(hold)} more picul, Captain.`,
                ],
              });
              if (becameOverloaded) {
                enqueue({ type: "notify", params: OVERLOADED_NOTICE });
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
              type: "notify",
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
                type: "notify",
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
        REPAIR: [
          {
            meta: {
              description: "Check that player's ship is damaged",
            },
            guard: ({ context }) => context.ship.health === 100,
            actions: { type: "notify", params: ["Captain, your ship is already in perfect condition"] },
          },
          {
            meta: {
              description: "Check the player has enough cash",
            },
            guard: ({ context, event }) => !canAfford(context, event.cash),
            actions: {
              type: "notify",
              params: ["Captain, we don't have enough cash to pay for this repair"],
            },
          },
          {
            actions: [
              {
                type: "notify",
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
            actions: [{ type: "notify", params: ["Captain, we don't have enough money for this upgrade."] }],
          },
          {
            actions: enqueueActions(({ context, event, enqueue }) => {
              const upgrade = nextUpgrade(context.ship, event.upgradeType);
              if (!upgrade) return;

              enqueue.assign({
                ship: upgradeShip(context.ship, event.upgradeType),
                balance: context.balance - upgrade.cost,
                reputation: Math.min(100, context.reputation + (upgrade.reputation ?? 0)),
              });
              enqueue({
                type: "notify",
                params: [
                  `Captain, they've upgraded our ship's ${event.upgradeType}!`,
                  ...(upgrade.reputation
                    ? [`Your ship improvements have earned you ${upgrade.reputation} reputation points!`]
                    : []),
                ],
              });
            }),
          },
        ],
        HIRE_PERMANENT_GUARDS: [
          {
            meta: {
              description: "Check the player's fleet is not at maximum capacity",
            },
            guard: ({ context }) => context.guardFleet.ships >= MAX_GUARD_SHIPS,
            actions: {
              type: "notify",
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
              type: "notify",
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
              type: "notify",
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
                type: "notify",
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
              type: "notify",
              params: ["Captain, we don't have any guard ships to upgrade."],
            },
          },
          {
            meta: {
              description: "Check the fleet can upgrade",
            },
            guard: ({ context }) => context.guardFleet.quality >= MAX_GUARD_QUALITY,
            actions: {
              type: "notify",
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
              type: "notify",
              params: ({ context }) => {
                const cost = calculateFleetUpgradeCost(context);
                return [
                  `Captain, we don't have enough money. We need ${displayMonetaryValue(cost)} to upgrade our fleet.`,
                ];
              },
            },
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
                type: "notify",
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
              type: "notify",
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
                type: "notify",
                params: ({ event }) => [`We've dismissed ${event.amount} guard ships, Captain.`],
              },
            ],
          },
        ],
        TRAVEL_TO: [
          {
            guard: ({ context }) => context.day >= GOAL_DAYS && !context.extendedGame,
            actions: {
              type: "notify",
              params: [`You've finished your ${GOAL_DAYS} days voyage.`],
            },
          },
          {
            guard: ({ context }) => getShipStatus(context.ship.health) === "Wreckage",
            actions: {
              type: "notify",
              params: ["Our ship is a wreckage, Captain.", "We can't travel until we repair it."],
            },
          },
          {
            target: "#atSea",
            actions: assign(({ event, context }) => ({
              destination: event.destination,
              currentEvent: checkForEvent(context)?.id,
            })),
          },
        ],
        DECLARE_BANKRUPTCY: [
          {
            meta: {
              description: "Check if the player is actually bankrupt",
            },
            guard: ({ context }) => !isInOverdraft(context),
            actions: { type: "notify", params: ["You're not bankrupt!"] },
          },
          { actions: assign({ voyageEnd: "declaredBankrupt" }), target: "#ended" },
        ],
        RETIRE: [
          {
            meta: {
              description: "Make sure the player can retire",
            },
            guard: ({ context }) => !canRetire(context),
            actions: { type: "notify", params: ["You haven't finished your voyage yet!"] },
          },
          { actions: assign({ voyageEnd: "retired" }), target: "#ended" },
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
              type: "notify",
              params: [
                "Captain, our ship is in wreckage condition and we don't have enough money to repair it.",
                "You've lost the game.",
              ],
            },
          ],
          target: "#ended",
        },
        // Check if the player is bankrupt
        {
          guard: ({ context }) => isBankrupt(context),
          actions: [
            assign({ voyageEnd: "bankrupt" }),
            {
              type: "notify",
              params: ["Captain, we have gone bankrupt! The creditors have seized our assets."],
            },
          ],
          target: "#ended",
        },
        // If the player is in overdraft and his debt is greater than -$1000, sell his fleet
        {
          guard: ({ context }) => context.balance < -FLEET_SALE_DEBT_LIMIT && context.guardFleet.ships > 0,
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
              type: "notify",
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
              type: "notify",
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
            { type: "notify", params: ["We're no longer in overdraft, Captain!"] },
          ],
        },
      ],
    },
    atSea: {
      id: "atSea",
      initial: "checkPirates",
      states: {
        checkPirates: {
          always: [
            {
              guard: ({ context }) => context.rng.chance(calculatePirateEncounterChance(context)),
              target: "encounter",
            },
            { target: "checkEvent" },
          ],
        },
        encounter: {
          on: {
            PIRATES_ENCOUNTER_FIGHT: {
              actions: { type: "applyResult", params: ({ context }) => fightPirates(context) },
              target: "arriving",
            },
            PIRATES_ENCOUNTER_FLEE: {
              actions: { type: "applyResult", params: ({ context }) => fleePirates(context) },
              target: "arriving",
            },
            PIRATES_ENCOUNTER_OFFER: {
              actions: { type: "applyResult", params: ({ context }) => bribePirates(context) },
              target: "arriving",
            },
          },
        },
        checkEvent: {
          always: [{ guard: ({ context }) => !!context.currentEvent, target: "event" }, { target: "arriving" }],
        },
        event: {
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
              entry: [
                { type: "notify", params: ({ context }) => [currentEventOf(context)!.message] },
                { type: "applyResult", params: ({ context }) => currentEventOf(context)!.effect!(context) },
              ],
              always: [{ target: "#checkCargoOffer" }],
            },
            multi_choice: {
              on: {
                RESOLVE_EVENT: {
                  actions: {
                    type: "applyResult",
                    params: ({ context, event }) =>
                      currentEventOf(context)!
                        .choices?.find((choice) => choice.key === event.choice)
                        ?.effect(context) ?? result([]),
                  },
                  target: "#checkCargoOffer",
                },
              },
            },
          },
        },
        checkCargoOffer: {
          id: "checkCargoOffer",
          always: [
            { guard: ({ context }) => !context.cargoOffer, target: "arriving" },
            {
              guard: ({ context }) =>
                needsCaptainsChoice(context.ship.hold, context.cargoOffer!, context.prices[context.currentPort]),
              target: "cargoOffer",
            },
            { actions: { type: "takeCargoOffer", params: { overload: false } }, target: "arriving" },
          ],
        },
        cargoOffer: {
          on: {
            TAKE_CARGO: {
              actions: { type: "takeCargoOffer", params: ({ event }) => ({ overload: event.overload }) },
              target: "arriving",
            },
          },
        },
        arriving: {
          id: "arriving",
          entry: enqueueActions(({ context, enqueue }) => {
            const destination = context.destination ?? context.currentPort;
            const travelTime = context.destination ? calculateTravelTime(context.destination, context) : 1;
            const { context: arrived, notices } = advanceDays(
              context,
              Math.max(1, travelTime + (context.delayDays ?? 0)),
            );
            enqueue.assign({
              ...arrived,
              currentPort: destination,
              destination: undefined,
              currentEvent: undefined,
              delayDays: undefined,
            });
            enqueue({ type: "notify", params: [`Arrived at ${destination}`, ...notices] });
          }),
          always: [{ target: "#inPort" }],
        },
      },
    },
    ended: {
      id: "ended",
      on: {
        RESTART_GAME: { target: "idle" },
      },
    },
  },
});
