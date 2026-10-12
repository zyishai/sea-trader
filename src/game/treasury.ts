import { Context } from "./context.js";
import { calculateDailyMaintenanceCost, calculateGuardShipCost } from "./fleet.js";
import { goodsAboard, value } from "./hold.js";

export const BASE_BALANCE = 1500;
export const BANKRUPTCY_THRESHOLD = -4000; // When debt exceeds this, player goes bankrupt
export const FLEET_SALE_DEBT_LIMIT = 2000; // Overdraft past this sells the Guard Fleet
export const MAX_DAILY_OVERDRAFT = 50; // Most interest charged in one day
export const BASE_INTEREST_RATE = 0.03; // 3% daily interest

type Money = Pick<Context, "balance">;

export const isInOverdraft = ({ balance }: Money) => balance < 0;
export const isBankrupt = ({ balance }: Money) => balance < BANKRUPTCY_THRESHOLD;
export const netWorth = (context: Pick<Context, "balance" | "ship" | "prices" | "currentPort">) =>
  context.balance + value(context.ship.hold, context.prices[context.currentPort]);
export const cashOnHand = ({ balance }: Money) => Math.max(0, balance);
export const canAfford = (money: Money, cost: number) => cashOnHand(money) >= cost;
export const affordableUnits = (money: Money, unitPrice: number) => Math.floor(cashOnHand(money) / unitPrice);

export const accrueInterest = (balance: number, days: number): number =>
  days <= 0 || balance >= 0
    ? balance
    : accrueInterest(balance - Math.min(Math.round(-balance * BASE_INTEREST_RATE), MAX_DAILY_OVERDRAFT), days - 1);

export const dailyUpkeep = (context: Pick<Context, "balance" | "guardFleet">) =>
  isInOverdraft(context) ? 0 : calculateDailyMaintenanceCost(context);

export const fleetSaleValue = (context: Pick<Context, "guardFleet">) =>
  Math.round(calculateGuardShipCost(context, 1) / 2) * context.guardFleet.ships;

const cheapestPrice = ({ prices }: Pick<Context, "prices">) =>
  Math.min(...Object.values(prices).flatMap((portPrices) => Object.values(portPrices)));

export const isStranded = (context: Pick<Context, "balance" | "ship" | "guardFleet" | "prices">) =>
  goodsAboard(context.ship.hold).length === 0 &&
  context.guardFleet.ships === 0 &&
  affordableUnits(context, cheapestPrice(context)) === 0;

export const wouldStrand = (context: Pick<Context, "balance" | "ship" | "guardFleet" | "prices">, cost: number) =>
  !isStranded(context) && isStranded({ ...context, balance: context.balance - cost });
