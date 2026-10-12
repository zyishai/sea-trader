import { ShipStat, vesselClassRecord } from "./catalog/vessels.js";
import { Context } from "./context.js";
import { nextUpgrade } from "./ship.js";
import { canAfford } from "./treasury.js";

export const DAMAGE_REPAIR_COST_PER_UNIT = 37;

export const calculateCostForRepair = (damageToRepair: number, context: Context) => {
  const capacityFactor = Math.max(
    1,
    Math.sqrt(context.ship.hold.capacity / vesselClassRecord(context.ship.vesselClass).base.capacity),
  );
  return Math.floor(damageToRepair * DAMAGE_REPAIR_COST_PER_UNIT * capacityFactor); // How much it'll cost to repair `damageToRepair` damage.
};

export const calculateRepairForCost = (price: number, context: Context) => {
  const capacityFactor = Math.max(
    1,
    Math.sqrt(context.ship.hold.capacity / vesselClassRecord(context.ship.vesselClass).base.capacity),
  );
  return Math.floor(price / (DAMAGE_REPAIR_COST_PER_UNIT * capacityFactor)); // How much damage can be repaired with `price`.
};

export const canAffordUpgrade = (stat: ShipStat, context: Context) => {
  const upgrade = nextUpgrade(context.ship, stat);
  return !!upgrade && canAfford(context, upgrade.cost);
};
