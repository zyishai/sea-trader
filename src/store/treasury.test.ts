import { describe, expect, it } from "vitest";
import { accrueInterest, canAfford, fleetSaleValue, upkeepDue } from "./treasury.js";

const fleet = (ships: number, lastMaintenanceDay = 1) => ({ ships, quality: 1, lastMaintenanceDay, damage: 0 });

describe("Treasury", () => {
  it("pays only from a positive Balance", () => {
    expect(canAfford({ balance: 500 }, 500)).toBe(true);
    expect(canAfford({ balance: 500 }, 501)).toBe(false);
    expect(canAfford({ balance: -10 }, 1)).toBe(false);
  });

  it("charges 3% interest a day on an Overdraft, compounding", () => {
    expect(accrueInterest(-1000, 3)).toBe(-1093);
  });

  it("caps interest at $50 a day", () => {
    expect(accrueInterest(-2000, 2)).toBe(-2100);
  });

  it("charges no interest on a positive Balance", () => {
    expect(accrueInterest(500, 5)).toBe(500);
  });

  it("bills Upkeep for each day since it was last paid", () => {
    expect(upkeepDue({ balance: 1000, day: 4, guardFleet: fleet(2) })).toBe(150);
  });

  it("forgives Upkeep while in Overdraft", () => {
    expect(upkeepDue({ balance: -1, day: 4, guardFleet: fleet(2) })).toBe(0);
  });

  it("sells the Guard Fleet for half of what hiring each ship would cost now", () => {
    expect(fleetSaleValue({ guardFleet: fleet(2) })).toBe(1040);
  });
});
