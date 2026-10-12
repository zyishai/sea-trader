import { describe, expect, it } from "vitest";
import { STARTING_PORT, portCatalog, ports } from "./ports.js";
import { distanceBetween } from "./sea-routes.js";

describe("Ports catalog", () => {
  it("lists every Port, starting from Hong Kong", () => {
    expect(ports).toEqual(["Hong Kong", "Shanghai", "Nagasaki", "Singapore", "Manila"]);
    expect(STARTING_PORT).toBe("Hong Kong");
    expect(portCatalog.Shanghai.produces).toEqual(["Tea", "Opium"]);
  });

  it("gives the same Sea Route distance in both directions", () => {
    expect(distanceBetween("Hong Kong", "Shanghai")).toBe(819);
    expect(distanceBetween("Shanghai", "Hong Kong")).toBe(819);
    expect(distanceBetween("Manila", "Manila")).toBe(0);
  });

  it("connects every pair of Ports by a Sea Route", () => {
    for (const from of ports) {
      for (const to of ports) {
        expect(distanceBetween(from, to)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
