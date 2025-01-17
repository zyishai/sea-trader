import React from "react";
import { GameContext } from "../GameContext.js";
import { useInput } from "ink";

export function ExitGame() {
  const actor = GameContext.useActorRef();

  useInput((_, key) => {
    if (key.escape) {
      actor.send({ type: "EXIT" });
    }
  });

  return null;
}
