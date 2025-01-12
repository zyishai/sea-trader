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
  calculateTravelTime,
  getAvailableStorage,
  getNetCash,
  getShipStatus,
} from "../../store/utils.js";
import { OVERDRAFT_TRADING_LIMIT, ports } from "../../store/constants.js";
import { ActionPrompt as ActionPromptArrows } from "../prompts/arrows/ActionPrompt.js";
import { ActionPrompt as ActionPromptKeyboard } from "../prompts/keyboard/ActionPrompt.js";
import { InputPrompt as InputPromptArrows } from "../prompts/arrows/InputPrompt.js";
import { InputPrompt as InputPromptKeyboard } from "../prompts/keyboard/InputPrompt.js";
import { ConfirmPrompt as ConfirmPromptArrows } from "../prompts/arrows/ConfirmPrompt.js";
import { ConfirmPrompt as ConfirmPromptKeyboard } from "../prompts/keyboard/ConfirmPrompt.js";
import { Good, Port } from "../../store/types.js";
import assert from "assert";
import { Table } from "@tqman/ink-table";

export function Layout({ children }: React.PropsWithChildren) {
  const [ref, setRef] = useState<DOMElement | null>(null);
  return (
    <Box width="100%" flexDirection="column" alignItems="center">
      <Box flexDirection="column" alignItems="stretch" borderStyle="round" padding={1} ref={setRef}>
        {/* Status Bar (always visible) */}
        <StatusBar />

        <Box marginTop={2} marginBottom={1}>
          <Divider containerRef={ref} />
        </Box>

        {/* Main Content Area (with minimum height) */}
        <Box minHeight={15}>{children}</Box>

        <Box marginTop={2} marginBottom={1}>
          <Divider containerRef={ref} />
        </Box>

        {/* Action/Message Area */}
        <Box minHeight={5}>
          <ActionArea />
        </Box>
      </Box>
    </Box>
  );
}

function StatusBar() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const shipHealth = getShipStatus(context.ship.health);

  return (
    <Box flexDirection="column" gap={1}>
      <Box>
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
    </Box>
  );
}

export function GameScreen() {
  const [ref, setRef] = useState<DOMElement | null>(null);
  const machine = GameContext.useSelector((snapshot) => snapshot);
  const currentView = getCurrentView();

  return (
    <Layout>{currentView}</Layout>
    // <Box width="100%" flexDirection="column" alignItems="center">
    //   <Box flexDirection="column" alignItems="stretch" borderStyle="round" padding={1} ref={setRef}>
    //     <StatusBar />
    //     <Box height={2} />
    //     <Box gap={4}>
    //       <Box flexDirection="column">
    //         <PriceList />
    //         <Box height={2} />
    //         <Inventory />
    //       </Box>
    //       <Box flexDirection="column" alignItems="center"></Box>
    //     </Box>

    //     <Box marginTop={2} marginBottom={1}>
    //       <Divider containerRef={ref} />
    //     </Box>

    //     <Box flexDirection="column" minHeight={10}>
    //       {messages && messages.length > 0 ? <Messages /> : <Actions />}
    //     </Box>
    //   </Box>
    // </Box>
  );
}

function getCurrentView() {
  const machine = GameContext.useSelector((snapshot) => snapshot);

  if (machine.matches({ gameScreen: "idle" })) {
    return <MainView />;
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

function MainView() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const netWorth = getNetCash(context);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Current Status:</Text>
      <Text>Net Worth: {netWorth < 0 ? `-$${Math.abs(netWorth)}` : `$${netWorth}`}</Text>
      {context.extendedGame && <Text>Days Played: {context.day} (Extended Mode)</Text>}
    </Box>
  );
}

function PortView() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const availablePorts = context.availablePorts;

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Available Destinations:</Text>

      <Box flexDirection="column" gap={1}>
        {availablePorts.map((port) => {
          const travelTime = calculateTravelTime(context.currentPort, port, context.ship.speed);
          const dailyCost = calculateDailyMaintenanceCost(context);
          const maintenanceCost = dailyCost * travelTime;

          return (
            <Box key={port} flexDirection="column">
              <Text bold>{port}</Text>
              <Text>{"─".repeat(30)}</Text>
              <Box flexDirection="column" marginLeft={2}>
                <Text>Travel Time: {travelTime} days</Text>
                {context.guardFleet.ships > 0 && <Text>Fleet Maintenance Cost: ${maintenanceCost}</Text>}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function InventoryView() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const availableStorage = getAvailableStorage(context.ship);

  // Create table data for current cargo
  const cargoData = Array.from(context.ship.hold.entries())
    .filter(([_, quantity]) => quantity > 0)
    .map(([good, quantity]) => {
      const currentPrice = context.prices[context.currentPort][good];
      return {
        Good: good,
        Quantity: `${quantity} tons`,
        "Current Value": `$${currentPrice * quantity}`,
      };
    });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold underline>
        Cargo Manifest
      </Text>

      {cargoData.length > 0 ? (
        <Table
          data={cargoData}
          columns={[
            { key: "Good", align: "left" },
            { key: "Quantity", align: "right" },
            { key: "Current Value", align: "right" },
          ]}
        />
      ) : (
        <Text dimColor>No cargo in hold</Text>
      )}

      <Box height={1} />

      <Box flexDirection="column">
        <Text>Storage Space:</Text>
        <Text>
          {" "}
          • Used: <Badge color="gray">{context.ship.capacity - availableStorage} tons</Badge>
        </Text>
        <Text>
          {" "}
          • Available: <Badge color="gray">{availableStorage} tons</Badge>
        </Text>
        <Text>
          {" "}
          • Total Capacity: <Badge color="gray">{context.ship.capacity} tons</Badge>
        </Text>
      </Box>
    </Box>
  );
}

function MarketView() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const isOverdrawn = context.balance < 0;

  const marketData = context.availableGoods.map((good) => {
    const price = context.prices[context.currentPort][good];
    const trend = context.trends[context.currentPort][good];
    const quantity = context.ship.hold.get(good) || 0;

    return {
      Good: good,
      Price: `$${price}`,
      Trend: trend === "increasing" ? "↑" : trend === "decreasing" ? "↓" : "",
      "In Hold": quantity.toString(),
    };
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold underline>
        Market Prices
      </Text>

      {isOverdrawn && (
        <Alert variant="error">Trading limited to ${context.balance + OVERDRAFT_TRADING_LIMIT} due to overdraft</Alert>
      )}

      <Table
        data={marketData}
        columns={[
          { key: "Good", align: "left" },
          { key: "Price", align: "right" },
          { key: "Trend", align: "left" },
          { key: "In Hold", align: "right" },
        ]}
      />

      <Text dimColor>
        <Text underline>Next Updates</Text>: Prices in{" "}
        <Badge color={context.nextPriceUpdate <= 3 ? "yellow" : "white"}>{context.nextPriceUpdate}</Badge> days, Trends
        in <Badge color={context.nextTrendUpdate <= 3 ? "yellow" : "white"}>{context.nextTrendUpdate}</Badge> days
      </Text>
    </Box>
  );
}

function FleetView() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const dailyMaintenance = calculateDailyMaintenanceCost(context);
  const daysUntilMaintenance = context.guardFleet.lastMaintenanceDay + 7 - context.day;
  const hasGuards = context.guardFleet.ships > 0;

  return (
    <Box flexDirection="column">
      <Text bold underline>
        Guard Fleet Management
      </Text>

      {context.inOverdraft && <Alert variant="error">Fleet effectiveness is reduced while in overdraft</Alert>}

      <Box flexDirection="column" marginY={1}>
        <Text bold>Current Fleet:</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>
            Ships: <Badge color={hasGuards ? "blue" : "gray"}>{context.guardFleet.ships} ships</Badge>
          </Text>
          <Text>
            Quality: <Badge color={hasGuards ? "cyan" : "gray"}>Level {context.guardFleet.quality}</Badge>
            {context.inOverdraft && <Badge color="red"> (Halved due to overdraft)</Badge>}
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginY={1}>
        <Text bold>Maintenance:</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>Daily Cost: ${dailyMaintenance}</Text>
          {hasGuards && (
            <Text>
              Next Payment:{" "}
              <Badge color={daysUntilMaintenance <= 2 ? "yellow" : "white"}>{daysUntilMaintenance} days</Badge>
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function ShipyardView() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const shipHealth = getShipStatus(context.ship.health);
  const repairCost = calculateCostForRepair(100 - context.ship.health);
  const needsRepair = context.ship.health < 100;

  return (
    <Box flexDirection="column">
      <Text bold underline>
        Shipyard
      </Text>

      <Box flexDirection="column" marginY={1}>
        <Text bold>Ship Condition:</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>
            Health:{" "}
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

          {needsRepair && <Text>Repair Cost: ${repairCost}</Text>}
        </Box>
      </Box>

      <Box flexDirection="column" marginY={1}>
        <Text bold>Ship Details:</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>Cargo Capacity: {context.ship.capacity} tons</Text>
          <Text>Base Speed: {context.ship.speed} knots</Text>
        </Box>
      </Box>

      {!needsRepair && (
        <Box marginTop={1}>
          <Badge color="green">Ship is in perfect condition</Badge>
        </Box>
      )}
    </Box>
  );
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
  const actor = GameContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const { context } = snapshot;
  const controls = context.settings.controls;
  const isAtPort = snapshot.matches({ gameScreen: "at_port" });
  const isAtInventory = snapshot.matches({ gameScreen: "viewing_inventory" });
  const isAtMarket = snapshot.matches({ gameScreen: "at_market" });
  const isManagingFleet = snapshot.matches({ gameScreen: "managing_fleet" });
  const isAtShipyard = snapshot.matches({ gameScreen: "at_shipyard" });
  const isAtRetirement = snapshot.matches({ gameScreen: "at_retirement" });
  const isAtBankruptcy = snapshot.matches({ gameScreen: "at_bankruptcy" });
  const isAtExit = snapshot.matches({ gameScreen: "at_exit" });

  const handleSelect = (value: string) => {
    if (value === "T") {
      actor.send({ type: "GO_TO_PORT" });
    } else if (value === "I") {
      actor.send({ type: "GO_TO_INVENTORY" });
    } else if (value === "B") {
      actor.send({ type: "GO_TO_MARKET", action: "buy" });
    } else if (value === "S") {
      actor.send({ type: "GO_TO_MARKET", action: "sell" });
    } else if (value === "F") {
      actor.send({ type: "MANAGE_FLEET" });
    } else if (value === "Y") {
      actor.send({ type: "GO_TO_SHIPYARD" });
    } else if (value === "W") {
      actor.send({ type: "GO_TO_RETIREMENT" });
    } else if (value === "D") {
      actor.send({ type: "GO_TO_BANKRUPTCY" });
    }
  };

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
    controls === "keyboard" ? (
      <ConfirmPromptKeyboard
        message="Are you sure you want to exit?"
        onConfirm={() => process.exit()}
        onCancel={() => actor.send({ type: "CANCEL" })}
      />
    ) : (
      <ConfirmPromptArrows
        message="Are you sure you want to exit?"
        onConfirm={() => process.exit()}
        onCancel={() => actor.send({ type: "CANCEL" })}
      />
    )
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
            { label: "View inventory", value: "I", key: "I" },
            { label: "Buy goods", value: "B", key: "B" },
            { label: "Sell goods", value: "S", key: "S" },
            { label: "Manage fleet", value: "F", key: "F" },
            { label: "Visit shipyard", value: "Y", key: "Y" },
            // { label: "Repair ship", value: "R", disabled: context.ship.health === 100, key: "R" },
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
            { label: "View inventory", value: "I" },
            { label: "Buy goods", value: "B" },
            { label: "Sell goods", value: "S" },
            { label: "Manage fleet", value: "F" },
            { label: "Visit shipyard", value: "Y" },
            { label: "Retire", value: "W", disabled: !context.canRetire },
            { label: "Declare bankruptcy", value: "D", disabled: context.balance >= 0 },
          ]}
          onSelect={handleSelect}
        />
      )}
      <ExitGame />
    </Box>
  );
}

function ExitGame() {
  const actor = GameContext.useActorRef();

  useInput((_, key) => {
    if (key.escape) {
      actor.send({ type: "EXIT" });
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

function InventoryAction() {
  const actor = GameContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const { context } = snapshot;
  const controls = context.settings.controls;

  const handleSelect = (value: string) => {
    if (value === "B") {
      actor.send({ type: "GO_TO_MARKET", action: "buy" });
    } else if (value === "S") {
      actor.send({ type: "GO_TO_MARKET", action: "sell" });
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Text underline>Inventory</Text>
      {controls === "keyboard" ? (
        <ActionPromptKeyboard
          message="What would you like to do?"
          actions={[
            { label: "Buy goods", value: "B", key: "B" },
            { label: "Sell goods", value: "S", key: "S" },
          ]}
          onSelect={handleSelect}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : (
        <ActionPromptArrows
          message="What would you like to do?"
          actions={[
            { label: "Buy goods", value: "B" },
            { label: "Sell goods", value: "S" },
          ]}
          onSelect={handleSelect}
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
        context.marketAction === "buy" ? (
          <Text>You can afford {affordance} units.</Text>
        ) : (
          <Text>You have {inHold} units in your hold.</Text>
        )
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
  const isMenu = snapshot.matches({ gameScreen: { at_shipyard: "menu" } });
  const isRepairing = snapshot.matches({ gameScreen: { at_shipyard: "repairing" } });

  const pickAction = (value: string) => {
    if (value === "repair") {
      actor.send({ type: "GO_TO_SHIPYARD_REPAIR" });
    } else if (value === "upgrade") {
      // TODO: implement upgrade
    }
  };
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
      {controls === "keyboard" ? (
        isMenu ? (
          <ActionPromptKeyboard
            message="What would you like to do?"
            actions={[
              { label: "Repair ship", value: "repair", key: "R", disabled: context.ship.health >= 100 },
              { label: "Upgrade ship", value: "upgrade", key: "U" },
            ]}
            onSelect={pickAction}
            onCancel={() => actor.send({ type: "CANCEL" })}
          />
        ) : isRepairing ? (
          <InputPromptKeyboard
            steps={[
              {
                type: "text",
                id: "amount",
                message: `How much would you like to spend on repairs?`,
                validate: validateAmount,
              },
            ]}
            onComplete={repairShip}
            onCancel={() => actor.send({ type: "CANCEL" })}
          />
        ) : null
      ) : isMenu ? (
        <ActionPromptArrows
          message="What would you like to do?"
          actions={[
            { label: "Repair ship", value: "repair", disabled: context.ship.health >= 100 },
            { label: "Upgrade ship", value: "upgrade" },
          ]}
          onSelect={pickAction}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : isRepairing ? (
        <InputPromptArrows
          steps={[
            {
              type: "text",
              id: "amount",
              message: `How much would you like to spend on repairs?`,
              validate: validateAmount,
            },
          ]}
          onComplete={repairShip}
          onCancel={() => actor.send({ type: "CANCEL" })}
        />
      ) : null}
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
