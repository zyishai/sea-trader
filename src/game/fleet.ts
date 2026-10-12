import { MAX_SHIP_DEFENSE } from "./catalog/vessels.js";
import { Context } from "./context.js";
import { shipStats } from "./ship.js";
import { isInOverdraft } from "./treasury.js";

export type FleetQuality = "Basic" | "Trained" | "Elite";

export const MAX_GUARD_SHIPS = 10;
export const MAX_GUARD_QUALITY = 3;
export const BASE_GUARD_COST = 800;
export const DAMAGE_PER_GUARD_SHIP = 75; // Damage needed to destroy one guard ship
export const MAINTENANCE_COST_PER_SHIP = 25;

export const calculateGuardEffectiveness = (context: Context) => {
  const baseEffectiveness = 0.4;
  const qualityBonus = (context.guardFleet.quality - 1) * 0.1;
  const fleetBonus = Math.min(0.3, context.guardFleet.ships * 0.05);
  const defenseBonus = Math.min(0.2, shipStats(context.ship).defense / MAX_SHIP_DEFENSE);
  const overdraftPenalty = isInOverdraft(context) ? 0.5 : 1;
  return Math.min(0.9, (baseEffectiveness + qualityBonus + fleetBonus + defenseBonus) * overdraftPenalty);
};

export const calculateGuardShipCost = (context: Pick<Context, "guardFleet">, amount: number) => {
  const basePrice = BASE_GUARD_COST;
  const fleetSizeFactor = 1 + context.guardFleet.ships * 0.15;
  const qualityFactor = 1 + (context.guardFleet.quality - 1) * 0.25;
  return Math.round(basePrice * fleetSizeFactor * qualityFactor * amount);
};

export const calculateFleetUpgradeCost = (context: Context) => {
  const baseUpgradeCost = BASE_GUARD_COST * 2;
  const fleetSizeFactor = 1 + context.guardFleet.ships * 0.2;
  const qualityFactor = 1 + context.guardFleet.quality * 0.5;
  return Math.round(baseUpgradeCost * fleetSizeFactor * qualityFactor);
};

export const calculateDailyMaintenanceCost = (context: Pick<Context, "guardFleet">) =>
  context.guardFleet.ships * MAINTENANCE_COST_PER_SHIP * context.guardFleet.quality;

export const distributeFleetDamage = (damage: number, context: Context) => {
  if (context.guardFleet.ships === 0) {
    const defenseFactor = Math.max(0.5, 1 - shipStats(context.ship).defense / MAX_SHIP_DEFENSE);
    const reducedDamage = Math.round(damage * defenseFactor);
    return {
      shipDamage: reducedDamage,
      fleetDamage: 0,
      shipsLost: 0,
      remainingFleetDamage: 0,
    };
  }

  // Guards take 70% of the damage, ship takes 30%
  const defenseFactor = Math.max(0.6, 1 - shipStats(context.ship).defense / MAX_SHIP_DEFENSE);
  const fleetDamage = Math.floor(damage * 0.7);
  const shipDamage = Math.ceil(damage * 0.3 * defenseFactor);

  // Calculate total accumulated damage
  const totalFleetDamage = context.guardFleet.damage + fleetDamage;

  // Calculate how many ships are lost
  const shipsLost = Math.floor(totalFleetDamage / DAMAGE_PER_GUARD_SHIP);

  // Calculate remaining damage after ships are lost
  const remainingFleetDamage = totalFleetDamage % DAMAGE_PER_GUARD_SHIP;

  return { shipDamage, fleetDamage, shipsLost, remainingFleetDamage };
};

export const getFleetQuality = (quality: number): FleetQuality => {
  switch (quality) {
    case 1:
      return "Basic";
    case 2:
      return "Trained";
    case 3:
      return "Elite";
    default:
      return "Basic";
  }
};
