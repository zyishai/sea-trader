import React, { useState } from "react";
import { StartScreen } from "./components/StartScreen.js";
import { GameScreen } from "./components/GameScreen/index.js";
import { GameContext } from "./components/GameContext.js";
import { ScoreScreen } from "./components/ScoreScreen.js";
import { HelpScreen } from "./components/HelpScreen.js";
import { gamePhase } from "./store/views/phase.js";

export const App: React.FC = () => {
  const phase = GameContext.useSelector(gamePhase);
  const [showHelp, setShowHelp] = useState(false);

  if (phase === "idle") {
    return showHelp ? (
      <HelpScreen onClose={() => setShowHelp(false)} />
    ) : (
      <StartScreen onShowHelp={() => setShowHelp(true)} />
    );
  }

  return phase === "ended" ? <ScoreScreen /> : <GameScreen />;
};
