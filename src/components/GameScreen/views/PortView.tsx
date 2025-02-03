import React from "react";
import { Box, Text } from "ink";
import { GameContext } from "../../GameContext.js";
import { Port } from "../../../store/types.js";
import { ports } from "../../../store/constants.js";
import { calculateTravelTime, calculateDailyMaintenanceCost, displayMonetaryValue } from "../../../store/utils.js";
import { ActionPrompt as ActionPromptKeyboard } from "../../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../../prompts/arrows/ActionPrompt.js";
import { Columns } from "../Columns.js";
import assert from "node:assert";
import figlet from "figlet";

export function PortView() {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const hasFleet = context.guardFleet.ships > 0;
  const controls = context.settings.controls;

  const availableActions = context.availablePorts.map((port) => ({
    label: port,
    value: port,
  }));
  const handleSelectPort = (value: string) => {
    assert(ports.includes(value as Port), "Invalid port");
    actor.send({ type: "TRAVEL_TO", destination: value as Port });
  };

  return (
    <Box flexDirection="column" gap={1} width="100%">
      <Text>{figlet.textSync("Port")}</Text>

      <Box flexDirection="column" borderStyle="single">
        <Text bold>Available Destinations</Text>
        <Box flexDirection="column" paddingLeft={3}>
          <Columns
            columns={3}
            data={context.availablePorts.map((port) => {
              const travelTime = calculateTravelTime(port, context);
              const dailyCost = calculateDailyMaintenanceCost(context);
              const maintenanceCost = dailyCost * travelTime;
              return [
                port,
                `Travel: ${travelTime} days`,
                hasFleet ? `Maintenance: ${displayMonetaryValue(maintenanceCost)}` : "",
              ];
            })}
          />
        </Box>
      </Box>

      {controls === "keyboard" ? (
        <ActionPromptKeyboard
          message="Where should we sail to, captain?"
          actions={availableActions.map((action, index) => ({ ...action, key: String(index + 1) }))}
          onSelect={handleSelectPort}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : (
        <ActionPromptArrows
          message="Where should we sail to, captain?"
          actions={availableActions}
          onSelect={handleSelectPort}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      )}
    </Box>
  );
}
