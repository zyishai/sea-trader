import { test, expect } from "vitest";
import { add } from "./utils";

test("add", () => {
  expect(add(1, 2)).toBe(3);
});
