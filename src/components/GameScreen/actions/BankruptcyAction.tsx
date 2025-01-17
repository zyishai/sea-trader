import React from "react";
import { Box } from "ink";
import { GameContext } from "../../GameContext.js";
import { ConfirmPrompt as ConfirmPromptKeyboard } from "../../prompts/keyboard/ConfirmPrompt.js";
import { ConfirmPrompt as ConfirmPromptArrows } from "../../prompts/arrows/ConfirmPrompt.js";

export function BankruptcyAction() {
  const actor = GameContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const controls = snapshot.context.settings.controls;

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      {controls === "keyboard" ? (
        <ConfirmPromptKeyboard
          message="Are you sure you want to declare bankruptcy?"
          onConfirm={() => actor.send({ type: "DECLARE_BANKRUPTCY" })}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : (
        <ConfirmPromptArrows
          message="Are you sure you want to declare bankruptcy?"
          onConfirm={() => actor.send({ type: "DECLARE_BANKRUPTCY" })}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      )}
    </Box>
  );
}
