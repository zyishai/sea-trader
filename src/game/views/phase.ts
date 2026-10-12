import { SnapshotFrom } from "xstate";
import { gameMachine } from "../game.js";

export type GamePhase = "idle" | "inPort" | "encounter" | "event" | "cargoOffer" | "ended";

export const gamePhase = (snapshot: SnapshotFrom<typeof gameMachine>): GamePhase =>
  snapshot.matches("idle")
    ? "idle"
    : snapshot.matches("ended")
      ? "ended"
      : snapshot.matches({ atSea: "encounter" })
        ? "encounter"
        : snapshot.matches({ atSea: "event" })
          ? "event"
          : snapshot.matches({ atSea: "cargoOffer" })
            ? "cargoOffer"
            : "inPort";
