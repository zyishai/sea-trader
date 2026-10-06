import React from "react";
import { Box, Text } from "ink";
import { GameContext } from "../GameContext.js";
import { displayMonetaryValue } from "../../store/utils.js";

export function StatusBar({ orientation }: { orientation: "vertical" | "horizontal" }) {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const items = [
    { label: "Day", value: context.day },
    { label: "Location", value: context.currentPort, highlight: true },
    { label: "Ship Health", value: `${context.ship.health}%` },
    { label: "Cash", value: displayMonetaryValue(context.balance), highlight: true },
    { label: "Reputation", value: context.reputation },
  ];

  return orientation === "vertical" ? (
    <Box flexDirection="column" alignItems="stretch" gap={1} flexShrink={0} paddingX={1} paddingY={1}>
      {items.map(({ label, value, highlight }) => (
        <Box key={label} flexDirection="column" alignItems="center" flexWrap="nowrap">
          <Text>{label}</Text>
          <Text inverse={highlight} dimColor>
            {value}
          </Text>
        </Box>
      ))}
    </Box>
  ) : (
    <Box
      justifyContent="space-between"
      flexWrap="wrap"
      columnGap={2}
      flexShrink={0}
      borderStyle="single"
      borderTop={false}
      borderLeft={false}
      borderRight={false}
      borderDimColor
    >
      {items.map(({ label, value, highlight }) => (
        <Text key={label} wrap="truncate">
          {label}:{" "}
          <Text inverse={highlight} dimColor>
            {value}
          </Text>
        </Text>
      ))}
    </Box>
  );
}
