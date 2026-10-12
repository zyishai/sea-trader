import { setup } from "xstate";

export const menuMachine = setup({
  types: {
    events: {} as { type: "RETIRE" } | { type: "DECLARE_BANKRUPTCY" } | { type: "EXIT_GAME" } | { type: "CANCEL" },
  },
}).createMachine({
  initial: "menu",
  states: {
    menu: {
      on: {
        RETIRE: { target: "confirm_retire" },
        DECLARE_BANKRUPTCY: { target: "confirm_bankruptcy" },
        EXIT_GAME: { target: "confirm_exit" },
      },
    },
    confirm_retire: {
      on: {
        CANCEL: { target: "menu" },
      },
    },
    confirm_bankruptcy: {
      on: {
        CANCEL: { target: "menu" },
      },
    },
    confirm_exit: {
      on: {
        CANCEL: { target: "menu" },
      },
    },
  },
});
