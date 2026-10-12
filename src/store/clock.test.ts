import { describe, expect, it } from "vitest";
import { advanceDays, canRetire, currentSeason, daysUntilNextSeason } from "./clock.js";
import { initialContext } from "./defaults.js";
import { seededRng } from "./rng.js";
import { Context } from "./types.js";

const voyage = (patch: (context: Context) => Partial<Context> = () => ({})): Context => {
  const context = initialContext(seededRng(3));
  return { ...context, ...patch(context) };
};

const withFleet = (context: Context, ships: number) => ({ guardFleet: { ...context.guardFleet, ships, quality: 1 } });

describe("Voyage Clock", () => {
  it("moves to the next Season every 30 days", () => {
    const context = voyage(() => ({ startingSeason: "Winter" }));

    expect(currentSeason({ ...context, day: 30 })).toBe("Winter");
    expect(currentSeason({ ...context, day: 31 })).toBe("Spring");
    expect(currentSeason({ ...context, day: 121 })).toBe("Winter");
    expect(daysUntilNextSeason(25)).toBe(6);
  });

  it("charges Upkeep and interest for each day that passes", () => {
    const paying = advanceDays(
      voyage((context) => ({ balance: 1000, ...withFleet(context, 2) })),
      3,
    );
    expect(paying.context).toMatchObject({ day: 4, balance: 850 });

    const inDebt = advanceDays(
      voyage((context) => ({ balance: -1000, ...withFleet(context, 2) })),
      3,
    );
    expect(inDebt.context.balance).toBe(-1093);
  });

  it("updates prices on each Price Update day, announcing it once", () => {
    const before = voyage(() => ({ day: 1 }));
    const { context, notices } = advanceDays(before, 30);

    expect(context.prices).not.toEqual(before.prices);
    expect(context.marketIntelligence.analysis.priceHistory["Hong Kong"].Tea).toHaveLength(2);
    expect(notices.filter((notice) => notice === "Prices have updated!")).toHaveLength(1);
  });

  it("announces a Season change", () => {
    const { notices } = advanceDays(
      voyage(() => ({ startingSeason: "Spring", day: 25 })),
      10,
    );

    expect(notices).toContain("Season changes to Summer.");
  });

  it("never passes day 200 in a classic Voyage", () => {
    expect(
      advanceDays(
        voyage(() => ({ day: 195 })),
        10,
      ).context.day,
    ).toBe(200);
    expect(
      advanceDays(
        voyage(() => ({ day: 195, extendedGame: true })),
        10,
      ).context.day,
    ).toBe(205);
  });

  it("lets the Captain retire from day 200", () => {
    expect(canRetire(voyage(() => ({ day: 199 })))).toBe(false);
    expect(canRetire(voyage(() => ({ day: 200 })))).toBe(true);
  });

  it("leaves the original game state unchanged", () => {
    const before = voyage(() => ({ day: 10 }));
    const history = before.marketIntelligence.analysis.priceHistory["Hong Kong"].Tea;

    advanceDays(before, 10);

    expect(before.day).toBe(10);
    expect(history).toHaveLength(0);
  });
});
