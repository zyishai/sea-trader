import React from "react";
import { Box, Text } from "ink";
import { GameContext } from "../../GameContext.js";
import { ActionPrompt as ActionPromptKeyboard } from "../../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../../prompts/arrows/ActionPrompt.js";
import { InputPrompt as InputPromptKeyboard } from "../../prompts/keyboard/InputPrompt.js";
import { InputPrompt as InputPromptArrows } from "../../prompts/arrows/InputPrompt.js";

export function ShipyardAction() {
  const actor = GameContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const { context } = snapshot;
  const controls = context.settings.controls;
  const isMenu = snapshot.matches({ gameScreen: { at_shipyard: "menu" } });
  const isRepairing = snapshot.matches({ gameScreen: { at_shipyard: "repairing" } });

  const pickAction = (value: string) => {
    if (value === "repair") {
      actor.send({ type: "GO_TO_SHIPYARD_REPAIR" });
    } else if (value === "upgrade") {
      // TODO: implement upgrade
    }
  };
  const validateAmount = (value: string) => {
    const amount = +value;
    return isNaN(amount) || amount <= 0 ? "Please enter a valid amount of money" : undefined;
  };
  const repairShip = ({ amount }: { amount?: string }) => {
    if (amount) {
      actor.send({ type: "REPAIR", cash: +amount });
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Text underline>Shipyard</Text>
      {controls === "keyboard" ? (
        isMenu ? (
          <ActionPromptKeyboard
            message="What would you like to do?"
            actions={[
              { label: "Repair ship", value: "repair", key: "R", disabled: context.ship.health >= 100 },
              { label: "Upgrade ship", value: "upgrade", key: "U" },
            ]}
            onSelect={pickAction}
            onCancel={() => actor.send({ type: "CANCEL" })}
          />
        ) : isRepairing ? (
          <InputPromptKeyboard
            steps={[
              {
                type: "text",
                id: "amount",
                message: `How much would you like to spend on repairs?`,
                validate: validateAmount,
              },
            ]}
            onComplete={repairShip}
            onCancel={() => actor.send({ type: "CANCEL" })}
          />
        ) : null
      ) : isMenu ? (
        <ActionPromptArrows
          message="What would you like to do?"
          actions={[
            { label: "Repair ship", value: "repair", disabled: context.ship.health >= 100 },
            { label: "Upgrade ship", value: "upgrade" },
          ]}
          onSelect={pickAction}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : isRepairing ? (
        <InputPromptArrows
          steps={[
            {
              type: "text",
              id: "amount",
              message: `How much would you like to spend on repairs?`,
              validate: validateAmount,
            },
          ]}
          onComplete={repairShip}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : null}
    </Box>
  );
}
