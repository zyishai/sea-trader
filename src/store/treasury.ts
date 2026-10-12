import { OVERDRAFT_TRADING_LIMIT } from "./constants.js";
import { Context } from "./types.js";

export const spendingPower = (context: Context) =>
  context.balance + (context.inOverdraft ? OVERDRAFT_TRADING_LIMIT : 0);
