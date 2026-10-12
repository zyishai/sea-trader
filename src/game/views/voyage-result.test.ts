import { describe, expect, it } from "vitest";
import { seededRng } from "../rng.js";
import { initialContext } from "../context.js";
import { voyageResult } from "./voyage-result.js";

describe("voyage result", () => {
  it("ranks a small fortune as Mate", () => {
    const context = { ...initialContext(seededRng(1)), balance: 0, voyageEnd: "retired" as const };

    expect(voyageResult(context)).toMatchObject({ netWorth: 0, score: 2582, rank: "Mate" });
  });

  it("gives no rank to a voyage that didn't end in retirement", () => {
    const context = { ...initialContext(seededRng(1)), voyageEnd: "shipwrecked" as const };

    expect(voyageResult(context)).toMatchObject({ score: 0, rank: undefined });
  });
});
