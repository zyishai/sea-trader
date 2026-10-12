import { Context } from "../types.js";
import { eventById } from "../utils.js";

export const eventView = (context: Context) => {
  const event = context.currentEvent ? eventById(context.currentEvent) : undefined;
  return (
    event && {
      message: event.message,
      choices: (event.choices ?? []).map(({ label, key }) => ({ label, key })),
    }
  );
};
