import React from "react";
import { createActorContext } from "@xstate/react";
import { shipyardMachine } from "../../store/ui/shipyard.js";

export const ShipyardContext = createActorContext(shipyardMachine);
