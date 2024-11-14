import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { GameContext } from "./GameContext.js";
import { calculateTravelTime, getAvailableStorage, Good, goods, Port, ports } from "../store/store.js";
import { Tab, Tabs } from "ink-tab";
import BigText from "ink-big-text";
import Select from "ink-select-input";
import { v4 as randomId } from "uuid";
import { Table } from "@tqman/ink-table";
import { TextInput } from "@inkjs/ui";

type Tab = "port" | "market" | "shipyard";
type Message = {
  id: string;
  text: string;
  clearAfter?: number;
};

export function GameScreen() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const actor = GameContext.useActorRef();
  const healthStatus = context.ship.health >= 100 ? "Perfect" : context.ship.health >= 70 ? "Good" : "Needs repair";
  const [activeTab, setActiveTab] = useState<Tab>("port");
  const [messages, setMessages] = useState<Message[]>([]);

  // Event: "message"
  useEffect(() => {
    const subscription = actor.on("message", (evt) => {
      const messageId = randomId();
      setMessages((msgs) => [
        ...msgs,
        {
          id: messageId,
          text: evt.message,
          clearAfter: evt.timeout === "auto" ? 2000 : evt.timeout,
        },
      ]);
      if (evt.timeout) {
        setTimeout(
          () => {
            setMessages((msgs) => (msgs.length > 0 ? msgs.filter((msg) => msg.id !== messageId) : msgs));
          },
          evt.timeout === "auto" ? 2000 : evt.timeout,
        );
      }
    });

    return subscription.unsubscribe;
  }, []);

  // Event: "clearMessages"
  useEffect(() => {
    const subscription = actor.on("clearMessages", () => {
      setMessages([]);
    });

    return subscription.unsubscribe;
  }, []);

  useInput((input, key) => {
    if (key.escape) {
      process.exit();
    }
  });

  return (
    // Container
    <Box flexDirection="column" alignItems="center" width="100%" height="100%" paddingTop={4}>
      <Tabs
        showIndex={false}
        onChange={(tab) => {
          setMessages([]); // Clear messages
          setActiveTab(tab as Tab);
        }}
      >
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
              {/* Prices */}
              <Table
                data={ports.map((port) => ({
                  name: port,
                  ...goods.reduce(
                    (acc, good) => ({
                      ...acc,
                      [good]: `$${context.prices[port][good]}`,
                    }),
                    {},
                  ),
                }))}
                headings={{ name: "" }}
                // @ts-expect-error Table can't detect the goods
                columns={[{ key: "name", align: "left" }, ...goods.map((good) => ({ key: good, align: "center" }))]}
              />
              {/* Hold */}
              <Box marginY={1} gap={3}>
                <Box flexDirection="column">
                  <Text>Your hold:</Text>
                  <Box flexDirection="column" borderStyle="round" paddingRight={3} paddingLeft={1}>
                    {[...context.ship.hold.entries()].map(([good, quantity]) => (
                      <Box key={good}>
                        <Text>{good.padEnd(10, " ")}</Text>
                        <Text>{quantity}</Text>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box flexDirection="column" alignItems="center">
                  <Text>Available storage:</Text>
                  <Text>
                    {getAvailableStorage(context.ship)} / <Text>{context.ship.capacity}</Text>
                  </Text>
                </Box>
              </Box>

              <MarketForm />
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
        {messages.map((message) => (
          <Text key={message.id}>{message.text}</Text>
        ))}
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

function MarketForm() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const actor = GameContext.useActorRef();
  const [action, setAction] = useState<"buy" | "sell" | undefined>();
  const [good, setGood] = useState<Good | undefined>();
  const [quantity, setQuantity] = useState(0);

  return !action ? (
    <Box flexDirection="column">
      <Text>What would you like to do?</Text>
      <Select
        items={[
          { value: "buy", label: "Buy" },
          { value: "sell", label: "Sell" },
        ]}
        onSelect={({ value }) => setAction(value as "buy" | "sell")}
      />
    </Box>
  ) : !good ? (
    <Box flexDirection="column">
      <Text>Which good do you wish to {action}?</Text>
      <Select
        items={goods.map((good) => ({ value: good, label: good }))}
        onSelect={({ value }) => setGood(value as Good)}
      />
    </Box>
  ) : (
    <Box flexDirection="column">
      {action === "buy" ? (
        <Box marginBottom={1}>
          <Text inverse>
            You can afford {Math.floor(context.balance / context.prices[context.currentPort][good])} tons of{" "}
            {good.toLowerCase()}.
          </Text>
        </Box>
      ) : null}
      <Box gap={1}>
        <Text>
          How much {good.toLowerCase()} would you like to {action}?
        </Text>
        <TextInput
          placeholder="0"
          onChange={(amount) => (isNaN(+amount) ? setQuantity(0) : setQuantity(+amount))}
          onSubmit={() => {
            if (!!action && !!good && !isNaN(quantity) && quantity > 0) {
              if (action === "buy") {
                actor.send({ type: "BUY_GOOD", good, quantity });
              } else if (action === "sell") {
                actor.send({ type: "SELL_GOOD", good, quantity });
              }
            }

            // Reset form
            setAction(undefined);
            setGood(undefined);
            setQuantity(0);
          }}
        />
      </Box>
    </Box>
  );
}
