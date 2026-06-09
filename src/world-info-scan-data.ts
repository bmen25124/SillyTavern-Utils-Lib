import type { WIGlobalScanData } from './types/world-info.js';

export function createWorldInfoGlobalScanData(input: Partial<WIGlobalScanData> = {}): WIGlobalScanData {
  return {
    personaDescription: input.personaDescription ?? '',
    characterDescription: input.characterDescription ?? '',
    characterPersonality: input.characterPersonality ?? '',
    characterDepthPrompt: input.characterDepthPrompt ?? '',
    scenario: input.scenario ?? '',
    creatorNotes: input.creatorNotes ?? '',
    trigger: input.trigger ?? 'normal',
  };
}
