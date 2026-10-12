import { BANKRUPTCY_THRESHOLD, BASE_INTEREST_RATE, MAX_DAILY_OVERDRAFT } from "./constants.js";
import { value } from "./hold.js";
import { Context } from "./types.js";
import { calculateDailyMaintenanceCost, calculateGuardShipCost } from "./utils.js";

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
