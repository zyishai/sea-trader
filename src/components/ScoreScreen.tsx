import { Box, Text, useInput } from "ink";
import React from "react";
import { GameContext } from "./GameContext.js";
import { Badge } from "@inkjs/ui";
import { calculateScore, getNetCash } from "../store/store.js";

export function ScoreScreen() {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const score = calculateScore(context);

  useInput((input) => {
    if (input.toUpperCase() === "R") {
      actor.send({ type: "RESTART_GAME" });
    }
  });

  return (
    <Box width="100%" height="100%" flexDirection="column" alignItems="center">
      <Box flexDirection="column" borderStyle="round" padding={1} gap={1} minWidth={60}>
        <Badge color={context.extendedGame ? "blueBright" : "cyanBright"}>
          {context.extendedGame ? "Extended Game" : "Regular Game"}
        </Badge>
        <Text underline>Game stats:</Text>
        <Text>
          <Text dimColor>Days played:</Text> {context.day} days
        </Text>
        <Text>
          <Text dimColor>Net value:</Text> ${getNetCash(context)}
        </Text>
        <Text>
          <Text dimColor>Ship size:</Text> {context.ship.capacity} Tons
        </Text>
        <Text inverse>Total score is {score}.</Text>
        <Box flexDirection="column" marginTop={2}>
          <Text underline>Your Rating</Text>
          <Box flexDirection="column" borderStyle="round" width={40} gap={1} paddingX={1}>
            <Box justifyContent="space-between" alignItems="center">
              <Text inverse={score >= 6000}>Admiral </Text>
              <Text>6,000 and over</Text>
            </Box>
            <Box justifyContent="space-between" alignItems="center">
              <Text inverse={score >= 5000 && score < 6000}>Captain </Text>
              <Text>5,000 to 5,999</Text>
            </Box>
            <Box justifyContent="space-between" alignItems="center">
              <Text inverse={score < 5000}>Mate </Text>
              <Text>Less than 5,000</Text>
            </Box>
          </Box>
        </Box>

        <Box flexGrow={1} justifyContent="center" marginTop={2}>
          <Text color="greenBright">Press R to play again</Text>
        </Box>
      </Box>
    </Box>
  );
}
