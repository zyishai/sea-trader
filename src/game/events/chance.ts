import { GOAL_DAYS, Season, currentSeason } from "../clock.js";
import { Context } from "../context.js";
import { EventTemplate, EventType, eventTemplates } from "./templates.js";
import { shipStats } from "../ship.js";

export const calculateEventChance = (template: EventTemplate, context: Context) => {
  let chance = typeof template.baseChance === "number" ? template.baseChance : template.baseChance(context);
  const speedFactor = Math.max(1, 1 - (shipStats(context.ship).speed - 8) / 24);

  const seasonalModifier = seasonEventEffects[currentSeason(context)]?.[template.type] ?? 1;
  chance *= seasonalModifier;

  switch (template.type) {
    case "weather": {
      chance *= context.day / GOAL_DAYS; // Weather events become more likely as the game progresses
      chance *= speedFactor; // Faster ships are less likely to encounter weather events
      break;
    }
    case "market": {
      chance *= Math.min(2, context.balance / 5000); // Market events become more likely as the player gets richer
      break;
    }
    case "encounter": {
      chance *= 1 - context.ship.health / 100; // Encounters become more likely when the ship health is low
      chance *= speedFactor; // Faster ships are less likely to encounter events
      break;
    }
    case "discovery": {
      chance *= context.day / GOAL_DAYS; // Discoveries become more likely as the game progresses
      break;
    }
  }

  return Math.min(chance, 1);
};

export const eventById = (id: EventTemplate["id"]) => eventTemplates.find((template) => template.id === id);

export const checkForEvent = (context: Context) => {
  for (const template of eventTemplates) {
    const chance = calculateEventChance(template, context);
    if (context.rng.chance(chance)) {
      return template;
    }
  }

  return;
};

export const seasonEventEffects: Record<Season, Partial<Record<EventType, number>>> = {
  Spring: {
    weather: 1.2,
    discovery: 1.3,
  },
  Summer: {
    weather: 0.8,
    market: 1.2,
  },
  Autumn: {
    weather: 1.4,
    cargo: 1.2,
  },
  Winter: {
    weather: 1.3,
    discovery: 0.7,
    cargo: 1.3,
  },
};
