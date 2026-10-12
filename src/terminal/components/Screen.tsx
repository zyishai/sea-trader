import React from "react";
import { Box, Text } from "ink";
import { useScreenSize } from "../hooks/use-screen-size.js";
import { MIN_SCREEN_HEIGHT, MIN_SCREEN_WIDTH } from "./layout.js";
import { Viewport } from "./Viewport.js";

export function Screen({ children }: React.PropsWithChildren) {
  const { width, height } = useScreenSize();
  const isTooSmall = width < MIN_SCREEN_WIDTH || height < MIN_SCREEN_HEIGHT;

  return (
    <Box height={height} width={width} flexDirection="column">
      {isTooSmall ? <TerminalTooSmall width={width} height={height} /> : null}
      <Box display={isTooSmall ? "none" : "flex"} width="100%">
        <Viewport height={height}>{children}</Viewport>
      </Box>
    </Box>
  );
}

function TerminalTooSmall({ width, height }: { width: number; height: number }) {
  return (
    <Box flexGrow={1} flexDirection="column" alignItems="center" justifyContent="center" gap={1}>
      <Text bold>Your terminal window is too small</Text>
      <Text>
        Current size: {width}×{height} · Needed: {MIN_SCREEN_WIDTH}×{MIN_SCREEN_HEIGHT}
      </Text>
      <Text dimColor>Enlarge the window or zoom out to keep playing.</Text>
    </Box>
  );
}
