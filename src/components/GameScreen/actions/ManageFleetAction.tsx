import React from "react";
import { Box, Text } from "ink";
import { GameContext } from "../../GameContext.js";
import { ActionPrompt as ActionPromptKeyboard } from "../../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../../prompts/arrows/ActionPrompt.js";
import { calculateDailyMaintenanceCost } from "../../../store/utils.js";
import { InputPrompt as InputPromptKeyboard } from "../../prompts/keyboard/InputPrompt.js";
import { InputPrompt as InputPromptArrows } from "../../prompts/arrows/InputPrompt.js";
import { ConfirmPrompt as ConfirmPromptKeyboard } from "../../prompts/keyboard/ConfirmPrompt.js";
import { ConfirmPrompt as ConfirmPromptArrows } from "../../prompts/arrows/ConfirmPrompt.js";
import { calculateGuardShipCost } from "../../../store/utils.js";

export function ManageFleetAction() {
  const actor = GameContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const { context } = snapshot;
  const controls = context.settings.controls;
  const dailyMaintenanceCost = calculateDailyMaintenanceCost(context);
  const isMenu = snapshot.matches({ gameScreen: { managing_fleet: "menu" } });
  const isHire = snapshot.matches({ gameScreen: { managing_fleet: "hireShips" } });
  const isUpgrade = snapshot.matches({ gameScreen: { managing_fleet: "upgradeFleet" } });
  const isDismiss = snapshot.matches({ gameScreen: { managing_fleet: "dismissShips" } });

  const pickAction = (value: string) => {
    if (value === "hire") {
      actor.send({ type: "GO_TO_GUARD_HALL_HIRE" });
    } else if (value === "upgrade") {
      actor.send({ type: "GO_TO_GUARD_HALL_UPGRADE" });
    } else if (value === "dismiss") {
      actor.send({ type: "GO_TO_GUARD_HALL_DISMISS" });
    }
  };
  const validateQuantityOfShipsToHire = (value: string) => {
    const quantity = +value;
    return isNaN(quantity) || quantity <= 0 ? "Please enter a valid number" : undefined;
  };
  const hireShips = ({ quantity }: { quantity?: string }) => {
    if (quantity) {
      actor.send({ type: "HIRE_PERMANENT_GUARDS", amount: +quantity });
    }
  };
  const validateQuantityOfShipsToDismiss = (value: string) => {
    const quantity = +value;
    return isNaN(quantity) || quantity <= 0 ? "Please enter a valid number" : undefined;
  };
  const dismissShips = ({ quantity }: { quantity?: string }) => {
    if (quantity) {
      actor.send({ type: "DISMISS_GUARDS", amount: +quantity });
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Text underline>Fleet Management</Text>
      {isMenu && dailyMaintenanceCost > 0 ? <Text>Daily Maintenance: ${dailyMaintenanceCost}</Text> : null}
      {isHire ? (
        <Text dimColor>Hiring a ship costs ${calculateGuardShipCost(context, 1)} and cannot be refunded.</Text>
      ) : null}
      {isDismiss ? <Text dimColor>Dismissing a ship reduces the daily maintenance cost of your fleet.</Text> : null}
      {controls === "keyboard" ? (
        isMenu ? (
          <ActionPromptKeyboard
            message="What would you like to do?"
            actions={[
              { label: "Hire ships", value: "hire", key: "H" },
              { label: "Upgrade fleet", value: "upgrade", key: "U" },
              { label: "Dismiss ships", value: "dismiss", key: "D" },
            ]}
            onSelect={pickAction}
            onCancel={() => actor.send({ type: "CANCEL" })}
          />
        ) : isHire ? (
          <InputPromptKeyboard
            steps={[
              {
                type: "text",
                id: "quantity",
                message: `How many ships do you wish to hire?`,
                validate: validateQuantityOfShipsToHire,
              },
            ]}
            onComplete={hireShips}
            onCancel={() => actor.send({ type: "CANCEL" })}
          />
        ) : isUpgrade ? (
          <ConfirmPromptKeyboard
            message="Are you sure you want to upgrade the quality of your fleet?"
            onConfirm={() => actor.send({ type: "UPGRADE_GUARDS" })}
            onCancel={() => actor.send({ type: "CANCEL" })}
          />
        ) : isDismiss ? (
          <InputPromptKeyboard
            steps={[
              {
                type: "text",
                id: "quantity",
                message: `How many ships do you wish to dismiss?`,
                validate: validateQuantityOfShipsToDismiss,
              },
            ]}
            onComplete={dismissShips}
            onCancel={() => actor.send({ type: "CANCEL" })}
          />
        ) : null
      ) : isMenu ? (
        <ActionPromptArrows
          message="What would you like to do?"
          actions={[
            { label: "Hire ships", value: "hire" },
            { label: "Upgrade fleet", value: "upgrade" },
            { label: "Dismiss ships", value: "dismiss" },
          ]}
          onSelect={pickAction}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : isHire ? (
        <InputPromptArrows
          steps={[
            {
              type: "text",
              id: "quantity",
              message: `How many ships do you wish to hire?`,
              validate: validateQuantityOfShipsToHire,
            },
          ]}
          onComplete={hireShips}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : isUpgrade ? (
        <ConfirmPromptArrows
          message="Are you sure you want to upgrade the quality of your fleet?"
          onConfirm={() => actor.send({ type: "UPGRADE_GUARDS" })}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : isDismiss ? (
        <InputPromptArrows
          steps={[
            {
              type: "text",
              id: "quantity",
              message: `How many ships do you wish to dismiss?`,
              validate: validateQuantityOfShipsToDismiss,
            },
          ]}
          onComplete={dismissShips}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : null}
    </Box>
  );
}
