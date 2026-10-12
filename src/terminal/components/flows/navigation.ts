import { assign, setup } from "xstate";

export type PortScreen = "menu" | "port" | "market" | "shipyard";

export const navigationMachine = setup({
  types: {
    context: {} as { noticesSeen: number; visit: number },
    events: {} as { type: "OPEN"; screen: Exclude<PortScreen, "menu"> } | { type: "BACK" } | { type: "NOTICE_SEEN" },
  },
  actions: {
    countVisit: assign({ visit: ({ context }) => context.visit + 1 }),
  },
}).createMachine({
  initial: "menu",
  context: { noticesSeen: 0, visit: 0 },
  on: {
    NOTICE_SEEN: { actions: assign({ noticesSeen: ({ context }) => context.noticesSeen + 1 }) },
  },
  states: {
    menu: {
      on: {
        OPEN: [
          { guard: ({ event }) => event.screen === "port", target: "port", actions: "countVisit" },
          { guard: ({ event }) => event.screen === "market", target: "market", actions: "countVisit" },
          { guard: ({ event }) => event.screen === "shipyard", target: "shipyard", actions: "countVisit" },
        ],
      },
    },
    port: { on: { BACK: "menu" } },
    market: { on: { BACK: "menu" } },
    shipyard: { on: { BACK: "menu" } },
  },
});
