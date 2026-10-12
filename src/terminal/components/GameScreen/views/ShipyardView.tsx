import { usePreferences } from "../../Preferences.js";
import React, { useState } from "react";
import { Box, Text } from "ink";
import { useNavigation } from "../Navigation.js";
import {
  ShipStat,
  Unavailable,
  displayMonetaryValue,
  issueCommand,
  shipyardView,
  wouldStrand,
} from "../../../../game/index.js";
import { GameContext } from "../../GameContext.js";
import { ShipyardContext } from "../ShipyardContext.js";
import { ActionPrompt as ActionPromptKeyboard } from "../../prompts/keyboard/ActionPrompt.js";
import { ActionPrompt as ActionPromptArrows } from "../../prompts/arrows/ActionPrompt.js";
import { InputPrompt as InputPromptKeyboard } from "../../prompts/keyboard/InputPrompt.js";
import { InputPrompt as InputPromptArrows } from "../../prompts/arrows/InputPrompt.js";
import { ConfirmPrompt as ConfirmPromptKeyboard } from "../../prompts/keyboard/ConfirmPrompt.js";
import { ConfirmPrompt as ConfirmPromptArrows } from "../../prompts/arrows/ConfirmPrompt.js";
import { Table } from "../Table.js";
import { ViewTitle } from "../ViewTitle.js";

const REASONS: Partial<Record<Unavailable, string>> = { notEnoughMoney: "not enough money" };

const isOffered = ({ unavailable }: { unavailable?: Unavailable }) => !unavailable || unavailable in REASONS;
const reasonFor = (unavailable?: Unavailable) => (unavailable ? REASONS[unavailable] : undefined);

const useShipyardView = () => GameContext.useSelector((snapshot) => shipyardView(snapshot.context));

function ConfirmStranding({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const controls = usePreferences().controls;
  const message = "This leaves us without money to trade, Captain. Go ahead?";
  return controls === "keyboard" ? (
    <ConfirmPromptKeyboard message={message} onConfirm={onConfirm} onCancel={onCancel} />
  ) : (
    <ConfirmPromptArrows message={message} onConfirm={onConfirm} onCancel={onCancel} />
  );
}

export function ShipyardView() {
  const { ship, fleet } = useShipyardView();
  const snapshot = ShipyardContext.useSelector((snapshot) => snapshot);

  return (
    <Box flexDirection="column" gap={1} width="100%">
      <ViewTitle text="Shipyard" />

      <Box flexDirection="column" borderStyle="single">
        <Text underline>Your Ship</Text>
        <Box flexDirection="column" paddingLeft={3}>
          <Table
            rows={[
              ["- Capacity", `${ship.spaceUsed} / ${ship.capacity} picul`],
              ["- Speed", `${ship.speed} knots`],
              ["- Condition", `${ship.condition} (${ship.health}%)`],
            ]}
          />
        </Box>
      </Box>

      <Box flexDirection="column" borderStyle="single">
        <Text underline>Guard Fleet</Text>
        <Box flexDirection="column" paddingLeft={3}>
          <Table
            rows={[
              ["- Fleet Size", `${fleet.ships} ship${fleet.ships !== 1 ? "s" : ""}`],
              ["- Fleet Quality", fleet.quality ? `${fleet.quality.name} (${fleet.quality.level})` : "--"],
              ["- Daily Upkeep", fleet.quality ? displayMonetaryValue(fleet.dailyUpkeep) : "--"],
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
  const { navigate } = useNavigation();
  const controls = usePreferences().controls;
  const { repair } = useShipyardView();
  const shipyard = ShipyardContext.useActorRef();

  const availableActions = [
    { label: "Upgrade Your Ship", value: "upgrade_ship" },
    {
      label: "Repair Damage",
      value: "repair_damage",
      disabled: !isOffered(repair),
      unavailableReason: reasonFor(repair.unavailable),
    },
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
      onCancel={() => navigate("menu")}
      backMessage="Press [Esc] to leave shipyard"
    />
  ) : (
    <ActionPromptArrows
      message="Actions:"
      actions={availableActions}
      onSelect={onSelectAction}
      onCancel={() => navigate("menu")}
      backMessage="Press [Esc] to leave shipyard"
    />
  );
}

function RepairShip() {
  const actor = GameContext.useActorRef();
  const controls = usePreferences().controls;
  const { repair } = useShipyardView();
  const shipyard = ShipyardContext.useActorRef();
  const [pendingCash, setPendingCash] = useState<number>();

  const repairFor = (cash: number) => {
    if (issueCommand(actor, { type: "REPAIR", cash })?.accepted) {
      shipyard.send({ type: "COMMIT" });
    }
  };

  const onValidateAmount = (value: string) => {
    const amount = +value;

    if (isNaN(amount) || amount < 0) return "Invalid amount";

    return;
  };
  const onSubmit = (values: Record<string, string>) => {
    const cash = +(values["amount"] ?? "");

    if (wouldStrand(actor.getSnapshot().context, cash)) {
      setPendingCash(cash);
    } else {
      repairFor(cash);
    }
  };

  if (pendingCash !== undefined) {
    return <ConfirmStranding onConfirm={() => repairFor(pendingCash)} onCancel={() => setPendingCash(undefined)} />;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text>
        Captain, our ship has taken some damage. A full repair will cost us {displayMonetaryValue(repair.fullCost)}.
      </Text>
      {controls === "keyboard" ? (
        <InputPromptKeyboard
          steps={[
            {
              id: "amount",
              type: "text",
              message: "How much shall we spend on repairs, Captain?",
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
              message: "How much shall we spend on repairs, Captain?",
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
  const controls = usePreferences().controls;
  const { upgrades } = useShipyardView();

  const labels = {
    capacity: (next?: number) => `Increase Capacity to ${next} picul`,
    speed: (next?: number) => `Improve Speed to ${next} knots`,
    defense: (next?: number) => `Enhance Defense to level ${next}`,
  };
  const availableActions = upgrades.map((offer) => ({
    label: `${labels[offer.type](offer.next)} (${displayMonetaryValue(offer.cost ?? 0)})`,
    value: offer.type,
    disabled: !isOffered(offer),
    unavailableReason: reasonFor(offer.unavailable),
  }));
  const [pendingUpgrade, setPendingUpgrade] = useState<ShipStat>();
  const upgrade = (stat: ShipStat) => {
    setPendingUpgrade(undefined);
    actor.send({ type: "UPGRADE_SHIP", upgradeType: stat });
  };
  const onSelectAction = (action: string) => {
    const offer = upgrades.find(({ type }) => type === action)!;
    if (offer.strands) {
      setPendingUpgrade(offer.type);
    } else {
      upgrade(offer.type);
    }
  };

  if (pendingUpgrade) {
    return <ConfirmStranding onConfirm={() => upgrade(pendingUpgrade)} onCancel={() => setPendingUpgrade(undefined)} />;
  }

  return controls === "keyboard" ? (
    <ActionPromptKeyboard
      message="What shall we upgrade, captain?"
      actions={availableActions
        .filter((action) => !action.disabled)
        .map((action, index) => ({ ...action, key: String(index + 1) }))}
      onSelect={onSelectAction}
      onCancel={() => shipyard.send({ type: "CANCEL" })}
    />
  ) : (
    <ActionPromptArrows
      message="What shall we upgrade, captain?"
      actions={availableActions}
      onSelect={onSelectAction}
      onCancel={() => shipyard.send({ type: "CANCEL" })}
    />
  );
}

function ManageFleet() {
  const { fleet } = useShipyardView();
  const shipyard = ShipyardContext.useActorRef();
  const shipyardSnapshot = ShipyardContext.useSelector((snapshot) => snapshot);
  const controls = usePreferences().controls;

  const availableActions = [
    { label: "Hire Guard Ships", value: "hire", offer: fleet.hire },
    { label: "Upgrade Fleet Quality", value: "upgrade", offer: fleet.upgrade },
    { label: "Dismiss Guard Ships", value: "dismiss", offer: fleet.dismiss },
  ].map(({ offer, ...action }) => ({
    ...action,
    disabled: !isOffered(offer),
    unavailableReason: reasonFor(offer.unavailable),
  }));
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
  const controls = usePreferences().controls;
  const { fleet } = useShipyardView();

  const onValidateQuantity = (value: string) => {
    const quantity = +value;

    if (isNaN(quantity) || quantity < 0) return "Invalid quantity";

    return;
  };
  const onSubmit = (values: Record<string, string>) => {
    const { quantity = "" } = values;

    if (issueCommand(actor, { type: "HIRE_PERMANENT_GUARDS", amount: +quantity })?.accepted) {
      shipyard.send({ type: "COMMIT" });
    }
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Text>Each guard ship costs {displayMonetaryValue(fleet.hire.costPerShip)}.</Text>
      {controls === "keyboard" ? (
        <InputPromptKeyboard
          steps={[
            {
              id: "quantity",
              type: "text",
              message: "How many ships shall we hire, Captain?",
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
              message: "How many ships shall we hire, Captain?",
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
  const controls = usePreferences().controls;
  const { fleet } = useShipyardView();

  const onUpgradeFleet = () => {
    if (issueCommand(actor, { type: "UPGRADE_GUARDS" })?.accepted) {
      shipyard.send({ type: "COMMIT" });
    }
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Text>Captain, upgrading the fleet costs {displayMonetaryValue(fleet.upgrade.cost)}.</Text>
      {controls === "keyboard" ? (
        <ConfirmPromptKeyboard
          message="You sure you want to upgrade your fleet, Captain?"
          onConfirm={onUpgradeFleet}
          onCancel={() => shipyard.send({ type: "CANCEL" })}
        />
      ) : (
        <ConfirmPromptArrows
          message="You sure you want to upgrade your fleet, Captain?"
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
  const controls = usePreferences().controls;

  const onValidate = (value: string) => {
    const ships = +value;

    if (isNaN(ships) || ships < 0) return "Invalid amount";

    return;
  };
  const onSubmit = (values: Record<string, string>) => {
    const { ships = "" } = values;

    if (issueCommand(actor, { type: "DISMISS_GUARDS", amount: +ships })?.accepted) {
      shipyard.send({ type: "COMMIT" });
    }
  };

  return controls === "keyboard" ? (
    <InputPromptKeyboard
      steps={[
        {
          id: "ships",
          type: "text",
          message: "How many ships shall we dismiss, Captain?",
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
          message: "How many ships shall we dismiss, Captain?",
          validate: onValidate,
        },
      ]}
      onComplete={onSubmit}
      onCancel={() => shipyard.send({ type: "CANCEL" })}
    />
  );
}
