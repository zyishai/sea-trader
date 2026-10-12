import { currentSeason, lastDay } from "../clock.js";
import { Context } from "../context.js";
import { isInOverdraft } from "../treasury.js";

export const statusView = (context: Context) => ({
  day: context.day,
  voyageLength: context.extendedGame ? undefined : lastDay(context),
  season: currentSeason(context),
  port: context.currentPort,
  shipHealth: context.ship.health,
  balance: context.balance,
  inOverdraft: isInOverdraft(context),
  reputation: context.reputation,
});
