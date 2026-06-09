import { ChatCompletionMessage } from './types/index.js';

type ContentBlock = {
  type?: string;
  text?: string;
  [key: string]: unknown;
};

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getMessageText(message: ChatCompletionMessage): string {
  const content = message.content as unknown;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((block: ContentBlock) => (block.type === 'text' ? block.text : ''))
      .filter(hasText)
      .join('\n');
  }

  return '';
}

export function sanitizePromptMessage<T extends ChatCompletionMessage>(message: T): T | null {
  const content = message.content as unknown;

  if (typeof content === 'string') {
    return hasText(content) ? message : null;
  }

  if (Array.isArray(content)) {
    const sanitizedContent = content.filter((block: ContentBlock) => block.type !== 'text' || hasText(block.text));
    return sanitizedContent.length > 0 ? ({ ...message, content: sanitizedContent } as unknown as T) : null;
  }

  return null;
}

export function sanitizePromptMessages<T extends ChatCompletionMessage>(messages: T[]): T[] {
  return messages
    .map((message) => sanitizePromptMessage(message))
    .filter((message): message is T => message !== null);
}
