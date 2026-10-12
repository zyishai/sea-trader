import React from "react";
import { Box, Text } from "ink";
import { useNavigation } from "../Navigation.js";
import { GameContext } from "../../GameContext.js";
import { ActionPrompt as ActionPromptKeyboard } from "../../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../../prompts/arrows/ActionPrompt.js";
import { Table } from "../Table.js";
import { ViewTitle } from "../ViewTitle.js";
import { Port } from "../../../store/catalog/ports.js";
import { displayMonetaryValue } from "../../../store/format.js";
import { travelOptions } from "../../../store/views/travel.js";

export function PortView() {
  const actor = GameContext.useActorRef();
  const { navigate } = useNavigation();
  const controls = GameContext.useSelector((snapshot) => snapshot.context.settings.controls);
  const destinations = GameContext.useSelector((snapshot) => travelOptions(snapshot.context));

  const availableActions = destinations.map(({ port }) => ({ label: port, value: port }));
  const handleSelectPort = (value: string) => {
    actor.send({ type: "TRAVEL_TO", destination: value as Port });
    navigate("menu");
  };

  return (
    <Box flexDirection="column" gap={1} width="100%">
      <ViewTitle text="Port" />

      <Box flexDirection="column" borderStyle="single">
        <Text underline>Available Destinations</Text>
        <Box flexDirection="column" paddingLeft={3}>
          <Table
            gap={2}
            rows={destinations.map(({ port, days, upkeep, arrivalDay, endsVoyage }) => [
              `- ${port}`,
              `${days} day${days !== 1 ? "s" : ""}`,
              `Arrive on day ${arrivalDay}${endsVoyage ? " (last day)" : ""}`,
              upkeep > 0 ? `Upkeep: ${displayMonetaryValue(upkeep)}` : "",
            ])}
          />
        </Box>
      </Box>

      {controls === "keyboard" ? (
        <ActionPromptKeyboard
          message="Where should we sail to, Captain?"
          actions={availableActions.map((action, index) => ({ ...action, key: String(index + 1) }))}
          onSelect={handleSelectPort}
          onCancel={() => navigate("menu")}
        />
      ) : (
        <ActionPromptArrows
          message="Where should we sail to, Captain?"
          actions={availableActions}
          onSelect={handleSelectPort}
          onCancel={() => navigate("menu")}
        />
      )}
    </Box>
  );
}
