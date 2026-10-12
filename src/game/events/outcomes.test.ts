import { describe, expect, it } from "vitest";
import { Context, initialContext } from "../context.js";
import { applyOutcomes, outcome } from "./outcomes.js";
import { amountOf, emptyHold, load } from "../hold.js";
import { seededRng } from "../rng.js";

const voyage = (patch: (context: Context) => Partial<Context> = () => ({})): Context => {
  const context = initialContext(seededRng(5));
  return { ...context, ...patch(context) };
};

describe("Outcomes", () => {
  it("damages the Ship, never below zero", () => {
    const { context, report } = applyOutcomes(
      voyage((c) => ({ ship: { ...c.ship, health: 20 } })),
      [outcome.damageShip(35)],
    );

    expect(context.ship.health).toBe(0);
    expect(report).toEqual(["Our ship took 20 damage."]);
  });

  it("lets the Guard Fleet absorb battle damage", () => {
    const { context, report } = applyOutcomes(
      voyage((c) => ({ guardFleet: { ...c.guardFleet, ships: 2, damage: 70 } })),
      [outcome.battleDamage(20)],
    );

    expect(context.guardFleet.ships).toBe(1);
    expect(context.ship.health).toBeLessThan(100);
    expect(report).toContain("We lost 1 guard ship.");
  });

  it("reports money gained and paid", () => {
    const { context, report } = applyOutcomes(
      voyage(() => ({ balance: 1000 })),
      [outcome.money(1200), outcome.money(-300)],
    );

    expect(context.balance).toBe(1900);
    expect(report).toEqual(["We gained $1200.", "We paid $300."]);
  });

  it("reports only the reputation actually gained", () => {
    expect(
      applyOutcomes(
        voyage(() => ({ reputation: 98 })),
        [outcome.reputation(10)],
      ).report,
    ).toEqual(["Gained 2 reputation."]);
    expect(
      applyOutcomes(
        voyage(() => ({ reputation: 100 })),
        [outcome.reputation(10)],
      ).report,
    ).toEqual([]);
    expect(
      applyOutcomes(
        voyage(() => ({ reputation: 2 })),
        [outcome.reputation(-3)],
      ).context.reputation,
    ).toBe(0);
  });

  it("adds a Delay to the passage", () => {
    const { context, report } = applyOutcomes(voyage(), [outcome.delay(2)]);

    expect(context.delayDays).toBe(2);
    expect(report).toEqual(["We lost 2 days."]);
    expect(applyOutcomes(voyage(), [outcome.delay(-1)]).report).toEqual(["We saved a day."]);
  });

  it("loses cargo from the Hold", () => {
    const hold = load(load(emptyHold(100), "Tea", 40).hold, "Wheat", 10).hold;
    const lose = (outcomes: Parameters<typeof applyOutcomes>[1]) =>
      applyOutcomes(
        voyage((c) => ({ ship: { ...c.ship, hold } })),
        outcomes,
      );

    expect(lose([outcome.loseCargo("Tea", 50)]).report).toEqual(["Lost 40 picul of Tea."]);

    const share = lose([outcome.loseCargoShare(0.25)]);
    expect(amountOf(share.context.ship.hold, "Tea")).toBe(30);
    expect(share.report).toEqual(["Lost 10 picul of Tea.", "Lost 3 picul of Wheat."]);
  });

  it("offers cargo, adds capacity and shifts prices", () => {
    const before = voyage((c) => ({ prices: { ...c.prices, Shanghai: { ...c.prices.Shanghai, Tea: 100 } } }));
    const { context, report } = applyOutcomes(before, [
      outcome.offerCargo({ Tea: 20 }),
      outcome.addCapacity(12),
      outcome.priceChange("Shanghai", "Tea", 1.3),
    ]);

    expect(context.cargoOffer).toEqual({ Tea: 20 });
    expect(context.ship.hold.capacity).toBe(before.ship.hold.capacity + 12);
    expect(context.prices.Shanghai.Tea).toBe(130);
    expect(report).toEqual(["The hold can now carry 12 more picul."]);
  });

  it("leaves the original game state unchanged", () => {
    const before = voyage();
    applyOutcomes(before, [outcome.damageShip(10), outcome.priceChange("Shanghai", "Tea", 2)]);

    expect(before.ship.health).toBe(100);
  });
});
