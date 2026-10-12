import { ShipStat } from "../catalog/vessels.js";
import { Context } from "../context.js";
import {
  MAX_GUARD_QUALITY,
  MAX_GUARD_SHIPS,
  calculateDailyMaintenanceCost,
  calculateFleetUpgradeCost,
  calculateGuardShipCost,
  getFleetQuality,
} from "../fleet.js";
import { spaceUsed } from "../hold.js";
import { getShipStatus, nextUpgrade, shipStats } from "../ship.js";
import { calculateCostForRepair } from "../shipyard.js";
import { canAfford, cashOnHand, wouldStrand } from "../treasury.js";

export type Unavailable = "notEnoughMoney" | "maxedOut" | "perfectCondition" | "noFleet" | "fleetFull";

const firstReason = (...checks: [boolean, Unavailable][]) => checks.find(([applies]) => applies)?.[1];

const upgradeOffer = (context: Context, stat: ShipStat) => {
  const upgrade = nextUpgrade(context.ship, stat);
  return {
    type: stat,
    next: upgrade?.value,
    cost: upgrade?.cost,
    unavailable: firstReason(
      [!upgrade, "maxedOut"],
      [!!upgrade && !canAfford(context, upgrade.cost), "notEnoughMoney"],
    ),
    strands: !!upgrade && wouldStrand(context, upgrade.cost),
  };
};

export const shipyardView = (context: Context) => {
  const { ship, guardFleet } = context;
  const hasFleet = guardFleet.ships > 0;
  const hireCost = calculateGuardShipCost(context, 1);
  const fleetUpgradeCost = calculateFleetUpgradeCost(context);

  return {
    ship: {
      spaceUsed: spaceUsed(ship.hold),
      capacity: ship.hold.capacity,
      speed: shipStats(ship).speed,
      health: ship.health,
      condition: getShipStatus(ship.health),
    },
    repair: {
      fullCost: calculateCostForRepair(100 - ship.health, context),
      unavailable: firstReason([ship.health >= 100, "perfectCondition"], [cashOnHand(context) === 0, "notEnoughMoney"]),
    },
    upgrades: (["capacity", "speed", "defense"] as const).map((type) => upgradeOffer(context, type)),
    fleet: {
      ships: guardFleet.ships,
      quality: hasFleet ? { level: guardFleet.quality, name: getFleetQuality(guardFleet.quality) } : undefined,
      dailyUpkeep: calculateDailyMaintenanceCost(context),
      hire: {
        costPerShip: hireCost,
        maxShips: MAX_GUARD_SHIPS - guardFleet.ships,
        unavailable: firstReason(
          [guardFleet.ships >= MAX_GUARD_SHIPS, "fleetFull"],
          [!canAfford(context, hireCost), "notEnoughMoney"],
        ),
      },
      upgrade: {
        cost: fleetUpgradeCost,
        unavailable: firstReason(
          [!hasFleet, "noFleet"],
          [guardFleet.quality >= MAX_GUARD_QUALITY, "maxedOut"],
          [!canAfford(context, fleetUpgradeCost), "notEnoughMoney"],
        ),
      },
      dismiss: { unavailable: firstReason([!hasFleet, "noFleet"]) },
    },
  };
};
