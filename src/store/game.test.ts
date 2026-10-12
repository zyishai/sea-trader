import { describe, expect, it } from "vitest";
import { createActor, type StateValue } from "xstate";
import { gameMachine } from "./game.js";
import { amountOf, emptyHold, isOverloaded, load } from "./hold.js";
import { createRng, Rng, seededRng } from "./rng.js";
import { Context, EventTemplate } from "./types.js";
import { cargoOfferView } from "./views/cargo-offer.js";

const startGame = (rng: Rng = seededRng(42)) => {
  const actor = createActor(gameMachine, { input: { rng } }).start();
  actor.send({ type: "START_GAME" });
  return actor;
};

const gameAt = (value: StateValue, patch: (context: Context) => Partial<Context>, rng: Rng = seededRng(42)) => {
  const context = startGame(rng).getSnapshot().context;
  const snapshot = gameMachine.resolveState({ value, context: { ...context, ...patch(context) } });
  return createActor(gameMachine, { snapshot, input: { rng } }).start();
};

const atMarket = (patch: (context: Context) => Partial<Context> = () => ({})) =>
  gameAt({ gameScreen: "at_market" }, patch);

const messagesOf = (actor: ReturnType<typeof startGame>) => actor.getSnapshot().context.messages.flat();

describe("game start", () => {
  it("opens with the same prices and season for the same seed", () => {
    const first = startGame(seededRng(42)).getSnapshot().context;
    const second = startGame(seededRng(42)).getSnapshot().context;

    expect(second.prices).toEqual(first.prices);
    expect(second.currentSeason).toBe(first.currentSeason);
  });

  it("opens with different prices for a different seed", () => {
    expect(startGame(seededRng(7)).getSnapshot().context.prices).not.toEqual(
      startGame(seededRng(42)).getSnapshot().context.prices,
    );
  });
});

describe("market", () => {
  it("loads bought goods into the Hold and pays for them", () => {
    const game = atMarket();
    const before = game.getSnapshot().context;
    const price = before.prices[before.currentPort].Wheat;

    game.send({ type: "PURCHASE", good: "Wheat", quantity: 5 });

    const after = game.getSnapshot().context;
    expect(amountOf(after.ship.hold, "Wheat")).toBe(5);
    expect(after.balance).toBe(before.balance - 5 * price);
    expect(amountOf(before.ship.hold, "Wheat")).toBe(0);
  });

  it("warns once when a purchase overloads the Ship", () => {
    const game = atMarket((context) => ({ balance: 1_000_000, ship: { ...context.ship, hold: emptyHold(100) } }));

    game.send({ type: "PURCHASE", good: "Wheat", quantity: 105 });
    game.send({ type: "PURCHASE", good: "Wheat", quantity: 5 });

    expect(isOverloaded(game.getSnapshot().context.ship.hold)).toBe(true);
    expect(messagesOf(game).filter((message) => message === "Our ship is overloaded, Captain!")).toHaveLength(1);
  });

  it("refuses a purchase that doesn't fit inside the overload margin", () => {
    const game = atMarket((context) => ({ balance: 1_000_000, ship: { ...context.ship, hold: emptyHold(100) } }));

    game.send({ type: "PURCHASE", good: "Wheat", quantity: 121 });

    expect(amountOf(game.getSnapshot().context.ship.hold, "Wheat")).toBe(0);
    expect(game.getSnapshot().context.balance).toBe(1_000_000);
  });

  it("sells goods from the Hold, but not more than is aboard", () => {
    const game = atMarket((context) => ({ ship: { ...context.ship, hold: load(emptyHold(100), "Tea", 10).hold } }));
    const before = game.getSnapshot().context;
    const price = before.prices[before.currentPort].Tea;

    game.send({ type: "SELL", good: "Tea", quantity: 11 });
    expect(amountOf(game.getSnapshot().context.ship.hold, "Tea")).toBe(10);

    game.send({ type: "SELL", good: "Tea", quantity: 4 });
    expect(amountOf(game.getSnapshot().context.ship.hold, "Tea")).toBe(6);
    expect(game.getSnapshot().context.balance).toBe(before.balance + 4 * price);
  });
});

describe("pirate encounter", () => {
  it("pirates steal from the goods actually aboard when the fight is lost", () => {
    const losingRolls = createRng(() => 0.95);
    const game = gameAt(
      { gameScreen: { at_port: "piratesEncountered" } },
      (context) => ({ ship: { ...context.ship, hold: load(emptyHold(100), "Tea", 40).hold } }),
      losingRolls,
    );

    game.send({ type: "PIRATES_ENCOUNTER_FIGHT" });

    expect(amountOf(game.getSnapshot().context.ship.hold, "Tea")).toBe(26);
    expect(messagesOf(game)).toContain("The pirates stole 14 Tea from our hold.");
  });
});

describe("cargo offer", () => {
  const findingEvent = (cargoOffer: Context["cargoOffer"]): EventTemplate => ({
    type: "discovery",
    severity: "minor",
    baseChance: 0,
    message: "Something floats by.",
    choices: [{ label: "Haul it in", key: "H", effect: () => ({ cargoOffer }) }],
  });

  const findGoods = (cargoOffer: Context["cargoOffer"], hold = emptyHold(100)) => {
    const game = gameAt({ gameScreen: { at_port: { eventOccurred: "multi_choice" } } }, (context) => ({
      ship: { ...context.ship, hold },
      currentEvent: findingEvent(cargoOffer),
      destination: "Shanghai",
      prices: {
        ...context.prices,
        [context.currentPort]: { Wheat: 100, Tea: 400, Spices: 800, Opium: 2000, Porcelain: 300 },
      },
    }));
    game.send({ type: "RESOLVE_EVENT", choice: "H" });
    return game;
  };

  it("loads an offer that fits without asking", () => {
    const game = findGoods({ Tea: 30, Wheat: 20 });

    const { hold } = game.getSnapshot().context.ship;
    expect(amountOf(hold, "Tea")).toBe(30);
    expect(amountOf(hold, "Wheat")).toBe(20);
    expect(game.getSnapshot().matches({ gameScreen: { at_port: "cargoOffer" } })).toBe(false);
  });

  it("asks the Captain when the offer doesn't fit", () => {
    const game = findGoods({ Wheat: 60, Opium: 70 });

    expect(game.getSnapshot().matches({ gameScreen: { at_port: "cargoOffer" } })).toBe(true);
    expect(cargoOfferView(game.getSnapshot().context)).toEqual({
      offered: 130,
      takeAll: { picul: 120, overloads: true },
      takeFitting: { picul: 100 },
    });
  });

  it("takes only what fits, most valuable goods first", () => {
    const game = findGoods({ Wheat: 60, Opium: 70 });

    game.send({ type: "TAKE_CARGO", overload: false });

    const { hold } = game.getSnapshot().context.ship;
    expect(amountOf(hold, "Opium")).toBe(70);
    expect(amountOf(hold, "Wheat")).toBe(30);
    expect(isOverloaded(hold)).toBe(false);
  });

  it("takes as much as the Ship can carry, overloading it", () => {
    const game = findGoods({ Wheat: 60, Opium: 70 });

    game.send({ type: "TAKE_CARGO", overload: true });

    const { hold } = game.getSnapshot().context.ship;
    expect(amountOf(hold, "Opium")).toBe(70);
    expect(amountOf(hold, "Wheat")).toBe(50);
    expect(isOverloaded(hold)).toBe(true);
    expect(game.getSnapshot().context.cargoOffer).toBeUndefined();
  });

  it("doesn't ask when there is no room either way", () => {
    const game = findGoods({ Tea: 10 }, load(emptyHold(100), "Wheat", 120).hold);

    expect(game.getSnapshot().matches({ gameScreen: { at_port: "cargoOffer" } })).toBe(false);
    expect(amountOf(game.getSnapshot().context.ship.hold, "Tea")).toBe(0);
  });
});
