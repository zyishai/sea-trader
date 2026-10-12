import React, { useState, useEffect } from "react";
import { Text, Box, DOMElement, measureElement } from "ink";

const dividerChar = "─";

export function Divider({ containerRef, length }: { containerRef?: DOMElement | null; length?: number }) {
  const [width, setWidth] = useState(length ?? 0);

  useEffect(() => {
    if (containerRef) {
      const output = measureElement(containerRef);
      setWidth(output.width);
    }
  }, [containerRef]);

  return (
    <Box>
      <Text>{dividerChar.repeat(width)}</Text>
    </Box>
  );
}
