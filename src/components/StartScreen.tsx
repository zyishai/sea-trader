import { Box, DOMElement, measureElement, Spacer, Text, useInput } from "ink";
import BigText from "ink-big-text";
import React, { useEffect, useState } from "react";
import { GameContext } from "./GameContext.js";

export function StartScreen() {
  const actor = GameContext.useActorRef();
  const [ref, setRef] = useState<DOMElement | null>(null);
  const [width, setWidth] = useState(0);
  const [extendedGame, setExtendedGame] = useState(false);

  useEffect(() => {
    if (ref) {
      const { width } = measureElement(ref);
      setWidth(width);
    }
  }, [ref]);

  useInput((input, key) => {
    if (key.return) {
      actor.send({ type: "START_GAME", extended: extendedGame });
    } else if (input.toUpperCase() === "H") {
      // TODO - show "how to play"
    } else if (input.toUpperCase() === "M") {
      setExtendedGame((eg) => !eg);
    }
  });

  return (
    <Box width="100%" height="100%" flexDirection="column" alignItems="center">
      <Box flexDirection="column" marginTop={6} ref={setRef}>
        <BigText text="Sea Trader" font="simple" />
        <Text>{"-".repeat(width)}</Text>
      </Box>

      {width > 0 ? (
        <Box flexDirection="column" width={width} marginY={2}>
          <Text>
            The year is 1850. As a daring merchant in the Far East, your wits and courage will be tested on the high
            seas. Trade wisely, sail bravely, and forge your path to glory!
          </Text>
          <Box flexDirection="column" gap={1} marginTop={2}>
            <Text>Options:</Text>
            <Text>[H] How to play</Text>
            <Text>
              [M] Game mode:{" "}
              <Text color="grayBright" inverse>
                {extendedGame ? "Extended" : "Regular"}
              </Text>
            </Text>
            <Text>[Esc] Exit game anytime</Text>
          </Box>
        </Box>
      ) : null}

      <Spacer />
      <Box marginBottom={5}>
        <Text color="greenBright">Press ENTER to start your journey</Text>
      </Box>
    </Box>
  );
}
