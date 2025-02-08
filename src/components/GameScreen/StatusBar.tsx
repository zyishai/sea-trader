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
      <Box flexDirection="column" alignItems="stretch" flexWrap="nowrap">
        <Text>Day</Text>
        <Text inverse>{context.day}</Text>
      </Box>
      <Box flexDirection="column" alignItems="stretch" flexWrap="nowrap">
        <Text>Location</Text>
        <Text inverse>{context.currentPort}</Text>
      </Box>
      <Box flexDirection="column" alignItems="stretch" flexWrap="nowrap">
        <Text>Cash</Text>
        <Text inverse>{displayMonetaryValue(context.balance)}</Text>
      </Box>
      <Box flexDirection="column" alignItems="stretch" flexWrap="nowrap">
        <Text>Reputation</Text>
        <Text inverse>{context.reputation}</Text>
      </Box>
    </Box>
  );
}
