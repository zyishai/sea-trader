import { useMemo } from "react";
import { useInput } from "ink";
import chalk from "chalk";
import { type TextInputState } from "./use-text-input-state.js";

export type UseTextInputProps = {
  /**
   * When disabled, user input is ignored.
   *
   * @default false
   */
  isDisabled?: boolean;

  /**
   * Check if the input is valid given the new input and the existing value.
   */
  checkValidity?: (input: string, value: string) => boolean;

  /**
   * Optionally transform the input value.
   */
  transformValue?: (value: string) => string;

  /**
   * Text input state.
   */
  state: TextInputState;

  /**
   * Text to display when input is empty.
   */
  placeholder?: string;
};

export type UseTextInputResult = {
  /**
   * Input value.
   */
  inputValue: string;
};

const cursor = chalk.gray.inverse(" "); // chalk.dim("_");

export const useTextInput = ({
  isDisabled = false,
  state,
  placeholder = "",
  checkValidity,
  transformValue,
}: UseTextInputProps): UseTextInputResult => {
  const renderedPlaceholder = useMemo(() => {
    if (isDisabled) {
      return placeholder ? chalk.dim(placeholder) : "";
    }

    return placeholder && placeholder.length > 0
      ? chalk.inverse(placeholder[0]) + chalk.dim(placeholder.slice(1))
      : cursor;
  }, [isDisabled, placeholder]);

  const renderedValue = useMemo(() => {
    if (isDisabled) {
      return state.value;
    }

    let index = 0;
    let result = state.value.length > 0 ? "" : cursor;

    for (const char of state.value) {
      result += index === state.cursorOffset ? chalk.inverse(char) : char;

      index++;
    }

    if (state.suggestion) {
      if (state.cursorOffset === state.value.length) {
        result += chalk.inverse(state.suggestion[0]) + chalk.dim(state.suggestion.slice(1));
      } else {
        result += chalk.dim(state.suggestion);
      }

      return result;
    }

    if (state.value.length > 0 && state.cursorOffset === state.value.length) {
      result += cursor;
    }

    return result;
  }, [isDisabled, state.value, state.cursorOffset, state.suggestion]);

  useInput(
    (input, key) => {
      if (key.upArrow || key.downArrow || (key.ctrl && input === "c") || key.tab || (key.shift && key.tab)) {
        return;
      }

      if (key.return) {
        state.submit();
        return;
      }

      if (key.leftArrow) {
        state.moveCursorLeft();
      } else if (key.rightArrow) {
        state.moveCursorRight();
      } else if (key.backspace || key.delete) {
        state.delete();
      } else {
        const value = transformValue ? transformValue(input) : input;

        if (!checkValidity || checkValidity(value, state.value)) {
          state.insert(value);
        }
      }
    },
    { isActive: !isDisabled },
  );

  return {
    inputValue: state.value.length > 0 ? renderedValue : renderedPlaceholder,
  };
};
