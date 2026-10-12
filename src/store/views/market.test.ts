import { describe, expect, it } from "vitest";
import { initialContext } from "../defaults.js";
import { emptyHold, load } from "../hold.js";
import { seededRng } from "../rng.js";
import { Context } from "../types.js";
import { marketView } from "./market.js";

const hongKongPrices = { Wheat: 100, Tea: 400, Spices: 800, Opium: 2000, Porcelain: 300 };

const marketContext = (patch: Partial<Context> = {}): Context => {
  const context = initialContext(seededRng(1));
  return { ...context, currentPort: "Hong Kong", prices: { ...context.prices, "Hong Kong": hongKongPrices }, ...patch };
};

const goodIn = (view: ReturnType<typeof marketView>, good: string) => view.goods.find((row) => row.good === good)!;

const withHold = (context: Context, hold: Context["ship"]["hold"]) => ({ ...context, ship: { ...context.ship, hold } });

describe("market view", () => {
  it("limits what we can buy by money", () => {
    const tea = goodIn(marketView(marketContext({ balance: 1000 })), "Tea");

    expect(tea.price).toBe(400);
    expect(tea.maxBuy).toEqual({ withinCapacity: 2, withOverload: 2 });
  });

  it("limits what we can buy by cargo space, with and without overloading", () => {
    const context = withHold(marketContext({ balance: 1_000_000 }), load(emptyHold(100), "Wheat", 90).hold);

    expect(goodIn(marketView(context), "Tea").maxBuy).toEqual({ withinCapacity: 10, withOverload: 30 });
  });

  it("offers nothing to buy while in Overdraft", () => {
    const wheat = goodIn(marketView(marketContext({ balance: -500, inOverdraft: true })), "Wheat");

    expect(wheat.maxBuy).toEqual({ withinCapacity: 0, withOverload: 0 });
  });

  it("never offers to buy a negative amount", () => {
    expect(goodIn(marketView(marketContext({ balance: -500 })), "Wheat").maxBuy.withinCapacity).toBe(0);
  });

  it("sells at most what is in the Hold, and summarises the Hold", () => {
    const view = marketView(withHold(marketContext(), load(emptyHold(100), "Spices", 12).hold));

    expect(goodIn(view, "Spices").inHold).toBe(12);
    expect(goodIn(view, "Spices").maxSell).toBe(12);
    expect(view.hold).toEqual({ used: 12, capacity: 100, free: 88 });
  });
});
