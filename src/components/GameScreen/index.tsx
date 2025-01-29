import React, { useState } from "react";
import { Box, DOMElement, Text, useInput } from "ink";
import { GameContext, TransactionContext } from "../GameContext.js";
import { Divider } from "./Divider.js";
import { Typed } from "./Typed.js";
import { MainView, PiratesView, PortView, InventoryView, MarketView, FleetView, ShipyardView } from "./views/index.js";
import {
  ExitConfirmAction,
  MainActions,
  InventoryAction,
  MarketAction,
  ManageFleetAction,
  ShipyardAction,
  RetireAction,
  BankruptcyAction,
  TravelAction,
} from "./actions/index.js";
import { ActionPrompt as ActionPromptKeyboard } from "../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../prompts/arrows/ActionPrompt.js";

export function Layout({ children }: React.PropsWithChildren) {
  const [ref, setRef] = useState<DOMElement | null>(null);
  return (
    <Box width="100%" flexDirection="column" alignItems="center">
      <Box flexDirection="column" alignItems="stretch" borderStyle="round" padding={1} minWidth={75} ref={setRef}>
        {/* Status Bar (always visible) */}
        <StatusBar />

        <Box marginTop={1} marginBottom={1}>
          <Divider containerRef={ref} />
        </Box>

        <TransactionContext.Provider>
          {/* Main Content Area (with minimum height) */}
          <Box minHeight={15}>{children}</Box>

          <Box marginTop={2} marginBottom={1}>
            <Divider containerRef={ref} />
          </Box>

          {/* Action/Message Area */}
          <Box minHeight={5}>
            <ActionArea />
          </Box>
        </TransactionContext.Provider>
      </Box>
    </Box>
  );
}

function StatusBar() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const nextPriceUpdateIn = context.nextPriceUpdate;
  const nextSeasonIn = context.nextSeasonDay;

  return (
    <Box flexDirection="column" alignItems="center" gap={1}>
      <Box borderTop={false} borderRight={false} borderLeft={false}>
        <Text>Day #{context.day}</Text>
        <Text>
          {" "}
          | Balance: {context.balance < 0 ? "-" : ""}${Math.abs(context.balance)}
        </Text>
        <Text> | Season: {context.currentSeason}</Text>
      </Box>
      <Box>
        <Text dimColor>Prices update in {nextPriceUpdateIn} days</Text>
        <Text dimColor> | Season changes in {nextSeasonIn} days</Text>
      </Box>
    </Box>
  );
}

export function GameScreen() {
  const currentView = getCurrentView();

  return <Layout>{currentView}</Layout>;
}

function getCurrentView() {
  const machine = GameContext.useSelector((snapshot) => snapshot);

  if (machine.matches({ gameScreen: "idle" })) {
    return <MainView />;
  }

  if (machine.matches({ gameScreen: { at_port: "piratesEncountered" } })) {
    return <PiratesView />;
  }

  if (machine.matches({ gameScreen: "at_port" })) {
    return <PortView />;
  }

  if (machine.matches({ gameScreen: "viewing_inventory" })) {
    return <InventoryView />;
  }

  if (machine.matches({ gameScreen: "at_market" })) {
    return <MarketView />;
  }

  if (machine.matches({ gameScreen: "managing_fleet" })) {
    return <FleetView />;
  }

  if (machine.matches({ gameScreen: "at_shipyard" })) {
    return <ShipyardView />;
  }

  return null;
}

function ActionArea() {
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const { context } = snapshot;
  const hasMessages = context.messages && context.messages.length > 0;
  const hasInteractiveEvent = snapshot.matches({ gameScreen: { at_port: { eventOccurred: "multi_choice" } } });

  return (
    <Box flexDirection="column" minHeight={5} padding={1}>
      {hasMessages ? <Messages /> : hasInteractiveEvent ? <InteractiveEvent /> : <Actions />}
    </Box>
  );
}

function Messages() {
  const messages = GameContext.useSelector((snapshot) => snapshot.context.messages);

  if (messages.length === 0) return null;

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="blueBright" inverse>
        {" "}
        NEW MESSAGE{" "}
      </Text>
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

  return <Text dimColor>Press SPACE to continue</Text>;
}

function InteractiveEvent() {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const controls = context.settings.controls;
  const event = context.currentEvent!;

  const onPickChoice = (value: string) => {
    actor.send({ type: "RESOLVE_EVENT", choice: value });
  };

  return controls === "keyboard" ? (
    <ActionPromptKeyboard
      message={event.message}
      actions={event.choices!.map((choice) => ({ label: choice.label, key: choice.key, value: choice.key }))}
      onSelect={onPickChoice}
    />
  ) : (
    <ActionPromptArrows
      message={event.message}
      actions={event.choices!.map((choice) => ({ label: choice.label, value: choice.key }))}
      onSelect={onPickChoice}
    />
  );
}

function Actions() {
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const isAtPort = snapshot.matches({ gameScreen: "at_port" });
  const isAtInventory = snapshot.matches({ gameScreen: "viewing_inventory" });
  const isAtMarket = snapshot.matches({ gameScreen: "at_market" });
  const isManagingFleet = snapshot.matches({ gameScreen: "managing_fleet" });
  const isAtShipyard = snapshot.matches({ gameScreen: "at_shipyard" });
  const isAtRetirement = snapshot.matches({ gameScreen: "at_retirement" });
  const isAtBankruptcy = snapshot.matches({ gameScreen: "at_bankruptcy" });
  const isAtExit = snapshot.matches({ gameScreen: "at_exit" });

  return isAtPort ? (
    <TravelAction />
  ) : isAtInventory ? (
    <InventoryAction />
  ) : isAtMarket ? (
    <MarketAction />
  ) : isManagingFleet ? (
    <ManageFleetAction />
  ) : isAtShipyard ? (
    <ShipyardAction />
  ) : isAtRetirement ? (
    <RetireAction />
  ) : isAtBankruptcy ? (
    <BankruptcyAction />
  ) : isAtExit ? (
    <ExitConfirmAction />
  ) : (
    <MainActions />
  );
}
