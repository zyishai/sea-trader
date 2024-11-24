import React, { useEffect, useState } from "react";
import { Box, DOMElement, measureElement, Text, useInput } from "ink";
import { GameContext } from "./GameContext.js";
import BigText from "ink-big-text";
import { OrderedList, UnorderedList } from "@inkjs/ui";

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

  useInput((input) => {
    if (input.toUpperCase() === "H") {
      actor.send({ type: "HIDE_HELP" });
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
          Sea Trader is a trading simulation game set in the 19th-century Far East. As a maritime merchant, your goal is
          to amass a fortune of $25,000 within 100 days through strategic trading, careful navigation, and shrewd
          decision-making.
        </Text>

        <Text>Game Modes:</Text>
        <OrderedList>
          <OrderedList.Item>
            <Text>Regular Mode: You have 100 days to reach your goal.</Text>
          </OrderedList.Item>
          <OrderedList.Item>
            <Text>Extended Mode: You can play beyond 100 days, but each extra day incurs a score penalty.</Text>
          </OrderedList.Item>
        </OrderedList>

        <Text>Gameplay:</Text>
        <UnorderedList>
          <UnorderedList.Item>
            <Text>Travel between various ports across the Far East.</Text>
          </UnorderedList.Item>
          <UnorderedList.Item>
            <Text>Buy and sell goods to make a profit. Prices vary between ports and over time.</Text>
          </UnorderedList.Item>
          <UnorderedList.Item>
            <Text>Manage your ship&apos;s capacity carefully. Don&apos;t overload your vessel!</Text>
          </UnorderedList.Item>
          <UnorderedList.Item>
            <Text>Upgrade your ship to increase its speed and cargo capacity at shipyards.</Text>
          </UnorderedList.Item>
          <UnorderedList.Item>
            <Text>
              Be prepared for random events during your voyages. These can affect your journey in various ways, both
              positive and negative.
            </Text>
          </UnorderedList.Item>
          <UnorderedList.Item>
            <Text>
              Keep an eye on your ship&apos;s health. Damage can occur during sailing, and repairs are necessary at
              shipyards to maintain your vessel&apos;s condition.
            </Text>
          </UnorderedList.Item>
        </UnorderedList>

        <Text>Controls:</Text>
        <UnorderedList>
          <UnorderedList.Item>
            <Text>Use the arrow keys to navigate menus and make selections.</Text>
          </UnorderedList.Item>
          <UnorderedList.Item>
            <Text>Press Enter to confirm your choices.</Text>
          </UnorderedList.Item>
          <UnorderedList.Item>
            <Text>
              Press Esc at any time to exit the game. Note that your progress will not be saved if you exit early.
            </Text>
          </UnorderedList.Item>
        </UnorderedList>

        <Text>
          <Text>
            Remember, every decision counts! Balance your trades, manage your resources wisely, and navigate carefully
            to become a legendary Sea Trader.
          </Text>
        </Text>
        <Text>
          <Text>Good luck on your maritime adventure!</Text>
        </Text>
        <Box alignSelf="center">
          <Text color="blueBright">Press H to go back</Text>
        </Box>
      </Box>
    </Box>
  );
}
