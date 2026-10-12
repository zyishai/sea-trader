import { createActorContext } from "@xstate/react";
import React from "react";
import { navigationMachine, PortScreen } from "../flows/navigation.js";

const NavigationContext = createActorContext(navigationMachine);

export function NavigationProvider({ children }: React.PropsWithChildren) {
  return <NavigationContext.Provider>{children}</NavigationContext.Provider>;
}

export const useNavigation = () => {
  const navigation = NavigationContext.useActorRef();
  const screen = NavigationContext.useSelector((snapshot) => snapshot.value);
  const { noticesSeen, visit } = NavigationContext.useSelector((snapshot) => snapshot.context);

  return {
    screen,
    visit,
    noticesSeen,
    navigate: (to: PortScreen) => navigation.send(to === "menu" ? { type: "BACK" } : { type: "OPEN", screen: to }),
    markNoticeSeen: () => navigation.send({ type: "NOTICE_SEEN" }),
  };
};
