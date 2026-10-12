import { BASE_INTEREST_RATE, MAX_DAILY_OVERDRAFT } from "./constants.js";
import { Context } from "./types.js";
import { calculateDailyMaintenanceCost, calculateGuardShipCost } from "./utils.js";

type Money = Pick<Context, "balance">;

export const isInOverdraft = ({ balance }: Money) => balance < 0;
export const cashOnHand = ({ balance }: Money) => Math.max(0, balance);
export const canAfford = (money: Money, cost: number) => cashOnHand(money) >= cost;
export const affordableUnits = (money: Money, unitPrice: number) => Math.floor(cashOnHand(money) / unitPrice);

export const accrueInterest = (balance: number, days: number): number =>
  days <= 0 || balance >= 0
    ? balance
    : accrueInterest(balance - Math.min(Math.round(-balance * BASE_INTEREST_RATE), MAX_DAILY_OVERDRAFT), days - 1);

export const upkeepDue = (context: Pick<Context, "balance" | "day" | "guardFleet">) =>
  context.balance < 0
    ? 0
    : (context.day - context.guardFleet.lastMaintenanceDay) * calculateDailyMaintenanceCost(context);

export const fleetSaleValue = (context: Pick<Context, "guardFleet">) =>
  Math.round(calculateGuardShipCost(context, 1) / 2) * context.guardFleet.ships;
