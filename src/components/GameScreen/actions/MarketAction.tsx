import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { GameContext, TransactionContext } from "../../GameContext.js";
import { Good, Port } from "../../../store/types.js";
import { InputPrompt as InputPromptKeyboard } from "../../prompts/keyboard/InputPrompt.js";
import { InputPrompt as InputPromptArrows } from "../../prompts/arrows/InputPrompt.js";
import { ActionPrompt as ActionPromptKeyboard } from "../../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../../prompts/arrows/ActionPrompt.js";
import { getIntelligenceCost } from "../../../store/utils.js";

export function MarketAction() {
  const actor = GameContext.useActorRef();
  const transactionActor = TransactionContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const { context } = snapshot;
  const controls = context.settings.controls;
  const [good, setGood] = useState<Good | undefined>(undefined);
  const isMenu = snapshot.matches({ gameScreen: { at_market: "menu" } });
  const isMarketIntelligenceMode = snapshot.matches({ gameScreen: { at_market: "intelligenceAction" } });
  const isMarketIntelligenceViewing = snapshot.matches({
    gameScreen: { at_market: { intelligenceAction: "viewing" } },
  });
  const isMarketIntelligencePurchasing = snapshot.matches({
    gameScreen: { at_market: { intelligenceAction: "purchasing" } },
  });
  const isBuyMode = snapshot.matches({ gameScreen: { at_market: "buyAction" } });
  const isSellMode = snapshot.matches({ gameScreen: { at_market: "sellAction" } });

  useEffect(() => {
    if (isMarketIntelligenceMode) {
      transactionActor.send({ type: "RESET", action: "intelligence" });
    } else if (isBuyMode) {
      transactionActor.send({ type: "RESET", action: "buy" });
    } else if (isSellMode) {
      transactionActor.send({ type: "RESET", action: "sell" });
    }
  }, [isSellMode, isBuyMode, isMarketIntelligenceMode]);

  const onPickAction = (value: string) => {
    if (value === "I") {
      actor.send({ type: "VIEW_MARKET_INTELLIGENCE" });
    } else if (value === "B") {
      actor.send({ type: "START_BUYING" });
    } else if (value === "S") {
      actor.send({ type: "START_SELLING" });
    }
  };
  const onSelectGood = (value: string, goToStep: (step?: number) => void) => {
    if (value === "sell_all") {
      actor.send({
        type: "SELL_ALL",
      });
      goToStep(0);
    } else if (value === "switch_mode") {
      if (isSellMode) {
        actor.send({ type: "START_BUYING" });
      } else {
        actor.send({ type: "START_SELLING" });
      }
      goToStep(0);
    } else {
      setGood(value as Good);
      transactionActor.send({ type: "UPDATE_GOOD", good: value as Good });
    }
  };
  const handleSubmit = (values: Record<string, string>) => {
    const { good, quantity } = values;
    if (good && quantity && !isNaN(+quantity)) {
      if (!isSellMode) {
        actor.send({
          type: "PURCHASE",
          good: good as Good,
          quantity: +quantity,
        });
      } else if (isSellMode) {
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
  const onChangeQuantity = (value: string) => {
    transactionActor.send({ type: "UPDATE_QUANTITY", quantity: +value });
  };
  const onPickIntelligenceViewPort = (value: string) => {
    if (value === "purchase_intelligence") {
      actor.send({ type: "START_MARKET_INTELLIGENCE_PURCHASE" });
    } else {
      const port = value as Port;
      transactionActor.send({ type: "PICK_MARKET_INTELLIGENCE_PORT", port });
    }
  };
  const onPurchaseIntelligence = (value: string) => {
    if (value === "B") {
      actor.send({ type: "PURCHASE_MARKET_INTELLIGENCE", level: 1 });
    } else if (value === "S") {
      actor.send({ type: "PURCHASE_MARKET_INTELLIGENCE", level: 2 });
    } else if (value === "E") {
      actor.send({ type: "PURCHASE_MARKET_INTELLIGENCE", level: 3 });
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Text underline>Goods Market</Text>
      {controls === "keyboard" ? (
        isMenu ? (
          <ActionPromptKeyboard
            message="What would you like to do?"
            actions={[
              { label: "View market intelligence", value: "I", key: "I" },
              { label: "Buy goods", value: "B", key: "B" },
              { label: "Sell goods", value: "S", key: "S" },
            ]}
            onSelect={onPickAction}
            onCancel={() => actor.send({ type: "CANCEL" })}
            backMessage="Press [Esc] to leave the market"
          />
        ) : isMarketIntelligenceViewing ? (
          <ActionPromptKeyboard
            message="Which port would you like view?"
            actions={[
              ...context.availablePorts
                .filter((port) => context.marketIntelligence.level >= 2 || port === context.currentPort)
                .map((port, index) => ({
                  label: port,
                  value: port,
                  key: String(index + 1),
                })),
              { label: "Purchase market intelligence", value: "purchase_intelligence", key: "P" },
            ]}
            onSelect={onPickIntelligenceViewPort}
            onCancel={() => actor.send({ type: "BACK" })}
          />
        ) : isMarketIntelligencePurchasing ? (
          <ActionPromptKeyboard
            message="What kind of information would you like to purchase?"
            actions={[
              { label: `Basic ($${getIntelligenceCost(1, context)})`, value: "B", key: "B" },
              { label: `Standard ($${getIntelligenceCost(2, context)})`, value: "S", key: "S" },
              { label: `Exclusive ($${getIntelligenceCost(3, context)})`, value: "E", key: "E" },
            ]}
            onSelect={onPurchaseIntelligence}
            onCancel={() => actor.send({ type: "BACK" })}
          />
        ) : (
          <InputPromptKeyboard
            steps={[
              {
                type: "enum",
                id: "good",
                message: `Which good do you wish to ${isBuyMode ? "purchase" : "sell"}?`,
                actions: [
                  ...context.availableGoods.map((good) => ({
                    label: good,
                    value: good,
                    key: good.charAt(0).toUpperCase(),
                  })),
                  {
                    label: `Sell All Goods`,
                    value: "sell_all",
                    key: "A",
                    disabled: !isSellMode,
                  },
                  {
                    label: `Switch to ${isBuyMode ? "Sell" : "Buy"} Mode`,
                    value: "switch_mode",
                    key: "X",
                  },
                ],
                onSelect: onSelectGood,
                onEnter: () => {
                  setGood(undefined);
                  transactionActor.send({ type: "UPDATE_GOOD" });
                },
              },
              {
                type: "text",
                id: "quantity",
                message: `How many picul of ${good}?`,
                validate: validateQuantity,
                onChange: onChangeQuantity,
                onEnter: () => {
                  transactionActor.send({ type: "UPDATE_QUANTITY", quantity: 0 });
                },
              },
            ]}
            onComplete={handleSubmit}
            onCancel={() => actor.send({ type: "BACK" })}
          />
        )
      ) : isMenu ? (
        <ActionPromptArrows
          message="What would you like to do?"
          actions={[
            { label: "View market intelligence", value: "I" },
            { label: "Buy goods", value: "B" },
            { label: "Sell goods", value: "S" },
          ]}
          onSelect={onPickAction}
          onCancel={() => actor.send({ type: "CANCEL" })}
          backMessage="Press [Esc] to leave the market"
        />
      ) : isMarketIntelligenceViewing ? (
        <ActionPromptArrows
          message="Which port would you like view?"
          actions={[
            ...context.availablePorts
              .filter((port) => context.marketIntelligence.level >= 2 || port === context.currentPort)
              .map((port) => ({ label: port, value: port })),
            { label: "Purchase market intelligence", value: "purchase_intelligence" },
          ]}
          onSelect={onPickIntelligenceViewPort}
          onCancel={() => actor.send({ type: "BACK" })}
        />
      ) : isMarketIntelligencePurchasing ? (
        <ActionPromptArrows
          message="What kind of information would you like to purchase?"
          actions={[
            { label: `Basic ($${getIntelligenceCost(1, context)})`, value: "B" },
            { label: `Standard ($${getIntelligenceCost(2, context)})`, value: "S" },
            { label: `Exclusive ($${getIntelligenceCost(3, context)})`, value: "E" },
          ]}
          onSelect={onPurchaseIntelligence}
          onCancel={() => actor.send({ type: "BACK" })}
        />
      ) : (
        <InputPromptArrows
          steps={[
            {
              type: "enum",
              id: "good",
              message: `Which good do you wish to ${isBuyMode ? "purchase" : "sell"}?`,
              actions: [
                ...context.availableGoods.map((good) => ({ label: good, value: good })),
                {
                  label: `Sell All Goods`,
                  value: "sell_all",
                  disabled: !isSellMode,
                },
                {
                  label: `Switch to ${isBuyMode ? "Sell" : "Buy"} Mode`,
                  value: "switch_mode",
                },
              ],
              onSelect: onSelectGood,
              onEnter: () => {
                setGood(undefined);
                transactionActor.send({ type: "UPDATE_GOOD" });
              },
            },
            {
              type: "text",
              id: "quantity",
              message: `How many picul of ${good}?`,
              validate: validateQuantity,
              onChange: onChangeQuantity,
              onEnter: () => {
                transactionActor.send({ type: "UPDATE_QUANTITY", quantity: 0 });
              },
            },
          ]}
          onComplete={handleSubmit}
          onCancel={() => actor.send({ type: "BACK" })}
        />
      )}
    </Box>
  );
}
