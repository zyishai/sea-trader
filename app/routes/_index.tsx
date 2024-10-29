import type { MetaFunction } from "@remix-run/node";
import { ClientOnly } from 'remix-utils/client-only';
import { useMachine } from '@xstate/react';
import { useEffect } from "react";
import { ports, tradeMachine } from "~/store";

export const meta: MetaFunction = () => {
  return [
    { title: "Sea Trader" },
    { name: "description", content: "Trading game built with XState" },
  ];
};

export default function Index() {
  const [state, sendOrder] = useMachine(tradeMachine);
  useEffect(() => {
    sendOrder({ type: 'game.start' });
  }, []);

  return <ClientOnly>{() => (
    <div className="flex flex-col h-screen items-center justify-center gap-4 dark:bg-black">
      <h1 className="text-lg font-semibold tracking-wide">Day #{state.context.day}</h1>
      <p>{state.context.port}</p>
      <p>Next Price Update in {state.context.nextPriceChange} days.</p>
      <hr className="my-3 border-0 h-px bg-gray-400 w-9/12" />
      <span className="text-xl">Balance: <strong className="tabular-nums">${state.context.balance}</strong></span>
      <div className="flex gap-3">
        {(['copper', 'wheat', 'olive'] as const).map(good => (
          <div className="flex flex-col gap-5 items-center" key={good}>
            <div className="w-24 h-24 border border-gray-400 rounded-lg flex flex-col justify-center items-center gap-1">
              <strong className="text-lg tabular-nums">{state.context.inventory[good]}</strong>
              <p>{good}</p>
            </div>
            <button 
              className="bg-white text-black w-full rounded-md py-1.5 hover:bg-gray-200"
              onClick={() => sendOrder({ type: 'buy', good, quantity: 1 })}>Buy</button>
            <button 
              className="bg-white text-black w-full rounded-md py-1.5 hover:bg-gray-200"
              onClick={() => sendOrder({ type: 'sell', good, quantity: 1 })}>Sell</button>
          </div>
        ))}
      </div>
      <hr className="my-3 border-0 h-px bg-gray-400 w-9/12" />
      <table>
        <thead>
          <tr>
            <th>Country</th>
            <th>Copper</th>
            <th>Wheat</th>
            <th>Olive</th>
          </tr>
        </thead>
        <tbody>
          {ports.map(port => (
            <tr key={port}>
              <td>{port}</td>
              <td className="tabular-nums">${state.context.prices[port].copper}</td>
              <td className="tabular-nums">${state.context.prices[port].wheat}</td>
              <td className="tabular-nums">${state.context.prices[port].olive}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-3">
        {ports.filter(port => port !== state.context.port).map(port => (
          <button key={port} onClick={() => sendOrder({ type: 'travel', to: port })}>{port}</button>
        ))}
      </div>
      {state.context.event ? <div className="mt-3 mx-auto w-7/12 flex justify-between items-center border border-gray-500 p-3 rounded-xl">
        <p>EVENT: {state.context.event}</p>
        <button
          className="bg-white hover:bg-gray-300 text-black w-14 py-1 rounded-md"
          onClick={() => sendOrder({ type: 'event.resolve' })}>OK</button>
      </div> : null}
    </div>
  )}</ClientOnly>;
}
