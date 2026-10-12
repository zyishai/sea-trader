import { describe, expect, it } from "vitest";
import { createGame, gamePhase, GamePlugin, issueCommand, seededRng, voyageResult } from "./index.js";

const recorder = () => {
  const log = { notices: 0, refused: [] as string[], phases: [] as string[] };
  const plugin: GamePlugin = {
    onNotice: () => log.notices++,
    onCommandResult: ({ command, accepted }) => !accepted && log.refused.push(command),
    onPhaseChanged: (phase) => log.phases.push(phase),
  };
  return { log, plugin };
};

describe("the game on its own", () => {
  it("plays a whole Voyage headless, through plugins only", () => {
    const { log, plugin } = recorder();
    const game = createGame({ rng: seededRng(11), plugins: [plugin] });
    const phase = () => gamePhase(game.getSnapshot());
    const resolveSea = () => {
      while (phase() !== "inPort" && phase() !== "ended") {
        if (phase() === "encounter") game.send({ type: "PIRATES_ENCOUNTER_FLEE" });
        if (phase() === "event") game.send({ type: "RESOLVE_EVENT", choice: "C" });
        if (phase() === "cargoOffer") game.send({ type: "TAKE_CARGO", overload: false });
      }
    };

    game.send({ type: "START_GAME" });
    game.send({ type: "PURCHASE", good: "Wheat", quantity: 5 });
    for (let trip = 0; trip < 60 && phase() === "inPort" && game.getSnapshot().context.day < 200; trip++) {
      const port = game.getSnapshot().context.currentPort;
      game.send({ type: "TRAVEL_TO", destination: port === "Hong Kong" ? "Manila" : "Hong Kong" });
      resolveSea();
    }
    if (phase() === "inPort") game.send({ type: "RETIRE" });

    expect(phase()).toBe("ended");
    expect(voyageResult(game.getSnapshot().context).end).toBeDefined();
    expect(log.phases.at(-1)).toBe("ended");
    expect(log.notices).toBeGreaterThan(0);
    expect(log.refused).toEqual([]);
  });
});

describe("issuing a command", () => {
  it("returns whether the game accepted it, and why not", () => {
    const game = createGame({ rng: seededRng(3) });
    game.send({ type: "START_GAME" });

    expect(issueCommand(game, { type: "PURCHASE", good: "Wheat", quantity: 1 })).toEqual({
      command: "PURCHASE",
      accepted: true,
      reason: undefined,
    });
    expect(issueCommand(game, { type: "SELL", good: "Opium", quantity: 1 })).toMatchObject({
      accepted: false,
      reason: "notEnoughCargo",
    });
  });
});
