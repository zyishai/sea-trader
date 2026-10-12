import React from "react";
import { Box, Text } from "ink";
import { GameContext } from "../GameContext.js";
import { displayMonetaryValue } from "../../store/utils.js";
import { statusView } from "../../store/views/status.js";

export function StatusBar({ orientation }: { orientation: "vertical" | "horizontal" }) {
  const status = GameContext.useSelector((snapshot) => statusView(snapshot.context));
  const items = [
    {
      label: "Day",
      value: status.voyageLength ? `${status.day} of ${status.voyageLength}` : `${status.day} (extended)`,
    },
    { label: "Season", value: status.season },
    { label: "Location", value: status.port, highlight: true },
    { label: "Ship Health", value: `${status.shipHealth}%` },
    {
      label: "Balance",
      value: displayMonetaryValue(status.balance),
      highlight: true,
      color: status.inOverdraft ? "red" : undefined,
    },
    { label: "Reputation", value: status.reputation },
  ];

  return orientation === "vertical" ? (
    <Box flexDirection="column" alignItems="stretch" gap={1} flexShrink={0} paddingX={1} paddingY={1}>
      {items.map(({ label, value, highlight, color }) => (
        <Box key={label} flexDirection="column" alignItems="center" flexWrap="nowrap">
          <Text>{label}</Text>
          <Text inverse={highlight} dimColor={!color} color={color}>
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
      {items.map(({ label, value, highlight, color }) => (
        <Text key={label} wrap="truncate">
          {label}:{" "}
          <Text inverse={highlight} dimColor={!color} color={color}>
            {value}
          </Text>
        </Text>
      ))}
    </Box>
  );
}
