import React, { useState } from "react";
import { StartScreen } from "./components/StartScreen.js";
import { GameScreen } from "./components/GameScreen/index.js";
import { GameContext } from "./components/GameContext.js";
import { ScoreScreen } from "./components/ScoreScreen.js";
import { HelpScreen } from "./components/HelpScreen.js";
import { gamePhase } from "../game/index.js";
import { PreferencesProvider } from "./components/Preferences.js";

export const App: React.FC = () => (
  <PreferencesProvider>
    <CurrentScreen />
  </PreferencesProvider>
);

function CurrentScreen() {
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
}
