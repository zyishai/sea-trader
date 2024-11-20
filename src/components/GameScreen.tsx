import React, { Children, useEffect, useMemo, useRef, useState } from "react";
import { Box, DOMElement, measureElement, Text, useInput } from "ink";
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
import { Badge } from "@inkjs/ui";
import { TextInput } from "./TextInput/index.js";
import { useMessages } from "./MessagesContext.js";

const dividerChar = "─";

export function GameScreen() {
  const [ref, setRef] = useState<DOMElement | null>(null);
  const { messages } = useMessages();
  const machine = GameContext.useSelector((snapshot) => snapshot);
  const isIdle = machine.matches({ gameScreen: "idle" });

  useInput((input, key) => {
    if (key.escape) {
      process.exit();
    }
  });

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
          {messages.length > 0 || !isIdle ? <Messages /> : <Actions />}
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
  );
}

function Inventory() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);

  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <Text underline>Ship&apos;s Hold</Text>
        <Text>
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
  const { messages } = useMessages();

  // useInput((input) => {
  //   if (input === " " && messages[0]) {
  //     // Space key
  //     clearMessage(messages[0].id);
  //   }
  // });

  return (
    <Box flexDirection="column" gap={1}>
      {messages.map((message) => (
        <Text key={message.id}>{message.text}</Text>
      ))}
    </Box>
  );
}

function Actions() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const [action, setAction] = useState<"T" | "B" | "S" | "R" | null>(null);

  return action === "T" ? (
    <TravelAction onFinish={() => setAction(null)} />
  ) : action === "B" ? (
    <BuyingAction onFinish={() => setAction(null)} />
  ) : action === "S" ? (
    <SellingAction onFinish={() => setAction(null)} />
  ) : action === "R" ? (
    <RepairAction onFinish={() => setAction(null)} />
  ) : (
    <Box flexDirection="column" gap={1}>
      <Text>Available actions:</Text>
      <Text>(T)ravel, (B)uy goods, (S)ell goods{context.ship.health < 100 ? ", (R)epair ship" : null}</Text>
      <Box gap={1}>
        <Text>What would you like to do?</Text>
        <TextInput
          key="no_action"
          checkValidity={(input, prevInput) =>
            prevInput.length === 0 &&
            ["T", "B", "S", context.ship.health < 100 ? "R" : null].filter(Boolean).includes(input)
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

  return (
    <Box flexDirection="column" gap={1}>
      <Synchronize timing={[200, 800, 1400]}>
        <Text underline>{context.currentPort}&apos;s Port</Text>
        <>
          <Text wrap="wrap">You can visit:</Text>
          <Text>{ports.map((port, index) => `${index + 1}) ${port}`).join(", ")}</Text>
        </>
        <Box gap={1}>
          <Text>Where would you like to go?</Text>
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
        </Box>
      </Synchronize>
    </Box>
  );
}

function BuyingAction({ onFinish }: { onFinish: () => void }) {
  return (
    <Box flexDirection="column" gap={1}>
      <Synchronize timing={[200, 800, 1400]}>
        <Text underline>Goods Market</Text>
        <Text>Available goods: {goods.map((good) => `(${good.at(0)?.toUpperCase()})${good.slice(1)}`).join(" ")}</Text>
        <BuyMarketForm onFinish={onFinish} />
      </Synchronize>
    </Box>
  );
}

function BuyMarketForm({ onFinish }: { onFinish: () => void }) {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const [good, setGood] = useState<Good | undefined>();

  return !good ? (
    <Box gap={1}>
      <Text>What do you wish to buy?</Text>
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
    </Box>
  ) : (
    <>
      <Text>
        You can afford <Text inverse> {Math.floor(context.balance / context.prices[context.currentPort][good])} </Text>{" "}
        tons
      </Text>
      <Box gap={1}>
        <Text>How much {good} would you like to buy?</Text>
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
      </Box>
    </>
  );
}

function SellingAction({ onFinish }: { onFinish: () => void }) {
  return (
    <Box flexDirection="column" gap={1}>
      <Synchronize timing={[200, 800, 1400]}>
        <Text underline>Goods Market</Text>
        <SellMarketForm onFinish={onFinish} />
      </Synchronize>
    </Box>
  );
}

function SellMarketForm({ onFinish }: { onFinish: () => void }) {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const [good, setGood] = useState<Good | undefined>();

  return !good ? (
    <Box gap={1}>
      <Text>What do you offer to sell?</Text>
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
    </Box>
  ) : (
    <Box gap={1}>
      <Text>How much {good} would you like to sell?</Text>
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
    </Box>
  );
}

function RepairAction({ onFinish }: { onFinish: () => void }) {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);

  return (
    <Box flexDirection="column" gap={1}>
      <Synchronize timing={[200, 800, 1400]}>
        <Text underline>Shipyard</Text>
        <>
          <Text>Your ship has suffered {100 - context.ship.health} damage.</Text>
          <Text>It&apos;ll cost ${calculateCostForRepair(100 - context.ship.health)} to repair all the damage.</Text>
        </>
        <Box gap={1}>
          <Text>How much money would you like to spend?</Text>
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
        </Box>
      </Synchronize>
    </Box>
  );
}

function Synchronize({ children, timing }: React.PropsWithChildren<{ timing: number[] }>) {
  const [displayCount, setDisplayCount] = useState(0);
  const items = useMemo(() => Children.toArray(children), [children]);
  const timeoutId = useRef<NodeJS.Timeout>();

  // Reset displayCount if children changes
  useEffect(() => {
    setDisplayCount(0);
  }, [children]);

  // Increment displayCount according to the timing array
  useEffect(() => {
    const ms = timing[displayCount];

    if (typeof ms === "number") {
      timeoutId.current = setTimeout(() => setDisplayCount((dc) => dc + 1), ms);
    }

    return () => clearTimeout(timeoutId.current);
  }, [timing, displayCount]);

  useInput((input) => {
    if (input === " ") {
      // Space key - skip current timeout
      setDisplayCount((dc) => dc + 1);
    }
  });

  return <>{items.slice(0, displayCount)}</>;
}

function After({ ms, children }: React.PropsWithChildren<{ ms: number }>) {
  const [show, setShow] = useState(false);

  useInput((input, key) => {
    if (input === " " && !show) {
      setShow(true);
    }
  });

  useEffect(() => {
    const id = setTimeout(() => setShow(true), ms);

    return () => clearTimeout(id);
  }, [ms]);

  return show ? children : null;
}

// function ShipHealth({ health }: { health: number }) {
//   const actor = GameContext.useActorRef();
//   const status = getShipStatus(health);
//   const cost = calculateCostForRepair(100 - health);
//   const graphic =
//     status === "Perfect"
//       ? `
//         |    |    |
//        )_)  )_)  )_)
//       )___))___))___)\\
//      )____)____)_____)\\
//    _____|____|____|____\\__
//   \\                   /
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//     `
//       : status === "Minor damages"
//         ? `
//         |    |
//        )_)  )_)
//       )___))___))___)\\
//      )____)____)_____)\\
//    _____|____|____|____\\__
//   \\                   /
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//       `
//         : status === "Major damages"
//           ? `
//         |    |
//        )_)  )_)
//       )___)) __) ___)\\
//      )____)____)     )\\
//    _____|____|____|____\\__
//   \\                   /
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//         `
//           : `

//        )_)  )_)
//       )_  ))_  ))_  )\\
//      )____)____)     )\\
//    _____|____|____|____\\__
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//         `;
