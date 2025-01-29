import React from "react";
import { Box, Text } from "ink";
import { getNetCash, getShipStatus } from "../../../store/utils.js";
import { GameContext } from "../../GameContext.js";
import { OVERDRAFT_TRADING_LIMIT } from "../../../store/constants.js";

export function MainView() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const netWorth = getNetCash(context);
  const shipStatus = getShipStatus(context.ship.health);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Crew Overview</Text>
      <Text>
        <Text underline>Current Port</Text>: {context.currentPort}
      </Text>
      <Text>
        <Text underline>Net Worth</Text>: {netWorth < 0 ? "-" : ""}${Math.abs(netWorth)}
      </Text>
      <Text>
        <Text underline>Cash</Text>: {context.balance < 0 ? "-" : ""}${Math.abs(context.balance)}
      </Text>
      {context.inOverdraft && (
        <Text color="red">⚠️ In Overdraft - Trading limited to ${context.balance + OVERDRAFT_TRADING_LIMIT}</Text>
      )}
      <Text>
        <Text underline>Ship Status</Text>: {shipStatus}
      </Text>
    </Box>
  );
}
