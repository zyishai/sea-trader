import { Context } from "../types.js";
import { calculateGuardEffectiveness } from "../utils.js";

export const piratesView = (context: Context) => ({
  shipHealth: context.ship.health,
  fleetSize: context.guardFleet.ships,
  combatAdvantage: Math.round(calculateGuardEffectiveness(context) * 100),
});
