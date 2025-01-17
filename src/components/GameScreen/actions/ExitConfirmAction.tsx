import React from "react";
import { GameContext } from "../../GameContext.js";
import { ConfirmPrompt as ConfirmPromptKeyboard } from "../../prompts/keyboard/ConfirmPrompt.js";
import { ConfirmPrompt as ConfirmPromptArrows } from "../../prompts/arrows/ConfirmPrompt.js";

export function ExitConfirmAction() {
  const actor = GameContext.useActorRef();
  const controls = GameContext.useSelector((snapshot) => snapshot.context.settings.controls);

  return controls === "keyboard" ? (
    <ConfirmPromptKeyboard
      message="Are you sure you want to exit?"
      onConfirm={() => process.exit()}
      onCancel={() => actor.send({ type: "CANCEL" })}
    />
  ) : (
    <ConfirmPromptArrows
      message="Are you sure you want to exit?"
      onConfirm={() => process.exit()}
      onCancel={() => actor.send({ type: "CANCEL" })}
    />
  );
}
