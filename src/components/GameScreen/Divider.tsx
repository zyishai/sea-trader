import React, { useState, useEffect } from "react";
import { Text, Box, DOMElement, measureElement } from "ink";

const dividerChar = "─";

export function Divider({ containerRef }: { containerRef: DOMElement | null }) {
  const [width, setWidth] = useState(0);

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
