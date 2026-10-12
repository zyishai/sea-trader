import React from "react";
import { createActorContext } from "@xstate/react";
import { shipyardMachine } from "../flows/shipyard.js";

export const ShipyardContext = createActorContext(shipyardMachine);
