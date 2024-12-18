import React, { useState, useEffect } from "react";
import { Text, type TextProps, useInput } from "ink";
import { GameContext } from "../GameContext.js";

export function Typed({
  text,
  enabled = true,
  children,
  ...props
}: React.PropsWithChildren<{ text: string; enabled?: boolean } & TextProps>) {
  const settings = GameContext.useSelector((snapshot) => snapshot.context.settings);
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const shouldAnimate = !settings.disableAnimations && enabled;

  useEffect(() => {
    const id = setTimeout(() => {
      if (shouldAnimate && current < text.length) {
        setCurrent(current + 1);
      } else {
        clearTimeout(id);
        setFinished(true);
      }
    }, 50);

    return () => clearTimeout(id);
  }, [text, shouldAnimate, current]);

  useInput(
    (input) => {
      if (input === " ") {
        setCurrent(text.length);
      }
    },
    {
      isActive: shouldAnimate && current < text.length,
    },
  );

  return (
    <>
      <Text {...props}>{shouldAnimate ? text.slice(0, current) : text}</Text>
      {shouldAnimate ? (finished ? children : null) : children}
    </>
  );
}
