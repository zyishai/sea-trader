import React from "react";
import { Box, Text } from "ink";
import { GameContext, TransactionContext } from "../../GameContext.js";
import { ActionPrompt as ActionPromptKeyboard } from "../../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../../prompts/arrows/ActionPrompt.js";
import { ExitGame } from "../ExitGame.js";

export function MainActions() {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const transactionActor = TransactionContext.useActorRef();
  const controls = context.settings.controls;

  const handleSelect = (value: string) => {
    if (value === "T") {
      actor.send({ type: "GO_TO_PORT" });
    } else if (value === "I") {
      actor.send({ type: "GO_TO_INVENTORY" });
    } else if (value === "B") {
      transactionActor.send({ type: "RESET", action: "buy" });
      actor.send({ type: "GO_TO_MARKET", action: "buy" });
    } else if (value === "S") {
      transactionActor.send({ type: "RESET", action: "sell" });
      actor.send({ type: "GO_TO_MARKET", action: "sell" });
    } else if (value === "F") {
      actor.send({ type: "MANAGE_FLEET" });
    } else if (value === "Y") {
      actor.send({ type: "GO_TO_SHIPYARD" });
    } else if (value === "W") {
      actor.send({ type: "GO_TO_RETIREMENT" });
    } else if (value === "D") {
      actor.send({ type: "GO_TO_BANKRUPTCY" });
    }
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Text backgroundColor="black" color="whiteBright">
        {" "}
        ACTIONS{" "}
      </Text>
      {controls === "keyboard" ? (
        <ActionPromptKeyboard
          message="What would you like to do?"
          actions={[
            { label: "Travel", value: "T", key: "T" },
            { label: "View inventory", value: "I", key: "I" },
            { label: "Buy goods", value: "B", key: "B" },
            { label: "Sell goods", value: "S", key: "S" },
            { label: "Manage fleet", value: "F", key: "F" },
            { label: "Visit shipyard", value: "Y", key: "Y" },
            { label: "Retire", value: "W", disabled: !context.canRetire, key: "W" },
            { label: "Declare bankruptcy", value: "D", key: "D", disabled: context.balance >= 0 },
          ]}
          onSelect={handleSelect}
        />
      ) : (
        <ActionPromptArrows
          message="What would you like to do?"
          actions={[
            { label: "Travel", value: "T" },
            { label: "View inventory", value: "I" },
            { label: "Buy goods", value: "B" },
            { label: "Sell goods", value: "S" },
            { label: "Manage fleet", value: "F" },
            { label: "Visit shipyard", value: "Y" },
            { label: "Retire", value: "W", disabled: !context.canRetire },
            { label: "Declare bankruptcy", value: "D", disabled: context.balance >= 0 },
          ]}
          onSelect={handleSelect}
        />
      )}
      <ExitGame />
    </Box>
  );
}
