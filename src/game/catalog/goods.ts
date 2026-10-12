import { Season } from "../clock.js";

type GoodRecord = {
  basePrice: number;
  volatility: number;
  seasons: Partial<Record<Season, number>>;
};

export const goodCatalog = {
  Wheat: { basePrice: 100, volatility: 0.35, seasons: { Spring: 0.7 } },
  Tea: { basePrice: 400, volatility: 0.45, seasons: { Spring: 1.4, Summer: 0.7, Winter: 1.45 } },
  Spices: { basePrice: 800, volatility: 0.55, seasons: { Spring: 1.25, Summer: 1.3, Winter: 0.65 } },
  Opium: { basePrice: 2000, volatility: 0.65, seasons: { Autumn: 1.35 } },
  Porcelain: { basePrice: 300, volatility: 0.4, seasons: { Summer: 1.5, Autumn: 0.7 } },
} satisfies Record<string, GoodRecord>;

export type Good = keyof typeof goodCatalog;

export const goods = Object.keys(goodCatalog) as Good[];

export const seasonalPriceFactor = (good: Good, season: Season) => {
  const record: GoodRecord = goodCatalog[good];
  return record.seasons[season] ?? 1;
};
