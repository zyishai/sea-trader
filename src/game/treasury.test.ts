import { describe, expect, it } from "vitest";
import { accrueInterest, canAfford, dailyUpkeep, fleetSaleValue, isStranded } from "./treasury.js";
import { Context, initialContext } from "./context.js";
import { emptyHold, load } from "./hold.js";
import { seededRng } from "./rng.js";

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

  describe("Stranded", () => {
    const captain = (patch: (context: Context) => Partial<Context>) => {
      const context = initialContext(seededRng(1));
      return { ...context, ...patch(context) };
    };
    const cheapest = (context: Context) => Math.min(...Object.values(context.prices).flatMap(Object.values));

    it("is Stranded with an empty Hold, no Guard Fleet and no money for a single picul", () => {
      expect(isStranded(captain(() => ({ balance: 0 })))).toBe(true);
      expect(isStranded(captain((context) => ({ balance: cheapest(context) - 1 })))).toBe(true);
    });

    it("isn't Stranded while it can still buy the cheapest Good somewhere", () => {
      expect(isStranded(captain((context) => ({ balance: cheapest(context) })))).toBe(false);
    });

    it("isn't Stranded with cargo to sell or a Guard Fleet", () => {
      expect(
        isStranded(
          captain((context) => ({ balance: 0, ship: { ...context.ship, hold: load(emptyHold(100), "Tea", 1).hold } })),
        ),
      ).toBe(false);
      expect(isStranded(captain((context) => ({ balance: 0, guardFleet: { ...context.guardFleet, ships: 1 } })))).toBe(
        false,
      );
    });
  });
});
