import { canRetire } from "../clock.js";
import { isInOverdraft } from "../treasury.js";
import { Context } from "../types.js";

export const mainMenuView = (context: Context) => ({
  canRetire: canRetire(context),
  canDeclareBankruptcy: isInOverdraft(context),
});
