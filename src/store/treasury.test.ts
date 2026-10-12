import { describe, expect, it } from "vitest";
import { accrueInterest, canAfford, dailyUpkeep, fleetSaleValue } from "./treasury.js";

const fleet = (ships: number) => ({ ships, quality: 1, damage: 0 });

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

  it("charges a daily Upkeep for each guard ship", () => {
    expect(dailyUpkeep({ balance: 1000, guardFleet: fleet(2) })).toBe(50);
  });

  it("forgives Upkeep while in Overdraft", () => {
    expect(dailyUpkeep({ balance: -1, guardFleet: fleet(2) })).toBe(0);
  });

  it("sells the Guard Fleet for half of what hiring each ship would cost now", () => {
    expect(fleetSaleValue({ guardFleet: fleet(2) })).toBe(1040);
  });
});
