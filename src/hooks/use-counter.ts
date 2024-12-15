import { useState } from "react";

export const useCounter = (initial?: number) => {
  const [current, setCurrent] = useState(initial ?? 1);

  return {
    current,
    next: () => setCurrent((c) => c + 1),
    prev: () => setCurrent((c) => c - 1),
    add: (amount: number) => setCurrent((c) => c + amount),
    sub: (amount: number) => setCurrent((c) => c - amount),
    set: (value: number) => setCurrent(value),
  };
};
