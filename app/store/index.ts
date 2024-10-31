import { assign, enqueueActions, setup } from "xstate";

// ===== Types and Constants =====
type Context = {
  port: Port;
  balance: number;
  inventory: Record<Goods, number>;
  prices: Record<Port, Record<Goods, number>>;
  day: number;
  nextPriceChange: number;
  event?: Event['message'];
  damage: number;
  changes?: {
    destination?: Port;
    balance?: number;
    damage?: number;
    days?: number;
    inventory?: Partial<Record<Goods, number>>;
    prices?: Partial<Record<Port, Record<Goods, number>>>;
    autoUpdatePrices?: boolean;
  }
};
export const goods = ['copper', 'wheat', 'olive', 'silk', 'tea'] as const;
type Goods = 'copper'|'wheat'|'olive'|'silk'|'tea';
export const ports = ['israel', 'turkey', 'egypt', 'italy', 'india'] as const;
type Port = typeof ports[number];
const PRICE_CHANGE_INTERVAL_IN_DAYS = 7;
const events: Event[] = [
  {
    message: "A storm has damaged your ship!",
    effect: (_, changes) => ({ ...changes, damage: (changes?.damage ?? 0) + 20 })
  },
  {
    message: "You've found a shortcut, saving time!",
    effect: (_, changes) => ({ ...changes, days: Math.max(0, changes?.days ? changes.days - 1 : 0) })
  },
  {
    message: "Pirates attacked, but you fended them off!",
    effect: (_, changes) => ({ ...changes, damage: (changes?.damage ?? 0) + 10, balance: (changes?.balance ?? 0) - 100 })
  },
  {
    message: "Calm seas make for smooth sailing.",
    effect: (_, changes) => changes
  },
  {
    message: "You've discovered a small island with rare goods!",
    effect: (_, changes) => {
      const newInventory = { ...changes?.inventory };
      const randomGood = goods[Math.floor(Math.random() * goods.length)];
      newInventory[randomGood] = (newInventory[randomGood] || 0) + 10;

      return { ...changes, inventory: { ...changes?.inventory, ...newInventory } };
    }
  },
  {
    message: "A local festival in India boosts silks prices!",
    effect: (_, changes) => changes,
    affectsPrices: (prices) => ({ ...prices, india: { ...prices.india, silk: Math.round(prices.india.silk * 1.5) } }),
    availablePorts: ['india']
  },
  {
    message: "You attend a ceremony in India, gaining valuable contacts.",
    effect: (_, changes) => ({ ...changes, balance: (changes?.balance ?? 0) + 200 }),
    availablePorts: ['india']
  },
  {
    message: "Turkey dock workers are on strike, delaying your departure.",
    effect: (_, changes) => ({ ...changes, days: (changes?.days ?? 0) + 1 }),
    availablePorts: ['turkey']
  },
  {
    message: "You discover a hidden market in Turkey with discounted Copper.",
    effect: (_, changes) => changes,
    affectsPrices: (prices) => ({ ...prices, turkey: { ...prices.turkey, copper: Math.round(prices.turkey.copper * 0.7) } }),
    availablePorts: ['turkey']
  },
  {
    message: "A generous Israeli merchant offers to repair your ship at a discount",
    effect: (_, changes) => ({ ...changes, damage: (changes?.damage ?? 0) - 30 }),
    availablePorts: ['israel']
  },
  {
    message: "You learn of a secret tea plantation near Israel.",
    effect: (_, changes) => ({ ...changes, inventory: { ...changes?.inventory, tea: (changes?.inventory?.tea ?? 0) + 20 } }),
    availablePorts: ['israel']
  },
  {
    message: "A sudden demand for Wheat in Italy drives up prices!",
    effect: (_, changes) => changes,
    affectsPrices: (prices) => ({ ...prices, italy: { ...prices.italy, wheat: Math.round(prices.italy.wheat * 1.8) } }),
    availablePorts: ['italy']
  },
  {
    message: "You win a small lottery in Italy!",
    effect: (_, changes) => ({ ...changes, balance: (changes?.balance ?? 0) + 500 }),
    availablePorts: ['italy']
  },
  {
    message: "A typhoon in Egypt damages your ship but brings rare goods.",
    effect: (_, changes) => ({
      ...changes,
      damage: (changes?.damage ?? 0) - 15,
      inventory: {
        ...changes?.inventory,
        copper: (changes?.inventory?.copper ?? 0) + 15,
        silk: (changes?.inventory?.silk ?? 0) + 15,
        tea: (changes?.inventory?.tea ?? 0) + 15,
      }
    }),
    availablePorts: ['egypt']
  },
  {
    message: "You stumble upon a clearance sale in Egypt's markets.",
    effect: (_, changes) => changes,
    affectsPrices: (prices) => ({
      ...prices,
      egypt: Object.fromEntries(
        Object.entries(prices.egypt).map(([good, price]) => [good, Math.floor(price * 0.8)])
      ) as Record<Goods, number>
    }),
    availablePorts: ['egypt']
  },
] as const;
type Event = {
  message: string;
  effect: (context: Context, changes: Context['changes']) => Context['changes'];
  affectsPrices?: boolean | ((prices: Record<Port, Record<Goods, number>>) => Record<Port, Record<Goods, number>>);
  availablePorts?: Port[];
};

// ===== Utility Functions =====
const generatePrices = () => {
  return ports.reduce((map, port) => ({
    ...map,
    [port]: {
      copper: Math.floor(Math.random() * 50) + 10,
      olive: Math.floor(Math.random() * 50) + 10,
      wheat: Math.floor(Math.random() * 50) + 10,
      silk: Math.floor(Math.random() * 50) + 10,
      tea: Math.floor(Math.random() * 50) + 10,
    } satisfies Record<Goods, number>
  }), {} as Record<Port, Record<Goods, number>>);
};
const calculateStandardTravelTime = (from: Port) => (to: Port) => ({
  israel: {
    turkey: 2,
    egypt: 1,
    italy: 3,
    india: 3,
  },
  turkey: {
    israel: 2,
    egypt: 3,
    italy: 1,
    india: 3
  },
  egypt: {
    israel: 1,
    turkey: 3,
    italy: 3,
    india: 1
  },
  italy: {
    israel: 3,
    turkey: 1,
    egypt: 3,
    india: 4
  },
  india: {
    israel: 3,
    turkey: 3,
    egypt: 1,
    italy: 4
  }
} as Record<Port, Record<Port, number>>)[from][to];
const pickRandomEvent = (port: Port) => {
  let eventsPool = events;
  if (shouldPickLocationSpecificEvent()) {
    eventsPool = events.filter(evt => evt.availablePorts && evt.availablePorts.includes(port));
  } else {
    eventsPool = events.filter(evt => !evt.availablePorts || evt.availablePorts.length === 0);
  }
  return eventsPool[Math.floor(Math.random() * eventsPool.length)];
};
const shouldPickLocationSpecificEvent = () => Math.random() < 0.6;
const mergePricesChanges = (prices: Record<Port, Record<Goods, number>>, changes: Partial<Record<Port, Record<Goods, number>>>) => {
  const newPrices = {} as typeof prices;

  for (const [port, localPrices] of Object.entries(prices)) {
    newPrices[port as Port] = { ...localPrices, ...changes[port as Port] };
  }

  return newPrices;
}
const mergeInventoryChanges = (inventory: Record<Goods, number>, changes: Partial<Record<Goods, number>>) => {
  const newInventory = { ...inventory };

  for (const [goods, quantity] of Object.entries(newInventory)) {
    newInventory[goods as Goods] = quantity + (changes[goods as Goods] ?? 0);
  }

  return newInventory;
}

// ===== Defaults =====
const initialContext: () => Context = () => ({
  port: 'israel',
  prices: generatePrices(),
  balance: 1000,
  inventory: { copper: 0, wheat: 0, olive: 0, silk: 0, tea: 0 },
  day: 1,
  nextPriceChange: PRICE_CHANGE_INTERVAL_IN_DAYS,
  damage: 0
});

// ===== State Machine =====
export const tradeMachine = setup({
  types: {
    context: {} as Context,
    events: {} as
      | { type: 'game.start' }
      | { type: 'travel', to: Port }
      | { type: 'buy', good: Goods, quantity: number }
      | { type: 'sell', good: Goods, quantity: number }
      | { type: 'event.resolve' }
      | { type: 'repair', cost: number }
  },
  actions: {
    resetContext: assign(initialContext),

    updatePrices: enqueueActions(({ enqueue }) => enqueue.assign({ prices: generatePrices() })),

    resetPriceInterval: assign({ nextPriceChange: PRICE_CHANGE_INTERVAL_IN_DAYS }),

    advanceDay: assign(({ context }, params: { days: number }) => ({ 
      day: context.day + params.days, 
      nextPriceChange: Math.max(0, context.nextPriceChange - params.days),
      balance: context.balance < 0 ? context.balance * Math.pow(1.05, params.days) : context.balance // If balance is negative, accrue 5% daily interest
    })),

    moveTo: assign((_, params: { destination: Port }) => ({ port: params.destination })),

    purchase: assign(({ context }, params: { good: Goods, quantity: number }) => ({
      balance: context.balance - context.prices[context.port][params.good] * params.quantity,
      inventory: {
        ...context.inventory,
        [params.good]: context.inventory[params.good] + params.quantity
      }
    })),

    sell: assign(({ context }, params: { good: Goods, quantity: number }) => ({
      balance: context.balance + context.prices[context.port][params.good] * params.quantity,
      inventory: {
        ...context.inventory,
        [params.good]: context.inventory[params.good] - params.quantity
      }
    })),

    repairDamage: assign(({ context }, { cost }: { cost: number }) => ({
      damage: 0,
      balance: context.balance - cost
    })),

    applyPendingChanges: enqueueActions(({ enqueue, context }) => {
      const changes = context.changes;

      if (changes?.damage) {
        enqueue.assign({ damage: Math.min(100, Math.max(0, context.damage + changes.damage)) });
      }
      if (changes?.balance) {
        enqueue.assign({ balance: context.balance + changes.balance });
      }
      if (changes?.inventory) {
        enqueue.assign({ inventory: mergeInventoryChanges(context.inventory, changes.inventory) });
      }
      if (changes?.prices) {
        enqueue.assign({ prices: mergePricesChanges(context.prices, changes.prices) });
      }
      if (changes?.autoUpdatePrices) {
        enqueue({ type: 'updatePrices' } as any);
      }
      if (changes?.destination) {
        enqueue({ type: 'advanceDay', params: { days: changes?.days ?? 0 } } as any);
        enqueue({ type: 'moveTo', params: { destination: changes.destination } } as any);
      }
    }),
  },
  guards: {
    shouldUpdatePrices: ({ context }) => context.nextPriceChange <= 0,

    canBuy: ({ context }, params: { good: Goods; quantity: number }) => {
      const portPrices = context.prices[context.port];
      const price = portPrices[params.good] * params.quantity;
      return price <= context.balance;
    },
    
    canSell: ({ context }, params: { good: Goods; quantity: number }) => {
      return params.quantity <= context.inventory[params.good];
    },

    canRepairShip: ({ context }, { cost }: { cost: number }) => context.balance >= cost,
    
    shouldEndGame: ({ context }) => context.day >= 100 || context.damage >= 100
  },
}).createMachine({
  context: initialContext,
  initial: 'introScreen',
  states: {
    introScreen: {
      entry: ['resetContext'],
      on: {
        'game.start': { target: 'gameStarted' },
      }
    },
    gameStarted: {
      initial: 'idle',
      states: {
        idle: {
          entry: assign({ changes: undefined }),
          on: {
            travel: [
              {
                guard: () => Math.random() < 0.3,
                target: 'eventOccurred',
                actions: [
                  assign(({ context, event }) => ({ changes: {...context.changes, destination: event.to} })),
                  assign(({ context, event }) => {
                    const travelTime = calculateStandardTravelTime(context.port)(event.to);
                    const damage = travelTime * 2;

                    return {
                      changes: {
                        ...context.changes,
                        damage,
                        days: travelTime
                      }
                    }
                  })
                ]
              },
              {
                actions: [
                  { type: 'advanceDay', params: ({ context, event }) => ({ days: calculateStandardTravelTime(context.port)(event.to) })},
                  assign(({ context, event }) => ({ damage: context.damage + calculateStandardTravelTime(context.port)(event.to) * 2 })),
                  { type: 'moveTo', params: ({ event }) => ({ destination: event.to }) }
                ]
              }
            ],
            buy: [
              {
                guard: { type: 'canBuy', params: ({ event }) => ({ good: event.good, quantity: event.quantity }) },
                actions: [
                  { type: 'purchase', params: ({ event }) => ({ good: event.good, quantity: event.quantity }) },
                  { type: 'advanceDay', params: { days: 1 } }
                ]
              }
            ],
            sell: [
              {
                guard: { type: 'canSell', params: ({ event }) => ({ good: event.good, quantity: event.quantity }) },
                actions: [
                  { type: 'sell', params: ({ event }) => ({ good: event.good, quantity: event.quantity }) },
                  { type: 'advanceDay', params: { days: 1 } }
                ]
              }
            ],
            repair: [
              {
                guard: { type: 'canRepairShip', params: ({ event }) => ({ cost: event.cost }) },
                actions: [
                  { type: 'repairDamage', params: ({ event }) => ({ cost: event.cost }) }
                ]
              }
            ]
          },
        },
        eventOccurred: {
          entry: [
            enqueueActions(({ enqueue, context }) => {
              const { message, effect, affectsPrices } = pickRandomEvent(context.changes?.destination ?? context.port);

              enqueue.assign(({ context }) => ({ event: message, changes: effect(context, context.changes) }));
              
              if (affectsPrices) {
                if (typeof affectsPrices === 'function') {
                  enqueue.assign(({ context }) => ({ changes: { ...context.changes, prices: affectsPrices(context.prices) } }));
                } else {
                  enqueue.assign(({ context }) => ({ changes: { ...context.changes, autoUpdatePrices: true } }));
                }
              }
            })
          ],
          on: {
            'event.resolve': [
              {
                actions: [{ type: 'applyPendingChanges' }],
                target: 'idle'
              }
            ]
          },
          exit: assign({ event: undefined })
        },
      },
      always: [
        { guard: 'shouldEndGame', target: 'gameOver' },
        { guard: 'shouldUpdatePrices', actions: [{ type: 'updatePrices' }, { type: 'resetPriceInterval' }] }
      ]
    },
    gameOver: {}
  }
});
