import { assign, emit, enqueueActions, setup } from "xstate";

// Lets tsc name xstate's guard types when emitting declarations for the machines
import { type Guard } from "xstate/guards";
import { needsCaptainsChoice, takeCargoOffer } from "./cargo-offer.js";
import { GOAL_DAYS, advanceDays } from "./clock.js";
import { CommandResult, GameCommand, accept } from "./commands/index.js";
import { OVERLOADED_NOTICE, purchase, sell } from "./commands/market.js";
import { dismissGuards, hireGuards, repair, upgradeGuards, upgradeShip } from "./commands/shipyard.js";
import { declareBankruptcy, retire, setSailRejection } from "./commands/voyage.js";
import { GameEmitted } from "./plugin.js";
import { Context, initialContext } from "./context.js";
import { checkForEvent, eventById } from "./events/chance.js";
import { EventResult, applyEventResult, result } from "./events/outcomes.js";
import { bribePirates, fightPirates, fleePirates } from "./events/pirates.js";
import { displayMonetaryValue, joinWords } from "./format.js";
import { isOverloaded } from "./hold.js";
import { Rng } from "./rng.js";
import { getShipStatus } from "./ship.js";
import { calculateRepairForCost } from "./shipyard.js";
import { calculatePirateEncounterChance, calculateTravelTime } from "./travel.js";
import {
  BANKRUPTCY_THRESHOLD,
  MAX_DAILY_OVERDRAFT,
  FLEET_SALE_DEBT_LIMIT,
  fleetSaleValue,
  isBankrupt,
  isInOverdraft,
  netWorth,
} from "./treasury.js";

const currentEventOf = (context: Context) => (context.currentEvent ? eventById(context.currentEvent) : undefined);

export const gameMachine = setup({
  types: {
    context: {} as Context,
    events: {} as GameCommand,
    emitted: {} as GameEmitted,
    input: {} as { rng: Rng },
  },
  actions: {
    runCommand: enqueueActions(({ context, event, enqueue }, commandResult: CommandResult) => {
      const notices = commandResult.notices.filter((lines) => lines.length > 0);
      const next = commandResult.accepted ? commandResult.context : context;
      enqueue.assign({ ...next, notices: [...context.notices, ...notices] });
      notices.forEach((lines) => enqueue.emit({ type: "notice", lines }));
      enqueue.emit({
        type: "commandResult",
        command: event.type,
        accepted: commandResult.accepted,
        reason: commandResult.accepted ? undefined : commandResult.reason,
      });
    }),
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
      entry: emit({ type: "phaseChanged", phase: "idle" }),
      on: {
        START_GAME: {
          target: "inPort",
          actions: assign(({ context, event }) => initialContext(context.rng, event.settings)),
        },
      },
    },
    inPort: {
      id: "inPort",
      entry: emit({ type: "phaseChanged", phase: "inPort" }),
      on: {
        PURCHASE: { actions: { type: "runCommand", params: ({ context, event }) => purchase(context, event) } },
        SELL: { actions: { type: "runCommand", params: ({ context, event }) => sell(context, event) } },
        REPAIR: { actions: { type: "runCommand", params: ({ context, event }) => repair(context, event) } },
        UPGRADE_SHIP: { actions: { type: "runCommand", params: ({ context, event }) => upgradeShip(context, event) } },
        HIRE_PERMANENT_GUARDS: {
          actions: { type: "runCommand", params: ({ context, event }) => hireGuards(context, event) },
        },
        UPGRADE_GUARDS: { actions: { type: "runCommand", params: ({ context }) => upgradeGuards(context) } },
        DISMISS_GUARDS: {
          actions: { type: "runCommand", params: ({ context, event }) => dismissGuards(context, event) },
        },
        TRAVEL_TO: [
          {
            guard: ({ context }) => !!setSailRejection(context),
            actions: { type: "runCommand", params: ({ context }) => setSailRejection(context)! },
          },
          {
            target: "#atSea",
            actions: [
              assign(({ event, context }) => ({
                destination: event.destination,
                currentEvent: checkForEvent(context)?.id,
              })),
              { type: "runCommand", params: ({ context }) => accept(context) },
            ],
          },
        ],
        RETIRE: [
          {
            guard: ({ context }) => retire(context).accepted,
            target: "#ended",
            actions: { type: "runCommand", params: ({ context }) => retire(context) },
          },
          { actions: { type: "runCommand", params: ({ context }) => retire(context) } },
        ],
        DECLARE_BANKRUPTCY: [
          {
            guard: ({ context }) => declareBankruptcy(context).accepted,
            target: "#ended",
            actions: { type: "runCommand", params: ({ context }) => declareBankruptcy(context) },
          },
          { actions: { type: "runCommand", params: ({ context }) => declareBankruptcy(context) } },
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
          entry: emit({ type: "phaseChanged", phase: "encounter" }),
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
              entry: emit({ type: "phaseChanged", phase: "event" }),
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
          entry: emit({ type: "phaseChanged", phase: "cargoOffer" }),
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
      entry: emit({ type: "phaseChanged", phase: "ended" }),
      on: {
        RESTART_GAME: { target: "idle" },
      },
    },
  },
});
