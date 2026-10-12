import { canRetire } from "../clock.js";
import { Context } from "../context.js";
import { isInOverdraft, isStranded } from "../treasury.js";

export const mainMenuView = (context: Context) => ({
  canRetire: canRetire(context),
  canDeclareBankruptcy: isInOverdraft(context) || isStranded(context),
  stranded: isStranded(context),
});
