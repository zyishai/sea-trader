import { describe, expect, it } from "vitest";
import { helpView } from "./help.js";

describe("help view", () => {
  it("describes the world and the Voyage from the catalog", () => {
    expect(helpView()).toEqual({
      portCount: 5,
      goods: ["Wheat", "Tea", "Spices", "Opium", "Porcelain"],
      startingBalance: 1500,
      voyageLength: 200,
    });
  });
});
