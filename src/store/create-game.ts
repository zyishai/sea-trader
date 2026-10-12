import { createActor } from "xstate";
import { gameMachine } from "./game.js";
import { connectPlugin, GamePlugin } from "./plugin.js";
import { mathRandomRng, Rng } from "./rng.js";

export const createGame = ({ rng = mathRandomRng, plugins = [] }: { rng?: Rng; plugins?: GamePlugin[] } = {}) => {
  const game = createActor(gameMachine, { input: { rng } });
  plugins.forEach((plugin) => connectPlugin(game, plugin));
  return game.start();
};
