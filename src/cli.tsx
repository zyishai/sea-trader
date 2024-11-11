#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import meow from "meow";
import { enterFullscreen, exitFullscreen } from "./utils/terminal.js";
import { App } from "./App.js";

const cli = meow(
  `
	Usage
	  $ demo-ink

	Options
		--name  Your name

	Examples
	  $ demo-ink --name=Jane
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
const { waitUntilExit } = render(<App name={cli.flags.name} />, { exitOnCtrlC: false });
// waitUntilExit().then(() => exitFullscreen());

// export { clear };
