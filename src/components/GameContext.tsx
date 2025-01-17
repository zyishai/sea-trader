import { createActorContext } from "@xstate/react";
import { gameMachine } from "../store/game.js";
import { transactionRTActor } from "../store/market.js";

export const GameContext = createActorContext(gameMachine);

export const TransactionContext = createActorContext(transactionRTActor);
