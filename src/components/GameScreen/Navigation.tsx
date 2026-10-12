import React, { createContext, useContext, useState } from "react";

export type PortScreen = "menu" | "port" | "market" | "shipyard";

const NavigationContext = createContext<{ screen: PortScreen; navigate: (screen: PortScreen) => void }>({
  screen: "menu",
  navigate: () => {},
});

export function NavigationProvider({ children }: React.PropsWithChildren) {
  const [screen, navigate] = useState<PortScreen>("menu");
  return <NavigationContext.Provider value={{ screen, navigate }}>{children}</NavigationContext.Provider>;
}

export const useNavigation = () => useContext(NavigationContext);
