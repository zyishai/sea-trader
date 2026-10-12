import { describe, expect, it } from "vitest";
import { MAX_SHIP_DEFENSE, vesselClassRecord } from "./catalog/vessels.js";
import { addCapacityBonus, newShip, nextUpgrade, shipStats, upgradeShip } from "./ship.js";

describe("Ship", () => {
  it("starts with its Vessel Class's base stats", () => {
    const ship = newShip("Coastal Junk");

    expect(shipStats(ship)).toEqual({ speed: 8, defense: 5, capacity: 120 });
    expect(ship.hold.capacity).toBe(120);
  });

  it("climbs each upgrade ladder one step at a time", () => {
    const ship = upgradeShip(newShip("Coastal Junk"), "speed");

    expect(shipStats(ship).speed).toBe(10);
    expect(nextUpgrade(ship, "speed")).toEqual({ value: 12, cost: 2500 });
  });

  it("runs out of upgrades at the top of a ladder", () => {
    const topped = Array.from({ length: 6 }).reduce<ReturnType<typeof newShip>>(
      (ship) => upgradeShip(ship, "speed"),
      newShip("Coastal Junk"),
    );

    expect(shipStats(topped).speed).toBe(20);
    expect(nextUpgrade(topped, "speed")).toBeUndefined();
  });

  it("keeps a capacity bonus on top of the ladder instead of skipping a tier", () => {
    const withBonus = addCapacityBonus(newShip("Coastal Junk"), 12);
    expect(shipStats(withBonus).capacity).toBe(132);
    expect(nextUpgrade(withBonus, "capacity")?.value).toBe(180);

    const upgraded = upgradeShip(withBonus, "capacity");
    expect(shipStats(upgraded).capacity).toBe(192);
    expect(upgraded.hold.capacity).toBe(192);
    expect(nextUpgrade(upgraded, "capacity")?.value).toBe(240);
  });

  it("defines the Brig and Clipper as stubs without upgrades", () => {
    expect(vesselClassRecord("Brig").base).toEqual({ speed: 10, defense: 20, capacity: 240 });
    expect(vesselClassRecord("Clipper").upgrades.speed).toEqual([]);
    expect(MAX_SHIP_DEFENSE).toBe(80);
  });
});
