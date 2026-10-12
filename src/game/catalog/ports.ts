import { Good } from "./goods.js";

export type MarketSize = "Small" | "Medium" | "Large";

type PortRecord = {
  marketSize: MarketSize;
  tradingHub: boolean;
  produces: Good[];
  productionFactor: number;
};

export const portCatalog = {
  "Hong Kong": { marketSize: "Large", tradingHub: true, produces: [], productionFactor: 0.8 },
  Shanghai: { marketSize: "Large", tradingHub: false, produces: ["Tea", "Opium"], productionFactor: 0.7 },
  Nagasaki: { marketSize: "Medium", tradingHub: false, produces: ["Porcelain"], productionFactor: 0.75 },
  Singapore: { marketSize: "Medium", tradingHub: true, produces: [], productionFactor: 0.8 },
  Manila: { marketSize: "Small", tradingHub: false, produces: ["Spices"], productionFactor: 0.75 },
} satisfies Record<string, PortRecord>;

export type Port = keyof typeof portCatalog;

export const ports = Object.keys(portCatalog) as Port[];

export const portRecord = (port: Port): PortRecord => portCatalog[port];

export const STARTING_PORT: Port = "Hong Kong";

export const MARKET_SIZE_FACTORS: Record<MarketSize, number> = {
  Small: 1.25, // Higher prices, more volatile
  Medium: 1,
  Large: 0.85, // Lower prices, more stable
};
