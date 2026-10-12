import { Context } from "./types.js";

type Money = Pick<Context, "balance">;

const available = ({ balance }: Money) => Math.max(0, balance);

export const canAfford = (money: Money, cost: number) => available(money) >= cost;
export const affordableUnits = (money: Money, unitPrice: number) => Math.floor(available(money) / unitPrice);
