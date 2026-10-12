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
      onChange?: (value: string) => void;
      onSubmit?: (value: string) => void;
      onEnter?: () => void;
    }
  | {
      id: string;
      message: string;
      type: "enum";
      actions: Action[];
      validate?: undefined;
      onSelect?: (value: string, goToStep: (step?: number) => void) => void;
      onEnter?: () => void;
    };

interface InputPromptProps {
  steps: InputStep[];
  onComplete: (values: Record<string, string>) => void;
  onCancel: () => void;
  backMessage?: string;
  exitMessage?: string;
}

export function InputPrompt({ steps, onComplete, onCancel, backMessage, exitMessage }: InputPromptProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

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
    let shouldContinue = true;
    const goToStep = (step?: number) => {
      if (typeof step === "number" && !isNaN(step) && step >= 0 && step <= steps.length - 1) {
        setCurrentStep(step);
        shouldContinue = false;
      }
    };

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
      step.onSelect(value, goToStep);
    }

    if (shouldContinue) {
      if (isLastStep) {
        onComplete({ ...values, [step?.id ?? ""]: value });
      } else {
        setCurrentStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (isFirstStep) {
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
      <TextInput onChange={step?.onChange} onSubmit={handleInput} />
      <Text dimColor>
        {isFirstStep ? (exitMessage ?? "Press [Esc] to exit") : (backMessage ?? "Press [Esc] to go back")}
      </Text>
    </Box>
  ) : step?.type === "enum" ? (
    <ActionPrompt
      message={step?.message}
      actions={step?.actions}
      onSelect={handleInput}
      onCancel={handleBack}
      backMessage={isFirstStep ? (exitMessage ?? "Press [Esc] to exit") : (backMessage ?? "Press [Esc] to go back")}
    />
  ) : null;
}
