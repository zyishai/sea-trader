import React from "react";
import { Box, Text } from "ink";
import { GameContext } from "../../GameContext.js";
import { calculateTravelTime } from "../../../store/utils.js";
import { calculateDailyMaintenanceCost } from "../../../store/utils.js";

export function PortView() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const availablePorts = context.availablePorts;

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold underline>
        {context.currentPort}
      </Text>
      <Text>Available Destinations:</Text>

      {availablePorts.map((port, index) => {
        const travelTime = calculateTravelTime(port, context);
        const dailyCost = calculateDailyMaintenanceCost(context);
        const maintenanceCost = dailyCost * travelTime;

        return (
          <Box key={port} flexDirection="column">
            <Text bold>
              {index + 1}. {port}
            </Text>
            <Text>{"─".repeat(30)}</Text>
            <Box flexDirection="column" marginLeft={2}>
              <Text>Travel Time: {travelTime} days</Text>
              {context.guardFleet.ships > 0 && <Text>Fleet Maintenance Cost: ${maintenanceCost}</Text>}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
