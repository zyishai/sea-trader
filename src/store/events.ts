import { GameSettings, Good, Port, UpgradeType } from "./types.js";

export type GameEvents =
  | { type: "START_GAME"; settings?: GameSettings }
  | { type: "GO_TO_PORT" }
  | { type: "TRAVEL_TO"; destination: Port }
  | { type: "PIRATES_ENCOUNTER_FIGHT" }
  | { type: "PIRATES_ENCOUNTER_FLEE" }
  | { type: "PIRATES_ENCOUNTER_OFFER" }
  | { type: "MANAGE_FLEET" }
  | { type: "GO_TO_GUARD_HALL_HIRE" }
  | { type: "GO_TO_GUARD_HALL_UPGRADE" }
  | { type: "GO_TO_GUARD_HALL_DISMISS" }
  | { type: "HIRE_PERMANENT_GUARDS"; amount: number }
  | { type: "UPGRADE_GUARDS" }
  | { type: "DISMISS_GUARDS"; amount: number }
  | { type: "GO_TO_INVENTORY" }
  | { type: "GO_TO_MARKET"; action: "buy" | "sell" }
  | { type: "PURCHASE"; good: Good; quantity: number }
  | { type: "SELL"; good: Good; quantity: number }
  | { type: "SELL_ALL" }
  | { type: "GO_TO_SHIPYARD" }
  | { type: "GO_TO_SHIPYARD_REPAIR" }
  | { type: "REPAIR"; cash: number }
  | { type: "GO_TO_SHIPYARD_UPGRADE" }
  | { type: "UPGRADE_SHIP"; upgradeType: UpgradeType }
  | { type: "GO_TO_RETIREMENT" }
  | { type: "RETIRE" }
  | { type: "GO_TO_BANKRUPTCY" }
  | { type: "DECLARE_BANKRUPTCY" }
  | { type: "CANCEL" }
  | { type: "MSG_ACK"; id?: string }
  | { type: "RESOLVE_EVENT"; choice: string }
  | { type: "RESTART_GAME" }
  | { type: "SHOW_HELP" }
  | { type: "HIDE_HELP" }
  | { type: "EXIT" };

export type TransactionEvents =
  | { type: "RESET"; action: "buy" | "sell" }
  | { type: "UPDATE_GOOD"; good?: Good }
  | { type: "UPDATE_QUANTITY"; quantity: number };
