import { ports } from "../catalog/ports.js";
import { lastDay } from "../clock.js";
import { Context } from "../context.js";
import { calculateTravelTime } from "../travel.js";
import { dailyUpkeep } from "../treasury.js";

export const travelOptions = (context: Context) =>
  ports
    .filter((port) => port !== context.currentPort)
    .map((port) => {
      const days = calculateTravelTime(port, context);
      return {
        port,
        days,
        upkeep: dailyUpkeep(context) * days,
        arrivalDay: Math.min(context.day + days, lastDay(context)),
        endsVoyage: context.day + days > lastDay(context),
      };
    });
