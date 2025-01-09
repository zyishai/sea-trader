import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput } from "@inkjs/ui";
import { Action, ActionPrompt } from "./ActionPrompt.js";

export type InputStep =
  | {
      id: string;
      message: string;
      type: "text";
      validate?: (value: string) => string | undefined;
      onSubmit?: (value: string) => void;
      onEnter?: () => void;
    }
  | {
      id: string;
      message: string;
      type: "enum";
      actions: Action[];
      validate?: undefined;
      onSelect?: (value: string) => void;
      onEnter?: () => void;
    };

interface InputPromptProps {
  steps: InputStep[];
  onComplete: (values: Record<string, string>) => void;
  onCancel: () => void;
}

export function InputPrompt({ steps, onComplete, onCancel }: InputPromptProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (steps[currentStep]?.onEnter) {
      steps[currentStep]?.onEnter();
    }
  }, [currentStep]);

  useInput((_, key) => {
    if (key.escape) {
      if (currentStep === 0) {
        onCancel();
      } else {
        setCurrentStep((prev) => prev - 1);
      }
    }
  });

  const handleInput = (value: string) => {
    const step = steps[currentStep];
    const error = step?.validate?.(value);

    if (error) {
      setError(error);
      return;
    }

    setError(undefined);
    setValues((prev) => ({ ...prev, [step?.id ?? ""]: value }));

    if (step?.type === "text" && step?.onSubmit) {
      step.onSubmit(value);
    }

    if (step?.type === "enum" && step?.onSelect) {
      step.onSelect(value);
    }

    if (currentStep === steps.length - 1) {
      onComplete({ ...values, [step?.id ?? ""]: value });
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 0) {
      onCancel();
    } else {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const step = steps[currentStep];

  return step?.type === "text" ? (
    <Box flexDirection="column" gap={1}>
      <Text>{step?.message}</Text>
      {error && <Text color="red">{error}</Text>}
      <TextInput onSubmit={handleInput} />
      <Text dimColor>Press Esc to go back</Text>
    </Box>
  ) : step?.type === "enum" ? (
    <ActionPrompt message={step?.message} actions={step?.actions} onSelect={handleInput} onCancel={handleBack} />
  ) : null;
}
