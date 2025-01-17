import React from "react";
import { Box, Text } from "ink";
import { Badge, Alert } from "@inkjs/ui";
import { GameContext } from "../../GameContext.js";
import { calculateDailyMaintenanceCost } from "../../../store/utils.js";

export function FleetView() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const dailyMaintenance = calculateDailyMaintenanceCost(context);
  const daysUntilMaintenance = context.guardFleet.lastMaintenanceDay + 7 - context.day;
  const hasGuards = context.guardFleet.ships > 0;

  return (
    <Box flexDirection="column">
      <Text bold underline>
        Guard Fleet Management
      </Text>

      {context.inOverdraft && <Alert variant="error">Fleet effectiveness is reduced while in overdraft</Alert>}

      <Box flexDirection="column" marginY={1}>
        <Text bold>Current Fleet:</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>
            Ships: <Badge color={hasGuards ? "blue" : "gray"}>{context.guardFleet.ships} ships</Badge>
          </Text>
          <Text>
            Quality: <Badge color={hasGuards ? "cyan" : "gray"}>Level {context.guardFleet.quality}</Badge>
            {context.inOverdraft && <Badge color="red"> (Halved due to overdraft)</Badge>}
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginY={1}>
        <Text bold>Maintenance:</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>Daily Cost: ${dailyMaintenance}</Text>
          {hasGuards && (
            <Text>
              Next Payment:{" "}
              <Badge color={daysUntilMaintenance <= 2 ? "yellow" : "white"}>{daysUntilMaintenance} days</Badge>
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}
