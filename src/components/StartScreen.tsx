import { Box, DOMElement, measureElement, Spacer, Text, useInput } from "ink";
import BigText from "ink-big-text";
import React, { useEffect, useState } from "react";
import { GameContext } from "./GameContext.js";
import { Badge } from "@inkjs/ui";

export function StartScreen() {
  const actor = GameContext.useActorRef();
  const [ref, setRef] = useState<DOMElement | null>(null);
  const [width, setWidth] = useState(0);
  const [extendedGame, setExtendedGame] = useState(false);
  const [disableAnimations, setDisableAnimations] = useState(false);
  const [controls, setControls] = useState<"keyboard" | "arrows">("keyboard");

  useEffect(() => {
    if (ref) {
      const { width } = measureElement(ref);
      setWidth(width);
    }
  }, [ref]);

  useInput((input, key) => {
    if (key.return) {
      actor.send({ type: "START_GAME", settings: { extendedGame, disableAnimations, controls } });
    } else if (input.toUpperCase() === "H") {
      actor.send({ type: "SHOW_HELP" });
    } else if (input.toUpperCase() === "M") {
      setExtendedGame((eg) => !eg);
    } else if (input.toUpperCase() === "A") {
      setDisableAnimations((de) => !de);
    } else if (input.toUpperCase() === "C") {
      setControls((c) => (c === "keyboard" ? "arrows" : "keyboard"));
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
            <Text>[H] Show &quot;How to play&quot; screen</Text>
            <Text>
              [M] Game mode:{" "}
              {extendedGame ? <Badge color="magentaBright">Extended</Badge> : <Badge color="cyan">Classic</Badge>}
            </Text>
            <Text>
              [C] Controls: <Badge color="white">{controls === "keyboard" ? "Keyboard" : "Arrows"}</Badge>
            </Text>
            <Text>
              [A] Game animations:{" "}
              {disableAnimations ? <Badge color="gray">Disabled</Badge> : <Badge color="green">Enabled</Badge>}
            </Text>
            <Text>[Esc] Exit game anytime</Text>
          </Box>
        </Box>
      ) : null}

      <Spacer />
      <Box marginBottom={5}>
        <Text color="greenBright" bold>
          Press ENTER to start your journey
        </Text>
      </Box>
    </Box>
  );
}
