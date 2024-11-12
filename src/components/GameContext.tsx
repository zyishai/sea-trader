import { createActorContext } from "@xstate/react";
import { gameMachine } from "../store/store.js";

export const GameContext = createActorContext(gameMachine);
