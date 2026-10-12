import { describe, expect, it } from "vitest";
import { goodCatalog, goods, seasonalPriceFactor } from "./goods.js";

describe("Goods catalog", () => {
  it("lists every Good in catalog order", () => {
    expect(goods).toEqual(["Wheat", "Tea", "Spices", "Opium", "Porcelain"]);
    expect(goodCatalog.Opium.basePrice).toBe(2000);
  });

  it("gives each Good's seasonal price factor, 1 when the Season doesn't affect it", () => {
    expect(seasonalPriceFactor("Tea", "Winter")).toBe(1.45);
    expect(seasonalPriceFactor("Wheat", "Winter")).toBe(1);
  });
});
