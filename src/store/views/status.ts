import { isInOverdraft } from "../treasury.js";
import { Context } from "../types.js";

export const statusView = (context: Context) => ({
  day: context.day,
  port: context.currentPort,
  shipHealth: context.ship.health,
  balance: context.balance,
  inOverdraft: isInOverdraft(context),
  reputation: context.reputation,
});
