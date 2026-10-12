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
    guardFleet: { ...context.guardFleet, ships: 2, quality: 1 },
    ...patch(context),
  };
};

const option = (context: Context, port: string) => travelOptions(context).find((choice) => choice.port === port)!;

describe("travel options", () => {
  it("offers every Port except the current one", () => {
    expect(travelOptions(atPort()).map(({ port }) => port)).toEqual(["Shanghai", "Nagasaki", "Singapore", "Manila"]);
  });

  it("lists each destination with its days at sea, Upkeep and arrival day", () => {
    const context = atPort();
    const days = calculateTravelTime("Shanghai", context);

    expect(option(context, "Shanghai")).toEqual({
      port: "Shanghai",
      days,
      upkeep: 50 * days,
      arrivalDay: 1 + days,
      endsVoyage: false,
    });
  });

  it("charges no Upkeep while in Overdraft", () => {
    expect(
      option(
        atPort(() => ({ balance: -10 })),
        "Shanghai",
      ).upkeep,
    ).toBe(0);
  });

  it("flags a passage that runs past the last day of a classic Voyage", () => {
    expect(
      option(
        atPort(() => ({ day: 199 })),
        "Manila",
      ),
    ).toMatchObject({ arrivalDay: 200, endsVoyage: true });
  });
});
