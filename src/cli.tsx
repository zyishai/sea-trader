#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import meow from "meow";
import { enterFullscreen, exitFullscreen } from "./utils/terminal.js";
import { App } from "./App.js";

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

enterFullscreen();
const { clear, waitUntilExit } = render(<App />, { exitOnCtrlC: process.env.NODE_ENV === "development" });
waitUntilExit().then(() => exitFullscreen());

export { clear };
