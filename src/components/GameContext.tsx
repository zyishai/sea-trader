import { createActorContext } from "@xstate/react";
import { gameMachine } from "../store/game.js";
import { mathRandomRng } from "../store/rng.js";

export const GameContext = createActorContext(gameMachine, { input: { rng: mathRandomRng } });
