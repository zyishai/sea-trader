import { usePreferences } from "../../Preferences.js";
import React from "react";
import { Box, Text } from "ink";
import { Badge } from "@inkjs/ui";
import { GameContext } from "../../GameContext.js";
import { Table } from "../Table.js";
import { ActionPrompt as ActionPromptKeyboard } from "../../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../../prompts/arrows/ActionPrompt.js";
import { piratesView } from "../../../store/views/pirates.js";

export function PiratesView() {
  const actor = GameContext.useActorRef();
  const controls = usePreferences().controls;
  const status = GameContext.useSelector((snapshot) => piratesView(snapshot.context));

  const availableActions = [
    { label: "Attack them", value: "attack" },
    { label: "Attempt to flee", value: "flee" },
    { label: "Bribe them with money", value: "bribe" },
  ];
  const onSelectAction = (action: string) => {
    switch (action) {
      case "attack": {
        actor.send({ type: "PIRATES_ENCOUNTER_FIGHT" });
        break;
      }
      case "flee": {
        actor.send({ type: "PIRATES_ENCOUNTER_FLEE" });
        break;
      }
      case "bribe": {
        actor.send({ type: "PIRATES_ENCOUNTER_OFFER" });
        break;
      }
    }
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Badge color="red">PIRATES ENCOUNTERED!</Badge>

      <Text>Captain! A pirate ship has been spotted approaching our vessel!</Text>

      <Box flexDirection="column" borderStyle="single">
        <Text underline>Current Status</Text>
        <Box flexDirection="column" paddingLeft={3}>
          <Table
            rows={[
              ["Ship Health", `${status.shipHealth}%`],
              ["Fleet Size", `${status.fleetSize} Ship${status.fleetSize !== 1 ? "s" : ""}`],
              ["Combat Advantage", `${status.combatAdvantage}%`],
            ]}
          />
        </Box>
      </Box>

      {controls === "keyboard" ? (
        <ActionPromptKeyboard
          message="What is your order, Captain?"
          actions={availableActions.map((action, index) => ({ ...action, key: String(index + 1) }))}
          onSelect={onSelectAction}
        />
      ) : (
        <ActionPromptArrows
          message="What is your order, Captain?"
          actions={availableActions}
          onSelect={onSelectAction}
        />
      )}
    </Box>
  );
}
