import { GameSettings, Good, Port } from "./types.js";

export type GameEvents =
  | { type: "START_GAME"; settings?: GameSettings }
  | { type: "GO_TO_PORT" }
  | { type: "TRAVEL_TO"; destination: Port }
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
type RepairEvent = { type: "REPAIR_SHIP"; damage: number };
