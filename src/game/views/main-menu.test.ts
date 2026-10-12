import { describe, expect, it } from "vitest";
import { initialContext } from "../context.js";
import { seededRng } from "../rng.js";
import { mainMenuView } from "./main-menu.js";

describe("main menu view", () => {
  it("offers bankruptcy only in Overdraft or when Stranded", () => {
    const context = initialContext(seededRng(1));

    expect(mainMenuView({ ...context, balance: 1500 })).toMatchObject({ canDeclareBankruptcy: false, stranded: false });
    expect(mainMenuView({ ...context, balance: -1 }).canDeclareBankruptcy).toBe(true);
    expect(mainMenuView({ ...context, balance: 0 })).toMatchObject({ canDeclareBankruptcy: true, stranded: true });
  });
});
