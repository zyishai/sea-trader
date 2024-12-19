import React, { useState } from "react";
import chalk from "chalk";
import { Box, DOMElement, Newline, Text, useInput } from "ink";
import { Alert, Badge, ConfirmInput } from "@inkjs/ui";
import { GameContext } from "../GameContext.js";
import { TextInput } from "./TextInput/index.js";
import { Divider } from "./Divider.js";
import { Typed } from "./Typed.js";
import { calculateCostForRepair, getAvailableStorage, getShipStatus } from "../../store/utils.js";
import { goods, ports } from "../../store/constants.js";

export function GameScreen() {
  const [ref, setRef] = useState<DOMElement | null>(null);
  const machine = GameContext.useSelector((snapshot) => snapshot);
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
          {messages && messages.length > 0 ? <Messages /> : <Actions />}
        </Box>
      </Box>
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

  if (!messages) return null;

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="blueBright" inverse>
        {" "}
        NEW MESSAGE{" "}
      </Text>
      {messages.reduceRight(
        (el, message) => (
          <Typed text={message}>{el}</Typed>
        ),
        <ContinueMessage />,
      )}
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
  const actor = GameContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const { context } = snapshot;
  const isAtPort = snapshot.matches({ gameScreen: "at_port" });
  const isAtMarket = snapshot.matches({ gameScreen: "at_market" });
  const isAtShipyard = snapshot.matches({ gameScreen: "at_shipyard" });
  const isAtRetirement = snapshot.matches({ gameScreen: "at_retirement" });

  return isAtPort ? (
    <TravelAction />
  ) : isAtMarket ? (
    <MarketAction />
  ) : isAtShipyard ? (
    <ShipyardAction />
  ) : isAtRetirement ? (
    <RetireAction />
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
          onSubmit={(value) => {
            if (value === "T") {
              actor.send({ type: "GO_TO_PORT" });
            } else if (value === "B") {
              actor.send({ type: "GO_TO_MARKET", action: "buy" });
            } else if (value === "S") {
              actor.send({ type: "GO_TO_MARKET", action: "sell" });
            } else if (value === "R") {
              actor.send({ type: "GO_TO_SHIPYARD" });
            } else if (value === "W") {
              actor.send({ type: "GO_TO_RETIREMENT" });
            }
          }}
        />
      </Box>
    </Box>
  );
}

function TravelAction() {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);

  useInput((input) => {
    if (input === "c" || input === "C") {
      actor.send({ type: "CANCEL" });
    }
  });

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Text underline>{context.currentPort}&apos;s Port</Text>
      <Text wrap="wrap">
        You can visit: <Newline />
        <Newline />
        {context.availablePorts.map((port, index) => `${index + 1}) ${port}`).join(", ")}
      </Text>
      <Box gap={1}>
        <Text>
          Where would you like to go? <Text dimColor>(press C to cancel this action)</Text>
        </Text>
        <TextInput
          key="travel_action"
          checkValidity={(input, prevInput) => {
            const index = +input;
            return prevInput.length === 0 && index >= 1 && index <= context.availablePorts.length;
          }}
          styleOutput={(value) => chalk.bold(value)}
          onSubmit={(i) => {
            const destination = !isNaN(+i) ? context.availablePorts[+i - 1] : null;

            if (destination) {
              actor.send({ type: "TRAVEL_TO", destination });
            }
          }}
        />
      </Box>
    </Box>
  );
}

function MarketAction() {
  const actor = GameContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const { context } = snapshot;
  const isGoodStep =
    snapshot.matches({ gameScreen: { at_market: { buyAction: "pickGood" } } }) ||
    snapshot.matches({ gameScreen: { at_market: { sellAction: "pickGood" } } });
  const isQuantityStep =
    snapshot.matches({
      gameScreen: { at_market: { buyAction: "selectQuantity" } },
    }) ||
    snapshot.matches({
      gameScreen: { at_market: { sellAction: "selectQuantity" } },
    });
  const isBuyAction = snapshot.matches({ gameScreen: { at_market: "buyAction" } });
  const affordance = context.good ? Math.floor(context.balance / context.prices[context.currentPort][context.good]) : 0;
  const inHold = context.good ? context.ship.hold.get(context.good) : 0;

  useInput((input) => {
    if (input === "c" || input === "C") {
      actor.send({ type: "CANCEL" });
    }
  });

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Text underline>Goods Market</Text>
      {isGoodStep ? (
        <>
          <Text>
            Available goods: <Newline />
            <Newline />
            {context.availableGoods.map((good) => `(${good.at(0)?.toUpperCase()})${good.slice(1)}`).join(", ")}
          </Text>
          <Box gap={1}>
            <Text>
              Which good do you wish to {isBuyAction ? "purchase" : "sell"}?{" "}
              <Text dimColor>(press C to cancel this action)</Text>
            </Text>
            <TextInput
              key="pick_good"
              checkValidity={(input, prevInput) =>
                prevInput.length === 0 && context.availableGoods.some((good) => good.startsWith(input.toUpperCase()))
              }
              transformValue={(value) => value.toUpperCase()}
              styleOutput={(value) => chalk.bold(value)}
              onSubmit={(value) => {
                const good = context.availableGoods.find((good) => good.startsWith(value.toUpperCase()));
                if (good) {
                  actor.send({ type: "PICK_GOOD", good });
                }
              }}
            />
          </Box>
        </>
      ) : isQuantityStep ? (
        <>
          <Text>
            You&apos;ve picked <Text underline>{context.good}</Text>.{" "}
            {isBuyAction ? (
              <Text>
                You can afford <Text inverse>{affordance}</Text> tons.
              </Text>
            ) : (
              <Text>
                You have <Text inverse>{inHold}</Text> in hold.
              </Text>
            )}
          </Text>
          <Box gap={1}>
            <Text>
              How many tons? <Text dimColor>(press C to cancel this action)</Text>
            </Text>
            <TextInput
              key="choose_amount"
              checkValidity={(input) => input.toUpperCase() === "C" || +input >= 0}
              styleOutput={(value) => chalk.bold(value)}
              onSubmit={(value) => {
                if (value.toUpperCase() === "C") {
                  actor.send({ type: "CANCEL" });
                } else {
                  const quantity = !isNaN(+value) ? +value : null;
                  if (quantity) {
                    actor.send({ type: "SELECT_QUANTITY", quantity });
                    if (context.marketAction === "buy") {
                      actor.send({ type: "PURCHASE" });
                    } else if (context.marketAction === "sell") {
                      actor.send({ type: "SELL" });
                    }
                  }
                }
              }}
            />
          </Box>
        </>
      ) : null}
    </Box>
  );
}

function ShipyardAction() {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const damage = 100 - context.ship.health;
  const costForRepair = calculateCostForRepair(damage);

  useInput((input) => {
    if (input === "c" || input === "C") {
      actor.send({ type: "CANCEL" });
    }
  });

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Text underline>Shipyard</Text>
      {context.ship.health === 100 ? (
        <Typed text="Your ship is in perfect condition." />
      ) : (
        <>
          <Text>
            Your ship has suffered {damage} damage. It&apos;ll cost ${costForRepair} to repair it.
          </Text>
          <Box gap={1}>
            <Text>
              How much would you like to spend? <Text dimColor>(press C to cancel this action)</Text>
            </Text>
            <TextInput
              checkValidity={(input) => !isNaN(+input) && +input >= 0}
              styleOutput={(value) => chalk.bold(value)}
              onSubmit={(value) => {
                const sum = +value;
                if (!isNaN(sum)) {
                  actor.send({ type: "REPAIR", cash: sum });
                }
              }}
            />
          </Box>
        </>
      )}
    </Box>
  );
}

function RetireAction() {
  const actor = GameContext.useActorRef();

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Alert variant="warning">Retiring will end the game.</Alert>
      <Box gap={1}>
        <Text>Are you sure you want to retire?</Text>
        <ConfirmInput
          defaultChoice="cancel"
          submitOnEnter={false}
          onCancel={() => actor.send({ type: "CANCEL" })}
          onConfirm={() => actor.send({ type: "RETIRE" })}
        />
      </Box>
    </Box>
  );
}
