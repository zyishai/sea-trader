import { Good } from "../catalog/goods.js";
import { Port } from "../catalog/ports.js";
import { ShipStat } from "../catalog/vessels.js";
import { Context, GameSettings } from "../context.js";

export type GameCommand =
  | { type: "START_GAME"; settings?: GameSettings }
  | { type: "TRAVEL_TO"; destination: Port }
  | { type: "PIRATES_ENCOUNTER_FIGHT" }
  | { type: "PIRATES_ENCOUNTER_FLEE" }
  | { type: "PIRATES_ENCOUNTER_OFFER" }
  | { type: "RESOLVE_EVENT"; choice: string }
  | { type: "TAKE_CARGO"; overload: boolean }
  | { type: "PURCHASE"; good: Good; quantity: number }
  | { type: "SELL"; good: Good; quantity: number }
  | { type: "REPAIR"; cash: number }
  | { type: "UPGRADE_SHIP"; upgradeType: ShipStat }
  | { type: "HIRE_PERMANENT_GUARDS"; amount: number }
  | { type: "UPGRADE_GUARDS" }
  | { type: "DISMISS_GUARDS"; amount: number }
  | { type: "RETIRE" }
  | { type: "DECLARE_BANKRUPTCY" }
  | { type: "RESTART_GAME" };

export type RejectionReason =
  | "invalidQuantity"
  | "notEnoughMoney"
  | "noRoom"
  | "notEnoughCargo"
  | "perfectCondition"
  | "maxedOut"
  | "fleetFull"
  | "noFleet"
  | "voyageOver"
  | "shipWrecked"
  | "notInOverdraft"
  | "voyageNotFinished";

export type CommandResult =
  | { accepted: true; context: Context; notices: string[][] }
  | { accepted: false; reason: RejectionReason; notices: string[][] };

export const accept = (context: Context, ...notices: string[][]): CommandResult => ({
  accepted: true,
  context,
  notices,
});

export const reject = (reason: RejectionReason, ...notices: string[][]): CommandResult => ({
  accepted: false,
  reason,
  notices,
});

export const isWholeAmount = (amount: number) => Number.isInteger(amount) && amount > 0;
