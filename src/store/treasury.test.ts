import { describe, expect, it } from "vitest";
import { canAfford } from "./treasury.js";

describe("Treasury", () => {
  it("pays only from a positive Balance", () => {
    expect(canAfford({ balance: 500 }, 500)).toBe(true);
    expect(canAfford({ balance: 500 }, 501)).toBe(false);
    expect(canAfford({ balance: -10 }, 1)).toBe(false);
  });
});
