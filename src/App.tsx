import React from "react";
import { Text } from "ink";

export const App: React.FC<{ name?: string }> = ({ name = "Guest" }) => {
  return (
    <Text>
      Hello, <Text color="green">{name}</Text>
    </Text>
  );
};
