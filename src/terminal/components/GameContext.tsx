import { createActorContext } from "@xstate/react";
import { gameMachine, mathRandomRng } from "../../game/index.js";

export const GameContext = createActorContext(gameMachine, { input: { rng: mathRandomRng } });
