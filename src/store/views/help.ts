import { goods } from "../catalog/goods.js";
import { ports } from "../catalog/ports.js";
import { BASE_BALANCE, GOAL_DAYS } from "../constants.js";

export const helpView = () => ({
  portCount: ports.length,
  goods,
  startingBalance: BASE_BALANCE,
  voyageLength: GOAL_DAYS,
});
