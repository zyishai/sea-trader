import { Context } from "../context.js";
import { EventResult, outcome, result } from "./outcomes.js";
import { calculateGuardEffectiveness, distributeFleetDamage } from "../fleet.js";
import { goodsAboard, overloadLevel, value } from "../hold.js";
import { cashOnHand } from "../treasury.js";

const loot = (context: Context) => {
  const cargoValue = value(context.ship.hold, context.prices[context.currentPort]);
  const factor = Math.floor(100_000 / Math.max(1, context.balance + cargoValue));
  return Math.min(15_000, Math.max(500, Math.floor(context.rng.int(801, 1300) * factor)));
};

export const fightPirates = (context: Context): EventResult => {
  if (context.rng.chance(calculateGuardEffectiveness(context))) {
    const damage = context.rng.chance(0.7) ? context.rng.int(5, 14) : 0;
    return result(
      ["We drove them off, Captain!", "We found treasure in their hold."],
      outcome.battleDamage(damage),
      outcome.money(loot(context)),
      outcome.reputation(5),
    );
  }

  const damage = context.rng.int(15, 34);
  const { shipsLost } = distributeFleetDamage(damage, context);
  const stolen = context.rng.int(5, 14);
  const [good] = context.rng.pick(goodsAboard(context.ship.hold)) ?? [];
  return result(
    ["Despite our guard fleet's efforts, the pirates prevailed!"],
    outcome.battleDamage(damage),
    ...(good ? [outcome.loseCargo(good, stolen)] : []),
    outcome.reputation(-(shipsLost * 2 + 1)),
  );
};

export const fleePirates = (context: Context): EventResult => {
  const fleeChance = Math.max(
    0.1,
    0.6 + calculateGuardEffectiveness(context) * 0.2 - overloadLevel(context.ship.hold) * 0.4,
  );

  if (!context.rng.chance(fleeChance)) {
    return result(
      ["We failed to escape from the pirates, Captain!"],
      outcome.battleDamage(context.rng.int(10, 24)),
      outcome.reputation(-2),
    );
  }

  return context.rng.chance(0.3)
    ? result(["Captain, we maneuvered away from the pirates without a scratch!"])
    : result(
        ["We escaped from the pirates, Captain, but not unscathed."],
        outcome.battleDamage(context.rng.int(3, 10)),
      );
};

export const bribePirates = (context: Context): EventResult => {
  const cash = cashOnHand(context);
  const bribe = Math.round(cash * 0.15);

  if (cash > 0 && context.rng.int(0, cash) >= bribe) {
    return result(["We paid the pirates to let us pass freely."], outcome.money(-bribe), outcome.reputation(-1));
  }

  return result(
    [
      cash > 0 ? "We couldn't afford what the pirates demanded!" : "We have nothing to offer them, Captain!",
      "They attacked us in anger!",
    ],
    outcome.battleDamage(context.rng.int(15, 39)),
    outcome.reputation(-5),
  );
};
