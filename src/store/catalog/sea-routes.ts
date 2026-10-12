import type { Port } from "./ports.js";

// Distances in nautical miles
export const seaRoutes: [Port, Port, number][] = [
  ["Hong Kong", "Shanghai", 819],
  ["Hong Kong", "Nagasaki", 1150],
  ["Hong Kong", "Singapore", 1460],
  ["Hong Kong", "Manila", 706],
  ["Shanghai", "Nagasaki", 480],
  ["Shanghai", "Singapore", 2279],
  ["Shanghai", "Manila", 1307],
  ["Nagasaki", "Singapore", 2561],
  ["Nagasaki", "Manila", 1668],
  ["Singapore", "Manila", 1308],
];

export const distanceBetween = (from: Port, to: Port) => {
  if (from === to) return 0;
  const route = seaRoutes.find(([a, b]) => (a === from && b === to) || (a === to && b === from));
  if (!route) throw new Error(`No Sea Route between ${from} and ${to}`);
  return route[2];
};
