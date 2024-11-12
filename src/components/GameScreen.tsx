import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { GameContext } from "./GameContext.js";
import { calculateTravelTime, Port, ports } from "../store/store.js";
import { Tab, Tabs } from "ink-tab";
import BigText from "ink-big-text";
import Select from "ink-select-input";

type Tab = "port" | "market" | "shipyard";

export function GameScreen() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const actor = GameContext.useActorRef();
  const healthStatus = context.ship.health >= 100 ? "Perfect" : context.ship.health >= 70 ? "Good" : "Needs repair";
  const [activeTab, setActiveTab] = useState<Tab>("port");
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    const subscription = actor.on("message", (evt) => {
      setMessage(evt.message);
    });

    return subscription.unsubscribe;
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(setMessage, 2000);

    return () => clearTimeout(timeoutId);
  }, [message]);

  useInput((input, key) => {
    if (key.escape) {
      process.exit();
    }
  });

  return (
    // Container
    <Box flexDirection="column" alignItems="center" width="100%" height="100%" paddingTop={7}>
      <Tabs showIndex={false} onChange={(tab) => setActiveTab(tab as Tab)}>
        <Tab name="port">Port</Tab>
        <Tab name="market">Goods Market</Tab>
        <Tab name="shipyard">Shipyard</Tab>
      </Tabs>

      {/* Tabs Content */}
      <Box borderStyle="round" padding={1}>
        {activeTab === "port" ? (
          <Box width={60} flexDirection="column" alignItems="center">
            <Header day={context.day.toString()} currentPort={context.currentPort} balance={context.balance} />
            <Box width="100%" flexDirection="column">
              <BigText text="Port" font="tiny" />
              <Text>Which port would you like to travel to?</Text>
              <Box height={1} />
              <Select
                items={ports
                  .filter((port) => port !== context.currentPort)
                  .map((port) => ({ value: port, label: port }))}
                itemComponent={(props) => (
                  <>
                    <Text color={props!.isSelected ? "cyan" : undefined}>{props!.label}</Text>
                    <Text dimColor>
                      {" "}
                      ({calculateTravelTime(context.currentPort, props!.label as Port, context.ship.speed)} days)
                    </Text>
                  </>
                )}
                onSelect={(port) => actor.send({ type: "TRAVEL_TO", destination: port.label as Port })}
              />
            </Box>
          </Box>
        ) : activeTab === "market" ? (
          <Box width={60} flexDirection="column" alignItems="center">
            <Header day={context.day.toString()} currentPort={context.currentPort} balance={context.balance} />
            <Box width="100%" flexDirection="column">
              <BigText text="Market" font="tiny" />
            </Box>
          </Box>
        ) : activeTab === "shipyard" ? (
          <Box width={60} flexDirection="column" alignItems="center">
            <Header day={context.day.toString()} currentPort={context.currentPort} balance={context.balance} />
            <Box width="100%" flexDirection="column">
              <BigText text="Shipyard" font="tiny" />
            </Box>
          </Box>
        ) : null}
      </Box>

      {/* Display Messages */}
      <Box flexDirection="column" gap={1} marginTop={1}>
        {message ? <Text>{message}</Text> : null}
      </Box>
    </Box>
  );
}

function Header({ day, currentPort, balance }: { day: string; currentPort: Port; balance: number }) {
  return (
    <Box flexDirection="row" alignItems="center" gap={3} marginBottom={1}>
      {/* Current Day */}
      <Text>
        Day:{" "}
        <Text backgroundColor="black" color="white" inverse>
          {day.padStart(3, " ")}
        </Text>
      </Text>
      {/* Current Port */}
      <Text>
        Port:{" "}
        <Text backgroundColor="black" color="white" inverse>
          {currentPort}
        </Text>
      </Text>
      {/* Balance */}
      <Text>
        Balace:{" "}
        <Text backgroundColor="black" color="white" inverse>
          ${balance}
        </Text>
      </Text>
    </Box>
  );
}
