import React from "react";
import { Text } from "ink";
import figlet from "figlet";
import { useScreenSize } from "../../hooks/use-screen-size.js";
import { FULL_TITLE_MIN_HEIGHT } from "../layout.js";

export function ViewTitle({ text }: { text: string }) {
  const { height } = useScreenSize();

  return height >= FULL_TITLE_MIN_HEIGHT ? (
    <Text>{figlet.textSync(text)}</Text>
  ) : (
    <Text bold underline>
      {text.toUpperCase()}
    </Text>
  );
}
