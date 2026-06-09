import { sanitizePromptMessages } from '../prompt-message-utils';

describe('prompt builder message sanitization', () => {
  it('drops empty string messages', () => {
    expect(
      sanitizePromptMessages([
        { role: 'user', content: '' },
        { role: 'assistant', content: '   ' },
        { role: 'user', content: 'Keep me' },
      ]),
    ).toEqual([{ role: 'user', content: 'Keep me' }]);
  });

  it('removes empty text blocks from array content', () => {
    expect(
      sanitizePromptMessages([
        {
          role: 'user',
          content: [
            { type: 'text', text: '' },
            { type: 'text', text: 'Hello' },
          ],
        } as any,
      ]),
    ).toEqual([
      {
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }],
      },
    ]);
  });
});
