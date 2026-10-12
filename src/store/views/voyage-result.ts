import { netWorth } from "../treasury.js";
import { shipStats } from "../ship.js";
import { Context } from "../types.js";
import { calculateScore } from "../utils.js";

export const RANKS = [
  { title: "Admiral", minScore: 30_000 },
  { title: "Captain", minScore: 5000 },
  { title: "Mate", minScore: -Infinity },
] as const;

export const voyageResult = (context: Context) => {
  const end = context.voyageEnd;
  const score = end === "retired" ? calculateScore(context) : 0;

  return {
    end,
    day: context.day,
    extendedGame: context.extendedGame,
    netWorth: netWorth(context),
    capacity: context.ship.hold.capacity,
    speed: shipStats(context.ship).speed,
    score,
    rank: end === "retired" ? RANKS.find(({ minScore }) => score >= minScore)?.title : undefined,
  };
};
