import React from "react";
import { Box, Text } from "ink";
import { GameContext } from "../GameContext.js";
import { displayMonetaryValue } from "../../store/utils.js";

// const seasonEmoji: Record<Season, string> = {
//   Spring: "🌸 ",
//   Summer: "☀️ ",
//   Autumn: "🍂 ",
//   Winter: "❄️ ",
// };

export function StatusBar() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);

  return (
    <Box flexDirection="column" alignItems="stretch" gap={1} flexShrink={0} paddingX={1} paddingY={1}>
      <Box flexDirection="column" alignItems="center" flexWrap="nowrap">
        <Text>Day</Text>
        <Text dimColor>{context.day}</Text>
      </Box>
      <Box flexDirection="column" alignItems="center" flexWrap="nowrap">
        <Text>Location</Text>
        <Text inverse dimColor>
          {context.currentPort}
        </Text>
      </Box>
      <Box flexDirection="column" alignItems="center" flexWrap="nowrap">
        <Text>Ship Health</Text>
        <Text dimColor>{context.ship.health}%</Text>
      </Box>
      <Box flexDirection="column" alignItems="center" flexWrap="nowrap">
        <Text>Cash</Text>
        <Text inverse dimColor>
          {displayMonetaryValue(context.balance)}
        </Text>
      </Box>
      <Box flexDirection="column" alignItems="center" flexWrap="nowrap">
        <Text>Reputation</Text>
        <Text dimColor>{context.reputation}</Text>
      </Box>
    </Box>
  );
}
