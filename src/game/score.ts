import { GOAL_DAYS } from "./clock.js";
import { Context } from "./context.js";
import { shipStats } from "./ship.js";
import { netWorth } from "./treasury.js";

export const EXTENDED_GAME_PENALTY = 0.01;

export const calculateScore = (context: Context) => {
  let score = Math.round(netWorth(context) / 50);

  // Add a logarithmic bonus for ship capacity
  // This provides diminishing returns for larger capacities
  const capacityBonus = Math.floor(1000 * Math.log10(context.ship.hold.capacity + 1));
  score += capacityBonus;

  // Add a logarithmic bonus for ship speed
  // This, too, provides diminishing returns for larger speeds
  const speedBonus = Math.floor(500 * Math.log2((shipStats(context.ship).speed - 7) * 2));
  score += speedBonus;

  // Calculate damage penalty
  // The penalty increases with ship size and is more severe for lower health
  const maxDamage = context.ship.hold.capacity * 20;
  const actualDamage = maxDamage * (1 - context.ship.health / 100);
  const damagePenalty = Math.floor(actualDamage);
  score -= damagePenalty;

  if (context.extendedGame) {
    const extraDays = context.day - GOAL_DAYS;
    const penaltyFactor = 1 - extraDays * EXTENDED_GAME_PENALTY;
    return Math.floor(score * penaltyFactor);
  }

  return score;
};
