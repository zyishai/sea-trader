import React from "react";
import { Box, Text, useInput } from "ink";
import Select from "ink-select-input";

export interface Action {
  label: string;
  value: string;
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
  useInput((_, key) => {
    if (key.escape && onCancel) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text>{message}</Text>
      <Select
        items={actions.filter((action) => !action.disabled)}
        onSelect={(item) => onSelect(item.value)}
        itemComponent={({ label }) => <Text color="whiteBright">{label}</Text>}
      />
      {onCancel && <Text dimColor>{backMessage ?? "Press [Esc] to go back"}</Text>}
    </Box>
  );
}
