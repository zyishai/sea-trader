import { goods } from "../catalog/goods.js";
import { ports } from "../catalog/ports.js";
import { GOAL_DAYS, PRICE_UPDATE_INTERVAL, SEASON_LENGTH } from "../clock.js";
import { OVERLOAD_BUFFER } from "../hold.js";
import { EXTENDED_GAME_PENALTY } from "../score.js";
import { BANKRUPTCY_THRESHOLD, BASE_BALANCE, BASE_INTEREST_RATE, MAX_DAILY_OVERDRAFT } from "../treasury.js";
import { RANKS } from "./voyage-result.js";

const percent = (fraction: number) => Math.round(fraction * 100);

export const helpView = () => ({
  portCount: ports.length,
  goods,
  startingBalance: BASE_BALANCE,
  voyageLength: GOAL_DAYS,
  priceUpdateDays: PRICE_UPDATE_INTERVAL,
  seasonDays: SEASON_LENGTH,
  overloadPercent: percent(OVERLOAD_BUFFER),
  interestPercent: percent(BASE_INTEREST_RATE),
  maxDailyInterest: MAX_DAILY_OVERDRAFT,
  bankruptcyAt: BANKRUPTCY_THRESHOLD,
  extendedPenaltyPercent: percent(EXTENDED_GAME_PENALTY),
  ranks: RANKS,
});
