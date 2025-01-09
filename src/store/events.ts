import { GameSettings, Good, Port } from "./types.js";

export type GameEvents =
  | { type: "START_GAME"; settings?: GameSettings }
  | { type: "GO_TO_PORT" }
  | { type: "TRAVEL_TO"; destination: Port }
  | { type: "PIRATES_ENCOUNTER_FIGHT" }
  | { type: "PIRATES_ENCOUNTER_FLEE" }
  | { type: "PIRATES_ENCOUNTER_OFFER" }
  | { type: "MANAGE_FLEET" }
  | { type: "HIRE_PERMANENT_GUARDS"; amount: number }
  | { type: "UPGRADE_GUARDS" }
  | { type: "DISMISS_GUARDS"; amount: number }
  | { type: "GO_TO_MARKET"; action: "buy" | "sell" }
  | { type: "PICK_GOOD"; good: Good }
  | { type: "SELECT_QUANTITY"; quantity: number }
  | { type: "PURCHASE" }
  | { type: "SELL" }
  | { type: "GO_TO_SHIPYARD" }
  | { type: "REPAIR"; cash: number }
  | { type: "GO_TO_RETIREMENT" }
  | { type: "RETIRE" }
  | { type: "CANCEL" }
  | { type: "MSG_ACK"; id?: string }
  | { type: "RESTART_GAME" }
  | { type: "SHOW_HELP" }
  | { type: "HIDE_HELP" };
