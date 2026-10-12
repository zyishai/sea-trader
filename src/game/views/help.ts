import { goods } from "../catalog/goods.js";
import { ports } from "../catalog/ports.js";
import { GOAL_DAYS } from "../clock.js";
import { BASE_BALANCE } from "../treasury.js";

export const helpView = () => ({
  portCount: ports.length,
  goods,
  startingBalance: BASE_BALANCE,
  voyageLength: GOAL_DAYS,
});
