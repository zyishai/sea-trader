import React from "react";
import { Box, Text } from "ink";

export function Columns({
  colGap = 3,
  rowGap,
  data,
  columns,
}: {
  colGap?: number;
  rowGap?: number;
  columns?: number;
  data: Array<Array<React.ReactNode>>;
}) {
  return (
    <Box gap={colGap}>
      {new Array(columns ?? data[0]?.length).fill(0).map((_, index) => (
        <Box flexDirection="column" gap={rowGap} key={index}>
          {data
            .map((item) => item[index])
            .map((value, i) =>
              typeof value === "string" || typeof value === "number" ? <Text key={i}>{value}</Text> : value,
            )}
        </Box>
      ))}
    </Box>
  );
}
