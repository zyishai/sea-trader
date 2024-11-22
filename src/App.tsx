import React from "react";
import { StartScreen } from "./components/StartScreen.js";
import { GameScreen } from "./components/GameScreen.js";
import { GameContext } from "./components/GameContext.js";
import { MessagesProvider } from "./components/MessagesContext.js";
import { ScoreScreen } from "./components/ScoreScreen.js";
import { HelpScreen } from "./components/HelpScreen.js";

export const App: React.FC = () => {
  const isStartScreen = GameContext.useSelector((snapshot) => snapshot.matches("introScreen"));
  const isGameScreen = GameContext.useSelector((snapshot) => snapshot.matches("gameScreen"));
  const isScoreScreen = GameContext.useSelector((snapshot) => snapshot.matches("scoringScreen"));
  const isHelpScreen = GameContext.useSelector((snapshot) => snapshot.matches("helpScreen"));

  return isStartScreen ? (
    <StartScreen />
  ) : isGameScreen ? (
    <MessagesProvider>
      <GameScreen />
    </MessagesProvider>
  ) : isScoreScreen ? (
    <ScoreScreen />
  ) : isHelpScreen ? (
    <HelpScreen />
  ) : null;
};
