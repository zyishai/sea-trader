import { CargoOffer } from "./cargo-offer.js";
import { currentSeason } from "./clock.js";
import { GOAL_DAYS } from "./constants.js";
import { vesselClassRecord } from "./catalog/vessels.js";
import { shipStats } from "./ship.js";
import { ports } from "./catalog/ports.js";
import { goods } from "./catalog/goods.js";
import { goodsAboard, isOverloaded, spaceUsed } from "./hold.js";
import { outcome, result } from "./outcomes.js";
import { Context, EventTemplate, Good, Port } from "./types.js";

const marketOf = (context: Context) => context.destination ?? context.currentPort;
const speedGained = ({ ship }: Context) => shipStats(ship).speed - vesselClassRecord(ship.vesselClass).base.speed;

const weatherEvents: EventTemplate[] = [
  {
    id: "winter-storm",
    type: "weather",
    severity: "major",
    baseChance: (context) => (currentSeason(context) === "Winter" ? 0.2 : 0.08),
    message: "Captain, a freezing winter storm approaches! Our crew suggests finding shelter.",
    choices: [
      {
        label: "Push through",
        key: "P",
        effect: (context) => {
          if (context.rng.chance(0.4 + context.ship.health / 200)) {
            return result(
              ["Our crew's bravery has earned us respect!"],
              outcome.reputation(Math.round(5 + (context.day / GOAL_DAYS) * 5)),
            );
          }

          const seasonMultiplier = currentSeason(context) === "Winter" ? 1.3 : 1;
          return result(
            ["The storm battered our ship, Captain.", "The crew questions your judgment in challenging such weather."],
            outcome.damageShip(Math.round(context.rng.int(15, 34) * seasonMultiplier)),
            outcome.reputation(-3),
          );
        },
      },
      {
        label: "Seek shelter (costs $200-400)",
        key: "S",
        effect: (context) =>
          result(
            ["We sheltered in a safe harbor and waited out the storm."],
            outcome.money(-Math.round(200 * (1 + context.day / GOAL_DAYS))),
            outcome.delay(2),
          ),
      },
      {
        label: "Take a long detour",
        key: "D",
        effect: () => result(["We avoided the storm, but the long detour cost us time."], outcome.delay(4)),
      },
    ],
  },
  {
    id: "light-breeze",
    type: "weather",
    severity: "minor",
    baseChance: (context) => Math.min(0.3, 0.2 + speedGained(context) * 0.02),
    message: "A light breeze speeds up our journey.",
    effect: () => result([], outcome.delay(-1)),
  },
  {
    id: "storm",
    type: "weather",
    severity: "moderate",
    baseChance: (context) => Math.min(0.25, 0.15 + speedGained(context) * 0.015),
    message: "A storm approaches our vessel, Captain. What's your course of action?",
    choices: [
      {
        label: "Brave the storm",
        key: "B",
        effect: (context) =>
          result(
            ["We weathered the storm, but it battered the ship."],
            outcome.damageShip(isOverloaded(context.ship.hold) ? 30 : 20),
            outcome.delay(1),
          ),
      },
      {
        label: "Take a detour",
        key: "D",
        effect: () => result(["We avoided the storm, but the detour cost us time."], outcome.delay(3)),
      },
    ],
  },
  {
    id: "typhoon",
    type: "weather",
    severity: "major",
    baseChance: 0.18,
    message: "A typhoon has been spotted ahead! Seeking shelter will cost us $200 in harbor fees.",
    choices: [
      {
        label: "Pay harbor fees ($200)",
        key: "P",
        effect: () =>
          result(["We paid the harbor fees and waited out the typhoon safely."], outcome.money(-200), outcome.delay(2)),
      },
      {
        label: "Risk sailing through",
        key: "R",
        effect: (context) =>
          context.rng.chance(0.4)
            ? result(["Our bold gamble paid off, Captain!"], outcome.reputation(10))
            : result(["The typhoon severely damaged our ship, Captain."], outcome.damageShip(context.rng.int(10, 29))),
      },
    ],
  },
  {
    id: "heavy-seas",
    type: "weather",
    severity: "minor",
    baseChance: (context) => (isOverloaded(context.ship.hold) ? 0.35 : 0),
    message: "Heavy seas have damaged some of our overloaded cargo.",
    effect: (context) => {
      const [good, picul] = context.rng.pick(goodsAboard(context.ship.hold)) ?? [];
      return good && picul ? result([], outcome.loseCargo(good, Math.ceil(picul * 0.2))) : result([]);
    },
  },
];

const cargoEvents: EventTemplate[] = [
  {
    id: "cargo-shift",
    type: "cargo",
    severity: "minor",
    baseChance: (context) => Math.min(0.25, 0.15 + (spaceUsed(context.ship.hold) / context.ship.hold.capacity) * 0.2),
    message: "Captain, we have cargo stability issues due to poor loading at port.",
    choices: [
      {
        label: "Take time to redistribute the load",
        key: "R",
        effect: (context) =>
          context.rng.chance(0.8)
            ? result(
                ["We spent a day rebalancing the cargo.", "Our efficiency impressed local merchants, Captain."],
                outcome.delay(1),
                outcome.reputation(2),
              )
            : result(
                ["We lost some cargo during redistribution despite our best efforts."],
                outcome.loseCargoShare(0.1 + context.rng.float() * 0.15),
                outcome.delay(1),
              ),
      },
      {
        label: "Continue carefully",
        key: "C",
        effect: (context) => {
          const safely = result(["Despite the stability issues, we managed to continue safely."]);
          if (context.rng.chance(0.6)) return safely;

          const [good, picul] = context.rng.pick(goodsAboard(context.ship.hold)) ?? [];
          return good && picul
            ? result(
                ["Our poorly stowed cargo shifted in the swell."],
                outcome.loseCargo(good, Math.ceil(picul * 0.25)),
              )
            : safely;
        },
      },
    ],
  },
  {
    id: "expert-maintenance",
    type: "cargo",
    severity: "minor",
    baseChance: (context) => (context.ship.health > 80 ? 0.2 : 0),
    message: "Our well-maintained ship allows for more efficient cargo storage!",
    effect: (context) => result([], outcome.addCapacity(Math.floor(context.ship.hold.capacity * 0.1))),
  },
];

const marketEvents: EventTemplate[] = [
  {
    id: "tea-festival",
    type: "market",
    severity: "minor",
    baseChance: (context) => ((["Hong Kong", "Shanghai", "Nagasaki"] as Port[]).includes(marketOf(context)) ? 0.15 : 0),
    message: "A local festival increases demand for tea.",
    effect: (context) => result([], outcome.priceChange(marketOf(context), "Tea", 1.3)),
  },
  {
    id: "nagasaki-regulations",
    type: "market",
    severity: "moderate",
    baseChance: (context) => (context.destination === "Nagasaki" ? 0.15 : 0),
    message: "The Shogunate has announced new trade regulations in Nagasaki.",
    effect: () =>
      result(
        ["New regulations have shifted demand in the Japanese market."],
        outcome.priceChange("Nagasaki", "Porcelain", 0.7),
        outcome.priceChange("Nagasaki", "Opium", 1.5),
      ),
  },
  {
    id: "trade-delegation",
    type: "market",
    severity: "major",
    baseChance: (context) =>
      context.destination === "Hong Kong" || context.destination === "Shanghai" ? 0.12 : context.destination ? 0.08 : 0,
    message: "Captain! A foreign trade delegation has arrived! Their presence could significantly impact the market.",
    choices: [
      {
        label: "Host a banquet ($500)",
        key: "H",
        effect: (context) =>
          context.rng.chance(0.8)
            ? result(
                [
                  "The delegation was impressed by our hospitality!",
                  "Demand for Porcelain and Tea has increased significantly.",
                ],
                outcome.money(-500),
                outcome.reputation(5),
                outcome.priceChange(marketOf(context), "Porcelain", 1.4),
                outcome.priceChange(marketOf(context), "Tea", 1.4),
              )
            : result(
                ["The delegation was unimpressed by our efforts, Captain."],
                outcome.money(-500),
                outcome.reputation(2),
              ),
      },
      {
        label: "Observe from afar",
        key: "O",
        effect: (context) =>
          context.rng.chance(0.4)
            ? result(
                ["We gathered useful market intelligence by watching the delegation.", "Tea prices are rising."],
                outcome.priceChange(marketOf(context), "Tea", 1.2),
              )
            : result(["We missed an opportunity to influence the market."]),
      },
    ],
  },
  {
    id: "merchant-rumours",
    type: "market",
    severity: "moderate",
    baseChance: (context) => (context.destination ? 0.15 : 0),
    message: "Captain, our network of informants reports unusual merchant activity in nearby ports.",
    choices: [
      {
        label: "Investigate ($300)",
        key: "I",
        effect: (context) => {
          const targetPort = context.rng.pick(ports.filter((port) => port !== context.destination));
          return context.rng.chance(0.75) && targetPort
            ? result(
                [`Our contacts reveal high demand for Opium and Spices in ${targetPort}!`],
                outcome.money(-300),
                outcome.priceChange(targetPort, "Opium", 1.5),
                outcome.priceChange(targetPort, "Spices", 1.4),
              )
            : result(["Our sources proved unreliable."], outcome.money(-300));
        },
      },
      {
        label: "Trade on rumors",
        key: "T",
        effect: (context) =>
          context.rng.chance(0.5)
            ? result(
                ["Our market moves caused a surge in spice prices, Captain!"],
                outcome.reputation(3),
                outcome.priceChange(marketOf(context), "Spices", 1.25),
              )
            : result(["Our speculation backfired and hurt our reputation."], outcome.reputation(-2)),
      },
    ],
  },
  {
    id: "trade-opportunity",
    type: "market",
    severity: "major",
    baseChance: (context) => (context.destination ? 0.08 : 0),
    message: "A perfect trade opportunity presents itself!",
    effect: (context) => {
      const good = context.rng.pick(goods)!;
      return result(
        [`Extraordinary demand for ${good.toLowerCase()} has caused prices to skyrocket!`],
        outcome.priceChange(marketOf(context), good, 2 + context.rng.float()),
      );
    },
  },
  {
    id: "merchant-stockpile",
    type: "market",
    severity: "minor",
    baseChance: (context) => (context.destination === "Shanghai" ? 0.12 : 0),
    message: "Local merchants in Shanghai are stockpiling tea!",
    effect: () => result([], outcome.priceChange("Shanghai", "Tea", 0.8)),
  },
];

const discoveryEvents: EventTemplate[] = [
  {
    id: "uncharted-island",
    type: "discovery",
    severity: "minor",
    baseChance: (context) => Math.min(0.15, 0.05 + (context.day / GOAL_DAYS) * 0.1),
    message: "Captain, we've spotted an uncharted island! Shall we investigate?",
    choices: [
      {
        label: "Explore the island",
        key: "E",
        effect: (context) => {
          const roll = context.rng.float();

          if (roll < 0.5) {
            const picul = Math.round(10 * (1 + context.day / GOAL_DAYS));
            const offer: CargoOffer = {};
            for (let found = context.rng.int(2, 4); found > 0; found--) {
              const good = context.rng.pick(goods) as Good;
              offer[good] = (offer[good] ?? 0) + picul;
            }
            return result(
              ["A successful expedition, Captain!", "We found a buried chest and goods hidden on the island."],
              outcome.money(Math.round(Math.max(500, context.balance * 0.15))),
              outcome.reputation(3),
              outcome.delay(1),
              outcome.offerCargo(offer),
            );
          }

          if (roll < 0.8) {
            return result(
              ["Our ship struck a reef during the exploration."],
              outcome.damageShip(context.rng.int(10, 24)),
              outcome.delay(1),
            );
          }

          return result(
            ["The island exploration yielded nothing but wasted time.", "Our crew's morale has suffered slightly."],
            outcome.delay(2),
            outcome.reputation(-3),
          );
        },
      },
      {
        label: "Continue journey",
        key: "C",
        effect: () => result(["Better safe than sorry. We continue on our course."]),
      },
    ],
  },
  {
    id: "secret-route",
    type: "discovery",
    severity: "major",
    baseChance: (context) => (context.destination && context.reputation >= 75 ? 0.08 : 0),
    message: "A veteran sailor shares rumors of a secret trading route!",
    choices: [
      {
        label: "Follow the lead",
        key: "F",
        effect: (context) =>
          context.rng.chance(0.6)
            ? result(
                [
                  "We've discovered a lucrative trade route, Captain!",
                  "Local merchants are offering premium prices for Tea and Spices.",
                ],
                outcome.reputation(5),
                outcome.priceChange(marketOf(context), "Spices", 1.8),
                outcome.priceChange(marketOf(context), "Tea", 1.6),
              )
            : result(["The lead turned out to be a dead end, Captain."], outcome.delay(2)),
      },
      {
        label: "Share with merchants",
        key: "S",
        effect: (context) =>
          result(
            [
              "The merchants appreciate our openness, Captain!",
              "The shared route has moderately increased local prices.",
            ],
            outcome.reputation(8),
            outcome.priceChange(marketOf(context), "Spices", 1.3),
            outcome.priceChange(marketOf(context), "Tea", 1.3),
          ),
      },
    ],
  },
];

export const eventTemplates: EventTemplate[] = [...weatherEvents, ...cargoEvents, ...marketEvents, ...discoveryEvents];
