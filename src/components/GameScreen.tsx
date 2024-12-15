import React, { useEffect, useState } from "react";
import { Box, DOMElement, measureElement, Text, TextProps, useInput } from "ink";
import chalk from "chalk";
import { GameContext } from "./GameContext.js";
import {
  calculateCostForRepair,
  calculateRepairForCost,
  getAvailableStorage,
  getShipStatus,
  Good,
  goods,
  ports,
} from "../store/store.js";
import { Alert, Badge, ConfirmInput } from "@inkjs/ui";
import { TextInput } from "./TextInput/index.js";
import { useCounter } from "../hooks/use-counter.js";

const dividerChar = "─";

export function GameScreen() {
  const [ref, setRef] = useState<DOMElement | null>(null);
  const machine = GameContext.useSelector((snapshot) => snapshot);
  const isIdle = machine.matches({ gameScreen: "idle" });
  const messages = machine.context.messages;

  return (
    <Box width="100%" flexDirection="column" alignItems="center">
      <Box flexDirection="column" alignItems="stretch" borderStyle="round" padding={1} ref={setRef}>
        <StatusBar />
        <Box height={2} />
        <Box gap={4}>
          <Box flexDirection="column">
            <PriceList />
            <Box height={2} />
            <Inventory />
          </Box>
          <Box flexDirection="column" alignItems="center"></Box>
        </Box>

        {/* Divider */}
        <Box marginTop={2} marginBottom={1}>
          <Divider containerRef={ref} />
        </Box>

        <Box flexDirection="column" height={10}>
          {(messages && messages.length > 0) || !isIdle ? <Messages /> : <Actions />}
        </Box>
      </Box>
    </Box>
  );
}

function Divider({ containerRef }: { containerRef: DOMElement | null }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (containerRef) {
      const output = measureElement(containerRef);
      setWidth(output.width);
    }
  }, [containerRef]);

  return (
    <Box>
      <Text>{dividerChar.repeat(width)}</Text>
    </Box>
  );
}

function StatusBar() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const shipHealth = getShipStatus(context.ship.health);

  return (
    <Box>
      <Text>
        Port: <Text inverse>{context.currentPort}</Text>
      </Text>
      <Text> | </Text>
      <Text>
        Balance: <Text inverse>${context.balance}</Text>
      </Text>
      <Text> | </Text>
      <Text>
        Day: <Text inverse>{context.day.toString().padStart(3, " ")}</Text>
      </Text>
      <Text> | </Text>
      <Text>
        Ship Health:{" "}
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
          {context.ship.health}% ({shipHealth})
        </Badge>
      </Text>
    </Box>
  );
}

function PriceList() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  return (
    <>
      <Box>
        <Box flexDirection="column" alignItems="stretch" flexGrow={1}>
          <Box
            borderStyle="single"
            borderDimColor
            borderTop={false}
            borderLeft={false}
            borderRight={false}
            paddingRight={1}
          >
            <Text bold color="cyan">
              Port
            </Text>
          </Box>
          {ports.map((port) => (
            <Box
              key={port}
              borderStyle="single"
              borderDimColor
              borderTop={false}
              borderLeft={false}
              borderRight={false}
              paddingRight={1}
            >
              <Text bold={port === context.currentPort}>{port}</Text>
            </Box>
          ))}
        </Box>
        {goods.map((good) => (
          <Box key={good} flexDirection="column" alignItems="stretch">
            <Box
              borderStyle="single"
              borderDimColor
              borderTop={false}
              borderLeft={false}
              borderRight={false}
              paddingX={2}
            >
              <Text bold color="cyan">
                {good}
              </Text>
            </Box>
            {ports.map((port, index) => (
              <Box
                key={port + index}
                borderStyle="single"
                borderDimColor
                borderTop={false}
                borderLeft={false}
                borderRight={false}
                paddingX={2}
                justifyContent="flex-end"
              >
                <Text bold={port === context.currentPort}>${context.prices[port][good]}</Text>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
      <Text color="gray">
        * Next price update in <Text inverse>{context.nextPriceUpdate} days</Text>.
      </Text>
    </>
  );
}

function Inventory() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);

  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <Text underline>Ship&apos;s Hold</Text>
        <Text color="gray">
          (total: <Text inverse>{context.ship.capacity}</Text>, available:{" "}
          <Text inverse>{getAvailableStorage(context.ship)}</Text>)
        </Text>
      </Box>
      <Box flexWrap="wrap" columnGap={2} rowGap={0} marginTop={1}>
        {[...context.ship.hold.entries()].map(([good, quantity], index) => (
          <Box key={index} gap={1}>
            <Text>{good}:</Text>
            <Text>{quantity}</Text>
            {index < context.ship.hold.size - 1 ? <Text> |</Text> : null}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function Messages() {
  const messages = GameContext.useSelector((snapshot) => snapshot.context.messages);
  const actor = GameContext.useActorRef();
  const { current, next } = useCounter(1);

  useInput((input) => {
    if (input === " " && messages && current >= messages.length + 1) {
      // Space key
      actor.send({ type: "MSG_ACK" });
    }
  });

  if (!messages) return null;

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="blueBright" inverse>
        {" "}
        NEW MESSAGE{" "}
      </Text>
      {messages.slice(0, current).map((message, index) => (
        <TypedText key={index} onFinish={next}>
          {message}
        </TypedText>
      ))}
      {current >= messages.length + 1 ? <Text dimColor>Press SPACE to continue</Text> : null}
    </Box>
  );
}

function TypedText({
  children,
  onFinish,
  ...props
}: {
  onFinish: () => void;
  children: string | string[];
} & TextProps) {
  const settings = GameContext.useSelector((snapshot) => snapshot.context.settings);
  const [index, setIndex] = useState(0);
  const c = Array.isArray(children) ? children.join("") : children;

  useEffect(() => {
    if (settings.disableAnimations) {
      onFinish();
      return;
    }

    const id = setTimeout(() => {
      if (index < c.length) {
        setIndex((i) => i + 1);
      } else {
        clearInterval(id);
        onFinish();
      }
    }, 50);

    return () => clearInterval(id);
  }, [c, index]);

  useInput((input) => {
    // SPACE key
    if (settings.disableAnimations) return;

    if (input === " " && index < c.length) {
      setIndex(c.length);
    }
  });

  return <Text {...props}>{settings.disableAnimations ? children : c.slice(0, index)}</Text>;
}

function Actions() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const [action, setAction] = useState<"T" | "B" | "S" | "R" | "W" | null>(null);

  return action === "T" ? (
    <TravelAction onFinish={() => setAction(null)} />
  ) : action === "B" ? (
    <BuyingAction onFinish={() => setAction(null)} />
  ) : action === "S" ? (
    <SellingAction onFinish={() => setAction(null)} />
  ) : action === "R" ? (
    <RepairAction onFinish={() => setAction(null)} />
  ) : action === "W" ? (
    <RetireAction onFinish={() => setAction(null)} />
  ) : (
    <Box flexDirection="column" gap={1}>
      <Text backgroundColor="black" color="whiteBright">
        {" "}
        ACTIONS{" "}
      </Text>
      <Text>Available actions:</Text>
      <Text>
        (T)ravel, (B)uy goods, (S)ell goods{context.ship.health < 100 ? ", (R)epair ship" : null}
        {context.canRetire ? ", (W)Retire" : null}
      </Text>
      <Box gap={1}>
        <Text>What would you like to do?</Text>
        <TextInput
          key="no_action"
          checkValidity={(input, prevInput) =>
            prevInput.length === 0 &&
            ["T", "B", "S", context.ship.health < 100 ? "R" : null, context.canRetire ? "W" : null]
              .filter(Boolean)
              .includes(input)
          }
          transformValue={(value) => value.toUpperCase()}
          styleOutput={(value) => chalk.bold(value)}
          // @ts-expect-error type not inferred
          onSubmit={setAction}
        />
      </Box>
    </Box>
  );
}

function TravelAction({ onFinish }: { onFinish: () => void }) {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const { current, next } = useCounter(0);

  return (
    <Box flexDirection="column" gap={1}>
      <Text underline>{context.currentPort}&apos;s Port</Text>
      <TypedText wrap="wrap" onFinish={next}>
        You can visit:
        {`\n\n`}
        {ports.map((port, index) => `${index + 1}) ${port}`).join(", ")}
      </TypedText>
      {current >= 1 ? (
        <Box gap={1}>
          <TypedText onFinish={next}>Where would you like to go?</TypedText>
          {current >= 2 ? (
            <TextInput
              key="travel_action"
              checkValidity={(input, prevInput) => {
                const index = +input;
                return (
                  prevInput.length === 0 &&
                  index >= 1 &&
                  index <= ports.length &&
                  index !== ports.indexOf(context.currentPort) + 1
                );
              }}
              styleOutput={(value) => chalk.bold(value)}
              onSubmit={(i) => {
                const destination = !isNaN(+i) ? ports[+i - 1] : null;

                if (destination) {
                  actor.send({ type: "TRAVEL_TO", destination });
                  onFinish();
                }
              }}
            />
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}

function BuyingAction({ onFinish }: { onFinish: () => void }) {
  const { current, next } = useCounter(0);

  return (
    <Box flexDirection="column" gap={1}>
      <Text underline>Goods Market</Text>
      <TypedText onFinish={next}>
        Available goods: {goods.map((good) => `(${good.at(0)?.toUpperCase()})${good.slice(1)}`).join(" ")}
      </TypedText>
      {current >= 1 ? <BuyMarketForm onFinish={onFinish} /> : null}
    </Box>
  );
}

function BuyMarketForm({ onFinish }: { onFinish: () => void }) {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const [good, setGood] = useState<Good | undefined>();
  const { current, next } = useCounter(0);

  return !good ? (
    <Box gap={1}>
      <TypedText onFinish={next}>What do you wish to buy?</TypedText>
      {current >= 1 ? (
        <TextInput
          key="buy_action_good"
          checkValidity={(input, prevInput) => prevInput.length === 0 && goods.some((good) => good.startsWith(input))}
          transformValue={(value) => value.toUpperCase()}
          styleOutput={(value) => chalk.bold(value)}
          onSubmit={(value) => {
            const product = goods.find((g) => g.startsWith(value));
            if (product) {
              setGood(product);
            }
          }}
        />
      ) : null}
    </Box>
  ) : (
    <>
      <TypedText onFinish={next}>
        You can afford {chalk.inverse(Math.floor(context.balance / context.prices[context.currentPort][good]))} tons
      </TypedText>
      {current >= 2 ? (
        <Box gap={1}>
          <TypedText onFinish={next}>How much {good} would you like to buy?</TypedText>
          {current >= 3 ? (
            <TextInput
              key="buy_action_quantity"
              checkValidity={(input) => !isNaN(+input) && +input >= 0}
              styleOutput={(value) => value}
              onSubmit={(value) => {
                const amount = +value;
                if (!isNaN(amount) && amount >= 0) {
                  if (amount > 0) {
                    actor.send({ type: "BUY_GOOD", good, quantity: amount });
                  }

                  onFinish();
                }
              }}
            />
          ) : null}
        </Box>
      ) : null}
    </>
  );
}

function SellingAction({ onFinish }: { onFinish: () => void }) {
  return (
    <Box flexDirection="column" gap={1}>
      <Text underline>Goods Market</Text>
      <SellMarketForm onFinish={onFinish} />
    </Box>
  );
}

function SellMarketForm({ onFinish }: { onFinish: () => void }) {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const [good, setGood] = useState<Good | undefined>();
  const { current, next } = useCounter(0);

  return !good ? (
    <Box gap={1}>
      <TypedText onFinish={next}>What do you offer to sell?</TypedText>
      {current >= 1 ? (
        <TextInput
          key="sell_action_good"
          checkValidity={(input, prevInput) => prevInput.length === 0 && goods.some((good) => good.startsWith(input))}
          transformValue={(value) => value.toUpperCase()}
          styleOutput={(value) => chalk.bold(value)}
          onSubmit={(value) => {
            const product = goods.find((g) => g.startsWith(value));
            if (product) {
              setGood(product);
            }
          }}
        />
      ) : null}
    </Box>
  ) : (
    <Box gap={1}>
      <TypedText onFinish={next}>How much {good} would you like to sell?</TypedText>
      {current >= 2 ? (
        <TextInput
          key="sell_action_quantity"
          checkValidity={(input) => !isNaN(+input) && +input >= 0 && +input <= (context.ship.hold.get(good) || 0)}
          styleOutput={(value) => value}
          onSubmit={(value) => {
            const amount = +value;
            if (!isNaN(amount) && amount >= 0) {
              if (amount > 0) {
                actor.send({ type: "SELL_GOOD", good, quantity: amount });
              }

              onFinish();
            }
          }}
        />
      ) : null}
    </Box>
  );
}

function RepairAction({ onFinish }: { onFinish: () => void }) {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const { current, next, set } = useCounter(0);

  return (
    <Box flexDirection="column" gap={1}>
      <Text underline>Shipyard</Text>
      <TypedText onFinish={next}>Your ship has suffered {String(100 - context.ship.health)} damage.</TypedText>
      {current >= 1 ? (
        <TypedText onFinish={next}>
          It&apos;ll cost ${calculateCostForRepair(100 - context.ship.health).toString()} to repair all the damage.
        </TypedText>
      ) : null}
      {current >= 2 ? (
        <Box gap={1}>
          <TypedText onFinish={next}>How much money would you like to spend?</TypedText>
          {current >= 3 ? (
            <TextInput
              checkValidity={(input) => !isNaN(+input) && +input >= 0}
              styleOutput={(value) => chalk.bold(value)}
              onSubmit={(value) => {
                const sum = +value;
                if (!isNaN(sum)) {
                  if (sum > 0) {
                    actor.send({ type: "REPAIR_SHIP", damage: calculateRepairForCost(sum) });
                  }

                  onFinish();
                }
              }}
            />
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}

function RetireAction({ onFinish }: { onFinish: () => void }) {
  const actor = GameContext.useActorRef();
  const { current, next } = useCounter(0);

  return (
    <Box flexDirection="column" gap={1}>
      <Alert variant="warning">Retiring will end the game.</Alert>
      <Box gap={1}>
        <TypedText onFinish={next}>Are you sure you want to retire?</TypedText>
        {current >= 1 ? (
          <ConfirmInput
            defaultChoice="cancel"
            submitOnEnter={false}
            onCancel={onFinish}
            onConfirm={() => {
              actor.send({ type: "RETIRE" });
            }}
          />
        ) : null}
      </Box>
    </Box>
  );
}
