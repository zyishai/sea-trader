import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { navigationMachine } from "./navigation.js";

const navigation = () => createActor(navigationMachine).start();

describe("terminal navigation", () => {
  it("opens a screen from the main menu and goes back", () => {
    const nav = navigation();

    nav.send({ type: "OPEN", screen: "market" });
    expect(nav.getSnapshot().value).toBe("market");

    nav.send({ type: "BACK" });
    expect(nav.getSnapshot().value).toBe("menu");
  });

  it("counts each visit, so a screen starts fresh every time it opens", () => {
    const nav = navigation();

    nav.send({ type: "OPEN", screen: "market" });
    nav.send({ type: "BACK" });
    nav.send({ type: "OPEN", screen: "market" });

    expect(nav.getSnapshot().context.visit).toBe(2);
  });

  it("tracks which Notices the Captain has seen", () => {
    const nav = navigation();

    nav.send({ type: "NOTICE_SEEN" });
    nav.send({ type: "NOTICE_SEEN" });

    expect(nav.getSnapshot().context.noticesSeen).toBe(2);
  });
});
