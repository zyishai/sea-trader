import React from "react";
import { Box, Text } from "ink";
import { GameContext, TransactionContext } from "../../GameContext.js";
import { ActionPrompt as ActionPromptKeyboard } from "../../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../../prompts/arrows/ActionPrompt.js";

export function InventoryAction() {
  const actor = GameContext.useActorRef();
  const transactionActor = TransactionContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const { context } = snapshot;
  const controls = context.settings.controls;

  const handleSelect = (value: string) => {
    if (value === "B") {
      transactionActor.send({ type: "RESET", action: "buy" });
      actor.send({ type: "START_BUYING" });
    } else if (value === "S") {
      transactionActor.send({ type: "RESET", action: "sell" });
      actor.send({ type: "START_SELLING" });
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Text underline>Inventory</Text>
      {controls === "keyboard" ? (
        <ActionPromptKeyboard
          message="What would you like to do?"
          actions={[
            { label: "Buy goods", value: "B", key: "B" },
            { label: "Sell goods", value: "S", key: "S" },
          ]}
          onSelect={handleSelect}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : (
        <ActionPromptArrows
          message="What would you like to do?"
          actions={[
            { label: "Buy goods", value: "B" },
            { label: "Sell goods", value: "S" },
          ]}
          onSelect={handleSelect}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      )}
    </Box>
  );
}
