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
