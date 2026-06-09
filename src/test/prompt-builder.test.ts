import { sanitizePromptMessages } from '../prompt-message-utils';
import { getMessageSliceBounds } from '../prompt-slice-utils';
import { createWorldInfoGlobalScanData } from '../world-info-scan-data';

describe('prompt builder message slicing', () => {
  it('honors message index end zero', () => {
    expect(getMessageSliceBounds({ end: 0 })).toEqual({ startIndex: 0, endIndex: 1 });
  });

  it('keeps end undefined when no end is requested', () => {
    expect(getMessageSliceBounds()).toEqual({ startIndex: 0, endIndex: undefined });
  });
});

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

describe('world info scan data', () => {
  it('fills missing scan fields with SillyTavern-compatible defaults', () => {
    expect(createWorldInfoGlobalScanData({ personaDescription: 'persona' })).toEqual({
      personaDescription: 'persona',
      characterDescription: '',
      characterPersonality: '',
      characterDepthPrompt: '',
      scenario: '',
      creatorNotes: '',
      trigger: 'normal',
    });
  });
});
