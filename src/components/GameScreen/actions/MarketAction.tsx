import React, { useEffect } from "react";
import { Box, Text } from "ink";
import { GameContext, TransactionContext } from "../../GameContext.js";
import { Good } from "../../../store/types.js";
import { InputPrompt as InputPromptKeyboard } from "../../prompts/keyboard/InputPrompt.js";
import { InputPrompt as InputPromptArrows } from "../../prompts/arrows/InputPrompt.js";
import { useState } from "react";

export function MarketAction() {
  const actor = GameContext.useActorRef();
  const transactionActor = TransactionContext.useActorRef();
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const { context } = snapshot;
  const controls = context.settings.controls;
  const [good, setGood] = useState<Good | undefined>(undefined);
  const isSellMode = context.marketAction === "sell";

  useEffect(() => {
    if (context.marketAction !== undefined) {
      transactionActor.send({ type: "RESET", action: context.marketAction });
    }
  }, [context.marketAction]);

  const onSelect = (value: string, goToStep: (step?: number) => void) => {
    if (value === "sell_all") {
      actor.send({
        type: "SELL_ALL",
      });
      goToStep(0);
    } else if (value === "switch_mode") {
      actor.send({
        type: "GO_TO_MARKET",
        action: context.marketAction === "buy" ? "sell" : "buy",
      });
      goToStep(0);
    } else {
      setGood(value as Good);
      transactionActor.send({ type: "UPDATE_GOOD", good: value as Good });
    }
  };
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
  const onChangeQuantity = (value: string) => {
    transactionActor.send({ type: "UPDATE_QUANTITY", quantity: +value });
  };

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Text underline>Goods Market</Text>
      {controls === "keyboard" ? (
        <InputPromptKeyboard
          steps={[
            {
              type: "enum",
              id: "good",
              message: `Which good do you wish to ${context.marketAction === "buy" ? "purchase" : "sell"}?`,
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
                  label: `Switch to ${context.marketAction === "buy" ? "Sell" : "Buy"} Mode`,
                  value: "switch_mode",
                  key: "X",
                },
              ],
              onSelect,
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
          onCancel={() => actor.send({ type: "CANCEL" })}
          exitMessage="Press [Esc] to leave the market"
        />
      ) : (
        <InputPromptArrows
          steps={[
            {
              type: "enum",
              id: "good",
              message: `Which good do you wish to ${context.marketAction === "buy" ? "purchase" : "sell"}?`,
              actions: [
                ...context.availableGoods.map((good) => ({ label: good, value: good })),
                {
                  label: `Sell All Goods`,
                  value: "sell_all",
                  disabled: !isSellMode,
                },
                {
                  label: `Switch to ${context.marketAction === "buy" ? "Sell" : "Buy"} Mode`,
                  value: "switch_mode",
                },
              ],
              onSelect,
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
          onCancel={() => actor.send({ type: "CANCEL" })}
          exitMessage="Press [Esc] to leave the market"
        />
      )}
    </Box>
  );
}
