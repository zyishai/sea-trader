import { fromTransition } from "xstate";
import { Good, Port } from "./types.js";
import { TransactionEvents } from "./events.js";

type TransactionState = {
  action?: "buy" | "sell" | "intelligence";
  port?: Port;
  good?: Good;
  quantity: number;
};
export const transactionRTActor = fromTransition(
  (state: TransactionState, event: TransactionEvents) => {
    switch (event.type) {
      case "RESET":
        return { ...state, action: event.action, port: undefined, good: undefined, quantity: 0 };
      case "UPDATE_GOOD":
        return { ...state, good: event.good };
      case "UPDATE_QUANTITY":
        return { ...state, quantity: event.quantity };
      case "PICK_MARKET_INTELLIGENCE_PORT":
        return { ...state, port: event.port };
      default:
        return state;
    }
  },
  {
    action: undefined,
    port: undefined,
    good: undefined,
    quantity: 0,
  } as TransactionState,
);
