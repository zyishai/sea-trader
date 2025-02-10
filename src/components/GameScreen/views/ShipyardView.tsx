import React from "react";
import { Box, Text } from "ink";
import { GameContext } from "../../GameContext.js";
import {
  calculateDailyMaintenanceCost,
  calculateFleetUpgradeCost,
  calculateGuardShipCost,
  displayMonetaryValue,
  getFleetQuality,
  getNextCapacityUpgrade,
  getNextDefenseUpgrade,
  getNextSpeedUpgrade,
  getShipStatus,
  getStorageUsed,
} from "../../../store/utils.js";
import { calculateCostForRepair } from "../../../store/utils.js";
import { ShipyardContext } from "../ShipyardContext.js";
import { ActionPrompt as ActionPromptKeyboard } from "../../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../../prompts/arrows/ActionPrompt.js";
import { InputPrompt as InputPromptKeyboard } from "../../prompts/keyboard/InputPrompt.js";
import { InputPrompt as InputPromptArrows } from "../../prompts/arrows/InputPrompt.js";
import { ConfirmPrompt as ConfirmPromptKeyboard } from "../../prompts/keyboard/ConfirmPrompt.js";
import { ConfirmPrompt as ConfirmPromptArrows } from "../../prompts/arrows/ConfirmPrompt.js";
import { MAX_GUARD_QUALITY, MAX_GUARD_SHIPS } from "../../../store/constants.js";
import { Columns } from "../Columns.js";
import figlet from "figlet";

export function ShipyardView() {
  const gameContext = GameContext.useSelector((snapshot) => snapshot.context);
  const hasFleet = gameContext.guardFleet.ships >= 1;
  const snapshot = ShipyardContext.useSelector((snapshot) => snapshot);

  return (
    <Box flexDirection="column" gap={1} width="100%">
      <Text>{figlet.textSync("Shipyard")}</Text>

      <Box flexDirection="column" borderStyle="single">
        <Text bold>Your Ship</Text>
        <Box flexDirection="column" paddingLeft={3}>
          <Columns
            columns={2}
            data={[
              ["- Capacity", `${getStorageUsed(gameContext.ship)}/${gameContext.ship.capacity}`],
              ["- Speed", `${gameContext.ship.speed} knots`],
              ["- Condition", `${getShipStatus(gameContext.ship.health)} (${gameContext.ship.health}%)`],
            ]}
          />
        </Box>
      </Box>

      <Box flexDirection="column" borderStyle="single">
        <Text bold>Guard Fleet</Text>
        <Box flexDirection="column" paddingLeft={3}>
          <Columns
            columns={2}
            data={[
              ["- Fleet Size", `${gameContext.guardFleet.ships} ship${gameContext.guardFleet.ships !== 1 ? "s" : ""}`],
              [
                "- Fleet Quality",
                hasFleet
                  ? `${getFleetQuality(gameContext.guardFleet.quality)} (${gameContext.guardFleet.quality})`
                  : "--",
              ],
              [
                "- Daily Maintenance Cost",
                hasFleet ? `${displayMonetaryValue(calculateDailyMaintenanceCost(gameContext))}` : "--",
              ],
            ]}
          />
        </Box>
      </Box>

      {snapshot.matches("menu") ? (
        <ShipyardOverview />
      ) : snapshot.matches("repair") ? (
        <RepairShip />
      ) : snapshot.matches("upgrade") ? (
        <UpgradeShip />
      ) : snapshot.matches("manage_fleet") ? (
        <ManageFleet />
      ) : null}
    </Box>
  );
}

function ShipyardOverview() {
  const actor = GameContext.useActorRef();
  const gameContext = GameContext.useSelector((snapshot) => snapshot.context);
  const controls = gameContext.settings.controls;
  const shipyard = ShipyardContext.useActorRef();

  const needsRepair = gameContext.ship.health < 100;

  const availableActions = [
    { label: "Upgrade Your Ship", value: "upgrade_ship" },
    { label: "Repair Damage", value: "repair_damage", disabled: !needsRepair },
    { label: "Manage Guard Fleet", value: "manage_fleet" },
  ];
  const onSelectAction = (action: string) => {
    switch (action) {
      case "upgrade_ship": {
        shipyard.send({ type: "SELECT_ACTION", action: "upgrade" });
        break;
      }
      case "repair_damage": {
        shipyard.send({ type: "SELECT_ACTION", action: "repair" });
        break;
      }
      case "manage_fleet": {
        shipyard.send({ type: "SELECT_ACTION", action: "manage_fleet" });
        break;
      }
    }
  };

  return controls === "keyboard" ? (
    <ActionPromptKeyboard
      message="Actions:"
      actions={availableActions
        .filter((action) => !action.disabled)
        .map((action, index) => ({ ...action, key: String(index + 1) }))}
      onSelect={onSelectAction}
      onCancel={() => actor.send({ type: "CANCEL" })}
      backMessage="Press [Esc] to leave shipyard"
    />
  ) : (
    <ActionPromptArrows
      message="Actions:"
      actions={availableActions}
      onSelect={onSelectAction}
      onCancel={() => actor.send({ type: "CANCEL" })}
      backMessage="Press [Esc] to leave shipyard"
    />
  );
}

function RepairShip() {
  const actor = GameContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const controls = context.settings.controls;
  const shipyard = ShipyardContext.useActorRef();

  const repairCost = calculateCostForRepair(100 - context.ship.health, context);

  const onValidateAmount = (value: string) => {
    const amount = +value;

    if (isNaN(amount) || amount < 0) return "Invalid amount";

    return;
  };
  const onSubmit = (values: Record<string, string>) => {
    const { amount = "" } = values;

    actor.send({ type: "REPAIR", cash: +amount });
    shipyard.send({ type: "COMMIT" });
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Text>
        Captain, your ship has taken some damage. To fully repair your ship will cost you{" "}
        {displayMonetaryValue(repairCost)}.
      </Text>
      {controls === "keyboard" ? (
        <InputPromptKeyboard
          steps={[
            {
              id: "amount",
              type: "text",
              message: "How much would you like to spend on repairs, captain?",
              validate: onValidateAmount,
            },
          ]}
          onComplete={onSubmit}
          onCancel={() => shipyard.send({ type: "CANCEL" })}
        />
      ) : (
        <InputPromptArrows
          steps={[
            {
              id: "amount",
              type: "text",
              message: "How much would you like to spend on repairs, captain?",
              validate: onValidateAmount,
            },
          ]}
          onComplete={onSubmit}
          onCancel={() => shipyard.send({ type: "CANCEL" })}
        />
      )}
    </Box>
  );
}

function UpgradeShip() {
  const actor = GameContext.useActorRef();
  const shipyard = ShipyardContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const controls = context.settings.controls;

  const nextSpeedUpgrade = getNextSpeedUpgrade(context.ship.speed);
  const nextDefenseUpgrade = getNextDefenseUpgrade(context.ship.defense);
  const nextCapacityUpgrade = getNextCapacityUpgrade(context.ship.capacity);

  const availableActions = [
    {
      label: `Increase Capacity - ${nextCapacityUpgrade?.capacity} Units ($${nextCapacityUpgrade?.cost})`,
      value: "capacity",
      disabled: !nextCapacityUpgrade,
    },
    {
      label: `Improve Speed - ${nextSpeedUpgrade?.speed} Knots ($${nextSpeedUpgrade?.cost})`,
      value: "speed",
      disabled: !nextSpeedUpgrade,
    },
    {
      label: `Enhance Defense - Level ${nextDefenseUpgrade?.defense} ($${nextDefenseUpgrade?.cost})`,
      value: "defense",
      disabled: !nextDefenseUpgrade,
    },
  ];
  const onSelectAction = (action: string) => {
    switch (action) {
      case "capacity": {
        actor.send({ type: "UPGRADE_SHIP", upgradeType: "capacity" });
        break;
      }
      case "speed": {
        actor.send({ type: "UPGRADE_SHIP", upgradeType: "speed" });
        break;
      }
      case "defense": {
        actor.send({ type: "UPGRADE_SHIP", upgradeType: "defense" });
        break;
      }
    }
  };

  return controls === "keyboard" ? (
    <ActionPromptKeyboard
      message="What would you like to upgrade, captain?"
      actions={availableActions
        .filter((action) => !action.disabled)
        .map((action, index) => ({ ...action, key: String(index + 1) }))}
      onSelect={onSelectAction}
      onCancel={() => shipyard.send({ type: "CANCEL" })}
    />
  ) : (
    <ActionPromptArrows
      message="What would you like to upgrade, captain?"
      actions={availableActions}
      onSelect={onSelectAction}
      onCancel={() => shipyard.send({ type: "CANCEL" })}
    />
  );
}

function ManageFleet() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const shipyard = ShipyardContext.useActorRef();
  const shipyardSnapshot = ShipyardContext.useSelector((snapshot) => snapshot);
  const controls = context.settings.controls;

  const availableActions = [
    { label: "Hire Guard Ships", value: "hire", disabled: context.guardFleet.ships >= MAX_GUARD_SHIPS },
    {
      label: "Upgrade Fleet Quality",
      value: "upgrade",
      disabled: context.guardFleet.ships < 1 || context.guardFleet.quality >= MAX_GUARD_QUALITY,
    },
    { label: "Dismiss Guard Ships", value: "dismiss", disabled: context.guardFleet.ships < 1 },
  ];
  const onSelectAction = (action: string) => {
    switch (action) {
      case "hire": {
        shipyard.send({ type: "MANAGE_FLEET", action: "hire" });
        break;
      }
      case "upgrade": {
        shipyard.send({ type: "MANAGE_FLEET", action: "upgrade" });
        break;
      }
      case "dismiss": {
        shipyard.send({ type: "MANAGE_FLEET", action: "dismiss" });
        break;
      }
    }
  };

  return shipyardSnapshot.matches({ manage_fleet: "menu" }) ? (
    controls === "keyboard" ? (
      <ActionPromptKeyboard
        message="Actions:"
        actions={availableActions
          .filter((action) => !action.disabled)
          .map((action, index) => ({ ...action, key: String(index + 1) }))}
        onSelect={onSelectAction}
        onCancel={() => shipyard.send({ type: "CANCEL" })}
      />
    ) : (
      <ActionPromptArrows
        message="Actions:"
        actions={availableActions}
        onSelect={onSelectAction}
        onCancel={() => shipyard.send({ type: "CANCEL" })}
      />
    )
  ) : shipyardSnapshot.matches({ manage_fleet: "hire" }) ? (
    <FleetHire />
  ) : shipyardSnapshot.matches({ manage_fleet: "upgrade" }) ? (
    <FleetUpgrade />
  ) : shipyardSnapshot.matches({ manage_fleet: "dismiss" }) ? (
    <FleetDismiss />
  ) : null;
}

function FleetHire() {
  const actor = GameContext.useActorRef();
  const shipyard = ShipyardContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const controls = context.settings.controls;

  const onValidateQuantity = (value: string) => {
    const quantity = +value;

    if (isNaN(quantity) || quantity < 0) return "Invalid quantity";

    return;
  };
  const onSubmit = (values: Record<string, string>) => {
    const { quantity = "" } = values;

    actor.send({ type: "HIRE_PERMANENT_GUARDS", amount: +quantity });
    shipyard.send({ type: "COMMIT" });
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Text>Each guard ship costs {displayMonetaryValue(calculateGuardShipCost(context, 1))}.</Text>
      {controls === "keyboard" ? (
        <InputPromptKeyboard
          steps={[
            {
              id: "quantity",
              type: "text",
              message: "How many ships would you like to hire, captain?",
              validate: onValidateQuantity,
            },
          ]}
          onComplete={onSubmit}
          onCancel={() => shipyard.send({ type: "CANCEL" })}
        />
      ) : (
        <InputPromptArrows
          steps={[
            {
              id: "quantity",
              type: "text",
              message: "How many ships would you like to hire, captain?",
              validate: onValidateQuantity,
            },
          ]}
          onComplete={onSubmit}
          onCancel={() => shipyard.send({ type: "CANCEL" })}
        />
      )}
    </Box>
  );
}

function FleetUpgrade() {
  const actor = GameContext.useActorRef();
  const shipyard = ShipyardContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const controls = context.settings.controls;

  const onUpgradeFleet = () => {
    actor.send({ type: "UPGRADE_GUARDS" });
    shipyard.send({ type: "COMMIT" });
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Text>Captain, upgrading your ship costs {displayMonetaryValue(calculateFleetUpgradeCost(context))}.</Text>
      {controls === "keyboard" ? (
        <ConfirmPromptKeyboard
          message="You sure you want to upgrade your fleet, captain?"
          onConfirm={onUpgradeFleet}
          onCancel={() => shipyard.send({ type: "CANCEL" })}
        />
      ) : (
        <ConfirmPromptArrows
          message="You sure you want to upgrade your fleet, captain?"
          onConfirm={onUpgradeFleet}
          onCancel={() => shipyard.send({ type: "CANCEL" })}
        />
      )}
    </Box>
  );
}

function FleetDismiss() {
  const actor = GameContext.useActorRef();
  const shipyard = ShipyardContext.useActorRef();
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const controls = context.settings.controls;

  const onValidate = (value: string) => {
    const ships = +value;

    if (isNaN(ships) || ships < 0) return "Invalid amount";

    return;
  };
  const onSubmit = (values: Record<string, string>) => {
    const { ships = "" } = values;

    actor.send({ type: "DISMISS_GUARDS", amount: +ships });
    shipyard.send({ type: "COMMIT" });
  };

  return controls === "keyboard" ? (
    <InputPromptKeyboard
      steps={[
        {
          id: "ships",
          type: "text",
          message: "How many ships should we dismiss, captain?",
          validate: onValidate,
        },
      ]}
      onComplete={onSubmit}
      onCancel={() => shipyard.send({ type: "CANCEL" })}
    />
  ) : (
    <InputPromptArrows
      steps={[
        {
          id: "ships",
          type: "text",
          message: "How many ships should we dismiss, captain?",
          validate: onValidate,
        },
      ]}
      onComplete={onSubmit}
      onCancel={() => shipyard.send({ type: "CANCEL" })}
    />
  );
}
