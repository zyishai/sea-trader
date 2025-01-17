import { fromTransition } from "xstate";
import { Good } from "./types.js";
import { TransactionEvents } from "./events.js";

type TransactionState = {
  action?: "buy" | "sell";
  good?: Good;
  quantity: number;
};
export const transactionRTActor = fromTransition(
  (state: TransactionState, event: TransactionEvents) => {
    switch (event.type) {
      case "RESET":
        return { ...state, action: event.action, good: undefined, quantity: 0 };
      case "UPDATE_GOOD":
        return { ...state, good: event.good };
      case "UPDATE_QUANTITY":
        return { ...state, quantity: event.quantity };
      default:
        return state;
    }
  },
  {
    action: undefined,
    good: undefined,
    quantity: 0,
  } as TransactionState,
);
