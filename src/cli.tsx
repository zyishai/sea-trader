#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { App } from "./terminal/App.js";
import { GameContext } from "./terminal/components/GameContext.js";
import { Screen } from "./terminal/components/Screen.js";
import { createInputStream, enterFullScreen, exitFullScreen } from "./terminal/terminal.js";

enterFullScreen(process.stdout);

const { clear, unmount } = render(
  <GameContext.Provider>
    <Screen>
      <App />
    </Screen>
  </GameContext.Provider>,
  { stdin: createInputStream(process.stdin), exitOnCtrlC: process.env.NODE_ENV === "development" },
);

// Unmount first so Ink's final frame is drawn before the original screen is restored.
process.on("exit", () => {
  unmount();
  exitFullScreen(process.stdout);
});

export { clear };
