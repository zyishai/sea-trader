import { GameSettings, Good, Port, UpgradeType } from "./types.js";

export type GameEvents =
  | { type: "START_GAME"; settings?: GameSettings }
  | { type: "GO_TO_PORT" }
  | { type: "TRAVEL_TO"; destination: Port }
  | { type: "PIRATES_ENCOUNTER_FIGHT" }
  | { type: "PIRATES_ENCOUNTER_FLEE" }
  | { type: "PIRATES_ENCOUNTER_OFFER" }
  | { type: "RESOLVE_EVENT"; choice: string }
  | { type: "GO_TO_MARKET" }
  | { type: "PURCHASE"; good: Good; quantity: number }
  | { type: "SELL"; good: Good; quantity: number }
  | { type: "SELL_ALL" }
  | { type: "GO_TO_SHIPYARD" }
  | { type: "REPAIR"; cash: number }
  | { type: "UPGRADE_SHIP"; upgradeType: UpgradeType }
  | { type: "HIRE_PERMANENT_GUARDS"; amount: number }
  | { type: "UPGRADE_GUARDS" }
  | { type: "DISMISS_GUARDS"; amount: number }
  | { type: "RETIRE" }
  | { type: "DECLARE_BANKRUPTCY" }
  | { type: "CANCEL" }
  | { type: "MSG_ACK" }
  | { type: "RESTART_GAME" }
  | { type: "SHOW_HELP" }
  | { type: "HIDE_HELP" };
