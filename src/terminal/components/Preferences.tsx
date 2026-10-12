import React, { createContext, useContext, useState } from "react";

export type Preferences = {
  controls: "keyboard" | "arrows";
  disableAnimations: boolean;
};

const PreferencesContext = createContext<Preferences & { setPreferences: (preferences: Preferences) => void }>({
  controls: "keyboard",
  disableAnimations: true,
  setPreferences: () => {},
});

export function PreferencesProvider({ children }: React.PropsWithChildren) {
  const [preferences, setPreferences] = useState<Preferences>({ controls: "keyboard", disableAnimations: true });
  return (
    <PreferencesContext.Provider value={{ ...preferences, setPreferences }}>{children}</PreferencesContext.Provider>
  );
}

export const usePreferences = () => useContext(PreferencesContext);
