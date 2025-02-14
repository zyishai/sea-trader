import React from "react";
import { Box, Text } from "ink";
import { GameContext } from "../../GameContext.js";
import { ActionPrompt as ActionPromptKeyboard } from "../../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../../prompts/arrows/ActionPrompt.js";
import figlet from "figlet";
import { useMachine } from "@xstate/react";
import { menuMachine } from "../../../store/ui/menu.js";
import { ConfirmPrompt as ConfirmPromptKeyboard } from "../../prompts/keyboard/ConfirmPrompt.js";
import { ConfirmPrompt as ConfirmPromptArrows } from "../../prompts/arrows/ConfirmPrompt.js";

export function MainView() {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const controls = context.settings.controls;
  const [snapshot, send] = useMachine(menuMachine);

  const availableActions = [
    { label: "Go to Port", value: "go_to_port" },
    { label: "Visit Market", value: "visit_market" },
    { label: "Visit Shipyard", value: "visit_shipyard" },
    { label: "Retire", value: "retire", disabled: !context.canRetire },
    { label: "Declare bankruptcy", value: "declare_bankruptcy", disabled: context.balance >= 0 },
  ];
  const handleSelectAction = (value: string) => {
    switch (value) {
      case "go_to_port": {
        actor.send({ type: "GO_TO_PORT" });
        break;
      }
      case "visit_market": {
        actor.send({ type: "GO_TO_MARKET" });
        break;
      }
      case "visit_shipyard": {
        actor.send({ type: "GO_TO_SHIPYARD" });
        break;
      }
      case "retire": {
        send({ type: "RETIRE" });
        break;
      }
      case "declare_bankruptcy": {
        send({ type: "DECLARE_BANKRUPTCY" });
        break;
      }
    }
  };

  if (snapshot.matches("confirm_exit")) {
    return <ConfirmExitGame onCancel={() => send({ type: "CANCEL" })} />;
  }

  if (snapshot.matches("confirm_retire")) {
    return <ConfirmRetirement onCancel={() => send({ type: "CANCEL" })} />;
  }

  if (snapshot.matches("confirm_bankruptcy")) {
    return <ConfirmBankruptcy onCancel={() => send({ type: "CANCEL" })} />;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text>{figlet.textSync("Sea Trader")}</Text>

      {controls === "keyboard" ? (
        <>
          <ActionPromptKeyboard
            message="What would you like to do, Captain?"
            actions={availableActions
              .filter((action) => !action.disabled)
              .map((action, index) => ({
                ...action,
                key: String(index + 1),
              }))}
            onSelect={handleSelectAction}
            onCancel={() => send({ type: "EXIT_GAME" })}
            backMessage="Press [Esc] to quit"
          />
          <Text dimColor>Use the number keys to select an option.</Text>
        </>
      ) : (
        <ActionPromptArrows
          message="What would you like to do, Captain?"
          actions={availableActions.filter((action) => !action.disabled)}
          onSelect={handleSelectAction}
          onCancel={() => send({ type: "EXIT_GAME" })}
          backMessage="Press [Esc] to quit"
        />
      )}
    </Box>
  );
}

function ConfirmRetirement({ onCancel }: { onCancel: () => void }) {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const controls = context.settings.controls;

  return controls === "keyboard" ? (
    <ConfirmPromptKeyboard
      message="This will end the game. Are you sure?"
      onConfirm={() => actor.send({ type: "RETIRE" })}
      onCancel={onCancel}
    />
  ) : (
    <ConfirmPromptArrows
      message="This will end the game. Are you sure?"
      onConfirm={() => actor.send({ type: "RETIRE" })}
      onCancel={onCancel}
    />
  );
}

function ConfirmBankruptcy({ onCancel }: { onCancel: () => void }) {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const controls = context.settings.controls;

  return controls === "keyboard" ? (
    <ConfirmPromptKeyboard
      message="This will end the game. Are you sure?"
      onConfirm={() => actor.send({ type: "DECLARE_BANKRUPTCY" })}
      onCancel={onCancel}
    />
  ) : (
    <ConfirmPromptArrows
      message="This will end the game. Are you sure?"
      onConfirm={() => actor.send({ type: "DECLARE_BANKRUPTCY" })}
      onCancel={onCancel}
    />
  );
}

function ConfirmExitGame({ onCancel }: { onCancel: () => void }) {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const controls = context.settings.controls;

  return controls === "keyboard" ? (
    <ConfirmPromptKeyboard
      message="This will end the game. Are you sure?"
      onConfirm={() => process.exit(0)}
      onCancel={onCancel}
    />
  ) : (
    <ConfirmPromptArrows
      message="This will end the game. Are you sure?"
      onConfirm={() => process.exit(0)}
      onCancel={onCancel}
    />
  );
}
