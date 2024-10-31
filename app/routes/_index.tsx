import type { MetaFunction } from "@remix-run/node";
import { ClientOnly } from 'remix-utils/client-only';
import { useMachine } from '@xstate/react';
import { useEffect } from "react";
import { goods, ports, tradeMachine } from "~/store";

export const meta: MetaFunction = () => {
  return [
    { title: "Sea Trader" },
    { name: "description", content: "Trading game built with XState" },
  ];
};

export default function Index() {
  const [state, sendOrder] = useMachine(tradeMachine);
  const context = state.context;
  const balanceDisplay = state.context.balance >= 0 ? `$${context.balance}` : `-$${Math.abs(context.balance)}`;
  useEffect(() => {
    sendOrder({ type: 'game.start' });
  }, []);

  return <ClientOnly>{() => 
    <div className="flex flex-col h-full min-h-screen p-8 items-center justify-center gap-4 bg-slate-800 text-slate-100">
      <h1 className="text-3xl font-semibold tracking-wide">Day #{context.day}</h1>
      <span className="text-xl">Balance: <strong className={["tabular-nums", context.balance >= 0 ? "text-yellow-400" : "text-red-500"].join(' ')}>{balanceDisplay}</strong></span>
      <span className="">Ship Health: <strong className={["tabular-nums", context.damage < 30 ? "text-green-500" : context.damage < 60 ? "text-orange-400" : "text-red-400"].filter(Boolean).join(' ')}>{100 - context.damage}</strong></span>
      <hr className="my-3 border-0 h-px bg-gray-400 w-9/12" />
      <table className="table-fixed w-9/12 mx-auto">
        <thead>
          <tr className="border-b border-gray-600">
            <th className="text-left pb-2 w-44"></th>
            {goods.map((good) => (
              <th className="text-center pb-2" key={good}>{good[0].toUpperCase()}{good.slice(1)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ports.map(port => (
            <tr key={port} className="hover:bg-gray-900 cursor-crosshair">
              <td className="py-2.5 hover:text-yellow-400 text-left">{port}</td>
              {Object.entries(context.prices[port]).map(([, value]) => <td className="py-2.5 hover:text-yellow-400 text-center tabular-nums">${value}</td>)}
            </tr>
          ))}
          <tr className="border-t border-gray-400 text-lg">
            <td className="pt-4 text-left">Time to next update</td>
            <td colSpan={2}></td>
            <td className="pt-4 text-center text-lg">{context.nextPriceChange} days</td>
          </tr>
        </tbody>
      </table>
      <div className="mt-9 w-9/12 flex items-center justify-between">
        <div className="flex flex-col justify-between items-start gap-9">
          <div>
            <h2 className="text-xl">{context.changes?.destination ? `Traveling to ${context.changes?.destination}..` : 'Travel'}</h2>
            <div className="mt-3 flex gap-3">
              {ports.map(port => (
                <button
                  key={port}
                  className={["text-lg border border-gray-600 py-1 px-5 rounded-md", port === state.context.port ? "bg-white text-black" : "hover:bg-white/10"].join(' ')}
                  onClick={() => sendOrder({ type: 'travel', to: port })}>{port}</button>
              ))}
            </div>
            <div className={["mt-7 flex gap-2 items-center border-t py-3 px-1", context.event ? "" : "invisible"].join(' ')}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
              <p className="">{context.event}</p>
              <button className="ml-auto bg-white text-black w-16 py-1 rounded-md hover:bg-gray-300" onClick={() => sendOrder({ type: 'event.resolve' })}>
                <span className="text-sm">OK</span>
              </button>
            </div>
          </div>
          <button 
            className="bg-white hover:bg-gray-200 text-black px-4 py-2 rounded-md disabled:bg-gray-400" 
            onClick={() => sendOrder({ type: 'repair', cost: context.damage * 10 })}
            disabled={context.damage === 0 || context.damage * 10 > context.balance}
            aria-disabled={context.damage === 0 ? 'true' : 'false'}>Repair Ship (${context.damage * 10})</button>
        </div>
        <div className="flex gap-3">
          {goods.map(good => (
            <div className="flex flex-col gap-5 items-center" key={good}>
              <div className="w-24 h-24 border border-gray-400 rounded-lg flex flex-col justify-center items-center gap-1">
                <strong className="text-lg tabular-nums">{context.inventory[good]}</strong>
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
      </div>
    </div>
  }</ClientOnly>;
}
