import React, { useContext, useEffect, useState } from "react";
import { v4 as randomId } from "uuid";
import { GameContext } from "./GameContext.js";
import { MessageSpec } from "../store/store.js";

export interface Message {
  id: string;
  text: string;
}
interface MessagesContextProps {
  messages: Message[];
}
// @ts-expect-error no default value
const MessagesContext = React.createContext<MessagesContextProps>();
export function MessagesProvider({ children }: React.PropsWithChildren) {
  const actor = GameContext.useActorRef();
  const [messages, setMessages] = useState<Message[]>([]);
  function run(specs: MessageSpec[]) {
    const message = specs.shift(); // Modifies the `messages` array!
    if (message) {
      if ("message" in message) {
        setMessages((msgs) => [...msgs, { id: randomId(), text: message.message }]);
        run(specs);
      } else if ("delay" in message) {
        setTimeout(() => run(specs), message.delay);
      } else if ("command" in message) {
        switch (message.command) {
          case "clear": {
            setMessages([]);
            break;
          }
          case "ack": {
            actor.send({ type: "MSG_ACK" });
            break;
          }
        }
        run(specs);
      }
    }
  }

  // Event: "messages"
  useEffect(() => {
    const subscription = actor.on("messages", (event) => {
      run(event.messages);
    });

    return subscription.unsubscribe;
  }, []);

  return <MessagesContext.Provider value={{ messages }}>{children}</MessagesContext.Provider>;
}

export const useMessages = () => {
  const context = useContext(MessagesContext);

  if (!context) {
    throw new Error("useMessages can be used only within MessagesContext");
  }

  return context;
};
