import React from "react";
import { Box, Text } from "ink";
import { Alert, Badge } from "@inkjs/ui";
import { Table } from "@tqman/ink-table";
import BigText from "ink-big-text";
import { GameContext, TransactionContext } from "../../GameContext.js";
import {
  calculateIntelligenceReliability,
  calculatePrice,
  getAvailableStorage,
  getBulkinessCategory,
  getIntelligenceCost,
  getStorageUnitsForGood,
} from "../../../store/utils.js";
import {
  goodsInfo,
  OVERDRAFT_TRADING_LIMIT,
  PORT_SPECIALIZATIONS,
  SEASONAL_EFFECTS,
  TREND_SYMBOLS,
} from "../../../store/constants.js";
import { Port } from "../../../store/types.js";

export function MarketView() {
  const transaction = TransactionContext.useSelector((snapshot) => snapshot.context);
  const snapshot = GameContext.useSelector((snapshot) => snapshot);
  const isMenu = snapshot.matches({ gameScreen: { at_market: "menu" } });
  const isMarketIntelligenceViewing = snapshot.matches({
    gameScreen: { at_market: { intelligenceAction: "viewing" } },
  });
  const isMarketIntelligencePurchasing = snapshot.matches({
    gameScreen: { at_market: { intelligenceAction: "purchasing" } },
  });

  if (isMenu) {
    return <MarketOverview />;
  }

  if (isMarketIntelligenceViewing) {
    return <MarketIntelligenceView />;
  }

  if (isMarketIntelligencePurchasing) {
    return <MarketIntelligencePurchaseView />;
  }

  if (!transaction.action) return null;

  if (!transaction.good) {
    return <GoodsSelectionView action={transaction.action} />;
  }

  return <QuantitySelectionView />;
}

function MarketOverview() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const portSpec = PORT_SPECIALIZATIONS[context.currentPort];
  const marketVolatility =
    portSpec.marketSize === "Large" ? "Low" : portSpec.marketSize === "Small" ? "High" : "Medium";

  return (
    <Box alignSelf="center" flexDirection="column" gap={1}>
      <BigText text={`${context.currentPort}\nMarket`} font="tiny" space={false} />
      <Text>
        <Text underline>Market Size</Text>: {portSpec.marketSize}
      </Text>
      <Text>
        <Text underline>Market Volatility</Text>: {marketVolatility}
      </Text>
      {portSpec.tradingHub && <Text color="blue">Trading Hub - Lower prices on all goods</Text>}
      {portSpec.producedGoods.length > 0 && (
        <Text color="green">Local Production: {portSpec.producedGoods.join(", ")}</Text>
      )}
    </Box>
  );
}

function MarketTable({
  port,
  showPrices = false,
  showTrends = false,
  showHoldQuantity = false,
  showBulkiness = false,
  showAllInfo = false,
}: {
  port: Port;
  showPrices?: boolean;
  showTrends?: boolean;
  showHoldQuantity?: boolean;
  showBulkiness?: boolean;
  showAllInfo?: boolean;
}) {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const transaction = TransactionContext.useSelector((snapshot) => snapshot.context);

  const marketData = context.availableGoods.map((good) => {
    const goodInfo = goodsInfo.find((item) => item.name === good)!;
    const price = context.prices[port][good];
    const trendInfo = context.trends[port][good];
    const quantity = context.ship.hold.get(good) || 0;
    const bulkinessCategory = getBulkinessCategory(goodInfo.bulkiness);
    const seasonalEffect = SEASONAL_EFFECTS[context.currentSeason][good];

    const row: Record<string, string> = {
      Good: good,
    };

    if (showAllInfo || showPrices) {
      row["Price"] = `$${price}`;

      // Add seasonal indicator if applicable
      if (seasonalEffect) {
        row["Price"] += seasonalEffect > 1 ? " ▲" : " ▼";
      }
    }

    if (showAllInfo || showTrends) {
      const trendSymbol =
        trendInfo.direction === "increasing"
          ? TREND_SYMBOLS.UP
          : trendInfo.direction === "decreasing"
            ? TREND_SYMBOLS.DOWN
            : TREND_SYMBOLS.SAME;
      const trendStrength = trendInfo.direction === "stable" ? "" : ` (${trendInfo.strength})`;
      row["Trend"] = `${trendSymbol}${trendStrength}`;
      row["Reliability"] = `${trendInfo.reliability}%`;
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
    ...(showAllInfo || showPrices ? [{ key: "Price", align: "right" as const }] : []),
    ...(showAllInfo || showTrends
      ? [
          { key: "Trend", align: "left" as const },
          { key: "Reliability", align: "center" as const },
        ]
      : []),
    ...(showAllInfo || showHoldQuantity ? [{ key: "In Hold", align: "right" as const }] : []),
    ...(showAllInfo || showBulkiness ? [{ key: "Storage*", align: "left" as const }] : []),
  ];

  return (
    <Box flexDirection="column">
      <Table data={marketData} columns={columns} />
      <Text dimColor>▲▼ Seasonal price effects</Text>
      {(showAllInfo || showBulkiness) && <Text dimColor>* Storage space needed per picul</Text>}
      {(showAllInfo || showTrends) && (
        <Box flexDirection="column">
          <Text dimColor>* Lower reliability indicates less accurate trend predictions</Text>
          <Text dimColor>* Trend strength: weak (±5%), moderate (±15%), strong (±25%)</Text>
        </Box>
      )}
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

function MarketIntelligenceView() {
  const transaction = TransactionContext.useSelector((snapshot) => snapshot.context);
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const port = transaction.port ?? context.currentPort;
  const intLevel = context.marketIntelligence.level;
  const reliability = calculateIntelligenceReliability(context);

  return (
    <Box flexDirection="column">
      <Text bold>Market Intelligence - {port}</Text>
      <Text>
        Intelligence Reliability:{" "}
        <Text color={reliability > 70 ? "green" : reliability > 40 ? "yellow" : "red"}>{reliability}%</Text>
      </Text>
      <Box height={1} />
      <MarketTable port={port} showPrices={port === context.currentPort || intLevel >= 2} showTrends={intLevel >= 3} />
    </Box>
  );
}

function MarketIntelligencePurchaseView() {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const currentLevel = context.marketIntelligence.level;
  const reliability = calculateIntelligenceReliability(context);

  return (
    <Box flexDirection="column">
      <Text bold underline>
        Market Intelligence
      </Text>
      <Box height={1} />

      <Box flexDirection="column">
        <Text>
          Current Level:{" "}
          <Text bold>{currentLevel === 1 ? "Basic" : currentLevel === 2 ? "Standard" : "Exclusive"}</Text>
        </Text>
        <Text>
          Reliability:{" "}
          <Text color={reliability > 70 ? "green" : reliability > 40 ? "yellow" : "red"}>{reliability}%</Text>
        </Text>
      </Box>

      <Box height={1} />
      <Text bold>Available Levels:</Text>
      <Box flexDirection="column" paddingLeft={2}>
        <Text>{currentLevel === 1 ? ">" : " "} Basic (Free) - Current port prices only</Text>
        <Text>
          {currentLevel === 2 ? ">" : " "} Standard (${getIntelligenceCost(2)}) - All ports prices and production info
        </Text>
        <Text>
          {currentLevel === 3 ? ">" : " "} Exclusive (${getIntelligenceCost(3)}) - Full market analysis with trends
        </Text>
      </Box>

      {context.inOverdraft && (
        <Box marginTop={1}>
          <Alert variant="warning">
            Trading funds limited to ${context.balance + OVERDRAFT_TRADING_LIMIT} due to overdraft
          </Alert>
        </Box>
      )}
    </Box>
  );
}

function GoodsSelectionView({ action }: { action: "buy" | "sell" | "intelligence" }) {
  const context = GameContext.useSelector((snapshot) => snapshot.context);
  const isBuying = action === "buy";
  const isSelling = action === "sell";
  const inOverdrawn = context.inOverdraft;

  return (
    <Box flexDirection="column">
      <Text bold>Market Exchange &middot; {isBuying ? "Purchasing" : isSelling ? "Selling" : "Intelligence"}</Text>

      <Box height={1} />

      <CriticalAlerts />

      <MarketTable
        port={context.currentPort}
        showPrices={isBuying}
        showHoldQuantity={!isBuying}
        showBulkiness={isBuying}
      />

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
