import React from "react";
import { Text } from "ink";
import { useTextInputState } from "./use-text-input-state.js";
import { useTextInput } from "./use-text-input.js";

export type TextInputProps = {
  /**
   * When disabled, user input is ignored.
   *
   * @default false
   */
  readonly isDisabled?: boolean;

  /**
   * Text to display when input is empty.
   */
  readonly placeholder?: string;

  /**
   * Default input value.
   */
  readonly defaultValue?: string;

  /**
   * Suggestions to autocomplete the input value.
   */
  readonly suggestions?: string[];

  /**
   * Check if the input is valid given the new input and the existing value.
   */
  readonly checkValidity?: (input: string, value: string) => boolean;

  /**
   * Callback when input value changes.
   */
  readonly onChange?: (value: string) => void;

  /**
   * Optionally transform the input value.
   */
  readonly transformValue?: (value: string) => string;

  /**
   * Callback when enter is pressed. First argument is input value.
   */
  readonly onSubmit?: (value: string) => void;

  /**
   * Style the rendered value
   */
  readonly styleOutput?: (value: string) => React.ReactNode;
};

export function TextInput({
  isDisabled = false,
  defaultValue,
  placeholder = "",
  suggestions,
  onChange,
  transformValue,
  onSubmit,
  styleOutput,
  checkValidity,
}: TextInputProps) {
  const state = useTextInputState({
    defaultValue,
    suggestions,
    onChange,
    onSubmit,
  });

  const { inputValue } = useTextInput({
    isDisabled,
    placeholder,
    state,
    checkValidity,
    transformValue,
  });

  return <Text>{styleOutput ? styleOutput(inputValue) : inputValue}</Text>;
}
