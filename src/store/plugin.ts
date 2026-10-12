import { ActorRefFrom } from "xstate";
import { GameCommand, RejectionReason } from "./commands/index.js";
import type { gameMachine } from "./game.js";
import { GamePhase } from "./views/phase.js";

export type CommandReport = { command: GameCommand["type"]; accepted: boolean; reason?: RejectionReason };

export type GameEmitted =
  | { type: "notice"; lines: string[] }
  | ({ type: "commandResult" } & CommandReport)
  | { type: "phaseChanged"; phase: GamePhase };

export type GamePlugin = {
  onNotice?: (lines: string[]) => void;
  onCommandResult?: (report: CommandReport) => void;
  onPhaseChanged?: (phase: GamePhase) => void;
};

export const connectPlugin = (game: ActorRefFrom<typeof gameMachine>, plugin: GamePlugin) => {
  const subscriptions = [
    game.on("notice", ({ lines }) => plugin.onNotice?.(lines)),
    game.on("commandResult", ({ command, accepted, reason }) =>
      plugin.onCommandResult?.({ command, accepted, reason }),
    ),
    game.on("phaseChanged", ({ phase }) => plugin.onPhaseChanged?.(phase)),
  ];
  return () => subscriptions.forEach((subscription) => subscription.unsubscribe());
};
