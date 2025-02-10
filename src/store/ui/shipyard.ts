import { setup } from "xstate";

export const shipyardMachine = setup({
  types: {
    events: {} as
      | { type: "SELECT_ACTION"; action: "repair" | "upgrade" | "manage_fleet" }
      | { type: "MANAGE_FLEET"; action: "hire" | "upgrade" | "dismiss" }
      | { type: "COMMIT" }
      | { type: "CANCEL" },
  },
}).createMachine({
  initial: "menu",
  states: {
    menu: {
      id: "menu",
      on: {
        SELECT_ACTION: [
          {
            guard: ({ event }) => event.action === "repair",
            target: "repair",
          },
          {
            guard: ({ event }) => event.action === "upgrade",
            target: "upgrade",
          },
          {
            guard: ({ event }) => event.action === "manage_fleet",
            target: "manage_fleet",
          },
        ],
      },
    },
    repair: {
      on: {
        COMMIT: { target: "menu" },
        CANCEL: { target: "menu" },
      },
    },
    upgrade: {
      on: {
        CANCEL: { target: "menu" },
      },
    },
    manage_fleet: {
      initial: "menu",
      states: {
        menu: {
          on: {
            MANAGE_FLEET: [
              {
                guard: ({ event }) => event.action === "hire",
                target: "hire",
              },
              {
                guard: ({ event }) => event.action === "upgrade",
                target: "upgrade",
              },
              {
                guard: ({ event }) => event.action === "dismiss",
                target: "dismiss",
              },
            ],
            CANCEL: { target: "#menu" },
          },
        },
        hire: {
          on: {
            COMMIT: { target: "menu" },
            CANCEL: { target: "menu" },
          },
        },
        upgrade: {
          on: {
            COMMIT: { target: "menu" },
            CANCEL: { target: "menu" },
          },
        },
        dismiss: {
          on: {
            COMMIT: { target: "menu" },
            CANCEL: { target: "menu" },
          },
        },
      },
    },
  },
});
