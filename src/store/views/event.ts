import { Context } from "../context.js";
import { eventById } from "../events/chance.js";

export const eventView = (context: Context) => {
  const event = context.currentEvent ? eventById(context.currentEvent) : undefined;
  return (
    event && {
      message: event.message,
      choices: (event.choices ?? []).map(({ label, key }) => ({ label, key })),
    }
  );
};
