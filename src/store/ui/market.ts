import { assign, setup } from "xstate";
import { Good } from "../types.js";

export const marketMachine = setup({
  types: {
    events: {} as
      | { type: "SELECT_ACTION"; action: "buy" | "sell" | "compare_prices" }
      | { type: "PICK_GOOD"; good: Good }
      | { type: "COMMIT" }
      | { type: "CANCEL" },
    context: {} as {
      good?: Good;
    },
  },
}).createMachine({
  context: {},
  initial: "menu",
  states: {
    menu: {
      id: "menu",
      on: {
        SELECT_ACTION: [
          {
            guard: ({ event }) => event.action === "buy",
            target: "buying",
          },
          {
            guard: ({ event }) => event.action === "sell",
            target: "selling",
          },
          {
            guard: ({ event }) => event.action === "compare_prices",
            target: "compare_prices",
          },
        ],
      },
    },
    buying: {
      initial: "pick_good",
      states: {
        pick_good: {
          on: {
            PICK_GOOD: {
              target: "select_quantity",
              actions: assign(({ event }) => ({ good: event.good })),
            },
            CANCEL: { target: "#menu" },
          },
        },
        select_quantity: {
          on: {
            COMMIT: { target: "pick_good" },
            CANCEL: { target: "pick_good" },
          },
        },
      },
    },
    selling: {
      initial: "pick_good",
      states: {
        pick_good: {
          on: {
            PICK_GOOD: {
              target: "select_quantity",
              actions: assign(({ event }) => ({ good: event.good })),
            },
            CANCEL: { target: "#menu" },
          },
        },
        select_quantity: {
          on: {
            COMMIT: { target: "pick_good" },
            CANCEL: { target: "pick_good" },
          },
        },
      },
    },
    compare_prices: {
      on: {
        SELECT_ACTION: [
          {
            guard: ({ event }) => event.action === "buy",
            target: "buying",
          },
          {
            guard: ({ event }) => event.action === "sell",
            target: "selling",
          },
        ],
        CANCEL: { target: "menu" },
      },
    },
  },
});
