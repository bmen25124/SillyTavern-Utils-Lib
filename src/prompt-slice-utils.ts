import type { BuildPromptOptions } from './prompt-builder.js';

export function getMessageSliceBounds(messageIndexesBetween?: BuildPromptOptions['messageIndexesBetween']): {
  startIndex: number;
  endIndex: number | undefined;
} {
  return {
    startIndex: messageIndexesBetween?.start ?? 0,
    endIndex: messageIndexesBetween?.end === undefined ? undefined : messageIndexesBetween.end + 1,
  };
}
