import { ShipStat, VesselClass, vesselClassRecord } from "./catalog/vessels.js";
import { Hold, emptyHold, withCapacity } from "./hold.js";

export type ShipStatus = "Perfect" | "Minor damages" | "Major damages" | "Wreckage";

export const getShipStatus = (health: number): ShipStatus =>
  health >= 90 ? "Perfect" : health >= 70 ? "Minor damages" : health >= 40 ? "Major damages" : "Wreckage";

export type Ship = {
  vesselClass: VesselClass;
  upgrades: Record<ShipStat, number>;
  capacityBonus: number;
  health: number;
  hold: Hold;
};

const statOf = (ship: Ship, stat: ShipStat) => {
  const { base, upgrades } = vesselClassRecord(ship.vesselClass);
  const level = ship.upgrades[stat];
  return level > 0 ? upgrades[stat][level - 1]!.value : base[stat];
};

const withStatsApplied = (ship: Ship): Ship => ({ ...ship, hold: withCapacity(ship.hold, shipStats(ship).capacity) });

export const newShip = (vesselClass: VesselClass): Ship => {
  const ship = { vesselClass, upgrades: { speed: 0, defense: 0, capacity: 0 }, capacityBonus: 0, health: 100 };
  return withStatsApplied({ ...ship, hold: emptyHold(0) });
};

export const shipStats = (ship: Ship) => ({
  speed: statOf(ship, "speed"),
  defense: statOf(ship, "defense"),
  capacity: statOf(ship, "capacity") + ship.capacityBonus,
});

export const nextUpgrade = (ship: Ship, stat: ShipStat) =>
  vesselClassRecord(ship.vesselClass).upgrades[stat][ship.upgrades[stat]];

export const upgradeShip = (ship: Ship, stat: ShipStat) =>
  nextUpgrade(ship, stat)
    ? withStatsApplied({ ...ship, upgrades: { ...ship.upgrades, [stat]: ship.upgrades[stat] + 1 } })
    : ship;

export const addCapacityBonus = (ship: Ship, picul: number) =>
  withStatsApplied({ ...ship, capacityBonus: ship.capacityBonus + picul });
