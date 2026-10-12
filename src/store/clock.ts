import { GOAL_DAYS, PRICE_UPDATE_INTERVAL, SEASON_LENGTH, seasons } from "./constants.js";
import { accrueInterest, dailyUpkeep } from "./treasury.js";
import { Context } from "./types.js";
import { generatePrices, updatePriceHistory, updateTrends } from "./utils.js";

const seasonOn = (startingSeason: Context["startingSeason"], day: number) =>
  seasons[(seasons.indexOf(startingSeason) + Math.floor((day - 1) / SEASON_LENGTH)) % seasons.length]!;
const isPriceUpdateDay = (day: number) => day > 1 && (day - 1) % PRICE_UPDATE_INTERVAL === 0;
const isSeasonChangeDay = (day: number) => day > 1 && (day - 1) % SEASON_LENGTH === 0;
export const lastDay = (context: Pick<Context, "extendedGame">) => (context.extendedGame ? Infinity : GOAL_DAYS);

export const currentSeason = (context: Pick<Context, "startingSeason" | "day">) =>
  seasonOn(context.startingSeason, context.day);
export const daysUntilNextSeason = (day: number) => SEASON_LENGTH - ((day - 1) % SEASON_LENGTH);
export const canRetire = (context: Pick<Context, "day">) => context.day >= GOAL_DAYS;

const passDay = (context: Context): Context => {
  const day = context.day + 1;
  const balance = accrueInterest(context.balance - dailyUpkeep(context), 1);

  if (!isPriceUpdateDay(day)) return { ...context, day, balance };

  const trends = updateTrends(context.trends, context.rng);
  const prices = generatePrices(trends, seasonOn(context.startingSeason, day), context.rng);
  return {
    ...context,
    day,
    balance,
    trends,
    prices,
    marketIntelligence: updatePriceHistory(
      context.marketIntelligence.priceHistory,
      prices,
      day,
      seasonOn(context.startingSeason, day),
    ),
  };
};

export const advanceDays = (context: Context, days: number) => {
  const target = Math.min(context.day + days, lastDay(context));
  const notices = new Set<string>();
  let current = context;

  while (current.day < target) {
    current = passDay(current);
    if (isPriceUpdateDay(current.day)) notices.add("Prices have updated!");
    if (isSeasonChangeDay(current.day)) notices.add(`Season changes to ${currentSeason(current)}.`);
  }

  return { context: current, notices: [...notices] };
};
