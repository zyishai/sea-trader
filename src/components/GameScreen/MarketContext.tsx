import React from "react";
import { createActorContext } from "@xstate/react";
import { marketMachine } from "../../store/ui/market.js";

export const MarketContext = createActorContext(marketMachine);
