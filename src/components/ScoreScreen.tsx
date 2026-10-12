import { Box, Text, useInput } from "ink";
import React from "react";
import { GameContext } from "./GameContext.js";
import { Badge } from "@inkjs/ui";
import { displayMonetaryValue } from "../store/format.js";
import { RANKS, voyageResult } from "../store/views/voyage-result.js";

export function ScoreScreen() {
  const actor = GameContext.useActorRef();
  const result = GameContext.useSelector((snapshot) => voyageResult(snapshot.context));

  useInput((input, key) => {
    if (input.toUpperCase() === "R") {
      actor.send({ type: "RESTART_GAME" });
    } else if (key.escape) {
      process.exit();
    }
  });

  return result.end === "bankrupt" || result.end === "declaredBankrupt" ? (
    <Box width="100%" flexGrow={1} flexDirection="column" alignItems="center">
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
  ) : result.end === "shipwrecked" ? (
    <Box width="100%" flexGrow={1} flexDirection="column" alignItems="center">
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
    <Box width="100%" flexGrow={1} flexDirection="column" alignItems="center">
      <Box flexDirection="column" borderStyle="round" padding={1} gap={1} minWidth={60}>
        <Badge color={result.extendedGame ? "blueBright" : "cyanBright"}>
          {result.extendedGame ? "Extended Game" : "Regular Game"}
        </Badge>
        <Text underline>Game Stats:</Text>
        <Text>
          <Text dimColor>Days Played:</Text> {result.day} days
        </Text>
        <Text>
          <Text dimColor>Net Worth:</Text> {displayMonetaryValue(result.netWorth)}
        </Text>
        <Text>
          <Text dimColor>Ship Capacity:</Text> {result.capacity} picul
        </Text>
        <Text>
          <Text dimColor>Ship Speed:</Text> {result.speed} knots
        </Text>
        <Text inverse>You&apos;ve scored {result.score} points</Text>
        <Box flexDirection="column" marginTop={2}>
          <Text underline>Your Rating</Text>
          <Box flexDirection="column" borderStyle="round" width={40} gap={1} paddingX={1}>
            {RANKS.map(({ title, minScore }, index) => {
              const nextMinScore = RANKS[index - 1]?.minScore;
              return (
                <Box key={title} justifyContent="space-between" alignItems="center">
                  <Text inverse={result.rank === title}>{title} </Text>
                  <Text>
                    {nextMinScore === undefined
                      ? `${minScore.toLocaleString("en-US")} and over`
                      : minScore === -Infinity
                        ? `Less than ${nextMinScore.toLocaleString("en-US")}`
                        : `${minScore.toLocaleString("en-US")} to ${nextMinScore.toLocaleString("en-US")}`}
                  </Text>
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box flexGrow={1} justifyContent="center" marginTop={2}>
          <Text color="greenBright">Press R to play again</Text>
        </Box>
      </Box>
    </Box>
  );
}
