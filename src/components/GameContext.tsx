import { createActorContext } from "@xstate/react";
import { gameMachine } from "../store/game.js";

export const GameContext = createActorContext(gameMachine);
