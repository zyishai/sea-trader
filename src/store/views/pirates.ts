import { Context } from "../context.js";
import { calculateGuardEffectiveness } from "../fleet.js";

export const piratesView = (context: Context) => ({
  shipHealth: context.ship.health,
  fleetSize: context.guardFleet.ships,
  combatAdvantage: Math.round(calculateGuardEffectiveness(context) * 100),
});
