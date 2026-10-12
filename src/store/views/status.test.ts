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
});
