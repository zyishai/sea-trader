#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { App } from "./App.js";
import { GameContext } from "./components/GameContext.js";
import { Screen } from "./components/Screen.js";

const { clear } = render(
  <GameContext.Provider>
    <Screen>
      <App />
    </Screen>
  </GameContext.Provider>,
  { exitOnCtrlC: process.env.NODE_ENV === "development" },
);

export { clear };
