import { usePreferences } from "../../Preferences.js";
import React from "react";
import { Box, Text } from "ink";
import { useNavigation } from "../Navigation.js";
import { Good, displayMonetaryValue, issueCommand, marketView } from "../../../../game/index.js";
import { GameContext } from "../../GameContext.js";
import { MarketContext } from "../MarketContext.js";
import { ActionPrompt as ActionPromptKeyboard } from "../../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../../prompts/arrows/ActionPrompt.js";
import { InputPrompt as InputPromptKeyboard } from "../../prompts/keyboard/InputPrompt.js";
import { InputPrompt as InputPromptArrows } from "../../prompts/arrows/InputPrompt.js";
import { Table } from "../Table.js";
import { ViewTitle } from "../ViewTitle.js";

export function MarketView() {
  const view = GameContext.useSelector((snapshot) => marketView(snapshot.context));
  const snapshot = MarketContext.useSelector((snapshot) => snapshot);

  return (
    <Box flexDirection="column" gap={1} width="100%">
      <ViewTitle text="Market" />

      <Box flexDirection="column" borderStyle="single">
        <Box justifyContent="space-between" columnGap={2} flexWrap="wrap">
          <Text underline>Price List</Text>
          <Text>
            Hold: {view.hold.used} / {view.hold.capacity} picul
          </Text>
        </Box>
        <Table
          gap={2}
          align={["left", ...view.goods.map(() => "right" as const)]}
          header={["", ...view.goods.map(({ good }) => good)]}
          rows={view.priceList.map(({ port, prices }) => [port, ...prices.map(displayMonetaryValue)])}
          footer={["In Hold", ...view.goods.map(({ inHold }) => inHold)]}
        />
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
  const { navigate } = useNavigation();
  const controls = usePreferences().controls;
  const { merchantTip } = GameContext.useSelector((snapshot) => marketView(snapshot.context));
  const market = MarketContext.useActorRef();

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
          onCancel={() => navigate("menu")}
          backMessage="Press [Esc] to leave market"
        />
      ) : (
        <ActionPromptArrows
          message="Actions:"
          actions={availableActions}
          onSelect={onSelectAction}
          onCancel={() => navigate("menu")}
          backMessage="Press [Esc] to leave market"
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
  const controls = usePreferences().controls;
  const { goods } = GameContext.useSelector((snapshot) => marketView(snapshot.context));

  const availableActions = goods.map(({ good }) => ({ label: good, value: good }));
  const onSelectGood = (value: string) => {
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
  const controls = usePreferences().controls;
  const { goods } = GameContext.useSelector((snapshot) => marketView(snapshot.context));
  const maxBuy = goods.find(({ good }) => good === marketContext.good)?.maxBuy;

  const onValidateQuantity = (value: string) => {
    const quantity = +value;
    if (isNaN(quantity) || quantity < 0) return "Invalid quantity";

    return;
  };
  const onSubmit = (values: Record<string, string>) => {
    const { quantity = "" } = values;

    if (action === "buy") {
      if (issueCommand(actor, { type: "PURCHASE", good: marketContext.good!, quantity: +quantity })?.accepted) {
        market.send({ type: "COMMIT" });
      }
    } else {
      if (issueCommand(actor, { type: "SELL", good: marketContext.good!, quantity: +quantity })?.accepted) {
        market.send({ type: "COMMIT" });
      }
    }
  };

  return !marketContext.good ? null : (
    <Box flexDirection="column" gap={1}>
      {action === "buy" && maxBuy ? (
        <Text>
          We can buy up to {maxBuy.withinCapacity} picul
          {maxBuy.withOverload > maxBuy.withinCapacity ? ` (${maxBuy.withOverload} if we overload)` : ""}, Captain.
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
                  ? `How many picul of ${marketContext.good.toLocaleLowerCase()} would you like, Captain?`
                  : `How many picul of ${marketContext.good.toLocaleLowerCase()} are you selling, Captain?`,
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
                  ? `How many picul of ${marketContext.good.toLocaleLowerCase()} would you like, Captain?`
                  : `How many picul of ${marketContext.good.toLocaleLowerCase()} are you selling, Captain?`,
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
