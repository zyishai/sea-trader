import { useEffect, useState } from "react";
import { DOMElement, measureElement } from "ink";

export interface SizeType {
  width: number;
  height: number;
}

export const useSize = (ref?: DOMElement | null): SizeType => {
  const [size, setSize] = useState<SizeType>({ width: 0, height: 0 });

  useEffect(() => {
    if (ref) {
      setSize(measureElement(ref));
    }
  }, [ref]);

  return size;
};
