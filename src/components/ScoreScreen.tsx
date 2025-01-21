import { Box, Text, useInput } from "ink";
import React from "react";
import { GameContext } from "./GameContext.js";
import { Badge } from "@inkjs/ui";
import { calculateScore, getNetCash, getShipStatus } from "../store/utils.js";
import { GOAL_DAYS } from "../store/constants.js";

export function ScoreScreen() {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const bankrupcy = context.inOverdraft;
  const shipSank = getShipStatus(context.ship.health) === "Wreckage" && context.day < GOAL_DAYS;
  const score = bankrupcy ? 0 : calculateScore(context);

  useInput((input, key) => {
    if (input.toUpperCase() === "R") {
      actor.send({ type: "RESTART_GAME" });
    } else if (key.escape) {
      process.exit();
    }
  });

  return bankrupcy ? (
    <Box width="100%" height="100%" flexDirection="column" alignItems="center">
      <Box flexDirection="column" borderStyle="round" padding={1} gap={1} minWidth={60}>
        <Badge color="gray">
          <Text color="whiteBright">YOU WENT BANKRUPT!</Text>
        </Badge>
        <Text>You&apos;ve lost everything. Better luck next time!</Text>

        <Box flexGrow={1} justifyContent="center" marginTop={4}>
          <Text color="greenBright">Press R to play again</Text>
        </Box>
      </Box>
    </Box>
  ) : shipSank ? (
    <Box width="100%" height="100%" flexDirection="column" alignItems="center">
      <Box flexDirection="column" borderStyle="round" padding={1} gap={1} minWidth={60}>
        <Badge color="red">
          <Text color="whiteBright">SHIP SANK!</Text>
        </Badge>
        <Text>Your ship sank. You&apos;ve lost the game.</Text>

        <Box flexGrow={1} justifyContent="center" marginTop={4}>
          <Text color="greenBright">Press R to play again</Text>
        </Box>
      </Box>
    </Box>
  ) : (
    <Box width="100%" height="100%" flexDirection="column" alignItems="center">
      <Box flexDirection="column" borderStyle="round" padding={1} gap={1} minWidth={60}>
        <Badge color={context.extendedGame ? "blueBright" : "cyanBright"}>
          {context.extendedGame ? "Extended Game" : "Regular Game"}
        </Badge>
        <Text underline>Game Stats:</Text>
        <Text>
          <Text dimColor>Days Played:</Text> {context.day} days
        </Text>
        <Text>
          <Text dimColor>Net Value:</Text> ${getNetCash(context)}
        </Text>
        <Text>
          <Text dimColor>Ship Capacity:</Text> {context.ship.capacity} picul
        </Text>
        <Text>
          <Text dimColor>Ship Speed:</Text> {context.ship.speed} knots
        </Text>
        <Text inverse>You&apos;ve scored {score} points</Text>
        <Box flexDirection="column" marginTop={2}>
          <Text underline>Your Rating</Text>
          <Box flexDirection="column" borderStyle="round" width={40} gap={1} paddingX={1}>
            <Box justifyContent="space-between" alignItems="center">
              <Text inverse={score >= 30_000}>Admiral </Text>
              <Text>30,000 and over</Text>
            </Box>
            <Box justifyContent="space-between" alignItems="center">
              <Text inverse={score >= 5000 && score < 30_000}>Captain </Text>
              <Text>5,000 to 30,000</Text>
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
