import React from "react";
import { Box } from "ink";
import { Alert } from "@inkjs/ui";
import { GameContext } from "../../GameContext.js";
import { ConfirmPrompt as ConfirmPromptKeyboard } from "../../prompts/keyboard/ConfirmPrompt.js";
import { ConfirmPrompt as ConfirmPromptArrows } from "../../prompts/arrows/ConfirmPrompt.js";

export function RetireAction() {
  const actor = GameContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const controls = snapshot.context.settings.controls;

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Alert variant="warning">Retiring will end the game.</Alert>
      {controls === "keyboard" ? (
        <ConfirmPromptKeyboard
          message="Are you sure you want to retire?"
          onConfirm={() => actor.send({ type: "RETIRE" })}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : (
        <ConfirmPromptArrows
          message="Are you sure you want to retire?"
          onConfirm={() => actor.send({ type: "RETIRE" })}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      )}
    </Box>
  );
}
