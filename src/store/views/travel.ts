import { lastDay } from "../clock.js";
import { dailyUpkeep } from "../treasury.js";
import { Context } from "../types.js";
import { calculateTravelTime } from "../utils.js";

export const travelOptions = (context: Context) =>
  context.availablePorts.map((port) => {
    const days = calculateTravelTime(port, context);
    return {
      port,
      days,
      upkeep: dailyUpkeep(context) * days,
      arrivalDay: Math.min(context.day + days, lastDay(context)),
      endsVoyage: context.day + days > lastDay(context),
    };
  });
