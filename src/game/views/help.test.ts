import { describe, expect, it } from "vitest";
import { helpView } from "./help.js";

describe("help view", () => {
  it("takes every number the help screen shows from the game's rules", () => {
    expect(helpView()).toEqual({
      portCount: 5,
      goods: ["Wheat", "Tea", "Spices", "Opium", "Porcelain"],
      startingBalance: 1500,
      voyageLength: 200,
      priceUpdateDays: 14,
      seasonDays: 30,
      overloadPercent: 20,
      interestPercent: 3,
      maxDailyInterest: 50,
      bankruptcyAt: -4000,
      extendedPenaltyPercent: 1,
      ranks: [
        { title: "Admiral", minScore: 30_000 },
        { title: "Captain", minScore: 5000 },
        { title: "Mate", minScore: -Infinity },
      ],
    });
  });
});
