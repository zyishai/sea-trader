import React from "react";
import { Box, Text } from "ink";
import { GameContext } from "../../GameContext.js";
import { ports } from "../../../store/constants.js";
import { assert } from "node:console";
import { Port } from "../../../store/types.js";
import { ActionPrompt as ActionPromptKeyboard } from "../../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../../prompts/arrows/ActionPrompt.js";
import { ExitGame } from "../ExitGame.js";

export function TravelAction() {
  const actor = GameContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const { context } = snapshot;
  const controls = context.settings.controls;
  const isPiratesEncounter = snapshot.matches({ gameScreen: { at_port: "piratesEncountered" } });

  const handleSelectPort = (value: string) => {
    assert(ports.includes(value as Port), "Invalid port");
    actor.send({ type: "TRAVEL_TO", destination: value as Port });
  };

  const handleSelectPiratesEncounterAction = (value: string) => {
    if (value === "1") {
      actor.send({ type: "PIRATES_ENCOUNTER_FIGHT" });
    } else if (value === "2") {
      actor.send({ type: "PIRATES_ENCOUNTER_FLEE" });
    } else if (value === "3") {
      actor.send({ type: "PIRATES_ENCOUNTER_OFFER" });
    }
  };

  return isPiratesEncounter ? (
    <Box display="flex" flexDirection="column" gap={1}>
      <Text underline>{context.currentPort}&apos;s Port</Text>
      {controls === "keyboard" ? (
        <ActionPromptKeyboard
          message="The pirates are approaching your ship! Make your choice:"
          actions={[
            { label: "Attack them", value: "1", key: "1" },
            { label: "Attempt to flee", value: "2", key: "2" },
            { label: "Bribe them with money", value: "3", key: "3" },
          ]}
          onSelect={handleSelectPiratesEncounterAction}
        />
      ) : (
        <ActionPromptArrows
          message="The pirates are approaching your ship! Make your choice:"
          actions={[
            { label: "Attack them", value: "1" },
            { label: "Attempt to flee", value: "2" },
            { label: "Bribe them with money", value: "3" },
          ]}
          onSelect={handleSelectPiratesEncounterAction}
        />
      )}
      <ExitGame />
    </Box>
  ) : (
    <Box display="flex" flexDirection="column" gap={1}>
      <Text underline>{context.currentPort}&apos;s Port</Text>
      {controls === "keyboard" ? (
        <ActionPromptKeyboard
          message="Where would you like to go?"
          actions={context.availablePorts.map((port, index) => ({ label: port, value: port, key: String(index + 1) }))}
          onSelect={handleSelectPort}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : (
        <ActionPromptArrows
          message="Where would you like to go?"
          actions={context.availablePorts.map((port) => ({ label: port, value: port }))}
          onSelect={handleSelectPort}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      )}
    </Box>
  );
}
