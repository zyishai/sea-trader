import React, { useState } from "react";
import { Box, DOMElement, Text, useInput } from "ink";
import { Alert, Badge } from "@inkjs/ui";
import { GameContext } from "../GameContext.js";
import { Divider } from "./Divider.js";
import { Typed } from "./Typed.js";
import {
  calculateCostForRepair,
  calculateDailyMaintenanceCost,
  calculateGuardShipCost,
  getAvailableStorage,
  getShipStatus,
} from "../../store/utils.js";
import { goods, OVERDRAFT_TRADING_LIMIT, ports } from "../../store/constants.js";
import { ActionPrompt as ActionPromptArrows } from "../prompts/arrows/ActionPrompt.js";
import { ActionPrompt as ActionPromptKeyboard } from "../prompts/keyboard/ActionPrompt.js";
import { InputPrompt as InputPromptArrows } from "../prompts/arrows/InputPrompt.js";
import { InputPrompt as InputPromptKeyboard } from "../prompts/keyboard/InputPrompt.js";
import { ConfirmPrompt as ConfirmPromptArrows } from "../prompts/arrows/ConfirmPrompt.js";
import { ConfirmPrompt as ConfirmPromptKeyboard } from "../prompts/keyboard/ConfirmPrompt.js";
import { Good, Port } from "../../store/types.js";
import assert from "assert";

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

        <Box flexDirection="column" minHeight={10}>
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
        Balance:{" "}
        <Text backgroundColor="black" color="whiteBright" inverse={context.balance > 0}>
          {context.balance >= 0 ? `$${context.balance}` : `-$${Math.abs(context.balance)}`}
          {context.balance < 0 ? " (OVERDRAWN)" : null}
        </Text>
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
      <Text> | </Text>
      <Text>
        Guard Fleet:{" "}
        <Badge color={context.guardFleet.ships > 0 ? "blueBright" : "gray"}>
          {context.guardFleet.ships} ships (Lvl {context.guardFleet.quality})
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
  const actor = GameContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const { context } = snapshot;
  const controls = context.settings.controls;
  const isAtPort = snapshot.matches({ gameScreen: "at_port" });
  const isAtMarket = snapshot.matches({ gameScreen: "at_market" });
  const isManagingFleet = snapshot.matches({ gameScreen: "managing_fleet" });
  const isAtShipyard = snapshot.matches({ gameScreen: "at_shipyard" });
  const isAtRetirement = snapshot.matches({ gameScreen: "at_retirement" });
  const isAtBankruptcy = snapshot.matches({ gameScreen: "at_bankruptcy" });

  const handleSelect = (value: string) => {
    if (value === "T") {
      actor.send({ type: "GO_TO_PORT" });
    } else if (value === "B") {
      actor.send({ type: "GO_TO_MARKET", action: "buy" });
    } else if (value === "S") {
      actor.send({ type: "GO_TO_MARKET", action: "sell" });
    } else if (value === "F") {
      actor.send({ type: "MANAGE_FLEET" });
    } else if (value === "R") {
      actor.send({ type: "GO_TO_SHIPYARD" });
    } else if (value === "W") {
      actor.send({ type: "GO_TO_RETIREMENT" });
    } else if (value === "D") {
      actor.send({ type: "GO_TO_BANKRUPTCY" });
    }
  };

  return isAtPort ? (
    <TravelAction />
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
  ) : (
    <Box flexDirection="column" gap={1}>
      <Text backgroundColor="black" color="whiteBright">
        {" "}
        ACTIONS{" "}
      </Text>
      {controls === "keyboard" ? (
        <ActionPromptKeyboard
          message="What would you like to do?"
          actions={[
            { label: "Travel", value: "T", key: "T" },
            { label: "Buy goods", value: "B", key: "B" },
            { label: "Sell goods", value: "S", key: "S" },
            { label: "Fleet management", value: "F", key: "F" },
            { label: "Repair ship", value: "R", disabled: context.ship.health === 100, key: "R" },
            { label: "Retire", value: "W", disabled: !context.canRetire, key: "W" },
            { label: "Declare bankruptcy", value: "D", key: "D", disabled: context.balance >= 0 },
          ]}
          onSelect={handleSelect}
        />
      ) : (
        <ActionPromptArrows
          message="What would you like to do?"
          actions={[
            { label: "Travel", value: "T" },
            { label: "Buy goods", value: "B" },
            { label: "Sell goods", value: "S" },
            { label: "Fleet management", value: "F" },
            { label: "Repair ship", value: "R", disabled: context.ship.health === 100 },
            { label: "Retire", value: "W", disabled: !context.canRetire },
          ]}
          onSelect={handleSelect}
        />
      )}
      <ExitGame />
    </Box>
  );
}

function ExitGame() {
  useInput((_, key) => {
    if (key.escape) {
      process.exit();
    }
  });

  return null;
}

function TravelAction() {
  const actor = GameContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const { context } = snapshot;
  const controls = context.settings.controls;
  const isPiratesEncounter = snapshot.matches({ gameScreen: { at_port: "piratesEncountered" } });

  const handleSelectPort = (value: string) => {
    assert(ports.includes(value as Port), "Invalid port");
    actor.send({ type: "TRAVEL_TO", destination: value as Port });
  };

  const handleSelectPiratesEncounterAction = (value: string) => {
    if (value === "1") {
      actor.send({ type: "PIRATES_ENCOUNTER_FIGHT" });
    } else if (value === "2") {
      actor.send({ type: "PIRATES_ENCOUNTER_FLEE" });
    } else if (value === "3") {
      actor.send({ type: "PIRATES_ENCOUNTER_OFFER" });
    }
  };

  return isPiratesEncounter ? (
    <Box display="flex" flexDirection="column" gap={1}>
      <Text underline>{context.currentPort}&apos;s Port</Text>
      <Text bold>Pirates Attack!</Text>
      <Text>Pirates attack your ship. You have {context.guardFleet.ships} guard ships.</Text>
      {controls === "keyboard" ? (
        <ActionPromptKeyboard
          message="What would you do?"
          actions={[
            { label: "Attack them", value: "1", key: "1" },
            { label: "Attempt to flee", value: "2", key: "2" },
            { label: "Bribe them with money", value: "3", key: "3" },
          ]}
          onSelect={handleSelectPiratesEncounterAction}
        />
      ) : (
        <ActionPromptArrows
          message="What would you do?"
          actions={[
            { label: "Attack them", value: "1" },
            { label: "Attempt to flee", value: "2" },
            { label: "Bribe them with money", value: "3" },
          ]}
          onSelect={handleSelectPiratesEncounterAction}
        />
      )}
      <ExitGame />
    </Box>
  ) : (
    <Box display="flex" flexDirection="column" gap={1}>
      <Text underline>{context.currentPort}&apos;s Port</Text>
      {controls === "keyboard" ? (
        <ActionPromptKeyboard
          message="Where would you like to go?"
          actions={context.availablePorts.map((port, index) => ({ label: port, value: port, key: String(index + 1) }))}
          onSelect={handleSelectPort}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : (
        <ActionPromptArrows
          message="Where would you like to go?"
          actions={context.availablePorts.map((port) => ({ label: port, value: port }))}
          onSelect={handleSelectPort}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      )}
    </Box>
  );
}

function MarketAction() {
  const actor = GameContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const { context } = snapshot;
  const controls = context.settings.controls;
  const [good, setGood] = useState<Good | undefined>(undefined);
  const inDebt = context.balance < 0;
  const affordance = good
    ? Math.floor(
        (inDebt ? context.balance + OVERDRAFT_TRADING_LIMIT : context.balance) /
          context.prices[context.currentPort][good],
      )
    : 0;
  const inHold = good ? context.ship.hold.get(good) : 0;
  const handleSubmit = (values: Record<string, string>) => {
    const { good, quantity } = values;
    if (good && quantity && !isNaN(+quantity)) {
      if (context.marketAction === "buy") {
        actor.send({
          type: "PURCHASE",
          good: good as Good,
          quantity: +quantity,
        });
      } else if (context.marketAction === "sell") {
        actor.send({
          type: "SELL",
          good: good as Good,
          quantity: +quantity,
        });
      }
    }
  };
  const validateQuantity = (value: string) => {
    const quantity = +value;
    return isNaN(quantity) || quantity <= 0 ? "Please enter a valid number" : undefined;
  };

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Text underline>Goods Market</Text>
      {good ? (
        <>
          <Text>
            {good} - ${context.prices[context.currentPort][good]} per unit
          </Text>
          {context.marketAction === "buy" ? (
            <Text>You can afford {affordance} units.</Text>
          ) : (
            <Text>You have {inHold} units in your hold.</Text>
          )}
        </>
      ) : null}
      {controls === "keyboard" ? (
        <InputPromptKeyboard
          steps={[
            {
              type: "enum",
              id: "good",
              message: `Which good do you wish to ${context.marketAction === "buy" ? "purchase" : "sell"}?`,
              actions: context.availableGoods.map((good) => ({
                label: good,
                value: good,
                key: good.charAt(0).toUpperCase(),
              })),
              onSelect: (value) => setGood(value as Good),
              onEnter: () => setGood(undefined),
            },
            {
              type: "text",
              id: "quantity",
              message: `How many tons of ${good}?`,
              validate: validateQuantity,
            },
          ]}
          onComplete={handleSubmit}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : (
        <InputPromptArrows
          steps={[
            {
              type: "enum",
              id: "good",
              message: `Which good do you wish to ${context.marketAction === "buy" ? "purchase" : "sell"}?`,
              actions: context.availableGoods.map((good) => ({ label: good, value: good })),
              onSelect: (value) => setGood(value as Good),
              onEnter: () => setGood(undefined),
            },
            {
              type: "text",
              id: "quantity",
              message: `How many tons of ${good}?`,
              validate: validateQuantity,
            },
          ]}
          onComplete={handleSubmit}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      )}
    </Box>
  );
}

function ManageFleetAction() {
  const actor = GameContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const { context } = snapshot;
  const controls = context.settings.controls;
  const dailyMaintenanceCost = calculateDailyMaintenanceCost(context);
  const isMenu = snapshot.matches({ gameScreen: { managing_fleet: "menu" } });
  const isHire = snapshot.matches({ gameScreen: { managing_fleet: "hireShips" } });
  const isUpgrade = snapshot.matches({ gameScreen: { managing_fleet: "upgradeFleet" } });
  const isDismiss = snapshot.matches({ gameScreen: { managing_fleet: "dismissShips" } });

  const pickAction = (value: string) => {
    if (value === "hire") {
      actor.send({ type: "GO_TO_GUARD_HALL_HIRE" });
    } else if (value === "upgrade") {
      actor.send({ type: "GO_TO_GUARD_HALL_UPGRADE" });
    } else if (value === "dismiss") {
      actor.send({ type: "GO_TO_GUARD_HALL_DISMISS" });
    }
  };
  const validateQuantityOfShipsToHire = (value: string) => {
    const quantity = +value;
    return isNaN(quantity) || quantity <= 0 ? "Please enter a valid number" : undefined;
  };
  const hireShips = ({ quantity }: { quantity?: string }) => {
    if (quantity) {
      actor.send({ type: "HIRE_PERMANENT_GUARDS", amount: +quantity });
    }
  };
  const validateQuantityOfShipsToDismiss = (value: string) => {
    const quantity = +value;
    return isNaN(quantity) || quantity <= 0 ? "Please enter a valid number" : undefined;
  };
  const dismissShips = ({ quantity }: { quantity?: string }) => {
    if (quantity) {
      actor.send({ type: "DISMISS_GUARDS", amount: +quantity });
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Text underline>Fleet Management</Text>
      {isMenu && dailyMaintenanceCost > 0 ? <Text>Daily Maintenance: ${dailyMaintenanceCost}</Text> : null}
      {isHire ? (
        <Text dimColor>Hiring a ship costs ${calculateGuardShipCost(context, 1)} and cannot be refunded.</Text>
      ) : null}
      {isDismiss ? <Text dimColor>Dismissing a ship reduces the daily maintenance cost of your fleet.</Text> : null}
      {controls === "keyboard" ? (
        isMenu ? (
          <ActionPromptKeyboard
            message="What would you like to do?"
            actions={[
              { label: "Hire ships", value: "hire", key: "H" },
              { label: "Upgrade fleet", value: "upgrade", key: "U" },
              { label: "Dismiss ships", value: "dismiss", key: "D" },
            ]}
            onSelect={pickAction}
            onCancel={() => actor.send({ type: "CANCEL" })}
          />
        ) : isHire ? (
          <InputPromptKeyboard
            steps={[
              {
                type: "text",
                id: "quantity",
                message: `How many ships do you wish to hire?`,
                validate: validateQuantityOfShipsToHire,
              },
            ]}
            onComplete={hireShips}
            onCancel={() => actor.send({ type: "CANCEL" })}
          />
        ) : isUpgrade ? (
          <ConfirmPromptKeyboard
            message="Are you sure you want to upgrade the quality of your fleet?"
            onConfirm={() => actor.send({ type: "UPGRADE_GUARDS" })}
            onCancel={() => actor.send({ type: "CANCEL" })}
          />
        ) : isDismiss ? (
          <InputPromptKeyboard
            steps={[
              {
                type: "text",
                id: "quantity",
                message: `How many ships do you wish to dismiss?`,
                validate: validateQuantityOfShipsToDismiss,
              },
            ]}
            onComplete={dismissShips}
            onCancel={() => actor.send({ type: "CANCEL" })}
          />
        ) : null
      ) : isMenu ? (
        <ActionPromptArrows
          message="What would you like to do?"
          actions={[
            { label: "Hire ships", value: "hire" },
            { label: "Upgrade fleet", value: "upgrade" },
            { label: "Dismiss ships", value: "dismiss" },
          ]}
          onSelect={pickAction}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : isHire ? (
        <InputPromptArrows
          steps={[
            {
              type: "text",
              id: "quantity",
              message: `How many ships do you wish to hire?`,
              validate: validateQuantityOfShipsToHire,
            },
          ]}
          onComplete={hireShips}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : isUpgrade ? (
        <ConfirmPromptArrows
          message="Are you sure you want to upgrade the quality of your fleet?"
          onConfirm={() => actor.send({ type: "UPGRADE_GUARDS" })}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : isDismiss ? (
        <InputPromptArrows
          steps={[
            {
              type: "text",
              id: "quantity",
              message: `How many ships do you wish to dismiss?`,
              validate: validateQuantityOfShipsToDismiss,
            },
          ]}
          onComplete={dismissShips}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : null}
    </Box>
  );
}

function ShipyardAction() {
  const actor = GameContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const { context } = snapshot;
  const controls = context.settings.controls;
  const damage = 100 - context.ship.health;
  const costForRepair = calculateCostForRepair(damage);

  const validateAmount = (value: string) => {
    const amount = +value;
    return isNaN(amount) || amount <= 0 ? "Please enter a valid amount of money" : undefined;
  };
  const repairShip = ({ amount }: { amount?: string }) => {
    if (amount) {
      actor.send({ type: "REPAIR", cash: +amount });
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Text underline>Shipyard</Text>
      <Text>
        Your ship has suffered {damage} damage. It&apos;ll cost ${costForRepair} to repair it.
      </Text>
      {controls === "keyboard" ? (
        <InputPromptKeyboard
          steps={[
            {
              type: "text",
              id: "amount",
              message: `How much would you like to spend?`,
              validate: validateAmount,
            },
          ]}
          onComplete={repairShip}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : (
        <InputPromptArrows
          steps={[
            {
              type: "text",
              id: "amount",
              message: `How much would you like to spend?`,
              validate: validateAmount,
            },
          ]}
          onComplete={repairShip}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      )}
    </Box>
  );
}

function RetireAction() {
  const actor = GameContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const controls = snapshot.context.settings.controls;

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Alert variant="warning">Retiring will end the game.</Alert>
      {controls === "keyboard" ? (
        <ConfirmPromptKeyboard
          message="Are you sure you want to retire?"
          onConfirm={() => actor.send({ type: "RETIRE" })}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : (
        <ConfirmPromptArrows
          message="Are you sure you want to retire?"
          onConfirm={() => actor.send({ type: "RETIRE" })}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      )}
    </Box>
  );
}

function BankruptcyAction() {
  const actor = GameContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const controls = snapshot.context.settings.controls;

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      {controls === "keyboard" ? (
        <ConfirmPromptKeyboard
          message="Are you sure you want to declare bankruptcy?"
          onConfirm={() => actor.send({ type: "DECLARE_BANKRUPTCY" })}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : (
        <ConfirmPromptArrows
          message="Are you sure you want to declare bankruptcy?"
          onConfirm={() => actor.send({ type: "DECLARE_BANKRUPTCY" })}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      )}
    </Box>
  );
}
