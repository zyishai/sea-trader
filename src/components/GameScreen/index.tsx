import React, { useState } from "react";
import { Box, DOMElement, Text, useInput } from "ink";
import { Badge } from "@inkjs/ui";
import { GameContext, TransactionContext } from "../GameContext.js";
import { Divider } from "./Divider.js";
import { Typed } from "./Typed.js";
import { getShipStatus } from "../../store/utils.js";
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

export function Layout({ children }: React.PropsWithChildren) {
  const [ref, setRef] = useState<DOMElement | null>(null);
  return (
    <Box width="100%" flexDirection="column" alignItems="center">
      <Box flexDirection="column" alignItems="stretch" borderStyle="round" padding={1} ref={setRef}>
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
  const shipHealth = getShipStatus(context.ship.health);

  return (
    <Box flexDirection="column" gap={1}>
      <Box borderTop={false} borderRight={false} borderLeft={false}>
        <Text>Day: </Text>
        <Text inverse>{context.day.toString().padStart(3, " ")}</Text>
        <Text> | Port: </Text>
        <Text inverse>{context.currentPort}</Text>
        <Text> | Balance: </Text>
        <Text backgroundColor="black" color="whiteBright" inverse={context.balance > 0}>
          {context.balance >= 0 ? `$${context.balance}` : `-$${Math.abs(context.balance)}`}
        </Text>
        {context.balance < 0 && <Badge color="red">OVERDRAWN</Badge>}
        <Text> | Ship: </Text>
        <Badge
          color={
            shipHealth === "Perfect"
              ? "greenBright"
              : shipHealth === "Minor damages"
                ? "yellowBright"
                : shipHealth === "Major damages"
                  ? "redBright"
                  : "gray"
          }
        >
          {shipHealth}
        </Badge>
      </Box>
      <Box>
        <Text>
          Prices update:{" "}
          <Badge color={context.nextPriceUpdate <= 3 ? "yellow" : "white"}>{context.nextPriceUpdate} days</Badge>{" "}
        </Text>
        <Text>
          | Trends update:{" "}
          <Badge color={context.nextTrendUpdate <= 3 ? "yellow" : "white"}>{context.nextTrendUpdate} days</Badge>
        </Text>
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
  const messages = GameContext.useSelector((snapshot) => snapshot.context.messages);
  const hasMessages = messages && messages.length > 0;

  return (
    <Box flexDirection="column" minHeight={5} padding={1}>
      {hasMessages ? <Messages /> : <Actions />}
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
