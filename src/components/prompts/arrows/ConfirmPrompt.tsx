import React from "react";
import { Box, Text } from "ink";
import Select from "ink-select-input";

interface ConfirmPromptProps {
  message: string;
  detail?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmPrompt({ message, detail, onConfirm, onCancel }: ConfirmPromptProps) {
  const actions = [
    { label: "Confirm", value: "confirm" },
    { label: "Cancel", value: "cancel" },
  ];

  const handleSelect = (value: string) => {
    if (value === "confirm") {
      onConfirm();
    } else {
      onCancel();
    }
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Text>{message}</Text>
      {detail && <Text dimColor>{detail}</Text>}
      <Select items={actions} onSelect={(item) => handleSelect(item.value)} />
    </Box>
  );
}
