import React from "react";
import { createActorContext } from "@xstate/react";
import { marketMachine } from "../flows/market.js";

export const MarketContext = createActorContext(marketMachine);
