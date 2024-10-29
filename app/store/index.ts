import { assign, enqueueActions, setup } from "xstate";

// ===== Types and Constants =====
type Context = {
  port: Port;
  destination?: Port;
  balance: number;
  inventory: Record<Goods, number>;
  prices: Record<Port, Record<Goods, number>>;
  day: number;
  nextPriceChange: number;
  event?: Event;
};
type Goods = 'copper'|'wheat'|'olive';
export const ports = ['israel', 'turkey', 'egypt', 'italy', 'india'] as const;
type Port = typeof ports[number];
const PRICE_CHANGE_INTERVAL_IN_DAYS = 7;
const events = [
  ["A storm has delayed your journey!", false],
  ["You've found a shortcut, saving time!", false],
  ["Pirates attacked, but you fended them off!", false],
  ["Calm seas make for smooth sailing.", false],
  ["You've discovered a small island with rare goods!", true],
  ["A trade festival is happening, affecting prices!", true],
  ["Political tensions are rising, impacting the market!", true],
] as const;
type Event = typeof events[number][0];

// ===== Utility Functions =====
const generatePrices = () => {
  return ports.reduce((map, port) => ({
    ...map,
    [port]: {
      copper: Math.floor(Math.random() * 50) + 10,
      olive: Math.floor(Math.random() * 50) + 10,
      wheat: Math.floor(Math.random() * 50) + 10
    } 
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
const pickRandomEvent = () => {
  return events[Math.floor(Math.random() * events.length)];
};

// ===== Defaults =====
const initialContext: () => Context = () => ({
  port: 'israel',
  prices: generatePrices(),
  balance: 1000,
  inventory: { copper: 0, wheat: 0, olive: 0 },
  day: 1,
  nextPriceChange: PRICE_CHANGE_INTERVAL_IN_DAYS
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

    travelTo: assign((_, params: { destination: Port }) => ({ port: params.destination })),

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
    shouldEndGame: ({ context }) => context.day >= 100
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
          on: {
            travel: [
              {
                target: 'eventOccurred',
                actions: [assign(({ event }) => ({ destination: event.to }))]
              },
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
          },
        },
        eventOccurred: {
          entry: [
            enqueueActions(({ enqueue }) => {
              const [event, affectsPrice] = pickRandomEvent();
              enqueue.assign({ event });

              if (affectsPrice) {
                enqueue({ type: 'updatePrices' });
              }
            })
          ],
          on: {
            'event.resolve': [
              {
                guard: ({ context }) => !!context.destination,
                target: 'traveling'
              },
              {
                target: 'idle'
              }
            ]
          },
          exit: assign({ event: undefined })
        },
        traveling: {
          entry: [
            { 
              type: 'advanceDay', 
              params: ({ context }) => {
                const travelTime = calculateStandardTravelTime(context.port)(context.destination!);
                return { days: travelTime };
              }
            },
            { type: 'travelTo', params: ({ context }) => ({ destination: context.destination!}) }
          ],
          after: {
            0: { target: 'idle' }
          },
          exit: assign({ destination: undefined })
        }
      },
      always: [
        { guard: 'shouldEndGame', target: 'gameOver' },
        { guard: 'shouldUpdatePrices', actions: [{ type: 'updatePrices' }, { type: 'resetPriceInterval' }] }
      ]
    },
    gameOver: {}
  }
});
