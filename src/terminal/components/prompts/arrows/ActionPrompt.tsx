import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import Select from "ink-select-input";

export interface Action {
  label: string;
  value: string;
  disabled?: boolean;
  unavailableReason?: string;
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
  const items = actions
    .filter((action) => !action.disabled)
    .map(({ label, value, unavailableReason }) => ({
      key: value,
      label: unavailableReason ? `${label}: ${unavailableReason}` : label,
      value,
    }));
  const reasonFor = (value: string) => actions.find((action) => action.value === value)?.unavailableReason;

  useInput((_, key) => {
    if (key.escape && onCancel) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text>{message}</Text>
      <Select
        items={items}
        onSelect={(item) => {
          const reason = reasonFor(item.value);
          if (reason) {
            setError(`We can't do that: ${reason}.`);
            return;
          }
          onSelect(item.value);
        }}
        itemComponent={({ label }) =>
          items.find((item) => item.label === label && reasonFor(item.value)) ? (
            <Text dimColor>{label}</Text>
          ) : (
            <Text color="whiteBright">{label}</Text>
          )
        }
      />
      {error && <Text color="red">{error}</Text>}
      {onCancel && <Text dimColor>{backMessage ?? "Press [Esc] to go back"}</Text>}
    </Box>
  );
}
