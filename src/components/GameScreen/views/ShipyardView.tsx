import React from "react";
import { Box, Text } from "ink";
import { Badge } from "@inkjs/ui";
import { GameContext } from "../../GameContext.js";
import {
  getNextCapacityUpgrade,
  getNextDefenseUpgrade,
  getNextSpeedUpgrade,
  getShipStatus,
} from "../../../store/utils.js";
import { calculateCostForRepair } from "../../../store/utils.js";

export function ShipyardView() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const shipHealth = getShipStatus(context.ship.health);
  const repairCost = calculateCostForRepair(100 - context.ship.health, context);
  const needsRepair = context.ship.health < 100;

  const nextSpeedUpgrade = getNextSpeedUpgrade(context.ship.speed);
  const nextDefenseUpgrade = getNextDefenseUpgrade(context.ship.defense);
  const nextCapacityUpgrade = getNextCapacityUpgrade(context.ship.capacity);

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
        <Text bold>Ship Capabilities:</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>
            Speed: {context.ship.speed} knots{" "}
            {nextSpeedUpgrade && (
              <Text dimColor>
                (Can upgrade to {nextSpeedUpgrade.speed} knots for ${nextSpeedUpgrade.cost})
              </Text>
            )}
          </Text>
          <Text>
            Defense: {context.ship.defense}{" "}
            {nextDefenseUpgrade && (
              <Text dimColor>
                (Can upgrade to {nextDefenseUpgrade.defense} for ${nextDefenseUpgrade.cost})
              </Text>
            )}
          </Text>
          <Text>
            Capacity: {context.ship.capacity} tons{" "}
            {nextCapacityUpgrade && (
              <Text dimColor>
                (Can upgrade to {nextCapacityUpgrade.capacity} tons for ${nextCapacityUpgrade.cost})
              </Text>
            )}
          </Text>
        </Box>
      </Box>

      {/* {!needsRepair && (
        <Box marginTop={1}>
          <Badge color="green">Ship is in perfect condition</Badge>
        </Box>
      )} */}
    </Box>
  );
}
