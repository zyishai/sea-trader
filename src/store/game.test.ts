import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { gameMachine } from "./game.js";
import { seededRng } from "./rng.js";

const startGame = (seed: number) => {
  const actor = createActor(gameMachine, { input: { rng: seededRng(seed) } }).start();
  actor.send({ type: "START_GAME" });
  return actor;
};

describe("game start", () => {
  it("opens with the same prices and season for the same seed", () => {
    const first = startGame(42).getSnapshot().context;
    const second = startGame(42).getSnapshot().context;

    expect(second.prices).toEqual(first.prices);
    expect(second.currentSeason).toBe(first.currentSeason);
  });

  it("opens with different prices for a different seed", () => {
    expect(startGame(7).getSnapshot().context.prices).not.toEqual(startGame(42).getSnapshot().context.prices);
  });
});
