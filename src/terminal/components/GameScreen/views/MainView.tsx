import { usePreferences } from "../../Preferences.js";
import React from "react";
import { Box, Text } from "ink";
import { GameContext } from "../../GameContext.js";
import { ActionPrompt as ActionPromptKeyboard } from "../../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../../prompts/arrows/ActionPrompt.js";
import { ViewTitle } from "../ViewTitle.js";
import { useMachine } from "@xstate/react";
import { ConfirmPrompt as ConfirmPromptKeyboard } from "../../prompts/keyboard/ConfirmPrompt.js";
import { ConfirmPrompt as ConfirmPromptArrows } from "../../prompts/arrows/ConfirmPrompt.js";
import { menuMachine } from "../../flows/menu.js";
import { mainMenuView } from "../../../../game/index.js";
import { useNavigation } from "../Navigation.js";

export function MainView() {
  const controls = usePreferences().controls;
  const { canRetire, canDeclareBankruptcy, stranded } = GameContext.useSelector((snapshot) =>
    mainMenuView(snapshot.context),
  );
  const [snapshot, send] = useMachine(menuMachine);
  const { navigate } = useNavigation();

  const availableActions = [
    { label: "Go to Port", value: "go_to_port" },
    { label: "Visit Market", value: "visit_market" },
    { label: "Visit Shipyard", value: "visit_shipyard" },
    { label: "Retire", value: "retire", disabled: !canRetire },
    { label: "Declare bankruptcy", value: "declare_bankruptcy", disabled: !canDeclareBankruptcy },
  ];
  const handleSelectAction = (value: string) => {
    switch (value) {
      case "go_to_port": {
        navigate("port");
        break;
      }
      case "visit_market": {
        navigate("market");
        break;
      }
      case "visit_shipyard": {
        navigate("shipyard");
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
      <ViewTitle text="Sea Trader" />

      {stranded ? (
        <Text color="yellow">
          We have no cargo and too little money to buy anything, Captain. We can declare bankruptcy and end the voyage.
        </Text>
      ) : null}

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
  const controls = usePreferences().controls;

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
  const controls = usePreferences().controls;

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
  const controls = usePreferences().controls;

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
