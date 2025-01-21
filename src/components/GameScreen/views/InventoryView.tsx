import React from "react";
import { Box, Text } from "ink";
import { Badge } from "@inkjs/ui";
import { Table } from "@tqman/ink-table";
import { GameContext } from "../../GameContext.js";
import { getAvailableBufferStorage, getAvailableStorage, getStorageUsed } from "../../../store/utils.js";
import { getStorageUnitsForGood } from "../../../store/utils.js";

export function InventoryView() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const availableStorage = getAvailableStorage(context.ship);
  const availableBuffer = getAvailableBufferStorage(context.ship);

  // Create table data for current cargo
  const cargoData = Array.from(context.ship.hold.entries())
    .filter(([_, quantity]) => quantity > 0)
    .map(([good, quantity]) => {
      const currentPrice = context.prices[context.currentPort][good];
      const storageUsed = getStorageUnitsForGood(good, quantity);
      return {
        Good: good,
        Quantity: `${quantity} picul`,
        "Storage Used": `${storageUsed} units`,
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
            { key: "Storage Used", align: "right" },
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
          • Used: <Badge color="gray">{getStorageUsed(context.ship)} ton</Badge>
        </Text>
        <Text>
          {" "}
          • Available:{" "}
          <Badge color="gray">
            {availableStorage} ton{availableBuffer > 0 ? ` (+${availableBuffer} if overload)` : null}
          </Badge>
        </Text>
        <Text>
          {" "}
          • Total Capacity: <Badge color="gray">{context.ship.capacity} ton</Badge>
        </Text>
      </Box>
    </Box>
  );
}
