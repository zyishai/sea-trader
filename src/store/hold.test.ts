import { describe, expect, it } from "vitest";
import {
  amountOf,
  emptyHold,
  fitsAboard,
  freeSpace,
  goodsAboard,
  isOverloaded,
  load,
  marginLeft,
  overloadLevel,
  spaceUsed,
  unload,
  unloadWhere,
  value,
  withCapacity,
} from "./hold.js";

const holdWith = (capacity: number, cargo: [Parameters<typeof load>[1], number][]) =>
  cargo.reduce((hold, [good, picul]) => load(hold, good, picul).hold, emptyHold(capacity));

describe("Hold", () => {
  it("starts empty with all of its capacity free", () => {
    const hold = emptyHold(120);

    expect(goodsAboard(hold)).toEqual([]);
    expect(spaceUsed(hold)).toBe(0);
    expect(freeSpace(hold)).toBe(120);
    expect(isOverloaded(hold)).toBe(false);
  });

  it("loads goods within capacity", () => {
    const { hold, loaded, leftBehind, becameOverloaded } = load(emptyHold(120), "Tea", 40);

    expect(loaded).toBe(40);
    expect(leftBehind).toBe(0);
    expect(becameOverloaded).toBe(false);
    expect(amountOf(hold, "Tea")).toBe(40);
    expect(amountOf(hold, "Wheat")).toBe(0);
    expect(freeSpace(hold)).toBe(80);
  });

  it("becomes Overloaded when loading past capacity, within the overload margin", () => {
    const { hold: half } = load(emptyHold(100), "Tea", 60);
    const { hold, loaded, leftBehind, becameOverloaded } = load(half, "Wheat", 50);

    expect(loaded).toBe(50);
    expect(leftBehind).toBe(0);
    expect(becameOverloaded).toBe(true);
    expect(isOverloaded(hold)).toBe(true);
    expect(freeSpace(hold)).toBe(0);
    expect(marginLeft(hold)).toBe(10);
  });

  it("leaves behind what doesn't fit inside the overload margin", () => {
    const { hold, loaded, leftBehind } = load(emptyHold(100), "Tea", 150);

    expect(loaded).toBe(120);
    expect(leftBehind).toBe(30);
    expect(amountOf(hold, "Tea")).toBe(120);
    expect(marginLeft(hold)).toBe(0);
  });

  it("doesn't report becoming Overloaded when it already was", () => {
    const { hold } = load(emptyHold(100), "Tea", 110);

    expect(load(hold, "Tea", 5).becameOverloaded).toBe(false);
  });

  it("leaves the original Hold unchanged", () => {
    const original = emptyHold(100);
    load(original, "Tea", 40);

    expect(amountOf(original, "Tea")).toBe(0);
  });

  it("unloads goods and frees their space", () => {
    const { hold, unloaded } = unload(holdWith(100, [["Tea", 40]]), "Tea", 15);

    expect(unloaded).toBe(15);
    expect(amountOf(hold, "Tea")).toBe(25);
    expect(freeSpace(hold)).toBe(75);
  });

  it("unloads at most what is aboard", () => {
    const { hold, unloaded } = unload(holdWith(100, [["Tea", 10]]), "Tea", 25);

    expect(unloaded).toBe(10);
    expect(goodsAboard(hold)).toEqual([]);
  });

  it("unloads a chosen amount of each good at once", () => {
    const { hold, unloaded } = unloadWhere(
      holdWith(200, [
        ["Tea", 40],
        ["Opium", 10],
      ]),
      (good, picul) => (good === "Opium" ? picul : Math.ceil(picul / 4)),
    );

    expect(unloaded).toEqual({ Tea: 10, Opium: 10 });
    expect(goodsAboard(hold)).toEqual([["Tea", 30]]);
  });

  it("tells how much of a good fits, with and without overloading", () => {
    const hold = holdWith(100, [["Tea", 70]]);

    expect(fitsAboard(hold, "Wheat", { overload: false })).toBe(30);
    expect(fitsAboard(hold, "Wheat", { overload: true })).toBe(50);
  });

  it("measures how deep into the overload margin it is", () => {
    expect(overloadLevel(holdWith(100, [["Tea", 90]]))).toBe(0);
    expect(overloadLevel(holdWith(100, [["Tea", 110]]))).toBe(0.5);
    expect(overloadLevel(holdWith(100, [["Tea", 120]]))).toBe(1);
  });

  it("stops being Overloaded when capacity grows", () => {
    const hold = withCapacity(holdWith(100, [["Tea", 110]]), 180);

    expect(isOverloaded(hold)).toBe(false);
    expect(freeSpace(hold)).toBe(70);
  });

  it("values its cargo at the given prices", () => {
    const hold = holdWith(100, [
      ["Tea", 40],
      ["Opium", 2],
    ]);

    expect(value(hold, { Wheat: 100, Tea: 400, Spices: 800, Opium: 2000, Porcelain: 300 })).toBe(20_000);
  });
});
