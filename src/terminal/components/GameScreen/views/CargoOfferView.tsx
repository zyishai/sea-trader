import { usePreferences } from "../../Preferences.js";
import React from "react";
import { Box } from "ink";
import { Badge } from "@inkjs/ui";
import { GameContext } from "../../GameContext.js";
import { ActionPrompt as ActionPromptKeyboard } from "../../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../../prompts/arrows/ActionPrompt.js";
import { cargoOfferView } from "../../../../game/index.js";

export function CargoOfferView() {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const { controls } = usePreferences();
  const { offered, takeAll, takeFitting } = cargoOfferView(context);

  const message = `We found ${offered} picul of goods, but there isn't room for all of it, Captain.`;
  const availableActions = [
    {
      label: `Take as much as we can carry (${takeAll.picul} picul${takeAll.overloads ? ", the ship will be overloaded" : ""})`,
      value: "all",
    },
    {
      label: takeFitting.picul > 0 ? `Take only what fits (${takeFitting.picul} picul)` : "Leave it behind",
      value: "fitting",
    },
  ];
  const onSelectAction = (value: string) => {
    actor.send({ type: "TAKE_CARGO", overload: value === "all" });
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Badge color="greenBright">Cargo</Badge>
      {controls === "keyboard" ? (
        <ActionPromptKeyboard
          message={message}
          actions={availableActions.map((action, index) => ({ ...action, key: String(index + 1) }))}
          onSelect={onSelectAction}
        />
      ) : (
        <ActionPromptArrows message={message} actions={availableActions} onSelect={onSelectAction} />
      )}
    </Box>
  );
}
