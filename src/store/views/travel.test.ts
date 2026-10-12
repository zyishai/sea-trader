import { describe, expect, it } from "vitest";
import { initialContext } from "../defaults.js";
import { seededRng } from "../rng.js";
import { Context } from "../types.js";
import { calculateTravelTime } from "../utils.js";
import { travelOptions } from "./travel.js";

const atPort = (patch: (context: Context) => Partial<Context> = () => ({})): Context => {
  const context = initialContext(seededRng(1));
  return {
    ...context,
    availablePorts: ["Shanghai", "Manila"],
    guardFleet: { ...context.guardFleet, ships: 2, quality: 1 },
    ...patch(context),
  };
};

describe("travel options", () => {
  it("lists each destination with its days at sea, Upkeep and arrival day", () => {
    const context = atPort();
    const days = calculateTravelTime("Shanghai", context);

    expect(travelOptions(context)[0]).toEqual({
      port: "Shanghai",
      days,
      upkeep: 50 * days,
      arrivalDay: 1 + days,
      endsVoyage: false,
    });
  });

  it("charges no Upkeep while in Overdraft", () => {
    expect(travelOptions(atPort(() => ({ balance: -10 })))[0]!.upkeep).toBe(0);
  });

  it("flags a passage that runs past the last day of a classic Voyage", () => {
    expect(travelOptions(atPort(() => ({ day: 199 })))[1]).toMatchObject({ arrivalDay: 200, endsVoyage: true });
  });
});
