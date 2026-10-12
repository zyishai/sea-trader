import React from "react";
import { Box, Text, useInput } from "ink";
import { GameContext } from "../GameContext.js";
import { Typed } from "./Typed.js";
import { CargoOfferView, MainView, PortView, MarketView, ShipyardView, PiratesView } from "./views/index.js";
import { ActionPrompt as ActionPromptKeyboard } from "../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../prompts/arrows/ActionPrompt.js";
import { StatusBar } from "./StatusBar.js";
import { NavigationProvider, useNavigation } from "./Navigation.js";
import { gamePhase } from "../../store/views/phase.js";
import { Badge } from "@inkjs/ui";
import { MarketContext } from "./MarketContext.js";
import { ShipyardContext } from "./ShipyardContext.js";
import { useScreenSize } from "../../hooks/use-screen-size.js";
import { MAX_PANEL_WIDTH, SIDEBAR_LAYOUT_MIN_WIDTH } from "../layout.js";
import { eventView } from "../../store/views/event.js";

export function Layout({ children }: React.PropsWithChildren) {
  const { width } = useScreenSize();
  const hasSidebar = width >= SIDEBAR_LAYOUT_MIN_WIDTH;

  return (
    <Box width="100%" flexDirection="column" alignItems="center">
      <Box
        flexDirection={hasSidebar ? "row" : "column"}
        alignItems="stretch"
        borderStyle="round"
        padding={1}
        width={Math.min(width, MAX_PANEL_WIDTH)}
        gap={hasSidebar ? 3 : 1}
      >
        {hasSidebar ? null : <StatusBar orientation="horizontal" />}
        <Box flexGrow={1} flexShrink={1} flexWrap="nowrap">
          {children}
        </Box>
        {hasSidebar ? <StatusBar orientation="vertical" /> : null}
      </Box>
    </Box>
  );
}

export function GameScreen() {
  return (
    <NavigationProvider>
      <Layout>
        <CurrentView />
      </Layout>
    </NavigationProvider>
  );
}

function CurrentView() {
  const phase = GameContext.useSelector(gamePhase);
  const { screen, noticesSeen } = useNavigation();
  const hasMessages = GameContext.useSelector((snapshot) => snapshot.context.notices.length > noticesSeen);
  const hasInteractiveEvent = phase === "event";
  const piratesEncountered = phase === "encounter";
  const hasCargoOffer = phase === "cargoOffer";

  if (hasMessages) {
    return <Messages />;
  }

  if (piratesEncountered) {
    return <PiratesView />;
  }

  if (hasInteractiveEvent) {
    return <InteractiveEvent />;
  }

  if (hasCargoOffer) {
    return <CargoOfferView />;
  }

  if (screen === "menu") {
    return <MainView />;
  }

  if (screen === "port") {
    return <PortView />;
  }

  if (screen === "market") {
    return (
      <MarketContext.Provider>
        <MarketView />
      </MarketContext.Provider>
    );
  }

  if (screen === "shipyard") {
    return (
      <ShipyardContext.Provider>
        <ShipyardView />
      </ShipyardContext.Provider>
    );
  }

  return null;
}

function Messages() {
  const { noticesSeen } = useNavigation();
  const notice = GameContext.useSelector((snapshot) => snapshot.context.notices[noticesSeen]);

  if (!notice) return null;

  return (
    <Box key={noticesSeen} flexDirection="column" gap={1}>
      <Badge color="blueBright">Message</Badge>
      {notice.reduceRight<React.ReactNode>(
        (el, line) => (
          <Typed text={line}>{el}</Typed>
        ),
        <ContinueMessage />,
      )}
    </Box>
  );
}

function ContinueMessage() {
  const { markNoticeSeen } = useNavigation();

  useInput((input) => {
    if (input === " ") {
      markNoticeSeen();
    }
  });

  return <Text dimColor>Press [SPACE] to continue</Text>;
}

function InteractiveEvent() {
  const actor = GameContext.useActorRef();
  const controls = GameContext.useSelector((snapshot) => snapshot.context.settings.controls);
  const event = GameContext.useSelector((snapshot) => eventView(snapshot.context));

  const onPickChoice = (value: string) => {
    actor.send({ type: "RESOLVE_EVENT", choice: value });
  };

  if (!event) return null;

  return (
    <Box flexDirection="column" gap={1}>
      <Badge color="greenBright">Event</Badge>
      {controls === "keyboard" ? (
        <ActionPromptKeyboard
          message={event.message}
          actions={event.choices.map((choice, index) => ({
            label: choice.label,
            key: String(index + 1),
            value: choice.key,
          }))}
          onSelect={onPickChoice}
        />
      ) : (
        <ActionPromptArrows
          message={event.message}
          actions={event.choices.map((choice) => ({ label: choice.label, value: choice.key }))}
          onSelect={onPickChoice}
        />
      )}
    </Box>
  );
}
