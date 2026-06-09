export interface WIGlobalScanData {
  personaDescription: string;
  characterDescription: string;
  characterPersonality: string;
  characterDepthPrompt: string;
  scenario: string;
  creatorNotes: string;
  trigger: string;
}

export interface WIPromptResult {
  worldInfoString: string;
  worldInfoBefore: string;
  worldInfoAfter: string;
  worldInfoExamples: any[];
  worldInfoDepth: {
    depth: number;
    role: number;
    entries: string[];
  }[];
  anBefore: string[];
  anAfter: string[];
}

export interface WIEntry {
  uid: number;
  key: string[];
  content: string;
  comment: string;
  disable: boolean;
  keysecondary: string[];
}
