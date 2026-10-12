import { canRetire } from "../clock.js";
import { Context } from "../context.js";
import { isInOverdraft } from "../treasury.js";

export const mainMenuView = (context: Context) => ({
  canRetire: canRetire(context),
  canDeclareBankruptcy: isInOverdraft(context),
});
