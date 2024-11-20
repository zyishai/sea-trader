import React from "react";
import { StartScreen } from "./components/StartScreen.js";
import { GameScreen } from "./components/GameScreen.js";
import { GameContext } from "./components/GameContext.js";
import { MessagesProvider } from "./components/MessagesContext.js";

export const App: React.FC = () => {
  const isStartScreen = GameContext.useSelector((snapshot) => snapshot.matches("introScreen"));
  const isGameScreen = GameContext.useSelector((snapshot) => snapshot.matches("gameScreen"));

  return isStartScreen ? (
    <StartScreen />
  ) : isGameScreen ? (
    <MessagesProvider>
      <GameScreen />
    </MessagesProvider>
  ) : null;
};
