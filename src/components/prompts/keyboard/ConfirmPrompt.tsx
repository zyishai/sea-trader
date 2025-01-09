import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

interface ConfirmPromptProps {
  message: string;
  detail?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmPrompt({ message, detail, onConfirm, onCancel }: ConfirmPromptProps) {
  const [error, setError] = useState<string>();

  useInput((input) => {
    const key = input.toLowerCase();
    if (key === "y") {
      onConfirm();
    } else if (key === "n") {
      onCancel();
    } else {
      setError("Please press Y to confirm or N to cancel");
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text>{message}</Text>
      {detail && <Text dimColor>{detail}</Text>}
      <Text>Press [Y] to confirm or [N] to cancel</Text>
      {error && <Text color="red">{error}</Text>}
    </Box>
  );
}
