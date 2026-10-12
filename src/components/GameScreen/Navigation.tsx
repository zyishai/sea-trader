import React, { createContext, useContext, useState } from "react";

export type PortScreen = "menu" | "port" | "market" | "shipyard";

type Navigation = {
  screen: PortScreen;
  navigate: (screen: PortScreen) => void;
  noticesSeen: number;
  markNoticeSeen: () => void;
};

const NavigationContext = createContext<Navigation>({
  screen: "menu",
  navigate: () => {},
  noticesSeen: 0,
  markNoticeSeen: () => {},
});

export function NavigationProvider({ children }: React.PropsWithChildren) {
  const [screen, navigate] = useState<PortScreen>("menu");
  const [noticesSeen, setNoticesSeen] = useState(0);
  const markNoticeSeen = () => setNoticesSeen((seen) => seen + 1);
  return (
    <NavigationContext.Provider value={{ screen, navigate, noticesSeen, markNoticeSeen }}>
      {children}
    </NavigationContext.Provider>
  );
}

export const useNavigation = () => useContext(NavigationContext);
