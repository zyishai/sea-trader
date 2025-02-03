import React from "react";
import { Box, Text } from "ink";

export function Columns({
  gap = 3,
  data,
  columns,
}: {
  gap?: number;
  columns: number;
  data: Array<Array<React.ReactNode>>;
}) {
  return (
    <Box gap={gap}>
      {new Array(columns).fill(0).map((_, index) => (
        <Box flexDirection="column" key={index}>
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
