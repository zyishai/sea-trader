import { GOAL_DAYS, canRetire } from "../clock.js";
import { Context } from "../context.js";
import { getShipStatus } from "../ship.js";
import { isInOverdraft } from "../treasury.js";
import { accept, reject } from "./index.js";

export const setSailRejection = (context: Context) =>
  context.day >= GOAL_DAYS && !context.extendedGame
    ? reject("voyageOver", [`You've finished your ${GOAL_DAYS} days voyage.`])
    : getShipStatus(context.ship.health) === "Wreckage"
      ? reject("shipWrecked", ["Our ship is a wreckage, Captain.", "We can't travel until we repair it."])
      : undefined;

export const retire = (context: Context) =>
  canRetire(context)
    ? accept({ ...context, voyageEnd: "retired" })
    : reject("voyageNotFinished", ["You haven't finished your voyage yet!"]);

export const declareBankruptcy = (context: Context) =>
  isInOverdraft(context)
    ? accept({ ...context, voyageEnd: "declaredBankrupt" })
    : reject("notInOverdraft", ["You're not bankrupt!"]);
