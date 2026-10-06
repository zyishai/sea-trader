import React from "react";
import { Box, Text } from "ink";

type Cell = string | number;
type Alignment = "left" | "right";

interface TableProps {
  header?: Cell[];
  rows: Cell[][];
  footer?: Cell[];
  align?: Alignment[];
  gap?: number;
}

export function Table({ header, rows, footer, align = [], gap = 3 }: TableProps) {
  const allRows = [header, ...rows, footer].filter((row): row is Cell[] => row !== undefined);
  const columnCount = Math.max(...allRows.map((row) => row.length));
  const widths = Array.from({ length: columnCount }, (_, index) =>
    Math.max(...allRows.map((row) => String(row[index] ?? "").length)),
  );
  const tableWidth = widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1);

  const formatRow = (row: Cell[]) =>
    row
      .map((cell, index) =>
        align[index] === "right" ? String(cell).padStart(widths[index]!) : String(cell).padEnd(widths[index]!),
      )
      .join(" ".repeat(gap))
      .trimEnd();

  return (
    <Box flexDirection="column">
      {header ? (
        <Text bold wrap="truncate">
          {formatRow(header)}
        </Text>
      ) : null}
      {rows.map((row, index) => (
        <Text key={index} wrap="truncate">
          {formatRow(row)}
        </Text>
      ))}
      {footer ? (
        <>
          <Text dimColor wrap="truncate">
            {"─".repeat(tableWidth)}
          </Text>
          <Text wrap="truncate">{formatRow(footer)}</Text>
        </>
      ) : null}
    </Box>
  );
}
