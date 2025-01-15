import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

export interface Action {
  label: string;
  value: string;
  key: string;
  disabled?: boolean;
}

interface ActionPromptProps {
  message: string;
  actions: Action[];
  onSelect: (value: string) => void;
  onCancel?: () => void;
  backMessage?: string;
}

export function ActionPrompt({ message, actions, onSelect, onCancel, backMessage }: ActionPromptProps) {
  const [error, setError] = useState<string>();

  useInput((input, key) => {
    if (key.escape) {
      onCancel?.();
      return;
    }

    const action = actions.find((a) => a.key.toLowerCase() === input.toLowerCase());
    if (action) {
      if (action.disabled) {
        setError(`This action is not available`);
        return;
      }
      onSelect(action.value);
    } else {
      setError(
        `Invalid key. Available keys: ${actions
          .filter((a) => !a.disabled)
          .map((a) => a.key)
          .join(", ")}`,
      );
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text>{message}</Text>
      <Box flexDirection="column">
        {actions
          .filter((action) => !action.disabled)
          .map(({ label, key }) => (
            <Text key={key} color="whiteBright">
              [{key}] {label}
            </Text>
          ))}
      </Box>
      {error && <Text color="red">{error}</Text>}
      {onCancel && <Text dimColor>{backMessage ?? "Press [Esc] to go back"}</Text>}
    </Box>
  );
}
