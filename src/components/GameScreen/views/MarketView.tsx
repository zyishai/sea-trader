import React from "react";
import { Box, Newline, Text } from "ink";
import { Alert, Badge } from "@inkjs/ui";
import { Table } from "@tqman/ink-table";
import { GameContext, TransactionContext } from "../../GameContext.js";
import {
  calculatePrice,
  getAvailableStorage,
  getBulkinessCategory,
  getStorageUnitsForGood,
} from "../../../store/utils.js";
import { goodsInfo, OVERDRAFT_TRADING_LIMIT, TREND_SYMBOLS } from "../../../store/constants.js";

export function MarketView() {
  const transaction = TransactionContext.useSelector((snapshot) => snapshot.context);

  if (!transaction.action) {
    return <MarketOverview />;
  }

  if (!transaction.good) {
    return <GoodsSelectionView action={transaction.action} />;
  }

  return <QuantitySelectionView />;
}

function MarketOverview() {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Market Overview</Text>
      <MarketTable showAllInfo />
      <Text>Press [S] to Buy or [S] to Sell</Text>
    </Box>
  );
}

function MarketTable({
  showPrices = false,
  showHoldQuantity = false,
  showBulkiness = false,
  showAllInfo = false,
}: {
  showPrices?: boolean;
  showHoldQuantity?: boolean;
  showBulkiness?: boolean;
  showAllInfo?: boolean;
}) {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const transaction = TransactionContext.useSelector((snapshot) => snapshot.context);

  const marketData = context.availableGoods.map((good) => {
    const goodInfo = goodsInfo.find((item) => item.name === good)!;
    const price = context.prices[context.currentPort][good];
    const trend = context.trends[context.currentPort][good];
    const quantity = context.ship.hold.get(good) || 0;
    const bulkinessCategory = getBulkinessCategory(goodInfo.bulkiness);

    const row: Record<string, string> = {
      Good: good,
    };

    if (showAllInfo || showPrices) {
      row["Price"] = `$${price}`;
      row["Trend"] =
        trend === "increasing" ? TREND_SYMBOLS.UP : trend === "decreasing" ? TREND_SYMBOLS.DOWN : TREND_SYMBOLS.SAME;
    }

    if (showAllInfo || showHoldQuantity) {
      row["In Hold"] = `${quantity} picul`;
    }

    if (showAllInfo || showBulkiness) {
      row["Storage*"] = `${goodInfo.bulkiness} (${bulkinessCategory})`;
    }

    if (transaction.good === good) {
      row["Good"] = `> ${row["Good"]}`;
    }

    return row;
  });

  const columns = [
    { key: "Good", align: "left" as const },
    ...(showAllInfo || showPrices
      ? [
          { key: "Price", align: "right" as const },
          { key: "Trend", align: "center" as const },
        ]
      : []),
    ...(showAllInfo || showHoldQuantity ? [{ key: "In Hold", align: "right" as const }] : []),
    ...(showAllInfo || showBulkiness ? [{ key: "Storage*", align: "left" as const }] : []),
  ];

  return (
    <Box flexDirection="column">
      <Table data={marketData} columns={columns} />
      {showAllInfo ||
        (showBulkiness && (
          <Text dimColor>
            * Storage units show how much cargo space <Newline />
            {"  "}one picul of this good will occupy
          </Text>
        ))}
    </Box>
  );
}

function CriticalAlerts() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const availableStorage = getAvailableStorage(context.ship);
  const isOverdrawn = context.inOverdraft;
  const isHoldNearlyFull = availableStorage <= context.ship.capacity * 0.2;
  const isOverloaded = context.ship.isOverloaded;

  return (
    <>
      {isOverdrawn && (
        <Alert variant="error">Trading limited to ${context.balance + OVERDRAFT_TRADING_LIMIT} due to overdraft</Alert>
      )}

      {isOverloaded && <Alert variant="error">Ship is overloaded! Ship speed is affected</Alert>}

      {isHoldNearlyFull && !isOverloaded && (
        <Alert variant="warning">Limited storage: {availableStorage} units remains before overload.</Alert>
      )}
    </>
  );
}

function GoodsSelectionView({ action }: { action: "buy" | "sell" }) {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const isBuying = action === "buy";
  const inOverdrawn = context.inOverdraft;

  return (
    <Box flexDirection="column">
      <Text bold>Market Exchange &middot; {isBuying ? "Purchasing" : "Selling"}</Text>

      <Box height={1} />

      <CriticalAlerts />

      <MarketTable showPrices={isBuying} showHoldQuantity={!isBuying} showBulkiness={isBuying} />

      <Box height={1} />

      {isBuying && (
        <Box>
          <Text>Available Funds: ${inOverdrawn ? context.balance + OVERDRAFT_TRADING_LIMIT : context.balance}</Text>
          <Text> | Available Storage: {getAvailableStorage(context.ship)} units</Text>
        </Box>
      )}
    </Box>
  );
}

function QuantitySelectionView() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const transaction = TransactionContext.useSelector((snapshot) => snapshot.context);
  const isBuying = transaction.action === "buy";
  const good = goodsInfo.find((item) => item.name === transaction.good)!;
  const maxQuantity = isBuying
    ? Math.min(
        Math.floor(context.balance / context.prices[context.currentPort][good.name]),
        Math.floor(getAvailableStorage(context.ship) / good.bulkiness),
      )
    : (context.ship.hold.get(good.name) ?? 0);
  const remainingFunds =
    context.balance -
    calculatePrice({
      prices: context.prices,
      currentPort: context.currentPort,
      good: good.name,
      quantity: transaction.quantity,
    });

  return (
    <Box flexGrow={1} flexDirection="column" columnGap={1}>
      <CriticalAlerts />

      <Box gap={4}>
        <Box flexDirection="column" gap={1}>
          <Badge color="whiteBright">{transaction.good}</Badge>
          <Box flexDirection="column">
            <Text bold>Market Price:</Text>
            <Text>
              $
              {calculatePrice({
                prices: context.prices,
                currentPort: context.currentPort,
                good: good.name,
                quantity: 1,
              })}
            </Text>
          </Box>
          <Box flexDirection="column">
            <Text bold>Storage Factor:</Text>
            <Text>
              {good.bulkiness} ({getBulkinessCategory(good.bulkiness)})
            </Text>
          </Box>
          <Box flexDirection="column">
            <Text bold>Purchase Limit:</Text>
            <Text>{maxQuantity} picul</Text>
          </Box>
        </Box>

        <Box flexGrow={1} flexDirection="column" borderStyle="single" borderDimColor paddingX={1} gap={1}>
          <Text bold>Transaction Preview:</Text>
          <Text>Quantity: {transaction.quantity} picul</Text>
          <Text>
            Total Cost: $
            {calculatePrice({
              prices: context.prices,
              currentPort: context.currentPort,
              good: good.name,
              quantity: transaction.quantity,
            })}
          </Text>
          <Text>Storage Used: {getStorageUnitsForGood(good.name, transaction.quantity)} units</Text>
          {isBuying && (
            <Text>Remaining Funds: {remainingFunds < 0 ? `-$${Math.abs(remainingFunds)}` : `$${remainingFunds}`}</Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}
