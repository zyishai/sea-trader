import { describe, expect, it } from "vitest";
import { createActor, type StateValue } from "xstate";
import { gameMachine } from "./game.js";
import { amountOf, emptyHold, isOverloaded, load } from "./hold.js";
import { createRng, Rng, seededRng } from "./rng.js";
import { Context } from "./types.js";
import { eventView } from "./views/event.js";
import { cargoOfferView } from "./views/cargo-offer.js";
import { voyageResult } from "./views/voyage-result.js";
import { calculateTravelTime } from "./utils.js";

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

  it("doesn't buy on credit while in Overdraft", () => {
    const game = atMarket(() => ({ balance: -10, announcedOverdraft: true }));

    game.send({ type: "PURCHASE", good: "Wheat", quantity: 1 });

    expect(amountOf(game.getSnapshot().context.ship.hold, "Wheat")).toBe(0);
    expect(game.getSnapshot().context.balance).toBe(-10);
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
  const hongKongPrices = { Wheat: 100, Tea: 400, Spices: 800, Opium: 2000, Porcelain: 300 };
  const luckyRolls = createRng(() => 0.1);

  const exploreIsland = (hold = emptyHold(100)) => {
    const game = gameAt(
      { gameScreen: { at_port: { eventOccurred: "multi_choice" } } },
      (context) => ({ ship: { ...context.ship, hold }, currentEvent: "uncharted-island", destination: "Shanghai" }),
      luckyRolls,
    );
    game.send({ type: "RESOLVE_EVENT", choice: "E" });
    return game;
  };

  const offered = (cargoOffer: Context["cargoOffer"]) =>
    gameAt({ gameScreen: { at_port: "cargoOffer" } }, (context) => ({
      ship: { ...context.ship, hold: emptyHold(100) },
      cargoOffer,
      destination: "Shanghai",
      prices: { ...context.prices, [context.currentPort]: hongKongPrices },
    }));

  const isAsking = (game: ReturnType<typeof startGame>) =>
    game.getSnapshot().matches({ gameScreen: { at_port: "cargoOffer" } });

  it("loads found goods that fit without asking", () => {
    const game = exploreIsland();

    expect(amountOf(game.getSnapshot().context.ship.hold, "Wheat")).toBe(20);
    expect(isAsking(game)).toBe(false);
  });

  it("asks the Captain when found goods don't fit", () => {
    expect(isAsking(exploreIsland(load(emptyHold(100), "Tea", 90).hold))).toBe(true);
  });

  it("doesn't ask when there is no room either way", () => {
    const game = exploreIsland(load(emptyHold(100), "Tea", 120).hold);

    expect(isAsking(game)).toBe(false);
    expect(amountOf(game.getSnapshot().context.ship.hold, "Wheat")).toBe(0);
  });

  it("shows both choices with their amounts", () => {
    expect(cargoOfferView(offered({ Wheat: 60, Opium: 70 }).getSnapshot().context)).toEqual({
      offered: 130,
      takeAll: { picul: 120, overloads: true },
      takeFitting: { picul: 100 },
    });
  });

  it("takes only what fits, most valuable goods first", () => {
    const game = offered({ Wheat: 60, Opium: 70 });

    game.send({ type: "TAKE_CARGO", overload: false });

    const { hold } = game.getSnapshot().context.ship;
    expect(amountOf(hold, "Opium")).toBe(70);
    expect(amountOf(hold, "Wheat")).toBe(30);
    expect(isOverloaded(hold)).toBe(false);
  });

  it("takes as much as the Ship can carry, overloading it", () => {
    const game = offered({ Wheat: 60, Opium: 70 });

    game.send({ type: "TAKE_CARGO", overload: true });

    const { hold } = game.getSnapshot().context.ship;
    expect(amountOf(hold, "Opium")).toBe(70);
    expect(amountOf(hold, "Wheat")).toBe(50);
    expect(isOverloaded(hold)).toBe(true);
    expect(game.getSnapshot().context.cargoOffer).toBeUndefined();
  });
});

describe("money", () => {
  const atMenu = (patch: (context: Context) => Partial<Context>, rng?: Rng) => {
    const game = gameAt({ gameScreen: "menu" }, patch, rng);
    game.send({ type: "MSG_ACK" });
    return game;
  };

  it("charges Upkeep for every day at sea", () => {
    const calmSeas = createRng(() => 0.99);
    const game = gameAt(
      { gameScreen: { at_port: "menu" } },
      (context) => ({ balance: 1000, guardFleet: { ...context.guardFleet, ships: 2, quality: 1 } }),
      calmSeas,
    );
    const before = game.getSnapshot().context;

    game.send({ type: "TRAVEL_TO", destination: "Shanghai" });

    const after = game.getSnapshot().context;
    const daysAtSea = after.day - before.day;
    expect(daysAtSea).toBeGreaterThan(0);
    expect(after.balance).toBe(1000 - 50 * daysAtSea);
    expect(after.currentPort).toBe("Shanghai");
    expect(messagesOf(game)).toContain("Arrived at Shanghai");
  });

  it("sells the Guard Fleet at a loss when the Overdraft grows too deep", () => {
    const game = atMenu((context) => ({
      balance: -2500,
      announcedOverdraft: true,
      guardFleet: { ...context.guardFleet, ships: 2, quality: 1 },
    }));

    expect(game.getSnapshot().context.guardFleet.ships).toBe(0);
    expect(game.getSnapshot().context.balance).toBe(-1460);
  });
});

describe("overdraft notices", () => {
  const atMenu = (patch: (context: Context) => Partial<Context>) => {
    const game = gameAt({ gameScreen: "menu" }, patch);
    game.send({ type: "MSG_ACK" });
    return game;
  };

  it("announces falling into Overdraft once", () => {
    const game = gameAt({ gameScreen: "menu" }, (context) => ({ balance: -50 }));
    game.send({ type: "GO_TO_MARKET" });
    game.send({ type: "CANCEL" });

    expect(
      messagesOf(game).filter((message) => message === "Captain, we're in debt with the moneylenders."),
    ).toHaveLength(1);
  });

  it("announces leaving Overdraft", () => {
    const game = atMenu(() => ({ balance: 10, announcedOverdraft: true }));

    expect(messagesOf(game)).toContain("We're no longer in overdraft, Captain!");
  });
});

describe("bribing pirates", () => {
  it("has nothing to offer while in Overdraft", () => {
    const game = gameAt({ gameScreen: { at_port: "piratesEncountered" } }, () => ({
      balance: -500,
      announcedOverdraft: true,
    }));

    game.send({ type: "PIRATES_ENCOUNTER_OFFER" });

    expect(game.getSnapshot().context.balance).toBeLessThanOrEqual(-500);
    expect(messagesOf(game)).toContain("We have nothing to offer them, Captain!");
  });
});

describe("voyage end", () => {
  const atMenu = (patch: (context: Context) => Partial<Context>) => gameAt({ gameScreen: "menu" }, patch);

  it("retires with a score even when slightly in Overdraft", () => {
    const game = atMenu(() => ({ balance: -100, announcedOverdraft: true, day: 200 }));

    game.send({ type: "RETIRE" });

    expect(game.getSnapshot().matches("scoringScreen")).toBe(true);
    expect(voyageResult(game.getSnapshot().context).end).toBe("retired");
    expect(voyageResult(game.getSnapshot().context).score).toBeGreaterThan(0);
  });

  it("refuses to declare bankruptcy without an Overdraft", () => {
    const game = atMenu(() => ({ balance: 0 }));

    game.send({ type: "DECLARE_BANKRUPTCY" });

    expect(game.getSnapshot().matches("scoringScreen")).toBe(false);
    expect(messagesOf(game)).toContain("You're not bankrupt!");
  });

  it("declares bankruptcy while in Overdraft, scoring nothing", () => {
    const game = atMenu(() => ({ balance: -1, announcedOverdraft: true }));

    game.send({ type: "DECLARE_BANKRUPTCY" });

    expect(voyageResult(game.getSnapshot().context)).toMatchObject({ end: "declaredBankrupt", score: 0 });
  });

  it("goes bankrupt when the Overdraft passes the limit", () => {
    const game = atMenu(() => ({ balance: -4001, announcedOverdraft: true }));
    game.send({ type: "MSG_ACK" });

    expect(voyageResult(game.getSnapshot().context)).toMatchObject({ end: "bankrupt", score: 0 });
  });

  it("is shipwrecked when the wreck can't be repaired", () => {
    const game = atMenu((context) => ({ balance: 0, ship: { ...context.ship, health: 10 } }));
    game.send({ type: "MSG_ACK" });

    expect(voyageResult(game.getSnapshot().context).end).toBe("shipwrecked");
  });
});

describe("events", () => {
  const duringStorm = () =>
    gameAt({ gameScreen: { at_port: { eventOccurred: "multi_choice" } } }, () => ({
      currentEvent: "storm",
      destination: "Shanghai",
    }));

  it("keeps only the Event's id in game state", () => {
    const { context } = duringStorm().getSnapshot();

    expect(JSON.parse(JSON.stringify(context.currentEvent))).toBe("storm");
    expect(eventView(context)).toEqual({
      message: "A storm approaches our vessel, Captain. What's your course of action?",
      choices: [
        { label: "Brave the storm", key: "B" },
        { label: "Take a detour", key: "D" },
      ],
    });
  });

  it("adds an Event's Delay to the passage", () => {
    const game = duringStorm();
    const before = game.getSnapshot().context;

    game.send({ type: "RESOLVE_EVENT", choice: "D" });

    const after = game.getSnapshot().context;
    expect(after.day).toBe(before.day + calculateTravelTime("Shanghai", before) + 3);
    expect(after.delayDays).toBeUndefined();
  });
});
