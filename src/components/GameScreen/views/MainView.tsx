import React from "react";
import { Box, Text } from "ink";
import { getNetCash } from "../../../store/utils.js";
import { GameContext } from "../../GameContext.js";

export function MainView() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const netWorth = getNetCash(context);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Current Status:</Text>
      <Text>Net Worth: {netWorth < 0 ? `-$${Math.abs(netWorth)}` : `$${netWorth}`}</Text>
      {context.extendedGame && <Text>Days Played: {context.day} (Extended Mode)</Text>}
    </Box>
  );
}
