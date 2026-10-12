import { isInOverdraft } from "../treasury.js";
import { Context } from "../types.js";

export const mainMenuView = (context: Context) => ({
  canRetire: context.canRetire,
  canDeclareBankruptcy: isInOverdraft(context),
});
