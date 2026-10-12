import { CargoOffer } from "../cargo-offer.js";
import { Good } from "../catalog/goods.js";
import { Port } from "../catalog/ports.js";
import { Context } from "../context.js";
import { distributeFleetDamage } from "../fleet.js";
import { displayMonetaryValue } from "../format.js";
import { unload, unloadWhere } from "../hold.js";
import { addCapacityBonus } from "../ship.js";

export type Outcome =
  | { kind: "damageShip"; amount: number }
  | { kind: "battleDamage"; amount: number }
  | { kind: "money"; amount: number }
  | { kind: "reputation"; amount: number }
  | { kind: "delay"; days: number }
  | { kind: "loseCargo"; good: Good; picul: number }
  | { kind: "loseCargoShare"; share: number }
  | { kind: "offerCargo"; offer: CargoOffer }
  | { kind: "addCapacity"; picul: number }
  | { kind: "priceChange"; port: Port; good: Good; factor: number };

export type EventResult = { story: string[]; outcomes: Outcome[] };

export const result = (story: string[], ...outcomes: Outcome[]): EventResult => ({ story, outcomes });

export const outcome = {
  damageShip: (amount: number): Outcome => ({ kind: "damageShip", amount }),
  battleDamage: (amount: number): Outcome => ({ kind: "battleDamage", amount }),
  money: (amount: number): Outcome => ({ kind: "money", amount }),
  reputation: (amount: number): Outcome => ({ kind: "reputation", amount }),
  delay: (days: number): Outcome => ({ kind: "delay", days }),
  loseCargo: (good: Good, picul: number): Outcome => ({ kind: "loseCargo", good, picul }),
  loseCargoShare: (share: number): Outcome => ({ kind: "loseCargoShare", share }),
  offerCargo: (offer: CargoOffer): Outcome => ({ kind: "offerCargo", offer }),
  addCapacity: (picul: number): Outcome => ({ kind: "addCapacity", picul }),
  priceChange: (port: Port, good: Good, factor: number): Outcome => ({ kind: "priceChange", port, good, factor }),
};

type Applied = { context: Context; report: string[] };

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;
const damageLine = (damage: number) => (damage > 0 ? [`Our ship took ${damage} damage.`] : []);
const cargoLines = (unloaded: Partial<Record<Good, number>>) =>
  (Object.entries(unloaded) as [Good, number][]).map(([good, picul]) => `Lost ${picul} picul of ${good}.`);

const applyOne = (context: Context, outcome: Outcome): Applied => {
  switch (outcome.kind) {
    case "damageShip": {
      const health = Math.max(0, context.ship.health - outcome.amount);
      return {
        context: { ...context, ship: { ...context.ship, health } },
        report: damageLine(context.ship.health - health),
      };
    }
    case "battleDamage": {
      const { shipDamage, shipsLost, remainingFleetDamage } = distributeFleetDamage(outcome.amount, context);
      const health = Math.max(0, context.ship.health - shipDamage);
      const lost = Math.min(shipsLost, context.guardFleet.ships);
      return {
        context: {
          ...context,
          ship: { ...context.ship, health },
          guardFleet: { ...context.guardFleet, ships: context.guardFleet.ships - lost, damage: remainingFleetDamage },
        },
        report: [
          ...damageLine(context.ship.health - health),
          ...(lost > 0 ? [`We lost ${plural(lost, "guard ship")}.`] : []),
        ],
      };
    }
    case "money":
      return {
        context: { ...context, balance: context.balance + outcome.amount },
        report:
          outcome.amount === 0
            ? []
            : [`We ${outcome.amount > 0 ? "gained" : "paid"} ${displayMonetaryValue(Math.abs(outcome.amount))}.`],
      };
    case "reputation": {
      const reputation = Math.min(100, Math.max(0, context.reputation + outcome.amount));
      const change = reputation - context.reputation;
      return {
        context: { ...context, reputation },
        report: change === 0 ? [] : [`${change > 0 ? "Gained" : "Lost"} ${Math.abs(change)} reputation.`],
      };
    }
    case "delay":
      return {
        context: { ...context, delayDays: (context.delayDays ?? 0) + outcome.days },
        report:
          outcome.days === 0
            ? []
            : outcome.days > 0
              ? [`We lost ${plural(outcome.days, "day")}.`]
              : [`We saved ${outcome.days === -1 ? "a day" : plural(-outcome.days, "day")}.`],
      };
    case "loseCargo": {
      const { hold, unloaded } = unload(context.ship.hold, outcome.good, outcome.picul);
      return {
        context: { ...context, ship: { ...context.ship, hold } },
        report: cargoLines(unloaded > 0 ? { [outcome.good]: unloaded } : {}),
      };
    }
    case "loseCargoShare": {
      const { hold, unloaded } = unloadWhere(context.ship.hold, (_, picul) => Math.ceil(picul * outcome.share));
      return { context: { ...context, ship: { ...context.ship, hold } }, report: cargoLines(unloaded) };
    }
    case "offerCargo": {
      const cargoOffer = { ...context.cargoOffer };
      (Object.entries(outcome.offer) as [Good, number][]).forEach(([good, picul]) => {
        cargoOffer[good] = (cargoOffer[good] ?? 0) + picul;
      });
      return { context: { ...context, cargoOffer }, report: [] };
    }
    case "addCapacity":
      return {
        context: {
          ...context,
          ship: addCapacityBonus(context.ship, outcome.picul),
        },
        report: [`The hold can now carry ${outcome.picul} more picul.`],
      };
    case "priceChange": {
      const portPrices = context.prices[outcome.port];
      return {
        context: {
          ...context,
          prices: {
            ...context.prices,
            [outcome.port]: { ...portPrices, [outcome.good]: Math.round(portPrices[outcome.good] * outcome.factor) },
          },
        },
        report: [],
      };
    }
  }
};

export const applyEventResult = (context: Context, { story, outcomes }: EventResult) => {
  const applied = applyOutcomes(context, outcomes);
  return { context: applied.context, notice: [...story, ...applied.report] };
};

export const applyOutcomes = (context: Context, outcomes: Outcome[]): Applied =>
  outcomes.reduce<Applied>(
    (applied, next) => {
      const { context, report } = applyOne(applied.context, next);
      return { context, report: [...applied.report, ...report] };
    },
    { context, report: [] },
  );
