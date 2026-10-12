import { describe, expect, it } from "vitest";
import { initialContext } from "../context.js";
import { seededRng } from "../rng.js";
import { piratesView } from "./pirates.js";

describe("pirates view", () => {
  it("shows the Ship's health, the Guard Fleet and the fight advantage", () => {
    const context = initialContext(seededRng(1));

    expect(
      piratesView({ ...context, guardFleet: { ...context.guardFleet, ships: 2, quality: 1 }, balance: 100 }),
    ).toEqual({ shipHealth: 100, fleetSize: 2, combatAdvantage: 56 });
  });
});
