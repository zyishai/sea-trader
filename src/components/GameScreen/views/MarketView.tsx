import React from "react";
import { Box, Text } from "ink";
import { GameContext } from "../../GameContext.js";
import { displayMonetaryValue, getAvailableStorage, getMerchantTip, getStorageUsed } from "../../../store/utils.js";
import { OVERDRAFT_TRADING_LIMIT, ports } from "../../../store/constants.js";
import { Good } from "../../../store/types.js";
import { MarketContext } from "../MarketContext.js";
import { ActionPrompt as ActionPromptKeyboard } from "../../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../../prompts/arrows/ActionPrompt.js";
import { InputPrompt as InputPromptKeyboard } from "../../prompts/keyboard/InputPrompt.js";
import { InputPrompt as InputPromptArrows } from "../../prompts/arrows/InputPrompt.js";
import { Columns } from "../Columns.js";
import { assert } from "node:console";
import figlet from "figlet";

export function MarketView() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const snapshot = MarketContext.useSelector((snapshot) => snapshot);
  const availableGoods = context.availableGoods;

  return (
    <Box flexDirection="column" gap={1} width="100%">
      <Text>{figlet.textSync("Market")}</Text>

      <Box flexDirection="column" borderStyle="single">
        <Box justifyContent="space-between">
          <Text underline>
            Cargo Hold ({getStorageUsed(context.ship)}/{context.ship.capacity})
          </Text>
          <Text>Available: {getAvailableStorage(context.ship)}</Text>
        </Box>
        <Box flexDirection="column" paddingLeft={3}>
          <Columns data={[...context.ship.hold.entries()].map(([good, quantity]) => [`- ${good}`, quantity])} />
        </Box>
      </Box>

      <Box flexDirection="column" borderStyle="single">
        <Text underline>Price List</Text>
        <Box flexDirection="column" paddingLeft={0}>
          <Columns
            data={[
              [
                " ",
                ...availableGoods.map((good, index) => (
                  <Text key={"header" + index} bold>
                    {good}
                  </Text>
                )),
              ],
              ...ports.map((port) => [
                port,
                ...availableGoods.map((good, index) => (
                  <Box key={port + index} justifyContent="flex-end">
                    <Text>{displayMonetaryValue(context.prices[port][good])}</Text>
                  </Box>
                )),
              ]),
            ]}
          />
        </Box>
      </Box>

      {snapshot.matches("menu") ? (
        <MarketOverview />
      ) : snapshot.matches("buying") ? (
        <BuyMarket />
      ) : snapshot.matches("selling") ? (
        <SellMarket />
      ) : null}
    </Box>
  );
}

function MarketOverview() {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const market = MarketContext.useActorRef();

  const merchantTip = getMerchantTip(context);
  const controls = context.settings.controls;

  const availableActions = [
    { label: "Buy Goods", value: "buy_goods" },
    { label: "Sell Goods", value: "sell_goods" },
  ];
  const onSelectAction = (value: string) => {
    switch (value) {
      case "buy_goods": {
        market.send({ type: "SELECT_ACTION", action: "buy" });
        break;
      }
      case "sell_goods": {
        market.send({ type: "SELECT_ACTION", action: "sell" });
        break;
      }
    }
  };

  return (
    <Box flexDirection="column" gap={1}>
      {merchantTip ? (
        <Box flexDirection="column">
          <Text color="green">Merchant Tip:</Text>
          <Text>&ldquo;{merchantTip.message}&rdquo;</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          <Text color="green">Tip:</Text>
          <Text>Increase your reputation to get insider tips.</Text>
        </Box>
      )}

      {controls === "keyboard" ? (
        <ActionPromptKeyboard
          message="Actions:"
          actions={availableActions.map((action, index) => ({ ...action, key: String(index + 1) }))}
          onSelect={onSelectAction}
          onCancel={() => actor.send({ type: "CANCEL" })}
          backMessage="Press [Esc] to leave marke"
        />
      ) : (
        <ActionPromptArrows
          message="Actions:"
          actions={availableActions}
          onSelect={onSelectAction}
          onCancel={() => actor.send({ type: "CANCEL" })}
          backMessage="Press [Esc] to leave marke"
        />
      )}
    </Box>
  );
}

function BuyMarket() {
  const marketSnapshot = MarketContext.useSelector((snapshot) => snapshot);

  return marketSnapshot.matches({ buying: "pick_good" }) ? (
    <PickGood action="buy" />
  ) : marketSnapshot.matches({ buying: "select_quantity" }) ? (
    <SelectQuantity action="buy" />
  ) : null;
}

function PickGood({ action }: { action: "buy" | "sell" }) {
  const market = MarketContext.useActorRef();
  const gameContext = GameContext.useSelector((snapshot) => snapshot.context);
  const controls = gameContext.settings.controls;

  const availableActions = gameContext.availableGoods.map((good) => ({
    label: good,
    value: good,
  }));
  const onSelectGood = (value: string) => {
    assert(gameContext.availableGoods.includes(value as Good));
    market.send({ type: "PICK_GOOD", good: value as Good });
  };

  return controls === "keyboard" ? (
    <ActionPromptKeyboard
      message={action === "buy" ? "Which good would you like to buy, Captain?" : "What do you offer to sell, Captain?"}
      actions={availableActions.map((action, index) => ({ ...action, key: String(index + 1) }))}
      onSelect={onSelectGood}
      onCancel={() => market.send({ type: "CANCEL" })}
    />
  ) : (
    <ActionPromptArrows
      message={action === "buy" ? "Which good would you like to buy, Captain?" : "What do you offer to sell, Captain?"}
      actions={availableActions}
      onSelect={onSelectGood}
      onCancel={() => market.send({ type: "CANCEL" })}
    />
  );
}

function SelectQuantity({ action }: { action: "buy" | "sell" }) {
  const actor = GameContext.useActorRef();
  const market = MarketContext.useActorRef();
  const marketSnapshot = MarketContext.useSelector((snapshot) => snapshot);
  const marketContext = marketSnapshot.context;
  const gameContext = GameContext.useSelector((snapshot) => snapshot.context);
  const controls = gameContext.settings.controls;
  const affordance = Math.max(
    0,
    Math.floor(
      (gameContext.balance + (gameContext.inOverdraft ? OVERDRAFT_TRADING_LIMIT : 0)) /
        gameContext.prices[gameContext.currentPort][marketContext.good!],
    ),
  );

  const onValidateQuantity = (value: string) => {
    const quantity = +value;
    if (isNaN(quantity) || quantity < 0) return "Invalid quantity";

    return;
  };
  const onSubmit = (values: Record<string, string>) => {
    const { quantity = "" } = values;

    if (action === "buy") {
      actor.send({ type: "PURCHASE", good: marketContext.good!, quantity: +quantity });
      market.send({ type: "COMMIT" });
    } else {
      actor.send({ type: "SELL", good: marketContext.good!, quantity: +quantity });
      market.send({ type: "COMMIT" });
    }
  };

  return !marketContext.good ? null : (
    <Box flexDirection="column" gap={1}>
      {action === "buy" ? (
        <Text>
          You can afford {affordance} picul{affordance !== 1 ? "s" : ""}.
        </Text>
      ) : null}

      {controls === "keyboard" ? (
        <InputPromptKeyboard
          steps={[
            {
              id: "quantity",
              type: "text",
              message:
                action === "buy"
                  ? `How many piculs of ${marketContext.good.toLocaleLowerCase()} would you like, Captain?`
                  : `How many piculs of ${marketContext.good.toLocaleLowerCase()} are you selling, Captain?`,
              validate: onValidateQuantity,
            },
          ]}
          onComplete={onSubmit}
          onCancel={() => market.send({ type: "CANCEL" })}
        />
      ) : (
        <InputPromptArrows
          steps={[
            {
              id: "quantity",
              type: "text",
              message:
                action === "buy"
                  ? `How many piculs of ${marketContext.good.toLocaleLowerCase()} would you like, Captain?`
                  : `How many piculs of ${marketContext.good.toLocaleLowerCase()} are you selling, Captain?`,
              validate: onValidateQuantity,
            },
          ]}
          onComplete={onSubmit}
          onCancel={() => market.send({ type: "CANCEL" })}
        />
      )}
    </Box>
  );
}

function SellMarket() {
  const marketSnapshot = MarketContext.useSelector((snapshot) => snapshot);

  return marketSnapshot.matches({ selling: "pick_good" }) ? (
    <PickGood action="sell" />
  ) : marketSnapshot.matches({ selling: "select_quantity" }) ? (
    <SelectQuantity action="sell" />
  ) : null;
}
