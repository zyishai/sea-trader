import { describe, expect, it } from "vitest";
import { Context, initialContext } from "../context.js";
import { seededRng } from "../rng.js";
import { shipyardView } from "./shipyard.js";

const shipyardContext = (patch: (context: Context) => Partial<Context> = () => ({})): Context => {
  const context = initialContext(seededRng(1));
  return { ...context, ...patch(context) };
};

const upgrade = (context: Context, type: string) =>
  shipyardView(context).upgrades.find((offer) => offer.type === type)!;

describe("shipyard view", () => {
  it("offers the next upgrade of each kind with its cost", () => {
    expect(
      upgrade(
        shipyardContext(() => ({ balance: 5000 })),
        "speed",
      ),
    ).toEqual({
      type: "speed",
      next: 10,
      cost: 1500,
      unavailable: undefined,
      strands: false,
    });
  });

  it("explains an upgrade the Captain can't afford", () => {
    expect(
      upgrade(
        shipyardContext(() => ({ balance: 1000 })),
        "capacity",
      ).unavailable,
    ).toBe("notEnoughMoney");
  });

  it("marks a fully upgraded ship as maxed out", () => {
    const context = shipyardContext((context) => ({
      ship: { ...context.ship, upgrades: { ...context.ship.upgrades, speed: 6 } },
    }));

    expect(upgrade(context, "speed")).toMatchObject({ next: undefined, unavailable: "maxedOut" });
  });

  it("offers a repair only when the ship is damaged and there is money to spend", () => {
    const damaged = (balance: number) =>
      shipyardContext((context) => ({ balance, ship: { ...context.ship, health: 80 } }));

    expect(shipyardView(shipyardContext()).repair.unavailable).toBe("perfectCondition");
    expect(shipyardView(damaged(-5)).repair.unavailable).toBe("notEnoughMoney");
    expect(shipyardView(damaged(500)).repair).toMatchObject({ fullCost: 740, unavailable: undefined });
  });

  it("explains which Guard Fleet actions are open", () => {
    const noFleet = shipyardView(shipyardContext(() => ({ balance: 5000 }))).fleet;
    expect(noFleet.hire).toEqual({ costPerShip: 800, maxShips: 10, unavailable: undefined });
    expect(noFleet.upgrade.unavailable).toBe("noFleet");
    expect(noFleet.dismiss.unavailable).toBe("noFleet");

    const fullFleet = shipyardView(
      shipyardContext((context) => ({ balance: 5000, guardFleet: { ...context.guardFleet, ships: 10, quality: 3 } })),
    ).fleet;
    expect(fullFleet.hire.unavailable).toBe("fleetFull");
    expect(fullFleet.upgrade.unavailable).toBe("maxedOut");
    expect(fullFleet.dailyUpkeep).toBe(750);
  });

  it("flags an upgrade that would leave the Captain Stranded", () => {
    expect(
      upgrade(
        shipyardContext(() => ({ balance: 1500 })),
        "speed",
      ).strands,
    ).toBe(true);
    expect(
      upgrade(
        shipyardContext(() => ({ balance: 1500 })),
        "defense",
      ).strands,
    ).toBe(false);
  });
});
