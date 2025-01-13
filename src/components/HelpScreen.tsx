import React, { useEffect, useState } from "react";
import { Box, DOMElement, measureElement, Text, useInput } from "ink";
import { GameContext } from "./GameContext.js";
import BigText from "ink-big-text";
import { OrderedList, UnorderedList, Badge } from "@inkjs/ui";
import { GOAL_DAYS } from "../store/constants.js";

export function HelpScreen() {
  const actor = GameContext.useActorRef();
  const [ref, setRef] = useState<DOMElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (ref) {
      const { width } = measureElement(ref);
      setWidth(width);
    }
  }, [ref]);

  useInput((input, key) => {
    if (input.toUpperCase() === "H") {
      actor.send({ type: "HIDE_HELP" });
    } else if (key.escape) {
      process.exit();
    }
  });

  return (
    <Box width="100%" height="100%" flexDirection="column" alignItems="center">
      <Box flexDirection="column" marginBottom={1} ref={setRef}>
        <BigText text="How to play" font="simple" />
        <Text>{"-".repeat(width)}</Text>
      </Box>
      <Box flexDirection="column" width={width + 10} gap={1}>
        <Text>
          Sea Trader is a trading simulation set in 1850s Far East. As a merchant captain, you start with a small ship
          and $1000. Your goal is to build a trading empire within {GOAL_DAYS} days.
        </Text>

        <Text bold>Game Modes:</Text>
        <OrderedList>
          <OrderedList.Item>
            <Text>Classic Mode: Complete your journey in {GOAL_DAYS} days</Text>
          </OrderedList.Item>
          <OrderedList.Item>
            <Text>Extended Mode: Continue beyond {GOAL_DAYS} days with score penalties</Text>
          </OrderedList.Item>
        </OrderedList>

        <Text bold>Key Features:</Text>
        <UnorderedList>
          <UnorderedList.Item>
            <Text>
              <Text bold color="blue">
                Trading:
              </Text>{" "}
              Buy low, sell high between 5 major ports. Watch market trends!
            </Text>
          </UnorderedList.Item>
          <UnorderedList.Item>
            <Text>
              <Text bold color="red">
                Pirates:
              </Text>{" "}
              Hire guard ships for protection. They&apos;ll take damage first in combat.
            </Text>
          </UnorderedList.Item>
          <UnorderedList.Item>
            <Text>
              <Text bold color="yellow">
                Ship:
              </Text>{" "}
              Maintain your vessel&apos;s condition. Damaged ships sail slower.
            </Text>
          </UnorderedList.Item>
          <UnorderedList.Item>
            <Text>
              <Text bold color="green">
                Events:
              </Text>{" "}
              Random encounters affect your journey. Stay prepared!
            </Text>
          </UnorderedList.Item>
        </UnorderedList>

        <Text bold>Pro Tips:</Text>
        <UnorderedList>
          <UnorderedList.Item>
            <Text>Each port specializes in different goods - learn the trade routes</Text>
          </UnorderedList.Item>
          <UnorderedList.Item>
            <Text>Guard ships are worth the investment - they protect your cargo</Text>
          </UnorderedList.Item>
          <UnorderedList.Item>
            <Text>Keep your ship repaired - damage affects travel speed</Text>
          </UnorderedList.Item>
          <UnorderedList.Item>
            <Text>Watch your reputation - it affects prices and pirate encounters</Text>
          </UnorderedList.Item>
        </UnorderedList>

        <Text bold>Controls:</Text>
        <UnorderedList>
          <UnorderedList.Item>
            <Text>Use arrow keys or keyboard shortcuts to navigate menus</Text>
          </UnorderedList.Item>
          <UnorderedList.Item>
            <Text>Press Enter to confirm choices</Text>
          </UnorderedList.Item>
          <UnorderedList.Item>
            <Text>Press Space to skip message animations</Text>
          </UnorderedList.Item>
          <UnorderedList.Item>
            <Text>Press Esc to exit game (progress not saved)</Text>
          </UnorderedList.Item>
        </UnorderedList>

        <Box alignSelf="center" marginTop={1}>
          <Text color="blueBright">Press H to return to game</Text>
        </Box>
      </Box>
    </Box>
  );
}
