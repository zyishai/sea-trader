export const joinWords = (words: string[]) =>
  words.length <= 2 ? words.join(" and ") : `${words.slice(0, -1).join(", ")}, and ${words[words.length - 1]}`;

export const displayMonetaryValue = (value: number) => `${value < 0 ? "-" : ""}$${Math.abs(value)}`;
