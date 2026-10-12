export type ShipStat = "speed" | "defense" | "capacity";
export type Upgrade = { value: number; cost: number; reputation?: number };

type VesselClassRecord = {
  base: Record<ShipStat, number>; // speed in knots, capacity in picul
  upgrades: Record<ShipStat, Upgrade[]>;
};

const noUpgrades = { speed: [], defense: [], capacity: [] };

export const vesselClasses = {
  "Coastal Junk": {
    base: { speed: 8, defense: 5, capacity: 120 },
    upgrades: {
      speed: [
        { value: 10, cost: 1500 },
        { value: 12, cost: 2500 },
        { value: 14, cost: 4000, reputation: 5 },
        { value: 16, cost: 6000 },
        { value: 18, cost: 9000 },
        { value: 20, cost: 15_000, reputation: 10 },
      ],
      defense: [
        { value: 20, cost: 1200 },
        { value: 35, cost: 3000, reputation: 5 },
        { value: 55, cost: 6000, reputation: 8 },
        { value: 80, cost: 12_000, reputation: 10 },
      ],
      capacity: [
        { value: 180, cost: 2000 },
        { value: 240, cost: 3500 },
        { value: 320, cost: 5000, reputation: 5 },
        { value: 400, cost: 8000 },
        { value: 500, cost: 12_000, reputation: 8 },
        { value: 650, cost: 25_000, reputation: 10 },
      ],
    },
  },
  // Not purchasable yet
  Brig: { base: { speed: 10, defense: 20, capacity: 240 }, upgrades: noUpgrades },
  Clipper: { base: { speed: 14, defense: 10, capacity: 160 }, upgrades: noUpgrades },
} satisfies Record<string, VesselClassRecord>;

export type VesselClass = keyof typeof vesselClasses;

export const STARTING_VESSEL_CLASS: VesselClass = "Coastal Junk";

export const vesselClassRecord = (vesselClass: VesselClass): VesselClassRecord => vesselClasses[vesselClass];

export const MAX_SHIP_DEFENSE = Math.max(
  ...(Object.keys(vesselClasses) as VesselClass[]).map((vesselClass) => {
    const { base, upgrades } = vesselClassRecord(vesselClass);
    return upgrades.defense.at(-1)?.value ?? base.defense;
  }),
);
