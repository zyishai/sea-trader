import React from "react";
import { Box, Text } from "ink";
import { Badge } from "@inkjs/ui";
import { GameContext } from "../../GameContext.js";
import { getShipStatus } from "../../../store/utils.js";
import { calculateCostForRepair } from "../../../store/utils.js";
import { MAX_SHIP_SPEED, SPEED_UPGRADE_INCREMENT } from "../../../store/constants.js";

export function ShipyardView() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const shipHealth = getShipStatus(context.ship.health);
  const repairCost = calculateCostForRepair(100 - context.ship.health, context);
  const needsRepair = context.ship.health < 100;

  return (
    <Box flexDirection="column">
      <Text bold underline>
        Shipyard
      </Text>

      <Box flexDirection="column" marginY={1}>
        <Text bold>Ship Condition:</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>
            Health:{" "}
            <Badge
              color={
                shipHealth === "Perfect"
                  ? "greenBright"
                  : shipHealth === "Minor damages"
                    ? "yellowBright"
                    : shipHealth === "Major damages"
                      ? "redBright"
                      : "gray"
              }
            >
              {context.ship.health}% ({shipHealth})
            </Badge>
          </Text>

          {needsRepair && <Text>Repair Cost: ${repairCost}</Text>}
        </Box>
      </Box>

      <Box flexDirection="column" marginY={1}>
        <Text bold>Ship Details:</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>Cargo Capacity: {context.ship.capacity} picul</Text>
          <Text>Base Speed: {context.ship.speed} knots</Text>
          {context.ship.speed < MAX_SHIP_SPEED && (
            <Text dimColor>(Can be upgraded to {context.ship.speed + SPEED_UPGRADE_INCREMENT} knots)</Text>
          )}
        </Box>
      </Box>

      {!needsRepair && (
        <Box marginTop={1}>
          <Badge color="green">Ship is in perfect condition</Badge>
        </Box>
      )}
    </Box>
  );
}
