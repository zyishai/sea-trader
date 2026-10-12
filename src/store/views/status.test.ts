import { describe, expect, it } from "vitest";
import { initialContext } from "../defaults.js";
import { seededRng } from "../rng.js";
import { statusView } from "./status.js";

describe("status view", () => {
  it("shows the Balance and whether the Captain is in Overdraft", () => {
    const context = initialContext(seededRng(1));

    expect(statusView({ ...context, balance: 1500 })).toMatchObject({ balance: 1500, inOverdraft: false });
    expect(statusView({ ...context, balance: -20 })).toMatchObject({ balance: -20, inOverdraft: true });
  });

  it("shows the day of the Voyage and the Season", () => {
    const context = { ...initialContext(seededRng(1)), startingSeason: "Autumn" as const, day: 34 };

    expect(statusView(context)).toMatchObject({ day: 34, voyageLength: 200, season: "Winter" });
    expect(statusView({ ...context, extendedGame: true }).voyageLength).toBeUndefined();
  });
});
