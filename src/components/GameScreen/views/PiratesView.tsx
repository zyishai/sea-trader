import React from "react";
import { getFleetQuality } from "../../../store/utils.js";
import { Box, Text } from "ink";
import { Badge } from "@inkjs/ui";
import { GameContext } from "../../GameContext.js";
import { calculateGuardEffectiveness } from "../../../store/utils.js";

export function PiratesView() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const guardEffectiveness = calculateGuardEffectiveness(context);
  const fleetQuality = getFleetQuality(context.guardFleet.quality);

  return (
    <Box flexDirection="column" gap={1}>
      <Box>
        <Badge color="red">PIRATES ENCOUNTERED!</Badge>
      </Box>

      <Text>A pirate ship has been spotted approaching your vessel!</Text>

      <Box flexDirection="column" gap={1} marginTop={1}>
        <Text bold>Current Status:</Text>
        <Box flexDirection="column" gap={1} marginLeft={2}>
          <Text>Ship Health: {context.ship.health}%</Text>
          <Text>Guard Ships: {context.guardFleet.ships} ships</Text>
          {context.guardFleet.ships > 0 ? (
            <Text>
              Fleet Quality:{" "}
              <Badge color={fleetQuality === "Basic" ? "gray" : fleetQuality === "Trained" ? "blue" : "magenta"}>
                {fleetQuality}
              </Badge>
            </Text>
          ) : null}
          <Text>Combat Advantage: {Math.round(guardEffectiveness * 100)}%</Text>
        </Box>
      </Box>

      <Box flexDirection="column" gap={1} marginTop={1}>
        <Text bold>Options:</Text>
        <Box flexDirection="column" marginLeft={2} gap={1}>
          <Text>• Fight: Engage the pirates in combat</Text>
          <Text>• Flee: Attempt to outmaneuver them</Text>
          <Text>• Bribe: Offer payment to avoid conflict</Text>
        </Box>
      </Box>
    </Box>
  );
}
