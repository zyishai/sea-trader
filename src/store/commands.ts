import { Good } from "./catalog/goods.js";
import { Port } from "./catalog/ports.js";
import { ShipStat } from "./catalog/vessels.js";
import { GameSettings } from "./context.js";

export type GameEvents =
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
  | { type: "MSG_ACK" }
  | { type: "RESTART_GAME" };
