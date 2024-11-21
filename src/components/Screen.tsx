import React, { useLayoutEffect } from "react";
import { Box, useInput, useStdout } from "ink";
import { useScreenSize } from "../hooks/use-screen-size.js";

export function Screen({ children }: React.PropsWithChildren) {
  const { width, height } = useScreenSize();
  const { write } = useStdout();

  useLayoutEffect(() => {
    return () => write("\x1b[?1049l");
  }, [width, height]);

  useInput((input, key) => {
    if (key.escape) {
      process.exit();
    }
  });

  return (
    <Box height={height} width={width} justifyContent="flex-start" alignItems="flex-start">
      {children}
    </Box>
  );
}
