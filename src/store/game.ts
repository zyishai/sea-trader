import { assign, enqueueActions, setup, stateIn } from "xstate";
import { initialContext } from "./defaults.js";
import { Context, Good } from "./types.js";
import { GameEvents } from "./events.js";
import {
  calculateCostForRepair,
  calculateDailyMaintenanceCost,
  calculateGuardEffectiveness,
  calculateGuardShipCost,
  calculatePirateEncounterChance,
  calculatePrice,
  calculateRepairForCost,
  calculateTravelTime,
  calculateFleetUpgradeCost,
  checkForEvent,
  generatePrices,
  generateTrends,
  getAvailableStorage,
  getNetCash,
  getShipStatus,
  distributeFleetDamage,
  calculateInventoryValue,
  canAffordUpgrade,
  getNextUpgrade,
  getStorageUsed,
  getBufferStorage,
  canStoreCargo,
  getStorageUnitsForGood,
  getAvailableBufferStorage,
  getIntelligenceCost,
} from "./utils.js";
import {
  BANKRUPTCY_THRESHOLD,
  BASE_GUARD_COST,
  BASE_INTEREST_RATE,
  GOAL_DAYS,
  goods,
  MAX_DAILY_OVERDRAFT,
  MAX_GUARD_QUALITY,
  MAX_GUARD_SHIPS,
  OVERDRAFT_TRADING_LIMIT,
  ports,
  PRICE_UPDATE_INTERVAL,
  TREND_UPDATE_INTERVAL,
} from "./constants.js";
import { type Guard } from "xstate/guards";

export const gameMachine = setup({
  types: {
    context: {} as Context,
    events: {} as GameEvents,
  },
  actions: {
    displayMessages: assign(({ context }, messages: string[]) => ({
      messages: [...context.messages, messages].filter((msgs) => msgs.length > 0),
    })),
    acknoledgeMessage: assign(({ context }) => ({ messages: context.messages.slice(1) })),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOgIBcAnAewGVNKwx8BiWgFQEEAldgfQDinALIBRANoAGALqJQAB2qxc5XNXxyQAD0QBGAEwAaEAE89+gL4XjaLHkKkKNeo2ZsAEgHkA6n3eiAGQAFKVkkEEVlVXVNHQRdAE4EkgBmBMkAVgSMgHYANgAWfQAObN1jMwQM3RqSXWKcgpSc4uLJdOKrGwwcAmISKHRUMBcmVmFaAT5OAGEAaVDNSJU1DXC4-Uz9Ely2lpS0yTzmisQE452cyRSM-RTdAqacjK6QW16HAaGRhjGWAU8fHYgOEPDmonYi3Cy2ia1AG0kujyJDyDQKiXuBmypwQxTyyKS+kSCQMeXaOV0r3e9n6g2GozcAKBILBEPEujCCiUKxi60Q+gKORxaU2JDuj10LTyAoSlmsbx6NNIdJ+rlYHB4-AAQgBVACaAEkAHICKFcqKrWL8ySim4JFJHWU2-R3HE5K4kdEFSQFLLNZ6oqmKvrK74M9VcXh8XWGk3szkRbmwq0IAVC0yIG54kiSXOIvK3aVJF7y6khr7035uDVR2iBALG00yJZJy181OI4o5gqolL6DIFPE4vI5FIkYpZ2WNBLowpBuzllXhtiR-h1gINuMclsW3nw-mC4V45Kjx4u9GbBKdUvBz5LqusAAiohmAR4omjnCNc24OqC7BmPUzUTXc4W0A900qJE+x2HsR30d1BWKDIUnnD5aTDB8WGfV930-b9f3-QD4x3HkwLiJpbhRRFHngwocgSHEagyLtdHaX08jYvF+zlboFzvTC1RYbgIQNETgJhNt91TQ8M1TUddHHTZJU4goSWQks+PQ0NKyEkT2DEiRt2hVs93AhAmmlaiHh7HJ9Hoxi5IMSQuzJGdqgyLJERnNClQrVU-gk0zyMQSztjJGy6MFRyoP7ZI2JnQVcxnXQbl8xdBMC4zzTIlNNis-sUjxX1ziKFIcU8goUQYgsMQMCdry0vz7yE8R9ATSSzIolIims2i7IcpijmRa5UoHQoWKRdKBN0wKUg64K8qObZCuKrJCldOTKJ2cUahqe5bl4hV+Iw2a3HEAoFtApaRxRFJ8Qe-Qr0O4Umk9X0HXODJriaabToC86Miu3L23ylaULW0rNsqc8xVKI5Wj7IkfVQm8Tp0gHWHEPJgeTUHlrFCGJqh8qtrsxSUOcpEDCKyk0e0-zl3EHJcak8z8pyO6HvxJ7kJdHEeyez1KdzB5sjszTjoZlrAuKVmuutAqiZKjbScqX02LFc5kPte5Hj+jGmYSeWQo7W7jm5os+aMLb0S7IkGl2VFjjppqMrOrG2JNm7waK4nVYFp7kmW6orm+tSEgNxmsPZbKQJB6SOa57neZerb8pIK8JU8hpUUj+nmsy5gyAgAAbMB-kBYE+CCTxeCC67QaaMddFuB0HkQ4obag3JFOKQdbkRAUNryKOZeL3Ay4rplq9r+u48603+0aVIShqdIWKvco5LuW7BTuVubhKVFJbLGbMZL8vK+ZGu68hdrSLxxO7cuNpKfsjyCiYwUMjFK57ryPaY4NpUZu3PuGS+08q6AmNAANVEEaYE3AgLNhMo3ROLEqp9mKOvTIpQcFMRHJzBI+Qsj2nRO6Z4Y8i74EgdfautB3AGiCHqHgj4G4J3ZgOLBa9Eh4K3sKRoyJPLuRwUkZooCpaFw9nQmegJ9KGTEIgjhT8uEClXjgvhm8CFbXXp6Mk90WLfSSPnMB-0IGTyvnI-CP4-wARQd7JuvpM7ZCeihCk9lt5QT9pnfIZJ+7eivKYqR7sL6WIrqCI0nABAfgAGIBFEGyVBOVVEUTeqQgsfZ2hXmlDiEozxqKyluI0A4nkcjUJkeElgogAAaBpITJPjqk-klUNG4O0V4zMApJA5kAfkZ4h80gVIvugcgfBFCUHICQeQuBMAAGtHxwFUPgUZqwWDsG4JweBARmQqLZnEB0KExT1CuO6Cc91u78k2C3bOV5SgSwKMMiBozxnUEmdM2ZCylkEFWeoFgMwvwzECHshWqZMFtK0fgzp8QGJdgGlkK4+ISE9ieQ+EgLyJlTJwGAeZQRcCUFGXAUQ+BMDUAAK74HIGASgLAQWmx6i6HY9x8ojjUjomGkh8gkD8Vkey7FUTlILqE55YzMUkGxbi-FhLYDEtJRSqlNKSJoM4Qcoo2x37DWnOyq5PVxwR3qjgjIxxJFn3MWijFbypkzIJVSmVJLyWUupZAFgQQxKcHYKIWgfAEEzE8DqRBohuB8FiQaAQ7gGmOOkpiTmJRSjVFlGkQoasWkwTsgfB0LRhqorVOi0VlqPk2qJfa+VTqIAurdR6r1Pq-UBqDfExJdKUzMpja0MoCbSrJtTEWVIuY4L2UKEcbNYxc2vPeda6VsqHUKuda6zZlbvVGl9f6j1QbPCxNiYGxt7YbiPD1fdDeBYWiXPkv2ccUpEi+kFD2U+t4zU5ote8iVczRAADdmDkFpY0xeTaJY5juH2X0Ot3R5MSL-ftXlEppSFeA81ebH3YBxc+t9lLaUL0Wtu39ICANGJIZBK56IxT4hYvkB4NQ7hDuLg+qZYBkPkE8JgTAZLKCMAgCQCAYAFWoD6HwcgJh5AVy3VGmoPSXIsWlGSMkT08mO3HFbSUEjGohJg-euD1HaP0cY8xyAbGOPUq44QHjfGBNofQeZTEInkLcQkzaGK-JxayYdPvbIspFOmsNrB0dan30aaYyxkg+BqB8BwNQWZETJjTHmIJsz3C92AMyIerueSSTBx6kUicDwEJHTc9HFTnmSA0e8wx3z2nUBktLqoIL2AQuYAriJWgngAjwO9fA5RX70NRpi-3fd8XdjHpKIyji7p7JNBcoKsx7nctiqoOgN9pcCBQE-ZGtRPDNEbyhUxYxYp+0PBYkVWFFHaEvIwJQOZHGSDDHwGSlgsCDSiF8MaD1G5Q0+okG10zcQuI9IpNk54nk7i2YQMyrsdpmWAOdo86Dd7h1HfQCds7F2rsAsXcCt7Kq9CXszg8doAGXZ5EEYOTOATh7HlzKPSHE3odjOO6dqZL7cBgAAO7zYNI60uc2YAkorkEHU3AZjuE4HWPgD36zPeR1FuIuRObNAjqUJEIC8dyUxH3Xl30jVHBQgdkd1Ozt08Z8z1n7PmA1ZdTzvnAuPzC6ezEsXJm0cIGS6-eTiJvq1WFJKLsOsHQ4P3ixTXMO4e0-p0z-AUAWdUrZ7gDnxutSzAWKj5p9vEiO9HM79X0Kd3bGeLmJ6pGWijj91T2HNOSAACMyUmE4JgWEJvef87rOLxAxwqqEjuAhI1Bx7SvVlHUCkAT7SpRJGNpTUPKOF4D6X8vlfq-c9r+bpVKT9mN-qKkP0bQu5JoMMKNIv8-SAMlCN6oJrb0U9H3wbXUyy8V6r2smfZv68P2VQn6UPSKFZ29O4gUwoEKKXtI0W4Nl8kC8z8i8ztL8p81kY9It49F9E9khdgndW409hQ-RCZs8SoHYstj8ctKdgDx9YAwA2dwC-l1wAgG8EAkUe1uJvc2VkJBECl0hpQ8R9oGIgDz8SB8DCDr9iD6x58mkYCCwqpTwmgEIipZR08CxwZe1apvp7JWCQCpkODS4iD1R6xpgNwyCdtm8sd7Rh57gFdKhmgkhPQidERmg3Ej90ZsDT82DFDlCWBIC48ls4gHd4CU9EDXdFd8hwpqhOUHYGg+wb1LDx5DsxlYA8B5ATBYdWMEd6FARGFmFWFuBHw+ARIghOAxIyCnpcwcwBwKRPJsF+ZFd-8e0ZwepRYBogCwjcAIiojztmArtrF4iWE2E+A-wBBNlnxMj0gRNcjW4UJ+tj00hswUZ8hZRSj+wydxsrCQi+AqiajKBoj6j-lAUUcnCDxW4XFbhshmhSRoUyNkhCh+5cNvQcEcFKjwjIiFiSBGB5B0B8V5thJRA0iMjoDQU+wkQ-5RtvRJMBRO0GVM9mUBwyigFzjqjLjWMbi7jKAHjUj0juBeDv1t1iQ7o9hvpngiRPIt97I6gRZmI4pJjh8T8Zi5jwTriwBbj7iQ9Hjnj4SH8F9QUBRT1ixzCPFOImJ6gekHgjj7gSQiRyNydpiR0STajITKSFskcgVSDXj6VMgW5HZD1e8EIv5Fckpxx2IipPJUo+xQT5jWMyV5AoACUIAHi2iOiPwmiyD7hhjcM25UR7JgNFdWhOZr1AE-sDgeodTST9TDT0BjSqTTTOBnw+ALTbcE97gKQdobgfREQ3DBELg2h3JeVfQh9stgihSLjajvSjSHiJTVjH4YDDk5SAxJd6glThR7Qd8nhRwut+8Icpi0yXlGBVBGALsP1cypS1iwVdVsF2l1stoEZM4DErhvQjgfRAjpYaER0S90B8A5lKB9TyBMATBljkcOz8yGTtpmTtjWS9iDhkRBR8QsQN53JNdddg8oA+ACBaM3llz2zMjbgVteyBEnJpRnS-FrhZcioLCJyZEMAVkoB5s+AAAzcueHJY6xAQHUFo-nDcPwQyMgw-ccVfI1GoNoNIPJAeOoe4PBJUzIOswkwUv89AACkPYC0CqZGIiCqCpIvwTgWCphcSUMmA84EaaUQcWcVuAJEDB4JlMjO4a4H0fC1Mycoikii8kCpgCi8C6BQQai5ImCnZAMzo6UlMNSX+IY30IkGcJINSPJIqLsP7DeUTCkKDeskSmc4iwCiSsCy7WI2S6CuixSoIdowMoyTspCblAsTJS8HJPrHPXxH+eoEhCRTXUSqy8iuo2yqihy2CpSiQOkvg0FFi3pAUfuamTBZUmGZlOodoftEUSUBCUKiysSsiySyKhomSyCmKnZR8A0WgYQOq2gBC7IwqBNAShCbEHeUDVIL6K8K4dIA4Iq-88KsqyiyquS2i2C2q+qxqhE9rcyZK5adi9KrineMkKqBKZeJ6J6Ticc6RC+MK0i6yqS2yu8lS9sSUIwnsFybIASwBIoPSkoOoQcT6BFDUoayyo6iKvARgWgcI2AFgBij8IIQNSJBBfgKqpIpq866SNiBCOGdINMNINNPrGMzOLYvfDua4Ak4S384qkas7H6kYf6wGwyGuUGr8cG+yqGua97PQQwsUIoNiBifIpiGcbYdEP2CcF0VoOcAUtMw68S76-FYm6ogGoG8m7gMGxBamx8JqhKxE2Ghmxk5m7IFCJifuX+CcXuQ-S9HGrAgW-Gr6sqomv6sW0mkSSW6WiGuSpq+adc02S65Ia6uNO69mpid0ZEUpace6ONfWoI8y4a42wmkWs2+QAGs6zs0kHpBgpEEhdodfYoNmveLY0cfEEbWUD6kq46kgLM30sAWJcilgOK2W6GqO9oHpeGI1EjI1BoJOneDE3i-aa5bm78-aiBQW0qs7PO9jQuyS4u5ys00u2mu3J2-RG676B0e6vyn0T0J0QBJIbiV2Aiw2oOoWsqnuguouyOh2lMaOzOI4OO-qxOkDAsHMJXd0FCJoVzA2wOz69es7Y02ALjWAWAMOgG6ahq2gL1SGuWjQhM8e12qe92neZoVyF6zIH0Shc4LOgmqZJ+l+t+kmnex-GA-e2OvpBO+yeumGfIwpTxfuCY-Pfmycl5MALQFQFcyU+8woCFNbZ8gwoKnYPpOyI4NSX0KOWAUlaEkPZcOrVcQQEQV7dyhoZIcUbpTlaoWSWKWeuKfqC9YJbLBDUueQZcJhIM-wYIDQoww4LIXIDaONaFF3HpAVM8A-VKKweUALdjeAcINzXe9sAAWnuhxEcYKQjhbyKmjLbvLCcDoAfAceklyAqjYjHHWs5TzFlF+hIY9kCfMmJCGl6i5NVxkOgc13CTiY2B6l-ldKDjsi9Dw3iBHDHCKHxFHGZSvB8eUxwMxUyf5AnDEa4kKCeAaYyDZt6nAyKXkwFSALFRmXmUWVgGWV+TAkVvZidOORcmabAe3zyRdB6X7X8QeDzkUdvpkSo3FQQ0lULTtTlUdUoDqcB2UiUhtDBxIVRB7DmexN7D5OPhlF6fzXHVtUnRLRY0Oe2pWiaceBmc6phlHBPFlALBIQfOvQefg0Q1fXfUOazE5kaCJCxAalHDmYOBzEXoaE7AYndDBa80pR8y0wgHedKCqmRmKhadmZ3ilBRCPMRArruD2uFQ8zFQK1xaK3xZ0042414343efZsmdJZ+baZ3laB6Qxqns5Wgmxfy3U1Zb8wC0q2qzAGhY6s9AH3yF8LQqSxgk4gdB9HsiSBckleZboxlZKzKwq2C1C2hZ5LFAdCGNOXjUKfyQ2qxBziEQeCqZHxmKmwJVm3m2hf7k5klHd1DgaYBwQmzHDL9m+h+k8jkID0Oa2NSGnCCTl13iS3dBXyKR9BPg1xiZGTH2LwR0OdSiZKelHAYnsgFCRHx2doCWqFbgrMHTzZFVwOLzPP13D0N050OYkJ6o+iyJnGuD+KJBKel2uEaFKF1jjeLzAK4NGfmriBPmTyJAGQzWQPtG5Q8dW1HEwIDvWYLbO1sLnZ7ZIRVe8m6SyCvSPAzfYqaHtBtFSmuE9KiPebsjHAifugfaVKRcVzuFckphuD21zHpeqdP2FKuKLdQYZPdEUg-ckwMEaB-YMJIW2BGP7XSD2g9aJPTLBJFPJKhL9ag-pQmO7BRluBQmlHTwfJKO9HRKnALGfauJ7sI-pOI6ojuQOC7g0k30VyCW7CKkHApCREaCErWfzb4CbJFtbNfe9E8qNR8JsjZQFk5U5iBJPj7HLZ9CAOnNnPnPkEXMqFY7yhHAsw6AOECRsiYmyZyMJAYm6cyFPKD0AqvPfRvNfe7zbhHOQhuDskIXuhs-UlOLFlgeDvIEOZGzk+8uyW4g9pYlSBuDByKHf39p-IOqNofpOrJR7dk6ZtlxtFyEHGhX7GzH6vhcFjSGibMrxrXq7qmVNv+uLfrbqCSDjslB+ikx3hRhcU2AxL4pTLE47vS9q9zoNKNK3sksa9nvqE4sQ89pHDmYI1yHzDV2uDKRC4y7Y1wGfq26QbFsm+2FSgei1JqFPDyTIT-QMVHNGMq5XtIbGXIZUHeYFRRAHVyEc0vTdyvBxK9wXqDeXuyy4beXm3DHC-Jl4oRkBfSAB2ckEMvZ66SnfyjmUdUYCaI6bU8ni79BKFKgehCaOByto8id+MsYsCAA */
  initial: "introScreen",
  context: initialContext(),
  states: {
    introScreen: {
      on: {
        START_GAME: { target: "gameScreen", actions: assign(({ event }) => initialContext(event.settings)) },
        SHOW_HELP: { target: "helpScreen" },
      },
    },
    gameScreen: {
      initial: "idle",
      states: {
        idle: {
          id: "idle",
          on: {
            GO_TO_PORT: [
              {
                guard: ({ context }) => getShipStatus(context.ship.health) === "Wreckage",
                actions: {
                  type: "displayMessages",
                  params: ["Your ship is in wreckage condition.", "You can't travel until you repair it."],
                },
              },
              {
                guard: ({ context }) => context.day < GOAL_DAYS || context.extendedGame,
                target: "at_port",
              },
              {
                actions: {
                  type: "displayMessages",
                  params: [`You've finished your ${GOAL_DAYS} days voyage.`],
                },
              },
            ],
            GO_TO_INVENTORY: { target: "viewing_inventory" },
            GO_TO_SHIPYARD: { target: "at_shipyard" },
            GO_TO_RETIREMENT: { target: "at_retirement" },
            GO_TO_BANKRUPTCY: { target: "at_bankruptcy" },
            MANAGE_FLEET: { target: "managing_fleet" },
            EXIT: { target: "at_exit" },
          },
        },
        at_port: {
          entry: assign(({ context }) => ({ availablePorts: ports.filter((p) => p !== context.currentPort) })),
          initial: "pickDestination",
          states: {
            pickDestination: {
              on: {
                TRAVEL_TO: {
                  target: "checkPiratesEncounter",
                  actions: assign(({ event, context }) => ({
                    destination: event.destination,
                    currentEvent: checkForEvent(context),
                  })),
                },
                CANCEL: { target: "#idle" },
              },
            },
            checkPiratesEncounter: {
              always: [
                {
                  guard: ({ context }) => Math.random() < calculatePirateEncounterChance(context),
                  target: "piratesEncountered",
                },
                { target: "checkEvent" },
              ],
            },
            piratesEncountered: {
              on: {
                PIRATES_ENCOUNTER_FIGHT: {
                  actions: enqueueActions(({ enqueue, context }) => {
                    const successChance = calculateGuardEffectiveness(context);
                    const success = Math.random() < successChance;

                    if (success) {
                      // Even when winning, ship might take some damage
                      const takeDamage = Math.random() < 0.7; // 70% chance to take damage
                      const damage = takeDamage ? Math.floor(Math.random() * 10) + 5 : 0; // 5 - 15 damage
                      const { shipDamage, shipsLost, remainingFleetDamage } = distributeFleetDamage(damage, context);

                      // Loot from pirates
                      const cargoValue = [...context.ship.hold.entries()].reduce(
                        (sum, [good, quantity]) => sum + context.prices[context.currentPort][good] * quantity,
                        0,
                      );
                      const baseLoot = Math.floor(Math.random() * 500) + 801; // [$800, $1300]
                      const factor = Math.floor(100_000 / Math.max(1, context.balance + cargoValue));
                      const potentialLoot = Math.max(500, Math.floor(baseLoot * factor));
                      const actualLoot = Math.min(15_000, potentialLoot);

                      const messages = [
                        "Your guard fleet successfully fought off the pirates!",
                        `You looted $${actualLoot} from the pirates' ship.`,
                      ];

                      if (shipDamage > 0) {
                        messages.push(`Your ship took ${shipDamage} damage in the battle.`);
                        if (shipsLost > 0) {
                          messages.push(
                            `Lost ${Math.min(shipsLost, context.guardFleet.ships)} guard ship${
                              Math.min(shipsLost, context.guardFleet.ships) > 1 ? "s" : ""
                            } protecting your vessel.`,
                          );
                        }
                      }

                      messages.push(`Gained 5 reputation points for your bravery.`);

                      enqueue({ type: "displayMessages", params: messages });
                      enqueue.assign({
                        ship: {
                          ...context.ship,
                          health: Math.max(0, context.ship.health - shipDamage),
                        },
                        guardFleet: {
                          ...context.guardFleet,
                          ships: Math.max(0, context.guardFleet.ships - shipsLost),
                          damage: remainingFleetDamage,
                        },
                        balance: context.balance + actualLoot,
                        reputation: Math.min(100, context.reputation + 5),
                      });
                    } else {
                      // Lost the fight - more severe consequences
                      const damage = Math.floor(Math.random() * 20) + 15; // 15 - 35 damage
                      const { shipDamage, shipsLost, remainingFleetDamage } = distributeFleetDamage(damage, context);

                      const stolenGoods = Math.floor(Math.random() * 10) + 5;
                      const randomGood = [...context.ship.hold.entries()]
                        .filter(([_, amount]) => amount > 0)
                        .map(([good]) => good)[Math.floor(Math.random() * context.ship.hold.size)];

                      const newHold = new Map(context.ship.hold);
                      if (randomGood) {
                        const currentAmount = newHold.get(randomGood) || 0;
                        newHold.set(randomGood, Math.max(0, currentAmount - stolenGoods));
                      }

                      enqueue({
                        type: "displayMessages",
                        params: [
                          "Despite your guard fleet's efforts, the pirates prevailed!",
                          `Your ship took ${Math.min(shipDamage, context.ship.health)} damage in the battle.`,
                          randomGood
                            ? `Pirates stole ${Math.min(stolenGoods, context.ship.hold.get(randomGood)!)} ${randomGood}`
                            : "",
                          shipsLost > 0
                            ? `Lost ${Math.min(shipsLost, context.guardFleet.ships)} guard ship${
                                Math.min(shipsLost, context.guardFleet.ships) > 1 ? "s" : ""
                              } in the battle.`
                            : "",
                          `Lost ${Math.min(shipsLost * 2 + 1, context.reputation)} reputation points.`,
                        ].filter(Boolean),
                      });
                      enqueue.assign({
                        ship: {
                          ...context.ship,
                          health: Math.max(0, context.ship.health - shipDamage),
                          hold: newHold,
                        },
                        guardFleet: {
                          ...context.guardFleet,
                          ships: Math.max(0, context.guardFleet.ships - shipsLost),
                          damage: remainingFleetDamage,
                        },
                        reputation: Math.max(0, context.reputation - (shipsLost * 2 + 1)),
                      });
                    }
                  }),
                  target: "traveling",
                },
                PIRATES_ENCOUNTER_FLEE: {
                  actions: enqueueActions(({ enqueue, context }) => {
                    const baseFleeChance = 0.6 + calculateGuardEffectiveness(context) * 0.2;

                    const totalBuffer = getBufferStorage(context.ship);
                    const availableBuffer = getAvailableBufferStorage(context.ship);
                    const overloadPenalty = context.ship.isOverloaded
                      ? ((totalBuffer - availableBuffer) / totalBuffer) * 0.4
                      : 0;

                    const fleeChance = Math.max(0.1, baseFleeChance - overloadPenalty);
                    const success = Math.random() < fleeChance;

                    if (success) {
                      const noDamage = Math.random() < 0.3; // 30% chance to escape without any damage
                      if (noDamage) {
                        enqueue({
                          type: "displayMessages",
                          params: ["You masterfully maneuvered away from the pirates without a scratch!"],
                        });
                      } else {
                        const damage = Math.floor(Math.random() * 8) + 3; // 3 - 11 damage
                        const { shipDamage, shipsLost, remainingFleetDamage } = distributeFleetDamage(damage, context);

                        const messages = [
                          "You've successfully escaped from the pirates!",
                          `Your ship took ${shipDamage} damage while fleeing.`,
                        ];

                        if (shipsLost > 0) {
                          messages.push(
                            `Lost ${Math.min(shipsLost, context.guardFleet.ships)} guard ship${
                              Math.min(shipsLost, context.guardFleet.ships) > 1 ? "s" : ""
                            } covering your escape.`,
                          );
                        }

                        enqueue({
                          type: "displayMessages",
                          params: messages,
                        });
                        enqueue.assign({
                          ship: {
                            ...context.ship,
                            health: Math.max(0, context.ship.health - shipDamage),
                          },
                          guardFleet: {
                            ...context.guardFleet,
                            ships: Math.max(0, context.guardFleet.ships - shipsLost),
                            damage: remainingFleetDamage,
                          },
                        });
                      }
                    } else {
                      const damage = Math.floor(Math.random() * 15) + 10; // 10 - 25 damage
                      const { shipDamage, shipsLost, remainingFleetDamage } = distributeFleetDamage(damage, context);

                      const messages = [
                        "Failed to escape from the pirates!",
                        `Your ship took ${shipDamage} damage while attempting to flee.`,
                        shipsLost > 0
                          ? `Lost ${Math.min(shipsLost, context.guardFleet.ships)} guard ship${
                              Math.min(shipsLost, context.guardFleet.ships) > 1 ? "s" : ""
                            } to the pirates.`
                          : "",
                        `Lost ${Math.min(2, context.reputation)} reputation points.`,
                      ].filter(Boolean);

                      enqueue({
                        type: "displayMessages",
                        params: messages,
                      });
                      enqueue.assign({
                        ship: {
                          ...context.ship,
                          health: Math.max(0, context.ship.health - shipDamage),
                        },
                        guardFleet: {
                          ...context.guardFleet,
                          ships: Math.max(0, context.guardFleet.ships - shipsLost),
                          damage: remainingFleetDamage,
                        },
                        reputation: Math.max(0, context.reputation - 2),
                      });
                    }
                  }),
                  target: "traveling",
                },
                PIRATES_ENCOUNTER_OFFER: {
                  actions: enqueueActions(({ enqueue, context }) => {
                    const bribeCost = Math.round(context.balance * 0.15);
                    const actualBribe = Math.floor(Math.random() * (context.balance + 1));
                    const success = actualBribe >= bribeCost;

                    if (success) {
                      enqueue({
                        type: "displayMessages",
                        params: [
                          `You paid the pirates $${bribeCost} to let you go your merry way.`,
                          `Lost 1 reputation point.`,
                        ],
                      });
                      enqueue.assign({
                        balance: context.balance - bribeCost,
                        reputation: Math.max(0, context.reputation - 1),
                      });
                    } else {
                      const damage = Math.floor(Math.random() * 25) + 15; // 15 - 40 damage
                      const { shipDamage, shipsLost, remainingFleetDamage } = distributeFleetDamage(damage, context);

                      const messages = [
                        "You couldn't afford to bribe the pirates!",
                        "They attacked in anger!",
                        `Your ship took ${shipDamage} damage.`,
                        `Lost ${Math.min(5, context.reputation)} reputation points.`,
                      ];

                      enqueue({
                        type: "displayMessages",
                        params: messages,
                      });
                      enqueue.assign({
                        ship: {
                          ...context.ship,
                          health: Math.max(0, context.ship.health - shipDamage),
                        },
                        guardFleet: {
                          ...context.guardFleet,
                          ships: Math.max(0, context.guardFleet.ships - shipsLost),
                          damage: remainingFleetDamage,
                        },
                        reputation: Math.max(0, context.reputation - 5),
                      });
                    }
                  }),
                  target: "traveling",
                },
              },
            },
            checkEvent: {
              always: [
                { guard: ({ context }) => !!context.currentEvent, target: "eventOccurred" },
                { target: "traveling" },
              ],
            },
            eventOccurred: {
              initial: "determine_type",
              states: {
                determine_type: {
                  always: [
                    {
                      guard: ({ context }) => !!context.currentEvent?.choices,
                      target: "multi_choice",
                    },
                    {
                      guard: ({ context }) => !!context.currentEvent?.effect,
                      target: "no_choice",
                    },
                  ],
                },
                no_choice: {
                  entry: [{ type: "displayMessages", params: ({ context }) => [context.currentEvent!.message] }],
                  on: {
                    MSG_ACK: {
                      actions: [
                        { type: "acknoledgeMessage" },
                        assign(
                          ({ context }) =>
                            context.currentEvent!.effect?.(context) ?? { currentPort: context.destination },
                        ),
                      ],
                      target: "#traveling",
                    },
                  },
                },
                multi_choice: {
                  on: {
                    RESOLVE_EVENT: {
                      actions: [
                        assign(({ context, event }) => {
                          const choice = context.currentEvent!.choices?.find((choice) => choice.key === event.choice);
                          return choice?.effect(context) ?? { currentPort: context.destination };
                        }),
                      ],
                      target: "#traveling",
                    },
                  },
                },
              },
            },
            traveling: {
              id: "traveling",
              entry: [
                // Adjust travel attributes
                assign(({ context }) => {
                  const travelTime = context.destination ? calculateTravelTime(context.destination, context) : 1;
                  return {
                    day: Math.min(context.extendedGame ? Infinity : GOAL_DAYS, context.day + travelTime),
                    currentPort: context.destination,
                    nextPriceUpdate: Math.max(0, context.nextPriceUpdate - travelTime),
                    nextTrendUpdate: Math.max(0, context.nextTrendUpdate - travelTime),
                  };
                }),
                // Reset temporary context attributes
                assign({ destination: undefined, currentEvent: undefined }),
                {
                  type: "displayMessages",
                  params: ({ context }) => [`Arrived to ${context.currentPort}`],
                },
              ],
              always: [{ target: "#idle" }],
            },
          },
        },
        at_market: {
          id: "market",
          entry: assign({ availableGoods: goods }),
          initial: "menu",
          states: {
            menu: {
              on: {
                VIEW_MARKET_INTELLIGENCE: { target: "intelligenceAction" },
                CANCEL: { target: "#idle" },
              },
            },
            intelligenceAction: {
              initial: "viewing",
              states: {
                viewing: {
                  on: {
                    START_MARKET_INTELLIGENCE_PURCHASE: { target: "purchasing" },
                    BACK: { target: "#market.menu" },
                  },
                },
                purchasing: {
                  on: {
                    PURCHASE_MARKET_INTELLIGENCE: [
                      {
                        guard: ({ context, event }) =>
                          context.balance + (context.inOverdraft ? OVERDRAFT_TRADING_LIMIT : 0) <
                          getIntelligenceCost(event.level),
                        actions: {
                          type: "displayMessages",
                          params: ["You don't have enough money to purchase intelligence"],
                        },
                      },
                      {
                        actions: [
                          assign(({ context, event }) => ({
                            marketIntelligence: {
                              ...context.marketIntelligence,
                              level: event.level,
                              lastPurchase: context.day,
                            },
                            balance: context.balance - getIntelligenceCost(event.level),
                          })),
                          {
                            type: "displayMessages",
                            params: ({ event }) => [`Purchased intelligence level ${event.level}`],
                          },
                        ],
                        target: "viewing",
                      },
                    ],
                    BACK: { target: "viewing" },
                  },
                },
              },
              exit: assign(({ context }) => ({
                marketIntelligence: { ...context.marketIntelligence, port: undefined },
              })),
            },
            buyAction: {
              id: "buying",
              on: {
                PURCHASE: [
                  {
                    guard: ({ context, event }) =>
                      calculatePrice({ ...context, ...event }) >
                      context.balance + (context.inOverdraft ? OVERDRAFT_TRADING_LIMIT : 0),
                    actions: {
                      type: "displayMessages",
                      params: ({ context, event }) => [
                        `Not enough money. Need $${calculatePrice({ ...context, ...event })} to purchase ${event.quantity} picul of ${event.good.toLowerCase()}`,
                      ],
                    },
                  },
                  {
                    guard: ({ context, event }) => !canStoreCargo(context, event.good, event.quantity),
                    actions: {
                      type: "displayMessages",
                      params: ({ context, event }) => [
                        `Not enough storage space for ${event.quantity} picul of ${event.good.toLowerCase()} (needs ${getStorageUnitsForGood(event.good, event.quantity)} storage units)`,
                        `Available storage: ${getAvailableStorage(context.ship)} picul (+${getAvailableBufferStorage(context.ship)} overload)`,
                      ],
                    },
                  },
                  {
                    actions: [
                      assign(({ context, event }) => ({
                        ship: {
                          ...context.ship,
                          hold: context.ship.hold.set(
                            event.good,
                            (context.ship.hold.get(event.good) ?? 0) + event.quantity,
                          ),
                        },
                        balance: context.balance - calculatePrice({ ...context, ...event }),
                      })),
                      {
                        type: "displayMessages",
                        params: ({ context, event }) => [
                          `Purchased ${event.quantity} ${event.good} for $${calculatePrice({
                            ...context,
                            ...event,
                          })}.`,
                          `You have ${getAvailableStorage(context.ship)} units of storage left.`,
                        ],
                      },
                    ],
                  },
                ],
                // REVIEW: "Cancel" event doesn't seem to work here,
                // when sending the CANCEL event in this state, it jumps
                // to the idle state.. seems like it's been handled by the menu's handler
                // (when printing a message there and here - both messages are displayed
                // in response to the cancel event)
                // See the `at_shipyard` state as a working example (the key difference is
                // the `id` property of the sub-states; Maybe a bug?)
                BACK: { target: "menu" },
              },
            },
            sellAction: {
              id: "selling",
              on: {
                SELL: [
                  {
                    guard: ({ context, event }) => (context.ship.hold.get(event.good) ?? 0) < event.quantity,
                    actions: {
                      type: "displayMessages",
                      params: ({ event }) => [`You don't have enought ${event.good.toLowerCase()} in your hold.`],
                    },
                  },
                  {
                    actions: [
                      assign(({ context, event }) => ({
                        ship: {
                          ...context.ship,
                          hold: context.ship.hold.set(
                            event.good,
                            (context.ship.hold.get(event.good) ?? 0) - event.quantity,
                          ),
                        },
                        balance: context.balance + calculatePrice({ ...context, ...event }),
                      })),
                      {
                        type: "displayMessages",
                        params: ({ context, event }) => [
                          `Sold ${event.quantity} ${event.good} for $${calculatePrice({
                            ...context,
                            ...event,
                          })}.`,
                          `You have ${getAvailableStorage(context.ship)} units of storage left.`,
                        ],
                      },
                    ],
                  },
                ],
                SELL_ALL: {
                  target: "#idle",
                  actions: [
                    {
                      type: "displayMessages",
                      params: ({ context }) => [
                        `Selling all goods for $${calculateInventoryValue(context)}`,
                        `You have ${context.ship.capacity} picul of storage left.`,
                      ],
                    },
                    assign(({ context }) => ({
                      balance: context.balance + calculateInventoryValue(context),
                      ship: {
                        ...context.ship,
                        hold: goods.reduce((map, good) => map.set(good, 0), new Map()),
                      },
                    })),
                  ],
                },
                BACK: { target: "menu" },
              },
            },
          },
        },
        at_shipyard: {
          initial: "menu",
          states: {
            menu: {
              on: {
                GO_TO_SHIPYARD_REPAIR: { target: "repairing" },
                GO_TO_SHIPYARD_UPGRADE: { target: "upgrading" },
                CANCEL: { target: "#idle" },
              },
            },
            repairing: {
              on: {
                REPAIR: [
                  {
                    guard: ({ context }) => context.ship.health === 100,
                    actions: { type: "displayMessages", params: ["Your ship is already in perfect condition"] },
                  },
                  {
                    guard: ({ context, event }) => context.balance < event.cash,
                    actions: { type: "displayMessages", params: ["You don't have enough cash"] },
                  },
                  {
                    actions: [
                      {
                        type: "displayMessages",
                        params: ({ context, event }) => {
                          const damageToRepair = Math.min(
                            /* ship's damage */ 100 - context.ship.health,
                            calculateRepairForCost(event.cash, context),
                          );
                          return [`Repaired ${damageToRepair} damage`];
                        },
                      },
                      assign(({ context, event }) => {
                        const damageToRepair = Math.min(
                          /* ship's damage */ 100 - context.ship.health,
                          calculateRepairForCost(event.cash, context),
                        );
                        const cost = calculateCostForRepair(damageToRepair, context);
                        return {
                          balance: context.balance - cost,
                          ship: {
                            ...context.ship,
                            health: context.ship.health + damageToRepair,
                          },
                        };
                      }),
                    ],
                    target: "#idle",
                  },
                ],
                CANCEL: { target: "menu" },
              },
            },
            upgrading: {
              on: {
                UPGRADE_SHIP: [
                  {
                    guard: ({ context, event }) => !canAffordUpgrade(event.upgradeType, context),
                    actions: [{ type: "displayMessages", params: ["Not enough money for this upgrade."] }],
                  },
                  {
                    actions: [
                      assign(({ context, event }) => {
                        const upgrade = getNextUpgrade(event.upgradeType, context);

                        if (!upgrade) return context;

                        return {
                          ship: {
                            ...context.ship,
                            // @ts-expect-error ts can't infer exact type
                            [event.upgradeType]: upgrade[event.upgradeType],
                          },
                          balance: context.balance - upgrade.cost,
                        };
                      }),
                      {
                        type: "displayMessages",
                        params: ({ event }) => [`Upgrade ship's ${event.upgradeType} completed!`],
                      },
                    ],
                  },
                ],
                CANCEL: { target: "menu" },
              },
            },
          },
        },
        at_retirement: {
          on: {
            CANCEL: { target: "#idle" },
          },
        },
        at_bankruptcy: {
          on: {
            CANCEL: { target: "#idle" },
          },
        },
        viewing_inventory: {
          on: {
            CANCEL: { target: "#idle" },
          },
        },
        managing_fleet: {
          initial: "menu",
          states: {
            menu: {
              on: {
                GO_TO_GUARD_HALL_HIRE: [
                  {
                    guard: ({ context }) => context.guardFleet.ships >= MAX_GUARD_SHIPS,
                    actions: {
                      type: "displayMessages",
                      params: [`Your fleet is at maximum capacity (${MAX_GUARD_SHIPS} ships)`],
                    },
                  },
                  { target: "hireShips" },
                ],
                GO_TO_GUARD_HALL_UPGRADE: [
                  {
                    guard: ({ context }) => context.guardFleet.quality >= MAX_GUARD_QUALITY,
                    actions: {
                      type: "displayMessages",
                      params: ["Your fleet is already at maximum quality"],
                    },
                  },
                  {
                    guard: ({ context }) => context.guardFleet.ships === 0,
                    actions: {
                      type: "displayMessages",
                      params: ["You don't have any guard ships to upgrade"],
                    },
                  },
                  { target: "upgradeFleet" },
                ],
                GO_TO_GUARD_HALL_DISMISS: [
                  {
                    guard: ({ context }) => context.guardFleet.ships === 0,
                    actions: {
                      type: "displayMessages",
                      params: ["You don't have any guard ships to dismiss"],
                    },
                  },
                  { target: "dismissShips" },
                ],
                CANCEL: { target: "#idle" },
              },
            },
            hireShips: {
              on: {
                HIRE_PERMANENT_GUARDS: [
                  {
                    guard: ({ context }) => context.guardFleet.ships >= MAX_GUARD_SHIPS,
                    actions: {
                      type: "displayMessages",
                      params: [`Your fleet is at maximum capacity (${MAX_GUARD_SHIPS} ships)`],
                    },
                    target: "menu",
                  },
                  {
                    guard: ({ context, event }) => {
                      const totalShips = context.guardFleet.ships + event.amount;
                      return totalShips > MAX_GUARD_SHIPS;
                    },
                    actions: {
                      type: "displayMessages",
                      params: [`Cannot hire that many ships. Maximum fleet size is ${MAX_GUARD_SHIPS} ships`],
                    },
                  },
                  {
                    guard: ({ context, event }) => {
                      const cost = calculateGuardShipCost(context, event.amount);
                      return context.balance < cost;
                    },
                    actions: {
                      type: "displayMessages",
                      params: ({ context, event }) => {
                        const cost = calculateGuardShipCost(context, event.amount);
                        return [`Not enough money. Need $${cost} to hire ${event.amount} ships`];
                      },
                    },
                  },
                  {
                    actions: [
                      assign(({ context, event }) => {
                        const cost = calculateGuardShipCost(context, event.amount);
                        return {
                          guardFleet: {
                            ...context.guardFleet,
                            ships: context.guardFleet.ships + event.amount,
                            lastMaintenanceDay: context.day,
                          },
                          balance: context.balance - cost,
                          reputation: Math.min(100, context.reputation + event.amount),
                        };
                      }),
                      {
                        type: "displayMessages",
                        params: ({ event }) => [`Hired ${event.amount} permanent guard ships`],
                      },
                    ],
                    target: "#idle",
                  },
                ],
                CANCEL: { target: "menu" },
              },
            },
            upgradeFleet: {
              on: {
                UPGRADE_GUARDS: [
                  {
                    guard: ({ context }) => {
                      const cost = calculateFleetUpgradeCost(context);
                      return context.balance < cost;
                    },
                    actions: {
                      type: "displayMessages",
                      params: ({ context }) => {
                        const cost = calculateFleetUpgradeCost(context);
                        return [`Not enough money. Need $${cost} to upgrade fleet`];
                      },
                    },
                    target: "menu",
                  },
                  {
                    actions: [
                      assign(({ context }) => {
                        const cost = calculateFleetUpgradeCost(context);
                        return {
                          guardFleet: {
                            ...context.guardFleet,
                            quality: context.guardFleet.quality + 1,
                          },
                          balance: context.balance - cost,
                        };
                      }),
                      {
                        type: "displayMessages",
                        params: ({ context }) => [`Fleet upgraded to quality level ${context.guardFleet.quality}`],
                      },
                    ],
                    target: "#idle",
                  },
                ],
                CANCEL: { target: "menu" },
              },
            },
            dismissShips: {
              on: {
                DISMISS_GUARDS: {
                  actions: [
                    assign(({ context, event }) => ({
                      guardFleet: {
                        ...context.guardFleet,
                        ships: Math.max(0, context.guardFleet.ships - event.amount),
                      },
                      reputation: Math.max(0, context.reputation - event.amount * 2),
                    })),
                    {
                      type: "displayMessages",
                      params: ({ event }) => [`Dismissed ${event.amount} guard ships`],
                    },
                  ],
                  target: "#idle",
                },
                CANCEL: { target: "menu" },
              },
            },
          },
        },
        at_exit: {
          on: {
            CANCEL: { target: "#idle" },
          },
        },
      },
      on: {
        MSG_ACK: { actions: { type: "acknoledgeMessage" } },
        GO_TO_MARKET: [
          {
            guard: () => !stateIn({ gamescreen: "viewing_inventory" }) && !stateIn({ gamescreen: "idle" }),
            actions: {
              type: "displayMessages",
              params: ["You can't go to the market"],
            },
          },
          { target: "#market" },
        ],
        START_BUYING: [
          {
            guard: ({ context }) =>
              context.availableGoods.every(
                (good) =>
                  context.prices[context.currentPort][good] >
                  context.balance + (context.inOverdraft ? OVERDRAFT_TRADING_LIMIT : 0),
              ),
            actions: {
              type: "displayMessages",
              params: ["You don't have enough money to buy any goods."],
            },
          },
          { target: "#buying" },
        ],
        START_SELLING: [
          {
            guard: ({ context }) => [...context.ship.hold.values()].every((value) => value === 0),
            actions: {
              type: "displayMessages",
              params: ["You don't have any goods to sell."],
            },
          },
          { target: "#selling" },
        ],
        DECLARE_BANKRUPTCY: [
          {
            guard: ({ context }) => context.balance > 0,
            actions: { type: "displayMessages", params: ["You're not bankrupt!"] },
            target: "#idle",
          },
          { target: "scoringScreen" },
        ],
        RETIRE: [
          {
            guard: ({ context }) => !context.canRetire || !stateIn({ gamescreen: "at_retirement" }),
            actions: { type: "displayMessages", params: ["You haven't finished your voyage yet"] },
            target: "#idle",
          },
          { target: "scoringScreen" },
        ],
      },
      /**NOTE
       * Time-based opportunities:
       * - When an opportunity is accepted - every trip, reduce the trip duration from the `timeLimit` and if the result is <= 0
       * and the player has not fullfilled the opportunity, the opportunity is failed.
       */
      always: [
        // Check if the ship is in wreckage condition and the player does not have enough money to repair it, game over
        {
          guard: ({ context }) =>
            getShipStatus(context.ship.health) === "Wreckage" &&
            context.day < GOAL_DAYS &&
            getShipStatus(calculateRepairForCost(getNetCash(context), context) + context.ship.health) === "Wreckage",
          actions: {
            type: "displayMessages",
            params: [
              "Your ship is in wreckage condition and you don't have enough money to repair it.",
              "You've lost the game.",
            ],
          },
          target: "scoringScreen",
        },
        // Pay for fleet maintenance if the player has any guard ships and it's time to do so and the player is not in debt
        {
          guard: ({ context }) =>
            context.guardFleet.ships > 0 && context.day > context.guardFleet.lastMaintenanceDay && !context.inOverdraft,
          actions: [
            {
              type: "displayMessages",
              params: ({ context }) => {
                const daysPassed = context.day - context.guardFleet.lastMaintenanceDay;
                const dailyCost = calculateDailyMaintenanceCost(context);
                const totalCost = daysPassed * dailyCost;
                return [`Paid $${totalCost} for fleet maintenance`];
              },
            },
            assign(({ context }) => {
              const daysPassed = context.day - context.guardFleet.lastMaintenanceDay;
              const dailyCost = calculateDailyMaintenanceCost(context);
              const totalCost = daysPassed * dailyCost;

              return {
                balance: context.balance - totalCost,
                guardFleet: {
                  ...context.guardFleet,
                  lastMaintenanceDay: context.day,
                },
              };
            }),
          ],
        },
        // Check if the player is bankrupt
        {
          guard: ({ context }) => context.balance < BANKRUPTCY_THRESHOLD,
          actions: {
            type: "displayMessages",
            params: ["You have gone bankrupt! Your creditors have seized your assets."],
          },
          target: "scoringScreen",
        },
        // If the player is in overdraft and his debt is greater than -$1000, sell his fleet
        {
          guard: ({ context }) => context.balance < -OVERDRAFT_TRADING_LIMIT && context.guardFleet.ships > 0,
          actions: [
            assign(({ context }) => ({
              balance: context.balance + context.guardFleet.ships * BASE_GUARD_COST * 1.5,
              guardFleet: {
                ...context.guardFleet,
                ships: 0,
              },
              reputation: Math.max(0, context.reputation - 10),
            })),
            {
              type: "displayMessages",
              params: [
                "In a desperate attempt to pay your debts, you've sold your entire fleet.",
                "Your reputation has suffered significantly.",
              ],
            },
          ],
        },
        // Charge interest if the player is in overdraft
        {
          guard: ({ context }) => context.inOverdraft && context.day > context.lastOverdraftChargeDay,
          actions: [
            assign(({ context }) => ({
              // 3% daily interest or $25 per day, whichever is less
              balance: Math.max(
                Math.floor(
                  context.balance * Math.pow(1 + BASE_INTEREST_RATE, context.day - context.lastOverdraftChargeDay),
                ),
                context.balance - MAX_DAILY_OVERDRAFT,
              ),
              lastOverdraftChargeDay: context.day,
            })),
          ],
        },
        // Notify the player if they're in overdraft
        {
          guard: ({ context }) => context.balance < 0 && !context.inOverdraft,
          actions: [
            assign({ inOverdraft: true }),
            {
              type: "displayMessages",
              params: ({ context }) =>
                [
                  "You're in overdraft.",
                  "Interest will be charged at 3% per day.",
                  context.guardFleet.ships > 0
                    ? "Since you can't pay fleet maintenance fee, you fleet effectiveness is reduced."
                    : "",
                  `Be carefull your debt won't exceed -$${Math.abs(BANKRUPTCY_THRESHOLD)}, otherwise you'll go bankrupt!`,
                ].filter(Boolean),
            },
          ],
        },
        // Notify the player if they're no longer in overdraft
        {
          guard: ({ context }) => context.inOverdraft && context.balance >= 0,
          actions: [
            assign({ inOverdraft: false }),
            { type: "displayMessages", params: ["You're no longer in overdraft!"] },
          ],
        },
        // Ship is no longer overloaded
        {
          guard: ({ context }) => context.ship.isOverloaded && getStorageUsed(context.ship) <= context.ship.capacity,
          actions: assign(({ context }) => ({ ship: { ...context.ship, isOverloaded: false } })),
        },
        // Ship's hold is overloaded
        {
          guard: ({ context }) => !context.ship.isOverloaded && getStorageUsed(context.ship) > context.ship.capacity,
          actions: [
            assign(({ context }) => ({ ship: { ...context.ship, isOverloaded: true } })),
            {
              type: "displayMessages",
              params: [
                "Your ship is overloaded!",
                "This will reduce your ship's speed and increase its risk of damage.",
              ],
            },
          ],
        },
        // Set canRetire to true if the player has finished the game
        {
          guard: ({ context }) => !context.canRetire && context.day >= GOAL_DAYS,
          actions: assign({ canRetire: true }),
        },
        // Update prices if the next price update is due
        {
          guard: ({ context }) => context.nextPriceUpdate <= 0,
          actions: [
            { type: "displayMessages", params: ["Prices updated!"] },
            assign(({ context }) => ({
              prices: generatePrices(context.trends),
              nextPriceUpdate: PRICE_UPDATE_INTERVAL,
            })),
          ],
        },
        // Update trends if the next trend update is due
        {
          guard: ({ context }) => context.nextTrendUpdate <= 0,
          actions: [
            assign({
              trends: generateTrends(),
              nextTrendUpdate: TREND_UPDATE_INTERVAL,
            }),
          ],
        },
      ],
    },
    scoringScreen: {
      on: {
        RESTART_GAME: { target: "introScreen" },
      },
    },
    helpScreen: {
      on: {
        HIDE_HELP: { target: "introScreen" },
      },
    },
  },
});
