export interface ConnectionProfile {
  id: string;
  mode: string;
  name?: string;
  api?: string;
  preset?: string;
  model?: string;
  proxy?: string;
  instruct?: string;
  context?: string;
  instruct_state?: string;
  tokenizer?: string;
  stop_strings?: string;
  exclude?: string[];
}
