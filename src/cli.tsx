#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import meow from "meow";
import { App } from "./App.js";
import { GameContext } from "./components/GameContext.js";
import { Screen } from "./components/Screen.js";

const cli = meow(
  `
	Usage
	  $ npx ctrader

	Options
		--name  Your name

	Examples
	  $ ctrader --name=Jane
	  Hello, Jane
`,
  {
    importMeta: import.meta,
    flags: {
      name: {
        type: "string",
        aliases: ["n"],
      },
    },
  },
);

const { clear } = render(
  <GameContext.Provider>
    <Screen>
      <App />
    </Screen>
  </GameContext.Provider>,
  { exitOnCtrlC: process.env.NODE_ENV === "development" },
);

export { clear };
