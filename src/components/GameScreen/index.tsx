import React from "react";
import { Box, Text, useInput } from "ink";
import { GameContext } from "../GameContext.js";
import { Typed } from "./Typed.js";
import { MainView, PortView, MarketView, ShipyardView, PiratesView } from "./views/index.js";
import { ActionPrompt as ActionPromptKeyboard } from "../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../prompts/arrows/ActionPrompt.js";
import { StatusBar } from "./StatusBar.js";
import { Badge } from "@inkjs/ui";
import { MarketContext } from "./MarketContext.js";
import { ShipyardContext } from "./ShipyardContext.js";

export function Layout({ children }: React.PropsWithChildren) {
  return (
    <Box width="100%" flexDirection="column" alignItems="center">
      <Box alignItems="stretch" borderStyle="round" padding={1} width={75} gap={3}>
        <Box flexGrow={1} flexWrap="nowrap">
          {children}
        </Box>
        <StatusBar />
      </Box>
    </Box>
  );
}

export function GameScreen() {
  return <Layout>{getCurrentView()}</Layout>;
}

function getCurrentView() {
  const machine = GameContext.useSelector((snapshot) => snapshot);
  const hasMessages = machine.context.messages && machine.context.messages.length > 0;
  const hasInteractiveEvent = machine.matches({ gameScreen: { at_port: { eventOccurred: "multi_choice" } } });
  const piratesEncountered = machine.matches({ gameScreen: { at_port: "piratesEncountered" } });

  if (hasMessages) {
    return <Messages />;
  }

  if (piratesEncountered) {
    return <PiratesView />;
  }

  if (hasInteractiveEvent) {
    return <InteractiveEvent />;
  }

  if (machine.matches({ gameScreen: "menu" })) {
    return <MainView />;
  }

  if (machine.matches({ gameScreen: "at_port" })) {
    return <PortView />;
  }

  if (machine.matches({ gameScreen: "at_market" })) {
    return (
      <MarketContext.Provider>
        <MarketView />
      </MarketContext.Provider>
    );
  }

  if (machine.matches({ gameScreen: "at_shipyard" })) {
    return (
      <ShipyardContext.Provider>
        <ShipyardView />
      </ShipyardContext.Provider>
    );
  }

  return null;
}

function Messages() {
  const messages = GameContext.useSelector((snapshot) => snapshot.context.messages);

  if (messages.length === 0) return null;

  return (
    <Box flexDirection="column" gap={1}>
      <Badge color="blueBright">Message</Badge>
      {messages[0]?.reduceRight((el, message) => <Typed text={message}>{el}</Typed>, <ContinueMessage />)}
    </Box>
  );
}

function ContinueMessage() {
  const actor = GameContext.useActorRef();

  useInput((input) => {
    if (input === " ") {
      actor.send({ type: "MSG_ACK" });
    }
  });

  return <Text dimColor>Press [SPACE] to continue</Text>;
}

function InteractiveEvent() {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const controls = context.settings.controls;
  const event = context.currentEvent!;

  const onPickChoice = (value: string) => {
    actor.send({ type: "RESOLVE_EVENT", choice: value });
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Badge color="greenBright">Event</Badge>
      {controls === "keyboard" ? (
        <ActionPromptKeyboard
          message={event.message}
          actions={event.choices!.map((choice, index) => ({
            label: choice.label,
            key: String(index + 1),
            value: choice.key,
          }))}
          onSelect={onPickChoice}
        />
      ) : (
        <ActionPromptArrows
          message={event.message}
          actions={event.choices!.map((choice) => ({ label: choice.label, value: choice.key }))}
          onSelect={onPickChoice}
        />
      )}
    </Box>
  );
}
